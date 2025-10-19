import React from 'react';
import Card from '../ui/Card';
import Badge from '../ui/Badge';
import ProgressBar from '../ui/ProgressBar';
import { 
  Shield, 
  Server, 
  Clock, 
  TrendingUp,
  AlertCircle,
  CheckCircle,
  XCircle
} from 'lucide-react';

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

interface AgentStatusDisplayProps {
  agentStatus: AgentStatus;
  complianceMetrics: ComplianceMetrics;
}

export const AgentStatusDisplay: React.FC<AgentStatusDisplayProps> = ({
  agentStatus,
  complianceMetrics
}) => {
  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const getServiceIcon = (healthy: boolean) => {
    return healthy ? (
      <CheckCircle className="h-4 w-4 text-green-600" />
    ) : (
      <XCircle className="h-4 w-4 text-red-600" />
    );
  };

  const getCategoryColor = (score: number) => {
    if (score >= 0.9) return 'text-green-600';
    if (score >= 0.7) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className="space-y-6">
      {/* System Health Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">System Health</h3>
              <Shield className="h-6 w-6 text-blue-600" />
            </div>
            
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-600">Overall Score</span>
                  <span className="text-lg font-semibold text-green-600">
                    {Math.round(agentStatus.systemHealth.overallScore * 100)}%
                  </span>
                </div>
                <ProgressBar 
                  value={agentStatus.systemHealth.overallScore * 100}
                  className="h-3"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                {Object.entries(agentStatus.systemHealth.categoryScores).map(([category, score]) => (
                  <div key={category} className="text-center">
                    <div className={`text-lg font-semibold ${getCategoryColor(score)}`}>
                      {Math.round(score * 100)}%
                    </div>
                    <div className="text-xs text-gray-500 capitalize">
                      {category.replace('_', ' ').toLowerCase()}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Card>

        <Card>
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Service Status</h3>
              <Server className="h-6 w-6 text-blue-600" />
            </div>
            
            <div className="space-y-3">
              {Object.entries(agentStatus.services).map(([service, healthy]) => (
                <div key={service} className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    {getServiceIcon(healthy)}
                    <span className="text-sm font-medium text-gray-700 capitalize">
                      {service.replace(/([A-Z])/g, ' $1').trim()}
                    </span>
                  </div>
                  <Badge variant={healthy ? 'success' : 'destructive'}>
                    {healthy ? 'Healthy' : 'Unhealthy'}
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        </Card>
      </div>

      {/* Scan Information */}
      <Card>
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Scan Information</h3>
            <Clock className="h-6 w-6 text-blue-600" />
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <div className="text-sm font-medium text-gray-600 mb-1">Last Scan</div>
              <div className="text-sm text-gray-900">{formatDateTime(agentStatus.lastScan)}</div>
            </div>
            <div>
              <div className="text-sm font-medium text-gray-600 mb-1">Next Scan</div>
              <div className="text-sm text-gray-900">{formatDateTime(agentStatus.nextScan)}</div>
            </div>
            <div>
              <div className="text-sm font-medium text-gray-600 mb-1">Monitoring Status</div>
              <Badge variant={agentStatus.monitoring ? 'success' : 'secondary'}>
                {agentStatus.monitoring ? 'Active' : 'Inactive'}
              </Badge>
            </div>
          </div>
        </div>
      </Card>

      {/* Compliance Metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Findings by Severity</h3>
              <AlertCircle className="h-6 w-6 text-orange-600" />
            </div>
            
            <div className="space-y-3">
              {Object.entries(complianceMetrics.findingsBySeverity).map(([severity, count]) => (
                <div key={severity} className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className={`w-3 h-3 rounded-full ${
                      severity === 'CRITICAL' ? 'bg-red-500' :
                      severity === 'HIGH' ? 'bg-orange-500' :
                      severity === 'MEDIUM' ? 'bg-yellow-500' : 'bg-blue-500'
                    }`} />
                    <span className="text-sm font-medium text-gray-700 capitalize">
                      {severity.toLowerCase()}
                    </span>
                  </div>
                  <span className="text-sm font-semibold text-gray-900">{count}</span>
                </div>
              ))}
            </div>
            
            <div className="mt-4 pt-4 border-t border-gray-200">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-600">Total Findings</span>
                <span className="text-lg font-semibold text-gray-900">
                  {complianceMetrics.totalFindings}
                </span>
              </div>
            </div>
          </div>
        </Card>

        <Card>
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Findings by Type</h3>
              <TrendingUp className="h-6 w-6 text-green-600" />
            </div>
            
            <div className="space-y-3">
              {Object.entries(complianceMetrics.findingsByType).map(([type, count]) => (
                <div key={type} className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700 capitalize">
                    {type.replace('_', ' ').toLowerCase()}
                  </span>
                  <div className="flex items-center space-x-2">
                    <div className="w-20 bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-blue-600 h-2 rounded-full" 
                        style={{ 
                          width: `${(count / complianceMetrics.totalFindings) * 100}%` 
                        }}
                      />
                    </div>
                    <span className="text-sm font-semibold text-gray-900 w-8 text-right">
                      {count}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Card>
      </div>

      {/* Compliance Trends */}
      <Card>
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Compliance Trends</h3>
            <TrendingUp className="h-6 w-6 text-green-600" />
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {complianceMetrics.trends.map((trend) => (
              <div key={trend.period} className="text-center">
                <div className="text-2xl font-bold text-gray-900 mb-1">
                  {Math.round(trend.score * 100)}%
                </div>
                <div className="text-sm text-gray-600 mb-2">
                  Compliance Score ({trend.period})
                </div>
                <div className="text-xs text-gray-500">
                  {trend.resolved}/{trend.findings} resolved
                </div>
              </div>
            ))}
          </div>
        </div>
      </Card>

      {/* Active Workflows */}
      {(agentStatus.activeWorkflows > 0 || agentStatus.activeRemediations > 0) && (
        <Card>
          <div className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Active Operations</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg">
                <div>
                  <div className="text-sm font-medium text-blue-900">Active Workflows</div>
                  <div className="text-2xl font-bold text-blue-600">
                    {agentStatus.activeWorkflows}
                  </div>
                </div>
                <div className="text-blue-600">
                  <div className="w-3 h-3 bg-blue-600 rounded-full animate-pulse" />
                </div>
              </div>
              
              <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg">
                <div>
                  <div className="text-sm font-medium text-green-900">Active Remediations</div>
                  <div className="text-2xl font-bold text-green-600">
                    {agentStatus.activeRemediations}
                  </div>
                </div>
                <div className="text-green-600">
                  <div className="w-3 h-3 bg-green-600 rounded-full animate-pulse" />
                </div>
              </div>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
};