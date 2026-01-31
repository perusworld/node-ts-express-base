import type { AppContainer, User } from '../core/types';

declare global {
  namespace Express {
    interface Request {
      container?: AppContainer;
      user?: User;
    }
  }
}

export {};
