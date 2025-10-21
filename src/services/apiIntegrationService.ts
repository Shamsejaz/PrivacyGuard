import axios, { AxiosResponse } from 'axios';
import {
  APIIntegration,
  IntegrationTemplate,
  WebhookConfig,
  DataSyncConfig,
  APIRequest,
  APIResponse,
  IntegrationMetrics,
  AlertConfig,
  SyncMetrics,
  ConflictResolutionConfig
} from '../types/api-integration';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api/v1';

class APIIntegrationService {
  private getAuthHeaders() {
    const token = localStorage.getItem('token');
    return token ? { Authorization: `Bearer ${token}` } : {};
  }

  // Integration Management
  async createIntegration(integration: Omit<APIIntegration, 'id' | 'createdAt' | 'updatedAt' | 'monitoring'>): Promise<{ integrationId: string }> {
    const response = await axios.post(`${API_BASE_URL}/integrations`, integration, {
      headers: this.getAuthHeaders()
    });
    return response.data;
  }

  async getIntegrations(filters?: {
    type?: string;
    category?: string;
    status?: string;
  }): Promise<APIIntegration[]> {
    const params = new URLSearchParams();
    if (filters?.type) params.append('type', filters.type);
    if (filters?.category) params.append('category', filters.category);
    if (filters?.status) params.append('status', filters.status);

    const response = await axios.get(`${API_BASE_URL}/integrations?${params.toString()}`, {
      headers: this.getAuthHeaders()
    });
    return response.data;
  }

  async getIntegration(id: string): Promise<APIIntegration> {
    const response = await axios.get(`${API_BASE_URL}/integrations/${id}`, {
      headers: this.getAuthHeaders()
    });
    return response.data;
  }

  async updateIntegration(id: string, updates: Partial<APIIntegration>): Promise<void> {
    await axios.put(`${API_BASE_URL}/integrations/${id}`, updates, {
      headers: this.getAuthHeaders()
    });
  }

  async deleteIntegration(id: string): Promise<void> {
    await axios.delete(`${API_BASE_URL}/integrations/${id}`, {
      headers: this.getAuthHeaders()
    });
  }

  async testIntegration(id: string): Promise<{
    success: boolean;
    responseTime: number;
    statusCode?: number;
    error?: string;
    timestamp: Date;
  }> {
    const response = await axios.post(`${API_BASE_URL}/integrations/${id}/test`, {}, {
      headers: this.getAuthHeaders()
    });
    return response.data;
  }

  // Integration Templates
  async getIntegrationTemplates(category?: string): Promise<IntegrationTemplate[]> {
    const params = category ? `?category=${category}` : '';
    const response = await axios.get(`${API_BASE_URL}/integrations/templates${params}`, {
      headers: this.getAuthHeaders()
    });
    return response.data;
  }

  async getIntegrationTemplate(id: string): Promise<IntegrationTemplate> {
    const response = await axios.get(`${API_BASE_URL}/integrations/templates/${id}`, {
      headers: this.getAuthHeaders()
    });
    return response.data;
  }

  async createIntegrationFromTemplate(templateId: string, customization: {
    name: string;
    configuration: Record<string, any>;
    authentication: Record<string, any>;
  }): Promise<{ integrationId: string }> {
    const response = await axios.post(`${API_BASE_URL}/integrations/templates/${templateId}/create`, customization, {
      headers: this.getAuthHeaders()
    });
    return response.data;
  }

  // Webhook Management
  async createWebhook(integrationId: string, webhook: Omit<WebhookConfig, 'id' | 'createdAt' | 'successCount' | 'failureCount'>): Promise<{ webhookId: string }> {
    const response = await axios.post(`${API_BASE_URL}/integrations/${integrationId}/webhooks`, webhook, {
      headers: this.getAuthHeaders()
    });
    return response.data;
  }

  async getWebhooks(integrationId: string): Promise<WebhookConfig[]> {
    const response = await axios.get(`${API_BASE_URL}/integrations/${integrationId}/webhooks`, {
      headers: this.getAuthHeaders()
    });
    return response.data;
  }

  async updateWebhook(integrationId: string, webhookId: string, updates: Partial<WebhookConfig>): Promise<void> {
    await axios.put(`${API_BASE_URL}/integrations/${integrationId}/webhooks/${webhookId}`, updates, {
      headers: this.getAuthHeaders()
    });
  }

  async deleteWebhook(integrationId: string, webhookId: string): Promise<void> {
    await axios.delete(`${API_BASE_URL}/integrations/${integrationId}/webhooks/${webhookId}`, {
      headers: this.getAuthHeaders()
    });
  }

  async testWebhook(integrationId: string, webhookId: string, testPayload?: any): Promise<{
    success: boolean;
    responseTime: number;
    statusCode?: number;
    response?: any;
    error?: string;
  }> {
    const response = await axios.post(`${API_BASE_URL}/integrations/${integrationId}/webhooks/${webhookId}/test`, 
      { payload: testPayload }, 
      { headers: this.getAuthHeaders() }
    );
    return response.data;
  }

  async getWebhookLogs(integrationId: string, webhookId: string, filters?: {
    startDate?: Date;
    endDate?: Date;
    status?: 'success' | 'failure';
    limit?: number;
  }): Promise<{
    logs: Array<{
      id: string;
      timestamp: Date;
      event: string;
      payload: any;
      response?: any;
      statusCode?: number;
      error?: string;
      duration: number;
    }>;
    total: number;
  }> {
    const params = new URLSearchParams();
    if (filters?.startDate) params.append('startDate', filters.startDate.toISOString());
    if (filters?.endDate) params.append('endDate', filters.endDate.toISOString());
    if (filters?.status) params.append('status', filters.status);
    if (filters?.limit) params.append('limit', filters.limit.toString());

    const response = await axios.get(
      `${API_BASE_URL}/integrations/${integrationId}/webhooks/${webhookId}/logs?${params.toString()}`,
      { headers: this.getAuthHeaders() }
    );
    return response.data;
  }

  // Data Synchronization
  async createSyncConfig(config: Omit<DataSyncConfig, 'id' | 'lastSync' | 'nextSync' | 'metrics'>): Promise<{ syncId: string }> {
    const response = await axios.post(`${API_BASE_URL}/integrations/sync`, config, {
      headers: this.getAuthHeaders()
    });
    return response.data;
  }

  async getSyncConfigs(): Promise<DataSyncConfig[]> {
    const response = await axios.get(`${API_BASE_URL}/integrations/sync`, {
      headers: this.getAuthHeaders()
    });
    return response.data;
  }

  async getSyncConfig(id: string): Promise<DataSyncConfig> {
    const response = await axios.get(`${API_BASE_URL}/integrations/sync/${id}`, {
      headers: this.getAuthHeaders()
    });
    return response.data;
  }

  async updateSyncConfig(id: string, updates: Partial<DataSyncConfig>): Promise<void> {
    await axios.put(`${API_BASE_URL}/integrations/sync/${id}`, updates, {
      headers: this.getAuthHeaders()
    });
  }

  async deleteSyncConfig(id: string): Promise<void> {
    await axios.delete(`${API_BASE_URL}/integrations/sync/${id}`, {
      headers: this.getAuthHeaders()
    });
  }

  async executeSyncJob(id: string, options?: {
    dryRun?: boolean;
    batchSize?: number;
  }): Promise<{
    jobId: string;
    status: 'started' | 'queued';
    estimatedDuration?: number;
  }> {
    const response = await axios.post(`${API_BASE_URL}/integrations/sync/${id}/execute`, options || {}, {
      headers: this.getAuthHeaders()
    });
    return response.data;
  }

  async getSyncJobStatus(jobId: string): Promise<{
    id: string;
    status: 'running' | 'completed' | 'failed' | 'cancelled';
    progress: number;
    metrics: SyncMetrics;
    errors?: string[];
    conflicts?: Array<{
      id: string;
      sourceData: any;
      targetData: any;
      resolution?: string;
    }>;
    startTime: Date;
    endTime?: Date;
  }> {
    const response = await axios.get(`${API_BASE_URL}/integrations/sync/jobs/${jobId}`, {
      headers: this.getAuthHeaders()
    });
    return response.data;
  }

  async resolveSyncConflicts(jobId: string, resolutions: Array<{
    conflictId: string;
    resolution: 'source' | 'target' | 'merge' | 'skip';
    mergedData?: any;
  }>): Promise<void> {
    await axios.post(`${API_BASE_URL}/integrations/sync/jobs/${jobId}/resolve-conflicts`, 
      { resolutions }, 
      { headers: this.getAuthHeaders() }
    );
  }

  // API Key Management
  async generateApiKey(integrationId: string, options?: {
    name?: string;
    expiresAt?: Date;
    permissions?: string[];
  }): Promise<{
    keyId: string;
    key: string;
    expiresAt?: Date;
  }> {
    const response = await axios.post(`${API_BASE_URL}/integrations/${integrationId}/api-keys`, options || {}, {
      headers: this.getAuthHeaders()
    });
    return response.data;
  }

  async getApiKeys(integrationId: string): Promise<Array<{
    id: string;
    name: string;
    createdAt: Date;
    expiresAt?: Date;
    lastUsed?: Date;
    permissions: string[];
    status: 'active' | 'expired' | 'revoked';
  }>> {
    const response = await axios.get(`${API_BASE_URL}/integrations/${integrationId}/api-keys`, {
      headers: this.getAuthHeaders()
    });
    return response.data;
  }

  async revokeApiKey(integrationId: string, keyId: string): Promise<void> {
    await axios.delete(`${API_BASE_URL}/integrations/${integrationId}/api-keys/${keyId}`, {
      headers: this.getAuthHeaders()
    });
  }

  async rotateApiKey(integrationId: string, keyId: string): Promise<{
    keyId: string;
    key: string;
    expiresAt?: Date;
  }> {
    const response = await axios.post(`${API_BASE_URL}/integrations/${integrationId}/api-keys/${keyId}/rotate`, {}, {
      headers: this.getAuthHeaders()
    });
    return response.data;
  }

  // Monitoring and Metrics
  async getIntegrationMetrics(integrationId: string, timeRange?: {
    startDate: Date;
    endDate: Date;
  }): Promise<IntegrationMetrics> {
    const params = new URLSearchParams();
    if (timeRange?.startDate) params.append('startDate', timeRange.startDate.toISOString());
    if (timeRange?.endDate) params.append('endDate', timeRange.endDate.toISOString());

    const response = await axios.get(
      `${API_BASE_URL}/integrations/${integrationId}/metrics?${params.toString()}`,
      { headers: this.getAuthHeaders() }
    );
    return response.data;
  }

  async getIntegrationLogs(integrationId: string, filters?: {
    level?: 'debug' | 'info' | 'warn' | 'error';
    startDate?: Date;
    endDate?: Date;
    limit?: number;
  }): Promise<{
    logs: Array<{
      id: string;
      timestamp: Date;
      level: string;
      message: string;
      metadata?: any;
      requestId?: string;
    }>;
    total: number;
  }> {
    const params = new URLSearchParams();
    if (filters?.level) params.append('level', filters.level);
    if (filters?.startDate) params.append('startDate', filters.startDate.toISOString());
    if (filters?.endDate) params.append('endDate', filters.endDate.toISOString());
    if (filters?.limit) params.append('limit', filters.limit.toString());

    const response = await axios.get(
      `${API_BASE_URL}/integrations/${integrationId}/logs?${params.toString()}`,
      { headers: this.getAuthHeaders() }
    );
    return response.data;
  }

  // Alert Management
  async createAlert(integrationId: string, alert: Omit<AlertConfig, 'id'>): Promise<{ alertId: string }> {
    const response = await axios.post(`${API_BASE_URL}/integrations/${integrationId}/alerts`, alert, {
      headers: this.getAuthHeaders()
    });
    return response.data;
  }

  async getAlerts(integrationId: string): Promise<AlertConfig[]> {
    const response = await axios.get(`${API_BASE_URL}/integrations/${integrationId}/alerts`, {
      headers: this.getAuthHeaders()
    });
    return response.data;
  }

  async updateAlert(integrationId: string, alertId: string, updates: Partial<AlertConfig>): Promise<void> {
    await axios.put(`${API_BASE_URL}/integrations/${integrationId}/alerts/${alertId}`, updates, {
      headers: this.getAuthHeaders()
    });
  }

  async deleteAlert(integrationId: string, alertId: string): Promise<void> {
    await axios.delete(`${API_BASE_URL}/integrations/${integrationId}/alerts/${alertId}`, {
      headers: this.getAuthHeaders()
    });
  }

  async getActiveAlerts(): Promise<Array<{
    id: string;
    integrationId: string;
    integrationName: string;
    alertName: string;
    severity: string;
    message: string;
    triggeredAt: Date;
    acknowledged: boolean;
  }>> {
    const response = await axios.get(`${API_BASE_URL}/integrations/alerts/active`, {
      headers: this.getAuthHeaders()
    });
    return response.data;
  }

  async acknowledgeAlert(integrationId: string, alertId: string): Promise<void> {
    await axios.post(`${API_BASE_URL}/integrations/${integrationId}/alerts/${alertId}/acknowledge`, {}, {
      headers: this.getAuthHeaders()
    });
  }

  // Request Execution
  async executeRequest(integrationId: string, request: {
    endpoint: string;
    method?: string;
    headers?: Record<string, string>;
    queryParams?: Record<string, any>;
    body?: any;
  }): Promise<APIResponse> {
    const response = await axios.post(`${API_BASE_URL}/integrations/${integrationId}/execute`, request, {
      headers: this.getAuthHeaders()
    });
    return response.data;
  }

  // Batch Operations
  async executeBatchRequests(integrationId: string, requests: Array<{
    id: string;
    endpoint: string;
    method?: string;
    headers?: Record<string, string>;
    queryParams?: Record<string, any>;
    body?: any;
  }>): Promise<{
    batchId: string;
    results: Array<{
      requestId: string;
      success: boolean;
      response?: APIResponse;
      error?: string;
    }>;
  }> {
    const response = await axios.post(`${API_BASE_URL}/integrations/${integrationId}/batch`, 
      { requests }, 
      { headers: this.getAuthHeaders() }
    );
    return response.data;
  }

  // Health Check
  async getSystemHealth(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    integrations: Array<{
      id: string;
      name: string;
      status: 'healthy' | 'unhealthy';
      lastCheck: Date;
      responseTime?: number;
      error?: string;
    }>;
    timestamp: Date;
  }> {
    const response = await axios.get(`${API_BASE_URL}/integrations/health`, {
      headers: this.getAuthHeaders()
    });
    return response.data;
  }
}

export const apiIntegrationService = new APIIntegrationService();