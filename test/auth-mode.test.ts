/**
 * Unit tests for auth mode: getAuthMode, isFullAuthMode, isPrototypeAuthMode, isScopedPath.
 */
import {
  getAuthMode,
  isFullAuthMode,
  isPrototypeAuthMode,
  isScopedPath,
} from '../src/config/auth-mode';

const originalAuthMode = process.env.AUTH_MODE;

function setAuthMode(value: string | undefined) {
  if (value === undefined) delete process.env.AUTH_MODE;
  else process.env.AUTH_MODE = value;
}

afterEach(() => {
  setAuthMode(originalAuthMode);
});

describe('getAuthMode', () => {
  test('returns prototype when AUTH_MODE is unset', () => {
    setAuthMode(undefined);
    expect(getAuthMode()).toBe('prototype');
  });

  test('returns prototype when AUTH_MODE=prototype', () => {
    setAuthMode('prototype');
    expect(getAuthMode()).toBe('prototype');
  });

  test('returns prototype when AUTH_MODE is lowercase prototype', () => {
    setAuthMode('prototype');
    expect(getAuthMode()).toBe('prototype');
  });

  test('returns full when AUTH_MODE=full', () => {
    setAuthMode('full');
    expect(getAuthMode()).toBe('full');
  });

  test('returns full when AUTH_MODE=Full (case insensitive)', () => {
    setAuthMode('Full');
    expect(getAuthMode()).toBe('full');
  });

  test('returns prototype when AUTH_MODE is invalid', () => {
    setAuthMode('other');
    expect(getAuthMode()).toBe('prototype');
    setAuthMode('jwt');
    expect(getAuthMode()).toBe('prototype');
  });
});

describe('isFullAuthMode / isPrototypeAuthMode', () => {
  test('isFullAuthMode true when AUTH_MODE=full', () => {
    setAuthMode('full');
    expect(isFullAuthMode()).toBe(true);
    expect(isPrototypeAuthMode()).toBe(false);
  });

  test('isPrototypeAuthMode true when AUTH_MODE=prototype', () => {
    setAuthMode('prototype');
    expect(isPrototypeAuthMode()).toBe(true);
    expect(isFullAuthMode()).toBe(false);
  });

  test('default (unset) is prototype', () => {
    setAuthMode(undefined);
    expect(isPrototypeAuthMode()).toBe(true);
    expect(isFullAuthMode()).toBe(false);
  });
});

describe('isScopedPath', () => {
  test('matches /cms and /cms/*', () => {
    expect(isScopedPath('/cms')).toBe(true);
    expect(isScopedPath('/cms/')).toBe(true);
    expect(isScopedPath('/cms/test-items')).toBe(true);
    expect(isScopedPath('/cms/test-items/123')).toBe(true);
  });

  test('matches /sessions and /sessions/*', () => {
    expect(isScopedPath('/sessions')).toBe(true);
    expect(isScopedPath('/sessions/stats')).toBe(true);
    expect(isScopedPath('/sessions/cleanup')).toBe(true);
    expect(isScopedPath('/sessions/ip-mappings')).toBe(true);
    expect(isScopedPath('/sessions/foo-key')).toBe(true);
  });

  test('matches /tasks and /tasks/*', () => {
    expect(isScopedPath('/tasks')).toBe(true);
    expect(isScopedPath('/tasks/stats')).toBe(true);
    expect(isScopedPath('/tasks/abc-id')).toBe(true);
    expect(isScopedPath('/tasks/abc-id/start')).toBe(true);
  });

  test('matches /demo/tasks and /demo/tasks/*', () => {
    expect(isScopedPath('/demo/tasks')).toBe(true);
    expect(isScopedPath('/demo/tasks/sample')).toBe(true);
    expect(isScopedPath('/demo/tasks/123/execute')).toBe(true);
  });

  test('does not match other paths', () => {
    expect(isScopedPath('/')).toBe(false);
    expect(isScopedPath('/api')).toBe(false);
    expect(isScopedPath('/api/v1')).toBe(false);
    expect(isScopedPath('/users')).toBe(false);
    expect(isScopedPath('/users/register')).toBe(false);
    expect(isScopedPath('/hello')).toBe(false);
    expect(isScopedPath('/health')).toBe(false);
    expect(isScopedPath('/cmsx')).toBe(false);
    expect(isScopedPath('/task')).toBe(false);
    expect(isScopedPath('/demo')).toBe(false);
  });
});
