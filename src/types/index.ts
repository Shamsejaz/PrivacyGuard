export interface User {
  id: string;
  name: string;
  email: string;
  role: 'dpo' | 'compliance' | 'admin' | 'legal' | 'business';
  department: string;
  lastLogin: Date;
  permissions: string[];
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