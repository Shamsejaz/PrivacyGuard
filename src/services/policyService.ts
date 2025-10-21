import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api/v1';

// Types
export interface PolicyDocument {
  _id?: string;
  title: string;
  type: 'privacy_policy' | 'cookie_policy' | 'terms_of_service' | 'data_processing_agreement' | 'consent_form' | 'other';
  content: string;
  version: string;
  status: 'draft' | 'review' | 'approved' | 'active' | 'archived' | 'rejected';
  language: string;
  jurisdiction: string;
  effective_date?: Date;
  expiry_date?: Date;
  created_by: string;
  approved_by?: string;
  approval_date?: Date;
  tags: string[];
  metadata: PolicyMetadata;
  version_history: PolicyVersionHistory[];
  created_at: Date;
  updated_at: Date;
}

export interface PolicyMetadata {
  word_count: number;
  last_review_date?: Date;
  next_review_date?: Date;
  compliance_frameworks: string[];
  category?: string;
  priority?: 'low' | 'medium' | 'high' | 'critical';
  review_frequency?: 'monthly' | 'quarterly' | 'semi-annual' | 'annual';
  stakeholders?: string[];
  related_policies?: string[];
}

export interface PolicyVersionHistory {
  version: string;
  changes: string;
  changed_by: string;
  changed_at: Date;
  approval_status?: 'pending' | 'approved' | 'rejected';
  approved_by?: string;
  approval_date?: Date;
}

export interface PolicyTemplate {
  _id?: string;
  name: string;
  description: string;
  category: string;
  regulation: 'GDPR' | 'CCPA' | 'HIPAA' | 'PDPL' | 'SOX' | 'PCI-DSS' | 'Other';
  language: string;
  jurisdiction: string;
  content: string;
  variables: PolicyVariable[];
  is_active: boolean;
  created_by: string;
  created_at: Date;
  updated_at: Date;
}

export interface PolicyVariable {
  name: string;
  type: 'text' | 'date' | 'number' | 'boolean' | 'select';
  label: string;
  description?: string;
  required: boolean;
  default_value?: any;
  options?: string[];
  validation?: {
    min_length?: number;
    max_length?: number;
    pattern?: string;
  };
}

export interface PolicyGap {
  requirement: string;
  current_coverage: number;
  target_coverage: number;
  gap_severity: 'low' | 'medium' | 'high' | 'critical';
  remediation_steps: string[];
  due_date?: Date;
  assigned_to?: string;
}

export interface PolicyComplianceReport {
  policy_id: string;
  policy_title: string;
  compliance_score: number;
  framework_scores: Record<string, number>;
  gaps: PolicyGap[];
  recommendations: string[];
  last_review_date?: Date;
  next_review_date?: Date;
  status: 'compliant' | 'minor_gaps' | 'major_gaps' | 'non_compliant';
}

export interface PolicyEffectivenessMetrics {
  policy_id: string;
  views: number;
  downloads: number;
  user_feedback_score?: number;
  compliance_incidents: number;
  training_completion_rate?: number;
  last_updated: Date;
  effectiveness_score: number;
}

export interface PolicySearchFilters {
  type?: PolicyDocument['type'];
  status?: PolicyDocument['status'];
  language?: string;
  jurisdiction?: string;
  tags?: string[];
  compliance_frameworks?: string[];
  created_by?: string;
  date_range?: {
    start: Date;
    end: Date;
  };
  search_text?: string;
  page?: number;
  limit?: number;
  sort_by?: 'created_at' | 'updated_at' | 'title' | 'effective_date';
  sort_order?: 'asc' | 'desc';
}

export interface CreatePolicyRequest {
  title: string;
  type: PolicyDocument['type'];
  content: string;
  language: string;
  jurisdiction: string;
  tags?: string[];
  metadata?: Partial<PolicyMetadata>;
  effective_date?: Date;
  expiry_date?: Date;
}

export interface UpdatePolicyRequest {
  title?: string;
  content?: string;
  tags?: string[];
  metadata?: Partial<PolicyMetadata>;
  effective_date?: Date;
  expiry_date?: Date;
}

export interface PolicyApprovalRequest {
  action: 'approve' | 'reject' | 'request_changes';
  comments?: string;
  changes_required?: string[];
}

export interface GeneratePolicyFromTemplateRequest {
  template_id: string;
  title: string;
  variable_values: Record<string, any>;
  language?: string;
  jurisdiction?: string;
  tags?: string[];
}

export interface PolicyAnalytics {
  overview: {
    total_policies: number;
    active_policies: number;
    pending_reviews: number;
    compliance_score: number;
  };
  policy_distribution: Record<string, number>;
  compliance_trends: Array<{
    date: Date;
    score: number;
    framework?: string;
  }>;
  effectiveness_metrics: {
    average_effectiveness: number;
    top_performing_policies: PolicyEffectivenessMetrics[];
    underperforming_policies: PolicyEffectivenessMetrics[];
  };
  gap_analysis: {
    critical_gaps: number;
    high_gaps: number;
    medium_gaps: number;
    low_gaps: number;
  };
}

// API Client
class PolicyService {
  private getAuthHeaders() {
    const token = localStorage.getItem('authToken');
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };
  }

  // Policy Document Operations
  async searchPolicies(filters: PolicySearchFilters = {}): Promise<{
    policies: PolicyDocument[];
    total: number;
    page: number;
    limit: number;
  }> {
    const params = new URLSearchParams();
    
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        if (Array.isArray(value)) {
          params.append(key, value.join(','));
        } else if (value instanceof Date) {
          params.append(key, value.toISOString());
        } else if (typeof value === 'object' && key === 'date_range') {
          params.append('date_range_start', value.start.toISOString());
          params.append('date_range_end', value.end.toISOString());
        } else {
          params.append(key, String(value));
        }
      }
    });

    const response = await axios.get(`${API_BASE_URL}/policy?${params}`, {
      headers: this.getAuthHeaders()
    });
    
    return response.data;
  }

  async createPolicy(policyData: CreatePolicyRequest): Promise<PolicyDocument> {
    const response = await axios.post(`${API_BASE_URL}/policy`, policyData, {
      headers: this.getAuthHeaders()
    });
    
    return response.data;
  }

  async getPolicyById(id: string): Promise<PolicyDocument> {
    const response = await axios.get(`${API_BASE_URL}/policy/${id}`, {
      headers: this.getAuthHeaders()
    });
    
    return response.data;
  }

  async updatePolicy(id: string, updates: UpdatePolicyRequest): Promise<PolicyDocument> {
    const response = await axios.put(`${API_BASE_URL}/policy/${id}`, updates, {
      headers: this.getAuthHeaders()
    });
    
    return response.data;
  }

  async deletePolicy(id: string): Promise<void> {
    await axios.delete(`${API_BASE_URL}/policy/${id}`, {
      headers: this.getAuthHeaders()
    });
  }

  async approvePolicy(id: string, approvalRequest: PolicyApprovalRequest): Promise<PolicyDocument> {
    const response = await axios.post(`${API_BASE_URL}/policy/${id}/approve`, approvalRequest, {
      headers: this.getAuthHeaders()
    });
    
    return response.data;
  }

  async createNewVersion(id: string, changes: string, majorVersion: boolean = false): Promise<PolicyDocument> {
    const response = await axios.post(`${API_BASE_URL}/policy/${id}/version`, {
      changes,
      major_version: majorVersion
    }, {
      headers: this.getAuthHeaders()
    });
    
    return response.data;
  }

  // Policy Template Operations
  async getTemplates(filters: {
    category?: string;
    regulation?: string;
    language?: string;
    jurisdiction?: string;
    search_text?: string;
    page?: number;
    limit?: number;
  } = {}): Promise<PolicyTemplate[]> {
    const params = new URLSearchParams();
    
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        params.append(key, String(value));
      }
    });

    const response = await axios.get(`${API_BASE_URL}/policy/templates?${params}`, {
      headers: this.getAuthHeaders()
    });
    
    return response.data;
  }

  async getTemplateById(id: string): Promise<PolicyTemplate> {
    const response = await axios.get(`${API_BASE_URL}/policy/templates/${id}`, {
      headers: this.getAuthHeaders()
    });
    
    return response.data;
  }

  async generatePolicyFromTemplate(request: GeneratePolicyFromTemplateRequest): Promise<PolicyDocument> {
    const response = await axios.post(`${API_BASE_URL}/policy/generate-from-template`, request, {
      headers: this.getAuthHeaders()
    });
    
    return response.data;
  }

  // Policy Analytics Operations
  async getDashboardAnalytics(filters: {
    date_range?: { start: Date; end: Date };
    policy_types?: string[];
    jurisdictions?: string[];
    compliance_frameworks?: string[];
  } = {}): Promise<PolicyAnalytics> {
    const params = new URLSearchParams();
    
    if (filters.date_range) {
      params.append('date_range_start', filters.date_range.start.toISOString());
      params.append('date_range_end', filters.date_range.end.toISOString());
    }
    
    if (filters.policy_types) {
      params.append('policy_types', filters.policy_types.join(','));
    }
    
    if (filters.jurisdictions) {
      params.append('jurisdictions', filters.jurisdictions.join(','));
    }
    
    if (filters.compliance_frameworks) {
      params.append('compliance_frameworks', filters.compliance_frameworks.join(','));
    }

    const response = await axios.get(`${API_BASE_URL}/policy/analytics/dashboard?${params}`, {
      headers: this.getAuthHeaders()
    });
    
    return response.data;
  }

  async getComplianceReport(id: string): Promise<PolicyComplianceReport> {
    const response = await axios.get(`${API_BASE_URL}/policy/${id}/compliance-report`, {
      headers: this.getAuthHeaders()
    });
    
    return response.data;
  }

  async getEffectivenessMetrics(id: string): Promise<PolicyEffectivenessMetrics> {
    const response = await axios.get(`${API_BASE_URL}/policy/${id}/effectiveness`, {
      headers: this.getAuthHeaders()
    });
    
    return response.data;
  }

  async getGapAnalysis(id: string): Promise<PolicyGap[]> {
    const response = await axios.get(`${API_BASE_URL}/policy/${id}/gap-analysis`, {
      headers: this.getAuthHeaders()
    });
    
    return response.data;
  }

  async getRelationshipMap(id: string): Promise<{
    policy: PolicyDocument;
    relationships: Array<{
      type: string;
      related_policy: PolicyDocument;
      relationship_type: string;
      description?: string;
    }>;
  }> {
    const response = await axios.get(`${API_BASE_URL}/policy/${id}/relationship-map`, {
      headers: this.getAuthHeaders()
    });
    
    return response.data;
  }

  async scheduleReviewNotifications(): Promise<void> {
    await axios.post(`${API_BASE_URL}/policy/schedule-review-notifications`, {}, {
      headers: this.getAuthHeaders()
    });
  }

  // Policy Review Operations
  async getPendingReviews(reviewerId?: string): Promise<any[]> {
    const params = reviewerId ? `?reviewer_id=${reviewerId}` : '';
    
    const response = await axios.get(`${API_BASE_URL}/policy/reviews/pending${params}`, {
      headers: this.getAuthHeaders()
    });
    
    return response.data;
  }

  async scheduleReview(id: string, reviewDate?: Date): Promise<any> {
    const response = await axios.post(`${API_BASE_URL}/policy/${id}/schedule-review`, {
      review_date: reviewDate?.toISOString()
    }, {
      headers: this.getAuthHeaders()
    });
    
    return response.data;
  }

  // Policy Relationship Operations
  async getPolicyRelationships(id: string): Promise<any[]> {
    const response = await axios.get(`${API_BASE_URL}/policy/${id}/relationships`, {
      headers: this.getAuthHeaders()
    });
    
    return response.data;
  }

  async createPolicyRelationship(
    sourceId: string,
    targetId: string,
    relationshipType: string,
    description?: string
  ): Promise<any> {
    const response = await axios.post(`${API_BASE_URL}/policy/${sourceId}/relationships`, {
      target_policy_id: targetId,
      relationship_type: relationshipType,
      description
    }, {
      headers: this.getAuthHeaders()
    });
    
    return response.data;
  }
}

export const policyService = new PolicyService();
export default policyService;