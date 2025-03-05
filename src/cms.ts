import { NextFunction, Request, Response, Router } from "express";
import { getLogger } from "./util";
import { Database } from "./db";

const logger = getLogger('CMSRoute');

export class CMSRoute {

  /**
   * Constructor
   *
   * @class CMSRoute
   * @constructor
   */
  constructor(private db: Database) {
  }

  /**
   * asObject
   */
  public asObject(data: any): any {
    return data ? data : {};
  }

  public async getById(req: Request, res: Response, next: NextFunction) {
    logger.debug('getById %s %s', JSON.stringify(req.params, null, 2));
    res.json(this.asObject(await this.db.findById(req.params["name"], req.params["id"])));
  }

  public async deleteById(req: Request, res: Response, next: NextFunction) {
    logger.debug('deleteById %s %s', JSON.stringify(req.params, null, 2));
    res.json(this.asObject(await this.db.deleteById(req.params["name"], req.params["id"])));
  }

  public async delete(req: Request, res: Response, next: NextFunction) {
    logger.debug('delete %s', JSON.stringify(req.params, null, 2));
    res.json(await this.db.deleteByTable(req.params["name"]));
  }

  public async deleteAll(req: Request, res: Response, next: NextFunction) {
    logger.debug('deleteAll');
    res.json(await this.db.deleteAll());
  }

  public async save(req: Request, res: Response, next: NextFunction) {
    logger.debug('save %s %s', req.params["name"], JSON.stringify(req.body, null, 2));
    res.json(await this.db.createOrUpdate(req.params["name"], req.body));
  }

  public async findFirstByExample(req: Request, res: Response, next: NextFunction) {
    logger.debug('findFirstByExample %s %s', req.params["name"], JSON.stringify(req.body, null, 2));
    res.json(this.asObject(await this.db.findFirstByExample(req.params["name"], req.body)));
  }

  public async findAllByExample(req: Request, res: Response, next: NextFunction) {
    logger.debug('findFirstByExample %s %s', req.params["name"], JSON.stringify(req.body, null, 2));
    res.json(await this.db.findAllByExample(req.params["name"], req.body));
  }

  public async listAll(req: Request, res: Response, next: NextFunction) {
    logger.debug('listAll %s', req.params["name"]);
    res.json(await this.db.getAll(req.params["name"]));
  }

  /**
   * buildRoutes
   */
  public buildRoutes(router: Router) {
    logger.debug("[CMSRoute::create] Creating cms route.");

    router.use((req: Request, res: Response, next: NextFunction) => {
      //TODO: Your API Request Authentication Logic
      next();
    })

    router.get("/cms/:name", this.listAll.bind(this));
    router.get("/cms/:name/:id", this.getById.bind(this));
    router.get("/cms/reset/:name", this.delete.bind(this));
    router.get("/cms/reset-all", this.deleteAll.bind(this));
    router.delete("/cms/:name/:id", this.deleteById.bind(this));
    router.delete("/cms/:name", this.delete.bind(this));
    router.delete("/cms", this.deleteAll.bind(this));
    router.post("/cms/save/:name", this.save.bind(this));
    router.post("/cms/find/:name", this.findFirstByExample.bind(this));
    router.post("/cms/find-all/:name", this.findAllByExample.bind(this));
  }


}