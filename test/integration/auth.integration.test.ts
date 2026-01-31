/**
 * Integration tests for auth: register, login, config, JWT.
 * Run with: npm run test:integration
 * Requires: docker compose -p nteb -f docker-compose-db.yml up (Postgres + Redis), then npx prisma migrate deploy
 * Uses STORAGE=prisma, DATABASE_URL, JWT_SECRET from the test:integration script.
 */
import jwt from 'jsonwebtoken';
import request from 'supertest';
import { Server } from '../../src/server';

const serverInstance = Server.bootstrap();
const app = serverInstance.app;

beforeAll(() => serverInstance.init());
afterAll(() => serverInstance.cleanup());

const uniqueEmail = () => `integration-${Date.now()}-${Math.random().toString(36).slice(2, 10)}@test.local`;
const password = 'test-password-123';

describe('Auth API (integration)', () => {
  let token: string;
  const email = uniqueEmail();

  test('POST /api/v1/users/register returns 201 with user (no password) and token', async () => {
    const res = await request(app)
      .post('/api/v1/users/register')
      .send({ email, password })
      .set('Accept', 'application/json')
      .expect(201)
      .expect('Content-Type', /json/);

    expect(res.body.user).toBeDefined();
    expect(res.body.user.email).toBe(email);
    expect(res.body.user.id).toBeDefined();
    expect(res.body.user.password).toBeUndefined();
    expect(res.body.token).toBeDefined();
    token = res.body.token;

    // JWT: token is valid JWT with userId in payload
    const decoded = jwt.decode(token) as { userId?: string; exp?: number; iat?: number };
    expect(decoded).toBeDefined();
    expect(decoded?.userId).toBe(res.body.user.id);
    expect(decoded?.exp).toBeDefined();
    expect(decoded?.iat).toBeDefined();
  });

  test('POST /api/v1/users/register with same email returns 400', async () => {
    const res = await request(app)
      .post('/api/v1/users/register')
      .send({ email, password })
      .set('Accept', 'application/json')
      .expect(400);

    expect(res.body.error).toBe('Email already in use');
  });

  test('POST /api/v1/users/login returns 200 with user and token', async () => {
    const res = await request(app)
      .post('/api/v1/users/login')
      .send({ email, password })
      .set('Accept', 'application/json')
      .expect(200)
      .expect('Content-Type', /json/);

    expect(res.body.user).toBeDefined();
    expect(res.body.user.email).toBe(email);
    expect(res.body.user.password).toBeUndefined();
    expect(res.body.token).toBeDefined();
    token = res.body.token;
  });

  test('POST /api/v1/users/login with wrong password returns 401', async () => {
    const res = await request(app)
      .post('/api/v1/users/login')
      .send({ email, password: 'wrong-password' })
      .set('Accept', 'application/json')
      .expect(401);

    expect(res.body.error).toBe('Invalid credentials');
  });

  test('GET /api/v1/users/config without token returns 401', async () => {
    await request(app)
      .get('/api/v1/users/config')
      .set('Accept', 'application/json')
      .expect(401);
  });

  test('GET /api/v1/users/config with invalid JWT returns 401', async () => {
    const res = await request(app)
      .get('/api/v1/users/config')
      .set('Accept', 'application/json')
      .set('Authorization', 'Bearer invalid-token')
      .expect(401);
    expect(res.body.error).toBe('Invalid token');
  });

  test('GET /api/v1/users/config with malformed Authorization (no Bearer) returns 401', async () => {
    await request(app)
      .get('/api/v1/users/config')
      .set('Accept', 'application/json')
      .set('Authorization', token)
      .expect(401);
  });

  test('GET /api/v1/users/config with valid JWT returns 200 and config', async () => {
    const res = await request(app)
      .get('/api/v1/users/config')
      .set('Accept', 'application/json')
      .set('Authorization', `Bearer ${token}`)
      .expect(200)
      .expect('Content-Type', /json/);

    expect(res.body.config).toBeDefined();
  });

  test('PUT /api/v1/users/config with token returns 200 and updated config', async () => {
    const newConfig = { theme: 'dark', lang: 'en' };
    const res = await request(app)
      .put('/api/v1/users/config')
      .send(newConfig)
      .set('Accept', 'application/json')
      .set('Authorization', `Bearer ${token}`)
      .expect(200)
      .expect('Content-Type', /json/);

    expect(res.body.config).toMatchObject(newConfig);
  });

  test('GET /api/v1/users/config with tampered JWT (wrong signature) returns 401', async () => {
    const parts = token.split('.');
    expect(parts.length).toBe(3);
    const tampered = `${parts[0]}.${parts[1]}.${Buffer.from('tampered').toString('base64url')}`;
    const res = await request(app)
      .get('/api/v1/users/config')
      .set('Accept', 'application/json')
      .set('Authorization', `Bearer ${tampered}`)
      .expect(401);
    expect(res.body.error).toBe('Invalid token');
  });
});
