

export interface DSARRequest {
  id: string;
  requestId: string;
  subjectName: string;
  subjectEmail: string;
  subjectPhone?: string;
  requestType: 'access' | 'rectification' | 'erasure' | 'portability' | 'restriction' | 'objection';
  status: 'submitted' | 'in_review' | 'in_progress' | 'completed' | 'rejected' | 'cancelled';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  description?: string;
  legalBasis?: string;
  dataCategories: string[];
  processingPurposes: string[];
  assignedTo?: string;
  dueDate?: Date;
  completedAt?: Date;
  rejectionReason?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface DSARStatusHistory {
  id: string;
  dsarId: string;
  status: DSARRequest['status'];
  comment?: string;
  changedBy?: string;
  changedAt: Date;
}

export interface CreateDSARRequest {
  subjectName: string;
  subjectEmail: string;
  subjectPhone?: string;
  requestType: DSARRequest['requestType'];
  description?: string;
  dataCategories?: string[];
  processingPurposes?: string[];
}

export interface UpdateDSARRequest {
  status?: DSARRequest['status'];
  priority?: DSARRequest['priority'];
  assignedTo?: string;
  dueDate?: Date;
  rejectionReason?: string;
  legalBasis?: string;
  dataCategories?: string[];
  processingPurposes?: string[];
}

export interface DSARFilters {
  status?: DSARRequest['status'];
  requestType?: DSARRequest['requestType'];
  priority?: DSARRequest['priority'];
  assignedTo?: string;
  subjectEmail?: string;
  dateFrom?: Date;
  dateTo?: Date;
  page?: number;
  limit?: number;
}

export interface DSARStatusChange {
  dsarId: string;
  status: DSARRequest['status'];
  comment?: string;
  changedBy: string;
}
