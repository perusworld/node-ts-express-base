/**
 * Prototype-only server entry. Imports only shared + prototype (no Prisma, BullMQ, job routes).
 * Build with: npm run build:prototype
 * Start with: npm run start:prototype (after building)
 */
import express from 'express';
import * as path from 'path';
import cors from 'cors';
import { fileURLToPath } from 'url';

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
import { createContainer } from './prototype/container';
import type { AppContainer } from './core/types';
import { createAuthModeMiddleware } from './middleware/auth-mode.middleware';
import { buildUserRoutes } from './routes/user.routes';
import { buildSessionRoutes, buildIPMappingRoutes } from './prototype/session-routes';
import { features } from './config/features';

const __dirname: string = (() => {
  // @ts-ignore
  if (typeof import.meta !== 'undefined' && typeof import.meta.url === 'string') {
    // @ts-ignore
    return path.dirname(fileURLToPath(import.meta.url));
  }
  try {
    // @ts-ignore
    return eval('__dirname');
  } catch {
    return path.resolve('.');
  }
})();

/**
 * Prototype server: in-memory container, session isolation, task system; no job routes, no BullMQ workers.
 */
export class Server {
  public app: express.Application;
  public ioHandler: IOHandler;
  private utl: UtilService;
  private db: Database;
  private dbFactory?: DatabaseFactory;
  public sessionMiddleware?: SessionDatabaseMiddleware;
  private cfg = {} as Record<string, unknown>;

  private container: AppContainer;
  private taskManager?: TaskManager;
  private taskExecutionService?: TaskExecutionService;
  private taskCleanupService?: TaskCleanupService;
  private taskAPIRoute?: TaskAPIRoute;
  private taskDemoAPI?: TaskDemoAPI;

  public static bootstrap(): Server {
    return new Server();
  }

  constructor() {
    this.app = express();
    this.ioHandler = new IOHandler();
    this.utl = new UtilService(process.env.TIME_ZONE || 'America/Los_Angeles');
    this.cfg = this.utl.loadJson(process.env.CONFIG || 'config') as Record<string, unknown>;
    const dbCfg = (this.cfg.database as { type?: string; path?: string; loadOnStartup?: boolean }) || {};
    this.db = new InMemoryDatabase({
      type: 'InMemory',
      path: dbCfg.path || '',
      loadOnStartup: dbCfg.loadOnStartup ?? false,
    });

    if (features.useSessionIsolation) {
      this.initializeSessionDatabase();
    }

    this.container = createContainer();
    this.initializeTaskSystem();
  }

  private initializeSessionDatabase(): void {
    const dbCfg = (this.cfg.database as Record<string, unknown>) || {};
    this.dbFactory = new DatabaseFactory({
      type: 'InMemory',
      path: (dbCfg.path as string) || '',
      loadOnStartup: (dbCfg.loadOnStartup as boolean) ?? false,
      sessionPrefix: process.env.SESSION_PREFIX || 'session_',
      maxSessions: parseInt(process.env.MAX_SESSIONS || '100'),
      sessionTimeout: parseInt(process.env.SESSION_TIMEOUT || '1800000'),
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

    if (process.env.ENABLE_SESSION_ISOLATION !== 'false') {
      console.log('Session database isolation enabled');
    }
    if (process.env.AUTO_MAP_SESSION_BY_IP !== 'false') {
      console.log('Auto-mapping session keys by IP enabled');
    }
  }

  private initializeTaskSystem(): void {
    if (!this.dbFactory) {
      console.log('Task system requires session database to be enabled');
      return;
    }

    this.taskManager = new TaskManager();
    this.taskExecutionService = new TaskExecutionService(this.dbFactory);
    this.taskCleanupService = new TaskCleanupService(this.dbFactory, this.taskManager, {
      maxCompletedTasks: parseInt(process.env.MAX_COMPLETED_TASKS || '50'),
      maxFailedTasks: parseInt(process.env.MAX_FAILED_TASKS || '20'),
      cleanupInterval: parseInt(process.env.TASK_CLEANUP_INTERVAL || '300000'),
    });

    this.taskAPIRoute = new TaskAPIRoute(
      this.taskManager,
      this.taskExecutionService,
      this.taskCleanupService
    );
    this.taskDemoAPI = new TaskDemoAPI(this.taskManager, this.taskExecutionService);
    this.taskCleanupService.start();
    console.log('Task system initialized successfully');
  }

  public async init(): Promise<boolean> {
    this.config();
    this.controller();
    this.api();
    return this.tasks();
  }

  public async cleanup(): Promise<boolean> {
    try {
      if (this.taskCleanupService) this.taskCleanupService.stop();
      if (this.taskExecutionService) await this.taskExecutionService.cancelAllRunningTasks();
      if (this.dbFactory) this.dbFactory.cleanupExpiredSessions();
      await new Promise(resolve => setTimeout(resolve, 100));
      return true;
    } catch (error) {
      console.error('Error during server cleanup:', error);
      return false;
    }
  }

  public async tasks(): Promise<boolean> {
    return this.db.init();
  }

  public async withServer(_server: unknown): Promise<boolean> {
    return true;
  }

  public async startedServer(_server: unknown): Promise<boolean> {
    return true;
  }

  public controller(): void {
    const router = express.Router();
    new ControllerRoute().buildRoutes(router);
    this.app.use('/', router);
  }

  public api(): void {
    const router = express.Router();
    router.use(createAuthModeMiddleware(this.dbFactory));

    const apiRoutes = new APIRoute();
    apiRoutes.buildRoutes(router);

    if (features.useSessionIsolation) {
      if (features.useAutoMapSessionByIP) {
        buildIPMappingRoutes(router, this);
      }
      buildSessionRoutes(router, this);
    }

    const cmsRoutes = new CMSRoute(this.db);
    cmsRoutes.buildRoutes(router);

    const userRouter = express.Router();
    buildUserRoutes(userRouter);
    router.use('/users', userRouter);

    if (this.taskAPIRoute) this.taskAPIRoute.buildRoutes(router);
    if (this.taskDemoAPI) this.taskDemoAPI.buildRoutes(router);

    this.app.use('/api/v1', router);
  }

  public config(): void {
    const ipRestriction = new IPRestrictionMiddleware();
    this.app.use(ipRestriction.middleware());

    if (this.sessionMiddleware) {
      this.app.use(this.sessionMiddleware.middleware());
    }

    this.app.use((req: express.Request, _res: express.Response, next: express.NextFunction) => {
      req.container = this.container;
      next();
    });

    this.app.use(cors({ exposedHeaders: ['Content-Disposition'] }));
    this.app.use(express.static(path.join(__dirname, '../public')));
    this.app.set('views', path.join(__dirname, '../views'));
    this.app.set('view engine', 'pug');
    this.app.use(express.json());
    this.app.use(express.urlencoded({ extended: true }));

    this.app.use((err: unknown, req: express.Request, res: express.Response, next: express.NextFunction) => {
      (err as { status?: number }).status = 404;
      next(err);
    });
  }

  public async handleSocketIO(socket: Socket): Promise<boolean> {
    return this.ioHandler.handle(socket);
  }

  public getSessionStats(): unknown {
    return this.sessionMiddleware?.getStats();
  }

  public cleanupSessions(): number {
    return this.sessionMiddleware?.cleanupSessions() || 0;
  }

  public getTaskSystemStatus(): unknown {
    if (!this.taskCleanupService) return { enabled: false, message: 'Task system not initialized' };
    return {
      enabled: true,
      cleanupStatus: this.taskCleanupService.getStatus(),
      runningTasks: this.taskExecutionService?.getRunningTasks() || [],
    };
  }
}
