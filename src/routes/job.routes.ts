import { Router, Request, Response } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { isAdmin } from '../core/types';
import { enqueueTrackableJob } from '../infrastructure/queue/queue';
import type { JobStatus } from '../core/types';

/**
 * Job routes. Mount at /jobs (e.g. /api/v1/jobs).
 * Requires req.container with jobRepository; all routes require auth.
 */
export function buildJobRoutes(router: Router): void {
  router.use(authenticate);

  router.post('/', async (req: Request, res: Response) => {
    const repo = req.container?.jobRepository;
    if (!repo) {
      res.status(503).json({ error: 'Job service not available (requires STORAGE=prisma)' });
      return;
    }
    const user = req.user!;
    const { type, arguments: args, system } = req.body as {
      type?: string;
      arguments?: Record<string, unknown>;
      system?: boolean;
    };

    if (!type || typeof type !== 'string') {
      res.status(400).json({ error: 'type is required' });
      return;
    }

    const asSystem = system === true;
    if (asSystem && !isAdmin(user)) {
      res.status(403).json({ error: 'Only admins can create system jobs' });
      return;
    }

    try {
      const job = await repo.create({
        userId: asSystem ? null : user.id,
        type,
        status: 'pending',
        meta: args ?? undefined,
      });

      await enqueueTrackableJob(job.id, job.type);

      res.status(201).json({
        id: job.id,
        status: job.status,
        type: job.type,
        createdAt: job.createdAt,
        userId: job.userId,
      });
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  router.post('/start-dummy-job', async (req: Request, res: Response) => {
    const repo = req.container?.jobRepository;
    if (!repo) {
      res.status(503).json({ error: 'Job service not available (requires STORAGE=prisma)' });
      return;
    }
    const user = req.user!;
    const { delayMinSec, delayMaxSec } = req.body as { delayMinSec?: number; delayMaxSec?: number };

    try {
      const job = await repo.create({
        userId: user.id,
        type: 'dummy',
        status: 'pending',
        meta: { delayMinSec: delayMinSec ?? 1, delayMaxSec: delayMaxSec ?? 5 },
      });

      await enqueueTrackableJob(job.id, job.type);

      res.status(201).json({
        id: job.id,
        status: job.status,
        type: job.type,
        createdAt: job.createdAt,
      });
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  router.get('/', async (req: Request, res: Response) => {
    const repo = req.container?.jobRepository;
    if (!repo) {
      res.status(503).json({ error: 'Job service not available (requires STORAGE=prisma)' });
      return;
    }
    const user = req.user!;
    const status = req.query.status as JobStatus | undefined;
    const limit = req.query.limit !== undefined ? parseInt(String(req.query.limit), 10) : 50;
    const offset = req.query.offset !== undefined ? parseInt(String(req.query.offset), 10) : 0;

    try {
      const jobs = isAdmin(user)
        ? await repo.listAll({ status, limit, offset })
        : await repo.listByUserId(user.id, { status, limit, offset });
      res.json({ jobs });
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  router.get('/:id', async (req: Request, res: Response) => {
    const repo = req.container?.jobRepository;
    if (!repo) {
      res.status(503).json({ error: 'Job service not available (requires STORAGE=prisma)' });
      return;
    }
    const user = req.user!;
    const id = typeof req.params.id === 'string' ? req.params.id : req.params.id[0];

    const job = await repo.findById(id);
    if (!job) {
      res.status(404).json({ error: 'Job not found' });
      return;
    }

    const canAccess = job.userId === user.id || isAdmin(user);
    if (!canAccess) {
      res.status(403).json({ error: 'Access denied' });
      return;
    }

    res.json({
      id: job.id,
      userId: job.userId,
      type: job.type,
      status: job.status,
      meta: job.meta,
      result: job.result,
      error: job.error,
      bullJobId: job.bullJobId,
      createdAt: job.createdAt,
      updatedAt: job.updatedAt,
      completedAt: job.completedAt,
    });
  });
}
