export interface User {
  id: string;
  name: string;
  email: string;
  role: 'dpo' | 'compliance' | 'admin' | 'legal' | 'business';
  department: string;
  lastLogin: Date;
  permissions: Permission[];
  tenantId?: string;
  mfaEnabled: boolean;
  authProvider: AuthProvider;
  sessionId?: string;
  sessionExpiry?: Date;
}

export interface Permission {
  id: string;
  name: string;
  resource: string;
  action: 'create' | 'read' | 'update' | 'delete' | 'execute';
  conditions?: Record<string, any>;
}

export interface AuthProvider {
  type: 'local' | 'active_directory' | 'ldap' | 'saml' | 'oauth';
  name: string;
  config: AuthProviderConfig;
}

export interface AuthProviderConfig {
  // Active Directory / LDAP
  serverUrl?: string;
  baseDN?: string;
  bindDN?: string;
  bindPassword?: string;
  userSearchBase?: string;
  groupSearchBase?: string;
  
  // SAML
  entityId?: string;
  ssoUrl?: string;
  x509Certificate?: string;
  
  // OAuth
  clientId?: string;
  clientSecret?: string;
  authorizationUrl?: string;
  tokenUrl?: string;
  userInfoUrl?: string;
  scope?: string[];
}

export interface MFAMethod {
  type: 'totp' | 'sms' | 'email' | 'hardware_token';
  enabled: boolean;
  verified: boolean;
  secret?: string;
  phoneNumber?: string;
  email?: string;
  deviceId?: string;
}

export interface Session {
  id: string;
  userId: string;
  deviceInfo: string;
  ipAddress: string;
  userAgent: string;
  createdAt: Date;
  lastActivity: Date;
  expiresAt: Date;
  isActive: boolean;
}

export interface RiskScore {
  overall: number;
  gdpr: number;
  ccpa: number;
  hipaa: number;
  pdpl: number;
  trend: 'up' | 'down' | 'stable';
  lastUpdated: Date;
}

export interface DataSource {
  id: string;
  name: string;
  type: 'database' | 'file_system' | 'cloud_storage' | 'saas';
  status: 'active' | 'inactive' | 'error';
  recordCount: number;
  piiCount: number;
  lastScan: Date;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
}

export interface DSARRequest {
  id: string;
  dataSubject: string;
  email: string;
  requestType: 'access' | 'delete' | 'portability' | 'rectification';
  status: 'pending' | 'processing' | 'completed' | 'rejected';
  submittedDate: Date;
  deadline: Date;
  assignedTo: string;
  progress: number;
}

export interface Vendor {
  id: string;
  name: string;
  category: string;
  riskScore: number;
  status: 'active' | 'under_review' | 'suspended';
  lastAssessment: Date;
  contractExpiry: Date;
  dataProcessed: string[];
}

export interface PolicyDocument {
  id: string;
  title: string;
  type: 'privacy_policy' | 'cookie_policy' | 'terms_of_service' | 'dpa';
  status: 'draft' | 'review' | 'approved' | 'published';
  lastModified: Date;
  author: string;
  version: string;
  languages: string[];
}

export interface ComplianceTask {
  id: string;
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: 'pending' | 'in_progress' | 'completed' | 'overdue';
  assignedTo: string;
  dueDate: Date;
  regulation: string;
  category: string;
}

export interface SecurityIncident {
  id: string;
  title: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  status: 'open' | 'investigating' | 'contained' | 'resolved';
  reportedDate: Date;
  affectedRecords: number;
  dataTypes: string[];
  reportedBy: string;
}

// Multi-Tenant Types
export interface Tenant {
  id: string;
  name: string;
  domain: string;
  subscription: SubscriptionTier;
  complianceFrameworks: ComplianceFramework[];
  dataResidency: DataResidencyRegion;
  customization: TenantCustomization;
  status: 'active' | 'suspended' | 'trial' | 'inactive';
  createdAt: Date;
  updatedAt: Date;
  settings: TenantSettings;
}

export interface SubscriptionTier {
  id: string;
  name: 'starter' | 'professional' | 'enterprise' | 'custom';
  features: string[];
  limits: {
    users: number;
    dataSources: number;
    storage: number; // in GB
    apiCalls: number;
  };
  price: {
    monthly: number;
    annual: number;
    currency: string;
  };
}

export interface ComplianceFramework {
  id: string;
  name: 'GDPR' | 'PDPL' | 'HIPAA' | 'CCPA' | 'SOX' | 'PCI_DSS';
  version: string;
  enabled: boolean;
  configuration: Record<string, any>;
}

export interface DataResidencyRegion {
  id: string;
  name: string;
  code: string; // e.g., 'EU', 'US', 'APAC'
  dataCenter: string;
  regulations: string[];
}

export interface TenantCustomization {
  branding: {
    logo?: string;
    primaryColor: string;
    secondaryColor: string;
    favicon?: string;
  };
  theme: 'light' | 'dark' | 'auto';
  language: string;
  timezone: string;
  dateFormat: string;
}

export interface TenantSettings {
  security: {
    mfaRequired: boolean;
    sessionTimeout: number; // in minutes
    passwordPolicy: PasswordPolicy;
  };
  notifications: {
    email: boolean;
    sms: boolean;
    inApp: boolean;
  };
  dataRetention: {
    defaultPeriod: number; // in days
    autoDelete: boolean;
  };
  integrations: {
    enabled: string[];
    configurations: Record<string, any>;
  };
}

export interface PasswordPolicy {
  minLength: number;
  requireUppercase: boolean;
  requireLowercase: boolean;
  requireNumbers: boolean;
  requireSpecialChars: boolean;
  expirationDays: number;
}

export interface TenantPermission {
  id: string;
  name: string;
  resource: string;
  action: 'create' | 'read' | 'update' | 'delete' | 'admin';
  scope: 'tenant' | 'global';
}

export interface TenantUser extends User {
  tenantId: string;
  tenantRole: 'owner' | 'admin' | 'user' | 'viewer';
  permissions: TenantPermission[];
  invitedBy?: string;
  invitedAt?: Date;
  lastActiveAt: Date;
}

// Re-export compliance types
export * from './compliance';