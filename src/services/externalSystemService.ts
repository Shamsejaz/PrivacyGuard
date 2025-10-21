import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api/v1';

export interface DatabaseConnection {
  id: string;
  name: string;
  type: 'postgresql' | 'mongodb' | 'mysql';
  config: DatabaseConfig;
  status: 'connected' | 'disconnected' | 'error' | 'connecting';
  lastConnected?: Date;
  lastError?: string;
}

export interface DatabaseConfig {
  host: string;
  port: number;
  database: string;
  username: string;
  password: string;
  ssl?: boolean;
  connectionTimeout?: number;
  maxConnections?: number;
  authSource?: string;
  replicaSet?: string;
  charset?: string;
  timezone?: string;
}

export interface ApiConnection {
  id: string;
  name: string;
  baseUrl: string;
  authentication?: {
    type: 'none' | 'basic' | 'bearer' | 'api_key' | 'oauth2';
    credentials: Record<string, string>;
  };
  headers?: Record<string, string>;
  timeout?: number;
  retryConfig?: RetryConfig;
  circuitBreakerConfig?: CircuitBreakerConfig;
  status: 'active' | 'inactive' | 'error';
  lastUsed?: Date;
  lastError?: string;
}

export interface RetryConfig {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
  retryableStatusCodes: number[];
  retryableErrors: string[];
}

export interface CircuitBreakerConfig {
  failureThreshold: number;
  resetTimeout: number;
  monitoringPeriod: number;
  expectedResponseTime: number;
}

export interface ImportJob {
  id: string;
  name: string;
  sourceType: 'file' | 'database' | 'api';
  sourceConfig: ImportSourceConfig;
  targetTable: string;
  targetConnectionId?: string;
  mapping: FieldMapping[];
  validation: ValidationRule[];
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  progress: number;
  recordsProcessed: number;
  recordsSucceeded: number;
  recordsFailed: number;
  errors: ImportError[];
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
}

export interface ExportJob {
  id: string;
  name: string;
  sourceTable: string;
  sourceConnectionId?: string;
  targetType: 'file' | 'database' | 'api';
  targetConfig: ExportTargetConfig;
  filters: ExportFilter[];
  format: 'csv' | 'json' | 'xml' | 'excel';
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  progress: number;
  recordsProcessed: number;
  filePath?: string;
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
}

export interface ImportSourceConfig {
  filePath?: string;
  fileType?: 'csv' | 'json' | 'xml' | 'excel';
  delimiter?: string;
  encoding?: string;
  hasHeader?: boolean;
  connectionId?: string;
  query?: string;
  table?: string;
  url?: string;
  method?: 'GET' | 'POST';
  headers?: Record<string, string>;
  authentication?: {
    type: 'basic' | 'bearer' | 'api_key';
    credentials: Record<string, string>;
  };
}

export interface ExportTargetConfig {
  filePath?: string;
  connectionId?: string;
  table?: string;
  url?: string;
  method?: 'POST' | 'PUT';
  headers?: Record<string, string>;
  authentication?: {
    type: 'basic' | 'bearer' | 'api_key';
    credentials: Record<string, string>;
  };
}

export interface FieldMapping {
  sourceField: string;
  targetField: string;
  transformation?: {
    type: 'format' | 'calculate' | 'lookup' | 'default';
    config: Record<string, any>;
  };
}

export interface ValidationRule {
  field: string;
  type: 'required' | 'type' | 'format' | 'range' | 'custom';
  config: Record<string, any>;
  errorMessage?: string;
}

export interface ExportFilter {
  field: string;
  operator: 'equals' | 'contains' | 'greater_than' | 'less_than' | 'in' | 'not_in';
  value: any;
}

export interface ImportError {
  row: number;
  field?: string;
  message: string;
  data?: Record<string, any>;
}

export interface SyncJob {
  id: string;
  config: DataSyncConfig;
}

export interface DataSyncConfig {
  sourceConnectionId: string;
  targetConnectionId: string;
  syncType: 'full' | 'incremental' | 'real-time';
  schedule?: string;
  conflictResolution: 'source-wins' | 'target-wins' | 'manual' | 'timestamp';
  transformations?: DataTransformation[];
  filters?: DataFilter[];
}

export interface DataTransformation {
  field: string;
  operation: 'map' | 'format' | 'calculate' | 'combine';
  config: Record<string, any>;
}

export interface DataFilter {
  field: string;
  operator: 'equals' | 'contains' | 'greater_than' | 'less_than' | 'in' | 'not_in';
  value: any;
}

export interface SyncResult {
  syncId: string;
  status: 'success' | 'partial' | 'failed';
  recordsProcessed: number;
  recordsSucceeded: number;
  recordsFailed: number;
  conflicts: ConflictRecord[];
  errors: string[];
  startTime: Date;
  endTime: Date;
}

export interface ConflictRecord {
  id: string;
  table: string;
  sourceData: Record<string, any>;
  targetData: Record<string, any>;
  conflictType: 'update' | 'delete' | 'duplicate';
  resolution?: 'source' | 'target' | 'manual';
}

export interface ExternalSystemConfig {
  id: string;
  name: string;
  type: 'database' | 'api' | 'file_system' | 'cloud_storage';
  category: 'source' | 'target' | 'both';
  config: Record<string, any>;
  credentials: Record<string, string>;
  metadata: {
    description?: string;
    tags?: string[];
    owner?: string;
    environment: 'development' | 'staging' | 'production';
    createdAt: Date;
    updatedAt: Date;
    lastUsed?: Date;
  };
  status: 'active' | 'inactive' | 'error';
  validation: {
    required: string[];
    optional: string[];
    encrypted: string[];
  };
}

export interface ConfigTemplate {
  id: string;
  name: string;
  type: 'database' | 'api' | 'file_system' | 'cloud_storage';
  description: string;
  configSchema: Record<string, any>;
  credentialSchema: Record<string, any>;
}

export interface ConnectionHealth {
  database: Record<string, boolean>;
  api: Record<string, boolean>;
  timestamp: Date;
}

export interface ConnectionMetrics {
  metrics: {
    totalRequests: number;
    successRate: number;
    averageResponseTime: number;
    errorRate: number;
  };
  history: ApiResponse[];
  circuitBreaker?: CircuitBreakerState;
}

export interface ApiResponse {
  requestId: string;
  success: boolean;
  statusCode?: number;
  data?: any;
  error?: string;
  responseTime: number;
  retryCount: number;
  timestamp: Date;
}

export interface CircuitBreakerState {
  connectionId: string;
  state: 'closed' | 'open' | 'half-open';
  failureCount: number;
  lastFailureTime?: Date;
  nextAttemptTime?: Date;
  successCount: number;
  totalRequests: number;
}

class ExternalSystemService {
  private getAuthHeaders() {
    const token = localStorage.getItem('token');
    return token ? { Authorization: `Bearer ${token}` } : {};
  }

  // Database Connections
  async createDatabaseConnection(connection: Omit<DatabaseConnection, 'status' | 'lastConnected' | 'lastError'>): Promise<void> {
    await axios.post(`${API_BASE_URL}/external-systems/connections/database`, connection, {
      headers: this.getAuthHeaders()
    });
  }

  async getDatabaseConnections(): Promise<DatabaseConnection[]> {
    const response = await axios.get(`${API_BASE_URL}/external-systems/connections/database`, {
      headers: this.getAuthHeaders()
    });
    return response.data;
  }

  async getDatabaseConnection(id: string): Promise<DatabaseConnection> {
    const response = await axios.get(`${API_BASE_URL}/external-systems/connections/database/${id}`, {
      headers: this.getAuthHeaders()
    });
    return response.data;
  }

  async testDatabaseConnection(id: string): Promise<{ connectionId: string; healthy: boolean; timestamp: Date }> {
    const response = await axios.post(`${API_BASE_URL}/external-systems/connections/database/${id}/test`, {}, {
      headers: this.getAuthHeaders()
    });
    return response.data;
  }

  async removeDatabaseConnection(id: string): Promise<void> {
    await axios.delete(`${API_BASE_URL}/external-systems/connections/database/${id}`, {
      headers: this.getAuthHeaders()
    });
  }

  // API Connections
  async createApiConnection(connection: Omit<ApiConnection, 'status' | 'lastUsed' | 'lastError'>): Promise<void> {
    await axios.post(`${API_BASE_URL}/external-systems/connections/api`, connection, {
      headers: this.getAuthHeaders()
    });
  }

  async getApiConnections(): Promise<ApiConnection[]> {
    const response = await axios.get(`${API_BASE_URL}/external-systems/connections/api`, {
      headers: this.getAuthHeaders()
    });
    return response.data;
  }

  async testApiConnection(id: string): Promise<{ connectionId: string; healthy: boolean; timestamp: Date }> {
    const response = await axios.post(`${API_BASE_URL}/external-systems/connections/api/${id}/test`, {}, {
      headers: this.getAuthHeaders()
    });
    return response.data;
  }

  // Data Synchronization
  async createSyncJob(config: DataSyncConfig): Promise<{ syncId: string }> {
    const response = await axios.post(`${API_BASE_URL}/external-systems/sync/jobs`, config, {
      headers: this.getAuthHeaders()
    });
    return response.data;
  }

  async executeSyncJob(syncId: string): Promise<SyncResult> {
    const response = await axios.post(`${API_BASE_URL}/external-systems/sync/jobs/${syncId}/execute`, {}, {
      headers: this.getAuthHeaders()
    });
    return response.data;
  }

  async getSyncJobs(): Promise<SyncJob[]> {
    const response = await axios.get(`${API_BASE_URL}/external-systems/sync/jobs`, {
      headers: this.getAuthHeaders()
    });
    return response.data;
  }

  // Import/Export Jobs
  async createImportJob(job: Omit<ImportJob, 'id' | 'status' | 'progress' | 'recordsProcessed' | 'recordsSucceeded' | 'recordsFailed' | 'errors' | 'createdAt'>): Promise<{ jobId: string }> {
    const response = await axios.post(`${API_BASE_URL}/external-systems/import/jobs`, job, {
      headers: this.getAuthHeaders()
    });
    return response.data;
  }

  async executeImportJob(jobId: string): Promise<{ message: string; jobId: string }> {
    const response = await axios.post(`${API_BASE_URL}/external-systems/import/jobs/${jobId}/execute`, {}, {
      headers: this.getAuthHeaders()
    });
    return response.data;
  }

  async createExportJob(job: Omit<ExportJob, 'id' | 'status' | 'progress' | 'recordsProcessed' | 'createdAt'>): Promise<{ jobId: string }> {
    const response = await axios.post(`${API_BASE_URL}/external-systems/export/jobs`, job, {
      headers: this.getAuthHeaders()
    });
    return response.data;
  }

  async executeExportJob(jobId: string): Promise<{ message: string; jobId: string }> {
    const response = await axios.post(`${API_BASE_URL}/external-systems/export/jobs/${jobId}/execute`, {}, {
      headers: this.getAuthHeaders()
    });
    return response.data;
  }

  async getImportJobs(): Promise<ImportJob[]> {
    const response = await axios.get(`${API_BASE_URL}/external-systems/import/jobs`, {
      headers: this.getAuthHeaders()
    });
    return response.data;
  }

  async getExportJobs(): Promise<ExportJob[]> {
    const response = await axios.get(`${API_BASE_URL}/external-systems/export/jobs`, {
      headers: this.getAuthHeaders()
    });
    return response.data;
  }

  async getImportJob(jobId: string): Promise<ImportJob> {
    const response = await axios.get(`${API_BASE_URL}/external-systems/import/jobs/${jobId}`, {
      headers: this.getAuthHeaders()
    });
    return response.data;
  }

  async getExportJob(jobId: string): Promise<ExportJob> {
    const response = await axios.get(`${API_BASE_URL}/external-systems/export/jobs/${jobId}`, {
      headers: this.getAuthHeaders()
    });
    return response.data;
  }

  // Configuration Management
  async createConfig(config: Omit<ExternalSystemConfig, 'id' | 'metadata' | 'status'>): Promise<{ configId: string }> {
    const response = await axios.post(`${API_BASE_URL}/external-systems/config`, config, {
      headers: this.getAuthHeaders()
    });
    return response.data;
  }

  async getConfigs(type?: string, category?: string): Promise<ExternalSystemConfig[]> {
    const params = new URLSearchParams();
    if (type) params.append('type', type);
    if (category) params.append('category', category);
    
    const response = await axios.get(`${API_BASE_URL}/external-systems/config?${params.toString()}`, {
      headers: this.getAuthHeaders()
    });
    return response.data;
  }

  async getConfigTemplates(): Promise<ConfigTemplate[]> {
    const response = await axios.get(`${API_BASE_URL}/external-systems/config/templates`, {
      headers: this.getAuthHeaders()
    });
    return response.data;
  }

  async getConfig(configId: string): Promise<ExternalSystemConfig> {
    const response = await axios.get(`${API_BASE_URL}/external-systems/config/${configId}`, {
      headers: this.getAuthHeaders()
    });
    return response.data;
  }

  async updateConfig(configId: string, updates: Partial<ExternalSystemConfig>): Promise<void> {
    await axios.put(`${API_BASE_URL}/external-systems/config/${configId}`, updates, {
      headers: this.getAuthHeaders()
    });
  }

  async deleteConfig(configId: string): Promise<void> {
    await axios.delete(`${API_BASE_URL}/external-systems/config/${configId}`, {
      headers: this.getAuthHeaders()
    });
  }

  // Health and Monitoring
  async getSystemHealth(): Promise<ConnectionHealth> {
    const response = await axios.get(`${API_BASE_URL}/external-systems/health`, {
      headers: this.getAuthHeaders()
    });
    return response.data;
  }

  async getConnectionMetrics(connectionId: string): Promise<ConnectionMetrics> {
    const response = await axios.get(`${API_BASE_URL}/external-systems/metrics/${connectionId}`, {
      headers: this.getAuthHeaders()
    });
    return response.data;
  }

  // API Request Execution
  async executeApiRequest(request: {
    connectionId: string;
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
    endpoint: string;
    data?: any;
    headers?: Record<string, string>;
    timeout?: number;
  }): Promise<ApiResponse> {
    const response = await axios.post(`${API_BASE_URL}/external-systems/api/request`, request, {
      headers: this.getAuthHeaders()
    });
    return response.data;
  }
}

export const externalSystemService = new ExternalSystemService();