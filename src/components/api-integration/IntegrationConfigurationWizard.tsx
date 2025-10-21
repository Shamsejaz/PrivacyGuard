import React, { useState, useEffect } from 'react';
import {
  ArrowRight,
  ArrowLeft,
  Check,
  AlertCircle,
  Settings,
  Key,
  Globe,
  Database,
  Zap,
  TestTube,
  Save
} from 'lucide-react';
import { apiIntegrationService } from '../../services/apiIntegrationService';
import {
  APIIntegration,
  IntegrationTemplate,
  APIConfiguration,
  APIAuthentication,
  APIEndpoint,
  DataMapping
} from '../../types/api-integration';

interface WizardStep {
  id: string;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  component: React.ComponentType<any>;
}

interface IntegrationConfigurationWizardProps {
  onComplete: (integration: APIIntegration) => void;
  onCancel: () => void;
  templateId?: string;
  existingIntegration?: APIIntegration;
}

export const IntegrationConfigurationWizard: React.FC<IntegrationConfigurationWizardProps> = ({
  onComplete,
  onCancel,
  templateId,
  existingIntegration
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [integrationData, setIntegrationData] = useState<Partial<APIIntegration>>({
    name: '',
    description: '',
    type: 'custom',
    category: 'bidirectional',
    status: 'configuring',
    configuration: {
      baseUrl: '',
      timeout: 30000,
      retryPolicy: {
        maxRetries: 3,
        baseDelay: 1000,
        maxDelay: 10000,
        backoffMultiplier: 2,
        retryableStatusCodes: [408, 429, 500, 502, 503, 504],
        retryableErrors: ['ECONNRESET', 'ETIMEDOUT', 'ENOTFOUND']
      },
      rateLimiting: {
        enabled: false,
        strategy: 'fixed_window'
      },
      headers: {},
      queryParams: {},
      environment: 'development'
    } as APIConfiguration,
    authentication: {
      type: 'none',
      credentials: {}
    } as APIAuthentication,
    endpoints: [],
    dataMapping: [],
    webhooks: [],
    security: {
      encryption: {
        inTransit: {
          enabled: true,
          protocol: 'TLS1.3',
          certificateValidation: true
        },
        atRest: {
          enabled: true,
          algorithm: 'AES256',
          keyRotation: true,
          keyRotationInterval: 90
        }
      },
      accessControl: {
        userAgentValidation: false,
        apiKeyRotation: {
          enabled: true,
          interval: 90,
          notificationDays: 7
        }
      },
      audit: {
        enabled: true,
        logAllRequests: true,
        logFailedRequests: true,
        logAuthenticationEvents: true,
        retention: 365,
        exportFormat: 'json'
      },
      compliance: {
        frameworks: ['GDPR'],
        dataClassification: {
          enabled: true,
          rules: [],
          defaultClassification: 'internal'
        },
        retention: {
          enabled: true,
          defaultPeriod: 365,
          rules: []
        },
        anonymization: {
          enabled: false,
          techniques: [],
          preserveUtility: true
        }
      }
    },
    createdBy: 'current-user'
  });
  
  const [template, setTemplate] = useState<IntegrationTemplate | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<any>(null);

  const steps: WizardStep[] = [
    {
      id: 'basic',
      title: 'Basic Information',
      description: 'Configure basic integration details',
      icon: Settings,
      component: BasicInfoStep
    },
    {
      id: 'configuration',
      title: 'API Configuration',
      description: 'Set up API connection details',
      icon: Globe,
      component: ConfigurationStep
    },
    {
      id: 'authentication',
      title: 'Authentication',
      description: 'Configure authentication method',
      icon: Key,
      component: AuthenticationStep
    },
    {
      id: 'endpoints',
      title: 'Endpoints',
      description: 'Define API endpoints',
      icon: Database,
      component: EndpointsStep
    },
    {
      id: 'mapping',
      title: 'Data Mapping',
      description: 'Configure data transformations',
      icon: Zap,
      component: DataMappingStep
    },
    {
      id: 'test',
      title: 'Test & Validate',
      description: 'Test the integration',
      icon: TestTube,
      component: TestStep
    }
  ];

  useEffect(() => {
    if (templateId) {
      loadTemplate();
    }
    if (existingIntegration) {
      setIntegrationData(existingIntegration);
    }
  }, [templateId, existingIntegration]);

  const loadTemplate = async () => {
    try {
      setLoading(true);
      const templateData = await apiIntegrationService.getIntegrationTemplate(templateId!);
      setTemplate(templateData);
      
      // Pre-populate integration data from template
      setIntegrationData(prev => ({
        ...prev,
        type: templateData.category as any,
        configuration: {
          ...prev.configuration!,
          ...templateData.configuration
        },
        authentication: {
          ...prev.authentication!,
          ...templateData.authentication
        },
        endpoints: templateData.endpoints as APIEndpoint[],
        dataMapping: templateData.commonMappings
      }));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load template');
    } finally {
      setLoading(false);
    }
  };

  const updateIntegrationData = (updates: Partial<APIIntegration>) => {
    setIntegrationData(prev => ({ ...prev, ...updates }));
  };

  const nextStep = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleComplete = async () => {
    try {
      setLoading(true);
      setError(null);

      if (existingIntegration) {
        await apiIntegrationService.updateIntegration(existingIntegration.id, integrationData);
        onComplete({ ...existingIntegration, ...integrationData } as APIIntegration);
      } else {
        const result = await apiIntegrationService.createIntegration(integrationData as any);
        const newIntegration = await apiIntegrationService.getIntegration(result.integrationId);
        onComplete(newIntegration);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save integration');
    } finally {
      setLoading(false);
    }
  };

  function BasicInfoStep({ data, onChange }: { data: Partial<APIIntegration>; onChange: (updates: Partial<APIIntegration>) => void }) {
    return (
      <div className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Integration Name
          </label>
          <input
            type="text"
            value={data.name || ''}
            onChange={(e) => onChange({ name: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Enter integration name"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Description
          </label>
          <textarea
            value={data.description || ''}
            onChange={(e) => onChange({ description: e.target.value })}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Describe the integration purpose"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Integration Type
            </label>
            <select
              value={data.type || 'custom'}
              onChange={(e) => onChange({ type: e.target.value as any })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="crm">CRM</option>
              <option value="erp">ERP</option>
              <option value="hr">HR</option>
              <option value="marketing">Marketing</option>
              <option value="analytics">Analytics</option>
              <option value="custom">Custom</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Category
            </label>
            <select
              value={data.category || 'bidirectional'}
              onChange={(e) => onChange({ category: e.target.value as any })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="source">Source (Read Only)</option>
              <option value="target">Target (Write Only)</option>
              <option value="bidirectional">Bidirectional</option>
            </select>
          </div>
        </div>

        {template && (
          <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <Check className="h-5 w-5 text-blue-400" />
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-blue-800">
                  Using Template: {template.name}
                </h3>
                <p className="text-sm text-blue-700 mt-1">
                  {template.description}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  function ConfigurationStep({ data, onChange }: { data: Partial<APIIntegration>; onChange: (updates: Partial<APIIntegration>) => void }) {
    const config = data.configuration || {} as Partial<APIConfiguration>;

    const updateConfig = (updates: Partial<APIConfiguration>) => {
      onChange({
        configuration: { ...config, ...updates } as APIConfiguration
      });
    };

    return (
      <div className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Base URL
          </label>
          <input
            type="url"
            value={config.baseUrl || ''}
            onChange={(e) => updateConfig({ baseUrl: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="https://api.example.com"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Timeout (ms)
            </label>
            <input
              type="number"
              value={config.timeout || 30000}
              onChange={(e) => updateConfig({ timeout: parseInt(e.target.value) })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Environment
            </label>
            <select
              value={config.environment || 'development'}
              onChange={(e) => updateConfig({ environment: e.target.value as any })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="development">Development</option>
              <option value="staging">Staging</option>
              <option value="production">Production</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Default Headers
          </label>
          <div className="space-y-2">
            {Object.entries(config.headers || {}).map(([key, value], index) => (
              <div key={index} className="flex space-x-2">
                <input
                  type="text"
                  value={key}
                  onChange={(e) => {
                    const newHeaders = { ...config.headers };
                    delete newHeaders[key];
                    newHeaders[e.target.value] = value;
                    updateConfig({ headers: newHeaders });
                  }}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Header name"
                />
                <input
                  type="text"
                  value={value}
                  onChange={(e) => {
                    updateConfig({
                      headers: { ...config.headers, [key]: e.target.value }
                    });
                  }}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Header value"
                />
                <button
                  onClick={() => {
                    const newHeaders = { ...config.headers };
                    delete newHeaders[key];
                    updateConfig({ headers: newHeaders });
                  }}
                  className="px-3 py-2 text-red-600 hover:text-red-800"
                >
                  Remove
                </button>
              </div>
            ))}
            <button
              onClick={() => {
                updateConfig({
                  headers: { ...config.headers, '': '' }
                });
              }}
              className="text-blue-600 hover:text-blue-800 text-sm"
            >
              + Add Header
            </button>
          </div>
        </div>

        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-4">Retry Policy</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Max Retries
              </label>
              <input
                type="number"
                value={config.retryPolicy?.maxRetries || 3}
                onChange={(e) => updateConfig({
                  retryPolicy: {
                    ...config.retryPolicy!,
                    maxRetries: parseInt(e.target.value)
                  }
                })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Base Delay (ms)
              </label>
              <input
                type="number"
                value={config.retryPolicy?.baseDelay || 1000}
                onChange={(e) => updateConfig({
                  retryPolicy: {
                    ...config.retryPolicy!,
                    baseDelay: parseInt(e.target.value)
                  }
                })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>
      </div>
    );
  }

  function AuthenticationStep({ data, onChange }: { data: Partial<APIIntegration>; onChange: (updates: Partial<APIIntegration>) => void }) {
    const auth = data.authentication || {} as Partial<APIAuthentication>;

    const updateAuth = (updates: Partial<APIAuthentication>) => {
      onChange({
        authentication: { ...auth, ...updates } as APIAuthentication
      });
    };

    return (
      <div className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Authentication Type
          </label>
          <select
            value={auth.type || 'none'}
            onChange={(e) => updateAuth({ type: e.target.value as any })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="none">None</option>
            <option value="basic">Basic Auth</option>
            <option value="bearer">Bearer Token</option>
            <option value="api_key">API Key</option>
            <option value="oauth2">OAuth 2.0</option>
            <option value="jwt">JWT</option>
          </select>
        </div>

        {auth.type === 'basic' && (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Username
              </label>
              <input
                type="text"
                value={auth.credentials?.username || ''}
                onChange={(e) => updateAuth({
                  credentials: { ...auth.credentials, username: e.target.value }
                })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Password
              </label>
              <input
                type="password"
                value={auth.credentials?.password || ''}
                onChange={(e) => updateAuth({
                  credentials: { ...auth.credentials, password: e.target.value }
                })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        )}

        {auth.type === 'bearer' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Bearer Token
            </label>
            <input
              type="password"
              value={auth.credentials?.token || ''}
              onChange={(e) => updateAuth({
                credentials: { ...auth.credentials, token: e.target.value }
              })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        )}

        {auth.type === 'api_key' && (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                API Key
              </label>
              <input
                type="password"
                value={auth.credentials?.apiKey || ''}
                onChange={(e) => updateAuth({
                  credentials: { ...auth.credentials, apiKey: e.target.value }
                })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Header Name
              </label>
              <input
                type="text"
                value={auth.credentials?.apiKeyHeader || 'X-API-Key'}
                onChange={(e) => updateAuth({
                  credentials: { ...auth.credentials, apiKeyHeader: e.target.value }
                })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        )}

        {auth.type === 'oauth2' && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Client ID
                </label>
                <input
                  type="text"
                  value={auth.credentials?.clientId || ''}
                  onChange={(e) => updateAuth({
                    credentials: { ...auth.credentials, clientId: e.target.value }
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Client Secret
                </label>
                <input
                  type="password"
                  value={auth.credentials?.clientSecret || ''}
                  onChange={(e) => updateAuth({
                    credentials: { ...auth.credentials, clientSecret: e.target.value }
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Authorization URL
              </label>
              <input
                type="url"
                value={auth.credentials?.authorizationUrl || ''}
                onChange={(e) => updateAuth({
                  credentials: { ...auth.credentials, authorizationUrl: e.target.value }
                })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Token URL
              </label>
              <input
                type="url"
                value={auth.credentials?.tokenUrl || ''}
                onChange={(e) => updateAuth({
                  credentials: { ...auth.credentials, tokenUrl: e.target.value }
                })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        )}
      </div>
    );
  }

  function EndpointsStep({ data, onChange }: { data: Partial<APIIntegration>; onChange: (updates: Partial<APIIntegration>) => void }) {
    const endpoints = data.endpoints || [];

    const addEndpoint = () => {
      const newEndpoint: APIEndpoint = {
        id: `endpoint-${Date.now()}`,
        name: '',
        method: 'GET',
        path: '',
        description: '',
        parameters: [],
        enabled: true
      };
      onChange({ endpoints: [...endpoints, newEndpoint] });
    };

    const updateEndpoint = (index: number, updates: Partial<APIEndpoint>) => {
      const newEndpoints = [...endpoints];
      newEndpoints[index] = { ...newEndpoints[index], ...updates };
      onChange({ endpoints: newEndpoints });
    };

    const removeEndpoint = (index: number) => {
      const newEndpoints = endpoints.filter((_, i) => i !== index);
      onChange({ endpoints: newEndpoints });
    };

    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-medium text-gray-900">API Endpoints</h3>
          <button
            onClick={addEndpoint}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Add Endpoint
          </button>
        </div>

        <div className="space-y-4">
          {endpoints.map((endpoint, index) => (
            <div key={endpoint.id} className="border border-gray-200 rounded-lg p-4">
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Name
                  </label>
                  <input
                    type="text"
                    value={endpoint.name}
                    onChange={(e) => updateEndpoint(index, { name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Endpoint name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Method
                  </label>
                  <select
                    value={endpoint.method}
                    onChange={(e) => updateEndpoint(index, { method: e.target.value as any })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="GET">GET</option>
                    <option value="POST">POST</option>
                    <option value="PUT">PUT</option>
                    <option value="DELETE">DELETE</option>
                    <option value="PATCH">PATCH</option>
                  </select>
                </div>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Path
                </label>
                <input
                  type="text"
                  value={endpoint.path}
                  onChange={(e) => updateEndpoint(index, { path: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="/api/v1/resource"
                />
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  value={endpoint.description}
                  onChange={(e) => updateEndpoint(index, { description: e.target.value })}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Endpoint description"
                />
              </div>

              <div className="flex justify-between items-center">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={endpoint.enabled}
                    onChange={(e) => updateEndpoint(index, { enabled: e.target.checked })}
                    className="mr-2"
                  />
                  <span className="text-sm text-gray-700">Enabled</span>
                </label>
                <button
                  onClick={() => removeEndpoint(index)}
                  className="text-red-600 hover:text-red-800 text-sm"
                >
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>

        {endpoints.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            No endpoints configured. Click "Add Endpoint" to get started.
          </div>
        )}
      </div>
    );
  }

  function DataMappingStep({ data, onChange }: { data: Partial<APIIntegration>; onChange: (updates: Partial<APIIntegration>) => void }) {
    const mappings = data.dataMapping || [];

    const addMapping = () => {
      const newMapping: DataMapping = {
        id: `mapping-${Date.now()}`,
        name: '',
        sourceField: '',
        targetField: '',
        required: false
      };
      onChange({ dataMapping: [...mappings, newMapping] });
    };

    const updateMapping = (index: number, updates: Partial<DataMapping>) => {
      const newMappings = [...mappings];
      newMappings[index] = { ...newMappings[index], ...updates };
      onChange({ dataMapping: newMappings });
    };

    const removeMapping = (index: number) => {
      const newMappings = mappings.filter((_, i) => i !== index);
      onChange({ dataMapping: newMappings });
    };

    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-medium text-gray-900">Data Mapping</h3>
          <button
            onClick={addMapping}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Add Mapping
          </button>
        </div>

        <div className="space-y-4">
          {mappings.map((mapping, index) => (
            <div key={mapping.id} className="border border-gray-200 rounded-lg p-4">
              <div className="grid grid-cols-3 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Name
                  </label>
                  <input
                    type="text"
                    value={mapping.name}
                    onChange={(e) => updateMapping(index, { name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Mapping name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Source Field
                  </label>
                  <input
                    type="text"
                    value={mapping.sourceField}
                    onChange={(e) => updateMapping(index, { sourceField: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="source.field"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Target Field
                  </label>
                  <input
                    type="text"
                    value={mapping.targetField}
                    onChange={(e) => updateMapping(index, { targetField: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="target.field"
                  />
                </div>
              </div>

              <div className="flex justify-between items-center">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={mapping.required}
                    onChange={(e) => updateMapping(index, { required: e.target.checked })}
                    className="mr-2"
                  />
                  <span className="text-sm text-gray-700">Required</span>
                </label>
                <button
                  onClick={() => removeMapping(index)}
                  className="text-red-600 hover:text-red-800 text-sm"
                >
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>

        {mappings.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            No data mappings configured. Click "Add Mapping" to get started.
          </div>
        )}
      </div>
    );
  }

  function TestStep({ data }: { data: Partial<APIIntegration> }) {
    const [testing, setTesting] = useState(false);

    const runTest = async () => {
      if (!data.configuration?.baseUrl) {
        setError('Base URL is required for testing');
        return;
      }

      try {
        setTesting(true);
        setError(null);
        
        // Create a temporary integration for testing
        const tempIntegration = await apiIntegrationService.createIntegration(data as any);
        const testResult = await apiIntegrationService.testIntegration(tempIntegration.integrationId);
        
        setTestResults(testResult);
        
        // Clean up temporary integration
        await apiIntegrationService.deleteIntegration(tempIntegration.integrationId);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Test failed');
      } finally {
        setTesting(false);
      }
    };

    return (
      <div className="space-y-6">
        <div className="text-center">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Test Integration</h3>
          <p className="text-gray-600 mb-6">
            Test your integration configuration to ensure it works correctly.
          </p>
          
          <button
            onClick={runTest}
            disabled={testing || !data.configuration?.baseUrl}
            className="px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {testing ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white inline-block mr-2"></div>
                Testing...
              </>
            ) : (
              <>
                <TestTube className="h-4 w-4 inline-block mr-2" />
                Run Test
              </>
            )}
          </button>
        </div>

        {testResults && (
          <div className={`border rounded-lg p-4 ${
            testResults.success ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'
          }`}>
            <div className="flex items-center mb-2">
              {testResults.success ? (
                <Check className="h-5 w-5 text-green-500 mr-2" />
              ) : (
                <AlertCircle className="h-5 w-5 text-red-500 mr-2" />
              )}
              <span className={`font-medium ${
                testResults.success ? 'text-green-800' : 'text-red-800'
              }`}>
                {testResults.success ? 'Test Successful' : 'Test Failed'}
              </span>
            </div>
            
            <div className="text-sm space-y-1">
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

        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <h4 className="font-medium text-gray-900 mb-2">Configuration Summary</h4>
          <div className="text-sm text-gray-600 space-y-1">
            <p><strong>Name:</strong> {data.name || 'Unnamed Integration'}</p>
            <p><strong>Type:</strong> {data.type || 'Custom'}</p>
            <p><strong>Base URL:</strong> {data.configuration?.baseUrl || 'Not configured'}</p>
            <p><strong>Authentication:</strong> {data.authentication?.type || 'None'}</p>
            <p><strong>Endpoints:</strong> {data.endpoints?.length || 0} configured</p>
            <p><strong>Data Mappings:</strong> {data.dataMapping?.length || 0} configured</p>
          </div>
        </div>
      </div>
    );
  }

  const CurrentStepComponent = steps[currentStep].component;
  const currentStepData = steps[currentStep];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900">
          {existingIntegration ? 'Edit Integration' : 'Create Integration'}
        </h2>
        <p className="text-gray-600 mt-2">
          {existingIntegration 
            ? 'Update your integration configuration'
            : 'Configure a new API integration for your system'
          }
        </p>
      </div>

      {/* Progress Steps */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          {steps.map((step, index) => {
            const Icon = step.icon;
            const isActive = index === currentStep;
            const isCompleted = index < currentStep;
            
            return (
              <div key={step.id} className="flex items-center">
                <div className={`flex items-center justify-center w-10 h-10 rounded-full border-2 ${
                  isActive 
                    ? 'border-blue-600 bg-blue-600 text-white'
                    : isCompleted
                    ? 'border-green-600 bg-green-600 text-white'
                    : 'border-gray-300 bg-white text-gray-400'
                }`}>
                  {isCompleted ? (
                    <Check className="h-5 w-5" />
                  ) : (
                    <Icon className="h-5 w-5" />
                  )}
                </div>
                <div className="ml-3">
                  <p className={`text-sm font-medium ${
                    isActive ? 'text-blue-600' : isCompleted ? 'text-green-600' : 'text-gray-500'
                  }`}>
                    {step.title}
                  </p>
                  <p className="text-xs text-gray-500">{step.description}</p>
                </div>
                {index < steps.length - 1 && (
                  <ArrowRight className="h-5 w-5 text-gray-400 mx-4" />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex">
            <AlertCircle className="h-5 w-5 text-red-400" />
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Error</h3>
              <p className="text-sm text-red-700 mt-1">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Step Content */}
      <div className="bg-white border border-gray-200 rounded-lg p-6 mb-8">
        <div className="mb-6">
          <h3 className="text-lg font-medium text-gray-900">{currentStepData.title}</h3>
          <p className="text-gray-600 mt-1">{currentStepData.description}</p>
        </div>
        
        <CurrentStepComponent 
          data={integrationData} 
          onChange={updateIntegrationData}
        />
      </div>

      {/* Navigation */}
      <div className="flex justify-between">
        <div>
          {currentStep > 0 && (
            <button
              onClick={prevStep}
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Previous
            </button>
          )}
        </div>

        <div className="flex space-x-3">
          <button
            onClick={onCancel}
            className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
          >
            Cancel
          </button>
          
          {currentStep < steps.length - 1 ? (
            <button
              onClick={nextStep}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
            >
              Next
              <ArrowRight className="h-4 w-4 ml-2" />
            </button>
          ) : (
            <button
              onClick={handleComplete}
              disabled={loading}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 disabled:opacity-50"
            >
              <Save className="h-4 w-4 mr-2" />
              {existingIntegration ? 'Update Integration' : 'Create Integration'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};