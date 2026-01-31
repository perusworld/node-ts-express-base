import { Router, Request, Response } from 'express';
import { authenticate } from '../middleware/auth.middleware';

/**
 * User auth and config routes. Mount at /users (e.g. /api/v1/users).
 * Requires req.container (attach in server before routes).
 */
export function buildUserRoutes(router: Router): void {
  router.post('/register', async (req: Request, res: Response) => {
    try {
      const { email, password } = req.body;
      if (!email || !password) {
        res.status(400).json({ error: 'Email and password are required' });
        return;
      }
      const { user, token } = await req.container!.authService.register(email, password);
      res.status(201).json({ user, token });
    } catch (err) {
      const message = (err as Error).message;
      if (message === 'Email already in use') {
        res.status(400).json({ error: message });
        return;
      }
      res.status(500).json({ error: message });
    }
  });

  router.post('/login', async (req: Request, res: Response) => {
    try {
      const { email, password } = req.body;
      if (!email || !password) {
        res.status(400).json({ error: 'Email and password are required' });
        return;
      }
      const { user, token } = await req.container!.authService.login(email, password);
      res.json({ user, token });
    } catch (err) {
      const message = (err as Error).message;
      if (message === 'Invalid credentials') {
        res.status(401).json({ error: message });
        return;
      }
      res.status(500).json({ error: message });
    }
  });

  router.get('/config', authenticate, (req: Request, res: Response) => {
    res.json({ config: req.user?.config ?? {} });
  });

  router.put('/config', authenticate, async (req: Request, res: Response) => {
    try {
      const user = req.user!;
      const repo = req.container!.userRepository;
      if (!repo.updateConfig) {
        res.status(501).json({ error: 'updateConfig not supported' });
        return;
      }
      const updated = await repo.updateConfig(user.id, req.body);
      res.json({ config: updated.config ?? {} });
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });
}
