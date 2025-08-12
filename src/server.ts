import express from 'express';
import * as path from 'path';
import cors from 'cors';

import { APIRoute } from './api';
import { ControllerRoute } from './controller';

import { Socket } from 'socket.io';
import { IOHandler } from './io';
import { UtilService } from './util';
import { Database, InMemoryDatabase } from './db';
import { CMSRoute } from './cms';
import { IPRestrictionMiddleware } from './middleware/ip.restriction';
import { SessionDatabaseMiddleware } from './middleware/session-database';
import { DatabaseFactory } from './db-factory';
import { TaskAPIRoute, TaskManager, TaskExecutionService, TaskCleanupService, TaskDemoAPI } from './task';

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
  private dbFactory?: DatabaseFactory;
  private sessionMiddleware?: SessionDatabaseMiddleware;
  private cfg = {} as any;

  // Task system components
  private taskManager?: TaskManager;
  private taskExecutionService?: TaskExecutionService;
  private taskCleanupService?: TaskCleanupService;
  private taskAPIRoute?: TaskAPIRoute;
  private taskDemoAPI?: TaskDemoAPI;

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

    // Initialize session database if enabled
    if (process.env.ENABLE_SESSION_ISOLATION === 'true') {
      this.initializeSessionDatabase();
    }

    // Initialize task system
    this.initializeTaskSystem();
  }

  /**
   * Initialize session database factory and middleware
   */
  private initializeSessionDatabase() {
    this.dbFactory = new DatabaseFactory({
      ...this.cfg.database,
      sessionPrefix: process.env.SESSION_PREFIX || 'session_',
      maxSessions: parseInt(process.env.MAX_SESSIONS || '100'),
      sessionTimeout: parseInt(process.env.SESSION_TIMEOUT || '1800000'), // 30 minutes
    });

    this.sessionMiddleware = new SessionDatabaseMiddleware(this.dbFactory, {
      headerName: process.env.SESSION_HEADER || 'X-App-Session',
      queryParamName: process.env.SESSION_QUERY_PARAM || 'session',
      cookieName: process.env.SESSION_COOKIE || 'app_session',
      defaultSession: process.env.DEFAULT_SESSION || 'default',
      enableSessionIsolation: process.env.ENABLE_SESSION_ISOLATION !== 'false',
      autoMapSessionByIP: process.env.AUTO_MAP_SESSION_BY_IP !== 'false',
      ipSessionPrefix: process.env.IP_SESSION_PREFIX || 'ip_',
    });

    const sessionIsolationEnabled = process.env.ENABLE_SESSION_ISOLATION !== 'false';
    const autoMapEnabled = process.env.AUTO_MAP_SESSION_BY_IP !== 'false';

    if (sessionIsolationEnabled) {
      console.log('Session database isolation enabled');
    }
    if (autoMapEnabled) {
      console.log('Auto-mapping session keys by IP enabled');
    }
  }

  /**
   * Initialize task system components
   */
  private initializeTaskSystem() {
    if (!this.dbFactory) {
      console.log('Task system requires session database to be enabled');
      return;
    }

    // Initialize task manager
    this.taskManager = new TaskManager();

    // Initialize task execution service
    this.taskExecutionService = new TaskExecutionService(this.dbFactory);

    // Initialize task cleanup service with default options
    this.taskCleanupService = new TaskCleanupService(this.dbFactory, this.taskManager, {
      maxCompletedTasks: parseInt(process.env.MAX_COMPLETED_TASKS || '50'),
      maxFailedTasks: parseInt(process.env.MAX_FAILED_TASKS || '20'),
      cleanupInterval: parseInt(process.env.TASK_CLEANUP_INTERVAL || '300000'), // 5 minutes
    });

    // Initialize task API routes
    this.taskAPIRoute = new TaskAPIRoute(this.taskManager, this.taskExecutionService, this.taskCleanupService);

    // Initialize demo API routes
    this.taskDemoAPI = new TaskDemoAPI(this.taskManager, this.taskExecutionService);

    // Start the cleanup service
    this.taskCleanupService.start();

    console.log('Task system initialized successfully');
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
    try {
      // Stop task cleanup service if running
      if (this.taskCleanupService) {
        this.taskCleanupService.stop();
      }

      // Stop any running task executions
      if (this.taskExecutionService) {
        // Cancel all running tasks
        await this.taskExecutionService.cancelAllRunningTasks();
      }

      // Cleanup all sessions and databases
      if (this.dbFactory) {
        this.dbFactory.cleanupExpiredSessions();
      }

      // Wait for any pending operations to complete
      await new Promise(resolve => setTimeout(resolve, 100));

      return true;
    } catch (error) {
      console.error('Error during server cleanup:', error);
      return false;
    }
  }

  public async tasks(): Promise<boolean> {
    let ret = false;
    ret = await this.db.init();
    return ret;
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
    let apiRoutes = new APIRoute(this);
    apiRoutes.buildRoutes(router);
    let cmsRoutes = new CMSRoute(this.db);
    cmsRoutes.buildRoutes(router);

    // Add task routes if task system is initialized
    if (this.taskAPIRoute) {
      this.taskAPIRoute.buildRoutes(router);
    }

    // Add demo task routes if task system is initialized
    if (this.taskDemoAPI) {
      this.taskDemoAPI.buildRoutes(router);
    }

    this.app.use('/api/v1', router);
  }

  /**
   * Configure application
   *
   * @class Server
   * @method config
   */
  public config() {
    // Add IP restriction middleware early in the chain
    const ipRestriction = new IPRestrictionMiddleware();
    this.app.use(ipRestriction.middleware());

    // Add session database middleware if enabled
    if (this.sessionMiddleware) {
      this.app.use(this.sessionMiddleware.middleware());
    }

    this.app.use(
      cors({
        exposedHeaders: ['Content-Disposition'],
      })
    );
    //add static paths
    this.app.use(express.static(path.join(__dirname, '../public')));

    //configure pug
    this.app.set('views', path.join(__dirname, '../views'));
    this.app.set('view engine', 'pug');

    //mount json form parser
    this.app.use(express.json());

    //mount query string parser
    this.app.use(
      express.urlencoded({
        extended: true,
      })
    );

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

  /**
   * Get session statistics (if session isolation is enabled)
   */
  public getSessionStats() {
    return this.sessionMiddleware?.getStats();
  }

  /**
   * Cleanup expired sessions (if session isolation is enabled)
   */
  public cleanupSessions(): number {
    return this.sessionMiddleware?.cleanupSessions() || 0;
  }

  /**
   * Get task system status
   */
  public getTaskSystemStatus() {
    if (!this.taskCleanupService) {
      return { enabled: false, message: 'Task system not initialized' };
    }

    return {
      enabled: true,
      cleanupStatus: this.taskCleanupService.getStatus(),
      runningTasks: this.taskExecutionService?.getRunningTasks() || [],
    };
  }
}
