// AI Agent Framework Types

export type AgentType = 'AWS_PRIVACY' | 'AICRA' | 'GOOGLE_AI' | 'AZURE_AI';

export type AgentStatus = 'active' | 'inactive' | 'error' | 'initializing' | 'updating';

export type AgentCapability = 
  | 'privacy_compliance_analysis'
  | 'risk_assessment'
  | 'data_classification'
  | 'breach_detection'
  | 'policy_generation'
  | 'audit_trail_analysis'
  | 'vendor_assessment'
  | 'training_content_generation'
  | 'regulatory_monitoring'
  | 'incident_response'
  | 'data_anonymization'
  | 'consent_management';

export interface AIAgent {
  id: string;
  name: string;
  type: AgentType;
  version: string;
  status: AgentStatus;
  capabilities: AgentCapability[];
  configuration: AgentConfig;
  metrics: AgentMetrics;
  metadata: AgentMetadata;
  createdAt: Date;
  updatedAt: Date;
  lastActiveAt?: Date;
}

export interface AgentConfig {
  enabled: boolean;
  priority: number; // 1-10, higher = more priority
  maxConcurrentTasks: number;
  timeout: number; // in milliseconds
  retryAttempts: number;
  settings: Record<string, any>;
  credentials?: AgentCredentials;
  endpoints?: AgentEndpoints;
}

export interface AgentCredentials {
  type: 'api_key' | 'oauth' | 'service_account' | 'iam_role';
  encrypted: boolean;
  credentialId: string;
  expiresAt?: Date;
}

export interface AgentEndpoints {
  primary: string;
  fallback?: string[];
  healthCheck: string;
  webhook?: string;
}

export interface AgentMetrics {
  tasksCompleted: number;
  tasksInProgress: number;
  tasksFailed: number;
  averageResponseTime: number; // in milliseconds
  successRate: number; // percentage
  lastTaskCompletedAt?: Date;
  uptime: number; // percentage
  errorRate: number; // percentage
}

export interface AgentMetadata {
  description: string;
  vendor: string;
  documentation: string;
  supportContact: string;
  tags: string[];
  category: 'compliance' | 'security' | 'analytics' | 'automation';
}

// Agent Task Management
export interface AgentTask {
  id: string;
  agentId: string;
  type: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  input: Record<string, any>;
  output?: Record<string, any>;
  error?: AgentError;
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  estimatedDuration?: number;
  actualDuration?: number;
  retryCount: number;
  parentTaskId?: string;
  childTaskIds?: string[];
}

export interface AgentError {
  code: string;
  message: string;
  details?: Record<string, any>;
  timestamp: Date;
  recoverable: boolean;
}

// Agent Communication
export interface AgentEvent {
  id: string;
  type: 'task_created' | 'task_completed' | 'task_failed' | 'agent_status_changed' | 'collaboration_request';
  agentId: string;
  payload: Record<string, any>;
  timestamp: Date;
  correlationId?: string;
}

export interface AgentMessage {
  id: string;
  fromAgentId: string;
  toAgentId: string;
  type: 'request' | 'response' | 'notification' | 'collaboration';
  payload: Record<string, any>;
  timestamp: Date;
  correlationId?: string;
  priority: 'low' | 'medium' | 'high';
}

// Agent Registry
export interface AgentRegistryEntry {
  agentId: string;
  type: AgentType;
  version: string;
  status: AgentStatus;
  capabilities: AgentCapability[];
  registeredAt: Date;
  lastHeartbeat: Date;
  healthStatus: 'healthy' | 'degraded' | 'unhealthy';
}

// Agent Lifecycle
export interface AgentLifecycleEvent {
  agentId: string;
  event: 'install' | 'start' | 'stop' | 'update' | 'uninstall' | 'configure';
  status: 'success' | 'failure' | 'in_progress';
  timestamp: Date;
  details?: Record<string, any>;
  performedBy: string;
}

// Agent Collaboration
export interface AgentCollaboration {
  id: string;
  name: string;
  description: string;
  participantAgents: string[];
  coordinatorAgentId: string;
  workflow: CollaborationWorkflow;
  status: 'active' | 'paused' | 'completed' | 'failed';
  createdAt: Date;
  completedAt?: Date;
  results?: Record<string, any>;
}

export interface CollaborationWorkflow {
  steps: CollaborationStep[];
  dependencies: WorkflowDependency[];
  timeout: number;
  retryPolicy: RetryPolicy;
}

export interface CollaborationStep {
  id: string;
  agentId: string;
  taskType: string;
  input: Record<string, any>;
  expectedOutput: string[];
  timeout: number;
  order: number;
}

export interface WorkflowDependency {
  stepId: string;
  dependsOn: string[];
  condition?: string;
}

export interface RetryPolicy {
  maxAttempts: number;
  backoffStrategy: 'linear' | 'exponential' | 'fixed';
  baseDelay: number;
  maxDelay: number;
}

// Agent Marketplace
export interface AgentMarketplaceEntry {
  id: string;
  name: string;
  type: AgentType;
  version: string;
  description: string;
  vendor: string;
  category: string;
  capabilities: AgentCapability[];
  pricing: AgentPricing;
  ratings: AgentRatings;
  documentation: string;
  screenshots: string[];
  requirements: AgentRequirements;
  compatibility: string[];
  installationPackage: string;
  verified: boolean;
  featured: boolean;
  publishedAt: Date;
  updatedAt: Date;
}

export interface AgentPricing {
  model: 'free' | 'subscription' | 'usage_based' | 'one_time';
  price?: number;
  currency?: string;
  billingPeriod?: 'monthly' | 'annual';
  usageTiers?: UsageTier[];
  trialPeriod?: number; // days
}

export interface UsageTier {
  name: string;
  minUsage: number;
  maxUsage: number;
  pricePerUnit: number;
}

export interface AgentRatings {
  average: number;
  totalReviews: number;
  distribution: Record<number, number>; // rating -> count
}

export interface AgentRequirements {
  minVersion: string;
  dependencies: string[];
  permissions: string[];
  resources: {
    cpu?: string;
    memory?: string;
    storage?: string;
  };
}

// Agent Analytics
export interface AgentAnalytics {
  agentId: string;
  period: {
    startDate: Date;
    endDate: Date;
  };
  metrics: {
    totalTasks: number;
    successfulTasks: number;
    failedTasks: number;
    averageResponseTime: number;
    peakUsage: Date;
    resourceUtilization: ResourceUtilization;
  };
  trends: AnalyticsTrend[];
  insights: string[];
}

export interface ResourceUtilization {
  cpu: number; // percentage
  memory: number; // percentage
  network: number; // bytes
  storage: number; // bytes
}

export interface AnalyticsTrend {
  metric: string;
  values: { timestamp: Date; value: number }[];
  trend: 'increasing' | 'decreasing' | 'stable';
  changeRate: number;
}

// Agent Security
export interface AgentSecurityPolicy {
  agentId: string;
  permissions: AgentPermission[];
  dataAccess: DataAccessPolicy[];
  networkAccess: NetworkAccessPolicy;
  auditLevel: 'minimal' | 'standard' | 'comprehensive';
  encryptionRequired: boolean;
  isolationLevel: 'none' | 'process' | 'container' | 'vm';
}

export interface AgentPermission {
  resource: string;
  actions: string[];
  conditions?: Record<string, any>;
}

export interface DataAccessPolicy {
  dataType: string;
  accessLevel: 'read' | 'write' | 'delete';
  restrictions: string[];
}

export interface NetworkAccessPolicy {
  allowedDomains: string[];
  blockedDomains: string[];
  allowedPorts: number[];
  requiresApproval: boolean;
}