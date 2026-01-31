import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import type { IUserRepository, User, UserPublic } from '../../core/types';
import { features } from '../../config/features';

function toPublic(user: User): UserPublic {
  const { password: _p, ...rest } = user;
  return rest;
}

export class AuthServiceImpl {
  constructor(private userRepo: IUserRepository) {}

  async register(email: string, password: string): Promise<{ user: UserPublic; token: string }> {
    const existing = await this.userRepo.findByEmail(email);
    if (existing) throw new Error('Email already in use');

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await this.userRepo.create({
      email,
      password: hashedPassword,
      config: {},
    });

    if (features.useQueue) {
      import('../../infrastructure/queue/queue')
        .then(({ scheduleWelcomeEmail }) =>
          scheduleWelcomeEmail(user.id, user.email).catch(err =>
            console.error('Failed to schedule welcome email:', err)
          )
        )
        .catch(() => {});
    }

    const token = this.generateToken(user.id);
    return { user: toPublic(user), token };
  }

  async login(email: string, password: string): Promise<{ user: UserPublic; token: string }> {
    const user = await this.userRepo.findByEmail(email);
    if (!user) throw new Error('Invalid credentials');

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) throw new Error('Invalid credentials');

    const token = this.generateToken(user.id);
    return { user: toPublic(user), token };
  }

  async getUserFromToken(token: string): Promise<User> {
    const secret = process.env.JWT_SECRET;
    if (!secret) throw new Error('JWT_SECRET is not configured');
    const decoded = jwt.verify(token, secret) as { userId: string };
    const user = await this.userRepo.findById(decoded.userId);
    if (!user) throw new Error('Invalid token');
    return user;
  }

  private generateToken(userId: string): string {
    const secret = process.env.JWT_SECRET;
    const expiration = process.env.JWT_EXPIRATION || '1h';
    if (!secret) throw new Error('JWT_SECRET is not configured');
    return jwt.sign({ userId }, secret, { expiresIn: expiration } as jwt.SignOptions);
  }
}
