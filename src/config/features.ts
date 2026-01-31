/**
 * Feature flags derived from env. Single place for runtime toggles (usePrisma, useQueue, etc.).
 * See IMPLEMENTATION_PLAN.md / PG-MQ-SUPPORT.md.
 * Uses getters so values are read at access time (tests can set env before Server runs).
 */
import { isFullAuthMode } from './auth-mode';

export const features = {
  /** Use Prisma + PostgreSQL for User storage (STORAGE=prisma). */
  get usePrisma(): boolean {
    return process.env.STORAGE === 'prisma';
  },

  /** Use BullMQ + Redis for background jobs (ENABLE_QUEUE=true). */
  get useQueue(): boolean {
    return process.env.ENABLE_QUEUE === 'true';
  },

  /** Use session-scoped databases and session middleware (ENABLE_SESSION_ISOLATION=true). */
  get useSessionIsolation(): boolean {
    return process.env.ENABLE_SESSION_ISOLATION === 'true';
  },

  /** Require JWT for CMS/task/session routes and scope by user id (AUTH_MODE=full). */
  get useFullAuthMode(): boolean {
    return isFullAuthMode();
  },

  /** Auto-map session keys by IP when no session key provided (AUTO_MAP_SESSION_BY_IP=true). */
  get useAutoMapSessionByIP(): boolean {
    return process.env.AUTO_MAP_SESSION_BY_IP === 'true';
  },
};

export type Features = typeof features;
