# 🚀 Async Task System - Prototype & Demo Guide

## Overview

The Async Task System is designed for **prototyping and demonstrating background task processing capabilities**. It provides realistic workflow simulations with progress tracking, making it perfect for client presentations and proof-of-concept development.

**Note: This is a prototype system using in-memory storage. Tasks are lost on server restart.**

### Task System vs. Job API

| Feature | Task System (`/api/v1/tasks`) | Job API (`/api/v1/jobs`) |
|---------|------------------------------|---------------------------|
| Storage | In-memory, session-scoped | PostgreSQL (when `STORAGE=prisma`) |
| Persistence | Lost on restart | Persistent |
| Requires | `ENABLE_SESSION_ISOLATION=true` | `STORAGE=prisma` + `ENABLE_QUEUE=true` |
| Auth | Session/IP-based | JWT required |
| Use case | Demos, workflow demonstrations | Production background jobs |

Use the **Task System** for demos and POCs. Use the **Job API** when you need persistent, trackable jobs in production.

## Prerequisites

Make sure you have session isolation enabled in your `.env` file:

```bash
ENABLE_SESSION_ISOLATION=true
AUTO_MAP_SESSION_BY_IP=true
```

## Quick Start

### 1. Start the Server

```bash
npm run dev
```

The task system will automatically initialize when the server starts.

### 2. Test the Demo Endpoints

#### Create a Sample Task

```bash
curl -X POST http://localhost:3000/api/v1/demo/tasks/sample \
  -H "Content-Type: application/json" \
  -d '{
    "delayMs": 3000,
    "description": "My first async task"
  }'
```

**Response:**

```json
{
  "success": true,
  "message": "Sample task created and started",
  "task": {
    "id": "uuid-here",
    "name": "Sample Long-Running Task",
    "status": "pending",
    "progress": 0,
    "sessionKey": "ip_hash_here"
  },
  "note": "Task is running in the background. Use the task ID to check progress."
}
```

#### Check Task Progress

```bash
curl http://localhost:3000/api/v1/tasks/UUID_HERE/status
```

**Response:**

```json
{
  "success": true,
  "status": "running",
  "progress": 45,
  "currentStep": "Processing Data",
  "currentStepDescription": "Analyzing input data and preparing output",
  "startedAt": 1234567890,
  "completedAt": null,
  "error": null
}
```

#### List All Tasks for Your Session

```bash
curl http://localhost:3000/api/v1/tasks
```

**Response:**

```json
{
  "success": true,
  "tasks": [
    {
      "id": "uuid-here",
      "name": "Sample Long-Running Task",
      "status": "completed",
      "progress": 100,
      "createdAt": 1234567890,
      "completedAt": 1234567890
    }
  ],
  "count": 1
}
```

## Available API Endpoints

### Task Management

- `POST /api/v1/tasks` - Create task
- `GET /api/v1/tasks` - List tasks (session-scoped)
- `GET /api/v1/tasks/:id` - Get task details

### Task Control

- `POST /api/v1/tasks/:id/start` - Start execution
- `POST /api/v1/tasks/:id/cancel` - Cancel task
- `POST /api/v1/tasks/:id/retry` - Retry failed task

### Task Information

- `GET /api/v1/tasks/:id/status` - Get status and progress with enhanced step information
- `GET /api/v1/tasks/stats` - Get session statistics

### Cleanup Service

- `GET /api/v1/tasks/cleanup/status` - Get cleanup service status
- `POST /api/v1/tasks/cleanup/run` - Run manual cleanup

## Security Features

### Immutable Task Execution

- **No Manual Updates**: Tasks cannot be manually modified once created
- **Controlled State Transitions**: Only predefined operations can change task status
- **Progress Integrity**: Progress can only be updated by executors, not manually
- **Audit Trail**: Complete task history is preserved for compliance

### Enhanced Step Information

The task status endpoint now returns rich step information:

- `currentStep`: Current step name (e.g., "Processing Data")
- `currentStepDescription`: Detailed description of current step
- `progress`: Numeric progress (0-100)
- `status`: Current task status
- `startedAt`/`completedAt`: Execution timestamps

### Demo Endpoints

- `POST /api/v1/demo/tasks/sample` - Sample long-running task
- `POST /api/v1/demo/tasks/file-processing` - File processing example
- `POST /api/v1/demo/tasks/api-call` - API call example
- `POST /api/v1/demo/tasks/batch` - Batch processing example

## Testing Different Task Types

### File Processing Task

```bash
curl -X POST http://localhost:3000/api/v1/demo/tasks/file-processing \
  -H "Content-Type: application/json" \
  -d '{
    "filePath": "/path/to/file.txt",
    "fileSize": 1024,
    "description": "Processing my document"
  }'
```

### API Call Task

```bash
curl -X POST http://localhost:3000/api/v1/demo/tasks/api-call \
  -H "Content-Type: application/json" \
  -d '{
    "endpoint": "https://api.example.com/data",
    "data": {"key": "value"},
    "description": "Fetching external data"
  }'
```

### Batch Processing Task

```bash
curl -X POST http://localhost:3000/api/v1/demo/tasks/batch \
  -H "Content-Type: application/json" \
  -d '{
    "items": ["item1", "item2", "item3", "item4", "item5"],
    "description": "Processing multiple items"
  }'
```

## Monitoring and Management

### Check Cleanup Service Status

```bash
curl http://localhost:3000/api/v1/tasks/cleanup/status
```

**Response:**

```json
{
  "success": true,
  "status": {
    "isRunning": false,
    "isActive": true,
    "options": {
      "maxCompletedTasks": 50,
      "maxFailedTasks": 20,
      "cleanupInterval": 300000
    },
    "lastRun": "idle"
  }
}
```

### Get Task Statistics

```bash
curl http://localhost:3000/api/v1/tasks/stats
```

**Response:**

```json
{
  "success": true,
  "stats": {
    "total": 3,
    "pending": 0,
    "running": 0,
    "completed": 2,
    "failed": 0,
    "cancelled": 1
  }
}
```

### Manual Cleanup

```bash
curl -X POST http://localhost:3000/api/v1/tasks/cleanup/run
```

## Integration Examples

### 1. Creating a Task in Your Business Logic

```typescript
// In your API service
public async processLargeFile(req: Request, res: Response) {
  // Create task in the caller's session
  const task = await this.taskManager.createTask(req, {
    name: 'File Processing',
    description: 'Processing uploaded file',
    metadata: {
      fileName: req.body.fileName,
      fileSize: req.body.fileSize
    }
  });

  // Start async execution
  this.taskExecutionService.executeTask(
    req.sessionKey!,
    task.id,
    new FileProcessingExecutor(req.body.filePath)
  );

  // Return immediately with task ID
  res.json({
    message: 'File processing started',
    taskId: task.id,
    status: 'pending'
  });
}
```

### 2. Implementing a Task Executor

```typescript
export class CustomTaskExecutor implements TaskExecutor {
  async execute(task: Task, progressCallback: (progress: number) => Promise<void>): Promise<void> {
    try {
      await progressCallback(0);

      // Do your work here
      await this.step1();
      await progressCallback(25);

      await this.step2();
      await progressCallback(50);

      await this.step3();
      await progressCallback(75);

      await this.finalize();
      await progressCallback(100);
    } catch (error) {
      throw error; // Will be handled by execution service
    }
  }
}
```

### 3. Monitoring Task Progress

```typescript
// Client can poll for status
const response = await fetch(`/api/v1/tasks/${taskId}/status`);
const status = await response.json();

if (status.status === 'completed') {
  console.log('Task completed!');
} else if (status.status === 'failed') {
  console.log('Task failed:', status.error);
} else {
  console.log(`Task progress: ${status.progress}%`);
}
```

## Configuration

Environment variables for customization:

```bash
MAX_COMPLETED_TASKS=50          # Max completed tasks per session
MAX_FAILED_TASKS=20            # Max failed tasks per session
TASK_CLEANUP_INTERVAL=300000   # Cleanup interval in ms (5 min)
```

## Testing Session Isolation

1. **Open another terminal** and make requests from a different IP or with a different session key
2. **Verify tasks are completely isolated** between sessions
3. **Check that each session** only sees its own tasks

## What You Should See

1. **Immediate Response**: API calls return instantly with a task ID
2. **Background Execution**: Tasks run in the background
3. **Progress Updates**: Check progress by polling the status endpoint
4. **Session Isolation**: Tasks from different IPs/sessions are completely separate
5. **Automatic Cleanup**: Old tasks are automatically cleaned up

## Server Logs

Watch your server console for task execution logs:

```
2025-08-12 05:56:10 info: Starting execution of task uuid-here for session ip_hash_here
2025-08-12 05:56:10 debug: Task uuid-here progress: 0%
2025-08-12 05:56:10 debug: Task uuid-here progress: 10%
...
2025-08-12 05:56:10 info: Completed execution of task uuid-here for session ip_hash_here
```

## Troubleshooting

### Task System Not Working?

- Check that `ENABLE_SESSION_ISOLATION=true` in your `.env`
- Look for "Task system initialized successfully" in server logs
- Verify the session database middleware is working

### Tasks Not Executing?

- Check that you're using the correct session key
- Look for execution errors in the server logs
- Verify the task executor implements the `TaskExecutor` interface

### Cleanup Not Working?

- Check the cleanup service status endpoint
- Verify `TASK_CLEANUP_INTERVAL` is set correctly
- Look for cleanup logs in the console

## Next Steps

1. **Replace Demo Executors**: Implement your actual business logic
2. **Add Real-time Updates**: Consider WebSocket integration
3. **Monitor Performance**: Adjust cleanup intervals and retention policies
4. **Scale Up**: The system handles multiple concurrent tasks per session
5. **Need persistent jobs?** Use the Job API (`/api/v1/jobs`) with `STORAGE=prisma` and `ENABLE_QUEUE=true` — see [README.md](README.md#-storage--production-options)

The async task system is now ready for demos and prototyping! 🎉
