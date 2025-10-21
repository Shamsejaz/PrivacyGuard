export interface Vendor {
  id: string;
  name: string;
  contactEmail: string;
  contactPhone?: string;
  website?: string;
  address?: string;
  industry: string;
  size: 'small' | 'medium' | 'large' | 'enterprise';
  status: 'active' | 'inactive' | 'pending' | 'suspended';
  onboardingDate: Date;
  lastAssessmentDate?: Date;
  nextAssessmentDate?: Date;
  riskScore: number;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  complianceStatus: 'compliant' | 'partial' | 'non_compliant' | 'pending';
  certifications: VendorCertification[];
  dataProcessingAgreements: DataProcessingAgreement[];
  assessments: VendorAssessment[];
  createdAt: Date;
  updatedAt: Date;
}

export interface VendorAssessment {
  id: string;
  vendorId: string;
  assessmentType: 'initial' | 'annual' | 'ad_hoc' | 'incident_driven';
  status: 'draft' | 'in_progress' | 'completed' | 'approved' | 'rejected';
  questionnaire: AssessmentQuestionnaire;
  responses: AssessmentResponse[];
  riskScore: number;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  findings: AssessmentFinding[];
  recommendations: string[];
  assessorId: string;
  assessorName: string;
  startDate: Date;
  completionDate?: Date;
  approvalDate?: Date;
  nextReviewDate?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface AssessmentQuestionnaire {
  id: string;
  name: string;
  version: string;
  categories: QuestionnaireCategory[];
  totalQuestions: number;
  maxScore: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface QuestionnaireCategory {
  id: string;
  name: string;
  description: string;
  weight: number;
  questions: AssessmentQuestion[];
}

export interface AssessmentQuestion {
  id: string;
  categoryId: string;
  question: string;
  description?: string;
  type: 'multiple_choice' | 'yes_no' | 'text' | 'numeric' | 'file_upload';
  required: boolean;
  weight: number;
  options?: string[];
  riskImpact: 'low' | 'medium' | 'high' | 'critical';
}

export interface AssessmentResponse {
  questionId: string;
  response: string | number | boolean | string[];
  score: number;
  evidence?: Evidence[];
  comments?: string;
  respondedAt: Date;
  respondedBy: string;
}

export interface AssessmentFinding {
  id: string;
  category: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  recommendation: string;
  status: 'open' | 'in_progress' | 'resolved' | 'accepted_risk';
  assignedTo?: string;
  dueDate?: Date;
  resolvedDate?: Date;
  evidence?: Evidence[];
}

export interface VendorCertification {
  id: string;
  vendorId: string;
  name: string;
  type: 'ISO27001' | 'SOC2' | 'GDPR' | 'HIPAA' | 'PCI_DSS' | 'other';
  issuingBody: string;
  issueDate: Date;
  expiryDate: Date;
  status: 'valid' | 'expired' | 'suspended' | 'revoked';
  certificateNumber?: string;
  documentUrl?: string;
  verificationStatus: 'verified' | 'pending' | 'failed';
  verificationDate?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface DataProcessingAgreement {
  id: string;
  vendorId: string;
  title: string;
  type: 'DPA' | 'BAA' | 'MSA' | 'SLA' | 'other';
  status: 'draft' | 'under_review' | 'active' | 'expired' | 'terminated';
  signedDate?: Date;
  effectiveDate: Date;
  expiryDate?: Date;
  autoRenewal: boolean;
  renewalPeriod?: number; // in months
  dataCategories: string[];
  processingPurposes: string[];
  dataSubjects: string[];
  retentionPeriod?: string;
  dataLocation: string[];
  subProcessors: SubProcessor[];
  securityMeasures: string[];
  breachNotificationTime: number; // in hours
  auditRights: boolean;
  terminationRights: string[];
  documentUrl?: string;
  version: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface SubProcessor {
  id: string;
  name: string;
  location: string;
  services: string[];
  approvalDate: Date;
  status: 'approved' | 'pending' | 'rejected';
}

export interface VendorRiskMetrics {
  totalVendors: number;
  activeVendors: number;
  highRiskVendors: number;
  overdueDPAs: number;
  expiredCertifications: number;
  pendingAssessments: number;
  averageRiskScore: number;
  complianceRate: number;
  riskDistribution: {
    low: number;
    medium: number;
    high: number;
    critical: number;
  };
  industryBreakdown: Record<string, number>;
  monthlyTrends: {
    month: string;
    newVendors: number;
    assessmentsCompleted: number;
    riskScoreAverage: number;
  }[];
}

export interface VendorCommunication {
  id: string;
  vendorId: string;
  type: 'email' | 'portal_message' | 'document_request' | 'assessment_reminder';
  subject: string;
  message: string;
  status: 'sent' | 'delivered' | 'read' | 'responded';
  sentBy: string;
  sentAt: Date;
  readAt?: Date;
  responseAt?: Date;
  attachments?: Evidence[];
}

export interface Evidence {
  id: string;
  name: string;
  type: string;
  size: number;
  url: string;
  uploadedBy: string;
  uploadedAt: Date;
  description?: string;
}

export interface VendorPortalAccess {
  id: string;
  vendorId: string;
  email: string;
  role: 'admin' | 'user' | 'viewer';
  status: 'active' | 'inactive' | 'pending';
  lastLogin?: Date;
  invitedBy: string;
  invitedAt: Date;
  activatedAt?: Date;
  permissions: string[];
}

export interface RiskScoringRule {
  id: string;
  name: string;
  description: string;
  category: string;
  condition: string;
  riskImpact: number;
  weight: number;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface VendorFilter {
  search?: string;
  status?: string[];
  riskLevel?: string[];
  industry?: string[];
  complianceStatus?: string[];
  assessmentOverdue?: boolean;
  dpaExpiring?: boolean;
  certificationExpiring?: boolean;
  dateRange?: {
    start: Date;
    end: Date;
  };
}

export interface VendorSortOption {
  field: 'name' | 'riskScore' | 'lastAssessmentDate' | 'nextAssessmentDate' | 'onboardingDate';
  direction: 'asc' | 'desc';
}