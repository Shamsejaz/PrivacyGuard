import React, { useState } from 'react';
import { 
  CreditCard, 
  Calendar, 
  TrendingUp, 
  Users, 
  Database, 
  HardDrive, 
  Zap,
  Check,
  X,
  AlertCircle,
  Download,
  Settings,
  Upgrade
} from 'lucide-react';
import { useTenant } from '../../../contexts/TenantContext';
import { SubscriptionTier } from '../../../types';
import Button from '../../ui/Button';
import Card from '../../ui/Card';
import Badge from '../../ui/Badge';
import ProgressBar from '../../ui/ProgressBar';

interface UsageMetrics {
  users: { current: number; limit: number };
  dataSources: { current: number; limit: number };
  storage: { current: number; limit: number }; // in GB
  apiCalls: { current: number; limit: number };
}

interface BillingHistory {
  id: string;
  date: Date;
  amount: number;
  currency: string;
  status: 'paid' | 'pending' | 'failed';
  invoiceUrl?: string;
  description: string;
}

export const SubscriptionManagement: React.FC = () => {
  const { currentTenant, updateTenant } = useTenant();
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionTier | null>(null);

  // Mock usage data - in production this would come from API
  const usageMetrics: UsageMetrics = {
    users: { current: 12, limit: currentTenant?.subscription.limits.users || 25 },
    dataSources: { current: 7, limit: currentTenant?.subscription.limits.dataSources || 10 },
    storage: { current: 45, limit: currentTenant?.subscription.limits.storage || 100 },
    apiCalls: { current: 7500, limit: currentTenant?.subscription.limits.apiCalls || 10000 }
  };

  // Mock billing history
  const billingHistory: BillingHistory[] = [
    {
      id: 'inv-001',
      date: new Date('2024-01-01'),
      amount: 299,
      currency: 'USD',
      status: 'paid',
      description: 'Professional Plan - January 2024'
    },
    {
      id: 'inv-002',
      date: new Date('2023-12-01'),
      amount: 299,
      currency: 'USD',
      status: 'paid',
      description: 'Professional Plan - December 2023'
    },
    {
      id: 'inv-003',
      date: new Date('2023-11-01'),
      amount: 299,
      currency: 'USD',
      status: 'paid',
      description: 'Professional Plan - November 2023'
    }
  ];

  const availablePlans: SubscriptionTier[] = [
    {
      id: 'starter',
      name: 'starter',
      features: ['Basic Analytics', 'Standard Support', 'Core Compliance'],
      limits: { users: 5, dataSources: 3, storage: 10, apiCalls: 1000 },
      price: { monthly: 99, annual: 990, currency: 'USD' }
    },
    {
      id: 'professional',
      name: 'professional',
      features: ['Advanced Analytics', 'Priority Support', 'Multi-Framework Compliance', 'API Access'],
      limits: { users: 25, dataSources: 10, storage: 100, apiCalls: 10000 },
      price: { monthly: 299, annual: 2990, currency: 'USD' }
    },
    {
      id: 'enterprise',
      name: 'enterprise',
      features: ['Custom Analytics', '24/7 Support', 'All Compliance Frameworks', 'Unlimited API', 'Custom Integrations'],
      limits: { users: 100, dataSources: 50, storage: 1000, apiCalls: 100000 },
      price: { monthly: 999, annual: 9990, currency: 'USD' }
    }
  ];

  const getUsagePercentage = (current: number, limit: number) => {
    return Math.min((current / limit) * 100, 100);
  };

  const getUsageColor = (percentage: number) => {
    if (percentage >= 90) return 'danger';
    if (percentage >= 75) return 'warning';
    return 'success';
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  const handleUpgrade = async (plan: SubscriptionTier) => {
    try {
      await updateTenant({ subscription: plan });
      setShowUpgradeModal(false);
      setSelectedPlan(null);
    } catch (error) {
      console.error('Failed to upgrade subscription:', error);
    }
  };

  if (!currentTenant) {
    return (
      <div className="p-6">
        <div className="text-center text-gray-500">
          No tenant selected. Please select a tenant to manage subscription.
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Subscription & Billing</h1>
          <p className="text-gray-600">Manage your subscription plan and billing information</p>
        </div>
        <div className="flex items-center space-x-3">
          <Button variant="outline">
            <Download className="w-4 h-4 mr-2" />
            Download Invoice
          </Button>
          <Button onClick={() => setShowUpgradeModal(true)}>
            <Upgrade className="w-4 h-4 mr-2" />
            Upgrade Plan
          </Button>
        </div>
      </div>

      {/* Current Plan */}
      <Card>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Current Plan</h2>
            <p className="text-gray-600">Your active subscription details</p>
          </div>
          <Badge variant="success" size="lg">Active</Badge>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <CreditCard className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900 capitalize">
                  {currentTenant.subscription.name} Plan
                </h3>
                <p className="text-gray-600">
                  ${currentTenant.subscription.price.monthly}/month
                </p>
              </div>
            </div>
            
            <div className="space-y-2">
              {currentTenant.subscription.features.map((feature, index) => (
                <div key={index} className="flex items-center space-x-2">
                  <Check className="w-4 h-4 text-green-500" />
                  <span className="text-sm text-gray-700">{feature}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Next billing date</span>
              <span className="text-sm font-medium text-gray-900">
                {new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString()}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Billing cycle</span>
              <span className="text-sm font-medium text-gray-900">Monthly</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Auto-renewal</span>
              <Badge variant="success" size="sm">Enabled</Badge>
            </div>
          </div>
        </div>
      </Card>

      {/* Usage Metrics */}
      <Card>
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-gray-900">Usage Overview</h2>
          <p className="text-gray-600">Current usage against your plan limits</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Users className="w-4 h-4 text-blue-600" />
                <span className="text-sm font-medium text-gray-700">Users</span>
              </div>
              <span className="text-sm text-gray-600">
                {usageMetrics.users.current}/{usageMetrics.users.limit}
              </span>
            </div>
            <ProgressBar
              value={getUsagePercentage(usageMetrics.users.current, usageMetrics.users.limit)}
              variant={getUsageColor(getUsagePercentage(usageMetrics.users.current, usageMetrics.users.limit))}
            />
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Database className="w-4 h-4 text-green-600" />
                <span className="text-sm font-medium text-gray-700">Data Sources</span>
              </div>
              <span className="text-sm text-gray-600">
                {usageMetrics.dataSources.current}/{usageMetrics.dataSources.limit}
              </span>
            </div>
            <ProgressBar
              value={getUsagePercentage(usageMetrics.dataSources.current, usageMetrics.dataSources.limit)}
              variant={getUsageColor(getUsagePercentage(usageMetrics.dataSources.current, usageMetrics.dataSources.limit))}
            />
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <HardDrive className="w-4 h-4 text-purple-600" />
                <span className="text-sm font-medium text-gray-700">Storage</span>
              </div>
              <span className="text-sm text-gray-600">
                {usageMetrics.storage.current}GB/{usageMetrics.storage.limit}GB
              </span>
            </div>
            <ProgressBar
              value={getUsagePercentage(usageMetrics.storage.current, usageMetrics.storage.limit)}
              variant={getUsageColor(getUsagePercentage(usageMetrics.storage.current, usageMetrics.storage.limit))}
            />
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Zap className="w-4 h-4 text-orange-600" />
                <span className="text-sm font-medium text-gray-700">API Calls</span>
              </div>
              <span className="text-sm text-gray-600">
                {formatNumber(usageMetrics.apiCalls.current)}/{formatNumber(usageMetrics.apiCalls.limit)}
              </span>
            </div>
            <ProgressBar
              value={getUsagePercentage(usageMetrics.apiCalls.current, usageMetrics.apiCalls.limit)}
              variant={getUsageColor(getUsagePercentage(usageMetrics.apiCalls.current, usageMetrics.apiCalls.limit))}
            />
          </div>
        </div>
      </Card>

      {/* Billing History */}
      <Card>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Billing History</h2>
            <p className="text-gray-600">Your recent invoices and payments</p>
          </div>
          <Button variant="outline" size="sm">
            <Settings className="w-4 h-4 mr-2" />
            Manage Payment Methods
          </Button>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Description
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Amount
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {billingHistory.map((invoice) => (
                <tr key={invoice.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {invoice.date.toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {invoice.description}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    ${invoice.amount} {invoice.currency}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <Badge
                      variant={
                        invoice.status === 'paid' ? 'success' :
                        invoice.status === 'pending' ? 'warning' : 'danger'
                      }
                      size="sm"
                    >
                      {invoice.status}
                    </Badge>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <Button variant="ghost" size="sm">
                      <Download className="w-4 h-4 mr-1" />
                      Download
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Upgrade Modal */}
      {showUpgradeModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900">Upgrade Your Plan</h2>
              <button
                onClick={() => setShowUpgradeModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {availablePlans.map((plan) => (
                <div
                  key={plan.id}
                  className={`border-2 rounded-lg p-6 cursor-pointer transition-colors ${
                    selectedPlan?.id === plan.id
                      ? 'border-blue-500 bg-blue-50'
                      : plan.id === currentTenant.subscription.id
                      ? 'border-green-500 bg-green-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => setSelectedPlan(plan)}
                >
                  <div className="text-center mb-4">
                    <h3 className="text-lg font-semibold text-gray-900 capitalize">
                      {plan.name}
                    </h3>
                    {plan.id === currentTenant.subscription.id && (
                      <Badge variant="success" size="sm" className="mt-2">
                        Current Plan
                      </Badge>
                    )}
                  </div>

                  <div className="text-center mb-6">
                    <span className="text-3xl font-bold text-gray-900">
                      ${plan.price.monthly}
                    </span>
                    <span className="text-gray-500">/month</span>
                  </div>

                  <ul className="space-y-2 mb-6">
                    {plan.features.map((feature, index) => (
                      <li key={index} className="flex items-center text-sm">
                        <Check className="w-4 h-4 text-green-500 mr-2" />
                        {feature}
                      </li>
                    ))}
                  </ul>

                  <div className="space-y-2 text-sm text-gray-600">
                    <div className="flex justify-between">
                      <span>Users:</span>
                      <span>{plan.limits.users}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Data Sources:</span>
                      <span>{plan.limits.dataSources}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Storage:</span>
                      <span>{plan.limits.storage}GB</span>
                    </div>
                    <div className="flex justify-between">
                      <span>API Calls:</span>
                      <span>{formatNumber(plan.limits.apiCalls)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-end space-x-3 mt-6">
              <Button
                variant="outline"
                onClick={() => setShowUpgradeModal(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={() => selectedPlan && handleUpgrade(selectedPlan)}
                disabled={!selectedPlan || selectedPlan.id === currentTenant.subscription.id}
              >
                {selectedPlan?.id === currentTenant.subscription.id ? 'Current Plan' : 'Upgrade Plan'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};