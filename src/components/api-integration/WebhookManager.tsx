import React, { useState, useEffect } from 'react';
import {
  Webhook,
  Plus,
  Edit,
  Trash2,
  Play,
  Pause,
  TestTube,
  Activity,
  AlertCircle,
  CheckCircle,
  Clock,
  Settings,
  Eye,
  Download,
  RefreshCw
} from 'lucide-react';
import { apiIntegrationService } from '../../services/apiIntegrationService';
import { WebhookConfig, WebhookEvent } from '../../types/api-integration';

interface WebhookManagerProps {
  integrationId: string;
}

export const WebhookManager: React.FC<WebhookManagerProps> = ({ integrationId }) => {
  const [webhooks, setWebhooks] = useState<WebhookConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedWebhook, setSelectedWebhook] = useState<WebhookConfig | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showLogsModal, setShowLogsModal] = useState(false);
  const [testResults, setTestResults] = useState<any>(null);

  useEffect(() => {
    loadWebhooks();
  }, [integrationId]);

  const loadWebhooks = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await apiIntegrationService.getWebhooks(integrationId);
      setWebhooks(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load webhooks');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateWebhook = async (webhookData: Omit<WebhookConfig, 'id' | 'createdAt' | 'successCount' | 'failureCount'>) => {
    try {
      await apiIntegrationService.createWebhook(integrationId, webhookData);
      await loadWebhooks();
      setShowCreateModal(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create webhook');
    }
  };

  const handleUpdateWebhook = async (webhookId: string, updates: Partial<WebhookConfig>) => {
    try {
      await apiIntegrationService.updateWebhook(integrationId, webhookId, updates);
      await loadWebhooks();
      setShowEditModal(false);
      setSelectedWebhook(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update webhook');
    }
  };

  const handleDeleteWebhook = async (webhookId: string) => {
    if (!confirm('Are you sure you want to delete this webhook?')) return;

    try {
      await apiIntegrationService.deleteWebhook(integrationId, webhookId);
      await loadWebhooks();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete webhook');
    }
  };

  const handleTestWebhook = async (webhook: WebhookConfig) => {
    try {
      const result = await apiIntegrationService.testWebhook(integrationId, webhook.id, {
        test: true,
        timestamp: new Date().toISOString()
      });
      setTestResults(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to test webhook');
    }
  };

  const toggleWebhookStatus = async (webhook: WebhookConfig) => {
    const newStatus = webhook.status === 'active' ? 'inactive' : 'active';
    await handleUpdateWebhook(webhook.id, { status: newStatus });
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
          <h2 className="text-xl font-semibold text-gray-900">Webhook Management</h2>
          <p className="text-gray-600">Configure and monitor webhooks for real-time event processing</p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={loadWebhooks}
            className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
          >
            <Plus className="h-4 w-4 mr-2" />
            Create Webhook
          </button>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex">
            <AlertCircle className="h-5 w-5 text-red-400" />
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Error</h3>
              <p className="text-sm text-red-700 mt-1">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Test Results */}
      {testResults && (
        <div className={`border rounded-lg p-4 ${
          testResults.success ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'
        }`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              {testResults.success ? (
                <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
              ) : (
                <AlertCircle className="h-5 w-5 text-red-500 mr-2" />
              )}
              <span className={`font-medium ${
                testResults.success ? 'text-green-800' : 'text-red-800'
              }`}>
                Webhook Test {testResults.success ? 'Successful' : 'Failed'}
              </span>
            </div>
            <button
              onClick={() => setTestResults(null)}
              className="text-gray-400 hover:text-gray-600"
            >
              ×
            </button>
          </div>
          
          <div className="mt-2 text-sm space-y-1">
            <p>Response Time: {testResults.responseTime}ms</p>
            {testResults.statusCode && (
              <p>Status Code: {testResults.statusCode}</p>
            )}
            {testResults.error && (
              <p className="text-red-700">Error: {testResults.error}</p>
            )}
          </div>
        </div>
      )}

      {/* Webhooks List */}
      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        {webhooks.length === 0 ? (
          <div className="text-center py-12">
            <Webhook className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No webhooks</h3>
            <p className="mt-1 text-sm text-gray-500">
              Get started by creating a new webhook.
            </p>
            <div className="mt-6">
              <button
                onClick={() => setShowCreateModal(true)}
                className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
              >
                <Plus className="h-4 w-4 mr-2" />
                Create Webhook
              </button>
            </div>
          </div>
        ) : (
          <ul className="divide-y divide-gray-200">
            {webhooks.map((webhook) => (
              <li key={webhook.id}>
                <div className="px-4 py-4 flex items-center justify-between">
                  <div className="flex items-center">
                    <div className={`flex-shrink-0 w-2.5 h-2.5 rounded-full ${
                      webhook.status === 'active' ? 'bg-green-400' :
                      webhook.status === 'error' ? 'bg-red-400' : 'bg-gray-400'
                    }`} />
                    <div className="ml-4">
                      <div className="flex items-center">
                        <p className="text-sm font-medium text-gray-900">{webhook.name}</p>
                        <span className={`ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          webhook.status === 'active' ? 'bg-green-100 text-green-800' :
                          webhook.status === 'error' ? 'bg-red-100 text-red-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {webhook.status}
                        </span>
                      </div>
                      <p className="text-sm text-gray-500">{webhook.url}</p>
                      <div className="flex items-center mt-1 text-xs text-gray-500">
                        <span>Events: {webhook.events.length}</span>
                        <span className="mx-2">•</span>
                        <span>Success: {webhook.successCount}</span>
                        <span className="mx-2">•</span>
                        <span>Failures: {webhook.failureCount}</span>
                        {webhook.lastTriggered && (
                          <>
                            <span className="mx-2">•</span>
                            <span>Last: {new Date(webhook.lastTriggered).toLocaleDateString()}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handleTestWebhook(webhook)}
                      className="p-2 text-gray-400 hover:text-gray-600"
                      title="Test webhook"
                    >
                      <TestTube className="h-4 w-4" />
                    </button>
                    
                    <button
                      onClick={() => {
                        setSelectedWebhook(webhook);
                        setShowLogsModal(true);
                      }}
                      className="p-2 text-gray-400 hover:text-gray-600"
                      title="View logs"
                    >
                      <Eye className="h-4 w-4" />
                    </button>

                    <button
                      onClick={() => toggleWebhookStatus(webhook)}
                      className="p-2 text-gray-400 hover:text-gray-600"
                      title={webhook.status === 'active' ? 'Pause webhook' : 'Activate webhook'}
                    >
                      {webhook.status === 'active' ? (
                        <Pause className="h-4 w-4" />
                      ) : (
                        <Play className="h-4 w-4" />
                      )}
                    </button>

                    <button
                      onClick={() => {
                        setSelectedWebhook(webhook);
                        setShowEditModal(true);
                      }}
                      className="p-2 text-gray-400 hover:text-gray-600"
                      title="Edit webhook"
                    >
                      <Edit className="h-4 w-4" />
                    </button>

                    <button
                      onClick={() => handleDeleteWebhook(webhook.id)}
                      className="p-2 text-gray-400 hover:text-red-600"
                      title="Delete webhook"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Create Webhook Modal */}
      {showCreateModal && (
        <WebhookModal
          onSave={handleCreateWebhook}
          onCancel={() => setShowCreateModal(false)}
        />
      )}

      {/* Edit Webhook Modal */}
      {showEditModal && selectedWebhook && (
        <WebhookModal
          webhook={selectedWebhook}
          onSave={(data) => handleUpdateWebhook(selectedWebhook.id, data)}
          onCancel={() => {
            setShowEditModal(false);
            setSelectedWebhook(null);
          }}
        />
      )}

      {/* Webhook Logs Modal */}
      {showLogsModal && selectedWebhook && (
        <WebhookLogsModal
          integrationId={integrationId}
          webhook={selectedWebhook}
          onClose={() => {
            setShowLogsModal(false);
            setSelectedWebhook(null);
          }}
        />
      )}
    </div>
  );
};

interface WebhookModalProps {
  webhook?: WebhookConfig;
  onSave: (data: Omit<WebhookConfig, 'id' | 'createdAt' | 'successCount' | 'failureCount'>) => void;
  onCancel: () => void;
}

const WebhookModal: React.FC<WebhookModalProps> = ({ webhook, onSave, onCancel }) => {
  const [formData, setFormData] = useState<Partial<WebhookConfig>>({
    name: webhook?.name || '',
    url: webhook?.url || '',
    events: webhook?.events || [],
    authentication: webhook?.authentication || { type: 'none', credentials: {} },
    headers: webhook?.headers || {},
    retryPolicy: webhook?.retryPolicy || {
      maxRetries: 3,
      baseDelay: 1000,
      maxDelay: 10000,
      backoffMultiplier: 2,
      retryableStatusCodes: [408, 429, 500, 502, 503, 504],
      retryableErrors: ['ECONNRESET', 'ETIMEDOUT']
    },
    security: webhook?.security || {
      ipWhitelist: [],
      userAgent: '',
      customHeaders: {}
    },
    status: webhook?.status || 'active'
  });

  const [availableEvents] = useState<WebhookEvent[]>([
    {
      type: 'data.created',
      description: 'Triggered when new data is created',
      payload: { type: 'object', properties: {} }
    },
    {
      type: 'data.updated',
      description: 'Triggered when data is updated',
      payload: { type: 'object', properties: {} }
    },
    {
      type: 'data.deleted',
      description: 'Triggered when data is deleted',
      payload: { type: 'object', properties: {} }
    },
    {
      type: 'sync.completed',
      description: 'Triggered when data sync is completed',
      payload: { type: 'object', properties: {} }
    },
    {
      type: 'sync.failed',
      description: 'Triggered when data sync fails',
      payload: { type: 'object', properties: {} }
    },
    {
      type: 'integration.error',
      description: 'Triggered when integration encounters an error',
      payload: { type: 'object', properties: {} }
    }
  ]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData as any);
  };

  const addEvent = (eventType: string) => {
    const event = availableEvents.find(e => e.type === eventType);
    if (event && !formData.events?.some(e => e.type === eventType)) {
      setFormData({
        ...formData,
        events: [...(formData.events || []), event]
      });
    }
  };

  const removeEvent = (eventType: string) => {
    setFormData({
      ...formData,
      events: formData.events?.filter(e => e.type !== eventType) || []
    });
  };

  const addHeader = () => {
    setFormData({
      ...formData,
      headers: { ...formData.headers, '': '' }
    });
  };

  const updateHeader = (oldKey: string, newKey: string, value: string) => {
    const newHeaders = { ...formData.headers };
    if (oldKey !== newKey) {
      delete newHeaders[oldKey];
    }
    newHeaders[newKey] = value;
    setFormData({ ...formData, headers: newHeaders });
  };

  const removeHeader = (key: string) => {
    const newHeaders = { ...formData.headers };
    delete newHeaders[key];
    setFormData({ ...formData, headers: newHeaders });
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-11/12 max-w-4xl shadow-lg rounded-md bg-white">
        <div className="mt-3">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            {webhook ? 'Edit Webhook' : 'Create Webhook'}
          </h3>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Basic Information */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Name
                </label>
                <input
                  type="text"
                  required
                  value={formData.name || ''}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Webhook name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  URL
                </label>
                <input
                  type="url"
                  required
                  value={formData.url || ''}
                  onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="https://example.com/webhook"
                />
              </div>
            </div>

            {/* Events */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Events
              </label>
              <div className="space-y-2">
                {formData.events?.map((event) => (
                  <div key={event.type} className="flex items-center justify-between bg-gray-50 p-3 rounded-md">
                    <div>
                      <span className="font-medium text-sm">{event.type}</span>
                      <p className="text-xs text-gray-500">{event.description}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeEvent(event.type)}
                      className="text-red-600 hover:text-red-800"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
              
              <div className="mt-2">
                <select
                  onChange={(e) => {
                    if (e.target.value) {
                      addEvent(e.target.value);
                      e.target.value = '';
                    }
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select an event to add</option>
                  {availableEvents
                    .filter(event => !formData.events?.some(e => e.type === event.type))
                    .map((event) => (
                      <option key={event.type} value={event.type}>
                        {event.type} - {event.description}
                      </option>
                    ))}
                </select>
              </div>
            </div>

            {/* Headers */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Custom Headers
              </label>
              <div className="space-y-2">
                {Object.entries(formData.headers || {}).map(([key, value], index) => (
                  <div key={index} className="flex space-x-2">
                    <input
                      type="text"
                      value={key}
                      onChange={(e) => updateHeader(key, e.target.value, value)}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Header name"
                    />
                    <input
                      type="text"
                      value={value}
                      onChange={(e) => updateHeader(key, key, e.target.value)}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Header value"
                    />
                    <button
                      type="button"
                      onClick={() => removeHeader(key)}
                      className="px-3 py-2 text-red-600 hover:text-red-800"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={addHeader}
                  className="text-blue-600 hover:text-blue-800 text-sm"
                >
                  + Add Header
                </button>
              </div>
            </div>

            {/* Authentication */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Authentication
              </label>
              <select
                value={formData.authentication?.type || 'none'}
                onChange={(e) => setFormData({
                  ...formData,
                  authentication: {
                    ...formData.authentication!,
                    type: e.target.value as any
                  }
                })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="none">None</option>
                <option value="basic">Basic Auth</option>
                <option value="bearer">Bearer Token</option>
                <option value="hmac">HMAC Signature</option>
              </select>

              {formData.authentication?.type === 'basic' && (
                <div className="grid grid-cols-2 gap-4 mt-2">
                  <input
                    type="text"
                    placeholder="Username"
                    value={formData.authentication.credentials?.username || ''}
                    onChange={(e) => setFormData({
                      ...formData,
                      authentication: {
                        ...formData.authentication!,
                        credentials: {
                          ...formData.authentication!.credentials,
                          username: e.target.value
                        }
                      }
                    })}
                    className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <input
                    type="password"
                    placeholder="Password"
                    value={formData.authentication.credentials?.password || ''}
                    onChange={(e) => setFormData({
                      ...formData,
                      authentication: {
                        ...formData.authentication!,
                        credentials: {
                          ...formData.authentication!.credentials,
                          password: e.target.value
                        }
                      }
                    })}
                    className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              )}

              {formData.authentication?.type === 'bearer' && (
                <input
                  type="password"
                  placeholder="Bearer Token"
                  value={formData.authentication.credentials?.token || ''}
                  onChange={(e) => setFormData({
                    ...formData,
                    authentication: {
                      ...formData.authentication!,
                      credentials: {
                        ...formData.authentication!.credentials,
                        token: e.target.value
                      }
                    }
                  })}
                  className="w-full mt-2 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              )}
            </div>

            {/* Actions */}
            <div className="flex justify-end space-x-3 pt-4 border-t">
              <button
                type="button"
                onClick={onCancel}
                className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
              >
                {webhook ? 'Update Webhook' : 'Create Webhook'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

interface WebhookLogsModalProps {
  integrationId: string;
  webhook: WebhookConfig;
  onClose: () => void;
}

const WebhookLogsModal: React.FC<WebhookLogsModalProps> = ({ integrationId, webhook, onClose }) => {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    status: '',
    startDate: '',
    endDate: '',
    limit: 50
  });

  useEffect(() => {
    loadLogs();
  }, [filters]);

  const loadLogs = async () => {
    try {
      setLoading(true);
      const filterParams: any = { limit: filters.limit };
      if (filters.status) filterParams.status = filters.status;
      if (filters.startDate) filterParams.startDate = new Date(filters.startDate);
      if (filters.endDate) filterParams.endDate = new Date(filters.endDate);

      const data = await apiIntegrationService.getWebhookLogs(integrationId, webhook.id, filterParams);
      setLogs(data.logs);
    } catch (err) {
      console.error('Failed to load webhook logs:', err);
    } finally {
      setLoading(false);
    }
  };

  const exportLogs = () => {
    const csvContent = [
      ['Timestamp', 'Event', 'Status', 'Duration', 'Error'].join(','),
      ...logs.map(log => [
        new Date(log.timestamp).toISOString(),
        log.event,
        log.statusCode ? 'Success' : 'Failed',
        `${log.duration}ms`,
        log.error || ''
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `webhook-logs-${webhook.name}-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-10 mx-auto p-5 border w-11/12 max-w-6xl shadow-lg rounded-md bg-white">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-medium text-gray-900">
            Webhook Logs: {webhook.name}
          </h3>
          <div className="flex space-x-2">
            <button
              onClick={exportLogs}
              className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              <Download className="h-4 w-4 mr-2" />
              Export
            </button>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              ×
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-4 gap-4 mb-4">
          <select
            value={filters.status}
            onChange={(e) => setFilters({ ...filters, status: e.target.value })}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Status</option>
            <option value="success">Success</option>
            <option value="failure">Failure</option>
          </select>

          <input
            type="date"
            value={filters.startDate}
            onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />

          <input
            type="date"
            value={filters.endDate}
            onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />

          <select
            value={filters.limit}
            onChange={(e) => setFilters({ ...filters, limit: parseInt(e.target.value) })}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value={25}>25 logs</option>
            <option value={50}>50 logs</option>
            <option value={100}>100 logs</option>
            <option value={200}>200 logs</option>
          </select>
        </div>

        {/* Logs Table */}
        <div className="overflow-x-auto">
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Timestamp
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Event
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Duration
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Error
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {logs.map((log) => (
                  <tr key={log.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {new Date(log.timestamp).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {log.event}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        log.statusCode && log.statusCode >= 200 && log.statusCode < 300
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {log.statusCode || 'Failed'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {log.duration}ms
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900 max-w-xs truncate">
                      {log.error || '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {logs.length === 0 && !loading && (
          <div className="text-center py-8 text-gray-500">
            No logs found for the selected filters.
          </div>
        )}
      </div>
    </div>
  );
};