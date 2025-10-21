import React, { useState, useEffect } from 'react';
import { X, Save, AlertTriangle, Info, Key, Globe, Clock, Zap } from 'lucide-react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { AIAgent, AgentConfig, AgentCredentials, AgentEndpoints } from '../../types/ai-agents';

interface AgentConfigurationModalProps {
  agent: AIAgent;
  isOpen: boolean;
  onClose: () => void;
  onSave: (config: AgentConfig) => Promise<void>;
}

export const AgentConfigurationModal: React.FC<AgentConfigurationModalProps> = ({
  agent,
  isOpen,
  onClose,
  onSave
}) => {
  const [config, setConfig] = useState<AgentConfig>(agent.configuration);
  const [isSaving, setIsSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [activeTab, setActiveTab] = useState<'general' | 'credentials' | 'endpoints' | 'advanced'>('general');

  useEffect(() => {
    setConfig(agent.configuration);
    setErrors({});
  }, [agent]);

  const validateConfig = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (config.maxConcurrentTasks < 1 || config.maxConcurrentTasks > 100) {
      newErrors.maxConcurrentTasks = 'Must be between 1 and 100';
    }

    if (config.timeout < 1000 || config.timeout > 300000) {
      newErrors.timeout = 'Must be between 1000ms and 300000ms';
    }

    if (config.retryAttempts < 0 || config.retryAttempts > 10) {
      newErrors.retryAttempts = 'Must be between 0 and 10';
    }

    if (config.priority < 1 || config.priority > 10) {
      newErrors.priority = 'Must be between 1 and 10';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validateConfig()) {
      return;
    }

    setIsSaving(true);
    try {
      await onSave(config);
    } catch (error) {
      console.error('Failed to save configuration:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const updateConfig = (updates: Partial<AgentConfig>) => {
    setConfig(prev => ({ ...prev, ...updates }));
  };

  const updateCredentials = (credentials: Partial<AgentCredentials>) => {
    setConfig(prev => ({
      ...prev,
      credentials: { ...prev.credentials, ...credentials }
    }));
  };

  const updateEndpoints = (endpoints: Partial<AgentEndpoints>) => {
    setConfig(prev => ({
      ...prev,
      endpoints: { ...prev.endpoints, ...endpoints }
    }));
  };

  const updateSettings = (key: string, value: any) => {
    setConfig(prev => ({
      ...prev,
      settings: { ...prev.settings, [key]: value }
    }));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Configure Agent</h2>
            <p className="text-sm text-gray-600">{agent.name} ({agent.type})</p>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6">
            {[
              { id: 'general', label: 'General', icon: Zap },
              { id: 'credentials', label: 'Credentials', icon: Key },
              { id: 'endpoints', label: 'Endpoints', icon: Globe },
              { id: 'advanced', label: 'Advanced', icon: Clock }
            ].map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id as any)}
                className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{label}</span>
              </button>
            ))}
          </nav>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[60vh]">
          {activeTab === 'general' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Enabled
                  </label>
                  <div className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      checked={config.enabled}
                      onChange={(e) => updateConfig({ enabled: e.target.checked })}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <span className="text-sm text-gray-600">
                      Enable this agent for task execution
                    </span>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Priority (1-10)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    value={config.priority}
                    onChange={(e) => updateConfig({ priority: parseInt(e.target.value) })}
                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      errors.priority ? 'border-red-300' : 'border-gray-300'
                    }`}
                  />
                  {errors.priority && (
                    <p className="mt-1 text-sm text-red-600">{errors.priority}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Max Concurrent Tasks
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={config.maxConcurrentTasks}
                    onChange={(e) => updateConfig({ maxConcurrentTasks: parseInt(e.target.value) })}
                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      errors.maxConcurrentTasks ? 'border-red-300' : 'border-gray-300'
                    }`}
                  />
                  {errors.maxConcurrentTasks && (
                    <p className="mt-1 text-sm text-red-600">{errors.maxConcurrentTasks}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Timeout (ms)
                  </label>
                  <input
                    type="number"
                    min="1000"
                    max="300000"
                    step="1000"
                    value={config.timeout}
                    onChange={(e) => updateConfig({ timeout: parseInt(e.target.value) })}
                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      errors.timeout ? 'border-red-300' : 'border-gray-300'
                    }`}
                  />
                  {errors.timeout && (
                    <p className="mt-1 text-sm text-red-600">{errors.timeout}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Retry Attempts
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="10"
                    value={config.retryAttempts}
                    onChange={(e) => updateConfig({ retryAttempts: parseInt(e.target.value) })}
                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      errors.retryAttempts ? 'border-red-300' : 'border-gray-300'
                    }`}
                  />
                  {errors.retryAttempts && (
                    <p className="mt-1 text-sm text-red-600">{errors.retryAttempts}</p>
                  )}
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
                <div className="flex items-start space-x-3">
                  <Info className="w-5 h-5 text-blue-500 mt-0.5" />
                  <div>
                    <h4 className="text-sm font-medium text-blue-900">Configuration Tips</h4>
                    <ul className="mt-2 text-sm text-blue-700 space-y-1">
                      <li>• Higher priority agents get task preference</li>
                      <li>• Increase concurrent tasks for better throughput</li>
                      <li>• Set appropriate timeouts based on task complexity</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'credentials' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Credential Type
                  </label>
                  <select
                    value={config.credentials?.type || 'api_key'}
                    onChange={(e) => updateCredentials({ type: e.target.value as any })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="api_key">API Key</option>
                    <option value="oauth">OAuth</option>
                    <option value="service_account">Service Account</option>
                    <option value="iam_role">IAM Role</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Credential ID
                  </label>
                  <input
                    type="text"
                    value={config.credentials?.credentialId || ''}
                    onChange={(e) => updateCredentials({ credentialId: e.target.value })}
                    placeholder="Enter credential identifier"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="md:col-span-2">
                  <div className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      checked={config.credentials?.encrypted || false}
                      onChange={(e) => updateCredentials({ encrypted: e.target.checked })}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <span className="text-sm text-gray-700">Encrypt credentials at rest</span>
                  </div>
                </div>
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
                <div className="flex items-start space-x-3">
                  <AlertTriangle className="w-5 h-5 text-yellow-500 mt-0.5" />
                  <div>
                    <h4 className="text-sm font-medium text-yellow-900">Security Notice</h4>
                    <p className="mt-1 text-sm text-yellow-700">
                      Credentials are securely stored and encrypted. Never share credential IDs or expose them in logs.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'endpoints' && (
            <div className="space-y-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Primary Endpoint
                  </label>
                  <input
                    type="url"
                    value={config.endpoints?.primary || ''}
                    onChange={(e) => updateEndpoints({ primary: e.target.value })}
                    placeholder="https://api.example.com"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Health Check Endpoint
                  </label>
                  <input
                    type="url"
                    value={config.endpoints?.healthCheck || ''}
                    onChange={(e) => updateEndpoints({ healthCheck: e.target.value })}
                    placeholder="https://api.example.com/health"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Webhook Endpoint (Optional)
                  </label>
                  <input
                    type="url"
                    value={config.endpoints?.webhook || ''}
                    onChange={(e) => updateEndpoints({ webhook: e.target.value })}
                    placeholder="https://api.example.com/webhook"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Fallback Endpoints (One per line)
                  </label>
                  <textarea
                    value={config.endpoints?.fallback?.join('\n') || ''}
                    onChange={(e) => updateEndpoints({ 
                      fallback: e.target.value.split('\n').filter(url => url.trim()) 
                    })}
                    placeholder="https://fallback1.example.com&#10;https://fallback2.example.com"
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>
          )}

          {activeTab === 'advanced' && (
            <div className="space-y-6">
              <div>
                <h4 className="text-lg font-medium text-gray-900 mb-4">Agent-Specific Settings</h4>
                <div className="space-y-4">
                  {Object.entries(config.settings || {}).map(([key, value]) => (
                    <div key={key} className="flex items-center space-x-4">
                      <div className="flex-1">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          {key}
                        </label>
                        <input
                          type="text"
                          value={typeof value === 'object' ? JSON.stringify(value) : String(value)}
                          onChange={(e) => {
                            try {
                              const parsedValue = JSON.parse(e.target.value);
                              updateSettings(key, parsedValue);
                            } catch {
                              updateSettings(key, e.target.value);
                            }
                          }}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          const newSettings = { ...config.settings };
                          delete newSettings[key];
                          setConfig(prev => ({ ...prev, settings: newSettings }));
                        }}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                  
                  <Button
                    variant="outline"
                    onClick={() => {
                      const key = prompt('Enter setting key:');
                      if (key) {
                        updateSettings(key, '');
                      }
                    }}
                  >
                    Add Setting
                  </Button>
                </div>
              </div>

              <div className="bg-gray-50 border border-gray-200 rounded-md p-4">
                <h5 className="text-sm font-medium text-gray-900 mb-2">Current Capabilities</h5>
                <div className="flex flex-wrap gap-2">
                  {agent.capabilities.map((capability) => (
                    <Badge key={capability} variant="secondary">
                      {capability.replace(/_/g, ' ')}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end space-x-4 p-6 border-t border-gray-200">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? (
              <div className="flex items-center space-x-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                <span>Saving...</span>
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                <Save className="w-4 h-4" />
                <span>Save Configuration</span>
              </div>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};