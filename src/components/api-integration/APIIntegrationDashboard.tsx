import React, { useState, useEffect } from 'react';
import {
  Globe,
  Settings,
  Activity,
  Webhook,
  Shield,
  RefreshCw,
  Plus,
  Search,
  AlertTriangle,
  CheckCircle,
  Clock
} from 'lucide-react';
import { apiIntegrationService } from '../../services/apiIntegrationService';
import { APIIntegration } from '../../types/api-integration';
import { IntegrationConfigurationWizard } from './IntegrationConfigurationWizard';
import { WebhookManager } from './WebhookManager';
import { APISecurityManager } from './APISecurityManager';
import { IntegrationMonitoringDashboard } from './IntegrationMonitoringDashboard';
import { DataSynchronizationManager } from './DataSynchronizationManager';

interface TabConfig {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  component: React.ComponentType<{ integrationId?: string }>;
}

export const APIIntegrationDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [integrations, setIntegrations] = useState<APIIntegration[]>([]);
  const [selectedIntegration, setSelectedIntegration] = useState<APIIntegration | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [showCreateWizard, setShowCreateWizard] = useState(false);
  const [systemHealth, setSystemHealth] = useState<any>(null);

  const tabs: TabConfig[] = [
    {
      id: 'overview',
      label: 'Overview',
      icon: Globe,
      component: () => <OverviewTab />
    },
    {
      id: 'webhooks',
      label: 'Webhooks',
      icon: Webhook,
      component: ({ integrationId }) => (
        integrationId ? <WebhookManager integrationId={integrationId} /> : <SelectIntegrationMessage />
      )
    },
    {
      id: 'security',
      label: 'Security',
      icon: Shield,
      component: ({ integrationId }) => (
        integrationId ? <APISecurityManager integrationId={integrationId} /> : <SelectIntegrationMessage />
      )
    },
    {
      id: 'monitoring',
      label: 'Monitoring',
      icon: Activity,
      component: ({ integrationId }) => (
        integrationId ? <IntegrationMonitoringDashboard integrationId={integrationId} /> : <SelectIntegrationMessage />
      )
    },
    {
      id: 'sync',
      label: 'Data Sync',
      icon: RefreshCw,
      component: () => <DataSynchronizationManager />
    }
  ];

  useEffect(() => {
    loadIntegrations();
    loadSystemHealth();
  }, []);

  const loadIntegrations = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await apiIntegrationService.getIntegrations();
      setIntegrations(data);
      
      // Auto-select first integration if none selected
      if (!selectedIntegration && data.length > 0) {
        setSelectedIntegration(data[0]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load integrations');
    } finally {
      setLoading(false);
    }
  };

  const loadSystemHealth = async () => {
    try {
      const health = await apiIntegrationService.getSystemHealth();
      setSystemHealth(health);
    } catch (err) {
      console.error('Failed to load system health:', err);
    }
  };

  const handleCreateIntegration = (integration: APIIntegration) => {
    setIntegrations(prev => [...prev, integration]);
    setSelectedIntegration(integration);
    setShowCreateWizard(false);
  };

  const handleDeleteIntegration = async (integrationId: string) => {
    if (!confirm('Are you sure you want to delete this integration?')) return;

    try {
      await apiIntegrationService.deleteIntegration(integrationId);
      setIntegrations(prev => prev.filter(i => i.id !== integrationId));
      
      if (selectedIntegration?.id === integrationId) {
        const remaining = integrations.filter(i => i.id !== integrationId);
        setSelectedIntegration(remaining.length > 0 ? remaining[0] : null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete integration');
    }
  };

  const filteredIntegrations = integrations.filter(integration => {
    const matchesSearch = integration.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         integration.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = !filterType || integration.type === filterType;
    const matchesStatus = !filterStatus || integration.status === filterStatus;
    
    return matchesSearch && matchesType && matchesStatus;
  });

  const OverviewTab = () => (
    <div className="space-y-6">
      {/* System Health */}
      {systemHealth && (
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900">System Health</h3>
            <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
              systemHealth.status === 'healthy' ? 'bg-green-100 text-green-800' :
              systemHealth.status === 'degraded' ? 'bg-yellow-100 text-yellow-800' :
              'bg-red-100 text-red-800'
            }`}>
              {systemHealth.status}
            </span>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {systemHealth.integrations.slice(0, 6).map((integration: any) => (
              <div key={integration.id} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                <div>
                  <p className="text-sm font-medium text-gray-900">{integration.name}</p>
                  {integration.responseTime && (
                    <p className="text-xs text-gray-500">{integration.responseTime}ms</p>
                  )}
                </div>
                <div className="flex items-center">
                  {integration.status === 'healthy' ? (
                    <CheckCircle className="h-5 w-5 text-green-500" />
                  ) : (
                    <AlertTriangle className="h-5 w-5 text-red-500" />
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Integration Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <Globe className="h-8 w-8 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Total Integrations</p>
              <p className="text-2xl font-semibold text-gray-900">{integrations.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Active</p>
              <p className="text-2xl font-semibold text-gray-900">
                {integrations.filter(i => i.status === 'active').length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <AlertTriangle className="h-8 w-8 text-red-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Errors</p>
              <p className="text-2xl font-semibold text-gray-900">
                {integrations.filter(i => i.status === 'error').length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <Clock className="h-8 w-8 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Configuring</p>
              <p className="text-2xl font-semibold text-gray-900">
                {integrations.filter(i => i.status === 'configuring').length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Integrations */}
      <div className="bg-white border border-gray-200 rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Recent Integrations</h3>
        </div>
        <div className="divide-y divide-gray-200">
          {integrations.slice(0, 5).map((integration) => (
            <div key={integration.id} className="px-6 py-4 flex items-center justify-between">
              <div className="flex items-center">
                <div className={`flex-shrink-0 w-2.5 h-2.5 rounded-full ${
                  integration.status === 'active' ? 'bg-green-400' :
                  integration.status === 'error' ? 'bg-red-400' : 'bg-gray-400'
                }`} />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-900">{integration.name}</p>
                  <p className="text-sm text-gray-500">{integration.type} • {integration.category}</p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  integration.status === 'active' ? 'bg-green-100 text-green-800' :
                  integration.status === 'error' ? 'bg-red-100 text-red-800' :
                  'bg-gray-100 text-gray-800'
                }`}>
                  {integration.status}
                </span>
                <button
                  onClick={() => setSelectedIntegration(integration)}
                  className="text-blue-600 hover:text-blue-800 text-sm"
                >
                  View
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const SelectIntegrationMessage = () => (
    <div className="text-center py-12">
      <Globe className="mx-auto h-12 w-12 text-gray-400" />
      <h3 className="mt-2 text-sm font-medium text-gray-900">No integration selected</h3>
      <p className="mt-1 text-sm text-gray-500">
        Select an integration from the sidebar to manage its settings.
      </p>
    </div>
  );

  const ActiveTabComponent = tabs.find(tab => tab.id === activeTab)?.component || OverviewTab;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-semibold text-gray-900">API Integrations</h1>
            <button
              onClick={() => setShowCreateWizard(true)}
              className="p-2 text-blue-600 hover:text-blue-800"
              title="Create integration"
            >
              <Plus className="h-5 w-5" />
            </button>
          </div>
          
          {/* Search and Filters */}
          <div className="mt-4 space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search integrations..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            <div className="flex space-x-2">
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Types</option>
                <option value="crm">CRM</option>
                <option value="erp">ERP</option>
                <option value="hr">HR</option>
                <option value="marketing">Marketing</option>
                <option value="analytics">Analytics</option>
                <option value="custom">Custom</option>
              </select>
              
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="error">Error</option>
                <option value="configuring">Configuring</option>
              </select>
            </div>
          </div>
        </div>

        {/* Integration List */}
        <div className="flex-1 overflow-y-auto">
          {filteredIntegrations.length === 0 ? (
            <div className="text-center py-8 px-6">
              <Globe className="mx-auto h-8 w-8 text-gray-400" />
              <p className="mt-2 text-sm text-gray-500">
                {integrations.length === 0 ? 'No integrations yet' : 'No matching integrations'}
              </p>
              {integrations.length === 0 && (
                <button
                  onClick={() => setShowCreateWizard(true)}
                  className="mt-3 text-sm text-blue-600 hover:text-blue-800"
                >
                  Create your first integration
                </button>
              )}
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {filteredIntegrations.map((integration) => (
                <div
                  key={integration.id}
                  onClick={() => setSelectedIntegration(integration)}
                  className={`p-4 cursor-pointer hover:bg-gray-50 ${
                    selectedIntegration?.id === integration.id ? 'bg-blue-50 border-r-2 border-blue-500' : ''
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center min-w-0 flex-1">
                      <div className={`flex-shrink-0 w-2.5 h-2.5 rounded-full ${
                        integration.status === 'active' ? 'bg-green-400' :
                        integration.status === 'error' ? 'bg-red-400' : 'bg-gray-400'
                      }`} />
                      <div className="ml-3 min-w-0 flex-1">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {integration.name}
                        </p>
                        <p className="text-xs text-gray-500 truncate">
                          {integration.type} • {integration.category}
                        </p>
                        {integration.lastUsed && (
                          <p className="text-xs text-gray-400">
                            Last used: {new Date(integration.lastUsed).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteIntegration(integration.id);
                      }}
                      className="p-1 text-gray-400 hover:text-red-600"
                      title="Delete integration"
                    >
                      <Settings className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Tab Navigation */}
        <div className="bg-white border-b border-gray-200 px-6">
          <nav className="-mb-px flex space-x-8">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center py-4 px-1 border-b-2 font-medium text-sm ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Icon className="h-4 w-4 mr-2" />
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {error && (
            <div className="mb-6 bg-red-50 border border-red-200 rounded-md p-4">
              <div className="flex">
                <AlertTriangle className="h-5 w-5 text-red-400" />
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800">Error</h3>
                  <p className="text-sm text-red-700 mt-1">{error}</p>
                </div>
              </div>
            </div>
          )}
          
          <ActiveTabComponent integrationId={selectedIntegration?.id} />
        </div>
      </div>

      {/* Create Integration Wizard */}
      {showCreateWizard && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative min-h-screen flex items-center justify-center p-4">
            <div className="relative bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-y-auto">
              <IntegrationConfigurationWizard
                onComplete={handleCreateIntegration}
                onCancel={() => setShowCreateWizard(false)}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};