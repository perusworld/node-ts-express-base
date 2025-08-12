import { Task, TaskExecutor } from '../types';
import { getLogger } from '../../util';

const logger = getLogger('SampleExecutor');

/**
 * Sample task executor that simulates a long-running process
 * This demonstrates how to implement the TaskExecutor interface
 */
export class SampleExecutor implements TaskExecutor {
  constructor(private delayMs: number = 5000) {}

  async execute(task: Task, progressCallback: (progress: number) => Promise<void>): Promise<void> {
    logger.info(`Starting sample task execution: ${task.name} (${task.id})`);

    try {
      // Simulate work with progress updates
      const steps = 10;
      const stepDelay = this.delayMs / steps;

      for (let i = 0; i <= steps; i++) {
        const progress = Math.round((i / steps) * 100);

        // Update progress
        await progressCallback(progress);

        // Simulate work
        if (i < steps) {
          await this.sleep(stepDelay);
        }

        logger.debug(`Task ${task.id} progress: ${progress}%`);
      }

      logger.info(`Completed sample task execution: ${task.name} (${task.id})`);
    } catch (error) {
      logger.error(`Error in sample task execution: ${error}`);
      throw error;
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * File processing executor example
 */
export class FileProcessingExecutor implements TaskExecutor {
  constructor(private filePath: string) {}

  async execute(task: Task, progressCallback: (progress: number) => Promise<void>): Promise<void> {
    logger.info(`Starting file processing: ${this.filePath} (${task.id})`);

    try {
      // Simulate file processing steps
      const steps = [
        { name: 'Validating file', progress: 10 },
        { name: 'Reading file content', progress: 25 },
        { name: 'Processing data', progress: 50 },
        { name: 'Transforming content', progress: 75 },
        { name: 'Saving results', progress: 90 },
        { name: 'Finalizing', progress: 100 },
      ];

      for (const step of steps) {
        logger.debug(`Task ${task.id}: ${step.name}`);
        await progressCallback(step.progress);

        // Simulate work
        await this.sleep(1000);
      }

      logger.info(`Completed file processing: ${this.filePath} (${task.id})`);
    } catch (error) {
      logger.error(`Error in file processing: ${error}`);
      throw error;
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * API call executor example
 */
export class APICallExecutor implements TaskExecutor {
  constructor(
    private endpoint: string,
    private data: any
  ) {}

  async execute(task: Task, progressCallback: (progress: number) => Promise<void>): Promise<void> {
    logger.info(`Starting API call: ${this.endpoint} (${task.id})`);

    try {
      // Simulate API call steps
      await progressCallback(20);
      await this.sleep(500);

      await progressCallback(40);
      await this.sleep(500);

      await progressCallback(60);
      await this.sleep(500);

      await progressCallback(80);
      await this.sleep(500);

      await progressCallback(100);

      logger.info(`Completed API call: ${this.endpoint} (${task.id})`);
    } catch (error) {
      logger.error(`Error in API call: ${error}`);
      throw error;
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
