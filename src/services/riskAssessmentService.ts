import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api/v1';

export interface RiskAssessment {
  id: string;
  name: string;
  description?: string;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  impactScore: number;
  likelihoodScore: number;
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

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

class RiskAssessmentService {
  private getAuthHeaders() {
    // For development, we'll skip authentication headers since the backend doesn't require them
    return {
      'Content-Type': 'application/json'
    };
  }

  // Risk Assessment methods
  async getRiskAssessments(filters?: RiskFilters): Promise<PaginatedResponse<RiskAssessment>> {
    try {
      const params = new URLSearchParams();
      
      if (filters) {
        Object.entries(filters).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            if (Array.isArray(value)) {
              params.append(key, value.join(','));
            } else if (value instanceof Date) {
              params.append(key, value.toISOString());
            } else {
              params.append(key, value.toString());
            }
          }
        });
      }

      const response = await axios.get<ApiResponse<PaginatedResponse<RiskAssessment>>>(
        `${API_BASE_URL}/risk/assessments?${params.toString()}`,
        { headers: this.getAuthHeaders() }
      );

      if (!response.data.success) {
        throw new Error(response.data.error || 'Failed to fetch risk assessments');
      }

      return response.data.data!;
    } catch (error) {
      console.error('Error fetching risk assessments:', error);
      throw error;
    }
  }

  async getRiskAssessmentById(id: string): Promise<RiskAssessment> {
    try {
      const response = await axios.get<ApiResponse<RiskAssessment>>(
        `${API_BASE_URL}/risk/assessments/${id}`,
        { headers: this.getAuthHeaders() }
      );

      if (!response.data.success) {
        throw new Error(response.data.error || 'Failed to fetch risk assessment');
      }

      return response.data.data!;
    } catch (error) {
      console.error('Error fetching risk assessment:', error);
      throw error;
    }
  }

  async createRiskAssessment(data: CreateRiskAssessmentRequest): Promise<RiskAssessment> {
    try {
      const response = await axios.post<ApiResponse<RiskAssessment>>(
        `${API_BASE_URL}/risk/assessments`,
        data,
        { headers: this.getAuthHeaders() }
      );

      if (!response.data.success) {
        throw new Error(response.data.error || 'Failed to create risk assessment');
      }

      return response.data.data!;
    } catch (error) {
      console.error('Error creating risk assessment:', error);
      throw error;
    }
  }

  async updateRiskAssessment(id: string, data: UpdateRiskAssessmentRequest): Promise<RiskAssessment> {
    try {
      const response = await axios.put<ApiResponse<RiskAssessment>>(
        `${API_BASE_URL}/risk/assessments/${id}`,
        data,
        { headers: this.getAuthHeaders() }
      );

      if (!response.data.success) {
        throw new Error(response.data.error || 'Failed to update risk assessment');
      }

      return response.data.data!;
    } catch (error) {
      console.error('Error updating risk assessment:', error);
      throw error;
    }
  }

  async deleteRiskAssessment(id: string): Promise<void> {
    try {
      const response = await axios.delete<ApiResponse>(
        `${API_BASE_URL}/risk/assessments/${id}`,
        { headers: this.getAuthHeaders() }
      );

      if (!response.data.success) {
        throw new Error(response.data.error || 'Failed to delete risk assessment');
      }
    } catch (error) {
      console.error('Error deleting risk assessment:', error);
      throw error;
    }
  }

  // Compliance Finding methods
  async getComplianceFindings(filters?: ComplianceFilters): Promise<PaginatedResponse<ComplianceFinding>> {
    try {
      const params = new URLSearchParams();
      
      if (filters) {
        Object.entries(filters).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            if (Array.isArray(value)) {
              params.append(key, value.join(','));
            } else if (value instanceof Date) {
              params.append(key, value.toISOString());
            } else {
              params.append(key, value.toString());
            }
          }
        });
      }

      const response = await axios.get<ApiResponse<PaginatedResponse<ComplianceFinding>>>(
        `${API_BASE_URL}/risk/findings?${params.toString()}`,
        { headers: this.getAuthHeaders() }
      );

      if (!response.data.success) {
        throw new Error(response.data.error || 'Failed to fetch compliance findings');
      }

      return response.data.data!;
    } catch (error) {
      console.error('Error fetching compliance findings:', error);
      throw error;
    }
  }

  async getComplianceFindingById(id: string): Promise<ComplianceFinding> {
    try {
      const response = await axios.get<ApiResponse<ComplianceFinding>>(
        `${API_BASE_URL}/risk/findings/${id}`,
        { headers: this.getAuthHeaders() }
      );

      if (!response.data.success) {
        throw new Error(response.data.error || 'Failed to fetch compliance finding');
      }

      return response.data.data!;
    } catch (error) {
      console.error('Error fetching compliance finding:', error);
      throw error;
    }
  }

  async createComplianceFinding(data: CreateComplianceFindingRequest): Promise<ComplianceFinding> {
    try {
      const response = await axios.post<ApiResponse<ComplianceFinding>>(
        `${API_BASE_URL}/risk/findings`,
        data,
        { headers: this.getAuthHeaders() }
      );

      if (!response.data.success) {
        throw new Error(response.data.error || 'Failed to create compliance finding');
      }

      return response.data.data!;
    } catch (error) {
      console.error('Error creating compliance finding:', error);
      throw error;
    }
  }

  async updateComplianceFinding(id: string, data: Partial<ComplianceFinding>): Promise<ComplianceFinding> {
    try {
      const response = await axios.put<ApiResponse<ComplianceFinding>>(
        `${API_BASE_URL}/risk/findings/${id}`,
        data,
        { headers: this.getAuthHeaders() }
      );

      if (!response.data.success) {
        throw new Error(response.data.error || 'Failed to update compliance finding');
      }

      return response.data.data!;
    } catch (error) {
      console.error('Error updating compliance finding:', error);
      throw error;
    }
  }

  // Analytics and Reporting methods
  async getRiskMetrics(): Promise<RiskMetrics> {
    try {
      const response = await axios.get<ApiResponse<RiskMetrics>>(
        `${API_BASE_URL}/risk/metrics`,
        { headers: this.getAuthHeaders() }
      );

      if (!response.data.success) {
        throw new Error(response.data.error || 'Failed to fetch risk metrics');
      }

      return response.data.data!;
    } catch (error) {
      console.error('Error fetching risk metrics:', error);
      throw error;
    }
  }

  async getRiskTrends(days: number = 30): Promise<RiskTrend[]> {
    try {
      const response = await axios.get<ApiResponse<RiskTrend[]>>(
        `${API_BASE_URL}/risk/trends?days=${days}`,
        { headers: this.getAuthHeaders() }
      );

      if (!response.data.success) {
        throw new Error(response.data.error || 'Failed to fetch risk trends');
      }

      return response.data.data!;
    } catch (error) {
      console.error('Error fetching risk trends:', error);
      throw error;
    }
  }

  async getRiskAnalysis(): Promise<{
    trend: 'increasing' | 'decreasing' | 'stable';
    changePercentage: number;
    recommendation: string;
  }> {
    try {
      const response = await axios.get<ApiResponse<{
        trend: 'increasing' | 'decreasing' | 'stable';
        changePercentage: number;
        recommendation: string;
      }>>(
        `${API_BASE_URL}/risk/analysis`,
        { headers: this.getAuthHeaders() }
      );

      if (!response.data.success) {
        throw new Error(response.data.error || 'Failed to fetch risk analysis');
      }

      return response.data.data!;
    } catch (error) {
      console.error('Error fetching risk analysis:', error);
      throw error;
    }
  }

  async generateRiskReport(filters?: RiskFilters): Promise<any> {
    try {
      const response = await axios.post<ApiResponse<any>>(
        `${API_BASE_URL}/risk/reports`,
        { filters },
        { headers: this.getAuthHeaders() }
      );

      if (!response.data.success) {
        throw new Error(response.data.error || 'Failed to generate risk report');
      }

      return response.data.data!;
    } catch (error) {
      console.error('Error generating risk report:', error);
      throw error;
    }
  }

  async calculateRiskScore(impact: number, likelihood: number): Promise<{
    impact: number;
    likelihood: number;
    overallScore: number;
    riskLevel: 'low' | 'medium' | 'high' | 'critical';
  }> {
    try {
      const response = await axios.post<ApiResponse<{
        impact: number;
        likelihood: number;
        overallScore: number;
        riskLevel: 'low' | 'medium' | 'high' | 'critical';
      }>>(
        `${API_BASE_URL}/risk/calculate`,
        { impact, likelihood },
        { headers: this.getAuthHeaders() }
      );

      if (!response.data.success) {
        throw new Error(response.data.error || 'Failed to calculate risk score');
      }

      return response.data.data!;
    } catch (error) {
      console.error('Error calculating risk score:', error);
      throw error;
    }
  }
}

export const riskAssessmentService = new RiskAssessmentService();