import { randomUUID } from 'crypto';
import { IUserRepository, User } from '../../core/types';

export class InMemoryUserRepository implements IUserRepository {
  private users = new Map<string, User>();

  async findById(id: string): Promise<User | null> {
    return this.users.get(id) ?? null;
  }

  async findByEmail(email: string): Promise<User | null> {
    return Array.from(this.users.values()).find(u => u.email === email) ?? null;
  }

  async create(data: Omit<User, 'id' | 'createdAt' | 'updatedAt'>): Promise<User> {
    const now = new Date();
    const user: User = {
      ...data,
      role: data.role ?? 'user',
      id: randomUUID(),
      createdAt: now,
      updatedAt: now,
    };
    this.users.set(user.id, user);
    return user;
  }

  async updateConfig(id: string, config: Record<string, unknown>): Promise<User> {
    const user = this.users.get(id);
    if (!user) throw new Error('User not found');
    const updated: User = { ...user, config, updatedAt: new Date() };
    this.users.set(id, updated);
    return updated;
  }
}
