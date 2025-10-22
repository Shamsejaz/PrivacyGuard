import { RateLimit } from '../types';

/**
 * Token bucket rate limiter for API requests
 * Implements rate limiting with burst capacity and multiple time windows
 */
export class RateLimiter {
  private tokens: number;
  private lastRefill: number;
  private readonly config: RateLimit;
  private requestHistory: number[] = [];

  constructor(config: RateLimit) {
    this.config = config;
    this.tokens = config.burstLimit;
    this.lastRefill = Date.now();
  }

  /**
   * Wait for a token to become available
   * Returns immediately if token is available, otherwise waits
   */
  async waitForToken(): Promise<void> {
    await this.refillTokens();

    if (this.tokens >= 1) {
      this.tokens -= 1;
      this.recordRequest();
      return;
    }

    // Calculate wait time until next token is available
    const waitTime = this.calculateWaitTime();
    if (waitTime > 0) {
      await this.sleep(waitTime);
      return this.waitForToken();
    }
  }

  /**
   * Check if a request can be made without waiting
   */
  canMakeRequest(): boolean {
    this.refillTokens();
    return this.tokens >= 1 && this.isWithinRateLimits();
  }

  /**
   * Get current rate limiter status
   */
  getStatus(): {
    availableTokens: number;
    requestsInLastMinute: number;
    requestsInLastHour: number;
    requestsInLastDay: number;
    nextTokenAvailable: Date;
  } {
    this.refillTokens();
    this.cleanupRequestHistory();

    const now = Date.now();
    const oneMinuteAgo = now - 60000;
    const oneHourAgo = now - 3600000;
    const oneDayAgo = now - 86400000;

    return {
      availableTokens: Math.floor(this.tokens),
      requestsInLastMinute: this.requestHistory.filter(time => time > oneMinuteAgo).length,
      requestsInLastHour: this.requestHistory.filter(time => time > oneHourAgo).length,
      requestsInLastDay: this.requestHistory.filter(time => time > oneDayAgo).length,
      nextTokenAvailable: new Date(this.lastRefill + this.getRefillInterval())
    };
  }

  /**
   * Reset the rate limiter
   */
  reset(): void {
    this.tokens = this.config.burstLimit;
    this.lastRefill = Date.now();
    this.requestHistory = [];
  }

  /**
   * Update rate limit configuration
   */
  updateConfig(newConfig: RateLimit): void {
    // Preserve current token ratio when updating limits
    const tokenRatio = this.tokens / this.config.burstLimit;
    
    Object.assign(this.config, newConfig);
    this.tokens = Math.min(this.tokens, newConfig.burstLimit * tokenRatio);
  }

  /**
   * Refill tokens based on elapsed time
   */
  private refillTokens(): void {
    const now = Date.now();
    const timeSinceLastRefill = now - this.lastRefill;
    
    if (timeSinceLastRefill <= 0) return;

    // Calculate tokens to add based on requests per minute rate
    const refillInterval = this.getRefillInterval();
    const tokensToAdd = Math.floor(timeSinceLastRefill / refillInterval);

    if (tokensToAdd > 0) {
      this.tokens = Math.min(this.config.burstLimit, this.tokens + tokensToAdd);
      this.lastRefill = now;
    }
  }

  /**
   * Get the interval between token refills in milliseconds
   */
  private getRefillInterval(): number {
    // Refill based on requests per minute rate
    return 60000 / this.config.requestsPerMinute;
  }

  /**
   * Check if request is within all rate limit windows
   */
  private isWithinRateLimits(): boolean {
    this.cleanupRequestHistory();
    
    const now = Date.now();
    const oneMinuteAgo = now - 60000;
    const oneHourAgo = now - 3600000;
    const oneDayAgo = now - 86400000;

    const requestsInLastMinute = this.requestHistory.filter(time => time > oneMinuteAgo).length;
    const requestsInLastHour = this.requestHistory.filter(time => time > oneHourAgo).length;
    const requestsInLastDay = this.requestHistory.filter(time => time > oneDayAgo).length;

    return (
      requestsInLastMinute < this.config.requestsPerMinute &&
      requestsInLastHour < this.config.requestsPerHour &&
      requestsInLastDay < this.config.requestsPerDay
    );
  }

  /**
   * Record a request in the history
   */
  private recordRequest(): void {
    this.requestHistory.push(Date.now());
    this.cleanupRequestHistory();
  }

  /**
   * Remove old requests from history to prevent memory leaks
   */
  private cleanupRequestHistory(): void {
    const oneDayAgo = Date.now() - 86400000;
    this.requestHistory = this.requestHistory.filter(time => time > oneDayAgo);
  }

  /**
   * Calculate wait time until next token is available
   */
  private calculateWaitTime(): number {
    if (this.tokens >= 1) return 0;

    // Wait for next token refill
    const refillInterval = this.getRefillInterval();
    const timeSinceLastRefill = Date.now() - this.lastRefill;
    const timeUntilNextRefill = refillInterval - (timeSinceLastRefill % refillInterval);

    // Also check rate limit windows
    const now = Date.now();
    const waitTimes: number[] = [timeUntilNextRefill];

    // Check minute window
    const oldestRequestInMinute = this.requestHistory
      .filter(time => time > now - 60000)
      .sort((a, b) => a - b)[0];
    
    if (oldestRequestInMinute && this.requestHistory.filter(time => time > now - 60000).length >= this.config.requestsPerMinute) {
      waitTimes.push(60000 - (now - oldestRequestInMinute));
    }

    // Check hour window
    const oldestRequestInHour = this.requestHistory
      .filter(time => time > now - 3600000)
      .sort((a, b) => a - b)[0];
    
    if (oldestRequestInHour && this.requestHistory.filter(time => time > now - 3600000).length >= this.config.requestsPerHour) {
      waitTimes.push(3600000 - (now - oldestRequestInHour));
    }

    // Check day window
    const oldestRequestInDay = this.requestHistory
      .filter(time => time > now - 86400000)
      .sort((a, b) => a - b)[0];
    
    if (oldestRequestInDay && this.requestHistory.filter(time => time > now - 86400000).length >= this.config.requestsPerDay) {
      waitTimes.push(86400000 - (now - oldestRequestInDay));
    }

    return Math.max(...waitTimes, 0);
  }

  /**
   * Sleep for specified milliseconds
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}