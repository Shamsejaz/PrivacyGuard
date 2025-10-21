

export interface RiskAssessment {
  id: string;
  name: string;
  description: string;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  impactScore: number; // 1-5 scale
  likelihoodScore: number; // 1-5 scale
  overallScore: number; // Calculated score
  status: 'active' | 'inactive' | 'completed';
  category: string;
  dataTypes: string[];
  mitigationMeasures: RiskMitigationMeasure[];
  ownerId: string; // User ID of the owner
  reviewDate: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface RiskMitigationMeasure {
  id: string;
  description: string;
  status: 'planned' | 'in_progress' | 'completed' | 'not_started';
  priority: 'low' | 'medium' | 'high';
  assignedTo?: string; // User ID
}

export interface CreateRiskAssessmentRequest {
  name: string;
  description: string;
  impactScore: number; // 1-5 scale
  likelihoodScore: number; // 1-5 scale
  category: string;
  dataTypes: string[];
  mitigationMeasures?: Omit<RiskMitigationMeasure, 'id'>[];
  ownerId: string;
  reviewDate: Date;
}

export interface UpdateRiskAssessmentRequest {
  name?: string;
  description?: string;
  impactScore?: number;
  likelihoodScore?: number;
  status?: 'active' | 'inactive' | 'completed';
  category?: string;
  dataTypes?: string[];
  mitigationMeasures?: RiskMitigationMeasure[];
  ownerId?: string;
  reviewDate?: Date;
}

export interface ComplianceFinding {
  id: string;
  title: string;
  description: string;
  regulation: string; // e.g., GDPR, CCPA, HIPAA
  severity: 'low' | 'medium' | 'high' | 'critical';
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  category: string;
  affectedSystems: string[];
  remediationSteps: RemediationStep[];
  assignedTo?: string; // User ID
  dueDate: Date;
  resolvedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface RemediationStep {
  id: string;
  description: string;
  status: 'planned' | 'in_progress' | 'completed' | 'not_started';
  priority: 'low' | 'medium' | 'high';
  assignedTo?: string; // User ID
  dueDate?: Date;
}

export interface CreateComplianceFindingRequest {
  title: string;
  description: string;
  regulation: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  category: string;
  affectedSystems: string[];
  remediationSteps?: Omit<RemediationStep, 'id'>[];
  assignedTo?: string;
  dueDate: Date;
}

export interface UpdateComplianceFindingRequest {
  title?: string;
  description?: string;
  severity?: 'low' | 'medium' | 'high' | 'critical';
  status?: 'open' | 'in_progress' | 'resolved' | 'closed';
  category?: string;
  affectedSystems?: string[];
  remediationSteps?: RemediationStep[];
  assignedTo?: string;
  dueDate?: Date;
}

export interface RiskFilters {
  category?: string;
  riskLevel?: string | string[];
  status?: string | string[];
  ownerId?: string;
  dateFrom?: Date;
  dateTo?: Date;
  search?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface ComplianceFilters {
  category?: string;
  severity?: string | string[];
  status?: string | string[];
  regulation?: string | string[];
  assignedTo?: string;
  dateFrom?: Date;
  dateTo?: Date;
  search?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface RiskMetrics {
  totalAssessments: number;
  criticalRisks: number;
  highRisks: number;
  mediumRisks: number;
  lowRisks: number;
  averageScore: number;
  trendsData: RiskTrend[];
  complianceFindings: {
    total: number;
    open: number;
    critical: number;
    overdue: number;
  };
}

export interface RiskTrend {
  date: Date;
  criticalCount: number;
  highCount: number;
  mediumCount: number;
  lowCount: number;
  averageScore: number;
}

export interface RiskAlert {
  id: string;
  type: string; // e.g., 'new_critical_risk', 'compliance_gap', 'overdue_review'
  title: string;
  message: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  resourceId: string;
  resourceType: 'risk_assessment' | 'compliance_finding';
  acknowledged: boolean;
  createdAt: Date;
}