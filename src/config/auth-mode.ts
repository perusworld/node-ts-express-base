/**
 * AUTH_MODE: full (JWT required for CMS/task/session routes) vs prototype (IP/session isolation).
 */

export type AuthMode = 'full' | 'prototype';

const AUTH_MODE_VALUES: AuthMode[] = ['full', 'prototype'];

/**
 * Returns the current auth mode. Defaults to 'prototype' for backward compatibility.
 * Use 'full' in production so CMS/task/session routes require JWT and scope by user id.
 */
export function getAuthMode(): AuthMode {
  const raw = process.env.AUTH_MODE?.toLowerCase();
  if (raw === 'full' || raw === 'prototype') return raw;
  return 'prototype';
}

export function isFullAuthMode(): boolean {
  return getAuthMode() === 'full';
}

export function isPrototypeAuthMode(): boolean {
  return getAuthMode() === 'prototype';
}

/** Path prefixes that require JWT and user-scoped session when AUTH_MODE=full. */
const SCOPED_PATH_PREFIXES = ['/cms', '/sessions', '/tasks', '/demo/tasks'];

/**
 * Returns true if the path is a scoped route (CMS, sessions, tasks).
 * Used by auth-mode middleware to decide when to require JWT in full auth mode.
 */
export function isScopedPath(path: string): boolean {
  return SCOPED_PATH_PREFIXES.some(
    prefix => path === prefix || path.startsWith(prefix + '/')
  );
}
