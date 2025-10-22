import React from 'react';
import Card from '../ui/Card';
import Button from '../ui/Button';
import Badge from '../ui/Badge';
import ProgressBar from '../ui/ProgressBar';
import { 
  Shield, 
  AlertTriangle, 
  CheckCircle, 
  Settings,
  Play,
  Cloud,
  Key,
  Database,
  Zap
} from 'lucide-react';

interface SetupStatus {
  isSetupComplete: boolean;
  setupProgress: number;
  awsConfigured: boolean;
  servicesEnabled: boolean;
  validationPassed: boolean;
  lastSetupAttempt?: string;
  setupErrors: string[];
}

interface SetupStatusCardProps {
  setupStatus: SetupStatus;
  onStartSetup: () => void;
  onResumeSetup: () => void;
  onViewDetails: () => void;
}

export const SetupStatusCard: React.FC<SetupStatusCardProps> = ({
  setupStatus,
  onStartSetup,
  onResumeSetup,
  onViewDetails
}) => {
  const {
    isSetupComplete,
    setupProgress,
    awsConfigured,
    servicesEnabled,
    validationPassed,
    lastSetupAttempt,
    setupErrors
  } = setupStatus;

  const getStatusColor = () => {
    if (isSetupComplete && validationPassed) return 'text-green-600';
    if (setupProgress > 0) return 'text-yellow-600';
    return 'text-gray-600';
  };

  const getStatusIcon = () => {
    if (isSetupComplete && validationPassed) return CheckCircle;
    if (setupErrors.length > 0) return AlertTriangle;
    if (setupProgress > 0) return Settings;
    return Shield;
  };

  const StatusIcon = getStatusIcon();

  const getStatusMessage = () => {
    if (isSetupComplete && validationPassed) {
      return 'AWS PrivacyComply Agent is fully configured and ready';
    }
    if (setupErrors.length > 0) {
      return `Setup incomplete - ${setupErrors.length} error(s) found`;
    }
    if (setupProgress > 0) {
      return `Setup in progress - ${Math.round(setupProgress)}% complete`;
    }
    return 'AWS PrivacyComply Agent setup required';
  };

  const getActionButton = () => {
    if (isSetupComplete && validationPassed) {
      return (
        <Button onClick={onViewDetails} variant="outline" size="sm">
          <Settings className="h-4 w-4 mr-2" />
          View Configuration
        </Button>
      );
    }
    if (setupProgress > 0) {
      return (
        <Button onClick={onResumeSetup} size="sm">
          <Play className="h-4 w-4 mr-2" />
          Resume Setup
        </Button>
      );
    }
    return (
      <Button onClick={onStartSetup} size="sm">
        <Play className="h-4 w-4 mr-2" />
        Start Setup
      </Button>
    );
  };

  return (
    <Card className={`border-l-4 ${
      isSetupComplete && validationPassed 
        ? 'border-l-green-500 bg-green-50' 
        : setupErrors.length > 0
        ? 'border-l-red-500 bg-red-50'
        : setupProgress > 0
        ? 'border-l-yellow-500 bg-yellow-50'
        : 'border-l-gray-500 bg-gray-50'
    }`}>
      <div className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex items-start space-x-3">
            <StatusIcon className={`h-6 w-6 mt-0.5 ${getStatusColor()}`} />
            <div className="flex-1">
              <h3 className="font-medium text-gray-900 mb-1">
                AWS PrivacyComply Agent Setup
              </h3>
              <p className={`text-sm mb-3 ${getStatusColor()}`}>
                {getStatusMessage()}
              </p>
              
              {/* Progress Bar */}
              {setupProgress > 0 && setupProgress < 100 && (
                <div className="mb-3">
                  <ProgressBar value={setupProgress} className="h-2" />
                </div>
              )}
              
              {/* Setup Components Status */}
              <div className="flex flex-wrap gap-2 mb-3">
                <Badge variant={awsConfigured ? 'success' : 'default'}>
                  <Cloud className="h-3 w-3 mr-1" />
                  AWS
                </Badge>
                <Badge variant={servicesEnabled ? 'success' : 'default'}>
                  <Database className="h-3 w-3 mr-1" />
                  Services
                </Badge>
                <Badge variant={validationPassed ? 'success' : 'default'}>
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Validation
                </Badge>
              </div>
              
              {/* Setup Errors */}
              {setupErrors.length > 0 && (
                <div className="mb-3">
                  <div className="text-sm text-red-800 font-medium mb-1">
                    Setup Issues:
                  </div>
                  <ul className="text-sm text-red-700 space-y-1">
                    {setupErrors.slice(0, 3).map((error, index) => (
                      <li key={index} className="flex items-start">
                        <span className="mr-2">•</span>
                        <span>{error}</span>
                      </li>
                    ))}
                    {setupErrors.length > 3 && (
                      <li className="text-red-600">
                        ... and {setupErrors.length - 3} more issues
                      </li>
                    )}
                  </ul>
                </div>
              )}
              
              {/* Last Setup Attempt */}
              {lastSetupAttempt && (
                <p className="text-xs text-gray-500 mb-3">
                  Last setup attempt: {new Date(lastSetupAttempt).toLocaleString()}
                </p>
              )}
            </div>
          </div>
          
          <div className="ml-4">
            {getActionButton()}
          </div>
        </div>
        
        {/* Quick Setup Overview */}
        {!isSetupComplete && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="text-sm text-gray-600 mb-2">Setup includes:</div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
              <div className="flex items-center space-x-1">
                <Key className="h-3 w-3 text-gray-500" />
                <span>AWS Credentials</span>
              </div>
              <div className="flex items-center space-x-1">
                <Cloud className="h-3 w-3 text-gray-500" />
                <span>Service Config</span>
              </div>
              <div className="flex items-center space-x-1">
                <Zap className="h-3 w-3 text-gray-500" />
                <span>Automation</span>
              </div>
              <div className="flex items-center space-x-1">
                <CheckCircle className="h-3 w-3 text-gray-500" />
                <span>Validation</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
};