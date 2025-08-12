import { DatabaseFactory } from '../db-factory';
import { TaskManager } from './task-manager';
import { TaskCleanupOptions } from './types';
import { getLogger } from '../util';

const logger = getLogger('TaskCleanupService');

export class TaskCleanupService {
  private dbFactory: DatabaseFactory;
  private taskManager: TaskManager;
  private options: TaskCleanupOptions;
  private cleanupInterval?: NodeJS.Timeout;
  private isRunning: boolean = false;

  constructor(dbFactory: DatabaseFactory, taskManager: TaskManager, options: TaskCleanupOptions) {
    this.dbFactory = dbFactory;
    this.taskManager = taskManager;
    this.options = options;
  }

  /**
   * Start the cleanup service
   */
  start(): void {
    if (this.cleanupInterval) {
      logger.warn('Task cleanup service is already running');
      return;
    }

    logger.info('Starting task cleanup service');

    this.cleanupInterval = setInterval(async () => {
      await this.runCleanup();
    }, this.options.cleanupInterval);
  }

  /**
   * Stop the cleanup service
   */
  stop(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = undefined;
      logger.info('Stopped task cleanup service');
    }
  }

  /**
   * Run cleanup manually
   */
  async runCleanup(): Promise<number> {
    if (this.isRunning) {
      logger.debug('Cleanup already in progress, skipping');
      return 0;
    }

    this.isRunning = true;
    let totalCleaned = 0;

    try {
      logger.debug('Starting task cleanup cycle');

      const activeSessions = this.dbFactory.getActiveSessions();

      for (const sessionKey of activeSessions) {
        try {
          const db = this.dbFactory.getDatabase(sessionKey);
          const cleaned = await this.taskManager.cleanupSessionTasks(db, sessionKey, {
            maxCompletedTasks: this.options.maxCompletedTasks,
            maxFailedTasks: this.options.maxFailedTasks,
          });

          totalCleaned += cleaned;

          if (cleaned > 0) {
            logger.debug(`Cleaned up ${cleaned} tasks for session ${sessionKey}`);
          }
        } catch (error) {
          logger.error(`Error cleaning up tasks for session ${sessionKey}: ${error}`);
        }
      }

      logger.info(
        `Task cleanup cycle completed: cleaned ${totalCleaned} tasks across ${activeSessions.length} sessions`
      );
    } catch (error) {
      logger.error(`Error during task cleanup cycle: ${error}`);
    } finally {
      this.isRunning = false;
    }

    return totalCleaned;
  }

  /**
   * Get cleanup service status
   */
  getStatus(): Record<string, any> {
    return {
      isRunning: this.isRunning,
      isActive: !!this.cleanupInterval,
      options: this.options,
      lastRun: this.isRunning ? 'in_progress' : 'idle',
    };
  }

  /**
   * Update cleanup options
   */
  updateOptions(newOptions: Partial<TaskCleanupOptions>): void {
    this.options = { ...this.options, ...newOptions };
    logger.info('Updated task cleanup options', this.options);
  }
}
