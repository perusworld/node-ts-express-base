import { randomUUID } from 'crypto';
import { IJobRepository, Job, JobStatus } from '../../core/types';

export class InMemoryJobRepository implements IJobRepository {
  private jobs = new Map<string, Job>();

  async create(data: Omit<Job, 'id' | 'createdAt' | 'updatedAt'>): Promise<Job> {
    const now = new Date();
    const job: Job = {
      ...data,
      id: randomUUID(),
      createdAt: now,
      updatedAt: now,
    };
    this.jobs.set(job.id, job);
    return job;
  }

  async findById(id: string): Promise<Job | null> {
    return this.jobs.get(id) ?? null;
  }

  async update(
    id: string,
    data: Partial<Pick<Job, 'status' | 'result' | 'error' | 'bullJobId' | 'completedAt' | 'updatedAt'>>
  ): Promise<Job> {
    const job = this.jobs.get(id);
    if (!job) throw new Error('Job not found');
    const updated: Job = {
      ...job,
      ...data,
      updatedAt: new Date(),
    };
    this.jobs.set(id, updated);
    return updated;
  }

  async listByUserId(
    userId: string,
    opts?: { status?: JobStatus; limit?: number; offset?: number }
  ): Promise<Job[]> {
    let list = Array.from(this.jobs.values()).filter(j => j.userId === userId);
    if (opts?.status) list = list.filter(j => j.status === opts.status);
    list.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    const offset = opts?.offset ?? 0;
    const limit = opts?.limit ?? 50;
    return list.slice(offset, offset + limit);
  }

  async listAll(opts?: { status?: JobStatus; limit?: number; offset?: number }): Promise<Job[]> {
    let list = Array.from(this.jobs.values());
    if (opts?.status) list = list.filter(j => j.status === opts.status);
    list.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    const offset = opts?.offset ?? 0;
    const limit = opts?.limit ?? 50;
    return list.slice(offset, offset + limit);
  }
}
