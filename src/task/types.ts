export enum TaskStatus {
  PENDING = 'pending',
  RUNNING = 'running',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
}

export interface Task {
  id: string;
  name: string;
  description?: string;
  status: TaskStatus;
  progress: number; // 0-100
  currentStep?: string; // Current step name
  currentStepDescription?: string; // Current step description
  createdAt: number;
  updatedAt: number;
  startedAt?: number;
  completedAt?: number;
  error?: string;
  metadata?: Record<string, any>;

  // Session isolation fields
  sessionKey: string;
  sessionDatabase: string;

  // Optional user context
  userId?: string;
  ipAddress?: string;
}

export interface CreateTaskRequest {
  name: string;
  description?: string;
  metadata?: Record<string, any>;
  userId?: string;
}

export interface UpdateTaskRequest {
  status?: TaskStatus;
  progress?: number;
  currentStep?: string;
  currentStepDescription?: string;
  error?: string;
  metadata?: Record<string, any>;
}

export interface TaskExecutor {
  execute(
    task: Task,
    progressCallback: (progress: number, step?: string, stepDescription?: string) => Promise<void>
  ): Promise<void>;
}

export interface TaskCleanupOptions {
  maxCompletedTasks: number; // Keep only N most recent completed tasks per session
  maxFailedTasks: number; // Keep only N most recent failed tasks per session
  cleanupInterval: number; // Run cleanup every N milliseconds
}
