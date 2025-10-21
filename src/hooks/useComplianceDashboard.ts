import { useState, useEffect, useCallback } from 'react';
import { complianceDashboardService, DashboardData } from '../services/complianceDashboardService';
import { complianceReportingService, ReportTemplate, GeneratedReport } from '../services/complianceReportingService';
import { complianceAnalyticsService, TrendAnalysis, ComplianceKPI } from '../services/complianceAnalyticsService';
import { ComplianceFramework } from '../types/compliance';

interface UseComplianceDashboardOptions {
  autoRefresh?: boolean;
  refreshInterval?: number; // milliseconds
  period?: { start: Date; end: Date };
}

interface UseComplianceDashboardReturn {
  // Data
  dashboardData: DashboardData | null;
  reportTemplates: ReportTemplate[];
  generatedReports: GeneratedReport[];
  trendAnalysis: Record<ComplianceFramework | 'overall', TrendAnalysis | null>;
  kpis: ComplianceKPI[];
  
  // Loading states
  loading: boolean;
  refreshing: boolean;
  generating: boolean;
  
  // Error states
  error: string | null;
  
  // Actions
  refreshData: () => Promise<void>;
  exportDashboard: (format: 'json' | 'csv' | 'pdf') => Promise<void>;
  generateReport: (templateId: string) => Promise<GeneratedReport>;
  scheduleReport: (templateId: string, schedule: any) => Promise<void>;
  createReportTemplate: (template: Omit<ReportTemplate, 'id' | 'createdAt' | 'updatedAt'>) => Promise<ReportTemplate>;
  
  // Utilities
  lastRefresh: Date | null;
  isRealTime: boolean;
  toggleRealTime: () => void;
}

export const useComplianceDashboard = (options: UseComplianceDashboardOptions = {}): UseComplianceDashboardReturn => {
  const {
    autoRefresh = false,
    refreshInterval = 30000, // 30 seconds
    period = {
      start: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000), // 90 days ago
      end: new Date()
    }
  } = options;

  // State
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [reportTemplates, setReportTemplates] = useState<ReportTemplate[]>([]);
  const [generatedReports, setGeneratedReports] = useState<GeneratedReport[]>([]);
  const [trendAnalysis, setTrendAnalysis] = useState<Record<ComplianceFramework | 'overall', TrendAnalysis | null>>({
    overall: null,
    GDPR: null,
    PDPL: null,
    HIPAA: null,
    CCPA: null
  });
  const [kpis, setKpis] = useState<ComplianceKPI[]>([]);
  
  // Loading states
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [generating, setGenerating] = useState(false);
  
  // Error state
  const [error, setError] = useState<string | null>(null);
  
  // Utilities
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const [isRealTime, setIsRealTime] = useState(autoRefresh);

  // Fetch dashboard data
  const fetchDashboardData = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);

      const [
        dashboard,
        templates,
        reports,
        kpiData
      ] = await Promise.all([
        complianceDashboardService.getDashboardData(period),
        complianceReportingService.getTemplates(),
        complianceReportingService.getGeneratedReports(),
        complianceAnalyticsService.getKPIs()
      ]);

      setDashboardData(dashboard);
      setReportTemplates(templates);
      setGeneratedReports(reports);
      setKpis(kpiData);
      setLastRefresh(new Date());

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch dashboard data');
      console.error('Dashboard data fetch error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [period]);

  // Fetch trend analysis for all frameworks
  const fetchTrendAnalysis = useCallback(async () => {
    try {
      const frameworks: (ComplianceFramework | 'overall')[] = ['overall', 'GDPR', 'PDPL', 'HIPAA', 'CCPA'];
      
      const trends = await Promise.all(
        frameworks.map(framework => 
          complianceAnalyticsService.getTrendAnalysis(framework, period)
        )
      );

      const trendMap = frameworks.reduce((acc, framework, index) => {
        acc[framework] = trends[index];
        return acc;
      }, {} as Record<ComplianceFramework | 'overall', TrendAnalysis>);

      setTrendAnalysis(trendMap);
    } catch (err) {
      console.error('Trend analysis fetch error:', err);
    }
  }, [period]);

  // Initial data load
  useEffect(() => {
    fetchDashboardData();
    fetchTrendAnalysis();
  }, [fetchDashboardData, fetchTrendAnalysis]);

  // Auto-refresh setup
  useEffect(() => {
    if (!isRealTime) return;

    const interval = setInterval(() => {
      fetchDashboardData(true);
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [isRealTime, refreshInterval, fetchDashboardData]);

  // Actions
  const refreshData = useCallback(async () => {
    await Promise.all([
      fetchDashboardData(true),
      fetchTrendAnalysis()
    ]);
  }, [fetchDashboardData, fetchTrendAnalysis]);

  const exportDashboard = useCallback(async (format: 'json' | 'csv' | 'pdf') => {
    try {
      const blob = await complianceDashboardService.exportDashboardData(format, period);
      
      // Create download link
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `compliance-dashboard-${new Date().toISOString().split('T')[0]}.${format}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to export dashboard');
      throw err;
    }
  }, [period]);

  const generateReport = useCallback(async (templateId: string): Promise<GeneratedReport> => {
    try {
      setGenerating(true);
      const report = await complianceReportingService.generateReport(templateId);
      
      // Refresh generated reports list
      const updatedReports = await complianceReportingService.getGeneratedReports();
      setGeneratedReports(updatedReports);
      
      return report;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate report');
      throw err;
    } finally {
      setGenerating(false);
    }
  }, []);

  const scheduleReport = useCallback(async (templateId: string, schedule: any) => {
    try {
      await complianceReportingService.scheduleReport(templateId, schedule);
      
      // Refresh templates to get updated schedule info
      const updatedTemplates = await complianceReportingService.getTemplates();
      setReportTemplates(updatedTemplates);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to schedule report');
      throw err;
    }
  }, []);

  const createReportTemplate = useCallback(async (template: Omit<ReportTemplate, 'id' | 'createdAt' | 'updatedAt'>): Promise<ReportTemplate> => {
    try {
      const newTemplate = await complianceReportingService.createTemplate(template);
      
      // Refresh templates list
      const updatedTemplates = await complianceReportingService.getTemplates();
      setReportTemplates(updatedTemplates);
      
      return newTemplate;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create report template');
      throw err;
    }
  }, []);

  const toggleRealTime = useCallback(() => {
    setIsRealTime(prev => !prev);
  }, []);

  return {
    // Data
    dashboardData,
    reportTemplates,
    generatedReports,
    trendAnalysis,
    kpis,
    
    // Loading states
    loading,
    refreshing,
    generating,
    
    // Error state
    error,
    
    // Actions
    refreshData,
    exportDashboard,
    generateReport,
    scheduleReport,
    createReportTemplate,
    
    // Utilities
    lastRefresh,
    isRealTime,
    toggleRealTime
  };
};