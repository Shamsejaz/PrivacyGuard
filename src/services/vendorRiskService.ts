import { 
  Vendor, 
  VendorAssessment, 
  AssessmentQuestionnaire,
  DataProcessingAgreement,
  VendorCertification,
  VendorRiskMetrics,
  VendorCommunication,
  VendorPortalAccess,
  RiskScoringRule,
  VendorFilter,
  VendorSortOption,
  AssessmentResponse,
  AssessmentFinding
} from '../types/vendor-risk';

class VendorRiskService {
  private baseUrl = '/api/vendor-risk';

  // Vendor Management
  async getVendors(filter?: VendorFilter, sort?: VendorSortOption): Promise<Vendor[]> {
    const params = new URLSearchParams();
    
    if (filter) {
      if (filter.search) params.append('search', filter.search);
      if (filter.status) params.append('status', filter.status.join(','));
      if (filter.riskLevel) params.append('riskLevel', filter.riskLevel.join(','));
      if (filter.industry) params.append('industry', filter.industry.join(','));
      if (filter.complianceStatus) params.append('complianceStatus', filter.complianceStatus.join(','));
      if (filter.assessmentOverdue) params.append('assessmentOverdue', 'true');
      if (filter.dpaExpiring) params.append('dpaExpiring', 'true');
      if (filter.certificationExpiring) params.append('certificationExpiring', 'true');
      if (filter.dateRange) {
        params.append('startDate', filter.dateRange.start.toISOString());
        params.append('endDate', filter.dateRange.end.toISOString());
      }
    }
    
    if (sort) {
      params.append('sortField', sort.field);
      params.append('sortDirection', sort.direction);
    }

    const response = await fetch(`${this.baseUrl}/vendors?${params}`);
    if (!response.ok) throw new Error('Failed to fetch vendors');
    return response.json();
  }

  async getVendor(id: string): Promise<Vendor> {
    const response = await fetch(`${this.baseUrl}/vendors/${id}`);
    if (!response.ok) throw new Error('Failed to fetch vendor');
    return response.json();
  }

  async createVendor(vendor: Omit<Vendor, 'id' | 'createdAt' | 'updatedAt'>): Promise<Vendor> {
    const response = await fetch(`${this.baseUrl}/vendors`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(vendor)
    });
    if (!response.ok) throw new Error('Failed to create vendor');
    return response.json();
  }

  async updateVendor(id: string, updates: Partial<Vendor>): Promise<Vendor> {
    const response = await fetch(`${this.baseUrl}/vendors/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates)
    });
    if (!response.ok) throw new Error('Failed to update vendor');
    return response.json();
  }

  async deleteVendor(id: string): Promise<void> {
    const response = await fetch(`${this.baseUrl}/vendors/${id}`, {
      method: 'DELETE'
    });
    if (!response.ok) throw new Error('Failed to delete vendor');
  }

  // Assessment Management
  async getAssessments(vendorId?: string): Promise<VendorAssessment[]> {
    const url = vendorId 
      ? `${this.baseUrl}/assessments?vendorId=${vendorId}`
      : `${this.baseUrl}/assessments`;
    
    const response = await fetch(url);
    if (!response.ok) throw new Error('Failed to fetch assessments');
    return response.json();
  }

  async getAssessment(id: string): Promise<VendorAssessment> {
    const response = await fetch(`${this.baseUrl}/assessments/${id}`);
    if (!response.ok) throw new Error('Failed to fetch assessment');
    return response.json();
  }

  async createAssessment(assessment: Omit<VendorAssessment, 'id' | 'createdAt' | 'updatedAt'>): Promise<VendorAssessment> {
    const response = await fetch(`${this.baseUrl}/assessments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(assessment)
    });
    if (!response.ok) throw new Error('Failed to create assessment');
    return response.json();
  }

  async updateAssessment(id: string, updates: Partial<VendorAssessment>): Promise<VendorAssessment> {
    const response = await fetch(`${this.baseUrl}/assessments/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates)
    });
    if (!response.ok) throw new Error('Failed to update assessment');
    return response.json();
  }

  async submitAssessmentResponse(assessmentId: string, responses: AssessmentResponse[]): Promise<VendorAssessment> {
    const response = await fetch(`${this.baseUrl}/assessments/${assessmentId}/responses`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ responses })
    });
    if (!response.ok) throw new Error('Failed to submit assessment responses');
    return response.json();
  }

  async approveAssessment(id: string, findings: AssessmentFinding[]): Promise<VendorAssessment> {
    const response = await fetch(`${this.baseUrl}/assessments/${id}/approve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ findings })
    });
    if (!response.ok) throw new Error('Failed to approve assessment');
    return response.json();
  }

  // Questionnaire Management
  async getQuestionnaires(): Promise<AssessmentQuestionnaire[]> {
    const response = await fetch(`${this.baseUrl}/questionnaires`);
    if (!response.ok) throw new Error('Failed to fetch questionnaires');
    return response.json();
  }

  async getQuestionnaire(id: string): Promise<AssessmentQuestionnaire> {
    const response = await fetch(`${this.baseUrl}/questionnaires/${id}`);
    if (!response.ok) throw new Error('Failed to fetch questionnaire');
    return response.json();
  }

  async createQuestionnaire(questionnaire: Omit<AssessmentQuestionnaire, 'id' | 'createdAt' | 'updatedAt'>): Promise<AssessmentQuestionnaire> {
    const response = await fetch(`${this.baseUrl}/questionnaires`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(questionnaire)
    });
    if (!response.ok) throw new Error('Failed to create questionnaire');
    return response.json();
  }

  // DPA Management
  async getDPAs(vendorId?: string): Promise<DataProcessingAgreement[]> {
    const url = vendorId 
      ? `${this.baseUrl}/dpas?vendorId=${vendorId}`
      : `${this.baseUrl}/dpas`;
    
    const response = await fetch(url);
    if (!response.ok) throw new Error('Failed to fetch DPAs');
    return response.json();
  }

  async getDPA(id: string): Promise<DataProcessingAgreement> {
    const response = await fetch(`${this.baseUrl}/dpas/${id}`);
    if (!response.ok) throw new Error('Failed to fetch DPA');
    return response.json();
  }

  async createDPA(dpa: Omit<DataProcessingAgreement, 'id' | 'createdAt' | 'updatedAt'>): Promise<DataProcessingAgreement> {
    const response = await fetch(`${this.baseUrl}/dpas`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(dpa)
    });
    if (!response.ok) throw new Error('Failed to create DPA');
    return response.json();
  }

  async updateDPA(id: string, updates: Partial<DataProcessingAgreement>): Promise<DataProcessingAgreement> {
    const response = await fetch(`${this.baseUrl}/dpas/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates)
    });
    if (!response.ok) throw new Error('Failed to update DPA');
    return response.json();
  }

  async renewDPA(id: string, renewalPeriod: number): Promise<DataProcessingAgreement> {
    const response = await fetch(`${this.baseUrl}/dpas/${id}/renew`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ renewalPeriod })
    });
    if (!response.ok) throw new Error('Failed to renew DPA');
    return response.json();
  }

  // Certification Management
  async getCertifications(vendorId?: string): Promise<VendorCertification[]> {
    const url = vendorId 
      ? `${this.baseUrl}/certifications?vendorId=${vendorId}`
      : `${this.baseUrl}/certifications`;
    
    const response = await fetch(url);
    if (!response.ok) throw new Error('Failed to fetch certifications');
    return response.json();
  }

  async createCertification(certification: Omit<VendorCertification, 'id' | 'createdAt' | 'updatedAt'>): Promise<VendorCertification> {
    const response = await fetch(`${this.baseUrl}/certifications`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(certification)
    });
    if (!response.ok) throw new Error('Failed to create certification');
    return response.json();
  }

  async verifyCertification(id: string): Promise<VendorCertification> {
    const response = await fetch(`${this.baseUrl}/certifications/${id}/verify`, {
      method: 'POST'
    });
    if (!response.ok) throw new Error('Failed to verify certification');
    return response.json();
  }

  // Risk Scoring
  async calculateRiskScore(vendorId: string): Promise<{ score: number; level: string; factors: any[] }> {
    const response = await fetch(`${this.baseUrl}/vendors/${vendorId}/risk-score`, {
      method: 'POST'
    });
    if (!response.ok) throw new Error('Failed to calculate risk score');
    return response.json();
  }

  async getRiskScoringRules(): Promise<RiskScoringRule[]> {
    const response = await fetch(`${this.baseUrl}/risk-rules`);
    if (!response.ok) throw new Error('Failed to fetch risk scoring rules');
    return response.json();
  }

  async updateRiskScoringRule(id: string, updates: Partial<RiskScoringRule>): Promise<RiskScoringRule> {
    const response = await fetch(`${this.baseUrl}/risk-rules/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates)
    });
    if (!response.ok) throw new Error('Failed to update risk scoring rule');
    return response.json();
  }

  // Metrics and Analytics
  async getVendorRiskMetrics(): Promise<VendorRiskMetrics> {
    const response = await fetch(`${this.baseUrl}/metrics`);
    if (!response.ok) throw new Error('Failed to fetch vendor risk metrics');
    return response.json();
  }

  async getVendorPerformanceAnalytics(vendorId: string): Promise<any> {
    const response = await fetch(`${this.baseUrl}/vendors/${vendorId}/analytics`);
    if (!response.ok) throw new Error('Failed to fetch vendor performance analytics');
    return response.json();
  }

  // Communication
  async getVendorCommunications(vendorId: string): Promise<VendorCommunication[]> {
    const response = await fetch(`${this.baseUrl}/vendors/${vendorId}/communications`);
    if (!response.ok) throw new Error('Failed to fetch vendor communications');
    return response.json();
  }

  async sendVendorMessage(vendorId: string, message: Omit<VendorCommunication, 'id' | 'sentAt' | 'status'>): Promise<VendorCommunication> {
    const response = await fetch(`${this.baseUrl}/vendors/${vendorId}/communications`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(message)
    });
    if (!response.ok) throw new Error('Failed to send vendor message');
    return response.json();
  }

  // Portal Access
  async getVendorPortalAccess(vendorId: string): Promise<VendorPortalAccess[]> {
    const response = await fetch(`${this.baseUrl}/vendors/${vendorId}/portal-access`);
    if (!response.ok) throw new Error('Failed to fetch vendor portal access');
    return response.json();
  }

  async inviteVendorUser(vendorId: string, email: string, role: string): Promise<VendorPortalAccess> {
    const response = await fetch(`${this.baseUrl}/vendors/${vendorId}/portal-access`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, role })
    });
    if (!response.ok) throw new Error('Failed to invite vendor user');
    return response.json();
  }

  // Automated Monitoring
  async scheduleAssessment(vendorId: string, assessmentType: string, scheduledDate: Date): Promise<VendorAssessment> {
    const response = await fetch(`${this.baseUrl}/vendors/${vendorId}/schedule-assessment`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ assessmentType, scheduledDate })
    });
    if (!response.ok) throw new Error('Failed to schedule assessment');
    return response.json();
  }

  async getExpiringItems(): Promise<{
    dpas: DataProcessingAgreement[];
    certifications: VendorCertification[];
    assessments: VendorAssessment[];
  }> {
    const response = await fetch(`${this.baseUrl}/expiring-items`);
    if (!response.ok) throw new Error('Failed to fetch expiring items');
    return response.json();
  }

  // Reporting
  async generateVendorReport(vendorId: string, reportType: string): Promise<Blob> {
    const response = await fetch(`${this.baseUrl}/vendors/${vendorId}/reports/${reportType}`);
    if (!response.ok) throw new Error('Failed to generate vendor report');
    return response.blob();
  }

  async generateComplianceReport(filters?: any): Promise<Blob> {
    const response = await fetch(`${this.baseUrl}/reports/compliance`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(filters)
    });
    if (!response.ok) throw new Error('Failed to generate compliance report');
    return response.blob();
  }
}

export const vendorRiskService = new VendorRiskService();