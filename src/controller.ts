import { NextFunction, Request, Response, Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getLogger } from './util';

const logger = getLogger('ControllerRoute');

export class ControllerRoute {
  /**
   * Constructor
   *
   * @class ControllerRoute
   * @constructor
   */
  constructor() {}

  public hello(req: Request, res: Response, next: NextFunction) {
    logger.debug('Got %s', req.query);
    res.render('hello', {
      title: 'Hello',
      msg: 'Hello From Controller',
      ts: new Date(),
      uuid: uuidv4(),
    });
  }

  /**
   * buildRoutes
   */
  public buildRoutes(router: Router) {
    logger.debug('[ControllerRoute::create] Creating controller route.');

    router.use((req: Request, res: Response, next: NextFunction) => {
      //TODO: Your API Request Authentication Logic
      next();
    });

    router.get('/hello', this.hello.bind(this));
  }
}
