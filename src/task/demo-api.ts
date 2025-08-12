import { NextFunction, Request, Response, Router } from 'express';
import { TaskManager, TaskExecutionService, SampleExecutor, FileProcessingExecutor, APICallExecutor } from './index';
import { getLogger } from '../util';

const logger = getLogger('TaskDemoAPI');

export class TaskDemoAPI {
  constructor(
    private taskManager: TaskManager,
    private taskExecutionService: TaskExecutionService
  ) {}

  /**
   * Build demo task API routes
   */
  public buildRoutes(router: Router) {
    logger.debug('[TaskDemoAPI::buildRoutes] Creating demo task API routes.');

    // Demo endpoints that show how to use the task system
    router.post('/demo/tasks/sample', this.createSampleTask.bind(this));
    router.post('/demo/tasks/file-processing', this.createFileProcessingTask.bind(this));
    router.post('/demo/tasks/api-call', this.createAPICallTask.bind(this));
    router.post('/demo/tasks/batch', this.createBatchTask.bind(this));

    // Task execution examples
    router.post('/demo/tasks/:id/execute', this.executeTask.bind(this));
    router.get('/demo/tasks/:id/result', this.getTaskResult.bind(this));
  }

  /**
   * Create a sample task that simulates a long-running process
   */
  public async createSampleTask(req: Request, res: Response, next: NextFunction) {
    try {
      const { delayMs = 5000, description } = req.body;

      // Create the task
      const task = await this.taskManager.createTask(req, {
        name: 'Sample Long-Running Task',
        description: description || 'A sample task that simulates work over time',
        metadata: {
          type: 'sample',
          delayMs,
          createdAt: new Date().toISOString(),
        },
      });

      // Start execution in background (non-blocking)
      this.taskExecutionService.executeTask(req.sessionKey!, task.id, new SampleExecutor(delayMs));

      res.status(201).json({
        success: true,
        message: 'Sample task created and started',
        task,
        note: 'Task is running in the background. Use the task ID to check progress.',
      });
    } catch (error) {
      logger.error('Error creating sample task:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create sample task',
        error: (error as Error).message,
      });
    }
  }

  /**
   * Create a file processing task
   */
  public async createFileProcessingTask(req: Request, res: Response, next: NextFunction) {
    try {
      const { filePath, description } = req.body;

      if (!filePath) {
        return res.status(400).json({
          success: false,
          message: 'filePath is required',
        });
      }

      // Create the task
      const task = await this.taskManager.createTask(req, {
        name: 'File Processing Task',
        description: description || `Processing file: ${filePath}`,
        metadata: {
          type: 'file-processing',
          filePath,
          fileSize: req.body.fileSize,
          processingType: req.body.processingType || 'default',
        },
      });

      // Start execution in background
      this.taskExecutionService.executeTask(req.sessionKey!, task.id, new FileProcessingExecutor(filePath));

      res.status(201).json({
        success: true,
        message: 'File processing task created and started',
        task,
        note: 'File is being processed in the background. Check progress using the task ID.',
      });
    } catch (error) {
      logger.error('Error creating file processing task:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create file processing task',
        error: (error as Error).message,
      });
    }
  }

  /**
   * Create an API call task
   */
  public async createAPICallTask(req: Request, res: Response, next: NextFunction) {
    try {
      const { endpoint, data, description } = req.body;

      if (!endpoint) {
        return res.status(400).json({
          success: false,
          message: 'endpoint is required',
        });
      }

      // Create the task
      const task = await this.taskManager.createTask(req, {
        name: 'API Call Task',
        description: description || `Making API call to: ${endpoint}`,
        metadata: {
          type: 'api-call',
          endpoint,
          data,
          method: req.body.method || 'POST',
          headers: req.body.headers,
        },
      });

      // Start execution in background
      this.taskExecutionService.executeTask(req.sessionKey!, task.id, new APICallExecutor(endpoint, data));

      res.status(201).json({
        success: true,
        message: 'API call task created and started',
        task,
        note: 'API call is being made in the background. Check progress using the task ID.',
      });
    } catch (error) {
      logger.error('Error creating API call task:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create API call task',
        error: (error as Error).message,
      });
    }
  }

  /**
   * Create a batch task that processes multiple items
   */
  public async createBatchTask(req: Request, res: Response, next: NextFunction) {
    try {
      const { items, description } = req.body;

      if (!items || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'items array is required and must not be empty',
        });
      }

      // Create the task
      const task = await this.taskManager.createTask(req, {
        name: 'Batch Processing Task',
        description: description || `Processing ${items.length} items in batch`,
        metadata: {
          type: 'batch-processing',
          itemCount: items.length,
          items: items.slice(0, 10), // Store first 10 items for reference
          processingType: req.body.processingType || 'sequential',
        },
      });

      // Start execution in background with a custom executor
      this.taskExecutionService.executeTask(req.sessionKey!, task.id, new BatchProcessingExecutor(items));

      res.status(201).json({
        success: true,
        message: 'Batch processing task created and started',
        task,
        note: `Processing ${items.length} items in the background. Check progress using the task ID.`,
      });
    } catch (error) {
      logger.error('Error creating batch task:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create batch task',
        error: (error as Error).message,
      });
    }
  }

  /**
   * Execute a specific task by ID
   */
  public async executeTask(req: Request, res: Response, next: NextFunction) {
    try {
      const taskId = req.params.id;
      const sessionKey = req.sessionKey!;

      // Get the task to determine its type
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

      // Determine executor based on task metadata
      let executor;
      const taskType = task.metadata?.type;

      switch (taskType) {
        case 'sample':
          executor = new SampleExecutor(task.metadata?.delayMs || 5000);
          break;
        case 'file-processing':
          executor = new FileProcessingExecutor(task.metadata?.filePath || 'unknown');
          break;
        case 'api-call':
          executor = new APICallExecutor(task.metadata?.endpoint || 'unknown', task.metadata?.data);
          break;
        case 'batch-processing':
          executor = new BatchProcessingExecutor(task.metadata?.items || []);
          break;
        default:
          return res.status(400).json({
            success: false,
            message: 'Unknown task type or missing metadata',
          });
      }

      // Start execution
      this.taskExecutionService.executeTask(sessionKey, taskId, executor);

      res.json({
        success: true,
        message: 'Task execution started',
        taskId,
        taskType,
      });
    } catch (error) {
      logger.error('Error executing task:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to execute task',
        error: (error as Error).message,
      });
    }
  }

  /**
   * Get task result (if completed)
   */
  public async getTaskResult(req: Request, res: Response, next: NextFunction) {
    try {
      const taskId = req.params.id;
      const task = await this.taskManager.getTask(req, taskId);

      if (!task) {
        return res.status(404).json({
          success: false,
          message: 'Task not found',
        });
      }

      if (task.status === 'completed') {
        res.json({
          success: true,
          message: 'Task completed successfully',
          result: {
            taskId: task.id,
            name: task.name,
            completedAt: task.completedAt,
            metadata: task.metadata,
            result: task.metadata?.result || 'No specific result data',
          },
        });
      } else if (task.status === 'failed') {
        res.json({
          success: false,
          message: 'Task failed',
          error: task.error,
          task: {
            id: task.id,
            name: task.name,
            status: task.status,
            error: task.error,
          },
        });
      } else {
        res.json({
          success: false,
          message: 'Task not yet completed',
          status: task.status,
          progress: task.progress,
          task: {
            id: task.id,
            name: task.name,
            status: task.status,
            progress: task.progress,
          },
        });
      }
    } catch (error) {
      logger.error('Error getting task result:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get task result',
        error: (error as Error).message,
      });
    }
  }
}

/**
 * Custom executor for batch processing tasks
 */
class BatchProcessingExecutor {
  constructor(private items: any[]) {}

  async execute(task: any, progressCallback: (progress: number) => Promise<void>): Promise<void> {
    const totalItems = this.items.length;

    for (let i = 0; i < totalItems; i++) {
      // Simulate processing each item
      await new Promise(resolve => setTimeout(resolve, 100));

      // Calculate progress
      const progress = Math.round(((i + 1) / totalItems) * 100);
      await progressCallback(progress);
    }
  }
}
