import request from 'supertest';
import { Server } from '../src/server';

describe('Session Database Isolation', () => {
  let server: Server;
  let app: any;

  beforeAll(async () => {
    // Set environment variable to enable session isolation
    process.env.ENABLE_SESSION_ISOLATION = 'true';
    process.env.SESSION_TIMEOUT = '300000'; // 5 minutes for testing
    
    server = Server.bootstrap();
    await server.init();
    app = server.app;
  });

  afterAll(async () => {
    await server.cleanup();
  });

  describe('Session Isolation', () => {
    it('should create isolated data for different sessions', async () => {
      // Create data in session A
      const sessionA = 'test_session_a';
      await request(app)
        .post('/api/v1/cms/save/users')
        .set('X-App-Session', sessionA)
        .send({ name: 'Alice', email: 'alice@example.com' });

      // Create data in session B
      const sessionB = 'test_session_b';
      await request(app)
        .post('/api/v1/cms/save/users')
        .set('X-App-Session', sessionB)
        .send({ name: 'Bob', email: 'bob@example.com' });

      // Verify session A only sees its own data
      const responseA = await request(app)
        .get('/api/v1/cms/users')
        .set('X-App-Session', sessionA);

      expect(responseA.status).toBe(200);
      expect(responseA.body).toHaveLength(1);
      expect(responseA.body[0].name).toBe('Alice');

      // Verify session B only sees its own data
      const responseB = await request(app)
        .get('/api/v1/cms/users')
        .set('X-App-Session', sessionB);

      expect(responseB.status).toBe(200);
      expect(responseB.body).toHaveLength(1);
      expect(responseB.body[0].name).toBe('Bob');
    });

    it('should use default session when no session key provided', async () => {
      // Create data without session key (uses default)
      await request(app)
        .post('/api/v1/cms/save/users')
        .send({ name: 'Default User', email: 'default@example.com' });

      // Verify default session data
      const response = await request(app)
        .get('/api/v1/cms/users');

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(1);
      expect(response.body[0].name).toBe('Default User');
    });

    it('should support query parameter session keys', async () => {
      const sessionKey = 'query_session';
      
      await request(app)
        .post('/api/v1/cms/save/users')
        .query({ session: sessionKey })
        .send({ name: 'Query User', email: 'query@example.com' });

      const response = await request(app)
        .get('/api/v1/cms/users')
        .query({ session: sessionKey });

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(1);
      expect(response.body[0].name).toBe('Query User');
    });

    it('should sanitize session keys', async () => {
      const maliciousKey = '../../../etc/passwd';
      const sanitizedKey = '_________etc_passwd'; // 9 underscores for 9 dots/slashes
      
      // Create data with malicious key (should be sanitized)
      await request(app)
        .post('/api/v1/cms/save/users')
        .set('X-App-Session', maliciousKey)
        .send({ name: 'Sanitized User', email: 'sanitized@example.com' });

      // Verify data is accessible with sanitized key
      const response = await request(app)
        .get('/api/v1/cms/users')
        .set('X-App-Session', sanitizedKey);

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(1);
      expect(response.body[0].name).toBe('Sanitized User');

      // Verify malicious key also works (because it gets sanitized to the same key)
      const maliciousResponse = await request(app)
        .get('/api/v1/cms/users')
        .set('X-App-Session', maliciousKey);

      expect(maliciousResponse.status).toBe(200);
      expect(maliciousResponse.body).toHaveLength(1);
      expect(maliciousResponse.body[0].name).toBe('Sanitized User');

      // Verify that both keys access the same data (same sanitized session)
      expect(response.body).toEqual(maliciousResponse.body);
    });
  });

  describe('Session Management', () => {
    it('should return session statistics', async () => {
      const response = await request(app)
        .get('/api/v1/sessions/stats');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('activeSessions');
      expect(response.body).toHaveProperty('maxSessions');
      expect(response.body).toHaveProperty('sessionTimeout');
    });

    it('should cleanup expired sessions', async () => {
      const response = await request(app)
        .get('/api/v1/sessions/cleanup');

      expect(response.status).toBe(200);
    });
  });

  describe('Backward Compatibility', () => {
    it('should work without session isolation enabled', async () => {
      // Temporarily disable session isolation
      const originalValue = process.env.ENABLE_SESSION_ISOLATION;
      process.env.ENABLE_SESSION_ISOLATION = 'false';
      
      // Restart server without session isolation
      await server.cleanup();
      server = Server.bootstrap();
      await server.init();
      app = server.app;

      // Test that API still works
      const response = await request(app)
        .get('/api/v1/hello');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('message');

      // Restore original setting
      process.env.ENABLE_SESSION_ISOLATION = originalValue;
    });
  });
});
