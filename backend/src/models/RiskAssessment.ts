export interface RiskAssessment {
  id: string;
  name: string;
  description?: string;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  impactScore: number; // 1-5
  likelihoodScore: number; // 1-5
  overallScore: number;
  status: 'active' | 'mitigated' | 'accepted' | 'transferred';
  category?: string;
  dataTypes: string[];
  mitigationMeasures: MitigationMeasure[];
  ownerId?: string;
  reviewDate?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface MitigationMeasure {
  id: string;
  description: string;
  status: 'planned' | 'in_progress' | 'completed' | 'not_applicable';
  dueDate?: Date;
  assignedTo?: string;
  priority: 'low' | 'medium' | 'high';
}

export interface ComplianceFinding {
  id: string;
  title: string;
  description?: string;
  regulation: 'GDPR' | 'CCPA' | 'HIPAA' | 'PDPL' | 'Other';
  severity: 'low' | 'medium' | 'high' | 'critical';
  status: 'open' | 'in_progress' | 'resolved' | 'accepted';
  category?: string;
  affectedSystems: string[];
  remediationSteps: RemediationStep[];
  assignedTo?: string;
  dueDate?: Date;
  resolvedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface RemediationStep {
  id: string;
  description: string;
  status: 'pending' | 'in_progress' | 'completed';
  dueDate?: Date;
  assignedTo?: string;
  priority: 'low' | 'medium' | 'high';
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
  type: 'threshold_exceeded' | 'overdue_review' | 'new_critical_risk' | 'compliance_gap';
  title: string;
  message: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  resourceId?: string;
  resourceType?: 'risk_assessment' | 'compliance_finding';
  acknowledged: boolean;
  createdAt: Date;
}

export interface CreateRiskAssessmentRequest {
  name: string;
  description?: string;
  impactScore: number;
  likelihoodScore: number;
  category?: string;
  dataTypes: string[];
  mitigationMeasures?: Omit<MitigationMeasure, 'id'>[];
  ownerId?: string;
  reviewDate?: Date;
}

export interface UpdateRiskAssessmentRequest {
  name?: string;
  description?: string;
  impactScore?: number;
  likelihoodScore?: number;
  status?: 'active' | 'mitigated' | 'accepted' | 'transferred';
  category?: string;
  dataTypes?: string[];
  mitigationMeasures?: MitigationMeasure[];
  ownerId?: string;
  reviewDate?: Date;
}

export interface CreateComplianceFindingRequest {
  title: string;
  description?: string;
  regulation: 'GDPR' | 'CCPA' | 'HIPAA' | 'PDPL' | 'Other';
  severity: 'low' | 'medium' | 'high' | 'critical';
  category?: string;
  affectedSystems: string[];
  remediationSteps?: Omit<RemediationStep, 'id'>[];
  assignedTo?: string;
  dueDate?: Date;
}

export interface RiskFilters {
  riskLevel?: string[];
  status?: string[];
  category?: string;
  ownerId?: string;
  reviewDateFrom?: Date;
  reviewDateTo?: Date;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface ComplianceFilters {
  regulation?: string[];
  severity?: string[];
  status?: string[];
  category?: string;
  assignedTo?: string;
  dueDateFrom?: Date;
  dueDateTo?: Date;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}
