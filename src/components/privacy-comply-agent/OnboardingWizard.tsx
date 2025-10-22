import React, { useState, useEffect } from 'react';
import Card from '../ui/Card';
import Button from '../ui/Button';
import Badge from '../ui/Badge';
import ProgressBar from '../ui/ProgressBar';
import { 
  Shield, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  Activity,
  Settings,
  Play,
  Pause,
  RefreshCw,
  Download,
  MessageSquare,
  ArrowRight,
  ArrowLeft,
  Cloud,
  Key,
  Database,
  FileText,
  Zap,
  Eye,
  Lock,
  Users,
  Globe,
  Server,
  Cpu,
  HardDrive,
  Network,
  Monitor
} from 'lucide-react';
import { usePrivacyComplyAgentOnboarding } from '../../hooks/usePrivacyComplyAgentOnboarding';
import { OnboardingConfiguration } from '../../services/privacy-comply-agent/onboarding-service';

interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  icon: React.ComponentType<any>;
  completed: boolean;
  required: boolean;
  category: 'aws' | 'services' | 'configuration' | 'validation';
}

interface AWSCredentials {
  accessKeyId: string;
  secretAccessKey: string;
  region: string;
  sessionToken?: string;
}

interface ServiceConfiguration {
  bedrock: {
    enabled: boolean;
    model: string;
    region: string;
  };
  securityHub: {
    enabled: boolean;
    region: string;
  };
  macie: {
    enabled: boolean;
    region: string;
  };
  cloudTrail: {
    enabled: boolean;
    bucketName: string;
  };
  s3: {
    reportsBucket: string;
    region: string;
  };
  dynamodb: {
    region: string;
    tablePrefix: string;
  };
  lambda: {
    region: string;
    executionRole: string;
  };
}

export const OnboardingWizard: React.FC<{
  onComplete: () => void;
  onSkip: () => void;
}> = ({ onComplete, onSkip }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [configuration, setConfiguration] = useState<OnboardingConfiguration>({
    aws: {
      credentials: {
        accessKeyId: '',
        secretAccessKey: '',
        region: 'us-east-1'
      },
      services: {
        bedrock: { enabled: true, model: 'claude-3-sonnet', region: 'us-east-1' },
        securityHub: { enabled: true, region: 'us-east-1' },
        macie: { enabled: true, region: 'us-east-1' },
        cloudTrail: { enabled: true, bucketName: '' },
        s3: { reportsBucket: '', region: 'us-east-1' },
        dynamodb: { region: 'us-east-1', tablePrefix: 'privacy-comply-' },
        lambda: { region: 'us-east-1', executionRole: '' }
      }
    }
  });

  const {
    loading,
    error,
    validationResults,
    validateCredentials,
    validateService,
    runFullValidation,
    deployLambdaFunctions,
    saveConfiguration,
    getValidationResult,
    isServiceValidated,
    clearError
  } = usePrivacyComplyAgentOnboarding();

  const steps: OnboardingStep[] = [
    {
      id: 'welcome',
      title: 'Welcome to Privacy Comply Agent',
      description: 'Set up your AI-powered privacy compliance monitoring system',
      icon: Shield,
      completed: false,
      required: true,
      category: 'configuration'
    },
    {
      id: 'aws-credentials',
      title: 'AWS Credentials',
      description: 'Configure your AWS access credentials for cloud services',
      icon: Key,
      completed: false,
      required: true,
      category: 'aws'
    },
    {
      id: 'aws-services',
      title: 'AWS Services Configuration',
      description: 'Enable and configure required AWS services',
      icon: Cloud,
      completed: false,
      required: true,
      category: 'aws'
    },
    {
      id: 'bedrock-setup',
      title: 'Amazon Bedrock Setup',
      description: 'Configure AI models for compliance reasoning',
      icon: Cpu,
      completed: false,
      required: true,
      category: 'services'
    },
    {
      id: 'security-services',
      title: 'Security Services',
      description: 'Set up Security Hub, Macie, and CloudTrail integration',
      icon: Lock,
      completed: false,
      required: true,
      category: 'services'
    },
    {
      id: 'storage-setup',
      title: 'Storage Configuration',
      description: 'Configure S3 buckets and DynamoDB tables',
      icon: HardDrive,
      completed: false,
      required: true,
      category: 'services'
    },
    {
      id: 'lambda-functions',
      title: 'Lambda Functions',
      description: 'Deploy remediation automation functions',
      icon: Zap,
      completed: false,
      required: false,
      category: 'services'
    },
    {
      id: 'validation',
      title: 'Validation & Testing',
      description: 'Validate configuration and test connectivity',
      icon: CheckCircle,
      completed: false,
      required: true,
      category: 'validation'
    }
  ];

  const [stepStates, setStepStates] = useState(steps);

  useEffect(() => {
    // Auto-validate credentials when they change
    if (configuration.aws.credentials.accessKeyId && configuration.aws.credentials.secretAccessKey) {
      validateCredentials(configuration.aws.credentials);
    }
  }, [configuration.aws.credentials, validateCredentials]);

  const handleCredentialsValidation = async () => {
    const result = await validateCredentials(configuration.aws.credentials);
    updateStepCompletion('aws-credentials', result.status === 'success');
  };

  const updateStepCompletion = (stepId: string, completed: boolean) => {
    setStepStates(prev => prev.map(step => 
      step.id === stepId ? { ...step, completed } : step
    ));
  };

  const handleServiceValidation = async (serviceName: string) => {
    const serviceConfig = configuration.aws.services[serviceName as keyof typeof configuration.aws.services];
    const result = await validateService(serviceName, serviceConfig, configuration.aws.credentials);
    updateStepCompletion(`${serviceName}-validation`, result.status === 'success');
    return result.status === 'success';
  };

  const handleLambdaDeployment = async () => {
    const results = await deployLambdaFunctions(configuration);
    const success = results.every(r => r.status === 'success');
    updateStepCompletion('lambda-functions', success);
  };

  const handleFullValidation = async () => {
    const results = await runFullValidation(configuration);
    const success = results.every(r => r.status !== 'error');
    updateStepCompletion('validation', success);
    
    if (success) {
      await saveConfiguration(configuration);
    }
  };

  const nextStep = () => {
    if (currentStep < stepStates.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const canProceed = () => {
    const current = stepStates[currentStep];
    return !current.required || current.completed;
  };

  const renderStepContent = () => {
    const step = stepStates[currentStep];
    
    switch (step.id) {
      case 'welcome':
        return (
          <div className="text-center space-y-6">
            <div className="mx-auto w-24 h-24 bg-blue-100 rounded-full flex items-center justify-center">
              <Shield className="h-12 w-12 text-blue-600" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                Welcome to Privacy Comply Agent
              </h2>
              <p className="text-gray-600 max-w-2xl mx-auto">
                This wizard will guide you through setting up your AI-powered privacy compliance 
                monitoring system. We'll configure AWS services, deploy automation functions, 
                and validate your setup to ensure everything works correctly.
              </p>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8">
              {[
                { icon: Cloud, label: 'AWS Integration', color: 'text-orange-600' },
                { icon: Cpu, label: 'AI Models', color: 'text-purple-600' },
                { icon: Lock, label: 'Security', color: 'text-green-600' },
                { icon: Zap, label: 'Automation', color: 'text-blue-600' }
              ].map(({ icon: Icon, label, color }) => (
                <div key={label} className="text-center">
                  <Icon className={`h-8 w-8 mx-auto mb-2 ${color}`} />
                  <p className="text-sm text-gray-600">{label}</p>
                </div>
              ))}
            </div>
          </div>
        );

      case 'aws-credentials':
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">AWS Credentials</h2>
              <p className="text-gray-600">
                Enter your AWS access credentials. These will be used to access AWS services 
                for privacy compliance monitoring.
              </p>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Access Key ID
                </label>
                <input
                  type="text"
                  value={configuration.aws.credentials.accessKeyId}
                  onChange={(e) => setConfiguration(prev => ({
                    ...prev,
                    aws: {
                      ...prev.aws,
                      credentials: {
                        ...prev.aws.credentials,
                        accessKeyId: e.target.value
                      }
                    }
                  }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="AKIAIOSFODNN7EXAMPLE"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Secret Access Key
                </label>
                <input
                  type="password"
                  value={configuration.aws.credentials.secretAccessKey}
                  onChange={(e) => setConfiguration(prev => ({
                    ...prev,
                    aws: {
                      ...prev.aws,
                      credentials: {
                        ...prev.aws.credentials,
                        secretAccessKey: e.target.value
                      }
                    }
                  }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Region
                </label>
                <select
                  value={configuration.aws.credentials.region}
                  onChange={(e) => setConfiguration(prev => ({
                    ...prev,
                    aws: {
                      ...prev.aws,
                      credentials: {
                        ...prev.aws.credentials,
                        region: e.target.value
                      }
                    }
                  }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="us-east-1">US East (N. Virginia)</option>
                  <option value="us-west-2">US West (Oregon)</option>
                  <option value="eu-west-1">Europe (Ireland)</option>
                  <option value="ap-southeast-1">Asia Pacific (Singapore)</option>
                </select>
              </div>
              
              {(() => {
                const result = getValidationResult('aws-credentials');
                if (!result) return null;
                
                return (
                  <div className={`p-3 rounded-md ${
                    result.status === 'success'
                      ? 'bg-green-50 text-green-800' 
                      : 'bg-red-50 text-red-800'
                  }`}>
                    <div className="flex items-center">
                      {result.status === 'success' ? (
                        <CheckCircle className="h-5 w-5 mr-2" />
                      ) : (
                        <AlertTriangle className="h-5 w-5 mr-2" />
                      )}
                      {result.message}
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        );

      case 'aws-services':
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">AWS Services Configuration</h2>
              <p className="text-gray-600">
                Configure the AWS services required for privacy compliance monitoring.
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {[
                {
                  service: 'bedrock',
                  title: 'Amazon Bedrock',
                  description: 'AI models for compliance reasoning',
                  icon: Cpu,
                  color: 'text-purple-600'
                },
                {
                  service: 'securityHub',
                  title: 'AWS Security Hub',
                  description: 'Security findings aggregation',
                  icon: Shield,
                  color: 'text-blue-600'
                },
                {
                  service: 'macie',
                  title: 'Amazon Macie',
                  description: 'PII/PHI detection service',
                  icon: Eye,
                  color: 'text-green-600'
                },
                {
                  service: 'cloudTrail',
                  title: 'AWS CloudTrail',
                  description: 'API activity logging',
                  icon: FileText,
                  color: 'text-orange-600'
                }
              ].map(({ service, title, description, icon: Icon, color }) => (
                <Card key={service} className="p-4">
                  <div className="flex items-start space-x-3">
                    <Icon className={`h-6 w-6 mt-1 ${color}`} />
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <h3 className="font-medium text-gray-900">{title}</h3>
                        <Badge variant={
                          configuration.aws.services[service as keyof typeof configuration.aws.services]?.enabled 
                            ? 'success' 
                            : 'secondary'
                        }>
                          {configuration.aws.services[service as keyof typeof configuration.aws.services]?.enabled 
                            ? 'Enabled' 
                            : 'Disabled'
                          }
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-600 mt-1">{description}</p>
                      <Button
                        onClick={() => handleServiceValidation(service)}
                        className="mt-2"
                        size="sm"
                        variant="outline"
                        disabled={loading}
                      >
                        {loading ? (
                          <RefreshCw className="h-4 w-4 mr-1 animate-spin" />
                        ) : (
                          <CheckCircle className="h-4 w-4 mr-1" />
                        )}
                        Validate
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        );

      case 'bedrock-setup':
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">Amazon Bedrock Setup</h2>
              <p className="text-gray-600">
                Configure AI models for intelligent compliance reasoning and analysis.
              </p>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Model Selection
                </label>
                <select
                  value={configuration.aws.services.bedrock.model}
                  onChange={(e) => setConfiguration(prev => ({
                    ...prev,
                    aws: {
                      ...prev.aws,
                      services: {
                        ...prev.aws.services,
                        bedrock: { ...prev.aws.services.bedrock, model: e.target.value }
                      }
                    }
                  }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="claude-3-sonnet">Claude 3 Sonnet</option>
                  <option value="claude-3-haiku">Claude 3 Haiku</option>
                  <option value="amazon-nova-pro">Amazon Nova Pro</option>
                  <option value="amazon-nova-lite">Amazon Nova Lite</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Bedrock Region
                </label>
                <select
                  value={configuration.aws.services.bedrock.region}
                  onChange={(e) => setConfiguration(prev => ({
                    ...prev,
                    aws: {
                      ...prev.aws,
                      services: {
                        ...prev.aws.services,
                        bedrock: { ...prev.aws.services.bedrock, region: e.target.value }
                      }
                    }
                  }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="us-east-1">US East (N. Virginia)</option>
                  <option value="us-west-2">US West (Oregon)</option>
                  <option value="eu-west-1">Europe (Ireland)</option>
                </select>
              </div>
              
              <Card className="p-4 bg-blue-50">
                <div className="flex items-start space-x-3">
                  <Cpu className="h-5 w-5 text-blue-600 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-blue-900">Model Capabilities</h4>
                    <ul className="text-sm text-blue-800 mt-1 space-y-1">
                      <li>• Legal compliance analysis and reasoning</li>
                      <li>• Risk assessment and scoring</li>
                      <li>• Remediation recommendation generation</li>
                      <li>• Natural language query processing</li>
                    </ul>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        );

      case 'security-services':
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">Security Services Configuration</h2>
              <p className="text-gray-600">
                Set up AWS security services for comprehensive privacy monitoring.
              </p>
            </div>
            
            <div className="space-y-6">
              <Card className="p-4">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <Shield className="h-6 w-6 text-blue-600" />
                    <div>
                      <h3 className="font-medium text-gray-900">AWS Security Hub</h3>
                      <p className="text-sm text-gray-600">Centralized security findings</p>
                    </div>
                  </div>
                  <Badge variant={serviceConfig.securityHub.enabled ? 'success' : 'secondary'}>
                    {serviceConfig.securityHub.enabled ? 'Enabled' : 'Disabled'}
                  </Badge>
                </div>
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Region
                    </label>
                    <select
                      value={serviceConfig.securityHub.region}
                      onChange={(e) => setServiceConfig(prev => ({
                        ...prev,
                        securityHub: { ...prev.securityHub, region: e.target.value }
                      }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="us-east-1">US East (N. Virginia)</option>
                      <option value="us-west-2">US West (Oregon)</option>
                      <option value="eu-west-1">Europe (Ireland)</option>
                    </select>
                  </div>
                </div>
              </Card>

              <Card className="p-4">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <Eye className="h-6 w-6 text-green-600" />
                    <div>
                      <h3 className="font-medium text-gray-900">Amazon Macie</h3>
                      <p className="text-sm text-gray-600">PII/PHI detection and classification</p>
                    </div>
                  </div>
                  <Badge variant={serviceConfig.macie.enabled ? 'success' : 'secondary'}>
                    {serviceConfig.macie.enabled ? 'Enabled' : 'Disabled'}
                  </Badge>
                </div>
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Region
                    </label>
                    <select
                      value={serviceConfig.macie.region}
                      onChange={(e) => setServiceConfig(prev => ({
                        ...prev,
                        macie: { ...prev.macie, region: e.target.value }
                      }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="us-east-1">US East (N. Virginia)</option>
                      <option value="us-west-2">US West (Oregon)</option>
                      <option value="eu-west-1">Europe (Ireland)</option>
                    </select>
                  </div>
                </div>
              </Card>

              <Card className="p-4">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <FileText className="h-6 w-6 text-orange-600" />
                    <div>
                      <h3 className="font-medium text-gray-900">AWS CloudTrail</h3>
                      <p className="text-sm text-gray-600">API activity monitoring</p>
                    </div>
                  </div>
                  <Badge variant={serviceConfig.cloudTrail.enabled ? 'success' : 'secondary'}>
                    {serviceConfig.cloudTrail.enabled ? 'Enabled' : 'Disabled'}
                  </Badge>
                </div>
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      S3 Bucket Name
                    </label>
                    <input
                      type="text"
                      value={serviceConfig.cloudTrail.bucketName}
                      onChange={(e) => setServiceConfig(prev => ({
                        ...prev,
                        cloudTrail: { ...prev.cloudTrail, bucketName: e.target.value }
                      }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="privacy-comply-cloudtrail-logs"
                    />
                  </div>
                </div>
              </Card>
            </div>
          </div>
        );

      case 'storage-setup':
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">Storage Configuration</h2>
              <p className="text-gray-600">
                Configure S3 buckets and DynamoDB tables for data storage.
              </p>
            </div>
            
            <div className="space-y-6">
              <Card className="p-4">
                <div className="flex items-center space-x-3 mb-4">
                  <HardDrive className="h-6 w-6 text-blue-600" />
                  <div>
                    <h3 className="font-medium text-gray-900">Amazon S3</h3>
                    <p className="text-sm text-gray-600">Report storage and data archival</p>
                  </div>
                </div>
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Reports Bucket Name
                    </label>
                    <input
                      type="text"
                      value={serviceConfig.s3.reportsBucket}
                      onChange={(e) => setServiceConfig(prev => ({
                        ...prev,
                        s3: { ...prev.s3, reportsBucket: e.target.value }
                      }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="privacy-comply-reports"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Region
                    </label>
                    <select
                      value={serviceConfig.s3.region}
                      onChange={(e) => setServiceConfig(prev => ({
                        ...prev,
                        s3: { ...prev.s3, region: e.target.value }
                      }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="us-east-1">US East (N. Virginia)</option>
                      <option value="us-west-2">US West (Oregon)</option>
                      <option value="eu-west-1">Europe (Ireland)</option>
                    </select>
                  </div>
                </div>
              </Card>

              <Card className="p-4">
                <div className="flex items-center space-x-3 mb-4">
                  <Database className="h-6 w-6 text-green-600" />
                  <div>
                    <h3 className="font-medium text-gray-900">Amazon DynamoDB</h3>
                    <p className="text-sm text-gray-600">Metadata and configuration storage</p>
                  </div>
                </div>
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Table Prefix
                    </label>
                    <input
                      type="text"
                      value={serviceConfig.dynamodb.tablePrefix}
                      onChange={(e) => setServiceConfig(prev => ({
                        ...prev,
                        dynamodb: { ...prev.dynamodb, tablePrefix: e.target.value }
                      }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="privacy-comply-"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Region
                    </label>
                    <select
                      value={serviceConfig.dynamodb.region}
                      onChange={(e) => setServiceConfig(prev => ({
                        ...prev,
                        dynamodb: { ...prev.dynamodb, region: e.target.value }
                      }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="us-east-1">US East (N. Virginia)</option>
                      <option value="us-west-2">US West (Oregon)</option>
                      <option value="eu-west-1">Europe (Ireland)</option>
                    </select>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        );

      case 'lambda-functions':
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">Lambda Functions Deployment</h2>
              <p className="text-gray-600">
                Deploy automated remediation functions for privacy compliance.
              </p>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Execution Role ARN
                </label>
                <input
                  type="text"
                  value={serviceConfig.lambda.executionRole}
                  onChange={(e) => setServiceConfig(prev => ({
                    ...prev,
                    lambda: { ...prev.lambda, executionRole: e.target.value }
                  }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="arn:aws:iam::123456789012:role/privacy-comply-lambda-role"
                />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[
                  {
                    name: 'S3 Access Restriction',
                    description: 'Automatically restrict public S3 bucket access',
                    icon: Lock
                  },
                  {
                    name: 'Encryption Enablement',
                    description: 'Enable encryption on unencrypted resources',
                    icon: Shield
                  },
                  {
                    name: 'IAM Policy Adjustment',
                    description: 'Adjust overprivileged IAM policies',
                    icon: Users
                  }
                ].map(({ name, description, icon: Icon }) => (
                  <Card key={name} className="p-4">
                    <div className="text-center">
                      <Icon className="h-8 w-8 mx-auto mb-2 text-blue-600" />
                      <h3 className="font-medium text-gray-900 mb-1">{name}</h3>
                      <p className="text-xs text-gray-600">{description}</p>
                    </div>
                  </Card>
                ))}
              </div>
              
              <Button
                onClick={deployLambdaFunctions}
                className="w-full"
                disabled={loading || !serviceConfig.lambda.executionRole}
              >
                {loading ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Deploying Functions...
                  </>
                ) : (
                  <>
                    <Zap className="h-4 w-4 mr-2" />
                    Deploy Lambda Functions
                  </>
                )}
              </Button>
            </div>
          </div>
        );

      case 'validation':
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">Validation & Testing</h2>
              <p className="text-gray-600">
                Validate your configuration and test system connectivity.
              </p>
            </div>
            
            <div className="space-y-4">
              {[
                { key: 'awsCredentials', label: 'AWS Credentials', icon: Key },
                { key: 'bedrock', label: 'Amazon Bedrock', icon: Cpu },
                { key: 'securityHub', label: 'AWS Security Hub', icon: Shield },
                { key: 'macie', label: 'Amazon Macie', icon: Eye },
                { key: 'cloudTrail', label: 'AWS CloudTrail', icon: FileText },
                { key: 's3', label: 'Amazon S3', icon: HardDrive },
                { key: 'dynamodb', label: 'Amazon DynamoDB', icon: Database }
              ].map(({ key, label, icon: Icon }) => (
                <div key={key} className="flex items-center justify-between p-3 border rounded-md">
                  <div className="flex items-center space-x-3">
                    <Icon className="h-5 w-5 text-gray-600" />
                    <span className="font-medium text-gray-900">{label}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    {validationResults[key] === true && (
                      <CheckCircle className="h-5 w-5 text-green-600" />
                    )}
                    {validationResults[key] === false && (
                      <AlertTriangle className="h-5 w-5 text-red-600" />
                    )}
                    {validationResults[key] === undefined && (
                      <Clock className="h-5 w-5 text-gray-400" />
                    )}
                  </div>
                </div>
              ))}
              
              <Button
                onClick={runFullValidation}
                className="w-full mt-6"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Running Validation...
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Run Full Validation
                  </>
                )}
              </Button>
            </div>
          </div>
        );

      default:
        return <div>Step not found</div>;
    }
  };

  const completedSteps = stepStates.filter(step => step.completed).length;
  const progressPercentage = (completedSteps / stepStates.length) * 100;

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Progress Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold text-gray-900">Privacy Comply Agent Setup</h1>
          <Button onClick={onSkip} variant="outline">
            Skip Setup
          </Button>
        </div>
        
        <div className="mb-4">
          <div className="flex justify-between text-sm text-gray-600 mb-2">
            <span>Step {currentStep + 1} of {stepStates.length}</span>
            <span>{Math.round(progressPercentage)}% Complete</span>
          </div>
          <ProgressBar value={progressPercentage} className="h-2" />
        </div>
        
        {/* Step Navigation */}
        <div className="flex items-center space-x-2 overflow-x-auto pb-2">
          {stepStates.map((step, index) => (
            <div
              key={step.id}
              className={`flex items-center space-x-2 px-3 py-1 rounded-full text-sm whitespace-nowrap ${
                index === currentStep
                  ? 'bg-blue-100 text-blue-800'
                  : step.completed
                  ? 'bg-green-100 text-green-800'
                  : 'bg-gray-100 text-gray-600'
              }`}
            >
              <step.icon className="h-4 w-4" />
              <span>{step.title}</span>
              {step.completed && <CheckCircle className="h-4 w-4" />}
            </div>
          ))}
        </div>
      </div>

      {/* Step Content */}
      <Card className="mb-8">
        <div className="p-6">
          {renderStepContent()}
        </div>
      </Card>

      {/* Navigation Buttons */}
      <div className="flex items-center justify-between">
        <Button
          onClick={prevStep}
          variant="outline"
          disabled={currentStep === 0}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Previous
        </Button>
        
        <div className="flex items-center space-x-3">
          {currentStep === stepStates.length - 1 ? (
            <Button
              onClick={onComplete}
              className="bg-green-600 hover:bg-green-700"
              disabled={!canProceed()}
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              Complete Setup
            </Button>
          ) : (
            <Button
              onClick={nextStep}
              disabled={!canProceed()}
            >
              Next
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          )}
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <Card className="mt-4 border-red-200 bg-red-50">
          <div className="p-4">
            <div className="flex items-center space-x-2 text-red-800">
              <AlertTriangle className="h-5 w-5" />
              <span className="font-medium">Setup Error</span>
            </div>
            <p className="mt-2 text-red-700">{error}</p>
          </div>
        </Card>
      )}
    </div>
  );
};