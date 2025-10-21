export interface DataBreach {
  id: string;
  title: string;
  description: string;
  detectedAt: Date;
  reportedAt?: Date;
  status: BreachStatus;
  severity: BreachSeverity;
  classification: BreachClassification;
  affectedDataTypes: DataType[];
  affectedRecords: number;
  affectedDataSubjects: DataSubjectCategory[];
  detectionMethod: DetectionMethod;
  rootCause?: string;
  containmentActions: ContainmentAction[];
  notificationRequirements: NotificationRequirement[];
  regulatoryNotifications: RegulatoryNotification[];
  dataSubjectNotifications: DataSubjectNotification[];
  timeline: BreachTimelineEvent[];
  evidence: BreachEvidence[];
  remediationActions: RemediationAction[];
  riskAssessment: BreachRiskAssessment;
  postIncidentAnalysis?: PostIncidentAnalysis;
  assignedTo: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export type BreachStatus = 
  | 'detected'
  | 'investigating'
  | 'contained'
  | 'notifying_authorities'
  | 'notifying_subjects'
  | 'remediation'
  | 'closed'
  | 'false_positive';

export type BreachSeverity = 'low' | 'medium' | 'high' | 'critical';

export type BreachClassification = 
  | 'confidentiality'
  | 'integrity'
  | 'availability'
  | 'combined';

export type DataType = 
  | 'personal_data'
  | 'sensitive_personal_data'
  | 'financial_data'
  | 'health_data'
  | 'biometric_data'
  | 'location_data'
  | 'communication_data'
  | 'other';

export type DataSubjectCategory = 
  | 'employees'
  | 'customers'
  | 'prospects'
  | 'suppliers'
  | 'patients'
  | 'students'
  | 'minors'
  | 'other';

export type DetectionMethod = 
  | 'automated_monitoring'
  | 'employee_report'
  | 'customer_report'
  | 'third_party_report'
  | 'audit_discovery'
  | 'regulatory_inquiry'
  | 'media_report'
  | 'other';

export interface ContainmentAction {
  id: string;
  action: string;
  description: string;
  assignedTo: string;
  status: 'pending' | 'in_progress' | 'completed';
  dueDate: Date;
  completedAt?: Date;
  evidence?: string[];
}

export interface NotificationRequirement {
  id: string;
  type: 'regulatory' | 'data_subject' | 'internal' | 'third_party';
  recipient: string;
  jurisdiction: string;
  deadline: Date;
  template: string;
  status: 'pending' | 'sent' | 'acknowledged' | 'overdue';
  sentAt?: Date;
  acknowledgedAt?: Date;
}

export interface RegulatoryNotification {
  id: string;
  authority: string;
  jurisdiction: string;
  regulatoryFramework: 'GDPR' | 'CCPA' | 'HIPAA' | 'PDPL' | 'other';
  notificationDeadline: Date;
  template: string;
  status: 'draft' | 'pending_approval' | 'sent' | 'acknowledged';
  sentAt?: Date;
  acknowledgedAt?: Date;
  referenceNumber?: string;
  followUpRequired: boolean;
  followUpDate?: Date;
}

export interface DataSubjectNotification {
  id: string;
  notificationMethod: 'email' | 'postal' | 'website' | 'media' | 'direct';
  template: string;
  recipientCount: number;
  status: 'draft' | 'pending_approval' | 'sending' | 'sent' | 'failed';
  scheduledAt?: Date;
  sentAt?: Date;
  deliveryRate?: number;
  responseRate?: number;
}

export interface BreachTimelineEvent {
  id: string;
  timestamp: Date;
  event: string;
  description: string;
  category: 'detection' | 'investigation' | 'containment' | 'notification' | 'remediation';
  performedBy: string;
  evidence?: string[];
  impact?: string;
}

export interface BreachEvidence {
  id: string;
  type: 'document' | 'screenshot' | 'log_file' | 'forensic_image' | 'witness_statement' | 'other';
  name: string;
  description: string;
  filePath?: string;
  hash?: string;
  collectedBy: string;
  collectedAt: Date;
  chainOfCustody: ChainOfCustodyEntry[];
}

export interface ChainOfCustodyEntry {
  id: string;
  action: 'collected' | 'transferred' | 'analyzed' | 'stored' | 'accessed';
  performedBy: string;
  timestamp: Date;
  location: string;
  notes?: string;
}

export interface RemediationAction {
  id: string;
  title: string;
  description: string;
  category: 'technical' | 'organizational' | 'legal' | 'communication';
  priority: 'low' | 'medium' | 'high' | 'critical';
  assignedTo: string;
  status: 'planned' | 'in_progress' | 'completed' | 'cancelled';
  dueDate: Date;
  completedAt?: Date;
  effectiveness?: 'low' | 'medium' | 'high';
  cost?: number;
  evidence?: string[];
}

export interface BreachRiskAssessment {
  id: string;
  overallRisk: 'low' | 'medium' | 'high' | 'critical';
  likelihoodOfHarm: 'low' | 'medium' | 'high';
  severityOfHarm: 'low' | 'medium' | 'high';
  riskFactors: RiskFactor[];
  mitigatingFactors: string[];
  aggravatingFactors: string[];
  regulatoryRisk: 'low' | 'medium' | 'high';
  reputationalRisk: 'low' | 'medium' | 'high';
  financialRisk: 'low' | 'medium' | 'high';
  assessedBy: string;
  assessedAt: Date;
  reviewedBy?: string;
  reviewedAt?: Date;
}

export interface RiskFactor {
  factor: string;
  impact: 'low' | 'medium' | 'high';
  likelihood: 'low' | 'medium' | 'high';
  description: string;
}

export interface PostIncidentAnalysis {
  id: string;
  rootCauseAnalysis: RootCauseAnalysis;
  lessonsLearned: LessonLearned[];
  preventionRecommendations: PreventionRecommendation[];
  processImprovements: ProcessImprovement[];
  trainingNeeds: TrainingNeed[];
  policyUpdates: PolicyUpdate[];
  completedBy: string;
  completedAt: Date;
  reviewedBy?: string;
  reviewedAt?: Date;
  approved: boolean;
  approvedBy?: string;
  approvedAt?: Date;
}

export interface RootCauseAnalysis {
  primaryCause: string;
  contributingFactors: string[];
  methodology: '5_whys' | 'fishbone' | 'fault_tree' | 'other';
  analysis: string;
  evidence: string[];
  preventability: 'preventable' | 'partially_preventable' | 'not_preventable';
}

export interface LessonLearned {
  id: string;
  category: 'technical' | 'process' | 'training' | 'communication' | 'governance';
  lesson: string;
  description: string;
  applicability: 'organization_wide' | 'department_specific' | 'role_specific';
  priority: 'low' | 'medium' | 'high';
}

export interface PreventionRecommendation {
  id: string;
  title: string;
  description: string;
  category: 'technical_controls' | 'administrative_controls' | 'physical_controls' | 'training';
  priority: 'low' | 'medium' | 'high' | 'critical';
  estimatedCost: number;
  estimatedEffort: string;
  timeline: string;
  assignedTo?: string;
  status: 'proposed' | 'approved' | 'in_progress' | 'completed' | 'rejected';
  implementationDate?: Date;
  effectiveness?: 'low' | 'medium' | 'high';
}

export interface ProcessImprovement {
  id: string;
  process: string;
  currentState: string;
  proposedState: string;
  benefits: string[];
  risks: string[];
  effort: 'low' | 'medium' | 'high';
  priority: 'low' | 'medium' | 'high';
  owner: string;
  status: 'proposed' | 'approved' | 'in_progress' | 'completed';
}

export interface TrainingNeed {
  id: string;
  audience: string;
  topic: string;
  description: string;
  urgency: 'low' | 'medium' | 'high';
  deliveryMethod: 'online' | 'classroom' | 'workshop' | 'simulation';
  estimatedDuration: string;
  frequency: 'one_time' | 'annual' | 'quarterly' | 'monthly';
  status: 'identified' | 'planned' | 'in_progress' | 'completed';
}

export interface PolicyUpdate {
  id: string;
  policy: string;
  currentVersion: string;
  proposedChanges: string;
  rationale: string;
  impact: 'low' | 'medium' | 'high';
  urgency: 'low' | 'medium' | 'high';
  owner: string;
  status: 'proposed' | 'under_review' | 'approved' | 'implemented';
  targetDate?: Date;
}

export interface BreachDetectionRule {
  id: string;
  name: string;
  description: string;
  category: 'data_access' | 'data_export' | 'system_intrusion' | 'data_modification' | 'other';
  conditions: DetectionCondition[];
  severity: BreachSeverity;
  enabled: boolean;
  createdBy: string;
  createdAt: Date;
  lastTriggered?: Date;
  triggerCount: number;
}

export interface DetectionCondition {
  field: string;
  operator: 'equals' | 'contains' | 'greater_than' | 'less_than' | 'regex';
  value: string;
  logicalOperator?: 'AND' | 'OR';
}

export interface BreachNotificationTemplate {
  id: string;
  name: string;
  type: 'regulatory' | 'data_subject' | 'internal' | 'media';
  jurisdiction: string;
  regulatoryFramework?: 'GDPR' | 'CCPA' | 'HIPAA' | 'PDPL' | 'other';
  language: string;
  subject: string;
  content: string;
  requiredFields: string[];
  approvalRequired: boolean;
  createdBy: string;
  createdAt: Date;
  lastUsed?: Date;
  usageCount: number;
}

export interface BreachWorkflow {
  id: string;
  name: string;
  description: string;
  triggerConditions: WorkflowTrigger[];
  steps: WorkflowStep[];
  enabled: boolean;
  createdBy: string;
  createdAt: Date;
  lastExecuted?: Date;
  executionCount: number;
}

export interface WorkflowTrigger {
  type: 'breach_detected' | 'severity_change' | 'time_elapsed' | 'manual';
  conditions: any;
}

export interface WorkflowStep {
  id: string;
  order: number;
  type: 'notification' | 'assignment' | 'approval' | 'escalation' | 'automation';
  configuration: any;
  conditions?: any;
}

export interface BreachDashboardMetrics {
  totalBreaches: number;
  activeBreaches: number;
  breachesByStatus: Record<BreachStatus, number>;
  breachesBySeverity: Record<BreachSeverity, number>;
  averageDetectionTime: number;
  averageContainmentTime: number;
  averageResolutionTime: number;
  complianceRate: number;
  overdueNotifications: number;
  trendsData: BreachTrend[];
}

export interface BreachTrend {
  period: string;
  breachCount: number;
  averageSeverity: number;
  detectionTime: number;
  containmentTime: number;
  resolutionTime: number;
}