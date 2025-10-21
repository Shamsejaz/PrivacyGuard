import { WebhookConfig, WebhookEvent, RetryPolicy } from '../types/api-integration';

interface WebhookPayload {
  event: string;
  timestamp: string;
  data: any;
  metadata?: {
    integrationId: string;
    source: string;
    version: string;
  };
}

interface ProcessingResult {
  success: boolean;
  statusCode?: number;
  response?: any;
  error?: string;
  duration: number;
  retryCount: number;
}

class WebhookEventProcessor {
  private processingQueue: Map<string, WebhookPayload[]> = new Map();
  private retryQueue: Map<string, { payload: WebhookPayload; webhook: WebhookConfig; retryCount: number; nextRetry: Date }[]> = new Map();
  private isProcessing: Map<string, boolean> = new Map();

  /**
   * Process a webhook event
   */
  async processEvent(
    webhook: WebhookConfig,
    event: WebhookEvent,
    data: any,
    metadata?: any
  ): Promise<ProcessingResult> {
    const payload: WebhookPayload = {
      event: event.type,
      timestamp: new Date().toISOString(),
      data,
      metadata
    };

    // Check if event is enabled for this webhook
    if (!webhook.events.some(e => e.type === event.type)) {
      return {
        success: false,
        error: `Event ${event.type} not configured for webhook ${webhook.name}`,
        duration: 0,
        retryCount: 0
      };
    }

    // Apply event filters if configured
    if (event.filters && !this.passesFilters(data, event.filters)) {
      return {
        success: true,
        statusCode: 200,
        response: 'Event filtered out',
        duration: 0,
        retryCount: 0
      };
    }

    return await this.sendWebhook(webhook, payload);
  }

  /**
   * Send webhook with retry logic
   */
  private async sendWebhook(
    webhook: WebhookConfig,
    payload: WebhookPayload,
    retryCount: number = 0
  ): Promise<ProcessingResult> {
    const startTime = Date.now();

    try {
      // Prepare headers
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'User-Agent': webhook.security.userAgent || 'PrivacyGuard-Webhook/1.0',
        ...webhook.headers
      };

      // Add authentication headers
      if (webhook.authentication) {
        this.addAuthenticationHeaders(headers, webhook.authentication, payload);
      }

      // Add security headers
      if (webhook.security.customHeaders) {
        Object.assign(headers, webhook.security.customHeaders);
      }

      // Make the request
      const response = await fetch(webhook.url, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(30000) // 30 second timeout
      });

      const duration = Date.now() - startTime;
      const responseData = await response.text();

      if (response.ok) {
        return {
          success: true,
          statusCode: response.status,
          response: responseData,
          duration,
          retryCount
        };
      } else {
        // Check if this is a retryable status code
        if (this.isRetryableStatusCode(response.status, webhook.retryPolicy) && 
            retryCount < webhook.retryPolicy.maxRetries) {
          return await this.scheduleRetry(webhook, payload, retryCount + 1);
        }

        return {
          success: false,
          statusCode: response.status,
          error: `HTTP ${response.status}: ${responseData}`,
          duration,
          retryCount
        };
      }
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      // Check if this is a retryable error
      if (this.isRetryableError(errorMessage, webhook.retryPolicy) && 
          retryCount < webhook.retryPolicy.maxRetries) {
        return await this.scheduleRetry(webhook, payload, retryCount + 1);
      }

      return {
        success: false,
        error: errorMessage,
        duration,
        retryCount
      };
    }
  }

  /**
   * Schedule a retry for failed webhook
   */
  private async scheduleRetry(
    webhook: WebhookConfig,
    payload: WebhookPayload,
    retryCount: number
  ): Promise<ProcessingResult> {
    const delay = this.calculateRetryDelay(retryCount, webhook.retryPolicy);
    const nextRetry = new Date(Date.now() + delay);

    // Add to retry queue
    const webhookId = webhook.id;
    if (!this.retryQueue.has(webhookId)) {
      this.retryQueue.set(webhookId, []);
    }
    
    this.retryQueue.get(webhookId)!.push({
      payload,
      webhook,
      retryCount,
      nextRetry
    });

    // Schedule the retry
    setTimeout(() => {
      this.processRetryQueue(webhookId);
    }, delay);

    return {
      success: false,
      error: `Scheduled for retry ${retryCount}/${webhook.retryPolicy.maxRetries} in ${delay}ms`,
      duration: 0,
      retryCount
    };
  }

  /**
   * Process retry queue for a webhook
   */
  private async processRetryQueue(webhookId: string): Promise<void> {
    const retryItems = this.retryQueue.get(webhookId) || [];
    const now = new Date();

    const readyItems = retryItems.filter(item => item.nextRetry <= now);
    const remainingItems = retryItems.filter(item => item.nextRetry > now);

    // Update retry queue
    this.retryQueue.set(webhookId, remainingItems);

    // Process ready items
    for (const item of readyItems) {
      try {
        await this.sendWebhook(item.webhook, item.payload, item.retryCount);
      } catch (error) {
        console.error('Error processing retry:', error);
      }
    }
  }

  /**
   * Add authentication headers based on webhook configuration
   */
  private addAuthenticationHeaders(
    headers: Record<string, string>,
    authentication: any,
    payload: WebhookPayload
  ): void {
    switch (authentication.type) {
      case 'basic':
        if (authentication.credentials?.username && authentication.credentials?.password) {
          const credentials = btoa(`${authentication.credentials.username}:${authentication.credentials.password}`);
          headers['Authorization'] = `Basic ${credentials}`;
        }
        break;

      case 'bearer':
        if (authentication.credentials?.token) {
          headers['Authorization'] = `Bearer ${authentication.credentials.token}`;
        }
        break;

      case 'hmac':
        if (authentication.credentials?.secret) {
          const signature = this.generateHMACSignature(
            JSON.stringify(payload),
            authentication.credentials.secret,
            authentication.algorithm || 'sha256'
          );
          headers[authentication.signatureHeader || 'X-Signature'] = signature;
        }
        break;
    }
  }

  /**
   * Generate HMAC signature for webhook security
   */
  private generateHMACSignature(payload: string, secret: string, algorithm: string): string {
    // In a real implementation, you would use the Web Crypto API or a crypto library
    // This is a simplified version for demonstration
    return `${algorithm}=${btoa(payload + secret)}`;
  }

  /**
   * Check if filters pass for the given data
   */
  private passesFilters(data: any, filters: any[]): boolean {
    return filters.every(filter => {
      const value = this.getNestedValue(data, filter.field);
      
      switch (filter.operator) {
        case 'equals':
          return value === filter.value;
        case 'not_equals':
          return value !== filter.value;
        case 'contains':
          return typeof value === 'string' && value.includes(filter.value);
        case 'regex':
          return typeof value === 'string' && new RegExp(filter.value).test(value);
        case 'greater_than':
          return typeof value === 'number' && value > filter.value;
        case 'less_than':
          return typeof value === 'number' && value < filter.value;
        default:
          return true;
      }
    });
  }

  /**
   * Get nested value from object using dot notation
   */
  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

  /**
   * Check if status code is retryable
   */
  private isRetryableStatusCode(statusCode: number, retryPolicy: RetryPolicy): boolean {
    return retryPolicy.retryableStatusCodes.includes(statusCode);
  }

  /**
   * Check if error is retryable
   */
  private isRetryableError(error: string, retryPolicy: RetryPolicy): boolean {
    return retryPolicy.retryableErrors.some(retryableError => 
      error.includes(retryableError)
    );
  }

  /**
   * Calculate retry delay with exponential backoff
   */
  private calculateRetryDelay(retryCount: number, retryPolicy: RetryPolicy): number {
    const delay = retryPolicy.baseDelay * Math.pow(retryPolicy.backoffMultiplier, retryCount - 1);
    return Math.min(delay, retryPolicy.maxDelay);
  }

  /**
   * Batch process multiple events
   */
  async processBatchEvents(
    webhook: WebhookConfig,
    events: Array<{ event: WebhookEvent; data: any; metadata?: any }>
  ): Promise<ProcessingResult[]> {
    const results: ProcessingResult[] = [];

    for (const { event, data, metadata } of events) {
      try {
        const result = await this.processEvent(webhook, event, data, metadata);
        results.push(result);
      } catch (error) {
        results.push({
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
          duration: 0,
          retryCount: 0
        });
      }
    }

    return results;
  }

  /**
   * Get webhook processing statistics
   */
  getProcessingStats(webhookId: string): {
    queueSize: number;
    retryQueueSize: number;
    isProcessing: boolean;
  } {
    return {
      queueSize: this.processingQueue.get(webhookId)?.length || 0,
      retryQueueSize: this.retryQueue.get(webhookId)?.length || 0,
      isProcessing: this.isProcessing.get(webhookId) || false
    };
  }

  /**
   * Clear all queues for a webhook
   */
  clearQueues(webhookId: string): void {
    this.processingQueue.delete(webhookId);
    this.retryQueue.delete(webhookId);
    this.isProcessing.delete(webhookId);
  }

  /**
   * Validate webhook configuration
   */
  validateWebhookConfig(webhook: WebhookConfig): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Validate URL
    try {
      new URL(webhook.url);
    } catch {
      errors.push('Invalid webhook URL');
    }

    // Validate events
    if (!webhook.events || webhook.events.length === 0) {
      errors.push('At least one event must be configured');
    }

    // Validate retry policy
    if (webhook.retryPolicy.maxRetries < 0 || webhook.retryPolicy.maxRetries > 10) {
      errors.push('Max retries must be between 0 and 10');
    }

    if (webhook.retryPolicy.baseDelay < 100 || webhook.retryPolicy.baseDelay > 60000) {
      errors.push('Base delay must be between 100ms and 60s');
    }

    // Validate authentication
    if (webhook.authentication?.type === 'basic') {
      if (!webhook.authentication.credentials?.username || !webhook.authentication.credentials?.password) {
        errors.push('Username and password required for basic authentication');
      }
    }

    if (webhook.authentication?.type === 'bearer') {
      if (!webhook.authentication.credentials?.token) {
        errors.push('Token required for bearer authentication');
      }
    }

    if (webhook.authentication?.type === 'hmac') {
      if (!webhook.authentication.credentials?.secret) {
        errors.push('Secret required for HMAC authentication');
      }
    }

    // Validate security settings
    if (webhook.security.ipWhitelist && webhook.security.ipWhitelist.length > 0) {
      const ipRegex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
      const invalidIps = webhook.security.ipWhitelist.filter(ip => !ipRegex.test(ip));
      if (invalidIps.length > 0) {
        errors.push(`Invalid IP addresses in whitelist: ${invalidIps.join(', ')}`);
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Test webhook connectivity
   */
  async testWebhook(webhook: WebhookConfig, testPayload?: any): Promise<ProcessingResult> {
    const payload: WebhookPayload = {
      event: 'test',
      timestamp: new Date().toISOString(),
      data: testPayload || { test: true, message: 'This is a test webhook' },
      metadata: {
        integrationId: 'test',
        source: 'webhook-test',
        version: '1.0'
      }
    };

    return await this.sendWebhook(webhook, payload);
  }
}

export const webhookEventProcessor = new WebhookEventProcessor();