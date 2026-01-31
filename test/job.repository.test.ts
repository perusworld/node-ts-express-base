/**
 * Unit tests for job repository (InMemory), isAdmin, job domain.
 * Run with: npm test
 */
import { InMemoryJobRepository } from '../src/infrastructure/repositories/job.repository.inmemory';
import { isAdmin } from '../src/core/types';
import type { User, Job } from '../src/core/types';

describe('Job repository (InMemory)', () => {
  let repo: InMemoryJobRepository;

  beforeEach(() => {
    repo = new InMemoryJobRepository();
  });

  test('create returns job with id and status pending', async () => {
    const job = await repo.create({
      userId: 'user-1',
      type: 'dummy',
      status: 'pending',
      meta: { delayMinSec: 1, delayMaxSec: 2 },
    });
    expect(job.id).toBeDefined();
    expect(job.status).toBe('pending');
    expect(job.type).toBe('dummy');
    expect(job.userId).toBe('user-1');
    expect(job.meta).toEqual({ delayMinSec: 1, delayMaxSec: 2 });
    expect(job.createdAt).toBeInstanceOf(Date);
    expect(job.updatedAt).toBeInstanceOf(Date);
  });

  test('findById returns job or null', async () => {
    const created = await repo.create({
      userId: 'user-1',
      type: 'dummy',
      status: 'pending',
    });
    const found = await repo.findById(created.id);
    expect(found).not.toBeNull();
    expect(found!.id).toBe(created.id);

    const missing = await repo.findById('non-existent-id');
    expect(missing).toBeNull();
  });

  test('update sets status, result, error, completedAt', async () => {
    const created = await repo.create({
      userId: 'user-1',
      type: 'dummy',
      status: 'pending',
    });
    const completedAt = new Date();
    const updated = await repo.update(created.id, {
      status: 'completed',
      result: { waitedSeconds: 2.5, completedAt: completedAt.toISOString() },
      completedAt,
    });
    expect(updated.status).toBe('completed');
    expect(updated.result).toEqual({ waitedSeconds: 2.5, completedAt: completedAt.toISOString() });
    expect(updated.completedAt).toEqual(completedAt);
  });

  test('listByUserId returns only that user jobs', async () => {
    await repo.create({ userId: 'user-1', type: 'dummy', status: 'pending' });
    await repo.create({ userId: 'user-1', type: 'dummy', status: 'completed' });
    await repo.create({ userId: 'user-2', type: 'dummy', status: 'pending' });

    const list = await repo.listByUserId('user-1');
    expect(list).toHaveLength(2);
    expect(list.every(j => j.userId === 'user-1')).toBe(true);

    const list2 = await repo.listByUserId('user-2');
    expect(list2).toHaveLength(1);
    expect(list2[0].userId).toBe('user-2');
  });

  test('listByUserId respects status filter and limit/offset', async () => {
    await repo.create({ userId: 'user-1', type: 'dummy', status: 'pending' });
    await repo.create({ userId: 'user-1', type: 'dummy', status: 'completed' });
    await repo.create({ userId: 'user-1', type: 'dummy', status: 'pending' });

    const list = await repo.listByUserId('user-1', { status: 'pending' });
    expect(list).toHaveLength(2);
    expect(list.every(j => j.status === 'pending')).toBe(true);

    const limited = await repo.listByUserId('user-1', { limit: 1, offset: 0 });
    expect(limited).toHaveLength(1);
  });

  test('listAll returns all jobs', async () => {
    await repo.create({ userId: 'user-1', type: 'dummy', status: 'pending' });
    await repo.create({ userId: 'user-2', type: 'dummy', status: 'pending' });
    await repo.create({ userId: null, type: 'dummy', status: 'pending' });

    const list = await repo.listAll();
    expect(list).toHaveLength(3);
  });

  test('listAll respects status and limit', async () => {
    await repo.create({ userId: 'user-1', type: 'dummy', status: 'pending' });
    await repo.create({ userId: 'user-1', type: 'dummy', status: 'completed' });
    const list = await repo.listAll({ status: 'completed', limit: 10 });
    expect(list).toHaveLength(1);
    expect(list[0].status).toBe('completed');
  });
});

describe('isAdmin', () => {
  test('returns false for undefined user', () => {
    expect(isAdmin(undefined)).toBe(false);
  });

  test('returns false for user with role user', () => {
    const user: User = { id: '1', email: 'a@b.com', password: 'x', role: 'user' };
    expect(isAdmin(user)).toBe(false);
  });

  test('returns false for user with no role', () => {
    const user: User = { id: '1', email: 'a@b.com', password: 'x' };
    expect(isAdmin(user)).toBe(false);
  });

  test('returns true for user with role admin', () => {
    const user: User = { id: '1', email: 'a@b.com', password: 'x', role: 'admin' };
    expect(isAdmin(user)).toBe(true);
  });
});
