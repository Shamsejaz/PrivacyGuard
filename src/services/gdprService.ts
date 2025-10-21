import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3002/api/v1';

// Types
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

// API Service
class GDPRService {
  private api = axios.create({
    baseURL: API_BASE_URL,
    headers: {
      'Content-Type': 'application/json',
    },
  });

  constructor() {
    // Add request interceptor for authentication
    this.api.interceptors.request.use((config) => {
      const token = localStorage.getItem('authToken');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    });

    // Add response interceptor for error handling
    this.api.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401) {
          localStorage.removeItem('authToken');
          window.location.href = '/login';
        }
        return Promise.reject(error);
      }
    );
  }

  // Dashboard and Statistics
  async getDashboardStats(): Promise<GDPRDashboardStats> {
    const response = await this.api.get('/gdpr/dashboard');
    return response.data.data || response.data;
  }

  async generateComplianceReport(filters?: { dateFrom?: Date; dateTo?: Date }) {
    const params = new URLSearchParams();
    if (filters?.dateFrom) params.append('dateFrom', filters.dateFrom.toISOString());
    if (filters?.dateTo) params.append('dateTo', filters.dateTo.toISOString());
    
    const response = await this.api.get(`/gdpr/reports/compliance?${params}`);
    return response.data.data || response.data;
  }

  // Lawful Basis Management
  async getLawfulBasisRecords(filters?: { status?: string; limit?: number; offset?: number }): Promise<LawfulBasisRecord[]> {
    const params = new URLSearchParams();
    if (filters?.status) params.append('status', filters.status);
    if (filters?.limit) params.append('limit', filters.limit.toString());
    if (filters?.offset) params.append('offset', filters.offset.toString());
    
    const response = await this.api.get(`/gdpr/lawful-basis?${params}`);
    return response.data.data || response.data;
  }

  async createLawfulBasisRecord(data: CreateLawfulBasisRequest): Promise<LawfulBasisRecord> {
    const response = await this.api.post('/gdpr/lawful-basis', data);
    return response.data.data || response.data;
  }

  async updateLawfulBasisRecord(id: string, updates: Partial<LawfulBasisRecord>): Promise<LawfulBasisRecord> {
    const response = await this.api.put(`/gdpr/lawful-basis/${id}`, updates);
    return response.data.data || response.data;
  }

  async deleteLawfulBasisRecord(id: string): Promise<void> {
    await this.api.delete(`/gdpr/lawful-basis/${id}`);
  }

  // Processing Records Management
  async getProcessingRecords(filters?: { limit?: number; offset?: number }): Promise<ProcessingRecord[]> {
    const params = new URLSearchParams();
    if (filters?.limit) params.append('limit', filters.limit.toString());
    if (filters?.offset) params.append('offset', filters.offset.toString());
    
    const response = await this.api.get(`/gdpr/processing-records?${params}`);
    return response.data.data || response.data;
  }

  async createProcessingRecord(data: CreateProcessingRecordRequest): Promise<ProcessingRecord> {
    const response = await this.api.post('/gdpr/processing-records', data);
    return response.data.data || response.data;
  }

  async exportProcessingRecords(): Promise<Blob> {
    const response = await this.api.get('/gdpr/processing-records/export', {
      responseType: 'blob'
    });
    return response.data;
  }

  // DPIA Management
  async getDPIAs(filters?: { status?: string; limit?: number; offset?: number }): Promise<DPIA[]> {
    const params = new URLSearchParams();
    if (filters?.status) params.append('status', filters.status);
    if (filters?.limit) params.append('limit', filters.limit.toString());
    if (filters?.offset) params.append('offset', filters.offset.toString());
    
    const response = await this.api.get(`/gdpr/dpias?${params}`);
    return response.data.data || response.data;
  }

  async createDPIA(data: CreateDPIARequest): Promise<DPIA> {
    const response = await this.api.post('/gdpr/dpias', data);
    return response.data.data || response.data;
  }

  async updateDPIA(id: string, updates: Partial<DPIA>): Promise<DPIA> {
    const response = await this.api.put(`/gdpr/dpias/${id}`, updates);
    return response.data.data || response.data;
  }

  async assessDPIARisk(id: string, riskLevel: 'low' | 'medium' | 'high'): Promise<DPIA> {
    const response = await this.api.post(`/gdpr/dpias/${id}/assess-risk`, { riskLevel });
    return response.data.data || response.data;
  }

  // Data Breach Management
  async getDataBreaches(filters?: { status?: string; assignedTo?: string; limit?: number; offset?: number }): Promise<DataBreach[]> {
    const params = new URLSearchParams();
    if (filters?.status) params.append('status', filters.status);
    if (filters?.assignedTo) params.append('assignedTo', filters.assignedTo);
    if (filters?.limit) params.append('limit', filters.limit.toString());
    if (filters?.offset) params.append('offset', filters.offset.toString());
    
    const response = await this.api.get(`/gdpr/breaches?${params}`);
    return response.data.data || response.data;
  }

  async createDataBreach(data: CreateDataBreachRequest): Promise<DataBreach> {
    const response = await this.api.post('/gdpr/breaches', data);
    return response.data.data || response.data;
  }

  async updateDataBreach(id: string, updates: Partial<DataBreach>): Promise<DataBreach> {
    const response = await this.api.put(`/gdpr/breaches/${id}`, updates);
    return response.data.data || response.data;
  }

  async notifySupervisoryAuthority(id: string): Promise<DataBreach> {
    const response = await this.api.post(`/gdpr/breaches/${id}/notify-authority`);
    return response.data.data || response.data;
  }

  async notifyDataSubjects(id: string): Promise<DataBreach> {
    const response = await this.api.post(`/gdpr/breaches/${id}/notify-subjects`);
    return response.data.data || response.data;
  }

  // Data Portability Management
  async getDataPortabilityRequests(filters?: { status?: string; limit?: number; offset?: number }): Promise<DataPortabilityRequest[]> {
    const params = new URLSearchParams();
    if (filters?.status) params.append('status', filters.status);
    if (filters?.limit) params.append('limit', filters.limit.toString());
    if (filters?.offset) params.append('offset', filters.offset.toString());
    
    const response = await this.api.get(`/gdpr/portability-requests?${params}`);
    return response.data.data || response.data;
  }

  async createDataPortabilityRequest(data: CreateDataPortabilityRequest): Promise<DataPortabilityRequest> {
    const response = await this.api.post('/gdpr/portability-requests', data);
    return response.data.data || response.data;
  }

  async processDataPortabilityRequest(id: string): Promise<DataPortabilityRequest> {
    const response = await this.api.post(`/gdpr/portability-requests/${id}/process`);
    return response.data.data || response.data;
  }

  async completeDataPortabilityRequest(id: string, fileSize: string): Promise<DataPortabilityRequest> {
    const response = await this.api.post(`/gdpr/portability-requests/${id}/complete`, { fileSize });
    return response.data.data || response.data;
  }

  async deliverDataPortabilityRequest(id: string): Promise<DataPortabilityRequest> {
    const response = await this.api.post(`/gdpr/portability-requests/${id}/deliver`);
    return response.data.data || response.data;
  }
}

export const gdprService = new GDPRService();