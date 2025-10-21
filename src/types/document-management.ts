export interface Document {
  id: string;
  title: string;
  content: string;
  type: DocumentType;
  category: DocumentCategory;
  status: DocumentStatus;
  version: number;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  lastModifiedBy: string;
  templateId?: string;
  metadata: DocumentMetadata;
  tags: string[];
  permissions: DocumentPermission[];
}

export interface DocumentVersion {
  id: string;
  documentId: string;
  version: number;
  content: string;
  changes: DocumentChange[];
  createdAt: Date;
  createdBy: string;
  comment: string;
  status: VersionStatus;
  approvals: DocumentApproval[];
}

export interface DocumentChange {
  id: string;
  type: 'addition' | 'deletion' | 'modification';
  section: string;
  oldContent?: string;
  newContent?: string;
  position: number;
  timestamp: Date;
  author: string;
}

export interface DocumentApproval {
  id: string;
  documentVersionId: string;
  approverId: string;
  approverName: string;
  approverRole: string;
  status: ApprovalStatus;
  comment?: string;
  timestamp: Date;
  digitalSignature?: DigitalSignature;
}

export interface DocumentWorkflow {
  id: string;
  name: string;
  documentType: DocumentType;
  steps: WorkflowStep[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface WorkflowStep {
  id: string;
  name: string;
  order: number;
  type: 'review' | 'approval' | 'publication';
  assignedRoles: string[];
  requiredApprovals: number;
  isParallel: boolean;
  conditions?: WorkflowCondition[];
}

export interface WorkflowCondition {
  field: string;
  operator: 'equals' | 'contains' | 'greater_than' | 'less_than';
  value: any;
}

export interface DocumentTemplate {
  id: string;
  name: string;
  description: string;
  category: DocumentCategory;
  content: string;
  variables: TemplateVariable[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
}

export interface TemplateVariable {
  name: string;
  type: 'text' | 'number' | 'date' | 'boolean' | 'select';
  label: string;
  description?: string;
  required: boolean;
  defaultValue?: any;
  options?: string[];
  validation?: ValidationRule[];
}

export interface ValidationRule {
  type: 'required' | 'minLength' | 'maxLength' | 'pattern' | 'custom';
  value?: any;
  message: string;
}

export interface DocumentLifecycle {
  id: string;
  documentId: string;
  reviewSchedule: ReviewSchedule;
  expirationDate?: Date;
  retentionPeriod: number; // in days
  archiveDate?: Date;
  isArchived: boolean;
  notifications: LifecycleNotification[];
}

export interface ReviewSchedule {
  frequency: 'monthly' | 'quarterly' | 'annually' | 'custom';
  interval?: number;
  nextReviewDate: Date;
  assignedReviewers: string[];
  reminderDays: number[];
}

export interface LifecycleNotification {
  id: string;
  type: 'review_due' | 'expiring_soon' | 'expired' | 'archive_due';
  scheduledDate: Date;
  sentDate?: Date;
  recipients: string[];
  message: string;
}

export interface DocumentComment {
  id: string;
  documentId: string;
  versionId?: string;
  content: string;
  author: string;
  authorName: string;
  createdAt: Date;
  updatedAt?: Date;
  parentCommentId?: string;
  isResolved: boolean;
  position?: CommentPosition;
}

export interface CommentPosition {
  section: string;
  paragraph: number;
  character: number;
}

export interface DigitalSignature {
  id: string;
  signerId: string;
  signerName: string;
  signerEmail: string;
  timestamp: Date;
  signature: string;
  certificate: string;
  isValid: boolean;
}

export interface DocumentPermission {
  userId: string;
  role: string;
  permissions: Permission[];
  grantedAt: Date;
  grantedBy: string;
}

export interface Permission {
  action: 'read' | 'write' | 'approve' | 'publish' | 'delete' | 'share';
  granted: boolean;
}

export interface DocumentMetadata {
  author: string;
  subject: string;
  keywords: string[];
  language: string;
  classification: 'public' | 'internal' | 'confidential' | 'restricted';
  complianceFrameworks: string[];
  relatedDocuments: string[];
  customFields: Record<string, any>;
}

export type DocumentType = 
  | 'policy'
  | 'procedure'
  | 'template'
  | 'contract'
  | 'report'
  | 'notice'
  | 'form'
  | 'manual'
  | 'other';

export type DocumentCategory = 
  | 'privacy'
  | 'security'
  | 'compliance'
  | 'legal'
  | 'hr'
  | 'finance'
  | 'operations'
  | 'technical'
  | 'other';

export type DocumentStatus = 
  | 'draft'
  | 'in_review'
  | 'pending_approval'
  | 'approved'
  | 'published'
  | 'archived'
  | 'rejected';

export type VersionStatus = 
  | 'draft'
  | 'submitted'
  | 'in_review'
  | 'approved'
  | 'rejected'
  | 'published';

export type ApprovalStatus = 
  | 'pending'
  | 'approved'
  | 'rejected'
  | 'delegated';

export interface DocumentSearchFilters {
  query?: string;
  type?: DocumentType;
  category?: DocumentCategory;
  status?: DocumentStatus;
  author?: string;
  dateRange?: {
    start: Date;
    end: Date;
  };
  tags?: string[];
  classification?: string;
}

export interface DocumentStats {
  totalDocuments: number;
  documentsByStatus: Record<DocumentStatus, number>;
  documentsByType: Record<DocumentType, number>;
  recentActivity: DocumentActivity[];
  upcomingReviews: number;
  expiringSoon: number;
}

export interface DocumentActivity {
  id: string;
  documentId: string;
  documentTitle: string;
  action: string;
  user: string;
  timestamp: Date;
  details?: string;
}