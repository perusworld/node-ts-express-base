import { NextFunction, Request, Response, Router } from "express";
import { v4 as uuidv4 } from 'uuid';
import { getLogger } from "./util";

const logger = getLogger('APIRoute');

export class APIRoute {

  /**
   * Constructor
   *
   * @class APIRoute
   * @constructor
   */
  constructor() {
  }

  public hello(req: Request, res: Response, next: NextFunction) {
    logger.debug('Got %s', JSON.stringify(req.body, null, 2));
    res.json({
      msg: 'hi there v1',
      youSent: req.body,
      uuid: uuidv4(),
    })
  }

  /**
   * buildRoutes
   */
  public buildRoutes(router: Router) {
    logger.debug("[APIRoute::create] Creating api route.");

    router.use((req: Request, res: Response, next: NextFunction) => {
      //TODO: Your API Request Authentication Logic
      next();
    })

    router.post("/hello", this.hello.bind(this));
  }


}