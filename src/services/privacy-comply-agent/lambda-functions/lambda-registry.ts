/**
 * Lambda Function Registry
 * Manages available Lambda functions for remediation automation
 */

import { LambdaFunctionMetadata } from '../types';
import { handler as s3AccessRestrictionHandler, rollbackHandler as s3AccessRestrictionRollback } from './s3-access-restriction';
import { handler as encryptionEnablementHandler, rollbackHandler as encryptionEnablementRollback } from './encryption-enablement';
import { handler as iamPolicyAdjustmentHandler, rollbackHandler as iamPolicyAdjustmentRollback } from './iam-policy-adjustment';

export interface LambdaFunctionEntry {
  metadata: LambdaFunctionMetadata;
  handler: Function;
  rollbackHandler?: Function;
}

/**
 * Registry of all available Lambda functions for remediation
 */
export class LambdaFunctionRegistry {
  private static instance: LambdaFunctionRegistry;
  private functions: Map<string, LambdaFunctionEntry> = new Map();

  private constructor() {
    this.registerDefaultFunctions();
  }

  public static getInstance(): LambdaFunctionRegistry {
    if (!LambdaFunctionRegistry.instance) {
      LambdaFunctionRegistry.instance = new LambdaFunctionRegistry();
    }
    return LambdaFunctionRegistry.instance;
  }

  /**
   * Register default Lambda functions
   */
  private registerDefaultFunctions(): void {
    // S3 Access Restriction Lambda
    this.registerFunction({
      metadata: {
        functionName: 'privacy-comply-s3-access-restriction',
        description: 'Restricts public access to S3 buckets containing PII/PHI data',
        supportedActions: ['RESTRICT_ACCESS'],
        requiredParameters: ['bucketName'],
        optionalParameters: ['restrictPublicRead', 'restrictPublicWrite', 'blockPublicAcls', 'ignorePublicAcls', 'blockPublicPolicy', 'restrictPublicBuckets'],
        rollbackSupported: true,
        estimatedExecutionTime: 30,
        riskLevel: 'MEDIUM'
      },
      handler: s3AccessRestrictionHandler,
      rollbackHandler: s3AccessRestrictionRollback
    });

    // Encryption Enablement Lambda
    this.registerFunction({
      metadata: {
        functionName: 'privacy-comply-encryption-enablement',
        description: 'Enables encryption for AWS resources containing sensitive data',
        supportedActions: ['ENABLE_ENCRYPTION'],
        requiredParameters: ['resourceType', 'resourceIdentifier'],
        optionalParameters: ['encryptionType', 'kmsKeyId', 'applyImmediately'],
        rollbackSupported: true,
        estimatedExecutionTime: 45,
        riskLevel: 'LOW'
      },
      handler: encryptionEnablementHandler,
      rollbackHandler: encryptionEnablementRollback
    });

    // IAM Policy Adjustment Lambda
    this.registerFunction({
      metadata: {
        functionName: 'privacy-comply-iam-policy-adjustment',
        description: 'Adjusts IAM policies to follow principle of least privilege',
        supportedActions: ['UPDATE_POLICY'],
        requiredParameters: ['principalType', 'principalName', 'adjustmentType'],
        optionalParameters: ['targetActions', 'targetResources', 'allowedActions', 'allowedResources', 'policyName'],
        rollbackSupported: true,
        estimatedExecutionTime: 60,
        riskLevel: 'HIGH'
      },
      handler: iamPolicyAdjustmentHandler,
      rollbackHandler: iamPolicyAdjustmentRollback
    });
  }

  /**
   * Register a new Lambda function
   */
  public registerFunction(entry: LambdaFunctionEntry): void {
    this.functions.set(entry.metadata.functionName, entry);
  }

  /**
   * Get a Lambda function by name
   */
  public getFunction(functionName: string): LambdaFunctionEntry | undefined {
    return this.functions.get(functionName);
  }

  /**
   * Get all available Lambda functions
   */
  public getAllFunctions(): LambdaFunctionEntry[] {
    return Array.from(this.functions.values());
  }

  /**
   * Get Lambda functions that support a specific action
   */
  public getFunctionsByAction(action: string): LambdaFunctionEntry[] {
    return Array.from(this.functions.values()).filter(entry =>
      entry.metadata.supportedActions.includes(action)
    );
  }

  /**
   * Get Lambda function metadata only
   */
  public getFunctionMetadata(): LambdaFunctionMetadata[] {
    return Array.from(this.functions.values()).map(entry => entry.metadata);
  }

  /**
   * Check if a function exists
   */
  public hasFunction(functionName: string): boolean {
    return this.functions.has(functionName);
  }

  /**
   * Remove a function from the registry
   */
  public unregisterFunction(functionName: string): boolean {
    return this.functions.delete(functionName);
  }

  /**
   * Get functions by risk level
   */
  public getFunctionsByRiskLevel(riskLevel: 'LOW' | 'MEDIUM' | 'HIGH'): LambdaFunctionEntry[] {
    return Array.from(this.functions.values()).filter(entry =>
      entry.metadata.riskLevel === riskLevel
    );
  }

  /**
   * Validate function parameters
   */
  public validateParameters(functionName: string, parameters: Record<string, any>): {
    valid: boolean;
    missingRequired: string[];
    invalidParameters: string[];
  } {
    const functionEntry = this.getFunction(functionName);
    if (!functionEntry) {
      return {
        valid: false,
        missingRequired: [],
        invalidParameters: [`Function ${functionName} not found`]
      };
    }

    const { requiredParameters, optionalParameters } = functionEntry.metadata;
    const providedParameters = Object.keys(parameters);
    const allValidParameters = [...requiredParameters, ...optionalParameters];

    const missingRequired = requiredParameters.filter(param => !providedParameters.includes(param));
    const invalidParameters = providedParameters.filter(param => !allValidParameters.includes(param));

    return {
      valid: missingRequired.length === 0 && invalidParameters.length === 0,
      missingRequired,
      invalidParameters
    };
  }
}

/**
 * Get the singleton instance of the Lambda Function Registry
 */
export const getLambdaRegistry = (): LambdaFunctionRegistry => {
  return LambdaFunctionRegistry.getInstance();
};