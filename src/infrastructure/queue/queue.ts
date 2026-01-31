import IORedis from 'ioredis';
import { Queue } from 'bullmq';
import { features } from '../../config/features';

const QUEUE_NAME = 'main';

let connection: IORedis | null = null;
let mainQueue: Queue | null = null;

/**
 * Redis connection for BullMQ. Only created when features.useQueue.
 * maxRetriesPerRequest: null is required by BullMQ for blocking commands.
 */
function getConnection(): IORedis | null {
  if (!features.useQueue) return null;
  if (connection) return connection;
  const url = process.env.REDIS_URL || 'redis://localhost:6379';
  connection = new IORedis(url, {
    maxRetriesPerRequest: null,
  });
  return connection;
}

/**
 * Main queue. Only created when features.useQueue and Redis is used.
 */
export function getMainQueue(): Queue | null {
  if (!features.useQueue) return null;
  const conn = getConnection();
  if (!conn) return null;
  if (!mainQueue) {
    mainQueue = new Queue(QUEUE_NAME, { connection: conn });
  }
  return mainQueue;
}

/** BullMQ job name for trackable jobs. Worker dispatches by payload.type. */
export const TRACKABLE_JOB_NAME = 'trackable';

/**
 * Schedule a welcome-email job. No-op when ENABLE_QUEUE is not 'true'.
 */
export async function scheduleWelcomeEmail(userId: string, email: string): Promise<void> {
  const queue = getMainQueue();
  if (!queue) return;
  await queue.add(
    'send-welcome-email',
    { userId, email },
    { attempts: 3, backoff: { type: 'exponential', delay: 1000 } }
  );
}

/**
 * Enqueue a trackable job. Payload is { jobId, type }; worker loads job from DB.
 * No-op when ENABLE_QUEUE is not 'true'.
 */
export async function enqueueTrackableJob(jobId: string, type: string): Promise<void> {
  const queue = getMainQueue();
  if (!queue) return;
  await queue.add(
    TRACKABLE_JOB_NAME,
    { jobId, type },
    { attempts: 3, backoff: { type: 'exponential', delay: 1000 } }
  );
}

export { QUEUE_NAME };
