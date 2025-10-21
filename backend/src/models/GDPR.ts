export interface LawfulBasisRecord {
  id: string;
  processingActivity: string;
  lawfulBasis: string;
  dataCategories: string[];
  purposes: string[];
  dataSubjects: string[];
  retentionPeriod: string;
  status: 'active' | 'inactive' | 'review';
  reviewDate?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface ProcessingRecord {
  id: string;
  activityName: string;
  controller: string;
  processor?: string;
  purposes: string[];
  lawfulBasis: string;
  dataCategories: string[];
  dataSubjects: string[];
  recipients: string[];
  thirdCountryTransfers: boolean;
  retentionPeriod: string;
  technicalMeasures: string[];
  organisationalMeasures: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface DPIA {
  id: string;
  title: string;
  description: string;
  processingType: string;
  riskLevel: 'low' | 'medium' | 'high';
  status: 'draft' | 'in_review' | 'approved' | 'requires_consultation';
  createdDate: Date;
  completedDate?: Date;
  reviewer: string;
  dataCategories: string[];
  mitigationMeasures: string[];
  residualRisk: 'low' | 'medium' | 'high';
  createdAt: Date;
  updatedAt: Date;
}

export interface DataBreach {
  id: string;
  title: string;
  description: string;
  discoveryDate: Date;
  reportedDate?: Date;
  severity: 'low' | 'medium' | 'high';
  status: 'discovered' | 'assessed' | 'reported' | 'resolved';
  affectedDataSubjects: number;
  dataCategories: string[];
  likelyConsequences: string;
  mitigationMeasures: string[];
  supervisoryAuthorityNotified: boolean;
  dataSubjectsNotified: boolean;
  notificationDeadline: Date;
  assignedTo: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface DataPortabilityRequest {
  id: string;
  requestId: string;
  dataSubject: {
    name: string;
    email: string;
    userId: string;
  };
  requestDate: Date;
  status: 'pending' | 'processing' | 'ready' | 'delivered' | 'expired';
  dataCategories: string[];
  format: 'json' | 'csv' | 'xml' | 'pdf';
  deliveryMethod: 'email' | 'download' | 'secure_portal';
  completionDate?: Date;
  expiryDate: Date;
  fileSize?: string;
  downloadCount: number;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ComplianceItem {
  id: string;
  article: string;
  requirement: string;
  description: string;
  status: 'compliant' | 'partial' | 'non_compliant' | 'not_applicable';
  evidence: string[];
  responsible: string;
  lastReviewed: Date;
  nextReview: Date;
  priority: 'high' | 'medium' | 'low';
  category: 'principles' | 'rights' | 'obligations' | 'governance' | 'security';
  createdAt: Date;
  updatedAt: Date;
}

// Request/Response DTOs
export interface CreateLawfulBasisRequest {
  processingActivity: string;
  lawfulBasis: string;
  dataCategories: string[];
  purposes: string[];
  dataSubjects: string[];
  retentionPeriod: string;
}

export interface CreateProcessingRecordRequest {
  activityName: string;
  controller: string;
  processor?: string;
  purposes: string[];
  lawfulBasis: string;
  dataCategories: string[];
  dataSubjects: string[];
  recipients: string[];
  thirdCountryTransfers: boolean;
  retentionPeriod: string;
  technicalMeasures: string[];
  organisationalMeasures: string[];
}

export interface CreateDPIARequest {
  title: string;
  description: string;
  processingType: string;
  dataCategories: string[];
  mitigationMeasures: string[];
}

export interface CreateDataBreachRequest {
  title: string;
  description: string;
  discoveryDate: Date;
  severity: 'low' | 'medium' | 'high';
  affectedDataSubjects: number;
  dataCategories: string[];
  likelyConsequences: string;
  mitigationMeasures: string[];
  assignedTo: string;
}

export interface CreateDataPortabilityRequest {
  dataSubjectName: string;
  dataSubjectEmail: string;
  dataSubjectUserId: string;
  dataCategories: string[];
  format: 'json' | 'csv' | 'xml' | 'pdf';
  deliveryMethod: 'email' | 'download' | 'secure_portal';
  notes?: string;
}

export interface GDPRFilters {
  status?: string;
  category?: string;
  assignedTo?: string;
  dateFrom?: Date;
  dateTo?: Date;
  limit?: number;
  offset?: number;
}

export interface GDPRDashboardStats {
  overallScore: number;
  lawfulBasisCoverage: number;
  dpiasCompleted: number;
  recordsOfProcessing: number;
  breachResponseTime: string;
  dataPortabilityRequests: number;
  complianceByCategory: Record<string, number>;
  recentActivities: Array<{
    id: string;
    type: string;
    description: string;
    timestamp: Date;
    status: string;
  }>;
}
