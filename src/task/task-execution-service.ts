import { DatabaseFactory } from '../db-factory';
import { Task, TaskStatus, TaskExecutor } from './types';
import { getLogger } from '../util';

const logger = getLogger('TaskExecutionService');

export class TaskExecutionService {
  private runningTasks: Map<string, boolean> = new Map();
  private dbFactory: DatabaseFactory;

  constructor(dbFactory: DatabaseFactory) {
    this.dbFactory = dbFactory;
  }

  /**
   * Execute a task in the background
   */
  async executeTask(sessionKey: string, taskId: string, executor: TaskExecutor): Promise<void> {
    const taskKey = `${sessionKey}:${taskId}`;

    if (this.runningTasks.has(taskKey)) {
      logger.warn(`Task ${taskId} is already running for session ${sessionKey}`);
      return;
    }

    this.runningTasks.set(taskKey, true);

    try {
      const db = this.dbFactory.getDatabase(sessionKey);
      const task = db.findById('tasks', taskId) as Task;

      if (!task || task.sessionKey !== sessionKey) {
        throw new Error('Task not found or access denied');
      }

      logger.info(`Starting execution of task ${taskId} for session ${sessionKey}`);

      // Update status to running
      await this.updateTaskProgress(sessionKey, taskId, 0, TaskStatus.RUNNING);

      // Execute the task with progress callbacks
      await executor.execute(task, async (progress: number, step?: string, stepDescription?: string) => {
        await this.updateTaskProgress(sessionKey, taskId, progress, undefined, undefined, step, stepDescription);
      });

      // Mark as completed
      await this.updateTaskProgress(sessionKey, taskId, 100, TaskStatus.COMPLETED);

      logger.info(`Completed execution of task ${taskId} for session ${sessionKey}`);
    } catch (error) {
      logger.error(`Error executing task ${taskId} for session ${sessionKey}: ${error}`);

      // Mark as failed
      await this.updateTaskProgress(sessionKey, taskId, 0, TaskStatus.FAILED, (error as Error).message);
    } finally {
      this.runningTasks.delete(taskKey);
    }
  }

  /**
   * Update task progress and status
   */
  private async updateTaskProgress(
    sessionKey: string,
    taskId: string,
    progress: number,
    status?: TaskStatus,
    error?: string,
    step?: string,
    stepDescription?: string
  ): Promise<void> {
    try {
      const db = this.dbFactory.getDatabase(sessionKey);
      const task = db.findById('tasks', taskId) as Task;

      if (task && task.sessionKey === sessionKey) {
        // Update fields
        if (status !== undefined) {
          task.status = status;

          if (status === TaskStatus.COMPLETED && !task.completedAt) {
            task.completedAt = Date.now();
          } else if (status === TaskStatus.RUNNING && !task.startedAt) {
            task.startedAt = Date.now();
          }
        }

        if (progress !== undefined) {
          task.progress = Math.max(0, Math.min(100, progress));
        }

        if (step !== undefined) {
          task.currentStep = step;
        }

        if (stepDescription !== undefined) {
          task.currentStepDescription = stepDescription;
        }

        if (error !== undefined) {
          task.error = error;
        }

        task.updatedAt = Date.now();

        db.createOrUpdate('tasks', task);

        logger.debug(
          `Updated task ${taskId} for session ${sessionKey}: status=${status}, progress=${progress}, step=${step}`
        );
      }
    } catch (error) {
      logger.error(`Failed to update task ${taskId} progress: ${error}`);
    }
  }

  /**
   * Check if a task is currently running
   */
  isTaskRunning(sessionKey: string, taskId: string): boolean {
    const taskKey = `${sessionKey}:${taskId}`;
    return this.runningTasks.has(taskKey);
  }

  /**
   * Get all currently running tasks
   */
  getRunningTasks(): string[] {
    return Array.from(this.runningTasks.keys());
  }

  /**
   * Cancel a running task
   */
  async cancelRunningTask(sessionKey: string, taskId: string): Promise<boolean> {
    const taskKey = `${sessionKey}:${taskId}`;

    if (this.runningTasks.has(taskKey)) {
      this.runningTasks.delete(taskKey);

      // Update task status to cancelled
      await this.updateTaskProgress(sessionKey, taskId, 0, TaskStatus.CANCELLED);

      logger.info(`Cancelled running task ${taskId} for session ${sessionKey}`);
      return true;
    }

    return false;
  }

  /**
   * Cancel all running tasks (for cleanup purposes)
   */
  async cancelAllRunningTasks(): Promise<number> {
    const cancelledCount = this.runningTasks.size;

    for (const taskKey of this.runningTasks.keys()) {
      const [sessionKey, taskId] = taskKey.split(':');
      if (sessionKey && taskId) {
        await this.cancelRunningTask(sessionKey, taskId);
      }
    }

    logger.info(`Cancelled ${cancelledCount} running tasks during cleanup`);
    return cancelledCount;
  }
}
