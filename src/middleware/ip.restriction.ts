import { Request, Response, NextFunction } from 'express';
import * as os from 'os';

interface IPRestrictionConfig {
  enabled: boolean;
  allowedIPs: string[];
  allowLocalAddresses: boolean;
}

export class IPRestrictionMiddleware {
  private config: IPRestrictionConfig;
  private localAddresses: Set<string> = new Set();

  constructor() {
    this.config = this.loadConfig();
    this.initializeLocalAddresses();
  }

  private loadConfig(): IPRestrictionConfig {
    const enabled = process.env.IP_RESTRICTION_ENABLED !== 'false';
    const allowedIPsString = process.env.ALLOWED_IPS || '';
    const allowLocalAddresses = process.env.ALLOW_LOCAL_ADDRESSES !== 'false'; // Default to true

    const allowedIPs = allowedIPsString
      .split(',')
      .map(ip => ip.trim())
      .filter(ip => ip.length > 0);

    return {
      enabled,
      allowedIPs,
      allowLocalAddresses,
    };
  }

  private initializeLocalAddresses(): void {
    // Get all network interfaces
    const networkInterfaces = os.networkInterfaces();

    // Collect all local addresses and subnets
    for (const [name, interfaces] of Object.entries(networkInterfaces)) {
      if (!interfaces) continue;

      for (const iface of interfaces) {
        if (!iface.internal) {
          // Add the actual interface address
          this.localAddresses.add(iface.address);

          // Add localhost addresses
          if (iface.family === 'IPv4') {
            this.localAddresses.add('127.0.0.1');
            this.localAddresses.add('localhost');
          } else if (iface.family === 'IPv6') {
            this.localAddresses.add('::1');
          }
        }
      }
    }

    // Add common localhost patterns for fallback
    this.localAddresses.add('127.0.0.1');
    this.localAddresses.add('localhost');
    this.localAddresses.add('::1');
    // Add IPv6-mapped IPv4 addresses (common in Node.js)
    this.localAddresses.add('::ffff:127.0.0.1');
  }

  private isLocalAddress(ip: string): boolean {
    // Check if it's in our collected local addresses from runtime network interfaces
    return this.localAddresses.has(ip);
  }

  private getClientIP(req: Request): string {
    // Check for forwarded headers (when behind proxy/load balancer)
    const forwardedFor = req.headers['x-forwarded-for'];
    if (forwardedFor) {
      const ips = Array.isArray(forwardedFor) ? forwardedFor[0] : forwardedFor;
      return ips.split(',')[0].trim();
    }

    // Check for real IP header
    const realIP = req.headers['x-real-ip'];
    if (realIP) {
      return Array.isArray(realIP) ? realIP[0] : realIP;
    }

    // Fallback to connection remote address
    return req.connection.remoteAddress || req.socket.remoteAddress || (req as any).ip || 'unknown';
  }

  public middleware() {
    return (req: Request, res: Response, next: NextFunction) => {
      // If IP restriction is not enabled, allow all requests
      if (!this.config.enabled) {
        return next();
      }

      const clientIP = this.getClientIP(req);

      // Allow if IP is in the allowed list
      if (this.config.allowedIPs.includes(clientIP)) {
        return next();
      }

      // Allow if local addresses are allowed and IP is local
      if (this.config.allowLocalAddresses && this.isLocalAddress(clientIP)) {
        return next();
      }

      // Reject the request
      res.status(403).json({
        error: 'Access denied',
        message: 'Your IP address is not authorized to access this resource',
        ip: clientIP,
      });
    };
  }

  public getConfig(): IPRestrictionConfig {
    return { ...this.config };
  }

  public getLocalAddresses(): string[] {
    return Array.from(this.localAddresses);
  }
}
