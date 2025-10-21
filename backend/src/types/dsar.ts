

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

export interface CreateDSARRequest {
  subjectName: string;
  subjectEmail: string;
  subjectPhone?: string;
  requestType: 'access' | 'rectification' | 'erasure' | 'portability' | 'restriction' | 'objection';
  description?: string;
  dataCategories?: string[];
  processingPurposes?: string[];
}

export interface UpdateDSARRequest {
  status?: 'submitted' | 'in_review' | 'in_progress' | 'completed' | 'rejected' | 'cancelled';
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  assignedTo?: string;
  dueDate?: Date;
  rejectionReason?: string;
  legalBasis?: string;
  dataCategories?: string[];
  processingPurposes?: string[];
}

export interface DSARFilters {
  status?: 'submitted' | 'in_review' | 'in_progress' | 'completed' | 'rejected' | 'cancelled';
  requestType?: 'access' | 'rectification' | 'erasure' | 'portability' | 'restriction' | 'objection';
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  assignedTo?: string;
  subjectEmail?: string;
  dateFrom?: Date;
  dateTo?: Date;
  page?: number;
  limit?: number;
}

export interface DSARStatusChange {
  dsarId: string;
  status: 'submitted' | 'in_review' | 'in_progress' | 'completed' | 'rejected' | 'cancelled';
  comment?: string;
  changedBy: string;
}

export interface DSARStatusHistory {
  id: string;
  dsarId: string;
  status: 'submitted' | 'in_review' | 'in_progress' | 'completed' | 'rejected' | 'cancelled';
  comment?: string;
  changedBy?: string;
  changedAt: Date;
}