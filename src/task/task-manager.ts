import { Request } from 'express';
import { Database } from '../db';
import { Task, TaskStatus, CreateTaskRequest, UpdateTaskRequest } from './types';
import { getLogger } from '../util';

const logger = getLogger('TaskManager');

export class TaskManager {
  constructor() {}

  /**
   * Create a new task in the caller's session database
   */
  async createTask(req: Request, taskData: CreateTaskRequest): Promise<Task> {
    const db = req.sessionDatabase!;
    const sessionKey = req.sessionKey!;

    const task: Task = {
      id: db.uuid(),
      name: taskData.name,
      description: taskData.description,
      status: TaskStatus.PENDING,
      progress: 0,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      metadata: taskData.metadata,
      sessionKey,
      sessionDatabase: sessionKey,
      userId: taskData.userId,
      ipAddress: this.getClientIP(req),
    };

    const createdTask = db.createOrUpdate('tasks', task);
    logger.debug(`Created task ${task.id} for session ${sessionKey}`);

    return createdTask;
  }

  /**
   * Get tasks for the current session with optional filtering
   */
  async getTasks(req: Request, filters?: Partial<Task>): Promise<Task[]> {
    const db = req.sessionDatabase!;
    const sessionKey = req.sessionKey!;

    if (filters) {
      return db.findAllByExample('tasks', { ...filters, sessionKey });
    }

    return db.findAllByExample('tasks', { sessionKey });
  }

  /**
   * Get a specific task by ID (session-scoped)
   */
  async getTask(req: Request, taskId: string): Promise<Task | undefined> {
    const db = req.sessionDatabase!;
    const sessionKey = req.sessionKey!;

    const task = db.findById('tasks', taskId) as Task;

    if (task && task.sessionKey === sessionKey) {
      return task;
    }

    return undefined;
  }

  /**
   * Update task progress and status
   */
  async updateTask(req: Request, taskId: string, updates: UpdateTaskRequest): Promise<Task | undefined> {
    const db = req.sessionDatabase!;
    const sessionKey = req.sessionKey!;

    const task = db.findById('tasks', taskId) as Task;

    if (!task || task.sessionKey !== sessionKey) {
      return undefined;
    }

    // Update fields
    if (updates.status !== undefined) {
      task.status = updates.status;

      if (updates.status === TaskStatus.COMPLETED && !task.completedAt) {
        task.completedAt = Date.now();
      } else if (updates.status === TaskStatus.RUNNING && !task.startedAt) {
        task.startedAt = Date.now();
      }
    }

    if (updates.progress !== undefined) {
      task.progress = Math.max(0, Math.min(100, updates.progress));
    }

    if (updates.currentStep !== undefined) {
      task.currentStep = updates.currentStep;
    }

    if (updates.currentStepDescription !== undefined) {
      task.currentStepDescription = updates.currentStepDescription;
    }

    if (updates.error !== undefined) {
      task.error = updates.error;
    }

    if (updates.metadata !== undefined) {
      task.metadata = { ...task.metadata, ...updates.metadata };
    }

    task.updatedAt = Date.now();

    const updatedTask = db.createOrUpdate('tasks', task);
    logger.debug(
      `Updated task ${taskId} for session ${sessionKey}: status=${updates.status}, progress=${updates.progress}`
    );

    return updatedTask;
  }

  /**
   * Cancel a task (only if it's pending or running)
   */
  async cancelTask(req: Request, taskId: string): Promise<Task | undefined> {
    const db = req.sessionDatabase!;
    const sessionKey = req.sessionKey!;

    const task = db.findById('tasks', taskId) as Task;

    if (!task || task.sessionKey !== sessionKey) {
      return undefined;
    }

    if (task.status === TaskStatus.PENDING || task.status === TaskStatus.RUNNING) {
      task.status = TaskStatus.CANCELLED;
      task.updatedAt = Date.now();

      const cancelledTask = db.createOrUpdate('tasks', task);
      logger.debug(`Cancelled task ${taskId} for session ${sessionKey}`);

      return cancelledTask;
    }

    return task; // Return unchanged if already in final state
  }

  /**
   * Retry a failed task
   */
  async retryTask(req: Request, taskId: string): Promise<Task | undefined> {
    const db = req.sessionDatabase!;
    const sessionKey = req.sessionKey!;

    const task = db.findById('tasks', taskId) as Task;

    if (!task || task.sessionKey !== sessionKey) {
      return undefined;
    }

    if (task.status === TaskStatus.FAILED || task.status === TaskStatus.CANCELLED) {
      task.status = TaskStatus.PENDING;
      task.progress = 0;
      task.error = undefined;
      task.startedAt = undefined;
      task.completedAt = undefined;
      task.updatedAt = Date.now();

      const retriedTask = db.createOrUpdate('tasks', task);
      logger.debug(`Retried task ${taskId} for session ${sessionKey}`);

      return retriedTask;
    }

    return task; // Return unchanged if not failed
  }

  /**
   * Delete a task
   */
  async deleteTask(req: Request, taskId: string): Promise<boolean> {
    const db = req.sessionDatabase!;
    const sessionKey = req.sessionKey!;

    const task = db.findById('tasks', taskId) as Task;

    if (!task || task.sessionKey !== sessionKey) {
      return false;
    }

    const deleted = db.deleteById('tasks', taskId);
    if (deleted) {
      logger.debug(`Deleted task ${taskId} for session ${sessionKey}`);
    }

    return !!deleted;
  }

  /**
   * Get task statistics for the current session
   */
  async getTaskStats(req: Request): Promise<Record<string, any>> {
    const tasks = await this.getTasks(req);

    const stats = {
      total: tasks.length,
      pending: 0,
      running: 0,
      completed: 0,
      failed: 0,
      cancelled: 0,
    };

    tasks.forEach(task => {
      stats[task.status]++;
    });

    return stats;
  }

  /**
   * Clean up old tasks for a specific session
   */
  async cleanupSessionTasks(
    db: Database,
    sessionKey: string,
    options: { maxCompletedTasks: number; maxFailedTasks: number }
  ): Promise<number> {
    const tasks = db.findAllByExample('tasks', { sessionKey });

    let cleanedCount = 0;

    // Clean up completed tasks
    const completedTasks = tasks
      .filter(task => task.status === TaskStatus.COMPLETED)
      .sort((a, b) => b.completedAt! - a.completedAt!);

    if (completedTasks.length > options.maxCompletedTasks) {
      const toDelete = completedTasks.slice(options.maxCompletedTasks);
      toDelete.forEach(task => {
        db.deleteById('tasks', task.id);
        cleanedCount++;
      });
    }

    // Clean up failed tasks
    const failedTasks = tasks
      .filter(task => task.status === TaskStatus.FAILED)
      .sort((a, b) => b.updatedAt - a.updatedAt);

    if (failedTasks.length > options.maxFailedTasks) {
      const toDelete = failedTasks.slice(options.maxFailedTasks);
      toDelete.forEach(task => {
        db.deleteById('tasks', task.id);
        cleanedCount++;
      });
    }

    if (cleanedCount > 0) {
      logger.debug(`Cleaned up ${cleanedCount} old tasks for session ${sessionKey}`);
    }

    return cleanedCount;
  }

  /**
   * Get client IP address from request
   */
  private getClientIP(req: Request): string {
    const forwardedFor = req.headers['x-forwarded-for'];
    if (forwardedFor) {
      const ips = Array.isArray(forwardedFor) ? forwardedFor[0] : forwardedFor;
      return ips.split(',')[0].trim();
    }

    const realIP = req.headers['x-real-ip'];
    if (realIP) {
      return Array.isArray(realIP) ? realIP[0] : realIP;
    }

    return req.connection.remoteAddress || req.socket.remoteAddress || (req as any).ip || 'unknown';
  }
}
