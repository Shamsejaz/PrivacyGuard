/**
 * Privacy Comply Agent API Router
 * Main router that combines all API endpoints and provides middleware
 */

import { AgentController } from '../orchestration/agent-controller';
import { AgentAPI } from './agent-api';
import { ComplianceAPI } from './compliance-api';
import { RemediationAPI } from './remediation-api';
import { ReportingAPI } from './reporting-api';
import { QueryAPI } from './query-api';
import { ReportStorageAPI } from './report-storage-api';
import {
  APIResponse,
  APIError,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  RateLimitError,
  ServiceUnavailableError
} from './types';

export interface APIRouterConfig {
  enableRateLimit?: boolean;
  rateLimitWindow?: number; // milliseconds
  rateLimitMax?: number; // requests per window
  enableAuth?: boolean;
  enableCors?: boolean;
  enableLogging?: boolean;
}

export interface APIRequest {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  path: string;
  query?: Record<string, any>;
  body?: any;
  headers?: Record<string, string>;
  user?: {
    id: string;
    permissions: string[];
  };
}

export interface APIRouteHandler {
  (request: APIRequest): Promise<APIResponse<any>>;
}

export class PrivacyComplyAgentAPIRouter {
  private agentController: AgentController;
  private agentAPI: AgentAPI;
  private complianceAPI: ComplianceAPI;
  private remediationAPI: RemediationAPI;
  private reportingAPI: ReportingAPI;
  private queryAPI: QueryAPI;
  private reportStorageAPI: ReportStorageAPI;
  private config: APIRouterConfig;
  private routes: Map<string, APIRouteHandler> = new Map();
  private rateLimitStore: Map<string, { count: number; resetTime: number }> = new Map();

  constructor(agentController: AgentController, config: APIRouterConfig = {}) {
    this.agentController = agentController;
    this.config = {
      enableRateLimit: true,
      rateLimitWindow: 60000, // 1 minute
      rateLimitMax: 100, // 100 requests per minute
      enableAuth: false, // Disabled for now
      enableCors: true,
      enableLogging: true,
      ...config
    };

    // Initialize API classes
    this.agentAPI = new AgentAPI(agentController);
    this.complianceAPI = new ComplianceAPI(agentController);
    this.remediationAPI = new RemediationAPI(agentController);
    this.reportingAPI = new ReportingAPI(agentController);
    this.queryAPI = new QueryAPI(agentController);
    this.reportStorageAPI = new ReportStorageAPI();

    // Register routes
    this.registerRoutes();
  }

  /**
   * Main request handler
   */
  async handleRequest(request: APIRequest): Promise<APIResponse<any>> {
    const startTime = Date.now();
    let response: APIResponse<any>;

    try {
      // Apply middleware
      await this.applyMiddleware(request);

      // Find and execute route handler
      const handler = this.findRouteHandler(request.method, request.path);
      
      if (!handler) {
        response = this.createNotFoundResponse(request.path);
      } else {
        response = await handler(request);
      }

      // Add request ID and timing
      response.requestId = this.generateRequestId();
      
    } catch (error) {
      response = this.handleError(error, request);
    }

    // Log request if enabled
    if (this.config.enableLogging) {
      this.logRequest(request, response, Date.now() - startTime);
    }

    return response;
  }

  /**
   * Register all API routes
   */
  private registerRoutes(): void {
    // Agent Control Routes
    this.routes.set('GET:/api/agent/status', (req) => this.agentAPI.getStatus());
    this.routes.set('POST:/api/agent/control', (req) => this.agentAPI.controlAgent(req.body));
    this.routes.set('GET:/api/agent/configuration', (req) => this.agentAPI.getConfiguration());
    this.routes.set('PUT:/api/agent/configuration', (req) => this.agentAPI.updateConfiguration(req.body));
    this.routes.set('POST:/api/agent/configuration/validate', (req) => this.agentAPI.validateConfiguration(req.body));
    this.routes.set('GET:/api/agent/health', (req) => this.agentAPI.getHealthCheck());
    this.routes.set('POST:/api/agent/shutdown', (req) => this.agentAPI.shutdown());

    // Compliance Routes
    this.routes.set('GET:/api/compliance/findings', (req) => this.complianceAPI.getFindings(req.query));
    this.routes.set('GET:/api/compliance/findings/:id', (req) => {
      const findingId = this.extractPathParam(req.path, 'id');
      return this.complianceAPI.getFindingDetails(findingId);
    });
    this.routes.set('GET:/api/compliance/metrics', (req) => this.complianceAPI.getComplianceMetrics());
    this.routes.set('POST:/api/compliance/scan', (req) => this.complianceAPI.triggerComplianceScan(req.body));
    this.routes.set('GET:/api/compliance/assessments/:findingId', (req) => {
      const findingId = this.extractPathParam(req.path, 'findingId');
      return this.complianceAPI.getAssessment(findingId);
    });
    this.routes.set('DELETE:/api/compliance/cache', (req) => this.complianceAPI.clearCache());

    // Remediation Routes
    this.routes.set('POST:/api/remediation/execute', (req) => this.remediationAPI.executeRemediation(req.body));
    this.routes.set('GET:/api/remediation/status/:id', (req) => {
      const remediationId = this.extractPathParam(req.path, 'id');
      return this.remediationAPI.getRemediationStatus(remediationId);
    });
    this.routes.set('GET:/api/remediation/history', (req) => this.remediationAPI.getRemediationHistory(req.query));
    this.routes.set('POST:/api/remediation/rollback/:id', (req) => {
      const remediationId = this.extractPathParam(req.path, 'id');
      return this.remediationAPI.rollbackRemediation(remediationId);
    });
    this.routes.set('GET:/api/remediation/recommendations/:findingId', (req) => {
      const findingId = this.extractPathParam(req.path, 'findingId');
      return this.remediationAPI.getRecommendations(findingId);
    });
    this.routes.set('GET:/api/remediation/active', (req) => this.remediationAPI.getActiveRemediations());
    this.routes.set('DELETE:/api/remediation/cancel/:id', (req) => {
      const remediationId = this.extractPathParam(req.path, 'id');
      return this.remediationAPI.cancelRemediation(remediationId);
    });

    // Reporting Routes
    this.routes.set('POST:/api/reports/generate', (req) => this.reportingAPI.generateReport(req.body));
    this.routes.set('GET:/api/reports/:id/status', (req) => {
      const reportId = this.extractPathParam(req.path, 'id');
      return this.reportingAPI.getReportStatus(reportId);
    });
    this.routes.set('GET:/api/reports', (req) => this.reportingAPI.getReports(req.query));
    this.routes.set('GET:/api/reports/:id', (req) => {
      const reportId = this.extractPathParam(req.path, 'id');
      return this.reportingAPI.getReport(reportId);
    });
    this.routes.set('GET:/api/reports/download/:id', (req) => {
      const reportId = this.extractPathParam(req.path, 'id');
      const format = req.query?.format;
      return this.reportingAPI.downloadReport(reportId, format);
    });
    this.routes.set('DELETE:/api/reports/:id', (req) => {
      const reportId = this.extractPathParam(req.path, 'id');
      return this.reportingAPI.deleteReport(reportId);
    });
    this.routes.set('GET:/api/reports/templates', (req) => this.reportingAPI.getReportTemplates());

    // Report Storage Routes (Enhanced)
    this.routes.set('POST:/api/reports/storage/store', (req) => this.wrapExpressHandler(this.reportStorageAPI.storeReport.bind(this.reportStorageAPI), req));
    this.routes.set('GET:/api/reports/storage/:reportId', (req) => this.wrapExpressHandler(this.reportStorageAPI.getReport.bind(this.reportStorageAPI), req));
    this.routes.set('GET:/api/reports/storage/:reportId/metadata', (req) => this.wrapExpressHandler(this.reportStorageAPI.getReportMetadata.bind(this.reportStorageAPI), req));
    this.routes.set('POST:/api/reports/storage/search', (req) => this.wrapExpressHandler(this.reportStorageAPI.searchReports.bind(this.reportStorageAPI), req));
    this.routes.set('GET:/api/reports/storage/list', (req) => this.wrapExpressHandler(this.reportStorageAPI.listReports.bind(this.reportStorageAPI), req));
    this.routes.set('DELETE:/api/reports/storage/:reportId', (req) => this.wrapExpressHandler(this.reportStorageAPI.deleteReport.bind(this.reportStorageAPI), req));
    this.routes.set('POST:/api/reports/storage/bulk', (req) => this.wrapExpressHandler(this.reportStorageAPI.bulkStoreReports.bind(this.reportStorageAPI), req));
    this.routes.set('POST:/api/reports/storage/archive', (req) => this.wrapExpressHandler(this.reportStorageAPI.archiveOldReports.bind(this.reportStorageAPI), req));
    this.routes.set('GET:/api/reports/storage/metrics', (req) => this.wrapExpressHandler(this.reportStorageAPI.getStorageMetrics.bind(this.reportStorageAPI), req));
    this.routes.set('GET:/api/reports/storage/:reportId/validate', (req) => this.wrapExpressHandler(this.reportStorageAPI.validateReportIntegrity.bind(this.reportStorageAPI), req));
    this.routes.set('GET:/api/reports/storage/:reportId/export', (req) => this.wrapExpressHandler(this.reportStorageAPI.exportReport.bind(this.reportStorageAPI), req));
    this.routes.set('GET:/api/reports/storage/stats', (req) => this.wrapExpressHandler(this.reportStorageAPI.getReportStatistics.bind(this.reportStorageAPI), req));

    // Query Routes
    this.routes.set('POST:/api/query', (req) => this.queryAPI.processQuery(req.body));
    this.routes.set('GET:/api/query/suggestions', (req) => this.queryAPI.getQuerySuggestions());
    this.routes.set('GET:/api/query/conversations', (req) => this.queryAPI.getConversationHistory(req.query));
    this.routes.set('GET:/api/query/conversations/:id', (req) => {
      const conversationId = this.extractPathParam(req.path, 'id');
      return this.queryAPI.getConversation(conversationId);
    });
    this.routes.set('DELETE:/api/query/conversations/:id', (req) => {
      const conversationId = this.extractPathParam(req.path, 'id');
      return this.queryAPI.deleteConversation(conversationId);
    });
    this.routes.set('POST:/api/query/explain/:findingId', (req) => {
      const findingId = this.extractPathParam(req.path, 'findingId');
      return this.queryAPI.explainFinding(findingId);
    });
    this.routes.set('DELETE:/api/query/cache', (req) => this.queryAPI.clearQueryCache());
  }

  /**
   * Apply middleware to request
   */
  private async applyMiddleware(request: APIRequest): Promise<void> {
    // Rate limiting
    if (this.config.enableRateLimit) {
      await this.applyRateLimit(request);
    }

    // Authentication
    if (this.config.enableAuth) {
      await this.applyAuthentication(request);
    }

    // Authorization
    if (this.config.enableAuth && request.user) {
      await this.applyAuthorization(request);
    }
  }

  /**
   * Apply rate limiting
   */
  private async applyRateLimit(request: APIRequest): Promise<void> {
    const clientId = this.getClientId(request);
    const now = Date.now();
    const windowStart = now - this.config.rateLimitWindow!;

    // Clean up old entries
    for (const [key, data] of this.rateLimitStore.entries()) {
      if (data.resetTime < windowStart) {
        this.rateLimitStore.delete(key);
      }
    }

    // Check current client
    const clientData = this.rateLimitStore.get(clientId);
    
    if (!clientData) {
      this.rateLimitStore.set(clientId, {
        count: 1,
        resetTime: now + this.config.rateLimitWindow!
      });
    } else if (clientData.resetTime < now) {
      // Reset window
      clientData.count = 1;
      clientData.resetTime = now + this.config.rateLimitWindow!;
    } else {
      clientData.count++;
      
      if (clientData.count > this.config.rateLimitMax!) {
        const retryAfter = Math.ceil((clientData.resetTime - now) / 1000);
        const rateLimitError = new Error('Rate limit exceeded');
        (rateLimitError as any).code = 'RATE_LIMIT_EXCEEDED';
        (rateLimitError as any).retryAfter = retryAfter;
        throw rateLimitError;
      }
    }
  }

  /**
   * Apply authentication
   */
  private async applyAuthentication(request: APIRequest): Promise<void> {
    const authHeader = request.headers?.['authorization'];
    
    if (!authHeader) {
      const authError = new Error('Authentication required');
      (authError as any).code = 'AUTHENTICATION_ERROR';
      throw authError;
    }

    // In a real implementation, this would validate the token
    // For now, we'll simulate authentication
    const token = authHeader.replace('Bearer ', '');
    if (!token || token === 'invalid') {
      const authError = new Error('Invalid authentication token');
      (authError as any).code = 'AUTHENTICATION_ERROR';
      throw authError;
    }

    // Set user context (simulated)
    request.user = {
      id: 'user-123',
      permissions: ['read:compliance', 'write:remediation', 'admin:agent']
    };
  }

  /**
   * Apply authorization
   */
  private async applyAuthorization(request: APIRequest): Promise<void> {
    if (!request.user) {
      const authzError = new Error('User context not found');
      (authzError as any).code = 'AUTHORIZATION_ERROR';
      throw authzError;
    }

    const requiredPermission = this.getRequiredPermission(request.method, request.path);
    
    if (requiredPermission && !request.user.permissions.includes(requiredPermission)) {
      const authzError = new Error('Insufficient permissions');
      (authzError as any).code = 'AUTHORIZATION_ERROR';
      (authzError as any).requiredPermissions = [requiredPermission];
      throw authzError;
    }
  }

  /**
   * Find route handler for method and path
   */
  private findRouteHandler(method: string, path: string): APIRouteHandler | undefined {
    // First try exact match
    const exactKey = `${method}:${path}`;
    if (this.routes.has(exactKey)) {
      return this.routes.get(exactKey);
    }

    // Try pattern matching for parameterized routes
    for (const [routeKey, handler] of this.routes.entries()) {
      if (this.matchesRoute(routeKey, method, path)) {
        return handler;
      }
    }

    return undefined;
  }

  /**
   * Check if route pattern matches request
   */
  private matchesRoute(routeKey: string, method: string, path: string): boolean {
    const [routeMethod, routePath] = routeKey.split(':');
    
    if (routeMethod !== method) {
      return false;
    }

    // Convert route pattern to regex
    const routeRegex = routePath.replace(/:([^/]+)/g, '([^/]+)');
    const regex = new RegExp(`^${routeRegex}$`);
    
    return regex.test(path);
  }

  /**
   * Extract path parameter value
   */
  private extractPathParam(path: string, paramName: string): string {
    // Simple implementation - in production would use a proper router
    const segments = path.split('/');
    
    // This is a simplified extraction - would need more sophisticated logic
    // for complex route patterns
    return segments[segments.length - 1];
  }

  /**
   * Handle errors and convert to API response
   */
  private handleError(error: any, request: APIRequest): APIResponse<any> {
    console.error('API Error:', error);

    if ((error as any).code === 'RATE_LIMIT_EXCEEDED') {
      return {
        success: false,
        error: error.message,
        timestamp: new Date().toISOString(),
        requestId: this.generateRequestId()
      };
    }

    if ((error as any).code === 'AUTHENTICATION_ERROR' || (error as any).code === 'AUTHORIZATION_ERROR') {
      return {
        success: false,
        error: error.message,
        timestamp: new Date().toISOString(),
        requestId: this.generateRequestId()
      };
    }

    if ((error as any).code === 'NOT_FOUND') {
      return {
        success: false,
        error: error.message,
        timestamp: new Date().toISOString(),
        requestId: this.generateRequestId()
      };
    }

    // Generic error
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error',
      timestamp: new Date().toISOString(),
      requestId: this.generateRequestId()
    };
  }

  /**
   * Create not found response
   */
  private createNotFoundResponse(path: string): APIResponse<any> {
    return {
      success: false,
      error: `Route not found: ${path}`,
      timestamp: new Date().toISOString(),
      requestId: this.generateRequestId()
    };
  }

  /**
   * Get client ID for rate limiting
   */
  private getClientId(request: APIRequest): string {
    // In a real implementation, this would use IP address or user ID
    return request.headers?.['x-client-id'] || 'default-client';
  }

  /**
   * Get required permission for route
   */
  private getRequiredPermission(method: string, path: string): string | undefined {
    // Simplified permission mapping
    if (path.startsWith('/api/agent/')) {
      return method === 'GET' ? 'read:agent' : 'admin:agent';
    }
    
    if (path.startsWith('/api/compliance/')) {
      return 'read:compliance';
    }
    
    if (path.startsWith('/api/remediation/')) {
      return method === 'GET' ? 'read:remediation' : 'write:remediation';
    }
    
    if (path.startsWith('/api/reports/')) {
      return method === 'GET' ? 'read:reports' : 'write:reports';
    }
    
    if (path.startsWith('/api/query/')) {
      return 'read:compliance';
    }

    return undefined;
  }

  /**
   * Generate unique request ID
   */
  private generateRequestId(): string {
    return `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Wrap Express-style handlers to work with our API router
   */
  private async wrapExpressHandler(handler: Function, request: APIRequest): Promise<APIResponse<any>> {
    return new Promise((resolve) => {
      // Create mock Express request and response objects
      const req = {
        params: this.extractPathParams(request.path),
        query: request.query || {},
        body: request.body || {},
        headers: request.headers || {}
      };

      const res = {
        status: (code: number) => ({
          json: (data: any) => {
            resolve({
              success: code < 400,
              data: code < 400 ? data : undefined,
              error: code >= 400 ? data.error : undefined,
              timestamp: new Date().toISOString(),
              requestId: this.generateRequestId()
            });
          }
        }),
        json: (data: any) => {
          resolve({
            success: true,
            data,
            timestamp: new Date().toISOString(),
            requestId: this.generateRequestId()
          });
        },
        setHeader: () => {},
        send: (data: any) => {
          resolve({
            success: true,
            data,
            timestamp: new Date().toISOString(),
            requestId: this.generateRequestId()
          });
        }
      };

      // Call the handler
      handler(req, res).catch((error: any) => {
        resolve({
          success: false,
          error: error.message || 'Internal server error',
          timestamp: new Date().toISOString(),
          requestId: this.generateRequestId()
        });
      });
    });
  }

  /**
   * Extract path parameters from URL
   */
  private extractPathParams(path: string): Record<string, string> {
    const segments = path.split('/');
    const params: Record<string, string> = {};
    
    // Simple parameter extraction - in production would use proper route matching
    if (segments.length > 4) {
      params.reportId = segments[4]; // Assuming /api/reports/storage/:reportId pattern
    }
    
    return params;
  }

  /**
   * Log request and response
   */
  private logRequest(request: APIRequest, response: APIResponse<any>, duration: number): void {
    const logEntry = {
      timestamp: new Date().toISOString(),
      method: request.method,
      path: request.path,
      success: response.success,
      duration,
      requestId: response.requestId,
      error: response.error
    };

    console.log('API Request:', JSON.stringify(logEntry));
  }

  /**
   * Get all registered routes
   */
  getRoutes(): string[] {
    return Array.from(this.routes.keys());
  }

  /**
   * Get API documentation
   */
  getAPIDocumentation(): any {
    return {
      title: 'Privacy Comply Agent API',
      version: '1.0.0',
      description: 'REST API for the Privacy Comply Agent system',
      baseUrl: '/api',
      routes: {
        agent: {
          'GET /agent/status': 'Get agent status and health',
          'POST /agent/control': 'Control agent operations',
          'GET /agent/configuration': 'Get agent configuration',
          'PUT /agent/configuration': 'Update agent configuration',
          'GET /agent/health': 'Get detailed health check'
        },
        compliance: {
          'GET /compliance/findings': 'Get compliance findings',
          'GET /compliance/findings/:id': 'Get finding details',
          'GET /compliance/metrics': 'Get compliance metrics',
          'POST /compliance/scan': 'Trigger compliance scan'
        },
        remediation: {
          'POST /remediation/execute': 'Execute remediation',
          'GET /remediation/status/:id': 'Get remediation status',
          'GET /remediation/history': 'Get remediation history',
          'POST /remediation/rollback/:id': 'Rollback remediation'
        },
        reporting: {
          'POST /reports/generate': 'Generate compliance report',
          'GET /reports': 'List reports',
          'GET /reports/:id': 'Get report details',
          'GET /reports/download/:id': 'Download report'
        },
        reportStorage: {
          'POST /reports/storage/store': 'Store compliance report with encryption',
          'GET /reports/storage/:reportId': 'Retrieve report by ID',
          'GET /reports/storage/:reportId/metadata': 'Get report metadata only',
          'POST /reports/storage/search': 'Advanced report search',
          'GET /reports/storage/list': 'List reports with basic filtering',
          'DELETE /reports/storage/:reportId': 'Delete report with audit trail',
          'POST /reports/storage/bulk': 'Bulk store multiple reports',
          'POST /reports/storage/archive': 'Archive old reports',
          'GET /reports/storage/metrics': 'Get storage metrics and health',
          'GET /reports/storage/:reportId/validate': 'Validate report integrity',
          'GET /reports/storage/:reportId/export': 'Export report in various formats',
          'GET /reports/storage/stats': 'Get report statistics for dashboard'
        },
        query: {
          'POST /query': 'Process natural language query',
          'GET /query/suggestions': 'Get query suggestions',
          'GET /query/conversations': 'Get conversation history'
        }
      }
    };
  }
}