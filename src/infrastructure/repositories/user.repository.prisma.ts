import { PrismaClient, Prisma } from '../../generated/prisma/client';
import type { User as PrismaUser } from '../../generated/prisma/client';
import { IUserRepository, User } from '../../core/types';

export class PrismaUserRepository implements IUserRepository {
  constructor(private prisma: PrismaClient) {}

  private toDomain(entity: PrismaUser): User {
    return {
      id: entity.id,
      email: entity.email,
      password: entity.password,
      role: entity.role ?? undefined,
      config: entity.config as Record<string, unknown> | undefined ?? undefined,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    };
  }

  async findById(id: string): Promise<User | null> {
    const user = await this.prisma.user.findUnique({ where: { id } });
    return user ? this.toDomain(user) : null;
  }

  async findByEmail(email: string): Promise<User | null> {
    const user = await this.prisma.user.findUnique({ where: { email } });
    return user ? this.toDomain(user) : null;
  }

  async create(data: Omit<User, 'id' | 'createdAt' | 'updatedAt'>): Promise<User> {
    const user = await this.prisma.user.create({
      data: {
        email: data.email,
        password: data.password,
        role: data.role ?? 'user',
        config: (data.config ?? undefined) as Prisma.InputJsonValue | undefined,
      },
    });
    return this.toDomain(user);
  }

  async updateConfig(id: string, config: Record<string, unknown>): Promise<User> {
    const user = await this.prisma.user.update({
      where: { id },
      data: { config: config as Prisma.InputJsonValue },
    });
    return this.toDomain(user);
  }
}
