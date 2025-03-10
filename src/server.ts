import express from "express";
import * as path from "path";
import cors from 'cors';

import { APIRoute } from "./api";
import { ControllerRoute } from "./controller";

import { Socket } from "socket.io";
import { IOHandler } from "./io";
import { UtilService } from "./util";
import { Database, InMemoryDatabase } from "./db";
import { CMSRoute } from "./cms";

/**
 * The server.
 *
 * @class Server
 */
export class Server {

  public app: express.Application;
  public ioHandler: IOHandler;
  private utl: UtilService;
  private db: Database;
  private cfg = {} as any;

  /**
   * Bootstrap the application.
   *
   * @class Server
   * @method bootstrap
   * @static
   * @return {ng.auto.IInjectorService} Returns the newly created injector for this app.
   */
  public static bootstrap(): Server {
    return new Server();
  }

  /**
   * Constructor.
   *
   * @class Server
   * @constructor
   */
  constructor() {
    //create expressjs application
    this.app = express();
    this.ioHandler = new IOHandler();
    this.utl = new UtilService(process.env.TIME_ZONE || 'America/Los_Angeles');
    this.cfg = this.utl.loadJson(process.env.CONFIG || 'config');
    this.db = new InMemoryDatabase(this.cfg.database);
  }

  public async init(): Promise<boolean> {
    let ret = false;
    //configure application
    this.config();

    //add controller
    this.controller();

    //add api
    this.api();

    ret = await this.tasks();

    return ret;
  }

  public async cleanup(): Promise<boolean> {
    return true;
  }

  public async tasks(): Promise<boolean> {
    return true;
  }

  public async withServer(server: any): Promise<boolean> {
    return true;
  }

  public async startedServer(server: any): Promise<boolean> {
    return true;
  }

  /**
   * Create Controller View routes
   *
   * @class Server
   * @method controller
   */
  public controller() {
    let router = express.Router();
    let controllerRoutes = new ControllerRoute();
    controllerRoutes.buildRoutes(router);
    this.app.use('/', router);
  }

  /**
   * Create REST API routes
   *
   * @class Server
   * @method api
   */
  public api() {
    let router = express.Router();
    let apiRoutes = new APIRoute();
    apiRoutes.buildRoutes(router);
    let cmsRoutes = new CMSRoute(this.db);
    cmsRoutes.buildRoutes(router);
    this.app.use('/api/v1', router);
  }

  /**
   * Configure application
   *
   * @class Server
   * @method config
   */
  public config() {
    this.app.use(cors({
      exposedHeaders: ['Content-Disposition']
    }));
    //add static paths
    this.app.use(express.static(path.join(__dirname, "../public")));

    //configure pug
    this.app.set("views", path.join(__dirname, "../views"));
    this.app.set("view engine", "pug");

    //mount json form parser
    this.app.use(express.json());

    //mount query string parser
    this.app.use(express.urlencoded({
      extended: true
    }));


    // catch 404 and forward to error handler
    this.app.use(function (err: any, req: express.Request, res: express.Response, next: express.NextFunction) {
      err.status = 404;
      next(err);
    });

  }

  /**
   * handleSocketIO
   */
  public async handleSocketIO(socket: Socket): Promise<boolean> {
    return this.ioHandler.handle(socket);
  }
  
}