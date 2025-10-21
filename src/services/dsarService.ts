import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';

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

export interface DSARStatusHistory {
  id: string;
  dsarId: string;
  status: DSARRequest['status'];
  comment?: string;
  changedBy?: string;
  changedAt: Date;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface DSARStatistics {
  total: number;
  submitted: number;
  inProgress: number;
  completed: number;
  overdue: number;
  completionRate: number;
}

class DSARService {
  private api = axios.create({
    baseURL: `${API_BASE_URL}/api/dsar`,
    headers: {
      'Content-Type': 'application/json',
    },
  });

  constructor() {
    // Add auth token to requests
    this.api.interceptors.request.use((config) => {
      const token = localStorage.getItem('authToken');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    });

    // Handle response errors
    this.api.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401) {
          // Handle unauthorized access
          localStorage.removeItem('authToken');
          window.location.href = '/login';
        }
        return Promise.reject(error);
      }
    );
  }

  // Public API methods (no auth required)
  async submitRequest(data: CreateDSARRequest): Promise<{ requestId: string; status: string; submittedAt: Date }> {
    const response = await axios.post(`${API_BASE_URL}/api/dsar/submit`, data);
    return response.data.data;
  }

  async checkRequestStatus(requestId: string): Promise<{ requestId: string; status: string; submittedAt: Date; lastUpdated: Date }> {
    const response = await axios.get(`${API_BASE_URL}/api/dsar/status/${requestId}`);
    return response.data.data;
  }

  // Admin API methods (auth required)
  async getRequests(filters?: DSARFilters): Promise<PaginatedResponse<DSARRequest>> {
    const params = new URLSearchParams();
    
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          if (value instanceof Date) {
            params.append(key, value.toISOString());
          } else {
            params.append(key, value.toString());
          }
        }
      });
    }

    const response = await this.api.get(`/?${params.toString()}`);
    return response.data.data;
  }

  async getRequestById(id: string): Promise<DSARRequest> {
    const response = await this.api.get(`/${id}`);
    return response.data.data;
  }

  async updateRequest(id: string, updates: UpdateDSARRequest): Promise<DSARRequest> {
    const response = await this.api.put(`/${id}`, updates);
    return response.data.data;
  }

  async updateRequestStatus(id: string, status: DSARRequest['status'], comment?: string): Promise<DSARRequest> {
    const response = await this.api.post(`/${id}/status`, { status, comment });
    return response.data.data;
  }

  async assignRequest(id: string, assigneeId: string): Promise<DSARRequest> {
    const response = await this.api.post(`/${id}/assign`, { assigneeId });
    return response.data.data;
  }

  async getStatusHistory(id: string): Promise<DSARStatusHistory[]> {
    const response = await this.api.get(`/${id}/history`);
    return response.data.data;
  }

  async generateReport(id: string): Promise<any> {
    const response = await this.api.get(`/${id}/report`);
    return response.data.data;
  }

  async deleteRequest(id: string): Promise<void> {
    await this.api.delete(`/${id}`);
  }

  async getStatistics(): Promise<DSARStatistics> {
    const response = await this.api.get('/statistics');
    return response.data.data;
  }
}

export const dsarService = new DSARService();