/**
 * Core domain types and repository interfaces (repository pattern).
 * Used for User and auth; Prisma/other implementations implement these.
 * Includes Job, IJobRepository, User.role, isAdmin.
 */

export interface User {
  id: string;
  email: string;
  password: string;
  role?: string; // "user" | "admin"
  config?: Record<string, unknown>;
  createdAt?: Date;
  updatedAt?: Date;
}

/** User without password (for API responses). */
export type UserPublic = Omit<User, 'password'>;

export interface IUserRepository {
  findById(id: string): Promise<User | null>;
  findByEmail(email: string): Promise<User | null>;
  create(user: Omit<User, 'id' | 'createdAt' | 'updatedAt'>): Promise<User>;
  updateConfig?(id: string, config: Record<string, unknown>): Promise<User>;
}

export interface AuthService {
  register(email: string, password: string): Promise<{ user: UserPublic; token: string }>;
  login(email: string, password: string): Promise<{ user: UserPublic; token: string }>;
  getUserFromToken(token: string): Promise<User>;
}

/** Trackable job. */
export type JobStatus = 'pending' | 'processing' | 'completed' | 'failed';

export interface Job {
  id: string;
  userId: string | null;
  type: string;
  status: JobStatus;
  meta?: Record<string, unknown>;
  result?: Record<string, unknown>;
  error?: Record<string, unknown>;
  bullJobId?: string | null;
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date | null;
}

export interface IJobRepository {
  create(data: Omit<Job, 'id' | 'createdAt' | 'updatedAt'>): Promise<Job>;
  findById(id: string): Promise<Job | null>;
  update(
    id: string,
    data: Partial<Pick<Job, 'status' | 'result' | 'error' | 'bullJobId' | 'completedAt' | 'updatedAt'>>
  ): Promise<Job>;
  listByUserId(userId: string, opts?: { status?: JobStatus; limit?: number; offset?: number }): Promise<Job[]>;
  listAll(opts?: { status?: JobStatus; limit?: number; offset?: number }): Promise<Job[]>;
}

/** Returns true if user has admin role. */
export function isAdmin(user: User | undefined): boolean {
  return user?.role === 'admin';
}

/** Container shape returned by createContainer(). */
export interface AppContainer {
  userRepository: IUserRepository;
  authService: AuthService;
  jobRepository?: IJobRepository;
}
