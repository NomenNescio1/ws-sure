/**
 * Rate limiter to prevent DoS attacks and spam
 */
export class RateLimiter {
  private userAttempts: Map<string, number[]> = new Map();
  private readonly maxAttempts: number;
  private readonly windowMs: number;
  private cleanupInterval: NodeJS.Timeout | null = null;

  /**
   * @param maxAttempts Maximum number of attempts allowed within the window
   * @param windowMs Time window in milliseconds
   */
  constructor(maxAttempts: number = 5, windowMs: number = 60000) {
    this.maxAttempts = maxAttempts;
    this.windowMs = windowMs;

    // Periodically cleanup old entries to prevent memory leaks
    this.cleanupInterval = setInterval(() => this.cleanup(), windowMs * 2);
  }

  /**
   * Check if a user is allowed to perform an action
   */
  isAllowed(userId: string): boolean {
    const now = Date.now();
    const attempts = this.userAttempts.get(userId) || [];

    // Remove old attempts outside the window
    const recentAttempts = attempts.filter((t) => now - t < this.windowMs);

    // Check if limit exceeded
    if (recentAttempts.length >= this.maxAttempts) {
      return false;
    }

    // Record this attempt
    recentAttempts.push(now);
    this.userAttempts.set(userId, recentAttempts);
    return true;
  }

  /**
   * Get remaining attempts for a user
   */
  getRemaining(userId: string): number {
    const now = Date.now();
    const attempts = this.userAttempts.get(userId) || [];
    const recentAttempts = attempts.filter((t) => now - t < this.windowMs);
    return Math.max(0, this.maxAttempts - recentAttempts.length);
  }

  /**
   * Reset attempts for a user
   */
  reset(userId: string): void {
    this.userAttempts.delete(userId);
  }

  /**
   * Reset all attempts
   */
  resetAll(): void {
    this.userAttempts.clear();
  }

  /**
   * Cleanup old entries to prevent memory leaks
   */
  private cleanup(): void {
    const now = Date.now();
    for (const [userId, attempts] of this.userAttempts.entries()) {
      const recentAttempts = attempts.filter((t) => now - t < this.windowMs);
      if (recentAttempts.length === 0) {
        this.userAttempts.delete(userId);
      } else {
        this.userAttempts.set(userId, recentAttempts);
      }
    }
  }

  /**
   * Destroy the rate limiter and cleanup intervals
   */
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval as unknown as NodeJS.Timeout);
    }
    this.userAttempts.clear();
  }
}
