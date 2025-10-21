import React, { useState, useEffect } from 'react';
import {
  Shield,
  Key,
  Eye,
  EyeOff,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  Clock,
  Settings,
  Plus,
  Trash2,
  Copy,
  Download,
  Upload
} from 'lucide-react';
import { apiIntegrationService } from '../../services/apiIntegrationService';

interface APIKey {
  id: string;
  name: string;
  createdAt: Date;
  expiresAt?: Date;
  lastUsed?: Date;
  permissions: string[];
  status: 'active' | 'expired' | 'revoked';
}

interface SecuritySettings {
  rateLimiting: {
    enabled: boolean;
    requestsPerSecond?: number;
    requestsPerMinute?: number;
    requestsPerHour?: number;
    burstLimit?: number;
  };
  ipWhitelist: string[];
  encryption: {
    inTransit: boolean;
    atRest: boolean;
  };
  audit: {
    logAllRequests: boolean;
    logFailedRequests: boolean;
    retention: number;
  };
}

interface APISecurityManagerProps {
  integrationId: string;
}

export const APISecurityManager: React.FC<APISecurityManagerProps> = ({ integrationId }) => {
  const [activeTab, setActiveTab] = useState('api-keys');
  const [apiKeys, setApiKeys] = useState<APIKey[]>([]);
  const [securitySettings, setSecuritySettings] = useState<SecuritySettings>({
    rateLimiting: {
      enabled: false
    },
    ipWhitelist: [],
    encryption: {
      inTransit: true,
      atRest: true
    },
    audit: {
      logAllRequests: true,
      logFailedRequests: true,
      retention: 90
    }
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateKeyModal, setShowCreateKeyModal] = useState(false);
  const [showKeyValue, setShowKeyValue] = useState<string | null>(null);
  const [newKeyData, setNewKeyData] = useState<{
    key: string;
    keyId: string;
  } | null>(null);

  useEffect(() => {
    loadSecurityData();
  }, [integrationId]);

  const loadSecurityData = async () => {
    try {
      setLoading(true);
      setError(null);
      const keys = await apiIntegrationService.getApiKeys(integrationId);
      setApiKeys(keys);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load security data');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateApiKey = async (keyData: {
    name: string;
    expiresAt?: Date;
    permissions: string[];
  }) => {
    try {
      const result = await apiIntegrationService.generateApiKey(integrationId, keyData);
      setNewKeyData(result);
      await loadSecurityData();
      setShowCreateKeyModal(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create API key');
    }
  };

  const handleRevokeApiKey = async (keyId: string) => {
    if (!confirm('Are you sure you want to revoke this API key? This action cannot be undone.')) {
      return;
    }

    try {
      await apiIntegrationService.revokeApiKey(integrationId, keyId);
      await loadSecurityData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to revoke API key');
    }
  };

  const handleRotateApiKey = async (keyId: string) => {
    if (!confirm('Are you sure you want to rotate this API key? The old key will be invalidated.')) {
      return;
    }

    try {
      const result = await apiIntegrationService.rotateApiKey(integrationId, keyId);
      setNewKeyData(result);
      await loadSecurityData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to rotate API key');
    }
  };



  const addIpToWhitelist = () => {
    const ip = prompt('Enter IP address to whitelist:');
    if (ip && /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/.test(ip)) {
      setSecuritySettings(prev => ({
        ...prev,
        ipWhitelist: [...prev.ipWhitelist, ip]
      }));
    } else {
      alert('Please enter a valid IP address');
    }
  };

  const removeIpFromWhitelist = (ip: string) => {
    setSecuritySettings(prev => ({
      ...prev,
      ipWhitelist: prev.ipWhitelist.filter(item => item !== ip)
    }));
  };

  const tabs = [
    { id: 'api-keys', label: 'API Keys', icon: Key },
    { id: 'rate-limiting', label: 'Rate Limiting', icon: Shield },
    { id: 'access-control', label: 'Access Control', icon: Settings },
    { id: 'audit', label: 'Audit & Logging', icon: Eye }
  ];

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
          <h2 className="text-xl font-semibold text-gray-900">API Security & Monitoring</h2>
          <p className="text-gray-600">Manage API keys, rate limiting, and security controls</p>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex">
            <AlertTriangle className="h-5 w-5 text-red-400" />
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Error</h3>
              <p className="text-sm text-red-700 mt-1">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* New Key Display */}
      {newKeyData && (
        <div className="bg-green-50 border border-green-200 rounded-md p-4">
          <div className="flex items-start">
            <CheckCircle className="h-5 w-5 text-green-400 mt-0.5" />
            <div className="ml-3 flex-1">
              <h3 className="text-sm font-medium text-green-800">API Key Created Successfully</h3>
              <p className="text-sm text-green-700 mt-1">
                Please copy and store this key securely. It will not be shown again.
              </p>
              <div className="mt-3 flex items-center space-x-2">
                <code className="bg-white px-3 py-2 rounded border text-sm font-mono">
                  {newKeyData.key}
                </code>
                <button
                  onClick={() => navigator.clipboard.writeText(newKeyData.key)}
                  className="p-2 text-green-600 hover:text-green-800"
                  title="Copy to clipboard"
                >
                  <Copy className="h-4 w-4" />
                </button>
              </div>
            </div>
            <button
              onClick={() => setNewKeyData(null)}
              className="text-green-400 hover:text-green-600"
            >
              ×
            </button>
          </div>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center py-2 px-1 border-b-2 font-medium text-sm ${
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
      <div className="mt-6">
        {activeTab === 'api-keys' && (
          <APIKeysTab
            apiKeys={apiKeys}
            onCreateKey={() => setShowCreateKeyModal(true)}
            onRevokeKey={handleRevokeApiKey}
            onRotateKey={handleRotateApiKey}
            showKeyValue={showKeyValue}
            setShowKeyValue={setShowKeyValue}
          />
        )}

        {activeTab === 'rate-limiting' && (
          <RateLimitingTab
            settings={securitySettings.rateLimiting}
            onChange={(rateLimiting) => setSecuritySettings(prev => ({ ...prev, rateLimiting }))}
          />
        )}

        {activeTab === 'access-control' && (
          <AccessControlTab
            ipWhitelist={securitySettings.ipWhitelist}
            encryption={securitySettings.encryption}
            onAddIp={addIpToWhitelist}
            onRemoveIp={removeIpFromWhitelist}
            onEncryptionChange={(encryption) => setSecuritySettings(prev => ({ ...prev, encryption }))}
          />
        )}

        {activeTab === 'audit' && (
          <AuditTab
            settings={securitySettings.audit}
            onChange={(audit) => setSecuritySettings(prev => ({ ...prev, audit }))}
          />
        )}
      </div>

      {/* Create API Key Modal */}
      {showCreateKeyModal && (
        <CreateAPIKeyModal
          onSave={handleCreateApiKey}
          onCancel={() => setShowCreateKeyModal(false)}
        />
      )}
    </div>
  );
};

interface APIKeysTabProps {
  apiKeys: APIKey[];
  onCreateKey: () => void;
  onRevokeKey: (keyId: string) => void;
  onRotateKey: (keyId: string) => void;
  showKeyValue: string | null;
  setShowKeyValue: (keyId: string | null) => void;
}

const APIKeysTab: React.FC<APIKeysTabProps> = ({
  apiKeys,
  onCreateKey,
  onRevokeKey,
  onRotateKey,
  showKeyValue,
  setShowKeyValue
}) => {
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium text-gray-900">API Keys</h3>
        <button
          onClick={onCreateKey}
          className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
        >
          <Plus className="h-4 w-4 mr-2" />
          Create API Key
        </button>
      </div>

      {apiKeys.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <Key className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No API keys</h3>
          <p className="mt-1 text-sm text-gray-500">
            Create your first API key to get started.
          </p>
        </div>
      ) : (
        <div className="bg-white shadow overflow-hidden sm:rounded-md">
          <ul className="divide-y divide-gray-200">
            {apiKeys.map((key) => (
              <li key={key.id} className="px-6 py-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center">
                      <p className="text-sm font-medium text-gray-900">{key.name}</p>
                      <span className={`ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        key.status === 'active' ? 'bg-green-100 text-green-800' :
                        key.status === 'expired' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {key.status}
                      </span>
                    </div>
                    <div className="mt-1 text-sm text-gray-500">
                      <p>Created: {new Date(key.createdAt).toLocaleDateString()}</p>
                      {key.expiresAt && (
                        <p>Expires: {new Date(key.expiresAt).toLocaleDateString()}</p>
                      )}
                      {key.lastUsed && (
                        <p>Last used: {new Date(key.lastUsed).toLocaleDateString()}</p>
                      )}
                      <p>Permissions: {key.permissions.join(', ')}</p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => setShowKeyValue(showKeyValue === key.id ? null : key.id)}
                      className="p-2 text-gray-400 hover:text-gray-600"
                      title={showKeyValue === key.id ? 'Hide key' : 'Show key'}
                    >
                      {showKeyValue === key.id ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>

                    {key.status === 'active' && (
                      <button
                        onClick={() => onRotateKey(key.id)}
                        className="p-2 text-gray-400 hover:text-gray-600"
                        title="Rotate key"
                      >
                        <RefreshCw className="h-4 w-4" />
                      </button>
                    )}

                    <button
                      onClick={() => onRevokeKey(key.id)}
                      className="p-2 text-gray-400 hover:text-red-600"
                      title="Revoke key"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {showKeyValue === key.id && (
                  <div className="mt-3 p-3 bg-gray-50 rounded border">
                    <div className="flex items-center space-x-2">
                      <code className="flex-1 text-sm font-mono">
                        sk_live_1234567890abcdef...
                      </code>
                      <button
                        onClick={() => navigator.clipboard.writeText('sk_live_1234567890abcdef...')}
                        className="p-1 text-gray-400 hover:text-gray-600"
                        title="Copy to clipboard"
                      >
                        <Copy className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

interface RateLimitingTabProps {
  settings: SecuritySettings['rateLimiting'];
  onChange: (settings: SecuritySettings['rateLimiting']) => void;
}

const RateLimitingTab: React.FC<RateLimitingTabProps> = ({ settings, onChange }) => {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4">Rate Limiting</h3>
        
        <div className="space-y-4">
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={settings.enabled}
              onChange={(e) => onChange({ ...settings, enabled: e.target.checked })}
              className="mr-3"
            />
            <span className="text-sm font-medium text-gray-700">Enable rate limiting</span>
          </label>

          {settings.enabled && (
            <div className="grid grid-cols-2 gap-4 ml-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Requests per second
                </label>
                <input
                  type="number"
                  value={settings.requestsPerSecond || ''}
                  onChange={(e) => onChange({
                    ...settings,
                    requestsPerSecond: e.target.value ? parseInt(e.target.value) : undefined
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="10"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Requests per minute
                </label>
                <input
                  type="number"
                  value={settings.requestsPerMinute || ''}
                  onChange={(e) => onChange({
                    ...settings,
                    requestsPerMinute: e.target.value ? parseInt(e.target.value) : undefined
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="600"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Requests per hour
                </label>
                <input
                  type="number"
                  value={settings.requestsPerHour || ''}
                  onChange={(e) => onChange({
                    ...settings,
                    requestsPerHour: e.target.value ? parseInt(e.target.value) : undefined
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="36000"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Burst limit
                </label>
                <input
                  type="number"
                  value={settings.burstLimit || ''}
                  onChange={(e) => onChange({
                    ...settings,
                    burstLimit: e.target.value ? parseInt(e.target.value) : undefined
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="100"
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

interface AccessControlTabProps {
  ipWhitelist: string[];
  encryption: SecuritySettings['encryption'];
  onAddIp: () => void;
  onRemoveIp: (ip: string) => void;
  onEncryptionChange: (encryption: SecuritySettings['encryption']) => void;
}

const AccessControlTab: React.FC<AccessControlTabProps> = ({
  ipWhitelist,
  encryption,
  onAddIp,
  onRemoveIp,
  onEncryptionChange
}) => {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4">IP Whitelist</h3>
        
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-sm text-gray-600">
              Restrict access to specific IP addresses
            </p>
            <button
              onClick={onAddIp}
              className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add IP
            </button>
          </div>

          {ipWhitelist.length === 0 ? (
            <p className="text-sm text-gray-500 italic">No IP restrictions configured</p>
          ) : (
            <div className="space-y-2">
              {ipWhitelist.map((ip, index) => (
                <div key={index} className="flex items-center justify-between bg-gray-50 p-3 rounded-md">
                  <code className="text-sm font-mono">{ip}</code>
                  <button
                    onClick={() => onRemoveIp(ip)}
                    className="text-red-600 hover:text-red-800"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4">Encryption</h3>
        
        <div className="space-y-4">
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={encryption.inTransit}
              onChange={(e) => onEncryptionChange({
                ...encryption,
                inTransit: e.target.checked
              })}
              className="mr-3"
            />
            <div>
              <span className="text-sm font-medium text-gray-700">Encryption in transit</span>
              <p className="text-xs text-gray-500">Require HTTPS/TLS for all API requests</p>
            </div>
          </label>

          <label className="flex items-center">
            <input
              type="checkbox"
              checked={encryption.atRest}
              onChange={(e) => onEncryptionChange({
                ...encryption,
                atRest: e.target.checked
              })}
              className="mr-3"
            />
            <div>
              <span className="text-sm font-medium text-gray-700">Encryption at rest</span>
              <p className="text-xs text-gray-500">Encrypt stored API keys and sensitive data</p>
            </div>
          </label>
        </div>
      </div>
    </div>
  );
};

interface AuditTabProps {
  settings: SecuritySettings['audit'];
  onChange: (settings: SecuritySettings['audit']) => void;
}

const AuditTab: React.FC<AuditTabProps> = ({ settings, onChange }) => {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4">Audit & Logging</h3>
        
        <div className="space-y-4">
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={settings.logAllRequests}
              onChange={(e) => onChange({
                ...settings,
                logAllRequests: e.target.checked
              })}
              className="mr-3"
            />
            <div>
              <span className="text-sm font-medium text-gray-700">Log all requests</span>
              <p className="text-xs text-gray-500">Record all API requests for audit purposes</p>
            </div>
          </label>

          <label className="flex items-center">
            <input
              type="checkbox"
              checked={settings.logFailedRequests}
              onChange={(e) => onChange({
                ...settings,
                logFailedRequests: e.target.checked
              })}
              className="mr-3"
            />
            <div>
              <span className="text-sm font-medium text-gray-700">Log failed requests</span>
              <p className="text-xs text-gray-500">Record failed authentication and authorization attempts</p>
            </div>
          </label>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Log retention (days)
            </label>
            <input
              type="number"
              value={settings.retention}
              onChange={(e) => onChange({
                ...settings,
                retention: parseInt(e.target.value) || 90
              })}
              className="w-32 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              min="1"
              max="365"
            />
            <p className="text-xs text-gray-500 mt-1">
              How long to keep audit logs (1-365 days)
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

interface CreateAPIKeyModalProps {
  onSave: (data: {
    name: string;
    expiresAt?: Date;
    permissions: string[];
  }) => void;
  onCancel: () => void;
}

const CreateAPIKeyModal: React.FC<CreateAPIKeyModalProps> = ({ onSave, onCancel }) => {
  const [formData, setFormData] = useState({
    name: '',
    expiresAt: '',
    permissions: ['read'] as string[]
  });

  const availablePermissions = [
    { id: 'read', label: 'Read', description: 'View integration data' },
    { id: 'write', label: 'Write', description: 'Modify integration data' },
    { id: 'execute', label: 'Execute', description: 'Execute integration operations' },
    { id: 'admin', label: 'Admin', description: 'Full administrative access' }
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      name: formData.name,
      expiresAt: formData.expiresAt ? new Date(formData.expiresAt) : undefined,
      permissions: formData.permissions
    });
  };

  const togglePermission = (permission: string) => {
    setFormData(prev => ({
      ...prev,
      permissions: prev.permissions.includes(permission)
        ? prev.permissions.filter(p => p !== permission)
        : [...prev.permissions, permission]
    }));
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
        <div className="mt-3">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Create API Key</h3>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Name
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="API key name"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Expiration (optional)
              </label>
              <input
                type="date"
                value={formData.expiresAt}
                onChange={(e) => setFormData({ ...formData, expiresAt: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                min={new Date().toISOString().split('T')[0]}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Permissions
              </label>
              <div className="space-y-2">
                {availablePermissions.map((permission) => (
                  <label key={permission.id} className="flex items-start">
                    <input
                      type="checkbox"
                      checked={formData.permissions.includes(permission.id)}
                      onChange={() => togglePermission(permission.id)}
                      className="mt-1 mr-3"
                    />
                    <div>
                      <span className="text-sm font-medium text-gray-700">{permission.label}</span>
                      <p className="text-xs text-gray-500">{permission.description}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>

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
                Create API Key
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};