import { Request, Response, Router } from 'express';

/** Minimal server shape needed for session routes. */
export interface SessionRoutesServer {
  getSessionStats(): unknown;
  cleanupSessions(): number;
  sessionMiddleware?: {
    removeSession(sessionKey: string): boolean;
    getIPSessionStats(): unknown;
    clearIPSessionMappings(): number;
  };
}

/**
 * Mount prototype-only session isolation routes (stats, cleanup, ip-mappings, remove session).
 * Call when ENABLE_SESSION_ISOLATION=true.
 */
export function buildSessionRoutes(router: Router, serverInstance: SessionRoutesServer): void {
  router.get('/sessions/stats', (req: Request, res: Response) => {
    const stats = serverInstance.getSessionStats();
    res.json(stats);
  });

  router.get('/sessions/cleanup', (req: Request, res: Response) => {
    const cleanedCount = serverInstance.cleanupSessions();
    res.json({ cleanedSessions: cleanedCount, success: true });
  });

  router.delete('/sessions/:sessionKey', (req: Request, res: Response) => {
    const sessionKey = typeof req.params.sessionKey === 'string' ? req.params.sessionKey : req.params.sessionKey?.[0] ?? '';
    const removed = serverInstance.sessionMiddleware?.removeSession(sessionKey);
    res.json({ sessionKey, removed: removed ?? false, success: true });
  });
}

/**
 * Mount IP-session mapping routes. Call when ENABLE_SESSION_ISOLATION=true and AUTO_MAP_SESSION_BY_IP=true.
 */
export function buildIPMappingRoutes(router: Router, serverInstance: SessionRoutesServer): void {
  router.get('/sessions/ip-mappings', (req: Request, res: Response) => {
    const mappings = serverInstance.sessionMiddleware?.getIPSessionStats();
    res.json(mappings ?? {});
  });

  router.delete('/sessions/ip-mappings', (req: Request, res: Response) => {
    const clearedCount = serverInstance.sessionMiddleware?.clearIPSessionMappings();
    res.json({ clearedMappings: clearedCount ?? 0, success: true });
  });
}
