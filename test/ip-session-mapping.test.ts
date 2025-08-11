import request from 'supertest';
import { Server } from '../src/server';

describe('IP-based Session Auto-Mapping', () => {
  let server: Server;
  let app: any;

  beforeAll(async () => {
    // Set environment variables to enable session isolation and auto-mapping
    process.env.ENABLE_SESSION_ISOLATION = 'true';
    process.env.AUTO_MAP_SESSION_BY_IP = 'true';
    process.env.SESSION_TIMEOUT = '300000'; // 5 minutes for testing
    // Disable IP restriction for this test since we're testing with various IPs
    process.env.IP_RESTRICTION_ENABLED = 'false';

    server = Server.bootstrap();
    await server.init();
    app = server.app;
  });

  afterAll(async () => {
    await server.cleanup();
  });

  describe('Auto-mapping functionality', () => {
    it('should auto-generate session keys for requests without session keys', async () => {
      // Make request without any session key
      const response = await request(app).get('/api/v1/hello');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('sessionKey');
      expect(response.body.sessionKey).toMatch(/^ip_/);
    });

    it('should use same session key for requests from same IP', async () => {
      // First request from IP
      const response1 = await request(app).get('/api/v1/hello').set('X-Forwarded-For', '192.168.1.100');

      // Second request from same IP
      const response2 = await request(app).get('/api/v1/hello').set('X-Forwarded-For', '192.168.1.100');

      expect(response1.status).toBe(200);
      expect(response2.status).toBe(200);
      expect(response1.body.sessionKey).toBe(response2.body.sessionKey);
      expect(response1.body.sessionKey).toMatch(/^ip_[a-f0-9]{16}$/);
    });

    it('should use different session keys for requests from different IPs', async () => {
      // Request from first IP
      const response1 = await request(app).get('/api/v1/hello').set('X-Forwarded-For', '192.168.1.100');

      // Request from second IP
      const response2 = await request(app).get('/api/v1/hello').set('X-Forwarded-For', '192.168.1.101');

      expect(response1.status).toBe(200);
      expect(response2.status).toBe(200);
      expect(response1.body.sessionKey).not.toBe(response2.body.sessionKey);
      expect(response1.body.sessionKey).toMatch(/^ip_[a-f0-9]{16}$/);
      expect(response2.body.sessionKey).toMatch(/^ip_[a-f0-9]{16}$/);
    });

    it('should handle IPv6 addresses', async () => {
      const response = await request(app).get('/api/v1/hello').set('X-Forwarded-For', '2001:db8::1');

      expect(response.status).toBe(200);
      expect(response.body.sessionKey).toMatch(/^ip_[a-f0-9]{16}$/);
    });

    it('should obfuscate IP addresses with special characters', async () => {
      const response = await request(app).get('/api/v1/hello').set('X-Forwarded-For', '192.168.1.100:8080');

      expect(response.status).toBe(200);
      expect(response.body.sessionKey).toMatch(/^ip_[a-f0-9]{16}$/);
    });

    it('should generate different hashes for different IP addresses', async () => {
      const response1 = await request(app).get('/api/v1/hello').set('X-Forwarded-For', '192.168.1.100');
      const response2 = await request(app).get('/api/v1/hello').set('X-Forwarded-For', '192.168.1.101');

      expect(response1.status).toBe(200);
      expect(response2.status).toBe(200);

      // Both should be valid hashes
      expect(response1.body.sessionKey).toMatch(/^ip_[a-f0-9]{16}$/);
      expect(response2.body.sessionKey).toMatch(/^ip_[a-f0-9]{16}$/);

      // They should be different
      expect(response1.body.sessionKey).not.toBe(response2.body.sessionKey);

      // Verify they start with the prefix
      expect(response1.body.sessionKey).toMatch(/^ip_/);
      expect(response2.body.sessionKey).toMatch(/^ip_/);
    });

    it('should generate consistent hashes for the same IP address', async () => {
      const ip = '10.0.0.1';
      const response1 = await request(app).get('/api/v1/hello').set('X-Forwarded-For', ip);
      const response2 = await request(app).get('/api/v1/hello').set('X-Forwarded-For', ip);

      expect(response1.status).toBe(200);
      expect(response2.status).toBe(200);

      // Both should generate the same hash
      expect(response1.body.sessionKey).toBe(response2.body.sessionKey);
      expect(response1.body.sessionKey).toMatch(/^ip_[a-f0-9]{16}$/);
    });

    it('should prioritize explicit session keys over auto-mapping', async () => {
      const explicitSessionKey = 'explicit_session';

      const response = await request(app)
        .get('/api/v1/hello')
        .set('X-App-Session', explicitSessionKey)
        .set('X-Forwarded-For', '192.168.1.100');

      expect(response.status).toBe(200);
      expect(response.body.sessionKey).toBe(explicitSessionKey);
    });

    it('should handle unknown IP addresses', async () => {
      const response = await request(app).get('/api/v1/hello').set('X-Forwarded-For', 'unknown');

      expect(response.status).toBe(200);
      expect(response.body.sessionKey).toMatch(/^ip_[a-f0-9]{16}$/);
    });
  });

  describe('Data isolation with auto-mapped sessions', () => {
    it('should isolate data between different auto-mapped sessions', async () => {
      // Create data in session for IP 1
      await request(app)
        .post('/api/v1/cms/save/users')
        .set('X-Forwarded-For', '192.168.1.100')
        .send({ name: 'Alice', email: 'alice@example.com' });

      // Create data in session for IP 2
      await request(app)
        .post('/api/v1/cms/save/users')
        .set('X-Forwarded-For', '192.168.1.101')
        .send({ name: 'Bob', email: 'bob@example.com' });

      // Verify IP 1 only sees its own data
      const response1 = await request(app).get('/api/v1/cms/users').set('X-Forwarded-For', '192.168.1.100');

      expect(response1.status).toBe(200);
      expect(response1.body).toHaveLength(1);
      expect(response1.body[0].name).toBe('Alice');

      // Verify IP 2 only sees its own data
      const response2 = await request(app).get('/api/v1/cms/users').set('X-Forwarded-For', '192.168.1.101');

      expect(response2.status).toBe(200);
      expect(response2.body).toHaveLength(1);
      expect(response2.body[0].name).toBe('Bob');
    });

    it('should maintain session consistency for same IP', async () => {
      // Create data in first request
      await request(app)
        .post('/api/v1/cms/save/users')
        .set('X-Forwarded-For', '192.168.1.100')
        .send({ name: 'Charlie', email: 'charlie@example.com' });

      // Read data in second request from same IP
      const response = await request(app).get('/api/v1/cms/users').set('X-Forwarded-For', '192.168.1.100');

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(2); // Alice from previous test + Charlie
      expect(response.body).toContainEqual(expect.objectContaining({ name: 'Charlie' }));
    });
  });

  describe('API endpoints for IP-session mappings', () => {
    it('should provide IP-session mapping statistics', async () => {
      // Make some requests to create mappings
      await request(app).get('/api/v1/hello').set('X-Forwarded-For', '192.168.1.100');

      await request(app).get('/api/v1/hello').set('X-Forwarded-For', '192.168.1.101');

      const response = await request(app).get('/api/v1/sessions/ip-mappings');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('totalMappings');
      expect(response.body).toHaveProperty('mappings');
      expect(response.body.totalMappings).toBeGreaterThanOrEqual(2);
      expect(response.body.mappings['192.168.1.100']).toMatch(/^ip_[a-f0-9]{16}$/);
      expect(response.body.mappings['192.168.1.101']).toMatch(/^ip_[a-f0-9]{16}$/);
    });

    it('should allow clearing IP-session mappings', async () => {
      // Make a request to create a mapping
      await request(app).get('/api/v1/hello').set('X-Forwarded-For', '192.168.1.200');

      // Clear mappings
      const response = await request(app).delete('/api/v1/sessions/ip-mappings');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('clearedMappings');
      expect(response.body).toHaveProperty('success');
      expect(response.body.success).toBe(true);
      expect(response.body.clearedMappings).toBeGreaterThan(0);
    });
  });

  describe('Backward compatibility', () => {
    it('should work without auto-mapping enabled', async () => {
      // Temporarily disable auto-mapping
      const originalValue = process.env.AUTO_MAP_SESSION_BY_IP;
      process.env.AUTO_MAP_SESSION_BY_IP = 'false';

      // Restart server without auto-mapping
      await server.cleanup();
      server = Server.bootstrap();
      await server.init();
      app = server.app;

      // Test that requests without session keys use default session
      const response = await request(app).get('/api/v1/hello').set('X-Forwarded-For', '192.168.1.100');

      expect(response.status).toBe(200);
      expect(response.body.sessionKey).toBe('default');

      // Restore original setting
      process.env.AUTO_MAP_SESSION_BY_IP = originalValue;
    });
  });
});
