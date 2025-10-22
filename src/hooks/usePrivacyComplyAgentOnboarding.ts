import { useState, useEffect, useCallback } from 'react';
import { 
  onboardingService, 
  OnboardingConfiguration, 
  ValidationResult 
} from '../services/privacy-comply-agent/onboarding-service';

export interface SetupStatus {
  isSetupComplete: boolean;
  setupProgress: number;
  awsConfigured: boolean;
  servicesEnabled: boolean;
  validationPassed: boolean;
  lastSetupAttempt?: string;
  setupErrors: string[];
}

export interface OnboardingState {
  setupStatus: SetupStatus | null;
  validationResults: ValidationResult[];
  loading: boolean;
  error: string | null;
  currentConfiguration: OnboardingConfiguration | null;
}

/**
 * Hook for managing AWS PrivacyComply Agent onboarding process
 * Part of the multi-cloud privacy compliance framework
 */
export const usePrivacyComplyAgentOnboarding = () => {
  const [state, setState] = useState<OnboardingState>({
    setupStatus: null,
    validationResults: [],
    loading: true,
    error: null,
    currentConfiguration: null
  });

  // Load initial setup status
  const loadSetupStatus = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }));
      
      const [setupStatus, configuration] = await Promise.all([
        onboardingService.getSetupStatus(),
        onboardingService.loadConfiguration()
      ]);

      setState(prev => ({
        ...prev,
        setupStatus,
        currentConfiguration: configuration,
        loading: false
      }));
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to load setup status',
        loading: false
      }));
    }
  }, []);

  // Validate AWS credentials
  const validateCredentials = useCallback(async (
    credentials: OnboardingConfiguration['aws']['credentials']
  ): Promise<ValidationResult> => {
    try {
      setState(prev => ({ ...prev, loading: true }));
      
      const result = await onboardingService.validateAWSCredentials(credentials);
      
      setState(prev => ({
        ...prev,
        validationResults: [
          ...prev.validationResults.filter(r => r.service !== 'aws-credentials'),
          result
        ],
        loading: false
      }));
      
      return result;
    } catch (error) {
      const errorResult: ValidationResult = {
        service: 'aws-credentials',
        status: 'error',
        message: error instanceof Error ? error.message : 'Validation failed'
      };
      
      setState(prev => ({
        ...prev,
        validationResults: [
          ...prev.validationResults.filter(r => r.service !== 'aws-credentials'),
          errorResult
        ],
        loading: false
      }));
      
      return errorResult;
    }
  }, []);

  // Validate AWS service
  const validateService = useCallback(async (
    serviceName: string,
    serviceConfig: any,
    credentials: OnboardingConfiguration['aws']['credentials']
  ): Promise<ValidationResult> => {
    try {
      setState(prev => ({ ...prev, loading: true }));
      
      const result = await onboardingService.validateAWSService(
        serviceName, 
        serviceConfig, 
        credentials
      );
      
      setState(prev => ({
        ...prev,
        validationResults: [
          ...prev.validationResults.filter(r => r.service !== serviceName),
          result
        ],
        loading: false
      }));
      
      return result;
    } catch (error) {
      const errorResult: ValidationResult = {
        service: serviceName,
        status: 'error',
        message: error instanceof Error ? error.message : 'Service validation failed'
      };
      
      setState(prev => ({
        ...prev,
        validationResults: [
          ...prev.validationResults.filter(r => r.service !== serviceName),
          errorResult
        ],
        loading: false
      }));
      
      return errorResult;
    }
  }, []);

  // Run full validation
  const runFullValidation = useCallback(async (
    config: OnboardingConfiguration
  ): Promise<ValidationResult[]> => {
    try {
      setState(prev => ({ ...prev, loading: true }));
      
      const results = await onboardingService.runFullValidation(config);
      
      setState(prev => ({
        ...prev,
        validationResults: results,
        loading: false
      }));
      
      return results;
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Full validation failed',
        loading: false
      }));
      
      return [];
    }
  }, []);

  // Deploy infrastructure
  const deployInfrastructure = useCallback(async (
    config: OnboardingConfiguration
  ): Promise<ValidationResult[]> => {
    try {
      setState(prev => ({ ...prev, loading: true }));
      
      const results = await onboardingService.deployInfrastructure(config);
      
      setState(prev => ({
        ...prev,
        validationResults: [...prev.validationResults, ...results],
        loading: false
      }));
      
      return results;
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Infrastructure deployment failed',
        loading: false
      }));
      
      return [];
    }
  }, []);

  // Deploy Lambda functions
  const deployLambdaFunctions = useCallback(async (
    config: OnboardingConfiguration
  ): Promise<ValidationResult[]> => {
    try {
      setState(prev => ({ ...prev, loading: true }));
      
      const results = await onboardingService.deployLambdaFunctions(config);
      
      setState(prev => ({
        ...prev,
        validationResults: [...prev.validationResults, ...results],
        loading: false
      }));
      
      return results;
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Lambda deployment failed',
        loading: false
      }));
      
      return [];
    }
  }, []);

  // Save configuration
  const saveConfiguration = useCallback(async (
    config: OnboardingConfiguration
  ): Promise<void> => {
    try {
      setState(prev => ({ ...prev, loading: true }));
      
      await onboardingService.saveConfiguration(config);
      
      setState(prev => ({
        ...prev,
        currentConfiguration: config,
        loading: false
      }));
      
      // Reload setup status after saving
      await loadSetupStatus();
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to save configuration',
        loading: false
      }));
    }
  }, [loadSetupStatus]);

  // Reset configuration
  const resetConfiguration = useCallback(async (): Promise<void> => {
    try {
      setState(prev => ({ ...prev, loading: true }));
      
      await onboardingService.resetConfiguration();
      
      setState(prev => ({
        ...prev,
        currentConfiguration: null,
        validationResults: [],
        setupStatus: null,
        loading: false
      }));
      
      // Reload setup status after reset
      await loadSetupStatus();
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to reset configuration',
        loading: false
      }));
    }
  }, [loadSetupStatus]);

  // Get validation result for a specific service
  const getValidationResult = useCallback((serviceName: string): ValidationResult | null => {
    return state.validationResults.find(r => r.service === serviceName) || null;
  }, [state.validationResults]);

  // Check if a service is validated successfully
  const isServiceValidated = useCallback((serviceName: string): boolean => {
    const result = getValidationResult(serviceName);
    return result?.status === 'success';
  }, [getValidationResult]);

  // Get overall validation status
  const getOverallValidationStatus = useCallback((): {
    isValid: boolean;
    hasErrors: boolean;
    hasWarnings: boolean;
    errorCount: number;
    warningCount: number;
  } => {
    const errors = state.validationResults.filter(r => r.status === 'error');
    const warnings = state.validationResults.filter(r => r.status === 'warning');
    
    return {
      isValid: errors.length === 0,
      hasErrors: errors.length > 0,
      hasWarnings: warnings.length > 0,
      errorCount: errors.length,
      warningCount: warnings.length
    };
  }, [state.validationResults]);

  // Clear error
  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  // Initialize on mount
  useEffect(() => {
    loadSetupStatus();
  }, [loadSetupStatus]);

  return {
    // State
    ...state,
    
    // Actions
    loadSetupStatus,
    validateCredentials,
    validateService,
    runFullValidation,
    deployInfrastructure,
    deployLambdaFunctions,
    saveConfiguration,
    resetConfiguration,
    clearError,
    
    // Helpers
    getValidationResult,
    isServiceValidated,
    getOverallValidationStatus
  };
};