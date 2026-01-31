import IORedis from 'ioredis';
import { Worker, Job } from 'bullmq';
import { QUEUE_NAME } from '../queue/queue';

export interface WelcomeEmailJobData {
  userId: string;
  email: string;
}

/**
 * Creates and returns the email worker for the main queue.
 * Call when ENABLE_QUEUE=true to process send-welcome-email jobs.
 * Uses its own Redis connection (same URL as queue) so it can run in the same process or a separate one.
 */
export function startEmailWorker(): Worker {
  const url = process.env.REDIS_URL || 'redis://localhost:6379';
  const connection = new IORedis(url, {
    maxRetriesPerRequest: null,
  });

  const worker = new Worker(
    QUEUE_NAME,
    async (job: Job<WelcomeEmailJobData>) => {
      if (job.name === 'send-welcome-email') {
        const { userId, email } = job.data;
        console.log(`→ [Worker] Sending welcome email to ${email} (userId: ${userId})`);
        // TODO: integrate with resend / sendgrid / aws ses
      }
    },
    { connection }
  );

  worker.on('failed', (job, err) => {
    console.error(`Job ${job?.id} (${job?.name}) failed:`, err.message);
  });

  return worker;
}
