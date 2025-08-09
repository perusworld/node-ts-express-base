import { NextFunction, Request, Response, Router } from 'express';
import { getLogger } from './util';
import { v4 as uuidv4 } from 'uuid';

const logger = getLogger('APIRoute');

/**
 * @class APIRoute
 * @constructor
 */
export class APIRoute {
  private serverInstance?: any;

  /**
   * Constructor
   *
   * @class APIRoute
   * @constructor
   */
  constructor(serverInstance?: any) {
    this.serverInstance = serverInstance;
  }

  /**
   * buildRoutes
   */
  public buildRoutes(router: Router) {
    logger.debug('[APIRoute::create] Creating api route.');

    router.use((req: Request, res: Response, next: NextFunction) => {
      //TODO: Your API Request Authentication Logic
      next();
    });

    router.get('/hello', this.helloGet.bind(this));
    router.post('/hello', this.helloPost.bind(this));
    router.get('/health', this.health.bind(this));
    
    // Session management endpoints (only available when session isolation is enabled)
    if (process.env.ENABLE_SESSION_ISOLATION === 'true') {
      router.get('/sessions/stats', this.getSessionStats.bind(this));
      router.get('/sessions/cleanup', this.cleanupSessions.bind(this));
      router.delete('/sessions/:sessionKey', this.removeSession.bind(this));
    }
  }

  /**
   * Hello GET endpoint
   */
  public helloGet(req: Request, res: Response, next: NextFunction) {
    res.json({
      message: 'Hello World!',
      timestamp: new Date().toISOString(),
      sessionKey: req.sessionKey || 'default'
    });
  }

  /**
   * Hello POST endpoint (backward compatibility)
   */
  public helloPost(req: Request, res: Response, next: NextFunction) {
    logger.debug('Got %s', JSON.stringify(req.body, null, 2));
    res.json({
      msg: 'hi there',
      youSent: req.body,
      uuid: uuidv4(),
    });
  }

  /**
   * Health check endpoint
   */
  public health(req: Request, res: Response, next: NextFunction) {
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      sessionKey: req.sessionKey || 'default'
    });
  }

  /**
   * Get session statistics
   */
  public getSessionStats(req: Request, res: Response, next: NextFunction) {
    if (this.serverInstance) {
      const stats = this.serverInstance.getSessionStats();
      res.json(stats);
    } else {
      res.json({
        message: 'Session statistics endpoint - server instance not available',
        sessionKey: req.sessionKey || 'default'
      });
    }
  }

  /**
   * Cleanup expired sessions
   */
  public cleanupSessions(req: Request, res: Response, next: NextFunction) {
    if (this.serverInstance) {
      const cleanedCount = this.serverInstance.cleanupSessions();
      res.json({
        cleanedSessions: cleanedCount,
        success: true
      });
    } else {
      res.json({
        message: 'Session cleanup endpoint - server instance not available',
        sessionKey: req.sessionKey || 'default'
      });
    }
  }

  /**
   * Remove specific session
   */
  public removeSession(req: Request, res: Response, next: NextFunction) {
    const sessionKey = req.params.sessionKey;
    
    if (this.serverInstance) {
      const removed = this.serverInstance.sessionMiddleware?.removeSession(sessionKey);
      res.json({
        sessionKey: sessionKey,
        removed: removed,
        success: true
      });
    } else {
      res.json({
        message: `Remove session endpoint - server instance not available for session: ${sessionKey}`,
        sessionKey: req.sessionKey || 'default'
      });
    }
  }
}
