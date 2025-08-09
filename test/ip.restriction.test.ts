import request from 'supertest';
import express from 'express';
import { IPRestrictionMiddleware } from '../src/middleware/ip.restriction';

describe('IP Restriction Middleware', () => {
  let app: any;
  let ipRestriction: any;

  beforeEach(() => {
    app = express();
    ipRestriction = new IPRestrictionMiddleware();

    // Add a test route
    app.get('/test', (req: any, res: any) => {
      res.json({ message: 'success' });
    });
  });

  describe('when IP restriction is disabled', () => {
    beforeEach(() => {
      // Mock environment variables
      process.env.IP_RESTRICTION_ENABLED = 'false';
      delete process.env.ALLOWED_IPS;
      delete process.env.ALLOW_LOCAL_ADDRESSES;

      app.use(ipRestriction.middleware());
    });

    it('should allow all requests', async () => {
      const response = await request(app).get('/test').set('X-Forwarded-For', '203.0.113.1');

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('success');
    });
  });

  describe('when IP restriction is enabled', () => {
    beforeEach(() => {
      process.env.IP_RESTRICTION_ENABLED = 'true';
      process.env.ALLOWED_IPS = '192.168.1.100,10.0.0.50';
      process.env.ALLOW_LOCAL_ADDRESSES = 'true';

      // Create a new instance after setting environment variables
      ipRestriction = new IPRestrictionMiddleware();
      app = express();
      app.use(ipRestriction.middleware());
      app.get('/test', (req: any, res: any) => {
        res.json({ message: 'success' });
      });
    });

    it('should allow requests from allowed IPs', async () => {
      const response = await request(app).get('/test').set('X-Forwarded-For', '192.168.1.100');

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('success');
    });

    it('should allow requests from localhost', async () => {
      const response = await request(app).get('/test').set('X-Forwarded-For', '127.0.0.1');

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('success');
    });

    it('should deny requests from unauthorized IPs', async () => {
      const response = await request(app).get('/test').set('X-Forwarded-For', '203.0.113.1');

      expect(response.status).toBe(403);
      expect(response.body.error).toBe('Access denied');
      expect(response.body.ip).toBe('203.0.113.1');
    });

    it('should deny requests when local addresses are disabled', async () => {
      process.env.ALLOW_LOCAL_ADDRESSES = 'false';
      const newIpRestriction = new IPRestrictionMiddleware();
      app = express();
      app.use(newIpRestriction.middleware());
      app.get('/test', (req: any, res: any) => {
        res.json({ message: 'success' });
      });

      const response = await request(app).get('/test').set('X-Forwarded-For', '127.0.0.1');

      expect(response.status).toBe(403);
      expect(response.body.error).toBe('Access denied');
    });
  });

  describe('IP detection', () => {
    beforeEach(() => {
      process.env.IP_RESTRICTION_ENABLED = 'true';
      process.env.ALLOWED_IPS = '192.168.1.100';
      process.env.ALLOW_LOCAL_ADDRESSES = 'false';

      // Create a new instance after setting environment variables
      ipRestriction = new IPRestrictionMiddleware();
      app = express();
      app.use(ipRestriction.middleware());
      app.get('/test', (req: any, res: any) => {
        res.json({ message: 'success' });
      });
    });

    it('should detect IP from X-Forwarded-For header', async () => {
      const response = await request(app).get('/test').set('X-Forwarded-For', '192.168.1.100');

      expect(response.status).toBe(200);
    });

    it('should detect IP from X-Real-IP header', async () => {
      const response = await request(app).get('/test').set('X-Real-IP', '192.168.1.100');

      expect(response.status).toBe(200);
    });

    it('should handle multiple IPs in X-Forwarded-For', async () => {
      const response = await request(app).get('/test').set('X-Forwarded-For', '192.168.1.100, 203.0.113.1');

      expect(response.status).toBe(200);
    });
  });

  describe('Network interface detection', () => {
    beforeEach(() => {
      process.env.IP_RESTRICTION_ENABLED = 'true';
      process.env.ALLOW_LOCAL_ADDRESSES = 'true';
      ipRestriction = new IPRestrictionMiddleware();
    });

    it('should collect local addresses from network interfaces', () => {
      const localAddresses = ipRestriction.getLocalAddresses();
      expect(Array.isArray(localAddresses)).toBe(true);
      expect(localAddresses.length).toBeGreaterThan(0);

      // Should include common localhost addresses
      expect(localAddresses).toContain('127.0.0.1');
      expect(localAddresses).toContain('localhost');
      expect(localAddresses).toContain('::1');
    });

    it('should handle IPv6 local addresses', () => {
      const localAddresses = ipRestriction.getLocalAddresses();
      expect(localAddresses).toContain('::1');
    });

    it('should deny IPs not in network interfaces', async () => {
      app = express();
      app.use(ipRestriction.middleware());
      app.get('/test', (req: any, res: any) => {
        res.json({ message: 'success' });
      });

      // Test with a private IP that's not in network interfaces
      const response = await request(app).get('/test').set('X-Forwarded-For', '10.1.2.3');

      expect(response.status).toBe(403);
      expect(response.body.error).toBe('Access denied');
    });

    it('should deny public IP addresses', async () => {
      app = express();
      app.use(ipRestriction.middleware());
      app.get('/test', (req: any, res: any) => {
        res.json({ message: 'success' });
      });

      const response = await request(app).get('/test').set('X-Forwarded-For', '8.8.8.8');

      expect(response.status).toBe(403);
    });
  });

  afterEach(() => {
    // Clean up environment variables
    delete process.env.IP_RESTRICTION_ENABLED;
    delete process.env.ALLOWED_IPS;
    delete process.env.ALLOW_LOCAL_ADDRESSES;
  });
});
