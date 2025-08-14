import { NextFunction, Request, Response, Router } from 'express';
import { TaskManager } from './task-manager';
import { TaskExecutionService } from './task-execution-service';
import { TaskCleanupService } from './task-cleanup-service';
import { TaskStatus } from './types';
import { getLogger } from '../util';

const logger = getLogger('TaskAPIRoute');

export class TaskAPIRoute {
  constructor(
    private taskManager: TaskManager,
    private taskExecutionService: TaskExecutionService,
    private taskCleanupService: TaskCleanupService
  ) {}

  /**
   * Build task API routes
   */
  public buildRoutes(router: Router) {
    logger.debug('[TaskAPIRoute::buildRoutes] Creating task API routes.');

    // Task CRUD operations
    router.post('/tasks', this.createTask.bind(this));
    router.get('/tasks', this.listTasks.bind(this));

    // Task information - specific routes must come before parameterized routes
    router.get('/tasks/stats', this.getTaskStats.bind(this));
    router.get('/tasks/cleanup/status', this.getCleanupStatus.bind(this));
    router.post('/tasks/cleanup/run', this.runCleanup.bind(this));

    // Task control operations - parameterized routes come after specific routes
    router.get('/tasks/:id', this.getTask.bind(this));
    router.post('/tasks/:id/start', this.startTask.bind(this));
    router.post('/tasks/:id/cancel', this.cancelTask.bind(this));
    router.post('/tasks/:id/retry', this.retryTask.bind(this));
    router.get('/tasks/:id/status', this.getTaskStatus.bind(this));
  }

  /**
   * Create a new task
   */
  public async createTask(req: Request, res: Response, next: NextFunction) {
    try {
      const task = await this.taskManager.createTask(req, req.body);
      res.status(201).json({
        success: true,
        message: 'Task created successfully',
        task,
      });
    } catch (error) {
      logger.error('Error creating task:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create task',
        error: (error as Error).message,
      });
    }
  }

  /**
   * List tasks for the current session
   */
  public async listTasks(req: Request, res: Response, next: NextFunction) {
    try {
      const filters: any = {};

      // Parse query parameters for filtering
      if (req.query.status) {
        filters.status = req.query.status;
      }

      if (req.query.userId) {
        filters.userId = req.query.userId;
      }

      if (req.query.currentStep) {
        filters.currentStep = req.query.currentStep;
      }

      const tasks = await this.taskManager.getTasks(req, filters);
      res.json({
        success: true,
        tasks,
        count: tasks.length,
      });
    } catch (error) {
      logger.error('Error listing tasks:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to list tasks',
        error: (error as Error).message,
      });
    }
  }

  /**
   * Get a specific task
   */
  public async getTask(req: Request, res: Response, next: NextFunction) {
    try {
      const taskId = req.params.id;
      const task = await this.taskManager.getTask(req, taskId);

      if (!task) {
        return res.status(404).json({
          success: false,
          message: 'Task not found',
        });
      }

      res.json({
        success: true,
        task,
      });
    } catch (error) {
      logger.error('Error getting task:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get task',
        error: (error as Error).message,
      });
    }
  }

  /**
   * Start a task execution
   */
  public async startTask(req: Request, res: Response, next: NextFunction) {
    try {
      const taskId = req.params.id;
      const sessionKey = req.sessionKey!;

      // Check if task exists and belongs to current session
      const task = await this.taskManager.getTask(req, taskId);
      if (!task) {
        return res.status(404).json({
          success: false,
          message: 'Task not found',
        });
      }

      // Check if task is already running
      if (this.taskExecutionService.isTaskRunning(sessionKey, taskId)) {
        return res.status(400).json({
          success: false,
          message: 'Task is already running',
        });
      }

      // For now, we'll just mark the task as started
      // In a real implementation, you'd inject the actual task executor here
      await this.taskManager.updateTask(req, taskId, { status: TaskStatus.RUNNING });

      res.json({
        success: true,
        message: 'Task started successfully',
        taskId,
      });
    } catch (error) {
      logger.error('Error starting task:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to start task',
        error: (error as Error).message,
      });
    }
  }

  /**
   * Cancel a task
   */
  public async cancelTask(req: Request, res: Response, next: NextFunction) {
    try {
      const taskId = req.params.id;
      const sessionKey = req.sessionKey!;

      // Try to cancel running task first
      const cancelled = await this.taskExecutionService.cancelRunningTask(sessionKey, taskId);

      if (!cancelled) {
        // If not running, try to cancel via task manager
        const task = await this.taskManager.cancelTask(req, taskId);
        if (!task) {
          return res.status(404).json({
            success: false,
            message: 'Task not found',
          });
        }
      }

      res.json({
        success: true,
        message: 'Task cancelled successfully',
      });
    } catch (error) {
      logger.error('Error cancelling task:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to cancel task',
        error: (error as Error).message,
      });
    }
  }

  /**
   * Retry a failed task
   */
  public async retryTask(req: Request, res: Response, next: NextFunction) {
    try {
      const taskId = req.params.id;
      const task = await this.taskManager.retryTask(req, taskId);

      if (!task) {
        return res.status(404).json({
          success: false,
          message: 'Task not found or cannot be retried',
        });
      }

      res.json({
        success: true,
        message: 'Task retried successfully',
        task,
      });
    } catch (error) {
      logger.error('Error retrying task:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retry task',
        error: (error as Error).message,
      });
    }
  }

  /**
   * Get task status
   */
  public async getTaskStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const taskId = req.params.id;
      const task = await this.taskManager.getTask(req, taskId);

      if (!task) {
        return res.status(404).json({
          success: false,
          message: 'Task not found',
        });
      }

      res.json({
        success: true,
        status: task.status,
        progress: task.progress,
        currentStep: task.currentStep,
        currentStepDescription: task.currentStepDescription,
        startedAt: task.startedAt,
        completedAt: task.completedAt,
        error: task.error,
      });
    } catch (error) {
      logger.error('Error getting task status:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get task status',
        error: (error as Error).message,
      });
    }
  }

  /**
   * Get task statistics for current session
   */
  public async getTaskStats(req: Request, res: Response, next: NextFunction) {
    try {
      const stats = await this.taskManager.getTaskStats(req);
      res.json({
        success: true,
        stats,
      });
    } catch (error) {
      logger.error('Error getting task stats:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get task statistics',
        error: (error as Error).message,
      });
    }
  }

  /**
   * Get cleanup service status
   */
  public getCleanupStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const status = this.taskCleanupService.getStatus();
      res.json({
        success: true,
        status,
      });
    } catch (error) {
      logger.error('Error getting cleanup status:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get cleanup status',
        error: (error as Error).message,
      });
    }
  }

  /**
   * Run cleanup manually
   */
  public async runCleanup(req: Request, res: Response, next: NextFunction) {
    try {
      const cleanedCount = await this.taskCleanupService.runCleanup();
      res.json({
        success: true,
        message: 'Cleanup completed successfully',
        cleanedCount,
      });
    } catch (error) {
      logger.error('Error running cleanup:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to run cleanup',
        error: (error as Error).message,
      });
    }
  }
}
