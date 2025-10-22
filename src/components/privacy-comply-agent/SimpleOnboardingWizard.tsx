import React, { useState } from 'react';
import Card from '../ui/Card';
import Button from '../ui/Button';
import Badge from '../ui/Badge';
import ProgressBar from '../ui/ProgressBar';
import { 
  Shield, 
  AlertTriangle, 
  CheckCircle, 
  ArrowRight,
  ArrowLeft,
  Cloud,
  Key,
  Database,
  Zap,
  Eye,
  Lock,
  Cpu,
  HardDrive,
  FileText
} from 'lucide-react';
import { usePrivacyComplyAgentOnboarding } from '../../hooks/usePrivacyComplyAgentOnboarding';
import { OnboardingConfiguration } from '../../services/privacy-comply-agent/onboarding-service';

interface SimpleOnboardingWizardProps {
  onComplete: () => void;
  onSkip: () => void;
}

/**
 * AWS PrivacyComply Agent Onboarding Wizard
 * 
 * This component is part of a multi-cloud privacy compliance framework.
 * It specifically handles the setup and configuration of AWS services
 * for privacy compliance monitoring and automated remediation.
 * 
 * Other cloud providers (Azure, GCP) will have their own dedicated
 * onboarding wizards and agent implementations.
 */

export const SimpleOnboardingWizard: React.FC<SimpleOnboardingWizardProps> = ({ 
  onComplete, 
  onSkip 
}) => {
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
        cloudTrail: { enabled: true, bucketName: 'privacy-comply-cloudtrail' },
        s3: { reportsBucket: 'privacy-comply-reports', region: 'us-east-1' },
        dynamodb: { region: 'us-east-1', tablePrefix: 'privacy-comply-' },
        lambda: { region: 'us-east-1', executionRole: '' }
      }
    }
  });

  const {
    loading,
    error,
    validateCredentials,
    runFullValidation,
    saveConfiguration,
    getValidationResult,
    clearError
  } = usePrivacyComplyAgentOnboarding();

  const steps = [
    {
      id: 'welcome',
      title: 'Welcome',
      description: 'Get started with Privacy Comply Agent',
      icon: Shield
    },
    {
      id: 'aws-credentials',
      title: 'AWS Setup',
      description: 'Configure your AWS credentials and services',
      icon: Cloud
    },
    {
      id: 'validation',
      title: 'Validation',
      description: 'Validate and deploy your configuration',
      icon: CheckCircle
    }
  ];

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
      await saveConfiguration(configuration);
      onComplete();
    } catch (err) {
      console.error('Failed to save configuration:', err);
    }
  };

  const handleValidateCredentials = async () => {
    await validateCredentials(configuration.aws.credentials);
  };

  const handleFullValidation = async () => {
    try {
      // First save the configuration
      await saveConfiguration(configuration);
      
      // Then run full validation and deployment
      const results = await runFullValidation(configuration);
      const hasErrors = results.some(r => r.status === 'error');
      
      if (!hasErrors) {
        // If successful, complete the setup
        onComplete();
      } else {
        // If there are errors, they will be displayed in the validation results
        console.log('Validation completed with errors:', results.filter(r => r.status === 'error'));
      }
    } catch (error) {
      console.error('Full validation failed:', error);
    }
  };

  const renderStepContent = () => {
    const step = steps[currentStep];
    
    switch (step.id) {
      case 'welcome':
        return (
          <div className="text-center space-y-6">
            <div className="mx-auto w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center">
              <Shield className="h-10 w-10 text-blue-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-3">
                Welcome to AWS PrivacyComply Agent
              </h2>
              <p className="text-gray-600 max-w-lg mx-auto">
                This wizard will help you set up your AI-powered privacy compliance 
                monitoring system with AWS cloud services integration.
              </p>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
              {[
                { icon: Cloud, label: 'AWS', color: 'text-orange-600' },
                { icon: Cpu, label: 'AI Models', color: 'text-purple-600' },
                { icon: Lock, label: 'Security', color: 'text-green-600' },
                { icon: Zap, label: 'Automation', color: 'text-blue-600' }
              ].map(({ icon: Icon, label, color }) => (
                <div key={label} className="text-center">
                  <Icon className={`h-6 w-6 mx-auto mb-1 ${color}`} />
                  <p className="text-xs text-gray-600">{label}</p>
                </div>
              ))}
            </div>
          </div>
        );

      case 'aws-credentials':
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">AWS Configuration</h2>
              <p className="text-gray-600">
                Configure your AWS credentials and service settings.
              </p>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* AWS Credentials */}
              <Card className="p-4">
                <div className="flex items-center space-x-2 mb-4">
                  <Key className="h-5 w-5 text-blue-600" />
                  <h3 className="font-medium text-gray-900">AWS Credentials</h3>
                </div>
                <div className="space-y-3">
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
                  
                  <Button
                    onClick={handleValidateCredentials}
                    className="w-full mt-3"
                    size="sm"
                    variant="outline"
                    disabled={loading || !configuration.aws.credentials.accessKeyId || !configuration.aws.credentials.secretAccessKey}
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Validate Credentials
                  </Button>
                  
                  {(() => {
                    const result = getValidationResult('aws-credentials');
                    if (!result) return null;
                    
                    return (
                      <div className={`p-2 rounded text-sm ${
                        result.status === 'success'
                          ? 'bg-green-50 text-green-800' 
                          : 'bg-red-50 text-red-800'
                      }`}>
                        <div className="flex items-center">
                          {result.status === 'success' ? (
                            <CheckCircle className="h-4 w-4 mr-2" />
                          ) : (
                            <AlertTriangle className="h-4 w-4 mr-2" />
                          )}
                          {result.message}
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </Card>

              {/* Service Configuration */}
              <Card className="p-4">
                <div className="flex items-center space-x-2 mb-4">
                  <Database className="h-5 w-5 text-green-600" />
                  <h3 className="font-medium text-gray-900">AWS Services</h3>
                </div>
                <div className="space-y-3">
                  {[
                    { key: 'bedrock', label: 'Amazon Bedrock', icon: Cpu, description: 'AI models' },
                    { key: 'securityHub', label: 'Security Hub', icon: Shield, description: 'Security findings' },
                    { key: 'macie', label: 'Amazon Macie', icon: Eye, description: 'PII detection' },
                    { key: 'cloudTrail', label: 'CloudTrail', icon: FileText, description: 'Activity logs' }
                  ].map(({ key, label, icon: Icon, description }) => (
                    <div key={key} className="flex items-center justify-between p-2 border rounded">
                      <div className="flex items-center space-x-2">
                        <Icon className="h-4 w-4 text-gray-600" />
                        <div>
                          <div className="text-sm font-medium text-gray-900">{label}</div>
                          <div className="text-xs text-gray-500">{description}</div>
                        </div>
                      </div>
                      <Badge variant={
                        (configuration.aws.services[key as keyof typeof configuration.aws.services] as any)?.enabled 
                          ? 'success' 
                          : 'default'
                      }>
                        {(configuration.aws.services[key as keyof typeof configuration.aws.services] as any)?.enabled 
                          ? 'Enabled' 
                          : 'Disabled'
                        }
                      </Badge>
                    </div>
                  ))}
                </div>
                
                <div className="mt-4 space-y-2">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      S3 Reports Bucket
                    </label>
                    <input
                      type="text"
                      value={configuration.aws.services.s3.reportsBucket}
                      onChange={(e) => setConfiguration(prev => ({
                        ...prev,
                        aws: {
                          ...prev.aws,
                          services: {
                            ...prev.aws.services,
                            s3: { ...prev.aws.services.s3, reportsBucket: e.target.value }
                          }
                        }
                      }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="privacy-comply-reports"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Lambda Execution Role ARN
                    </label>
                    <input
                      type="text"
                      value={configuration.aws.services.lambda.executionRole}
                      onChange={(e) => setConfiguration(prev => ({
                        ...prev,
                        aws: {
                          ...prev.aws,
                          services: {
                            ...prev.aws.services,
                            lambda: { ...prev.aws.services.lambda, executionRole: e.target.value }
                          }
                        }
                      }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="arn:aws:iam::123456789012:role/privacy-comply-lambda-role"
                    />
                  </div>
                </div>
              </Card>
            </div>
          </div>
        );

      case 'validation':
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">Validation & Deployment</h2>
              <p className="text-gray-600">
                Validate your configuration and deploy the AWS PrivacyComply Agent.
              </p>
            </div>
            
            <div className="space-y-4">
              {[
                { key: 'aws-credentials', label: 'AWS Credentials', icon: Key },
                { key: 'bedrock', label: 'Amazon Bedrock', icon: Cpu },
                { key: 'securityHub', label: 'AWS Security Hub', icon: Shield },
                { key: 'macie', label: 'Amazon Macie', icon: Eye },
                { key: 's3', label: 'Amazon S3', icon: HardDrive },
                { key: 'dynamodb', label: 'Amazon DynamoDB', icon: Database }
              ].map(({ key, label, icon: Icon }) => {
                const result = getValidationResult(key);
                return (
                  <div key={key} className="flex items-center justify-between p-3 border rounded-md">
                    <div className="flex items-center space-x-3">
                      <Icon className="h-5 w-5 text-gray-600" />
                      <span className="font-medium text-gray-900">{label}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      {result?.status === 'success' && (
                        <CheckCircle className="h-5 w-5 text-green-600" />
                      )}
                      {result?.status === 'error' && (
                        <AlertTriangle className="h-5 w-5 text-red-600" />
                      )}
                      {!result && (
                        <div className="h-5 w-5 rounded-full bg-gray-200" />
                      )}
                    </div>
                  </div>
                );
              })}
              
              <Button
                onClick={handleFullValidation}
                className="w-full mt-6"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Validating & Deploying...
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Validate & Deploy
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

  const canProceed = () => {
    switch (currentStep) {
      case 0: // Welcome
        return true;
      case 1: // AWS Setup
        const credentialsResult = getValidationResult('aws-credentials');
        return credentialsResult?.status === 'success' && 
               configuration.aws.services.s3.reportsBucket !== '';
      case 2: // Validation
        return true;
      default:
        return false;
    }
  };

  const progressPercentage = ((currentStep + 1) / steps.length) * 100;

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Progress Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold text-gray-900">AWS PrivacyComply Agent Setup</h1>
          <Button onClick={onSkip} variant="outline">
            Skip Setup
          </Button>
        </div>
        
        <div className="mb-4">
          <div className="flex justify-between text-sm text-gray-600 mb-2">
            <span>Step {currentStep + 1} of {steps.length}</span>
            <span>{Math.round(progressPercentage)}% Complete</span>
          </div>
          <ProgressBar value={progressPercentage} className="h-2" />
        </div>
        
        {/* Step Navigation */}
        <div className="flex items-center space-x-4 overflow-x-auto pb-2">
          {steps.map((step, index) => (
            <div
              key={step.id}
              className={`flex items-center space-x-2 px-3 py-1 rounded-full text-sm whitespace-nowrap ${
                index === currentStep
                  ? 'bg-blue-100 text-blue-800'
                  : index < currentStep
                  ? 'bg-green-100 text-green-800'
                  : 'bg-gray-100 text-gray-600'
              }`}
            >
              <step.icon className="h-4 w-4" />
              <span>{step.title}</span>
              {index < currentStep && <CheckCircle className="h-4 w-4" />}
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
          {currentStep === steps.length - 1 ? (
            <Button
              onClick={handleComplete}
              className="bg-green-600 hover:bg-green-700"
              disabled={!canProceed() || loading}
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
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2 text-red-800">
                <AlertTriangle className="h-5 w-5" />
                <span className="font-medium">Setup Error</span>
              </div>
              <Button onClick={clearError} variant="outline" size="sm">
                Dismiss
              </Button>
            </div>
            <p className="mt-2 text-red-700">{error}</p>
          </div>
        </Card>
      )}
    </div>
  );
};