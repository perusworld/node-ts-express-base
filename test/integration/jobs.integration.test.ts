/**
 * Integration tests for job API (create, get, list, start-dummy-job, admin).
 * Run with: npm run test:integration
 * Requires: docker compose -f docker-compose-db.yml up -d (Postgres + Redis)
 * Uses STORAGE=prisma, ENABLE_QUEUE=true, DATABASE_URL, JWT_SECRET from test:integration script.
 */
import request from 'supertest';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../../src/generated/prisma/client';
import { Server } from '../../src/server';

const serverInstance = Server.bootstrap();
const app = serverInstance.app;

beforeAll(() => serverInstance.init());
afterAll(() => serverInstance.cleanup());

const uniqueEmail = () =>
  `jobs-${Date.now()}-${Math.random().toString(36).slice(2, 10)}@test.local`;
const password = 'test-password-123';

function auth(token: string) {
  return (req: request.Test) => req.set('Authorization', `Bearer ${token}`);
}

describe('Jobs API', () => {
  let token: string;
  let userId: string;
  const email = uniqueEmail();

  beforeAll(async () => {
    const res = await request(app)
      .post('/api/v1/users/register')
      .send({ email, password })
      .set('Accept', 'application/json')
      .expect(201);
    token = res.body.token;
    userId = res.body.user.id;
  });

  describe('auth required', () => {
    test('POST /api/v1/jobs without token returns 401', async () => {
      await request(app)
        .post('/api/v1/jobs')
        .send({ type: 'dummy', arguments: {} })
        .set('Accept', 'application/json')
        .expect(401);
    });

    test('GET /api/v1/jobs without token returns 401', async () => {
      await request(app).get('/api/v1/jobs').set('Accept', 'application/json').expect(401);
    });

    test('GET /api/v1/jobs/:id without token returns 401', async () => {
      await request(app)
        .get('/api/v1/jobs/some-id')
        .set('Accept', 'application/json')
        .expect(401);
    });

    test('POST /api/v1/jobs/start-dummy-job without token returns 401', async () => {
      await request(app)
        .post('/api/v1/jobs/start-dummy-job')
        .send({})
        .set('Accept', 'application/json')
        .expect(401);
    });
  });

  describe('create job', () => {
    test('POST /api/v1/jobs with type and arguments returns 201 and job', async () => {
      const res = await request(app)
        .post('/api/v1/jobs')
        .send({ type: 'dummy', arguments: { delayMinSec: 0, delayMaxSec: 0 } })
        .set('Accept', 'application/json')
        .use(auth(token))
        .expect(201)
        .expect('Content-Type', /json/);

      expect(res.body.id).toBeDefined();
      expect(res.body.status).toBe('pending');
      expect(res.body.type).toBe('dummy');
      expect(res.body.createdAt).toBeDefined();
      expect(res.body.userId).toBe(userId);
    });
  });

  describe('get job', () => {
    test('GET /api/v1/jobs/:id returns 200 and job for owning user', async () => {
      const createRes = await request(app)
        .post('/api/v1/jobs')
        .send({ type: 'dummy', arguments: {} })
        .set('Accept', 'application/json')
        .use(auth(token))
        .expect(201);
      const jobId = createRes.body.id;

      const getRes = await request(app)
        .get(`/api/v1/jobs/${jobId}`)
        .set('Accept', 'application/json')
        .use(auth(token))
        .expect(200);

      expect(getRes.body.id).toBe(jobId);
      expect(getRes.body.status).toBeDefined();
      expect(getRes.body.type).toBe('dummy');
      expect(getRes.body.userId).toBe(userId);
    });

    test('GET /api/v1/jobs/:id returns 404 for non-existent id', async () => {
      await request(app)
        .get('/api/v1/jobs/00000000-0000-0000-0000-000000000000')
        .set('Accept', 'application/json')
        .use(auth(token))
        .expect(404);
    });
  });

  describe('list jobs', () => {
    test('GET /api/v1/jobs returns 200 and user jobs only (non-admin)', async () => {
      const res = await request(app)
        .get('/api/v1/jobs')
        .set('Accept', 'application/json')
        .use(auth(token))
        .expect(200);
      expect(res.body.jobs).toBeDefined();
      expect(Array.isArray(res.body.jobs)).toBe(true);
      res.body.jobs.forEach((j: { userId: string }) => {
        expect(j.userId).toBe(userId);
      });
    });
  });

  describe('start-dummy-job', () => {
    test('POST /api/v1/jobs/start-dummy-job returns 201 with job id and type dummy', async () => {
      const res = await request(app)
        .post('/api/v1/jobs/start-dummy-job')
        .send({ delayMinSec: 0, delayMaxSec: 1 })
        .set('Accept', 'application/json')
        .use(auth(token))
        .expect(201);

      expect(res.body.id).toBeDefined();
      expect(res.body.type).toBe('dummy');
      expect(res.body.status).toBe('pending');
      expect(res.body.createdAt).toBeDefined();
    });
  });

  describe('admin: system job and list all', () => {
    let adminToken: string;
    let adminUserId: string;

    beforeAll(async () => {
      const adminEmail = uniqueEmail();
      const res = await request(app)
        .post('/api/v1/users/register')
        .send({ email: adminEmail, password })
        .set('Accept', 'application/json')
        .expect(201);
      adminUserId = res.body.user.id;
      adminToken = res.body.token;

      const url = process.env.DATABASE_URL;
      if (!url) throw new Error('DATABASE_URL required for admin test');
      const adapter = new PrismaPg({ connectionString: url });
      const prisma = new PrismaClient({ adapter });
      await prisma.user.update({
        where: { id: adminUserId },
        data: { role: 'admin' },
      });
      await prisma.$disconnect();
    });

    test('admin: POST /api/v1/jobs with system: true creates job with userId null', async () => {
      const res = await request(app)
        .post('/api/v1/jobs')
        .send({ type: 'dummy', arguments: {}, system: true })
        .set('Accept', 'application/json')
        .use(auth(adminToken))
        .expect(201);
      expect(res.body.userId).toBeNull();
      expect(res.body.type).toBe('dummy');
    });

    test('non-admin: POST /api/v1/jobs with system: true returns 403', async () => {
      await request(app)
        .post('/api/v1/jobs')
        .send({ type: 'dummy', arguments: {}, system: true })
        .set('Accept', 'application/json')
        .use(auth(token))
        .expect(403);
    });

    test('admin: GET /api/v1/jobs returns all jobs (including system)', async () => {
      const res = await request(app)
        .get('/api/v1/jobs')
        .set('Accept', 'application/json')
        .use(auth(adminToken))
        .expect(200);
      expect(res.body.jobs).toBeDefined();
      const hasSystemJob = res.body.jobs.some((j: { userId: string | null }) => j.userId === null);
      expect(hasSystemJob).toBe(true);
    });

    test('admin: GET /api/v1/jobs/:id returns 200 for another user job', async () => {
      const createRes = await request(app)
        .post('/api/v1/jobs')
        .send({ type: 'dummy', arguments: {} })
        .set('Accept', 'application/json')
        .use(auth(token))
        .expect(201);
      const jobId = createRes.body.id;

      await request(app)
        .get(`/api/v1/jobs/${jobId}`)
        .set('Accept', 'application/json')
        .use(auth(adminToken))
        .expect(200);
    });

    test('non-admin: GET /api/v1/jobs/:id for another user job returns 403', async () => {
      const createRes = await request(app)
        .post('/api/v1/jobs')
        .send({ type: 'dummy', arguments: {} })
        .set('Accept', 'application/json')
        .use(auth(adminToken))
        .expect(201);
      const jobId = createRes.body.id;

      await request(app)
        .get(`/api/v1/jobs/${jobId}`)
        .set('Accept', 'application/json')
        .use(auth(token))
        .expect(403);
    });
  });
});
