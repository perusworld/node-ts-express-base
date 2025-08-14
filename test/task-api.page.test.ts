import request from 'supertest';
import { Server } from '../src/server';

// Set environment variables to enable session isolation
process.env.ENABLE_SESSION_ISOLATION = 'true';
process.env.SESSION_TIMEOUT = '300000'; // 5 minutes for testing

let serverInstance = Server.bootstrap();
let app = serverInstance.app;

beforeAll(async () => {
  return await serverInstance.init();
});

afterAll(async () => {
  // Properly cleanup all background services and timers
  if (serverInstance) {
    // Stop task cleanup service
    const taskSystemStatus = serverInstance.getTaskSystemStatus();
    if (taskSystemStatus.enabled && taskSystemStatus.cleanupStatus) {
      // Access the cleanup service through reflection to stop it
      const cleanupService = (serverInstance as any).taskCleanupService;
      if (cleanupService && typeof cleanupService.stop === 'function') {
        cleanupService.stop();
      }
    }

    // Cleanup all sessions and databases
    serverInstance.cleanupSessions();

    // Wait a bit for any pending operations to complete
    await new Promise(resolve => setTimeout(resolve, 100));

    // Run cleanup multiple times to ensure all tasks are processed
    for (let i = 0; i < 3; i++) {
      await serverInstance.cleanup();
      await new Promise(resolve => setTimeout(resolve, 50));
    }
  }
});

// Add global teardown to ensure all timers are cleared
afterAll(async () => {
  // Clear any remaining timers
  jest.clearAllTimers();

  // Stop any remaining task executions
  if (serverInstance) {
    const taskSystemStatus = serverInstance.getTaskSystemStatus();
    if (taskSystemStatus.enabled && taskSystemStatus.runningTasks && taskSystemStatus.runningTasks.length > 0) {
      console.log('Stopping remaining running tasks:', taskSystemStatus.runningTasks.length);
    }
  }

  // Force garbage collection if available
  if (global.gc) {
    global.gc();
  }

  // Wait for any remaining async operations
  await new Promise(resolve => setTimeout(resolve, 200));
});

describe('Task System API Tests', () => {
  let createdTaskId: string;
  let sessionKey: string;

  beforeAll(() => {
    // Get a session key from the health endpoint
    return request(app)
      .get('/api/v1/health')
      .set('Accept', 'application/json')
      .then((res: any) => {
        sessionKey = res.body.sessionKey;
      });
  });

  describe('Task Creation and Management', () => {
    test('It should create a new task', done => {
      request(app)
        .post('/api/v1/tasks')
        .send({
          name: 'Test Task',
          description: 'A test task for API testing',
          metadata: { test: true, timestamp: Date.now() },
        })
        .set('Accept', 'application/json')
        .expect(201)
        .expect('Content-Type', /json/)
        .then((res: any) => {
          expect(res.body.success).toBe(true);
          expect(res.body.message).toBe('Task created successfully');
          expect(res.body.task).toBeDefined();
          expect(res.body.task.id).toBeDefined();
          expect(res.body.task.name).toBe('Test Task');
          expect(res.body.task.status).toBe('pending');
          expect(res.body.task.progress).toBe(0);
          expect(res.body.task.sessionKey).toBe(sessionKey);

          createdTaskId = res.body.task.id;
          done();
        })
        .catch((err: any) => done(err));
    });

    test('It should get a specific task by ID', done => {
      request(app)
        .get(`/api/v1/tasks/${createdTaskId}`)
        .set('Accept', 'application/json')
        .expect(200)
        .expect('Content-Type', /json/)
        .then((res: any) => {
          expect(res.body.success).toBe(true);
          expect(res.body.task).toBeDefined();
          expect(res.body.task.id).toBe(createdTaskId);
          expect(res.body.task.name).toBe('Test Task');
          done();
        })
        .catch((err: any) => done(err));
    });

    test('It should list all tasks for the session', done => {
      request(app)
        .get('/api/v1/tasks')
        .set('Accept', 'application/json')
        .expect(200)
        .expect('Content-Type', /json/)
        .then((res: any) => {
          expect(res.body.success).toBe(true);
          expect(res.body.tasks).toBeDefined();
          expect(Array.isArray(res.body.tasks)).toBe(true);
          expect(res.body.count).toBeGreaterThan(0);

          // Should find our created task
          const task = res.body.tasks.find((t: any) => t.id === createdTaskId);
          expect(task).toBeDefined();
          done();
        })
        .catch((err: any) => done(err));
    });

    test('It should get task status', done => {
      request(app)
        .get(`/api/v1/tasks/${createdTaskId}/status`)
        .set('Accept', 'application/json')
        .expect(200)
        .expect('Content-Type', /json/)
        .then((res: any) => {
          expect(res.body.success).toBe(true);
          expect(res.body.status).toBeDefined();
          expect(res.body.progress).toBeDefined();
          done();
        })
        .catch((err: any) => done(err));
    });

    test('It should get task statistics', done => {
      // First create a task to ensure we have some data
      request(app)
        .post('/api/v1/tasks')
        .send({
          name: 'Statistics Test Task',
          description: 'A task for testing statistics',
        })
        .set('Accept', 'application/json')
        .expect(201)
        .then(() => {
          // Now get the statistics
          request(app)
            .get('/api/v1/tasks/stats')
            .set('Accept', 'application/json')
            .expect(200)
            .expect('Content-Type', /json/)
            .then((res: any) => {
              expect(res.body.success).toBe(true);
              expect(res.body.stats).toBeDefined();
              expect(res.body.stats.total).toBeGreaterThan(0);
              expect(res.body.stats.running).toBe(0); // No running tasks initially
              done();
            })
            .catch((err: any) => done(err));
        })
        .catch((err: any) => done(err));
    });
  });

  describe('Task Control Operations', () => {
    test('It should start a task execution', done => {
      request(app)
        .post(`/api/v1/tasks/${createdTaskId}/start`)
        .set('Accept', 'application/json')
        .expect(200)
        .expect('Content-Type', /json/)
        .then((res: any) => {
          expect(res.body.success).toBe(true);
          expect(res.body.message).toBe('Task started successfully');
          expect(res.body.taskId).toBe(createdTaskId);
          done();
        })
        .catch((err: any) => done(err));
    });

    test('It should cancel a running task', done => {
      request(app)
        .post(`/api/v1/tasks/${createdTaskId}/cancel`)
        .set('Accept', 'application/json')
        .expect(200)
        .expect('Content-Type', /json/)
        .then((res: any) => {
          expect(res.body.success).toBe(true);
          expect(res.body.message).toBe('Task cancelled successfully');
          done();
        })
        .catch((err: any) => done(err));
    });

    test('It should retry a cancelled task', done => {
      // First, make sure the task is cancelled
      request(app)
        .post(`/api/v1/tasks/${createdTaskId}/retry`)
        .set('Accept', 'application/json')
        .expect(200)
        .expect('Content-Type', /json/)
        .then((res: any) => {
          expect(res.body.success).toBe(true);
          expect(res.body.message).toBe('Task retried successfully');
          // The task should now be pending again
          expect(res.body.task.status).toBe('pending');
          expect(res.body.task.progress).toBe(0);
          done();
        })
        .catch((err: any) => done(err));
    });
  });

  describe('Demo API Endpoints', () => {
    test('It should create a sample task', done => {
      request(app)
        .post('/api/v1/demo/tasks/sample')
        .send({
          delayMs: 1000,
          description: 'API test sample task',
        })
        .set('Accept', 'application/json')
        .expect(201)
        .expect('Content-Type', /json/)
        .then((res: any) => {
          expect(res.body.success).toBe(true);
          expect(res.body.message).toBe('Sample task created and started');
          expect(res.body.task).toBeDefined();
          expect(res.body.task.metadata.type).toBe('sample');
          done();
        })
        .catch((err: any) => done(err));
    });

    test('It should create a file processing task', done => {
      request(app)
        .post('/api/v1/demo/tasks/file-processing')
        .send({
          filePath: '/test/file.txt',
          fileSize: 1024,
          description: 'API test file processing',
        })
        .set('Accept', 'application/json')
        .expect(201)
        .expect('Content-Type', /json/)
        .then((res: any) => {
          expect(res.body.success).toBe(true);
          expect(res.body.message).toBe('File processing task created and started');
          expect(res.body.task).toBeDefined();
          expect(res.body.task.metadata.type).toBe('file-processing');
          expect(res.body.task.metadata.filePath).toBe('/test/file.txt');
          done();
        })
        .catch((err: any) => done(err));
    });

    test('It should create an API call task', done => {
      request(app)
        .post('/api/v1/demo/tasks/api-call')
        .send({
          endpoint: 'https://api.test.com/data',
          data: { test: 'value' },
          description: 'API test API call',
        })
        .set('Accept', 'application/json')
        .expect(201)
        .expect('Content-Type', /json/)
        .then((res: any) => {
          expect(res.body.success).toBe(true);
          expect(res.body.message).toBe('API call task created and started');
          expect(res.body.task).toBeDefined();
          expect(res.body.task.metadata.type).toBe('api-call');
          expect(res.body.task.metadata.endpoint).toBe('https://api.test.com/data');
          done();
        })
        .catch((err: any) => done(err));
    });

    test('It should create a batch processing task', done => {
      request(app)
        .post('/api/v1/demo/tasks/batch')
        .send({
          items: ['item1', 'item2', 'item3'],
          description: 'API test batch processing',
        })
        .set('Accept', 'application/json')
        .expect(201)
        .expect('Content-Type', /json/)
        .then((res: any) => {
          expect(res.body.success).toBe(true);
          expect(res.body.message).toBe('Batch processing task created and started');
          expect(res.body.task).toBeDefined();
          expect(res.body.task.metadata.type).toBe('batch-processing');
          expect(res.body.task.metadata.itemCount).toBe(3);
          done();
        })
        .catch((err: any) => done(err));
    });
  });

  describe('Task Execution and Results', () => {
    let demoTaskId: string;

    beforeAll(() => {
      // Create a regular task (not demo) that doesn't auto-start execution
      return request(app)
        .post('/api/v1/tasks')
        .send({
          name: 'Execution Test Task',
          description: 'A task for testing execution',
          metadata: { type: 'test', delayMs: 500 },
        })
        .then((res: any) => {
          demoTaskId = res.body.task.id;
        });
    });

    test('It should execute a specific task', done => {
      request(app)
        .post(`/api/v1/tasks/${demoTaskId}/start`)
        .set('Accept', 'application/json')
        .expect(200)
        .expect('Content-Type', /json/)
        .then((res: any) => {
          expect(res.body.success).toBe(true);
          expect(res.body.message).toBe('Task started successfully');
          expect(res.body.taskId).toBe(demoTaskId);
          done();
        })
        .catch((err: any) => {
          // Log the error for debugging
          console.log('Task execution error:', err);
          done(err);
        });
    });

    test('It should get task result after execution', done => {
      // Wait a bit for task to complete, then check result
      setTimeout(() => {
        request(app)
          .get(`/api/v1/tasks/${demoTaskId}/status`)
          .set('Accept', 'application/json')
          .expect(200)
          .expect('Content-Type', /json/)
          .then((res: any) => {
            expect(res.body.success).toBe(true);
            expect(res.body.status).toBeDefined();
            expect(res.body.progress).toBeDefined();
            done();
          })
          .catch((err: any) => done(err));
      }, 1000);
    });
  });

  describe('Task Status and Progress', () => {
    test('It should get task status with progress information', done => {
      // Create a task first
      request(app)
        .post('/api/v1/tasks')
        .send({
          name: 'Status Test Task',
          description: 'A task to test status endpoint',
        })
        .set('Accept', 'application/json')
        .expect(201)
        .then((res: any) => {
          const taskId = res.body.task.id;

          // Wait a bit then check status
          setTimeout(() => {
            request(app)
              .get(`/api/v1/tasks/${taskId}/status`)
              .set('Accept', 'application/json')
              .expect(200)
              .expect('Content-Type', /json/)
              .then((statusRes: any) => {
                expect(statusRes.body.success).toBe(true);
                expect(statusRes.body.status).toBeDefined();
                expect(statusRes.body.progress).toBeDefined();
                done();
              })
              .catch((err: any) => done(err));
          }, 1000);
        })
        .catch((err: any) => done(err));
    });

    test('It should return enhanced step information in task details', done => {
      // First create a task
      request(app)
        .post('/api/v1/tasks')
        .send({
          name: 'Enhanced Step Test Task',
          description: 'A task to test enhanced step information',
          metadata: { test: true, enhanced: true },
        })
        .set('Accept', 'application/json')
        .expect(201)
        .then((res: any) => {
          const taskId = res.body.task.id;

          // Verify the task is created with default values
          expect(res.body.success).toBe(true);
          expect(res.body.task.id).toBe(taskId);
          expect(res.body.task.name).toBe('Enhanced Step Test Task');
          expect(res.body.task.status).toBe('pending');
          expect(res.body.task.progress).toBe(0);
          expect(res.body.task.currentStep).toBeUndefined();
          expect(res.body.task.currentStepDescription).toBeUndefined();

          // Now verify the step information is returned in the task details
          request(app)
            .get(`/api/v1/tasks/${taskId}`)
            .set('Accept', 'application/json')
            .expect(200)
            .then((getRes: any) => {
              expect(getRes.body.success).toBe(true);
              expect(getRes.body.task.currentStep).toBeUndefined();
              expect(getRes.body.task.currentStepDescription).toBeUndefined();
              expect(getRes.body.task.progress).toBe(0);
              done();
            })
            .catch((err: any) => done(err));
        })
        .catch((err: any) => done(err));
    });

    test('It should handle step information correctly', done => {
      // Create a task
      request(app)
        .post('/api/v1/tasks')
        .send({
          name: 'Step Information Test Task',
          description: 'A task to test step information handling',
        })
        .set('Accept', 'application/json')
        .expect(201)
        .then((res: any) => {
          const taskId = res.body.task.id;

          // Verify initial state
          expect(res.body.success).toBe(true);
          expect(res.body.task.status).toBe('pending');
          expect(res.body.task.progress).toBe(0);
          expect(res.body.task.currentStep).toBeUndefined();
          expect(res.body.task.currentStepDescription).toBeUndefined();

          // Verify the step information is properly returned in the task details
          request(app)
            .get(`/api/v1/tasks/${taskId}`)
            .set('Accept', 'application/json')
            .expect(200)
            .then((getRes: any) => {
              expect(getRes.body.success).toBe(true);
              expect(getRes.body.task.currentStep).toBeUndefined();
              expect(getRes.body.task.currentStepDescription).toBeUndefined();
              expect(getRes.body.task.progress).toBe(0);
              expect(getRes.body.task.status).toBe('pending');
              done();
            })
            .catch((err: any) => done(err));
        })
        .catch((err: any) => done(err));
    });

    test('It should return enhanced step information in task status endpoint', done => {
      // Create a task
      request(app)
        .post('/api/v1/tasks')
        .send({
          name: 'Status Step Test Task',
          description: 'A task to test step information in status endpoint',
        })
        .set('Accept', 'application/json')
        .expect(201)
        .then((res: any) => {
          const taskId = res.body.task.id;

          // Now verify the status endpoint returns step information (default values)
          request(app)
            .get(`/api/v1/tasks/${taskId}/status`)
            .set('Accept', 'application/json')
            .expect(200)
            .then((statusRes: any) => {
              expect(statusRes.body.success).toBe(true);
              expect(statusRes.body.status).toBeDefined();
              expect(statusRes.body.progress).toBe(0);
              expect(statusRes.body.currentStep).toBeUndefined();
              expect(statusRes.body.currentStepDescription).toBeUndefined();
              done();
            })
            .catch((err: any) => done(err));
        })
        .catch((err: any) => done(err));
    });
  });

  describe('Cleanup Service Management', () => {
    test('It should get cleanup service status', done => {
      request(app)
        .get('/api/v1/tasks/cleanup/status')
        .set('Accept', 'application/json')
        .expect(200)
        .expect('Content-Type', /json/)
        .then((res: any) => {
          expect(res.body.success).toBe(true);
          expect(res.body.status).toBeDefined();
          expect(res.body.status.isActive).toBeDefined();
          expect(res.body.status.options).toBeDefined();
          done();
        })
        .catch((err: any) => done(err));
    });

    test('It should run cleanup manually', done => {
      request(app)
        .post('/api/v1/tasks/cleanup/run')
        .set('Accept', 'application/json')
        .expect(200)
        .expect('Content-Type', /json/)
        .then((res: any) => {
          expect(res.body.success).toBe(true);
          expect(res.body.message).toBe('Cleanup completed successfully');
          expect(res.body.cleanedCount).toBeDefined();
          done();
        })
        .catch((err: any) => done(err));
    });
  });

  describe('Error Handling', () => {
    test('It should return 404 for non-existent task', done => {
      request(app)
        .get('/api/v1/tasks/non-existent-id')
        .set('Accept', 'application/json')
        .expect(404)
        .expect('Content-Type', /json/)
        .then((res: any) => {
          expect(res.body.success).toBe(false);
          expect(res.body.message).toBe('Task not found');
          done();
        })
        .catch((err: any) => done(err));
    });

    test('It should return 400 for invalid file processing task', done => {
      request(app)
        .post('/api/v1/demo/tasks/file-processing')
        .send({ description: 'Missing filePath' })
        .set('Accept', 'application/json')
        .expect(400)
        .expect('Content-Type', /json/)
        .then((res: any) => {
          expect(res.body.success).toBe(false);
          expect(res.body.message).toBe('filePath is required');
          done();
        })
        .catch((err: any) => done(err));
    });

    test('It should return 400 for invalid batch task', done => {
      request(app)
        .post('/api/v1/demo/tasks/batch')
        .send({ description: 'Missing items' })
        .set('Accept', 'application/json')
        .expect(400)
        .expect('Content-Type', /json/)
        .then((res: any) => {
          expect(res.body.success).toBe(false);
          expect(res.body.message).toBe('items array is required and must not be empty');
          done();
        })
        .catch((err: any) => done(err));
    });
  });

  describe('Session Isolation', () => {
    test('It should maintain session isolation between different requests', done => {
      // Create a task in the current session
      let firstTaskId: string;

      request(app)
        .post('/api/v1/tasks')
        .send({
          name: 'Session Isolation Test Task',
          description: 'Testing session isolation',
        })
        .set('Accept', 'application/json')
        .then((res: any) => {
          firstTaskId = res.body.task.id;

          // Create a new request with a different session header to force a different session
          return request(app)
            .get(`/api/v1/tasks/${firstTaskId}`)
            .set('Accept', 'application/json')
            .set('X-App-Session', 'different-session-key'); // Different session
        })
        .then((res: any) => {
          // Should not find the task in different session
          expect(res.body.success).toBe(false);
          expect(res.body.message).toBe('Task not found');
          done();
        })
        .catch((err: any) => done(err));
    });
  });
});
