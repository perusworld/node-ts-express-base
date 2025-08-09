import { Database, InMemoryDatabase, DatabaseConfig } from './db';
import { getLogger } from './util';

const logger = getLogger('DatabaseFactory');

export interface SessionDatabaseConfig extends DatabaseConfig {
  sessionPrefix?: string;
  maxSessions?: number;
  sessionTimeout?: number; // in milliseconds
}

export class DatabaseFactory {
  private databases: Map<string, Database> = new Map();
  private sessionTimestamps: Map<string, number> = new Map();
  private config: SessionDatabaseConfig;

  constructor(config?: SessionDatabaseConfig) {
    this.config = {
      type: 'InMemory',
      path: '',
      loadOnStartup: false,
      sessionPrefix: 'session_',
      maxSessions: 100,
      sessionTimeout: 30 * 60 * 1000, // 30 minutes
      ...config,
    };
  }

  /**
   * Get or create a database instance for a session
   */
  public getDatabase(sessionKey: string): Database {
    const sessionId = this.normalizeSessionKey(sessionKey);

    // Check if session exists and is not expired
    if (this.databases.has(sessionId)) {
      const lastAccess = this.sessionTimestamps.get(sessionId);
      if (lastAccess && Date.now() - lastAccess < this.config.sessionTimeout!) {
        this.sessionTimestamps.set(sessionId, Date.now());
        return this.databases.get(sessionId)!;
      } else {
        // Session expired, remove it
        this.removeSession(sessionId);
      }
    }

    // Create new session if under limit
    if (this.databases.size >= this.config.maxSessions!) {
      this.cleanupExpiredSessions();

      if (this.databases.size >= this.config.maxSessions!) {
        // Remove oldest session
        const oldestSession = this.getOldestSession();
        if (oldestSession) {
          this.removeSession(oldestSession);
        }
      }
    }

    // Create new database instance
    const sessionConfig: DatabaseConfig = {
      ...this.config,
      path: this.config.path ? `${this.config.path}_${sessionId}` : '',
    };

    const database = new InMemoryDatabase(sessionConfig);
    this.databases.set(sessionId, database);
    this.sessionTimestamps.set(sessionId, Date.now());

    logger.debug(`Created new database instance for session: ${sessionId}`);
    return database;
  }

  /**
   * Remove a session and its database
   */
  public removeSession(sessionKey: string): boolean {
    const sessionId = this.normalizeSessionKey(sessionKey);
    const removed = this.databases.delete(sessionId);
    this.sessionTimestamps.delete(sessionId);

    if (removed) {
      logger.debug(`Removed database instance for session: ${sessionId}`);
    }

    return removed;
  }

  /**
   * Get all active sessions
   */
  public getActiveSessions(): string[] {
    return Array.from(this.databases.keys());
  }

  /**
   * Cleanup expired sessions
   */
  public cleanupExpiredSessions(): number {
    const now = Date.now();
    const expiredSessions: string[] = [];

    for (const [sessionId, timestamp] of this.sessionTimestamps.entries()) {
      if (now - timestamp > this.config.sessionTimeout!) {
        expiredSessions.push(sessionId);
      }
    }

    expiredSessions.forEach(sessionId => this.removeSession(sessionId));

    if (expiredSessions.length > 0) {
      logger.debug(`Cleaned up ${expiredSessions.length} expired sessions`);
    }

    return expiredSessions.length;
  }

  /**
   * Get session statistics
   */
  public getStats() {
    return {
      activeSessions: this.databases.size,
      maxSessions: this.config.maxSessions,
      sessionTimeout: this.config.sessionTimeout,
    };
  }

  private normalizeSessionKey(sessionKey: string): string {
    // Sanitize session key to prevent path traversal
    return sessionKey.replace(/[^a-zA-Z0-9_-]/g, '_');
  }

  private getOldestSession(): string | null {
    let oldestSession: string | null = null;
    let oldestTimestamp = Date.now();

    for (const [sessionId, timestamp] of this.sessionTimestamps.entries()) {
      if (timestamp < oldestTimestamp) {
        oldestTimestamp = timestamp;
        oldestSession = sessionId;
      }
    }

    return oldestSession;
  }
}
