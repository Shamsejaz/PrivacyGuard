import React, { useState, useEffect } from 'react';
import { AlertTriangle, Clock, Users, FileText, TrendingUp, Shield } from 'lucide-react';
import { DataBreach, BreachDashboardMetrics } from '../../types/breach-management';
import { breachManagementService } from '../../services/breachManagementService';
import { Card } from '../ui/Card';
import Button from '../ui/Button';

interface IncidentResponseDashboardProps {
  onBreachSelect: (breach: DataBreach) => void;
  onCreateBreach: () => void;
}

export const IncidentResponseDashboard: React.FC<IncidentResponseDashboardProps> = ({
  onBreachSelect,
  onCreateBreach
}) => {
  const [metrics, setMetrics] = useState<BreachDashboardMetrics | null>(null);
  const [activeBreaches, setActiveBreaches] = useState<DataBreach[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const [metricsData, breachesData] = await Promise.all([
        breachManagementService.getDashboardMetrics(),
        breachManagementService.getBreaches({ status: ['detected', 'investigating', 'contained', 'notifying_authorities'] })
      ]);
      setMetrics(metricsData);
      setActiveBreaches(breachesData);
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'text-red-600 bg-red-50';
      case 'high': return 'text-orange-600 bg-orange-50';
      case 'medium': return 'text-yellow-600 bg-yellow-50';
      case 'low': return 'text-green-600 bg-green-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'detected': return 'text-red-600 bg-red-50';
      case 'investigating': return 'text-blue-600 bg-blue-50';
      case 'contained': return 'text-yellow-600 bg-yellow-50';
      case 'notifying_authorities': return 'text-purple-600 bg-purple-50';
      case 'closed': return 'text-green-600 bg-green-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Incident Response Dashboard</h1>
          <p className="text-gray-600">Monitor and manage data breach incidents</p>
        </div>
        <Button onClick={onCreateBreach} className="flex items-center gap-2">
          <AlertTriangle className="h-4 w-4" />
          Report Incident
        </Button>
      </div>

      {/* Metrics Cards */}
      {metrics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Active Incidents</p>
                <p className="text-2xl font-bold text-gray-900">{metrics.activeBreaches}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-red-500" />
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Avg Detection Time</p>
                <p className="text-2xl font-bold text-gray-900">{Math.round(metrics.averageDetectionTime)}h</p>
              </div>
              <Clock className="h-8 w-8 text-blue-500" />
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Compliance Rate</p>
                <p className="text-2xl font-bold text-gray-900">{Math.round(metrics.complianceRate)}%</p>
              </div>
              <Shield className="h-8 w-8 text-green-500" />
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Overdue Notifications</p>
                <p className="text-2xl font-bold text-gray-900">{metrics.overdueNotifications}</p>
              </div>
              <FileText className="h-8 w-8 text-orange-500" />
            </div>
          </Card>
        </div>
      )}

      {/* Active Incidents */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Active Incidents</h2>
          <Button variant="outline" size="sm">
            View All
          </Button>
        </div>

        <div className="space-y-4">
          {activeBreaches.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No active incidents
            </div>
          ) : (
            activeBreaches.map((breach) => (
              <div
                key={breach.id}
                className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 cursor-pointer transition-colors"
                onClick={() => onBreachSelect(breach)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-medium text-gray-900">{breach.title}</h3>
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getSeverityColor(breach.severity)}`}>
                        {breach.severity.toUpperCase()}
                      </span>
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(breach.status)}`}>
                        {breach.status.replace('_', ' ').toUpperCase()}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mb-2">{breach.description}</p>
                    <div className="flex items-center gap-4 text-xs text-gray-500">
                      <span>Detected: {new Date(breach.detectedAt).toLocaleDateString()}</span>
                      <span>Records: {breach.affectedRecords.toLocaleString()}</span>
                      <span>Assigned: {breach.assignedTo}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {breach.severity === 'critical' && (
                      <AlertTriangle className="h-5 w-5 text-red-500" />
                    )}
                    <Clock className="h-4 w-4 text-gray-400" />
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </Card>

      {/* Severity Distribution */}
      {metrics && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Incidents by Severity</h3>
            <div className="space-y-3">
              {Object.entries(metrics.breachesBySeverity).map(([severity, count]) => (
                <div key={severity} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={`w-3 h-3 rounded-full ${getSeverityColor(severity).split(' ')[1]}`}></div>
                    <span className="text-sm font-medium capitalize">{severity}</span>
                  </div>
                  <span className="text-sm text-gray-600">{count}</span>
                </div>
              ))}
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Incidents by Status</h3>
            <div className="space-y-3">
              {Object.entries(metrics.breachesByStatus).map(([status, count]) => (
                <div key={status} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={`w-3 h-3 rounded-full ${getStatusColor(status).split(' ')[1]}`}></div>
                    <span className="text-sm font-medium capitalize">{status.replace('_', ' ')}</span>
                  </div>
                  <span className="text-sm text-gray-600">{count}</span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};