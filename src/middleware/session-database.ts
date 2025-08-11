import { Request, Response, NextFunction } from 'express';
import { DatabaseFactory } from '../db-factory';
import { Database } from '../db';
import { getLogger } from '../util';
import * as crypto from 'crypto';

const logger = getLogger('SessionDatabaseMiddleware');

export interface SessionDatabaseOptions {
  headerName?: string;
  queryParamName?: string;
  cookieName?: string;
  defaultSession?: string;
  enableSessionIsolation?: boolean;
  autoMapSessionByIP?: boolean;
  ipSessionPrefix?: string;
}

declare global {
  namespace Express {
    interface Request {
      sessionDatabase?: Database;
      sessionKey?: string;
    }
  }
}

export class SessionDatabaseMiddleware {
  private factory: DatabaseFactory;
  private options: SessionDatabaseOptions;
  private ipSessionMap: Map<string, string> = new Map();

  constructor(factory: DatabaseFactory, options?: SessionDatabaseOptions) {
    this.factory = factory;
    this.options = {
      headerName: 'X-App-Session',
      queryParamName: 'session',
      cookieName: 'app_session',
      defaultSession: 'default',
      enableSessionIsolation: true,
      autoMapSessionByIP: true,
      ipSessionPrefix: 'ip_',
      ...options,
    };
  }

  /**
   * Get client IP address using the same logic as IP restriction middleware
   */
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

  /**
   * Generate session key from IP address
   */
  private generateIPSessionKey(ip: string): string {
    // Create a hash of the IP address for obfuscation
    // Use SHA-256 and take first 16 characters for reasonable length
    const hash = crypto.createHash('sha256').update(ip).digest('hex').substring(0, 16);
    logger.debug(`Generated IP session key for ${ip}: ${hash}, prefix: ${this.options.ipSessionPrefix}`);
    return `${this.options.ipSessionPrefix}${hash}`;
  }

  /**
   * Get or create session key for IP address
   */
  private getIPSessionKey(ip: string): string {
    if (!this.ipSessionMap.has(ip)) {
      const sessionKey = this.generateIPSessionKey(ip);
      this.ipSessionMap.set(ip, sessionKey);
      logger.debug(`Auto-mapped IP ${ip} to session key: ${sessionKey}`);
    }
    return this.ipSessionMap.get(ip)!;
  }

  /**
   * Extract session key from request
   */
  private extractSessionKey(req: Request): string {
    // Check if session isolation is enabled
    if (!this.options.enableSessionIsolation) {
      return this.options.defaultSession!;
    }

    // Try header first
    if (this.options.headerName && req.headers[this.options.headerName.toLowerCase()]) {
      return req.headers[this.options.headerName.toLowerCase()] as string;
    }

    // Try query parameter
    if (this.options.queryParamName && req.query[this.options.queryParamName]) {
      return req.query[this.options.queryParamName] as string;
    }

    // Try cookie
    if (this.options.cookieName && req.cookies && req.cookies[this.options.cookieName]) {
      return req.cookies[this.options.cookieName];
    }

    // Auto-map by IP if enabled and no session key found
    if (this.options.autoMapSessionByIP) {
      const clientIP = this.getClientIP(req);
      return this.getIPSessionKey(clientIP);
    }

    // Return default session
    return this.options.defaultSession!;
  }

  /**
   * Middleware function
   */
  public middleware() {
    return (req: Request, res: Response, next: NextFunction) => {
      try {
        const sessionKey = this.extractSessionKey(req);
        const database = this.factory.getDatabase(sessionKey);

        // Attach to request for use in routes
        req.sessionDatabase = database;
        req.sessionKey = sessionKey;

        logger.debug(`Request using session: ${sessionKey}`);

        next();
      } catch (error) {
        logger.error(`Session database middleware error: ${error}`);
        next(error);
      }
    };
  }

  /**
   * Get session statistics
   */
  public getStats() {
    const stats = this.factory.getStats();
    if (this.options.autoMapSessionByIP) {
      return {
        ...stats,
        ipSessionMappings: this.ipSessionMap.size,
        autoMapEnabled: true,
      };
    }
    return stats;
  }

  /**
   * Cleanup expired sessions
   */
  public cleanupSessions(): number {
    return this.factory.cleanupExpiredSessions();
  }

  /**
   * Remove specific session
   */
  public removeSession(sessionKey: string): boolean {
    return this.factory.removeSession(sessionKey);
  }

  /**
   * Get IP-session mapping statistics
   */
  public getIPSessionStats() {
    if (!this.options.autoMapSessionByIP) {
      return null;
    }

    // Convert Map to plain object
    const mappings: { [key: string]: string } = {};
    for (const [ip, sessionKey] of this.ipSessionMap.entries()) {
      mappings[ip] = sessionKey;
    }

    return {
      totalMappings: this.ipSessionMap.size,
      mappings: mappings,
    };
  }

  /**
   * Clear IP-session mappings (useful for testing or manual cleanup)
   */
  public clearIPSessionMappings(): number {
    const count = this.ipSessionMap.size;
    this.ipSessionMap.clear();
    logger.debug(`Cleared ${count} IP-session mappings`);
    return count;
  }
}
