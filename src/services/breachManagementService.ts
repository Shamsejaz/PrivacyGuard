import { 
  DataBreach, 
  BreachDetectionRule, 
  BreachNotificationTemplate, 
  BreachWorkflow,
  BreachDashboardMetrics,
  ContainmentAction,
  RemediationAction,
  BreachTimelineEvent,
  BreachEvidence,
  PostIncidentAnalysis,
  RegulatoryNotification,
  DataSubjectNotification
} from '../types/breach-management';

class BreachManagementService {
  private baseUrl = '/api/breach-management';

  // Breach Detection and Classification
  async detectBreach(detectionData: any): Promise<DataBreach> {
    const response = await fetch(`${this.baseUrl}/detect`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(detectionData)
    });
    return response.json();
  }

  async classifyBreach(breachId: string, classification: any): Promise<DataBreach> {
    const response = await fetch(`${this.baseUrl}/${breachId}/classify`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(classification)
    });
    return response.json();
  }

  async assessBreachRisk(breachId: string, riskData: any): Promise<DataBreach> {
    const response = await fetch(`${this.baseUrl}/${breachId}/risk-assessment`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(riskData)
    });
    return response.json();
  }

  // Breach Management
  async getBreaches(filters?: any): Promise<DataBreach[]> {
    const queryParams = filters ? `?${new URLSearchParams(filters)}` : '';
    const response = await fetch(`${this.baseUrl}/breaches${queryParams}`);
    return response.json();
  }

  async getBreach(breachId: string): Promise<DataBreach> {
    const response = await fetch(`${this.baseUrl}/breaches/${breachId}`);
    return response.json();
  }

  async createBreach(breachData: Partial<DataBreach>): Promise<DataBreach> {
    const response = await fetch(`${this.baseUrl}/breaches`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(breachData)
    });
    return response.json();
  }

  async updateBreach(breachId: string, updates: Partial<DataBreach>): Promise<DataBreach> {
    const response = await fetch(`${this.baseUrl}/breaches/${breachId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates)
    });
    return response.json();
  }

  async updateBreachStatus(breachId: string, status: string, notes?: string): Promise<DataBreach> {
    const response = await fetch(`${this.baseUrl}/breaches/${breachId}/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, notes })
    });
    return response.json();
  }

  // Incident Response Workflows
  async executeWorkflow(breachId: string, workflowId: string): Promise<void> {
    await fetch(`${this.baseUrl}/breaches/${breachId}/workflows/${workflowId}/execute`, {
      method: 'POST'
    });
  }

  async escalateBreach(breachId: string, escalationData: any): Promise<DataBreach> {
    const response = await fetch(`${this.baseUrl}/breaches/${breachId}/escalate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(escalationData)
    });
    return response.json();
  }

  // Containment Actions
  async addContainmentAction(breachId: string, action: Partial<ContainmentAction>): Promise<ContainmentAction> {
    const response = await fetch(`${this.baseUrl}/breaches/${breachId}/containment-actions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(action)
    });
    return response.json();
  }

  async updateContainmentAction(breachId: string, actionId: string, updates: Partial<ContainmentAction>): Promise<ContainmentAction> {
    const response = await fetch(`${this.baseUrl}/breaches/${breachId}/containment-actions/${actionId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates)
    });
    return response.json();
  }

  // Breach Notifications
  async generateRegulatoryNotification(breachId: string, templateId: string): Promise<RegulatoryNotification> {
    const response = await fetch(`${this.baseUrl}/breaches/${breachId}/regulatory-notifications`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ templateId })
    });
    return response.json();
  }

  async sendRegulatoryNotification(breachId: string, notificationId: string): Promise<void> {
    await fetch(`${this.baseUrl}/breaches/${breachId}/regulatory-notifications/${notificationId}/send`, {
      method: 'POST'
    });
  }

  async generateDataSubjectNotification(breachId: string, templateId: string): Promise<DataSubjectNotification> {
    const response = await fetch(`${this.baseUrl}/breaches/${breachId}/data-subject-notifications`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ templateId })
    });
    return response.json();
  }

  async sendDataSubjectNotification(breachId: string, notificationId: string): Promise<void> {
    await fetch(`${this.baseUrl}/breaches/${breachId}/data-subject-notifications/${notificationId}/send`, {
      method: 'POST'
    });
  }

  async checkNotificationDeadlines(): Promise<any[]> {
    const response = await fetch(`${this.baseUrl}/notifications/deadlines`);
    return response.json();
  }

  // Timeline and Evidence
  async addTimelineEvent(breachId: string, event: Partial<BreachTimelineEvent>): Promise<BreachTimelineEvent> {
    const response = await fetch(`${this.baseUrl}/breaches/${breachId}/timeline`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(event)
    });
    return response.json();
  }

  async addEvidence(breachId: string, evidence: Partial<BreachEvidence>): Promise<BreachEvidence> {
    const response = await fetch(`${this.baseUrl}/breaches/${breachId}/evidence`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(evidence)
    });
    return response.json();
  }

  async uploadEvidenceFile(breachId: string, file: File, metadata: any): Promise<BreachEvidence> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('metadata', JSON.stringify(metadata));

    const response = await fetch(`${this.baseUrl}/breaches/${breachId}/evidence/upload`, {
      method: 'POST',
      body: formData
    });
    return response.json();
  }

  // Remediation Actions
  async addRemediationAction(breachId: string, action: Partial<RemediationAction>): Promise<RemediationAction> {
    const response = await fetch(`${this.baseUrl}/breaches/${breachId}/remediation-actions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(action)
    });
    return response.json();
  }

  async updateRemediationAction(breachId: string, actionId: string, updates: Partial<RemediationAction>): Promise<RemediationAction> {
    const response = await fetch(`${this.baseUrl}/breaches/${breachId}/remediation-actions/${actionId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates)
    });
    return response.json();
  }

  // Post-Incident Analysis
  async createPostIncidentAnalysis(breachId: string, analysis: Partial<PostIncidentAnalysis>): Promise<PostIncidentAnalysis> {
    const response = await fetch(`${this.baseUrl}/breaches/${breachId}/post-incident-analysis`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(analysis)
    });
    return response.json();
  }

  async updatePostIncidentAnalysis(breachId: string, updates: Partial<PostIncidentAnalysis>): Promise<PostIncidentAnalysis> {
    const response = await fetch(`${this.baseUrl}/breaches/${breachId}/post-incident-analysis`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates)
    });
    return response.json();
  }

  async approvePostIncidentAnalysis(breachId: string): Promise<PostIncidentAnalysis> {
    const response = await fetch(`${this.baseUrl}/breaches/${breachId}/post-incident-analysis/approve`, {
      method: 'POST'
    });
    return response.json();
  }

  // Detection Rules
  async getDetectionRules(): Promise<BreachDetectionRule[]> {
    const response = await fetch(`${this.baseUrl}/detection-rules`);
    return response.json();
  }

  async createDetectionRule(rule: Partial<BreachDetectionRule>): Promise<BreachDetectionRule> {
    const response = await fetch(`${this.baseUrl}/detection-rules`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(rule)
    });
    return response.json();
  }

  async updateDetectionRule(ruleId: string, updates: Partial<BreachDetectionRule>): Promise<BreachDetectionRule> {
    const response = await fetch(`${this.baseUrl}/detection-rules/${ruleId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates)
    });
    return response.json();
  }

  async toggleDetectionRule(ruleId: string, enabled: boolean): Promise<BreachDetectionRule> {
    const response = await fetch(`${this.baseUrl}/detection-rules/${ruleId}/toggle`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enabled })
    });
    return response.json();
  }

  // Notification Templates
  async getNotificationTemplates(type?: string): Promise<BreachNotificationTemplate[]> {
    const queryParams = type ? `?type=${type}` : '';
    const response = await fetch(`${this.baseUrl}/notification-templates${queryParams}`);
    return response.json();
  }

  async createNotificationTemplate(template: Partial<BreachNotificationTemplate>): Promise<BreachNotificationTemplate> {
    const response = await fetch(`${this.baseUrl}/notification-templates`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(template)
    });
    return response.json();
  }

  async updateNotificationTemplate(templateId: string, updates: Partial<BreachNotificationTemplate>): Promise<BreachNotificationTemplate> {
    const response = await fetch(`${this.baseUrl}/notification-templates/${templateId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates)
    });
    return response.json();
  }

  // Workflows
  async getWorkflows(): Promise<BreachWorkflow[]> {
    const response = await fetch(`${this.baseUrl}/workflows`);
    return response.json();
  }

  async createWorkflow(workflow: Partial<BreachWorkflow>): Promise<BreachWorkflow> {
    const response = await fetch(`${this.baseUrl}/workflows`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(workflow)
    });
    return response.json();
  }

  async updateWorkflow(workflowId: string, updates: Partial<BreachWorkflow>): Promise<BreachWorkflow> {
    const response = await fetch(`${this.baseUrl}/workflows/${workflowId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates)
    });
    return response.json();
  }

  // Dashboard and Metrics
  async getDashboardMetrics(dateRange?: { start: Date; end: Date }): Promise<BreachDashboardMetrics> {
    const queryParams = dateRange ? `?start=${dateRange.start.toISOString()}&end=${dateRange.end.toISOString()}` : '';
    const response = await fetch(`${this.baseUrl}/dashboard/metrics${queryParams}`);
    return response.json();
  }

  async exportBreachReport(breachId: string, format: 'pdf' | 'docx' | 'json'): Promise<Blob> {
    const response = await fetch(`${this.baseUrl}/breaches/${breachId}/export?format=${format}`);
    return response.blob();
  }

  async generateComplianceReport(filters?: any): Promise<Blob> {
    const queryParams = filters ? `?${new URLSearchParams(filters)}` : '';
    const response = await fetch(`${this.baseUrl}/reports/compliance${queryParams}`);
    return response.blob();
  }
}

export const breachManagementService = new BreachManagementService();