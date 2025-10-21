export type ComplianceFramework = 'GDPR' | 'PDPL' | 'HIPAA' | 'CCPA';

export interface ComplianceModule {
  id: ComplianceFramework;
  name: string;
  description: string;
  enabled: boolean;
  sections: ComplianceSection[];
}

export interface ComplianceSection {
  id: string;
  name: string;
  path: string;
  icon: string;
  description: string;
}

export interface ComplianceRequirement {
  id: string;
  article: string;
  title: string;
  description: string;
  category: string;
  priority: 'high' | 'medium' | 'low';
  status: 'compliant' | 'partial' | 'non_compliant' | 'not_applicable';
  evidence: Evidence[];
  gaps: string[];
  assignedTo: string;
  dueDate: Date;
  lastReviewed: Date;
  framework: ComplianceFramework;
}

export interface Evidence {
  id: string;
  type: 'document' | 'policy' | 'procedure' | 'assessment' | 'audit';
  name: string;
  description: string;
  uploadedAt: Date;
  uploadedBy: string;
  url?: string;
  tags?: string[];
}

export interface ComplianceProgress {
  framework: ComplianceFramework;
  totalRequirements: number;
  compliantRequirements: number;
  partialRequirements: number;
  nonCompliantRequirements: number;
  notApplicableRequirements: number;
  overallScore: number;
  lastUpdated: Date;
}

export interface GapAnalysis {
  requirementId: string;
  gap: string;
  impact: 'high' | 'medium' | 'low';
  remediationPlan: string;
  targetDate: Date;
  assignedTo: string;
  status: 'open' | 'in_progress' | 'resolved';
}

export interface ComplianceGap {
  id: string;
  requirementId: string;
  framework: ComplianceFramework;
  title: string;
  description: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  impact: string;
  remediation: string;
  assignedTo: string;
  dueDate: Date;
  status: 'open' | 'in_progress' | 'resolved' | 'accepted_risk';
  createdDate: Date;
  lastUpdated: Date;
}

export interface ComplianceAuditTrail {
  id: string;
  framework: ComplianceFramework;
  requirementId: string;
  action: 'status_change' | 'evidence_added' | 'evidence_removed' | 'assignment_change' | 'gap_created' | 'gap_resolved';
  oldValue?: any;
  newValue?: any;
  performedBy: string;
  timestamp: Date;
  notes?: string;
}

// DPO-specific types
export interface DPODashboardMetrics {
  totalDataProcessingActivities: number;
  activeDataSubjectRequests: number;
  pendingBreachNotifications: number;
  complianceScore: number;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  trendsData: {
    dsarTrend: number; // percentage change
    breachTrend: number;
    complianceTrend: number;
  };
  lastUpdated: Date;
}

export interface DataProcessingActivity {
  id: string;
  name: string;
  purpose: string;
  lawfulBasis: LawfulBasis;
  dataCategories: DataCategory[];
  dataSubjects: DataSubjectCategory[];
  recipients: Recipient[];
  retentionPeriod: RetentionPeriod;
  securityMeasures: SecurityMeasure[];
  status: 'active' | 'inactive' | 'under_review';
  createdDate: Date;
  lastReviewed: Date;
  reviewDueDate: Date;
  assignedDPO: string;
  riskAssessment?: RiskAssessment;
}

export interface LawfulBasis {
  type: 'consent' | 'contract' | 'legal_obligation' | 'vital_interests' | 'public_task' | 'legitimate_interests';
  description: string;
  evidence?: string;
  consentDetails?: {
    consentMechanism: string;
    withdrawalMechanism: string;
    granular: boolean;
  };
}

export interface DataCategory {
  id: string;
  name: string;
  type: 'personal' | 'special_category' | 'criminal';
  sensitivity: 'low' | 'medium' | 'high';
  examples: string[];
}

export interface DataSubjectCategory {
  id: string;
  name: string;
  description: string;
  vulnerabilityLevel: 'standard' | 'vulnerable';
}

export interface Recipient {
  id: string;
  name: string;
  type: 'internal' | 'processor' | 'controller' | 'third_country';
  country?: string;
  adequacyDecision?: boolean;
  safeguards?: string[];
}

export interface RetentionPeriod {
  duration: number;
  unit: 'days' | 'months' | 'years';
  justification: string;
  deletionMethod: 'automatic' | 'manual' | 'anonymization';
  reviewFrequency: 'monthly' | 'quarterly' | 'annually';
}

export interface SecurityMeasure {
  id: string;
  type: 'technical' | 'organizational';
  name: string;
  description: string;
  implemented: boolean;
  implementationDate?: Date;
  responsible: string;
}

export interface RiskAssessment {
  id: string;
  overallRisk: 'low' | 'medium' | 'high' | 'very_high';
  riskFactors: RiskFactor[];
  mitigationMeasures: string[];
  residualRisk: 'low' | 'medium' | 'high' | 'very_high';
  assessmentDate: Date;
  nextReviewDate: Date;
  assessor: string;
}

export interface RiskFactor {
  factor: string;
  impact: 'low' | 'medium' | 'high';
  likelihood: 'low' | 'medium' | 'high';
  description: string;
}

export interface DataLifecycleStage {
  stage: 'collection' | 'processing' | 'storage' | 'sharing' | 'retention' | 'deletion';
  status: 'active' | 'scheduled' | 'completed';
  scheduledDate?: Date;
  completedDate?: Date;
  responsible: string;
  notes?: string;
}

export interface RetentionPolicy {
  id: string;
  name: string;
  description: string;
  dataCategories: string[];
  retentionPeriod: RetentionPeriod;
  triggers: RetentionTrigger[];
  deletionRules: DeletionRule[];
  status: 'active' | 'draft' | 'archived';
  createdDate: Date;
  lastModified: Date;
  approvedBy: string;
}

export interface RetentionTrigger {
  type: 'time_based' | 'event_based' | 'consent_withdrawal';
  condition: string;
  action: 'review' | 'delete' | 'anonymize' | 'archive';
}

export interface DeletionRule {
  id: string;
  name: string;
  criteria: string;
  method: 'hard_delete' | 'soft_delete' | 'anonymization' | 'pseudonymization';
  verification: boolean;
  auditTrail: boolean;
}

export interface ExecutiveReport {
  id: string;
  title: string;
  type: 'monthly' | 'quarterly' | 'annual' | 'ad_hoc';
  period: {
    startDate: Date;
    endDate: Date;
  };
  metrics: ExecutiveMetrics;
  trends: TrendAnalysis[];
  recommendations: string[];
  generatedDate: Date;
  generatedBy: string;
  recipients: string[];
}

export interface ExecutiveMetrics {
  complianceScore: number;
  dataProcessingActivities: number;
  dataSubjectRequests: {
    total: number;
    completed: number;
    pending: number;
    overdue: number;
  };
  breachNotifications: {
    total: number;
    reportedToAuthority: number;
    reportedToSubjects: number;
  };
  riskAssessments: {
    total: number;
    highRisk: number;
    overdue: number;
  };
  trainingCompletion: number;
  vendorAssessments: {
    total: number;
    compliant: number;
    nonCompliant: number;
  };
}

export interface TrendAnalysis {
  metric: string;
  currentValue: number;
  previousValue: number;
  changePercentage: number;
  trend: 'improving' | 'declining' | 'stable';
  analysis: string;
}

export interface ComplianceAlert {
  id: string;
  type: 'deadline' | 'breach' | 'risk' | 'audit' | 'training';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  dueDate?: Date;
  assignedTo: string;
  status: 'open' | 'acknowledged' | 'resolved';
  createdDate: Date;
  resolvedDate?: Date;
}