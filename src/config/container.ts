import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client';
import { AppContainer, AuthService, IJobRepository, IUserRepository } from '../core/types';
import { AuthServiceImpl } from '../application/services/auth.service';
import { InMemoryUserRepository } from '../infrastructure/repositories/user.repository.inmemory';
import { PrismaUserRepository } from '../infrastructure/repositories/user.repository.prisma';
import { PrismaJobRepository } from '../infrastructure/repositories/job.repository.prisma';
import { features } from './features';

/**
 * Creates the app DI container.
 * features.usePrisma → PrismaUserRepository + PrismaJobRepository (PostgreSQL).
 * Otherwise → InMemoryUserRepository (no jobRepository).
 */
export function createContainer(): AppContainer {
  let userRepository: IUserRepository;
  let jobRepository: IJobRepository | undefined;

  if (features.usePrisma) {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error('DATABASE_URL is required when STORAGE=prisma');
    const adapter = new PrismaPg({ connectionString: url });
    const prisma = new PrismaClient({ adapter });
    userRepository = new PrismaUserRepository(prisma);
    jobRepository = new PrismaJobRepository(prisma);
  } else {
    userRepository = new InMemoryUserRepository();
  }

  const authService: AuthService = new AuthServiceImpl(userRepository);

  return {
    userRepository,
    authService,
    jobRepository,
  };
}
