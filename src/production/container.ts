import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client';
import type { AppContainer } from '../core/types';
import { AuthServiceImpl } from '../application/services/auth.service';
import { PrismaUserRepository } from '../infrastructure/repositories/user.repository.prisma';
import { PrismaJobRepository } from '../infrastructure/repositories/job.repository.prisma';

/**
 * Production container: Prisma + PostgreSQL for User and Job storage.
 * Used when STORAGE=prisma. Requires DATABASE_URL.
 */
export function createContainer(): AppContainer {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL is required when STORAGE=prisma');
  const adapter = new PrismaPg({ connectionString: url });
  const prisma = new PrismaClient({ adapter });
  const userRepository = new PrismaUserRepository(prisma);
  const jobRepository = new PrismaJobRepository(prisma);
  const authService = new AuthServiceImpl(userRepository);
  return {
    userRepository,
    authService,
    jobRepository,
  };
}
