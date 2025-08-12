import { TaskManager, TaskExecutionService, TaskCleanupService, SampleExecutor } from '../src/task';
import { DatabaseFactory } from '../src/db-factory';
import { Task, TaskStatus } from '../src/task/types';

// Mock request object for testing
const createMockRequest = (sessionKey: string = 'test-session') =>
  ({
    sessionKey,
    sessionDatabase: undefined as any,
    body: {},
    params: {},
    query: {},
    headers: {},
    get: () => undefined,
    header: () => undefined,
    accepts: () => undefined,
    acceptsCharsets: () => undefined,
    acceptsEncodings: () => undefined,
    acceptsLanguages: () => undefined,
    range: () => undefined,
    param: () => undefined,
    is: () => undefined,
    protocol: 'http',
    secure: false,
    ip: '127.0.0.1',
    ips: [],
    subdomains: [],
    path: '/',
    hostname: 'localhost',
    host: 'localhost:3000',
    fresh: false,
    stale: true,
    xhr: false,
    method: 'GET',
    url: '/',
    originalUrl: '/',
    baseUrl: '/',
    cookies: {},
    signedCookies: {},
    secret: undefined,
    connection: {} as any,
    socket: {} as any,
  }) as any;

describe('Task System', () => {
  let dbFactory: DatabaseFactory;
  let taskManager: TaskManager;
  let taskExecutionService: TaskExecutionService;
  let taskCleanupService: TaskCleanupService;

  beforeEach(() => {
    // Create a new database factory for each test
    dbFactory = new DatabaseFactory({
      type: 'InMemory',
      path: '',
      loadOnStartup: false,
      sessionPrefix: 'test_',
      maxSessions: 10,
      sessionTimeout: 60000,
    });

    // Initialize task system components
    taskManager = new TaskManager();
    taskExecutionService = new TaskExecutionService(dbFactory);
    taskCleanupService = new TaskCleanupService(dbFactory, taskManager, {
      maxCompletedTasks: 5,
      maxFailedTasks: 3,
      cleanupInterval: 1000,
    });
  });

  afterEach(() => {
    taskCleanupService.stop();
  });

  describe('TaskManager', () => {
    it('should create a task with correct session isolation', async () => {
      const req = createMockRequest('session1');
      const db = dbFactory.getDatabase('session1');
      req.sessionDatabase = db;

      const task = await taskManager.createTask(req, {
        name: 'Test Task',
        description: 'A test task',
      });

      expect(task.id).toBeDefined();
      expect(task.name).toBe('Test Task');
      expect(task.sessionKey).toBe('session1');
      expect(task.status).toBe(TaskStatus.PENDING);
      expect(task.progress).toBe(0);
    });

    it('should not allow access to tasks from different sessions', async () => {
      // Create task in session1
      const req1 = createMockRequest('session1');
      const db1 = dbFactory.getDatabase('session1');
      req1.sessionDatabase = db1;

      const task = await taskManager.createTask(req1, {
        name: 'Test Task',
        description: 'A test task',
      });

      // Try to access from session2
      const req2 = createMockRequest('session2');
      const db2 = dbFactory.getDatabase('session2');
      req2.sessionDatabase = db2;

      const retrievedTask = await taskManager.getTask(req2, task.id);
      expect(retrievedTask).toBeUndefined();
    });

    it('should update task progress correctly', async () => {
      const req = createMockRequest('session1');
      const db = dbFactory.getDatabase('session1');
      req.sessionDatabase = db;

      const task = await taskManager.createTask(req, {
        name: 'Test Task',
        description: 'A test task',
      });

      const updatedTask = await taskManager.updateTask(req, task.id, {
        progress: 50,
        status: TaskStatus.RUNNING,
      });

      expect(updatedTask?.progress).toBe(50);
      expect(updatedTask?.status).toBe(TaskStatus.RUNNING);
    });
  });

  describe('TaskExecutionService', () => {
    it('should execute a task and update progress', async () => {
      const sessionKey = 'test-session';
      const db = dbFactory.getDatabase(sessionKey);

      // Create a task
      const req = createMockRequest(sessionKey);
      req.sessionDatabase = db;

      const task = await taskManager.createTask(req, {
        name: 'Test Execution Task',
        description: 'A task to test execution',
      });

      // Execute the task
      const executor = new SampleExecutor(100); // 100ms delay
      await taskExecutionService.executeTask(sessionKey, task.id, executor);

      // Wait for execution to complete
      await new Promise(resolve => setTimeout(resolve, 200));

      // Check final status
      const finalTask = db.findById('tasks', task.id) as Task;
      expect(finalTask.status).toBe(TaskStatus.COMPLETED);
      expect(finalTask.progress).toBe(100);
    });

    it('should prevent duplicate execution of the same task', async () => {
      const sessionKey = 'test-session';
      const db = dbFactory.getDatabase(sessionKey);

      const req = createMockRequest(sessionKey);
      req.sessionDatabase = db;

      const task = await taskManager.createTask(req, {
        name: 'Test Duplicate Execution',
        description: 'A task to test duplicate execution prevention',
      });

      const executor = new SampleExecutor(1000); // 1 second delay

      // Start first execution
      const execution1 = taskExecutionService.executeTask(sessionKey, task.id, executor);

      // Try to start second execution immediately
      const execution2 = taskExecutionService.executeTask(sessionKey, task.id, executor);

      // Both should complete without error
      await Promise.all([execution1, execution2]);

      // Check that task was only executed once
      const finalTask = db.findById('tasks', task.id) as Task;
      expect(finalTask.status).toBe(TaskStatus.COMPLETED);
    });
  });

  describe('TaskCleanupService', () => {
    it('should clean up old completed tasks', async () => {
      const sessionKey = 'test-session';
      const db = dbFactory.getDatabase(sessionKey);

      // Create multiple completed tasks
      for (let i = 0; i < 10; i++) {
        const task: Task = {
          id: `task-${i}`,
          name: `Task ${i}`,
          status: TaskStatus.COMPLETED,
          progress: 100,
          createdAt: Date.now() - i * 1000, // Older tasks first
          updatedAt: Date.now() - i * 1000,
          completedAt: Date.now() - i * 1000,
          sessionKey,
          sessionDatabase: sessionKey,
        };
        db.createOrUpdate('tasks', task);
      }

      // Run cleanup
      const cleanedCount = await taskCleanupService.runCleanup();

      // Should keep only 5 completed tasks (maxCompletedTasks)
      expect(cleanedCount).toBe(5);

      const remainingTasks = db.findAllByExample('tasks', { sessionKey });
      expect(remainingTasks.length).toBe(5);
    });

    it('should clean up old failed tasks', async () => {
      const sessionKey = 'test-session';
      const db = dbFactory.getDatabase(sessionKey);

      // Create multiple failed tasks
      for (let i = 0; i < 10; i++) {
        const task: Task = {
          id: `task-${i}`,
          name: `Task ${i}`,
          status: TaskStatus.FAILED,
          progress: 0,
          createdAt: Date.now() - i * 1000,
          updatedAt: Date.now() - i * 1000,
          error: 'Test error',
          sessionKey,
          sessionDatabase: sessionKey,
        };
        db.createOrUpdate('tasks', task);
      }

      // Run cleanup
      const cleanedCount = await taskCleanupService.runCleanup();

      // Should keep only 3 failed tasks (maxFailedTasks)
      expect(cleanedCount).toBe(7);

      const remainingTasks = db.findAllByExample('tasks', { sessionKey });
      expect(remainingTasks.length).toBe(3);
    });
  });

  describe('Session Isolation', () => {
    it('should maintain complete isolation between sessions', async () => {
      // Create tasks in different sessions
      const req1 = createMockRequest('session1');
      const db1 = dbFactory.getDatabase('session1');
      req1.sessionDatabase = db1;

      const req2 = createMockRequest('session2');
      const db2 = dbFactory.getDatabase('session2');
      req2.sessionDatabase = db2;

      // Create tasks in both sessions
      const task1 = await taskManager.createTask(req1, {
        name: 'Session 1 Task',
        description: 'Task in session 1',
      });

      const task2 = await taskManager.createTask(req2, {
        name: 'Session 2 Task',
        description: 'Task in session 2',
      });

      // Verify tasks are stored in separate databases
      const tasks1 = await taskManager.getTasks(req1);
      const tasks2 = await taskManager.getTasks(req2);

      expect(tasks1.length).toBe(1);
      expect(tasks2.length).toBe(1);
      expect(tasks1[0].id).toBe(task1.id);
      expect(tasks2[0].id).toBe(task2.id);

      // Verify cross-session access is blocked
      const crossSessionTask = await taskManager.getTask(req1, task2.id);
      expect(crossSessionTask).toBeUndefined();
    });
  });
});
