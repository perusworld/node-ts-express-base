import { Request, Response, NextFunction } from 'express';
import { DatabaseFactory } from '../db-factory';
import { Database } from '../db';
import { getLogger } from '../util';

const logger = getLogger('SessionDatabaseMiddleware');

export interface SessionDatabaseOptions {
  headerName?: string;
  queryParamName?: string;
  cookieName?: string;
  defaultSession?: string;
  enableSessionIsolation?: boolean;
}

declare global {
  namespace Express {
    interface Request {
      sessionDatabase?: Database;
      sessionKey?: string;
    }
  }
}

export class SessionDatabaseMiddleware {
  private factory: DatabaseFactory;
  private options: SessionDatabaseOptions;

  constructor(factory: DatabaseFactory, options?: SessionDatabaseOptions) {
    this.factory = factory;
    this.options = {
      headerName: 'X-App-Session',
      queryParamName: 'session',
      cookieName: 'app_session',
      defaultSession: 'default',
      enableSessionIsolation: true,
      ...options,
    };
  }

  /**
   * Extract session key from request
   */
  private extractSessionKey(req: Request): string {
    // Check if session isolation is enabled
    if (!this.options.enableSessionIsolation) {
      return this.options.defaultSession!;
    }

    // Try header first
    if (this.options.headerName && req.headers[this.options.headerName.toLowerCase()]) {
      return req.headers[this.options.headerName.toLowerCase()] as string;
    }

    // Try query parameter
    if (this.options.queryParamName && req.query[this.options.queryParamName]) {
      return req.query[this.options.queryParamName] as string;
    }

    // Try cookie
    if (this.options.cookieName && req.cookies && req.cookies[this.options.cookieName]) {
      return req.cookies[this.options.cookieName];
    }

    // Return default session
    return this.options.defaultSession!;
  }

  /**
   * Middleware function
   */
  public middleware() {
    return (req: Request, res: Response, next: NextFunction) => {
      try {
        const sessionKey = this.extractSessionKey(req);
        const database = this.factory.getDatabase(sessionKey);

        // Attach to request for use in routes
        req.sessionDatabase = database;
        req.sessionKey = sessionKey;

        logger.debug(`Request using session: ${sessionKey}`);

        next();
      } catch (error) {
        logger.error(`Session database middleware error: ${error}`);
        next(error);
      }
    };
  }

  /**
   * Get session statistics
   */
  public getStats() {
    return this.factory.getStats();
  }

  /**
   * Cleanup expired sessions
   */
  public cleanupSessions(): number {
    return this.factory.cleanupExpiredSessions();
  }

  /**
   * Remove specific session
   */
  public removeSession(sessionKey: string): boolean {
    return this.factory.removeSession(sessionKey);
  }
}
