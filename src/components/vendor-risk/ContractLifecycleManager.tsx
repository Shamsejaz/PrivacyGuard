import React, { useState, useEffect } from 'react';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { ProgressBar } from '../ui/ProgressBar';
import { DataProcessingAgreement } from '../../types/vendor-risk';
import { vendorRiskService } from '../../services/vendorRiskService';
import { 
  Calendar, 
  Clock, 
  AlertTriangle, 
  CheckCircle, 
  FileText, 
  RefreshCw,
  Bell,
  TrendingUp,
  Users,
  Filter
} from 'lucide-react';

interface ContractLifecycleManagerProps {
  onContractSelected?: (contract: DataProcessingAgreement) => void;
}

export const ContractLifecycleManager: React.FC<ContractLifecycleManagerProps> = ({
  onContractSelected
}) => {
  const [contracts, setContracts] = useState<DataProcessingAgreement[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState({
    status: 'all',
    expiringWithin: 'all',
    autoRenewal: 'all'
  });

  const [metrics, setMetrics] = useState({
    totalContracts: 0,
    activeContracts: 0,
    expiringIn30Days: 0,
    expiringIn90Days: 0,
    expired: 0,
    autoRenewalEnabled: 0,
    averageDaysToExpiry: 0
  });

  useEffect(() => {
    loadContracts();
  }, []);

  useEffect(() => {
    calculateMetrics();
  }, [contracts]);

  const loadContracts = async () => {
    try {
      setLoading(true);
      const data = await vendorRiskService.getDPAs();
      setContracts(data);
    } catch (error) {
      console.error('Failed to load contracts:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateMetrics = () => {
    const now = new Date();
    const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    const ninetyDaysFromNow = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);

    const activeContracts = contracts.filter(c => c.status === 'active');
    const expiringIn30 = contracts.filter(c => 
      c.expiryDate && new Date(c.expiryDate) <= thirtyDaysFromNow && new Date(c.expiryDate) > now
    );
    const expiringIn90 = contracts.filter(c => 
      c.expiryDate && new Date(c.expiryDate) <= ninetyDaysFromNow && new Date(c.expiryDate) > now
    );
    const expired = contracts.filter(c => 
      c.expiryDate && new Date(c.expiryDate) <= now
    );
    const autoRenewalEnabled = contracts.filter(c => c.autoRenewal);

    const daysToExpiry = contracts
      .filter(c => c.expiryDate && new Date(c.expiryDate) > now)
      .map(c => Math.ceil((new Date(c.expiryDate!).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
    
    const averageDaysToExpiry = daysToExpiry.length > 0 
      ? Math.round(daysToExpiry.reduce((sum, days) => sum + days, 0) / daysToExpiry.length)
      : 0;

    setMetrics({
      totalContracts: contracts.length,
      activeContracts: activeContracts.length,
      expiringIn30Days: expiringIn30.length,
      expiringIn90Days: expiringIn90.length,
      expired: expired.length,
      autoRenewalEnabled: autoRenewalEnabled.length,
      averageDaysToExpiry
    });
  };

  const getDaysUntilExpiry = (expiryDate: Date) => {
    const today = new Date();
    const expiry = new Date(expiryDate);
    const diffTime = expiry.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const getContractHealthScore = (contract: DataProcessingAgreement) => {
    let score = 100;
    
    if (!contract.expiryDate) return 50; // No expiry date is concerning
    
    const daysUntilExpiry = getDaysUntilExpiry(contract.expiryDate);
    
    if (daysUntilExpiry < 0) score = 0; // Expired
    else if (daysUntilExpiry <= 30) score = 25; // Critical
    else if (daysUntilExpiry <= 90) score = 50; // Warning
    else if (daysUntilExpiry <= 180) score = 75; // Caution
    
    // Bonus for auto-renewal
    if (contract.autoRenewal && score > 0) score = Math.min(100, score + 15);
    
    // Penalty for missing key fields
    if (!contract.retentionPeriod) score -= 5;
    if (contract.securityMeasures.length === 0) score -= 10;
    if (!contract.auditRights) score -= 5;
    
    return Math.max(0, score);
  };

  const getHealthScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    if (score >= 40) return 'text-orange-600';
    return 'text-red-600';
  };

  const getHealthScoreBg = (score: number) => {
    if (score >= 80) return 'bg-green-100';
    if (score >= 60) return 'bg-yellow-100';
    if (score >= 40) return 'bg-orange-100';
    return 'bg-red-100';
  };

  const filteredContracts = contracts.filter(contract => {
    if (filter.status !== 'all' && contract.status !== filter.status) {
      return false;
    }

    if (filter.autoRenewal !== 'all') {
      const hasAutoRenewal = contract.autoRenewal;
      if (filter.autoRenewal === 'enabled' && !hasAutoRenewal) return false;
      if (filter.autoRenewal === 'disabled' && hasAutoRenewal) return false;
    }

    if (filter.expiringWithin !== 'all' && contract.expiryDate) {
      const daysUntilExpiry = getDaysUntilExpiry(contract.expiryDate);
      switch (filter.expiringWithin) {
        case '30':
          return daysUntilExpiry <= 30 && daysUntilExpiry > 0;
        case '90':
          return daysUntilExpiry <= 90 && daysUntilExpiry > 0;
        case 'expired':
          return daysUntilExpiry < 0;
        default:
          return true;
      }
    }

    return true;
  });

  const handleRenewContract = async (contract: DataProcessingAgreement) => {
    try {
      const renewalPeriod = contract.renewalPeriod || 12;
      const renewedContract = await vendorRiskService.renewDPA(contract.id, renewalPeriod);
      setContracts(prev => prev.map(c => c.id === contract.id ? renewedContract : c));
    } catch (error) {
      console.error('Failed to renew contract:', error);
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
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Contract Lifecycle Management</h2>
          <p className="text-gray-600">Monitor and manage contract renewals and compliance</p>
        </div>
        <Button onClick={loadContracts}>
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Metrics Dashboard */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Contracts</p>
              <p className="text-2xl font-bold text-gray-900">{metrics.totalContracts}</p>
            </div>
            <FileText className="w-8 h-8 text-blue-600" />
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Active Contracts</p>
              <p className="text-2xl font-bold text-green-600">{metrics.activeContracts}</p>
            </div>
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Expiring (30 days)</p>
              <p className="text-2xl font-bold text-red-600">{metrics.expiringIn30Days}</p>
            </div>
            <AlertTriangle className="w-8 h-8 text-red-600" />
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Auto-Renewal</p>
              <p className="text-2xl font-bold text-blue-600">{metrics.autoRenewalEnabled}</p>
            </div>
            <RefreshCw className="w-8 h-8 text-blue-600" />
          </div>
        </Card>
      </div>

      {/* Renewal Timeline */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Renewal Timeline</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Expired</span>
            <div className="flex items-center space-x-2">
              <div className="w-32 bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-red-600 h-2 rounded-full" 
                  style={{ width: `${(metrics.expired / metrics.totalContracts) * 100}%` }}
                ></div>
              </div>
              <span className="text-sm font-medium text-red-600">{metrics.expired}</span>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Expiring in 30 days</span>
            <div className="flex items-center space-x-2">
              <div className="w-32 bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-orange-600 h-2 rounded-full" 
                  style={{ width: `${(metrics.expiringIn30Days / metrics.totalContracts) * 100}%` }}
                ></div>
              </div>
              <span className="text-sm font-medium text-orange-600">{metrics.expiringIn30Days}</span>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Expiring in 90 days</span>
            <div className="flex items-center space-x-2">
              <div className="w-32 bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-yellow-600 h-2 rounded-full" 
                  style={{ width: `${(metrics.expiringIn90Days / metrics.totalContracts) * 100}%` }}
                ></div>
              </div>
              <span className="text-sm font-medium text-yellow-600">{metrics.expiringIn90Days}</span>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Active & Healthy</span>
            <div className="flex items-center space-x-2">
              <div className="w-32 bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-green-600 h-2 rounded-full" 
                  style={{ 
                    width: `${((metrics.totalContracts - metrics.expired - metrics.expiringIn30Days - metrics.expiringIn90Days) / metrics.totalContracts) * 100}%` 
                  }}
                ></div>
              </div>
              <span className="text-sm font-medium text-green-600">
                {metrics.totalContracts - metrics.expired - metrics.expiringIn30Days - metrics.expiringIn90Days}
              </span>
            </div>
          </div>
        </div>
      </Card>

      {/* Filters */}
      <Card className="p-4">
        <div className="flex items-center space-x-4">
          <Filter className="w-5 h-5 text-gray-400" />
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select
              value={filter.status}
              onChange={(e) => setFilter(prev => ({ ...prev, status: e.target.value }))}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Statuses</option>
              <option value="active">Active</option>
              <option value="under_review">Under Review</option>
              <option value="draft">Draft</option>
              <option value="expired">Expired</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Expiring Within</label>
            <select
              value={filter.expiringWithin}
              onChange={(e) => setFilter(prev => ({ ...prev, expiringWithin: e.target.value }))}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Timeframes</option>
              <option value="30">30 Days</option>
              <option value="90">90 Days</option>
              <option value="expired">Already Expired</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Auto-Renewal</label>
            <select
              value={filter.autoRenewal}
              onChange={(e) => setFilter(prev => ({ ...prev, autoRenewal: e.target.value }))}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Contracts</option>
              <option value="enabled">Auto-Renewal Enabled</option>
              <option value="disabled">Auto-Renewal Disabled</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Contract List */}
      <div className="space-y-4">
        {filteredContracts.map(contract => {
          const daysUntilExpiry = contract.expiryDate ? getDaysUntilExpiry(contract.expiryDate) : null;
          const healthScore = getContractHealthScore(contract);
          const isExpiringSoon = daysUntilExpiry !== null && daysUntilExpiry <= 30 && daysUntilExpiry > 0;
          const isExpired = daysUntilExpiry !== null && daysUntilExpiry < 0;

          return (
            <Card key={contract.id} className="p-6 hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => onContractSelected?.(contract)}>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    <h4 className="text-lg font-semibold text-gray-900">{contract.title}</h4>
                    <Badge variant="outline">{contract.type}</Badge>
                    <Badge className={
                      contract.status === 'active' ? 'bg-green-100 text-green-800' :
                      contract.status === 'expired' ? 'bg-red-100 text-red-800' :
                      'bg-gray-100 text-gray-800'
                    }>
                      {contract.status.replace('_', ' ').toUpperCase()}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                    <div className="flex items-center text-sm text-gray-600">
                      <Calendar className="w-4 h-4 mr-2" />
                      <div>
                        <div className="font-medium">Effective</div>
                        <div>{new Date(contract.effectiveDate).toLocaleDateString()}</div>
                      </div>
                    </div>

                    {contract.expiryDate && (
                      <div className="flex items-center text-sm text-gray-600">
                        <Clock className="w-4 h-4 mr-2" />
                        <div>
                          <div className="font-medium">Expires</div>
                          <div className={isExpired ? 'text-red-600' : isExpiringSoon ? 'text-orange-600' : ''}>
                            {new Date(contract.expiryDate).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="flex items-center text-sm text-gray-600">
                      <RefreshCw className="w-4 h-4 mr-2" />
                      <div>
                        <div className="font-medium">Auto-Renewal</div>
                        <div>{contract.autoRenewal ? 'Enabled' : 'Disabled'}</div>
                      </div>
                    </div>

                    <div className="flex items-center text-sm text-gray-600">
                      <TrendingUp className="w-4 h-4 mr-2" />
                      <div>
                        <div className="font-medium">Health Score</div>
                        <div className={getHealthScoreColor(healthScore)}>
                          {healthScore}%
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Health Score Bar */}
                  <div className="mb-4">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-gray-700">Contract Health</span>
                      <span className={`text-sm font-medium ${getHealthScoreColor(healthScore)}`}>
                        {healthScore}%
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full ${
                          healthScore >= 80 ? 'bg-green-600' :
                          healthScore >= 60 ? 'bg-yellow-600' :
                          healthScore >= 40 ? 'bg-orange-600' : 'bg-red-600'
                        }`}
                        style={{ width: `${healthScore}%` }}
                      ></div>
                    </div>
                  </div>

                  {/* Alerts */}
                  {isExpired && (
                    <div className="bg-red-50 border border-red-200 rounded-md p-3 mb-2">
                      <div className="flex items-center">
                        <AlertTriangle className="w-4 h-4 text-red-400 mr-2" />
                        <span className="text-sm text-red-800">Contract has expired</span>
                      </div>
                    </div>
                  )}

                  {isExpiringSoon && (
                    <div className="bg-orange-50 border border-orange-200 rounded-md p-3 mb-2">
                      <div className="flex items-center">
                        <Bell className="w-4 h-4 text-orange-400 mr-2" />
                        <span className="text-sm text-orange-800">
                          Expires in {daysUntilExpiry} days
                          {contract.autoRenewal && ' - Auto-renewal enabled'}
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex items-center space-x-2 ml-4">
                  {(isExpiringSoon || isExpired) && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRenewContract(contract);
                      }}
                    >
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Renew
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          );
        })}

        {filteredContracts.length === 0 && (
          <Card className="p-8 text-center">
            <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h4 className="text-lg font-medium text-gray-900 mb-2">No Contracts Found</h4>
            <p className="text-gray-600">
              {contracts.length === 0 
                ? "No contracts have been created yet."
                : "No contracts match the current filters."
              }
            </p>
          </Card>
        )}
      </div>
    </div>
  );
};