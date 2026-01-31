import type { AppContainer } from '../core/types';
import { AuthServiceImpl } from '../application/services/auth.service';
import { InMemoryUserRepository } from '../infrastructure/repositories/user.repository.inmemory';

/**
 * Prototype container: in-memory user repo only, no job repository.
 * Used when STORAGE=memory. Server-prototype entry uses this directly.
 */
export function createContainer(): AppContainer {
  const userRepository = new InMemoryUserRepository();
  const authService = new AuthServiceImpl(userRepository);
  return {
    userRepository,
    authService,
    jobRepository: undefined,
  };
}
