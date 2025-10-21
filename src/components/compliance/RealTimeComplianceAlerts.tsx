import React, { useState, useEffect } from 'react';
import { 
  AlertTriangle, 
  CheckCircle, 
  XCircle, 
  Info, 
  X,
  Bell,
  Clock,
  TrendingDown,
  Shield
} from 'lucide-react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { ComplianceAlert, ComplianceFramework } from '../../types/compliance';
import { complianceDashboardService } from '../../services/complianceDashboardService';
import { useAuditLogger } from '../../hooks/useAuditLogger';

interface RealTimeComplianceAlertsProps {
  framework?: ComplianceFramework;
  maxAlerts?: number;
  autoRefresh?: boolean;
}

const RealTimeComplianceAlerts: React.FC<RealTimeComplianceAlertsProps> = ({
  framework,
  maxAlerts = 5,
  autoRefresh = true
}) => {
  const [alerts, setAlerts] = useState<ComplianceAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dismissedAlerts, setDismissedAlerts] = useState<Set<string>>(new Set());

  const { logButtonClick } = useAuditLogger({
    component: 'RealTimeComplianceAlerts'
  });

  useEffect(() => {
    loadAlerts();
    
    if (autoRefresh) {
      const interval = setInterval(loadAlerts, 30000); // Refresh every 30 seconds
      return () => clearInterval(interval);
    }
  }, [framework, autoRefresh]);

  const loadAlerts = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await complianceDashboardService.getAlerts(framework);
      setAlerts(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load alerts');
    } finally {
      setLoading(false);
    }
  };

  const handleDismissAlert = async (alertId: string) => {
    try {
      await complianceDashboardService.dismissAlert(alertId);
      await logButtonClick('dismiss_compliance_alert', { alertId });
      
      setDismissedAlerts(prev => new Set([...prev, alertId]));
      setAlerts(prev => prev.filter(alert => alert.id !== alertId));
    } catch (error) {
      console.error('Failed to dismiss alert:', error);
    }
  };

  const handleAcknowledgeAlert = async (alertId: string) => {
    try {
      await complianceDashboardService.acknowledgeAlert(alertId);
      await logButtonClick('acknowledge_compliance_alert', { alertId });
      
      setAlerts(prev => 
        prev.map(alert => 
          alert.id === alertId 
            ? { ...alert, acknowledged: true, acknowledgedAt: new Date() }
            : alert
        )
      );
    } catch (error) {
      console.error('Failed to acknowledge alert:', error);
    }
  };

  const getAlertIcon = (severity: 'critical' | 'high' | 'medium' | 'low' | 'info') => {
    switch (severity) {
      case 'critical':
        return <XCircle className="w-5 h-5 text-red-500" />;
      case 'high':
        return <AlertTriangle className="w-5 h-5 text-orange-500" />;
      case 'medium':
        return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
      case 'low':
        return <Info className="w-5 h-5 text-blue-500" />;
      default:
        return <Info className="w-5 h-5 text-gray-500" />;
    }
  };

  const getAlertColor = (severity: 'critical' | 'high' | 'medium' | 'low' | 'info') => {
    switch (severity) {
      case 'critical':
        return 'border-red-200 bg-red-50';
      case 'high':
        return 'border-orange-200 bg-orange-50';
      case 'medium':
        return 'border-yellow-200 bg-yellow-50';
      case 'low':
        return 'border-blue-200 bg-blue-50';
      default:
        return 'border-gray-200 bg-gray-50';
    }
  };

  const getAlertTypeIcon = (type: string) => {
    switch (type) {
      case 'deadline_approaching':
        return <Clock className="w-4 h-4" />;
      case 'compliance_score_drop':
        return <TrendingDown className="w-4 h-4" />;
      case 'security_incident':
        return <Shield className="w-4 h-4" />;
      case 'audit_finding':
        return <AlertTriangle className="w-4 h-4" />;
      default:
        return <Bell className="w-4 h-4" />;
    }
  };

  const formatTimeAgo = (date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

  // Filter out dismissed alerts and limit to maxAlerts
  const visibleAlerts = alerts
    .filter(alert => !dismissedAlerts.has(alert.id))
    .slice(0, maxAlerts);

  if (loading && alerts.length === 0) {
    return (
      <div className="flex items-center justify-center h-20">
        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <Card className="p-4 border-red-200 bg-red-50">
        <div className="flex items-center space-x-2">
          <XCircle className="w-5 h-5 text-red-500" />
          <p className="text-red-700">{error}</p>
        </div>
      </Card>
    );
  }

  if (visibleAlerts.length === 0) {
    return (
      <Card className="p-4 border-green-200 bg-green-50">
        <div className="flex items-center space-x-2">
          <CheckCircle className="w-5 h-5 text-green-500" />
          <p className="text-green-700">All compliance alerts are resolved</p>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {visibleAlerts.map(alert => (
        <Card 
          key={alert.id} 
          className={`p-4 border-l-4 ${getAlertColor(alert.severity)} ${
            alert.acknowledged ? 'opacity-75' : ''
          }`}
        >
          <div className="flex items-start justify-between">
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0 mt-0.5">
                {getAlertIcon(alert.severity)}
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-2 mb-1">
                  <h4 className="text-sm font-medium text-gray-900">{alert.title}</h4>
                  {getAlertTypeIcon(alert.type)}
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                    alert.severity === 'critical' ? 'bg-red-100 text-red-800' :
                    alert.severity === 'high' ? 'bg-orange-100 text-orange-800' :
                    alert.severity === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-blue-100 text-blue-800'
                  }`}>
                    {alert.severity.toUpperCase()}
                  </span>
                </div>
                
                <p className="text-sm text-gray-600 mb-2">{alert.message}</p>
                
                <div className="flex items-center space-x-4 text-xs text-gray-500">
                  <span>{alert.framework}</span>
                  <span>•</span>
                  <span>{formatTimeAgo(alert.createdAt)}</span>
                  {alert.acknowledgedAt && (
                    <>
                      <span>•</span>
                      <span className="text-green-600">Acknowledged</span>
                    </>
                  )}
                </div>

                {alert.actionRequired && (
                  <div className="mt-2 p-2 bg-white rounded border">
                    <p className="text-xs font-medium text-gray-700">Action Required:</p>
                    <p className="text-xs text-gray-600">{alert.actionRequired}</p>
                  </div>
                )}

                {alert.relatedItems && alert.relatedItems.length > 0 && (
                  <div className="mt-2">
                    <p className="text-xs font-medium text-gray-700 mb-1">Related Items:</p>
                    <div className="flex flex-wrap gap-1">
                      {alert.relatedItems.map((item, index) => (
                        <span 
                          key={index}
                          className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-gray-100 text-gray-700"
                        >
                          {item}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
            
            <div className="flex items-center space-x-2 ml-4">
              {!alert.acknowledged && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleAcknowledgeAlert(alert.id)}
                  className="text-xs"
                >
                  Acknowledge
                </Button>
              )}
              
              <button
                onClick={() => handleDismissAlert(alert.id)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </Card>
      ))}

      {alerts.length > maxAlerts && (
        <Card className="p-3 text-center">
          <p className="text-sm text-gray-600">
            {alerts.length - maxAlerts} more alerts available
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => logButtonClick('view_all_alerts')}
            className="mt-2"
          >
            View All Alerts
          </Button>
        </Card>
      )}
    </div>
  );
};

export default RealTimeComplianceAlerts;