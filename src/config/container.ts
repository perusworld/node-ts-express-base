import type { AppContainer } from '../core/types';
import { features } from './features';
import { createContainer as createPrototypeContainer } from '../prototype/container';
import { createContainer as createProductionContainer } from '../production/container';

/**
 * Creates the app DI container. Delegates to prototype or production based on features.usePrisma.
 * Full server uses this; server-prototype imports prototype/container directly.
 */
export function createContainer(): AppContainer {
  return features.usePrisma ? createProductionContainer() : createPrototypeContainer();
}
