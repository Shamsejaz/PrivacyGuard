import { 
  AuditEvent, 
  AuditEventType, 
  AuditCategory, 
  AuditSeverity, 
  AuditOutcome,
  AuditFilter,
  AuditSearchResult,
  AuditExportOptions,
  AuditConfiguration,
  AuditAlert,
  AuditStatistics,
  AuditMetadata
} from '../types/audit';
import { User } from '../types';

class AuditService {
  private baseUrl = '/api/audit';
  private eventQueue: AuditEvent[] = [];
  private batchSize = 10;
  private flushInterval = 5000; // 5 seconds
  private isOnline = navigator.onLine;

  constructor() {
    this.initializeService();
  }

  private initializeService() {
    // Set up batch processing
    setInterval(() => {
      this.flushEventQueue();
    }, this.flushInterval);

    // Handle online/offline status
    window.addEventListener('online', () => {
      this.isOnline = true;
      this.flushEventQueue();
    });

    window.addEventListener('offline', () => {
      this.isOnline = false;
    });

    // Handle page unload
    window.addEventListener('beforeunload', () => {
      this.flushEventQueue(true);
    });
  }

  /**
   * Log an audit event
   */
  async logEvent(
    eventType: AuditEventType,
    category: AuditCategory,
    action: string,
    resource: string,
    details: Record<string, any> = {},
    options: {
      resourceId?: string;
      severity?: AuditSeverity;
      outcome?: AuditOutcome;
      correlationId?: string;
      customFields?: Record<string, any>;
    } = {}
  ): Promise<void> {
    try {
      const user = this.getCurrentUser();
      if (!user) {
        console.warn('Cannot log audit event: No authenticated user');
        return;
      }

      const event: AuditEvent = {
        id: this.generateEventId(),
        timestamp: new Date(),
        userId: user.id,
        userEmail: user.email,
        userName: user.name,
        tenantId: user.tenantId,
        sessionId: user.sessionId,
        eventType,
        category,
        action,
        resource,
        resourceId: options.resourceId,
        details: this.sanitizeDetails(details),
        metadata: this.createMetadata(options.correlationId, options.customFields),
        severity: options.severity || this.determineSeverity(eventType),
        outcome: options.outcome || AuditOutcome.SUCCESS,
        ipAddress: await this.getClientIP(),
        userAgent: navigator.userAgent,
        location: await this.getGeoLocation()
      };

      // Add to queue for batch processing
      this.eventQueue.push(event);

      // Flush immediately for critical events
      if (event.severity === AuditSeverity.CRITICAL) {
        await this.flushEventQueue(true);
      }

    } catch (error) {
      console.error('Failed to log audit event:', error);
      // Store in local storage as fallback
      this.storeEventLocally(eventType, category, action, resource, details);
    }
  }

  /**
   * Search audit events
   */
  async searchEvents(filter: AuditFilter): Promise<AuditSearchResult> {
    try {
      const response = await fetch(`${this.baseUrl}/search`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.getAuthToken()}`
        },
        body: JSON.stringify(filter)
      });

      if (!response.ok) {
        throw new Error(`Search failed: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to search audit events:', error);
      throw error;
    }
  }

  /**
   * Export audit events
   */
  async exportEvents(options: AuditExportOptions): Promise<Blob> {
    try {
      const response = await fetch(`${this.baseUrl}/export`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.getAuthToken()}`
        },
        body: JSON.stringify(options)
      });

      if (!response.ok) {
        throw new Error(`Export failed: ${response.statusText}`);
      }

      return await response.blob();
    } catch (error) {
      console.error('Failed to export audit events:', error);
      throw error;
    }
  }

  /**
   * Get audit statistics
   */
  async getStatistics(filter: AuditFilter): Promise<AuditStatistics> {
    try {
      const response = await fetch(`${this.baseUrl}/statistics`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.getAuthToken()}`
        },
        body: JSON.stringify(filter)
      });

      if (!response.ok) {
        throw new Error(`Statistics request failed: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to get audit statistics:', error);
      throw error;
    }
  }

  /**
   * Get audit configuration
   */
  async getConfiguration(): Promise<AuditConfiguration> {
    try {
      const response = await fetch(`${this.baseUrl}/configuration`, {
        headers: {
          'Authorization': `Bearer ${this.getAuthToken()}`
        }
      });

      if (!response.ok) {
        throw new Error(`Configuration request failed: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to get audit configuration:', error);
      throw error;
    }
  }

  /**
   * Update audit configuration
   */
  async updateConfiguration(config: Partial<AuditConfiguration>): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/configuration`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.getAuthToken()}`
        },
        body: JSON.stringify(config)
      });

      if (!response.ok) {
        throw new Error(`Configuration update failed: ${response.statusText}`);
      }

      // Log the configuration change
      await this.logEvent(
        AuditEventType.CONFIGURATION_CHANGE,
        AuditCategory.SYSTEM,
        'UPDATE_AUDIT_CONFIGURATION',
        'audit_configuration',
        { changes: config },
        { severity: AuditSeverity.HIGH }
      );
    } catch (error) {
      console.error('Failed to update audit configuration:', error);
      throw error;
    }
  }

  /**
   * Create audit alert
   */
  async createAlert(alert: Omit<AuditAlert, 'id' | 'createdAt'>): Promise<AuditAlert> {
    try {
      const response = await fetch(`${this.baseUrl}/alerts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.getAuthToken()}`
        },
        body: JSON.stringify(alert)
      });

      if (!response.ok) {
        throw new Error(`Alert creation failed: ${response.statusText}`);
      }

      const createdAlert = await response.json();

      // Log the alert creation
      await this.logEvent(
        AuditEventType.CONFIGURATION_CHANGE,
        AuditCategory.SYSTEM,
        'CREATE_AUDIT_ALERT',
        'audit_alert',
        { alertName: alert.name, alertId: createdAlert.id },
        { severity: AuditSeverity.MEDIUM }
      );

      return createdAlert;
    } catch (error) {
      console.error('Failed to create audit alert:', error);
      throw error;
    }
  }

  /**
   * Convenience methods for common audit events
   */
  async logLogin(success: boolean, provider?: string, mfaUsed?: boolean): Promise<void> {
    await this.logEvent(
      success ? AuditEventType.LOGIN : AuditEventType.LOGIN_FAILED,
      AuditCategory.AUTHENTICATION,
      success ? 'USER_LOGIN_SUCCESS' : 'USER_LOGIN_FAILED',
      'authentication',
      { provider, mfaUsed },
      { 
        severity: success ? AuditSeverity.LOW : AuditSeverity.MEDIUM,
        outcome: success ? AuditOutcome.SUCCESS : AuditOutcome.FAILURE
      }
    );
  }

  async logLogout(): Promise<void> {
    await this.logEvent(
      AuditEventType.LOGOUT,
      AuditCategory.AUTHENTICATION,
      'USER_LOGOUT',
      'authentication',
      {},
      { severity: AuditSeverity.LOW }
    );
  }

  async logDataAccess(resource: string, resourceId: string, action: string): Promise<void> {
    await this.logEvent(
      AuditEventType.DATA_ACCESS,
      AuditCategory.DATA_MANAGEMENT,
      action,
      resource,
      {},
      { 
        resourceId,
        severity: AuditSeverity.MEDIUM
      }
    );
  }

  async logDataExport(resource: string, format: string, recordCount: number): Promise<void> {
    await this.logEvent(
      AuditEventType.DATA_EXPORT,
      AuditCategory.DATA_MANAGEMENT,
      'EXPORT_DATA',
      resource,
      { format, recordCount },
      { severity: AuditSeverity.HIGH }
    );
  }

  async logComplianceAction(action: string, framework: string, details: Record<string, any>): Promise<void> {
    await this.logEvent(
      AuditEventType.COMPLIANCE_ASSESSMENT,
      AuditCategory.COMPLIANCE,
      action,
      'compliance_framework',
      { framework, ...details },
      { severity: AuditSeverity.MEDIUM }
    );
  }

  async logSecurityIncident(severity: AuditSeverity, details: Record<string, any>): Promise<void> {
    await this.logEvent(
      AuditEventType.SECURITY_INCIDENT,
      AuditCategory.SECURITY,
      'SECURITY_INCIDENT_DETECTED',
      'security',
      details,
      { severity }
    );
  }

  // Private helper methods
  private async flushEventQueue(force = false): Promise<void> {
    if (!this.isOnline && !force) return;
    if (this.eventQueue.length === 0) return;

    const eventsToSend = this.eventQueue.splice(0, force ? this.eventQueue.length : this.batchSize);

    try {
      const response = await fetch(`${this.baseUrl}/events/batch`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.getAuthToken()}`
        },
        body: JSON.stringify({ events: eventsToSend })
      });

      if (!response.ok) {
        // Put events back in queue for retry
        this.eventQueue.unshift(...eventsToSend);
        throw new Error(`Batch send failed: ${response.statusText}`);
      }
    } catch (error) {
      console.error('Failed to send audit events batch:', error);
      // Store in local storage as fallback
      eventsToSend.forEach(event => {
        this.storeEventLocally(
          event.eventType,
          event.category,
          event.action,
          event.resource,
          event.details
        );
      });
    }
  }

  private generateEventId(): string {
    return `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private getCurrentUser(): User | null {
    try {
      const userStr = localStorage.getItem('privacyguard_user');
      return userStr ? JSON.parse(userStr) : null;
    } catch {
      return null;
    }
  }

  private getAuthToken(): string {
    return localStorage.getItem('privacyguard_session') || '';
  }

  private async getClientIP(): Promise<string> {
    try {
      // In production, this would be handled by the backend
      return 'client-ip-placeholder';
    } catch {
      return 'unknown';
    }
  }

  private async getGeoLocation(): Promise<any> {
    try {
      // In production, this would use a geolocation service
      return null;
    } catch {
      return null;
    }
  }

  private createMetadata(correlationId?: string, customFields?: Record<string, any>): AuditMetadata {
    return {
      correlationId,
      requestId: this.generateRequestId(),
      source: 'frontend',
      version: '1.0.0',
      environment: process.env.NODE_ENV as any || 'development',
      tags: ['frontend', 'user-action'],
      customFields
    };
  }

  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private sanitizeDetails(details: Record<string, any>): Record<string, any> {
    // Remove sensitive information
    const sanitized = { ...details };
    const sensitiveKeys = ['password', 'token', 'secret', 'key', 'ssn', 'creditCard'];
    
    for (const key of Object.keys(sanitized)) {
      if (sensitiveKeys.some(sensitive => key.toLowerCase().includes(sensitive))) {
        sanitized[key] = '[REDACTED]';
      }
    }
    
    return sanitized;
  }

  private determineSeverity(eventType: AuditEventType): AuditSeverity {
    // Critical events
    if ([
      AuditEventType.SECURITY_INCIDENT,
      AuditEventType.BREACH_DETECTED,
      AuditEventType.DATA_DELETE
    ].includes(eventType)) {
      return AuditSeverity.CRITICAL;
    }

    // High severity events
    if ([
      AuditEventType.DATA_EXPORT,
      AuditEventType.PERMISSION_DENIED,
      AuditEventType.CONFIGURATION_CHANGE,
      AuditEventType.USER_DELETED
    ].includes(eventType)) {
      return AuditSeverity.HIGH;
    }

    // Medium severity events
    if ([
      AuditEventType.DATA_ACCESS,
      AuditEventType.DATA_MODIFY,
      AuditEventType.LOGIN_FAILED,
      AuditEventType.COMPLIANCE_ASSESSMENT
    ].includes(eventType)) {
      return AuditSeverity.MEDIUM;
    }

    // Default to low
    return AuditSeverity.LOW;
  }

  private storeEventLocally(
    eventType: AuditEventType,
    category: AuditCategory,
    action: string,
    resource: string,
    details: Record<string, any>
  ): void {
    try {
      const localEvents = JSON.parse(localStorage.getItem('audit_events_offline') || '[]');
      localEvents.push({
        eventType,
        category,
        action,
        resource,
        details,
        timestamp: new Date().toISOString()
      });
      
      // Keep only last 100 events in local storage
      if (localEvents.length > 100) {
        localEvents.splice(0, localEvents.length - 100);
      }
      
      localStorage.setItem('audit_events_offline', JSON.stringify(localEvents));
    } catch (error) {
      console.error('Failed to store audit event locally:', error);
    }
  }
}

export const auditService = new AuditService();
export default auditService;