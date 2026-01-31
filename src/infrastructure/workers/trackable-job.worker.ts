import IORedis from 'ioredis';
import { Worker, Job } from 'bullmq';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../../generated/prisma/client';
import { QUEUE_NAME, TRACKABLE_JOB_NAME } from '../queue/queue';
import { PrismaJobRepository } from '../repositories/job.repository.prisma';
import type { Job as DomainJob } from '../../core/types';

export interface TrackableJobPayload {
  jobId: string;
  type: string;
}

/**
 * Creates and returns the trackable-job worker.
 * Loads job from DB by jobId, dispatches by type, updates job row (processing → completed/failed).
 * Uses its own Prisma connection (DATABASE_URL) so it can run in the same process or separately.
 */
export function startTrackableJobWorker(): Worker {
  const url = process.env.REDIS_URL || 'redis://localhost:6379';
  const connection = new IORedis(url, {
    maxRetriesPerRequest: null,
  });

  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) throw new Error('DATABASE_URL is required for trackable job worker');

  const adapter = new PrismaPg({ connectionString: dbUrl });
  const prisma = new PrismaClient({ adapter });
  const jobRepo = new PrismaJobRepository(prisma);

  const worker = new Worker<TrackableJobPayload>(
    QUEUE_NAME,
    async (job: Job<TrackableJobPayload>) => {
      if (job.name !== TRACKABLE_JOB_NAME) return;
      const { jobId, type } = job.data;

      const domainJob = await jobRepo.findById(jobId);
      if (!domainJob) {
        console.error(`[TrackableJobWorker] Job not found: ${jobId}`);
        return;
      }
      if (domainJob.status !== 'pending') {
        console.warn(`[TrackableJobWorker] Job ${jobId} already ${domainJob.status}, skipping`);
        return;
      }

      await jobRepo.update(jobId, { status: 'processing' });

      try {
        if (type === 'dummy') {
          await handleDummyJob(jobRepo, jobId, domainJob);
        } else {
          await jobRepo.update(jobId, {
            status: 'failed',
            error: { message: `Unknown job type: ${type}` },
            completedAt: new Date(),
          });
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        await jobRepo.update(jobId, {
          status: 'failed',
          error: { message, stack: err instanceof Error ? err.stack : undefined },
          completedAt: new Date(),
        });
        throw err;
      }
    },
    { connection }
  );

  worker.on('failed', (job, err) => {
    console.error(`[TrackableJobWorker] Job ${job?.id} (${job?.name}) failed:`, err.message);
  });

  return worker;
}

/** Dummy job: wait random seconds (from meta or 1–5), then complete with result. */
async function handleDummyJob(
  jobRepo: PrismaJobRepository,
  jobId: string,
  job: DomainJob
): Promise<void> {
  const meta = (job.meta ?? {}) as { delayMinSec?: number; delayMaxSec?: number };
  const minSec = meta.delayMinSec ?? 1;
  const maxSec = meta.delayMaxSec ?? 5;
  const sec = Math.max(0, minSec + Math.random() * (maxSec - minSec));
  await new Promise(resolve => setTimeout(resolve, sec * 1000));

  const completedAt = new Date();
  await jobRepo.update(jobId, {
    status: 'completed',
    result: { waitedSeconds: Math.round(sec * 1000) / 1000, completedAt: completedAt.toISOString() },
    completedAt,
  });
}
