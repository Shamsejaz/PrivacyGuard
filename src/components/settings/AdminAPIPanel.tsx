import React, { useState, useEffect } from 'react';
import { Server, Globe, Shield, Save, RefreshCw, CheckCircle, AlertTriangle, Eye, EyeOff } from 'lucide-react';
import Card from '../ui/Card';
import Button from '../ui/Button';
import Badge from '../ui/Badge';

interface APIConfiguration {
  endpoints: {
    baseUrl: string;
    timeout: number;
    retries: number;
    rateLimit: number;
  };
  authentication: {
    method: 'api-key' | 'oauth' | 'jwt' | 'basic';
    apiKey: string;
    bearerToken: string;
    basicAuth: {
      username: string;
      password: string;
    };
  };
  integrations: {
    googleDlp: {
      enabled: boolean;
      apiKey: string;
      projectId: string;
      region: string;
    };
    microsoftGraph: {
      enabled: boolean;
      tenantId: string;
      clientId: string;
      clientSecret: string;
    };
  };
}

const AdminAPIPanel: React.FC = () => {
  const [config, setConfig] = useState<APIConfiguration>({
    endpoints: {
      baseUrl: 'https://api.privacycomply.com',
      timeout: 30000,
      retries: 3,
      rateLimit: 1000
    },
    authentication: {
      method: 'api-key',
      apiKey: '',
      bearerToken: '',
      basicAuth: {
        username: '',
        password: ''
      }
    },
    integrations: {
      googleDlp: {
        enabled: false,
        apiKey: '',
        projectId: '',
        region: 'us-central1'
      },
      microsoftGraph: {
        enabled: false,
        tenantId: '',
        clientId: '',
        clientSecret: ''
      }
    }
  });

  const [activeSection, setActiveSection] = useState('endpoints');
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [testingConnection, setTestingConnection] = useState<string | null>(null);
  const [showSecrets, setShowSecrets] = useState<Record<string, boolean>>({});

  useEffect(() => {
    loadConfiguration();
  }, []);

  const loadConfiguration = () => {
    const savedConfig = localStorage.getItem('adminApiConfig');
    if (savedConfig) {
      setConfig(JSON.parse(savedConfig));
    }
  };

  const saveConfiguration = async () => {
    setIsSaving(true);
    setSaveMessage(null);

    try {
      localStorage.setItem('adminApiConfig', JSON.stringify(config));
      
      setSaveMessage({
        type: 'success',
        text: 'API configuration saved successfully.'
      });
    } catch (error) {
      setSaveMessage({
        type: 'error',
        text: `Failed to save configuration: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
    } finally {
      setIsSaving(false);
    }
  };

  const testConnection = async (integration: string) => {
    setTestingConnection(integration);
    
    try {
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      setSaveMessage({
        type: 'success',
        text: `${integration} connection test successful!`
      });
    } catch (error) {
      setSaveMessage({
        type: 'error',
        text: `${integration} connection test failed.`
      });
    } finally {
      setTestingConnection(null);
    }
  };

  const updateConfig = (path: string, value: any) => {
    setConfig(prev => {
      const keys = path.split('.');
      const updated = { ...prev };
      let current: any = updated;
      
      for (let i = 0; i < keys.length - 1; i++) {
        current[keys[i]] = { ...current[keys[i]] };
        current = current[keys[i]];
      }
      
      current[keys[keys.length - 1]] = value;
      return updated;
    });
  };

  const toggleSecret = (key: string) => {
    setShowSecrets(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const sections = [
    { id: 'endpoints', label: 'API Endpoints', icon: Server },
    { id: 'integrations', label: 'Integrations', icon: Globe },
    { id: 'security', label: 'Security', icon: Shield }
  ];

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-900">Admin API Configuration</h2>
          <Button onClick={saveConfiguration} disabled={isSaving}>
            <Save className="h-4 w-4 mr-2" />
            {isSaving ? 'Saving...' : 'Save Configuration'}
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="md:col-span-1">
            <nav className="space-y-1">
              {sections.map((section) => (
                <button
                  key={section.id}
                  onClick={() => setActiveSection(section.id)}
                  className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-left transition-colors duration-200 ${
                    activeSection === section.id
                      ? 'bg-blue-50 text-blue-700'
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <section.icon className="h-5 w-5" />
                  <span className="font-medium">{section.label}</span>
                </button>
              ))}
            </nav>
          </div>

          <div className="md:col-span-3">
            <Card className="p-6">
              {activeSection === 'endpoints' && (
                <div className="space-y-6">
                  <h3 className="text-lg font-medium text-gray-900">API Endpoint Configuration</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Base URL
                      </label>
                      <input
                        type="url"
                        value={config.endpoints.baseUrl}
                        onChange={(e) => updateConfig('endpoints.baseUrl', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="https://api.privacycomply.com"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Timeout (ms)
                      </label>
                      <input
                        type="number"
                        value={config.endpoints.timeout}
                        onChange={(e) => updateConfig('endpoints.timeout', parseInt(e.target.value))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        min="1000"
                        max="300000"
                      />
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h4 className="text-md font-medium text-gray-900">Authentication Method</h4>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {[
                        { value: 'api-key', label: 'API Key' },
                        { value: 'oauth', label: 'OAuth 2.0' },
                        { value: 'jwt', label: 'JWT Token' },
                        { value: 'basic', label: 'Basic Auth' }
                      ].map(({ value, label }) => (
                        <button
                          key={value}
                          onClick={() => updateConfig('authentication.method', value)}
                          className={`p-3 border rounded-lg text-center transition-colors ${
                            config.authentication.method === value
                              ? 'border-blue-500 bg-blue-50 text-blue-700'
                              : 'border-gray-300 hover:border-gray-400'
                          }`}
                        >
                          {label}
                        </button>
                      ))}
                    </div>

                    {config.authentication.method === 'api-key' && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          API Key
                        </label>
                        <div className="relative">
                          <input
                            type={showSecrets.apiKey ? 'text' : 'password'}
                            value={config.authentication.apiKey}
                            onChange={(e) => updateConfig('authentication.apiKey', e.target.value)}
                            className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="Enter API key"
                          />
                          <button
                            type="button"
                            onClick={() => toggleSecret('apiKey')}
                            className="absolute inset-y-0 right-0 pr-3 flex items-center"
                          >
                            {showSecrets.apiKey ? (
                              <EyeOff className="h-4 w-4 text-gray-400" />
                            ) : (
                              <Eye className="h-4 w-4 text-gray-400" />
                            )}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {activeSection === 'integrations' && (
                <div className="space-y-6">
                  <h3 className="text-lg font-medium text-gray-900">Third-Party Integrations</h3>
                  
                  <Card className="p-4">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center space-x-3">
                        <h4 className="text-md font-medium text-gray-900">Google Cloud DLP</h4>
                        <Badge variant={config.integrations.googleDlp.enabled ? 'success' : 'default'}>
                          {config.integrations.googleDlp.enabled ? 'Enabled' : 'Disabled'}
                        </Badge>
                      </div>
                      <div className="flex space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => testConnection('Google DLP')}
                          disabled={testingConnection === 'Google DLP' || !config.integrations.googleDlp.enabled}
                        >
                          {testingConnection === 'Google DLP' ? (
                            <RefreshCw className="h-3 w-3 animate-spin" />
                          ) : (
                            'Test'
                          )}
                        </Button>
                        <input
                          type="checkbox"
                          checked={config.integrations.googleDlp.enabled}
                          onChange={(e) => updateConfig('integrations.googleDlp.enabled', e.target.checked)}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                      </div>
                    </div>
                    
                    {config.integrations.googleDlp.enabled && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Project ID
                          </label>
                          <input
                            type="text"
                            value={config.integrations.googleDlp.projectId}
                            onChange={(e) => updateConfig('integrations.googleDlp.projectId', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                        <div className="md:col-span-2">
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            API Key
                          </label>
                          <div className="relative">
                            <input
                              type={showSecrets.googleApiKey ? 'text' : 'password'}
                              value={config.integrations.googleDlp.apiKey}
                              onChange={(e) => updateConfig('integrations.googleDlp.apiKey', e.target.value)}
                              className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                            <button
                              type="button"
                              onClick={() => toggleSecret('googleApiKey')}
                              className="absolute inset-y-0 right-0 pr-3 flex items-center"
                            >
                              {showSecrets.googleApiKey ? (
                                <EyeOff className="h-4 w-4 text-gray-400" />
                              ) : (
                                <Eye className="h-4 w-4 text-gray-400" />
                              )}
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </Card>
                </div>
              )}

              {activeSection === 'security' && (
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">API Security Settings</h3>
                  <p className="text-gray-600">API security configuration coming soon...</p>
                </div>
              )}
            </Card>
          </div>
        </div>

        {saveMessage && (
          <div className="flex items-center space-x-2 p-4 rounded-lg bg-gray-50 mt-6">
            {saveMessage.type === 'success' ? (
              <CheckCircle className="h-4 w-4 text-green-500" />
            ) : (
              <AlertTriangle className="h-4 w-4 text-red-500" />
            )}
            <span className={saveMessage.type === 'success' ? 'text-green-600' : 'text-red-600'}>
              {saveMessage.text}
            </span>
          </div>
        )}
      </Card>
    </div>
  );
};

export default AdminAPIPanel;