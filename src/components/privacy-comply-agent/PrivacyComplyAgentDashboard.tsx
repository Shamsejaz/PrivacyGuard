import React, { useState, useEffect } from 'react';
import Card from '../ui/Card';
import Button from '../ui/Button';
import Badge from '../ui/Badge';
import ProgressBar from '../ui/ProgressBar';
import { 
  Shield, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  Activity,
  Settings,
  Play,
  Pause,
  RefreshCw,
  Download,
  MessageSquare
} from 'lucide-react';
import { AgentStatusDisplay } from './AgentStatusDisplay';
import { ComplianceFindingsTable } from './ComplianceFindingsTable';
import { RemediationWorkflowPanel } from './RemediationWorkflowPanel';
import { NaturalLanguageQueryInterface } from './NaturalLanguageQueryInterface';
import { SimpleOnboardingWizard } from './SimpleOnboardingWizard';
import { SetupStatusCard } from './SetupStatusCard';

interface AgentStatus {
  status: 'HEALTHY' | 'DEGRADED' | 'UNHEALTHY';
  initialized: boolean;
  monitoring: boolean;
  services: Record<string, boolean>;
  lastScan: string;
  nextScan: string;
  activeWorkflows: number;
  activeRemediations: number;
  systemHealth: {
    overallScore: number;
    categoryScores: Record<string, number>;
    criticalIssues: number;
  };
}

interface ComplianceMetrics {
  totalFindings: number;
  findingsBySeverity: Record<string, number>;
  findingsByType: Record<string, number>;
  complianceScore: number;
  trends: Array<{
    period: string;
    findings: number;
    resolved: number;
    score: number;
  }>;
}

interface SetupStatus {
  isSetupComplete: boolean;
  setupProgress: number;
  awsConfigured: boolean;
  servicesEnabled: boolean;
  validationPassed: boolean;
  lastSetupAttempt?: string;
  setupErrors: string[];
}

/**
 * AWS PrivacyComply Agent Dashboard
 * 
 * Main dashboard for the AWS-specific privacy compliance agent.
 * Part of a multi-cloud privacy compliance framework that includes
 * dedicated agents for AWS, Azure, GCP, and other cloud providers.
 */
export const PrivacyComplyAgentDashboard: React.FC = () => {
  const [agentStatus, setAgentStatus] = useState<AgentStatus | null>(null);
  const [complianceMetrics, setComplianceMetrics] = useState<ComplianceMetrics | null>(null);
  const [setupStatus, setSetupStatus] = useState<SetupStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'findings' | 'remediation' | 'query'>('overview');
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    loadDashboardData();
    const interval = setInterval(loadDashboardData, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      
      // In a real implementation, these would be actual API calls
      // For now, we'll simulate the data
      const mockAgentStatus: AgentStatus = {
        status: 'HEALTHY',
        initialized: true,
        monitoring: true,
        services: {
          'riskDetector': true,
          'reasoningEngine': true,
          'remediationService': true,
          'reportingService': true,
          'nlInterface': true
        },
        lastScan: new Date(Date.now() - 1800000).toISOString(), // 30 minutes ago
        nextScan: new Date(Date.now() + 1800000).toISOString(), // 30 minutes from now
        activeWorkflows: 2,
        activeRemediations: 1,
        systemHealth: {
          overallScore: 0.87,
          categoryScores: {
            'ENCRYPTION': 0.92,
            'ACCESS_CONTROL': 0.78,
            'PII_EXPOSURE': 0.85,
            'LOGGING': 0.94
          },
          criticalIssues: 3
        }
      };

      const mockComplianceMetrics: ComplianceMetrics = {
        totalFindings: 47,
        findingsBySeverity: {
          'CRITICAL': 3,
          'HIGH': 8,
          'MEDIUM': 21,
          'LOW': 15
        },
        findingsByType: {
          'ENCRYPTION': 12,
          'ACCESS_CONTROL': 18,
          'PII_EXPOSURE': 10,
          'LOGGING': 7
        },
        complianceScore: 0.87,
        trends: [
          { period: '7d', findings: 52, resolved: 28, score: 0.82 },
          { period: '30d', findings: 189, resolved: 142, score: 0.85 },
          { period: '90d', findings: 456, resolved: 398, score: 0.87 }
        ]
      };

      const mockSetupStatus: SetupStatus = {
        isSetupComplete: false,
        setupProgress: 25,
        awsConfigured: false,
        servicesEnabled: false,
        validationPassed: false,
        lastSetupAttempt: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
        setupErrors: [
          'AWS credentials not configured',
          'Amazon Bedrock access not enabled',
          'S3 bucket permissions insufficient'
        ]
      };

      setAgentStatus(mockAgentStatus);
      setComplianceMetrics(mockComplianceMetrics);
      setSetupStatus(mockSetupStatus);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const handleAgentControl = async (action: 'start' | 'stop' | 'restart' | 'scan') => {
    try {
      // In a real implementation, this would call the agent control API
      console.log(`Agent control action: ${action}`);
      
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Reload data after action
      await loadDashboardData();
    } catch (err) {
      setError(err instanceof Error ? err.message : `Failed to ${action} agent`);
    }
  };

  const handleSetupComplete = () => {
    setShowOnboarding(false);
    setSetupStatus(prev => prev ? {
      ...prev,
      isSetupComplete: true,
      setupProgress: 100,
      awsConfigured: true,
      servicesEnabled: true,
      validationPassed: true,
      setupErrors: []
    } : null);
    loadDashboardData();
  };

  const handleSetupSkip = () => {
    setShowOnboarding(false);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'HEALTHY': return 'text-green-600';
      case 'DEGRADED': return 'text-yellow-600';
      case 'UNHEALTHY': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'CRITICAL': return 'bg-red-100 text-red-800';
      case 'HIGH': return 'bg-orange-100 text-orange-800';
      case 'MEDIUM': return 'bg-yellow-100 text-yellow-800';
      case 'LOW': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading && !agentStatus) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <div className="flex items-center space-x-2">
            <RefreshCw className="h-6 w-6 animate-spin" />
            <span>Loading AWS PrivacyComply Agent...</span>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <Card className="border-red-200 bg-red-50">
          <div className="p-4">
            <div className="flex items-center space-x-2 text-red-800">
              <AlertTriangle className="h-5 w-5" />
              <span className="font-medium">Error loading AWS PrivacyComply Agent dashboard</span>
            </div>
            <p className="mt-2 text-red-700">{error}</p>
            <Button 
              onClick={loadDashboardData} 
              className="mt-4"
              variant="outline"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  // Show onboarding wizard if setup is not complete and user wants to set up
  if (showOnboarding) {
    return (
      <SimpleOnboardingWizard
        onComplete={handleSetupComplete}
        onSkip={handleSetupSkip}
      />
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Setup Status Card */}
      {setupStatus && !setupStatus.isSetupComplete && (
        <SetupStatusCard
          setupStatus={setupStatus}
          onStartSetup={() => setShowOnboarding(true)}
          onResumeSetup={() => setShowOnboarding(true)}
          onViewDetails={() => setShowOnboarding(true)}
        />
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">AWS PrivacyComply Agent</h1>
          <p className="text-gray-600">Autonomous AI-powered privacy compliance monitoring and remediation for AWS</p>
        </div>
        <div className="flex items-center space-x-3">
          <Button
            onClick={() => handleAgentControl('scan')}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Run Scan
          </Button>
          <Button
            onClick={() => handleAgentControl(agentStatus?.monitoring ? 'stop' : 'start')}
            variant="outline"
          >
            {agentStatus?.monitoring ? (
              <>
                <Pause className="h-4 w-4 mr-2" />
                Stop Monitoring
              </>
            ) : (
              <>
                <Play className="h-4 w-4 mr-2" />
                Start Monitoring
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Status Overview */}
      {agentStatus && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <div className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Agent Status</p>
                  <p className={`text-lg font-semibold ${getStatusColor(agentStatus.status)}`}>
                    {agentStatus.status}
                  </p>
                </div>
                <Shield className={`h-8 w-8 ${getStatusColor(agentStatus.status)}`} />
              </div>
              <div className="mt-2 flex items-center space-x-2">
                <Badge variant={agentStatus.monitoring ? 'success' : 'secondary'}>
                  {agentStatus.monitoring ? 'Monitoring' : 'Stopped'}
                </Badge>
                <Badge variant={agentStatus.initialized ? 'success' : 'destructive'}>
                  {agentStatus.initialized ? 'Initialized' : 'Not Ready'}
                </Badge>
              </div>
            </div>
          </Card>

          <Card>
            <div className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Compliance Score</p>
                  <p className="text-lg font-semibold text-green-600">
                    {Math.round(agentStatus.systemHealth.overallScore * 100)}%
                  </p>
                </div>
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
              <div className="mt-2">
                <ProgressBar 
                  value={agentStatus.systemHealth.overallScore * 100} 
                  className="h-2"
                />
              </div>
            </div>
          </Card>

          <Card>
            <div className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Critical Issues</p>
                  <p className="text-lg font-semibold text-red-600">
                    {agentStatus.systemHealth.criticalIssues}
                  </p>
                </div>
                <AlertTriangle className="h-8 w-8 text-red-600" />
              </div>
              <p className="text-xs text-gray-500 mt-1">Require immediate attention</p>
            </div>
          </Card>

          <Card>
            <div className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Active Workflows</p>
                  <p className="text-lg font-semibold text-blue-600">
                    {agentStatus.activeWorkflows}
                  </p>
                </div>
                <Activity className="h-8 w-8 text-blue-600" />
              </div>
              <p className="text-xs text-gray-500 mt-1">
                {agentStatus.activeRemediations} remediations running
              </p>
            </div>
          </Card>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {[
            { id: 'overview', label: 'Overview', icon: Activity },
            { id: 'findings', label: 'Findings', icon: AlertTriangle },
            { id: 'remediation', label: 'Remediation', icon: Settings },
            { id: 'query', label: 'AI Assistant', icon: MessageSquare }
          ].map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id as any)}
              className={`flex items-center space-x-2 py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <Icon className="h-4 w-4" />
              <span>{label}</span>
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="mt-6">
        {activeTab === 'overview' && agentStatus && complianceMetrics && (
          <AgentStatusDisplay 
            agentStatus={agentStatus}
            complianceMetrics={complianceMetrics}
          />
        )}
        
        {activeTab === 'findings' && (
          <ComplianceFindingsTable />
        )}
        
        {activeTab === 'remediation' && (
          <RemediationWorkflowPanel />
        )}
        
        {activeTab === 'query' && (
          <NaturalLanguageQueryInterface />
        )}
      </div>
    </div>
  );
};