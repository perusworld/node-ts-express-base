// Jest setup file for handling async operations and cleanup
import { jest } from '@jest/globals';

// Increase timeout for all tests
jest.setTimeout(10000);

// Global teardown to ensure all timers and handles are cleared
afterAll(async () => {
  // Clear all timers
  jest.clearAllTimers();

  // Wait for any remaining async operations
  await new Promise(resolve => setTimeout(resolve, 500));

  // Force garbage collection if available
  if (global.gc) {
    global.gc();
  }
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// Handle uncaught exceptions
process.on('uncaughtException', error => {
  console.error('Uncaught Exception:', error);
});

// Handle process exit to ensure cleanup
process.on('exit', code => {
  console.log(`Process exiting with code: ${code}`);
});

// Handle SIGINT and SIGTERM for graceful shutdown
process.on('SIGINT', () => {
  console.log('Received SIGINT, cleaning up...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('Received SIGTERM, cleaning up...');
  process.exit(0);
});
