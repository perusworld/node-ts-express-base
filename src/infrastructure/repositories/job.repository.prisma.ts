import { PrismaClient, Prisma } from '../../generated/prisma/client';
import type { Job as PrismaJob } from '../../generated/prisma/client';
import { IJobRepository, Job, JobStatus } from '../../core/types';

export class PrismaJobRepository implements IJobRepository {
  constructor(private prisma: PrismaClient) {}

  private toDomain(entity: PrismaJob): Job {
    return {
      id: entity.id,
      userId: entity.userId,
      type: entity.type,
      status: entity.status as JobStatus,
      meta: entity.meta as Record<string, unknown> | undefined ?? undefined,
      result: entity.result as Record<string, unknown> | undefined ?? undefined,
      error: entity.error as Record<string, unknown> | undefined ?? undefined,
      bullJobId: entity.bullJobId ?? undefined,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
      completedAt: entity.completedAt ?? undefined,
    };
  }

  async create(data: Omit<Job, 'id' | 'createdAt' | 'updatedAt'>): Promise<Job> {
    const job = await this.prisma.job.create({
      data: {
        userId: data.userId ?? null,
        type: data.type,
        status: data.status,
        meta: (data.meta ?? undefined) as Prisma.InputJsonValue | undefined,
        result: (data.result ?? undefined) as Prisma.InputJsonValue | undefined,
        error: (data.error ?? undefined) as Prisma.InputJsonValue | undefined,
        bullJobId: data.bullJobId ?? null,
        completedAt: data.completedAt ?? null,
      },
    });
    return this.toDomain(job);
  }

  async findById(id: string): Promise<Job | null> {
    const job = await this.prisma.job.findUnique({ where: { id } });
    return job ? this.toDomain(job) : null;
  }

  async update(
    id: string,
    data: Partial<Pick<Job, 'status' | 'result' | 'error' | 'bullJobId' | 'completedAt' | 'updatedAt'>>
  ): Promise<Job> {
    const job = await this.prisma.job.update({
      where: { id },
      data: {
        ...(data.status !== undefined && { status: data.status }),
        ...(data.result !== undefined && { result: data.result as Prisma.InputJsonValue }),
        ...(data.error !== undefined && { error: data.error as Prisma.InputJsonValue }),
        ...(data.bullJobId !== undefined && { bullJobId: data.bullJobId ?? null }),
        ...(data.completedAt !== undefined && { completedAt: data.completedAt ?? null }),
      },
    });
    return this.toDomain(job);
  }

  async listByUserId(
    userId: string,
    opts?: { status?: JobStatus; limit?: number; offset?: number }
  ): Promise<Job[]> {
    const jobs = await this.prisma.job.findMany({
      where: { userId, ...(opts?.status && { status: opts.status }) },
      orderBy: { createdAt: 'desc' },
      take: opts?.limit ?? 50,
      skip: opts?.offset ?? 0,
    });
    return jobs.map(j => this.toDomain(j));
  }

  async listAll(opts?: { status?: JobStatus; limit?: number; offset?: number }): Promise<Job[]> {
    const jobs = await this.prisma.job.findMany({
      where: opts?.status ? { status: opts.status } : undefined,
      orderBy: { createdAt: 'desc' },
      take: opts?.limit ?? 50,
      skip: opts?.offset ?? 0,
    });
    return jobs.map(j => this.toDomain(j));
  }
}
