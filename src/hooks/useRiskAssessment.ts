import { useState, useEffect, useCallback } from 'react';
import { 
  riskAssessmentService, 
  RiskAssessment, 
  ComplianceFinding, 
  RiskMetrics, 
  RiskTrend,
  CreateRiskAssessmentRequest,
  UpdateRiskAssessmentRequest,
  CreateComplianceFindingRequest,
  RiskFilters,
  ComplianceFilters,
  PaginatedResponse
} from '../services/riskAssessmentService';

export interface UseRiskAssessmentReturn {
  // Risk Assessments
  riskAssessments: RiskAssessment[];
  riskAssessmentsLoading: boolean;
  riskAssessmentsError: string | null;
  riskAssessmentsPagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  } | null;
  
  // Compliance Findings
  complianceFindings: ComplianceFinding[];
  complianceFindingsLoading: boolean;
  complianceFindingsError: string | null;
  complianceFindingsPagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  } | null;
  
  // Metrics and Analytics
  riskMetrics: RiskMetrics | null;
  riskMetricsLoading: boolean;
  riskMetricsError: string | null;
  
  riskTrends: RiskTrend[];
  riskTrendsLoading: boolean;
  riskTrendsError: string | null;
  
  // Actions
  fetchRiskAssessments: (filters?: RiskFilters) => Promise<void>;
  fetchRiskAssessmentById: (id: string) => Promise<RiskAssessment | null>;
  createRiskAssessment: (data: CreateRiskAssessmentRequest) => Promise<RiskAssessment | null>;
  updateRiskAssessment: (id: string, data: UpdateRiskAssessmentRequest) => Promise<RiskAssessment | null>;
  deleteRiskAssessment: (id: string) => Promise<boolean>;
  
  fetchComplianceFindings: (filters?: ComplianceFilters) => Promise<void>;
  fetchComplianceFindingById: (id: string) => Promise<ComplianceFinding | null>;
  createComplianceFinding: (data: CreateComplianceFindingRequest) => Promise<ComplianceFinding | null>;
  updateComplianceFinding: (id: string, data: Partial<ComplianceFinding>) => Promise<ComplianceFinding | null>;
  
  fetchRiskMetrics: () => Promise<void>;
  fetchRiskTrends: (days?: number) => Promise<void>;
  calculateRiskScore: (impact: number, likelihood: number) => Promise<{
    impact: number;
    likelihood: number;
    overallScore: number;
    riskLevel: 'low' | 'medium' | 'high' | 'critical';
  } | null>;
  
  refreshAll: () => Promise<void>;
}

export const useRiskAssessment = (): UseRiskAssessmentReturn => {
  // Risk Assessments State
  const [riskAssessments, setRiskAssessments] = useState<RiskAssessment[]>([]);
  const [riskAssessmentsLoading, setRiskAssessmentsLoading] = useState(false);
  const [riskAssessmentsError, setRiskAssessmentsError] = useState<string | null>(null);
  const [riskAssessmentsPagination, setRiskAssessmentsPagination] = useState<{
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  } | null>(null);

  // Compliance Findings State
  const [complianceFindings, setComplianceFindings] = useState<ComplianceFinding[]>([]);
  const [complianceFindingsLoading, setComplianceFindingsLoading] = useState(false);
  const [complianceFindingsError, setComplianceFindingsError] = useState<string | null>(null);
  const [complianceFindingsPagination, setComplianceFindingsPagination] = useState<{
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  } | null>(null);

  // Metrics State
  const [riskMetrics, setRiskMetrics] = useState<RiskMetrics | null>(null);
  const [riskMetricsLoading, setRiskMetricsLoading] = useState(false);
  const [riskMetricsError, setRiskMetricsError] = useState<string | null>(null);

  // Trends State
  const [riskTrends, setRiskTrends] = useState<RiskTrend[]>([]);
  const [riskTrendsLoading, setRiskTrendsLoading] = useState(false);
  const [riskTrendsError, setRiskTrendsError] = useState<string | null>(null);

  // Risk Assessment Actions
  const fetchRiskAssessments = useCallback(async (filters?: RiskFilters) => {
    setRiskAssessmentsLoading(true);
    setRiskAssessmentsError(null);
    
    try {
      const response = await riskAssessmentService.getRiskAssessments(filters);
      setRiskAssessments(response.items);
      setRiskAssessmentsPagination({
        total: response.total,
        page: response.page,
        limit: response.limit,
        totalPages: response.totalPages
      });
    } catch (error) {
      setRiskAssessmentsError(error instanceof Error ? error.message : 'Failed to fetch risk assessments');
      console.error('Error fetching risk assessments:', error);
    } finally {
      setRiskAssessmentsLoading(false);
    }
  }, []);

  const fetchRiskAssessmentById = useCallback(async (id: string): Promise<RiskAssessment | null> => {
    try {
      return await riskAssessmentService.getRiskAssessmentById(id);
    } catch (error) {
      console.error('Error fetching risk assessment:', error);
      return null;
    }
  }, []);

  const createRiskAssessment = useCallback(async (data: CreateRiskAssessmentRequest): Promise<RiskAssessment | null> => {
    try {
      const newAssessment = await riskAssessmentService.createRiskAssessment(data);
      setRiskAssessments(prev => [newAssessment, ...prev]);
      return newAssessment;
    } catch (error) {
      console.error('Error creating risk assessment:', error);
      return null;
    }
  }, []);

  const updateRiskAssessment = useCallback(async (id: string, data: UpdateRiskAssessmentRequest): Promise<RiskAssessment | null> => {
    try {
      const updatedAssessment = await riskAssessmentService.updateRiskAssessment(id, data);
      setRiskAssessments(prev => prev.map(assessment => 
        assessment.id === id ? updatedAssessment : assessment
      ));
      return updatedAssessment;
    } catch (error) {
      console.error('Error updating risk assessment:', error);
      return null;
    }
  }, []);

  const deleteRiskAssessment = useCallback(async (id: string): Promise<boolean> => {
    try {
      await riskAssessmentService.deleteRiskAssessment(id);
      setRiskAssessments(prev => prev.filter(assessment => assessment.id !== id));
      return true;
    } catch (error) {
      console.error('Error deleting risk assessment:', error);
      return false;
    }
  }, []);

  // Compliance Finding Actions
  const fetchComplianceFindings = useCallback(async (filters?: ComplianceFilters) => {
    setComplianceFindingsLoading(true);
    setComplianceFindingsError(null);
    
    try {
      const response = await riskAssessmentService.getComplianceFindings(filters);
      setComplianceFindings(response.items);
      setComplianceFindingsPagination({
        total: response.total,
        page: response.page,
        limit: response.limit,
        totalPages: response.totalPages
      });
    } catch (error) {
      setComplianceFindingsError(error instanceof Error ? error.message : 'Failed to fetch compliance findings');
      console.error('Error fetching compliance findings:', error);
    } finally {
      setComplianceFindingsLoading(false);
    }
  }, []);

  const fetchComplianceFindingById = useCallback(async (id: string): Promise<ComplianceFinding | null> => {
    try {
      return await riskAssessmentService.getComplianceFindingById(id);
    } catch (error) {
      console.error('Error fetching compliance finding:', error);
      return null;
    }
  }, []);

  const createComplianceFinding = useCallback(async (data: CreateComplianceFindingRequest): Promise<ComplianceFinding | null> => {
    try {
      const newFinding = await riskAssessmentService.createComplianceFinding(data);
      setComplianceFindings(prev => [newFinding, ...prev]);
      return newFinding;
    } catch (error) {
      console.error('Error creating compliance finding:', error);
      return null;
    }
  }, []);

  const updateComplianceFinding = useCallback(async (id: string, data: Partial<ComplianceFinding>): Promise<ComplianceFinding | null> => {
    try {
      const updatedFinding = await riskAssessmentService.updateComplianceFinding(id, data);
      setComplianceFindings(prev => prev.map(finding => 
        finding.id === id ? updatedFinding : finding
      ));
      return updatedFinding;
    } catch (error) {
      console.error('Error updating compliance finding:', error);
      return null;
    }
  }, []);

  // Analytics Actions
  const fetchRiskMetrics = useCallback(async () => {
    setRiskMetricsLoading(true);
    setRiskMetricsError(null);
    
    try {
      const metrics = await riskAssessmentService.getRiskMetrics();
      setRiskMetrics(metrics);
    } catch (error) {
      setRiskMetricsError(error instanceof Error ? error.message : 'Failed to fetch risk metrics');
      console.error('Error fetching risk metrics:', error);
    } finally {
      setRiskMetricsLoading(false);
    }
  }, []);

  const fetchRiskTrends = useCallback(async (days: number = 30) => {
    setRiskTrendsLoading(true);
    setRiskTrendsError(null);
    
    try {
      const trends = await riskAssessmentService.getRiskTrends(days);
      setRiskTrends(trends);
    } catch (error) {
      setRiskTrendsError(error instanceof Error ? error.message : 'Failed to fetch risk trends');
      console.error('Error fetching risk trends:', error);
    } finally {
      setRiskTrendsLoading(false);
    }
  }, []);

  const calculateRiskScore = useCallback(async (impact: number, likelihood: number) => {
    try {
      return await riskAssessmentService.calculateRiskScore(impact, likelihood);
    } catch (error) {
      console.error('Error calculating risk score:', error);
      return null;
    }
  }, []);

  const refreshAll = useCallback(async () => {
    await Promise.all([
      fetchRiskAssessments(),
      fetchComplianceFindings(),
      fetchRiskMetrics(),
      fetchRiskTrends()
    ]);
  }, [fetchRiskAssessments, fetchComplianceFindings, fetchRiskMetrics, fetchRiskTrends]);

  // Initial data fetch
  useEffect(() => {
    refreshAll();
  }, []);

  return {
    // Risk Assessments
    riskAssessments,
    riskAssessmentsLoading,
    riskAssessmentsError,
    riskAssessmentsPagination,
    
    // Compliance Findings
    complianceFindings,
    complianceFindingsLoading,
    complianceFindingsError,
    complianceFindingsPagination,
    
    // Metrics and Analytics
    riskMetrics,
    riskMetricsLoading,
    riskMetricsError,
    
    riskTrends,
    riskTrendsLoading,
    riskTrendsError,
    
    // Actions
    fetchRiskAssessments,
    fetchRiskAssessmentById,
    createRiskAssessment,
    updateRiskAssessment,
    deleteRiskAssessment,
    
    fetchComplianceFindings,
    fetchComplianceFindingById,
    createComplianceFinding,
    updateComplianceFinding,
    
    fetchRiskMetrics,
    fetchRiskTrends,
    calculateRiskScore,
    
    refreshAll
  };
};