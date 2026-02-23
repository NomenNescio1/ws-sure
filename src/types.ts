export enum ConversationState {
  IDLE = 'IDLE',
  SELECT_TYPE = 'SELECT_TYPE',
  SELECT_ACCOUNT = 'SELECT_ACCOUNT',
  ENTER_DETAILS = 'ENTER_DETAILS',
  SELECT_CATEGORY = 'SELECT_CATEGORY',
}

export interface UserSession {
  state: ConversationState;
  transactionType?: 'expense' | 'income';
  accountId?: string;
  amount?: number;
  name?: string;
  categories?: Category[];
  accounts?: Account[];
  createdAt: Date;
  lastActivityAt: Date;
}

export interface Category {
  id: string;
  name: string;
  classification: string;
  color?: string;
  icon?: string;
}

export interface Account {
  id: string;
  name: string;
  account_type: string;
  balance?: string;
  currency?: string;
}

export interface Transaction {
  id: string;
  date: string;
  amount: string;
  currency: string;
  name: string;
  notes?: string;
  classification: string;
  account?: Account;
  category?: Category;
  tags?: Tag[];
  created_at: string;
  updated_at: string;
}

export interface Tag {
  id: string;
  name: string;
  color?: string;
}

export interface CreateTransactionParams {
  account_id: string;
  date: string;
  amount: number;
  name: string;
  category_id?: string;
  notes?: string;
  nature?: 'income' | 'expense' | 'inflow' | 'outflow';
}

/**
 * Session manager to track user conversations and clean up expired sessions
 */
export class SessionManager {
  private sessions: Map<string, UserSession> = new Map();
  private readonly sessionTimeoutMs: number;
  private cleanupInterval: NodeJS.Timer | null = null;

  /**
   * @param sessionTimeoutMs How long before a session expires (default: 30 minutes)
   */
  constructor(sessionTimeoutMs: number = 30 * 60 * 1000) {
    this.sessionTimeoutMs = sessionTimeoutMs;
  }

  /**
   * Start the cleanup interval to remove expired sessions
   */
  startCleanupInterval(): void {
    if (this.cleanupInterval) return;

    this.cleanupInterval = setInterval(() => this.clearExpiredSessions(), this.sessionTimeoutMs) as unknown as NodeJS.Timeout;
  }

  /**
   * Stop the cleanup interval
   */
  stopCleanupInterval(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval as unknown as NodeJS.Timeout);
      this.cleanupInterval = null;
    }
  }

  /**
   * Get or create a session for a user
   */
  getOrCreateSession(userId: string): UserSession {
    let session = this.sessions.get(userId);

    if (!session) {
      session = {
        state: ConversationState.IDLE,
        createdAt: new Date(),
        lastActivityAt: new Date(),
      };
      this.sessions.set(userId, session);
    } else {
      // Update last activity timestamp
      session.lastActivityAt = new Date();
    }

    return session;
  }

  /**
   * Get a session without creating if it doesn't exist
   */
  getSession(userId: string): UserSession | undefined {
    const session = this.sessions.get(userId);
    if (session) {
      session.lastActivityAt = new Date();
    }
    return session;
  }

  /**
   * Update a session's state
   */
  updateSession(userId: string, updates: Partial<UserSession>): UserSession {
    const session = this.getOrCreateSession(userId);
    Object.assign(session, updates);
    session.lastActivityAt = new Date();
    return session;
  }

  /**
   * Reset a user's session
   */
  resetSession(userId: string): void {
    this.sessions.delete(userId);
  }

  /**
   * Clear all expired sessions
   */
  clearExpiredSessions(): void {
    const now = Date.now();
    let expiredCount = 0;

    for (const [userId, session] of this.sessions.entries()) {
      if (now - session.lastActivityAt.getTime() > this.sessionTimeoutMs) {
        this.sessions.delete(userId);
        expiredCount++;
      }
    }

    if (expiredCount > 0) {
      console.log(`🧹 Cleaned up ${expiredCount} expired sessions`);
    }
  }

  /**
   * Get total number of active sessions
   */
  getActiveSessions(): number {
    return this.sessions.size;
  }

  /**
   * Clear all sessions
   */
  clearAll(): void {
    this.sessions.clear();
  }

  /**
   * Destroy the session manager and cleanup resources
   */
  destroy(): void {
    this.stopCleanupInterval();
    this.clearAll();
  }
}
