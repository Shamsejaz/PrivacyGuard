import { useState, useEffect, useCallback } from 'react';
import { policyService } from '../services/policyService';
import type {
  PolicyDocument,
  PolicyTemplate,
  PolicySearchFilters,
  CreatePolicyRequest,
  UpdatePolicyRequest,
  PolicyApprovalRequest,
  GeneratePolicyFromTemplateRequest,
  PolicyAnalytics,
  PolicyComplianceReport,
  PolicyEffectivenessMetrics,
  PolicyGap
} from '../services/policyService';

export interface UsePolicyManagementReturn {
  // State
  policies: PolicyDocument[];
  templates: PolicyTemplate[];
  analytics: PolicyAnalytics | null;
  loading: boolean;
  error: string | null;
  
  // Policy operations
  searchPolicies: (filters?: PolicySearchFilters) => Promise<void>;
  createPolicy: (policyData: CreatePolicyRequest) => Promise<PolicyDocument>;
  updatePolicy: (id: string, updates: UpdatePolicyRequest) => Promise<PolicyDocument>;
  deletePolicy: (id: string) => Promise<void>;
  approvePolicy: (id: string, approval: PolicyApprovalRequest) => Promise<PolicyDocument>;
  createNewVersion: (id: string, changes: string, majorVersion?: boolean) => Promise<PolicyDocument>;
  
  // Template operations
  loadTemplates: (filters?: any) => Promise<void>;
  generateFromTemplate: (request: GeneratePolicyFromTemplateRequest) => Promise<PolicyDocument>;
  
  // Analytics operations
  loadAnalytics: (filters?: any) => Promise<void>;
  getComplianceReport: (id: string) => Promise<PolicyComplianceReport>;
  getEffectivenessMetrics: (id: string) => Promise<PolicyEffectivenessMetrics>;
  getGapAnalysis: (id: string) => Promise<PolicyGap[]>;
  
  // Utility functions
  refreshData: () => Promise<void>;
  clearError: () => void;
}

export const usePolicyManagement = (): UsePolicyManagementReturn => {
  const [policies, setPolicies] = useState<PolicyDocument[]>([]);
  const [templates, setTemplates] = useState<PolicyTemplate[]>([]);
  const [analytics, setAnalytics] = useState<PolicyAnalytics | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Error handling helper
  const handleError = useCallback((error: any, operation: string) => {
    console.error(`Error in ${operation}:`, error);
    const message = error.response?.data?.error || error.message || `Failed to ${operation}`;
    setError(message);
  }, []);

  // Clear error
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Search policies
  const searchPolicies = useCallback(async (filters: PolicySearchFilters = {}) => {
    try {
      setLoading(true);
      setError(null);
      
      const result = await policyService.searchPolicies(filters);
      setPolicies(result.policies);
    } catch (error) {
      handleError(error, 'search policies');
    } finally {
      setLoading(false);
    }
  }, [handleError]);

  // Create policy
  const createPolicy = useCallback(async (policyData: CreatePolicyRequest): Promise<PolicyDocument> => {
    try {
      setLoading(true);
      setError(null);
      
      const newPolicy = await policyService.createPolicy(policyData);
      setPolicies(prev => [newPolicy, ...prev]);
      
      return newPolicy;
    } catch (error) {
      handleError(error, 'create policy');
      throw error;
    } finally {
      setLoading(false);
    }
  }, [handleError]);

  // Update policy
  const updatePolicy = useCallback(async (id: string, updates: UpdatePolicyRequest): Promise<PolicyDocument> => {
    try {
      setLoading(true);
      setError(null);
      
      const updatedPolicy = await policyService.updatePolicy(id, updates);
      setPolicies(prev => prev.map(p => p._id === id ? updatedPolicy : p));
      
      return updatedPolicy;
    } catch (error) {
      handleError(error, 'update policy');
      throw error;
    } finally {
      setLoading(false);
    }
  }, [handleError]);

  // Delete policy
  const deletePolicy = useCallback(async (id: string): Promise<void> => {
    try {
      setLoading(true);
      setError(null);
      
      await policyService.deletePolicy(id);
      setPolicies(prev => prev.filter(p => p._id !== id));
    } catch (error) {
      handleError(error, 'delete policy');
      throw error;
    } finally {
      setLoading(false);
    }
  }, [handleError]);

  // Approve policy
  const approvePolicy = useCallback(async (id: string, approval: PolicyApprovalRequest): Promise<PolicyDocument> => {
    try {
      setLoading(true);
      setError(null);
      
      const approvedPolicy = await policyService.approvePolicy(id, approval);
      setPolicies(prev => prev.map(p => p._id === id ? approvedPolicy : p));
      
      return approvedPolicy;
    } catch (error) {
      handleError(error, 'approve policy');
      throw error;
    } finally {
      setLoading(false);
    }
  }, [handleError]);

  // Create new version
  const createNewVersion = useCallback(async (id: string, changes: string, majorVersion: boolean = false): Promise<PolicyDocument> => {
    try {
      setLoading(true);
      setError(null);
      
      const newVersionPolicy = await policyService.createNewVersion(id, changes, majorVersion);
      setPolicies(prev => prev.map(p => p._id === id ? newVersionPolicy : p));
      
      return newVersionPolicy;
    } catch (error) {
      handleError(error, 'create new version');
      throw error;
    } finally {
      setLoading(false);
    }
  }, [handleError]);

  // Load templates
  const loadTemplates = useCallback(async (filters: any = {}) => {
    try {
      setLoading(true);
      setError(null);
      
      const templatesData = await policyService.getTemplates(filters);
      setTemplates(templatesData);
    } catch (error) {
      handleError(error, 'load templates');
    } finally {
      setLoading(false);
    }
  }, [handleError]);

  // Generate from template
  const generateFromTemplate = useCallback(async (request: GeneratePolicyFromTemplateRequest): Promise<PolicyDocument> => {
    try {
      setLoading(true);
      setError(null);
      
      const generatedPolicy = await policyService.generatePolicyFromTemplate(request);
      setPolicies(prev => [generatedPolicy, ...prev]);
      
      return generatedPolicy;
    } catch (error) {
      handleError(error, 'generate policy from template');
      throw error;
    } finally {
      setLoading(false);
    }
  }, [handleError]);

  // Load analytics
  const loadAnalytics = useCallback(async (filters: any = {}) => {
    try {
      setLoading(true);
      setError(null);
      
      const analyticsData = await policyService.getDashboardAnalytics(filters);
      setAnalytics(analyticsData);
    } catch (error) {
      handleError(error, 'load analytics');
    } finally {
      setLoading(false);
    }
  }, [handleError]);

  // Get compliance report
  const getComplianceReport = useCallback(async (id: string): Promise<PolicyComplianceReport> => {
    try {
      setError(null);
      return await policyService.getComplianceReport(id);
    } catch (error) {
      handleError(error, 'get compliance report');
      throw error;
    }
  }, [handleError]);

  // Get effectiveness metrics
  const getEffectivenessMetrics = useCallback(async (id: string): Promise<PolicyEffectivenessMetrics> => {
    try {
      setError(null);
      return await policyService.getEffectivenessMetrics(id);
    } catch (error) {
      handleError(error, 'get effectiveness metrics');
      throw error;
    }
  }, [handleError]);

  // Get gap analysis
  const getGapAnalysis = useCallback(async (id: string): Promise<PolicyGap[]> => {
    try {
      setError(null);
      return await policyService.getGapAnalysis(id);
    } catch (error) {
      handleError(error, 'get gap analysis');
      throw error;
    }
  }, [handleError]);

  // Refresh all data
  const refreshData = useCallback(async () => {
    await Promise.all([
      searchPolicies(),
      loadTemplates(),
      loadAnalytics()
    ]);
  }, [searchPolicies, loadTemplates, loadAnalytics]);

  // Load initial data
  useEffect(() => {
    refreshData();
  }, [refreshData]);

  return {
    // State
    policies,
    templates,
    analytics,
    loading,
    error,
    
    // Policy operations
    searchPolicies,
    createPolicy,
    updatePolicy,
    deletePolicy,
    approvePolicy,
    createNewVersion,
    
    // Template operations
    loadTemplates,
    generateFromTemplate,
    
    // Analytics operations
    loadAnalytics,
    getComplianceReport,
    getEffectivenessMetrics,
    getGapAnalysis,
    
    // Utility functions
    refreshData,
    clearError
  };
};