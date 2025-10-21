import { 
  DPODashboardMetrics, 
  ComplianceAlert, 
  DataProcessingActivity,
  ExecutiveReport,
  RetentionPolicy 
} from '../types/compliance';

class DPOService {
  private baseUrl = '/api/dpo';

  async getDashboardMetrics(tenantId?: string): Promise<DPODashboardMetrics> {
    const url = tenantId ? `${this.baseUrl}/metrics?tenantId=${tenantId}` : `${this.baseUrl}/metrics`;
    
    try {
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch dashboard metrics: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching dashboard metrics:', error);
      // Return mock data for development
      return {
        totalDataProcessingActivities: 127,
        activeDataSubjectRequests: 23,
        pendingBreachNotifications: 2,
        complianceScore: 87,
        riskLevel: 'medium',
        trendsData: {
          dsarTrend: 12,
          breachTrend: -5,
          complianceTrend: 8
        },
        lastUpdated: new Date()
      };
    }
  }

  async getAlerts(tenantId?: string): Promise<ComplianceAlert[]> {
    const url = tenantId ? `${this.baseUrl}/alerts?tenantId=${tenantId}` : `${this.baseUrl}/alerts`;
    
    try {
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch alerts: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching alerts:', error);
      // Return mock data for development
      return [
        {
          id: '1',
          type: 'deadline',
          severity: 'high',
          title: 'DSAR Response Due',
          description: 'Data subject access request #DSR-2024-001 response due in 2 days',
          dueDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
          assignedTo: 'John Smith',
          status: 'open',
          createdDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000)
        },
        {
          id: '2',
          type: 'breach',
          severity: 'critical',
          title: 'Data Breach Notification Required',
          description: 'Security incident #INC-2024-003 requires regulatory notification',
          assignedTo: 'Jane Doe',
          status: 'open',
          createdDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000)
        }
      ];
    }
  }

  async getDataProcessingActivities(tenantId?: string): Promise<DataProcessingActivity[]> {
    const url = tenantId ? `${this.baseUrl}/processing-activities?tenantId=${tenantId}` : `${this.baseUrl}/processing-activities`;
    
    try {
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch processing activities: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching processing activities:', error);
      return [];
    }
  }

  async createDataProcessingActivity(activity: Partial<DataProcessingActivity>, tenantId?: string): Promise<DataProcessingActivity> {
    const url = tenantId ? `${this.baseUrl}/processing-activities?tenantId=${tenantId}` : `${this.baseUrl}/processing-activities`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(activity)
    });

    if (!response.ok) {
      throw new Error(`Failed to create processing activity: ${response.statusText}`);
    }

    return await response.json();
  }

  async updateDataProcessingActivity(id: string, activity: Partial<DataProcessingActivity>, tenantId?: string): Promise<DataProcessingActivity> {
    const url = tenantId ? `${this.baseUrl}/processing-activities/${id}?tenantId=${tenantId}` : `${this.baseUrl}/processing-activities/${id}`;
    
    const response = await fetch(url, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(activity)
    });

    if (!response.ok) {
      throw new Error(`Failed to update processing activity: ${response.statusText}`);
    }

    return await response.json();
  }

  async deleteDataProcessingActivity(id: string, tenantId?: string): Promise<void> {
    const url = tenantId ? `${this.baseUrl}/processing-activities/${id}?tenantId=${tenantId}` : `${this.baseUrl}/processing-activities/${id}`;
    
    const response = await fetch(url, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to delete processing activity: ${response.statusText}`);
    }
  }

  async getRetentionPolicies(tenantId?: string): Promise<RetentionPolicy[]> {
    const url = tenantId ? `${this.baseUrl}/retention-policies?tenantId=${tenantId}` : `${this.baseUrl}/retention-policies`;
    
    try {
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch retention policies: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching retention policies:', error);
      return [];
    }
  }

  async createRetentionPolicy(policy: Partial<RetentionPolicy>, tenantId?: string): Promise<RetentionPolicy> {
    const url = tenantId ? `${this.baseUrl}/retention-policies?tenantId=${tenantId}` : `${this.baseUrl}/retention-policies`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(policy)
    });

    if (!response.ok) {
      throw new Error(`Failed to create retention policy: ${response.statusText}`);
    }

    return await response.json();
  }

  async generateExecutiveReport(type: 'monthly' | 'quarterly' | 'annual' | 'ad_hoc', tenantId?: string): Promise<ExecutiveReport> {
    const url = tenantId ? `${this.baseUrl}/reports/executive?type=${type}&tenantId=${tenantId}` : `${this.baseUrl}/reports/executive?type=${type}`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to generate executive report: ${response.statusText}`);
    }

    return await response.json();
  }

  async acknowledgeAlert(alertId: string, tenantId?: string): Promise<void> {
    const url = tenantId ? `${this.baseUrl}/alerts/${alertId}/acknowledge?tenantId=${tenantId}` : `${this.baseUrl}/alerts/${alertId}/acknowledge`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to acknowledge alert: ${response.statusText}`);
    }
  }

  async resolveAlert(alertId: string, resolution: string, tenantId?: string): Promise<void> {
    const url = tenantId ? `${this.baseUrl}/alerts/${alertId}/resolve?tenantId=${tenantId}` : `${this.baseUrl}/alerts/${alertId}/resolve`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ resolution })
    });

    if (!response.ok) {
      throw new Error(`Failed to resolve alert: ${response.statusText}`);
    }
  }

  async getDataFlowVisualization(activityId: string, tenantId?: string): Promise<any> {
    const url = tenantId ? `${this.baseUrl}/data-flow/${activityId}?tenantId=${tenantId}` : `${this.baseUrl}/data-flow/${activityId}`;
    
    try {
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch data flow: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching data flow:', error);
      return { nodes: [], connections: [] };
    }
  }

  async getExecutiveMetrics(period: 'monthly' | 'quarterly' | 'annual', tenantId?: string): Promise<any> {
    const url = tenantId ? `${this.baseUrl}/executive/metrics?period=${period}&tenantId=${tenantId}` : `${this.baseUrl}/executive/metrics?period=${period}`;
    
    try {
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch executive metrics: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching executive metrics:', error);
      return null;
    }
  }

  async getTrendAnalysis(period: 'monthly' | 'quarterly' | 'annual', tenantId?: string): Promise<any[]> {
    const url = tenantId ? `${this.baseUrl}/executive/trends?period=${period}&tenantId=${tenantId}` : `${this.baseUrl}/executive/trends?period=${period}`;
    
    try {
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch trend analysis: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching trend analysis:', error);
      return [];
    }
  }

  async getExecutiveReports(tenantId?: string): Promise<ExecutiveReport[]> {
    const url = tenantId ? `${this.baseUrl}/executive/reports?tenantId=${tenantId}` : `${this.baseUrl}/executive/reports`;
    
    try {
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch executive reports: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching executive reports:', error);
      return [];
    }
  }

  async scheduleAutomatedDeletion(policyId: string, scheduledDate: Date, tenantId?: string): Promise<void> {
    const url = tenantId ? `${this.baseUrl}/lifecycle/schedule-deletion?tenantId=${tenantId}` : `${this.baseUrl}/lifecycle/schedule-deletion`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ policyId, scheduledDate })
    });

    if (!response.ok) {
      throw new Error(`Failed to schedule deletion: ${response.statusText}`);
    }
  }

  async getDataMinimizationRecommendations(tenantId?: string): Promise<any[]> {
    const url = tenantId ? `${this.baseUrl}/lifecycle/recommendations?tenantId=${tenantId}` : `${this.baseUrl}/lifecycle/recommendations`;
    
    try {
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch recommendations: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching recommendations:', error);
      return [];
    }
  }
}

export const dpoService = new DPOService();
export default dpoService;