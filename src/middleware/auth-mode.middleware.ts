import { Request, Response, NextFunction } from 'express';
import { DatabaseFactory } from '../db-factory';
import { features } from '../config/features';
import { isScopedPath } from '../config/auth-mode';
import { authenticate } from './auth.middleware';

/**
 * When AUTH_MODE=full, requires JWT for CMS/task/session routes and scopes
 * req.sessionKey / req.sessionDatabase by req.user.id. When AUTH_MODE=prototype,
 * does nothing (session middleware already set session from IP/header/cookie).
 */
export function createAuthModeMiddleware(dbFactory: DatabaseFactory | undefined) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!features.useFullAuthMode) {
      next();
      return;
    }
    if (!isScopedPath(req.path)) {
      next();
      return;
    }
    if (!dbFactory) {
      next();
      return;
    }

    authenticate(req, res, (err?: unknown) => {
      if (err) {
        next(err);
        return;
      }
      if (res.headersSent) return;
      if (!req.user) {
        next();
        return;
      }
      req.sessionKey = req.user.id;
      req.sessionDatabase = dbFactory.getDatabase(req.user.id);
      next();
    });
  };
}
