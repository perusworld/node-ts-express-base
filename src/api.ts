import { NextFunction, Request, Response, Router } from 'express';
import { getLogger } from './util';
import { v4 as uuidv4 } from 'uuid';

const logger = getLogger('APIRoute');

/**
 * Shared API routes: hello, health. Session routes live in prototype/session-routes.ts.
 */
export class APIRoute {
  /**
   * buildRoutes — mounts /hello and /health only.
   */
  public buildRoutes(router: Router): void {
    logger.debug('[APIRoute::create] Creating api route.');

    router.use((req: Request, res: Response, next: NextFunction) => {
      next();
    });

    router.get('/hello', this.helloGet.bind(this));
    router.post('/hello', this.helloPost.bind(this));
    router.get('/health', this.health.bind(this));
  }

  /**
   * Hello GET endpoint
   */
  public helloGet(req: Request, res: Response, next: NextFunction) {
    res.json({
      message: 'Hello World!',
      timestamp: new Date().toISOString(),
      sessionKey: req.sessionKey || 'default',
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
  public health(req: Request, res: Response, _next: NextFunction): void {
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      sessionKey: req.sessionKey || 'default',
    });
  }
}
