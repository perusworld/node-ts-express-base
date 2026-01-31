/**
 * Integration tests for AUTH_MODE=full: CMS/task/session routes require JWT.
 * Run with: npm run test:integration
 * Requires: ENABLE_SESSION_ISOLATION=true so session/dbFactory exists; AUTH_MODE=full set below.
 * Token-dependent tests also require Postgres (same as auth.integration.test): docker compose -f docker-compose-db.yml up -d
 */
process.env.AUTH_MODE = 'full';
process.env.ENABLE_SESSION_ISOLATION = 'true';

import request from 'supertest';
import { Server } from '../../src/server';

const serverInstance = Server.bootstrap();
const app = serverInstance.app;

beforeAll(() => serverInstance.init());
afterAll(() => serverInstance.cleanup());

const uniqueEmail = () =>
  `auth-mode-${Date.now()}-${Math.random().toString(36).slice(2, 10)}@test.local`;
const password = 'test-password-123';

describe('AUTH_MODE=full', () => {
  describe('scoped routes return 401 without JWT', () => {
    test('GET /api/v1/cms/:name without token returns 401', async () => {
      const res = await request(app)
        .get('/api/v1/cms/test-items')
        .set('Accept', 'application/json')
        .expect(401);
      expect(res.body.error).toBeDefined();
    });

    test('GET /api/v1/tasks without token returns 401', async () => {
      const res = await request(app)
        .get('/api/v1/tasks')
        .set('Accept', 'application/json')
        .expect(401);
      expect(res.body.error).toBeDefined();
    });

    test('GET /api/v1/sessions/stats without token returns 401', async () => {
      const res = await request(app)
        .get('/api/v1/sessions/stats')
        .set('Accept', 'application/json')
        .expect(401);
      expect(res.body.error).toBeDefined();
    });

    test('GET /api/v1/demo/tasks/:id/result without token returns 401', async () => {
      await request(app)
        .get('/api/v1/demo/tasks/some-id/result')
        .set('Accept', 'application/json')
        .expect(401);
    });
  });

  describe('scoped routes with valid JWT return 200', () => {
    let token: string;

    beforeAll(async () => {
      const email = uniqueEmail();
      const res = await request(app)
        .post('/api/v1/users/register')
        .send({ email, password })
        .set('Accept', 'application/json');
      if (res.status !== 201) {
        throw new Error(
          `Register failed (${res.status}): ${JSON.stringify(res.body)}. Ensure Postgres is running (docker compose -f docker-compose-db.yml up -d).`
        );
      }
      token = res.body.token;
      expect(token).toBeDefined();
    });

    test('GET /api/v1/cms/:name with valid token returns 200', async () => {
      await request(app)
        .get('/api/v1/cms/test-items')
        .set('Accept', 'application/json')
        .set('Authorization', `Bearer ${token}`)
        .expect(200)
        .expect('Content-Type', /json/);
    });

    test('GET /api/v1/tasks with valid token returns 200', async () => {
      await request(app)
        .get('/api/v1/tasks')
        .set('Accept', 'application/json')
        .set('Authorization', `Bearer ${token}`)
        .expect(200)
        .expect('Content-Type', /json/);
    });

    test('GET /api/v1/sessions/stats with valid token returns 200', async () => {
      await request(app)
        .get('/api/v1/sessions/stats')
        .set('Accept', 'application/json')
        .set('Authorization', `Bearer ${token}`)
        .expect(200)
        .expect('Content-Type', /json/);
    });
  });

  describe('non-scoped routes unchanged', () => {
    test('GET /api/v1/hello does not require token', async () => {
      await request(app)
        .get('/api/v1/hello')
        .set('Accept', 'application/json')
        .expect(200);
    });

    test('GET /api/v1/health does not require token', async () => {
      await request(app)
        .get('/api/v1/health')
        .set('Accept', 'application/json')
        .expect(200);
    });

    test('POST /api/v1/users/register does not require token (no 401)', async () => {
      const res = await request(app)
        .post('/api/v1/users/register')
        .send({ email: uniqueEmail(), password })
        .set('Accept', 'application/json');
      expect(res.status).not.toBe(401);
    });
  });
});
