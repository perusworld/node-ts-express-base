import { Request, Response, NextFunction } from 'express';

/**
 * Authenticates the request using Bearer JWT.
 * On success: sets req.user and calls next().
 * On failure: responds with 401 and does not call next().
 */
export async function authenticate(req: Request, res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : undefined;

  if (!token) {
    res.status(401).json({ error: 'No token provided' });
    return;
  }

  if (!req.container?.authService) {
    res.status(503).json({ error: 'Auth service not available' });
    return;
  }

  try {
    const user = await req.container.authService.getUserFromToken(token);
    req.user = user;
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
}
