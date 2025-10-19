"use strict";
/**
 * Lambda Function Registry
 * Manages available Lambda functions for remediation automation
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.getLambdaRegistry = exports.LambdaFunctionRegistry = void 0;
const s3_access_restriction_1 = require("./s3-access-restriction");
const encryption_enablement_1 = require("./encryption-enablement");
const iam_policy_adjustment_1 = require("./iam-policy-adjustment");
/**
 * Registry of all available Lambda functions for remediation
 */
class LambdaFunctionRegistry {
    constructor() {
        this.functions = new Map();
        this.registerDefaultFunctions();
    }
    static getInstance() {
        if (!LambdaFunctionRegistry.instance) {
            LambdaFunctionRegistry.instance = new LambdaFunctionRegistry();
        }
        return LambdaFunctionRegistry.instance;
    }
    /**
     * Register default Lambda functions
     */
    registerDefaultFunctions() {
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
            handler: s3_access_restriction_1.handler,
            rollbackHandler: s3_access_restriction_1.rollbackHandler
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
            handler: encryption_enablement_1.handler,
            rollbackHandler: encryption_enablement_1.rollbackHandler
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
            handler: iam_policy_adjustment_1.handler,
            rollbackHandler: iam_policy_adjustment_1.rollbackHandler
        });
    }
    /**
     * Register a new Lambda function
     */
    registerFunction(entry) {
        this.functions.set(entry.metadata.functionName, entry);
    }
    /**
     * Get a Lambda function by name
     */
    getFunction(functionName) {
        return this.functions.get(functionName);
    }
    /**
     * Get all available Lambda functions
     */
    getAllFunctions() {
        return Array.from(this.functions.values());
    }
    /**
     * Get Lambda functions that support a specific action
     */
    getFunctionsByAction(action) {
        return Array.from(this.functions.values()).filter(entry => entry.metadata.supportedActions.includes(action));
    }
    /**
     * Get Lambda function metadata only
     */
    getFunctionMetadata() {
        return Array.from(this.functions.values()).map(entry => entry.metadata);
    }
    /**
     * Check if a function exists
     */
    hasFunction(functionName) {
        return this.functions.has(functionName);
    }
    /**
     * Remove a function from the registry
     */
    unregisterFunction(functionName) {
        return this.functions.delete(functionName);
    }
    /**
     * Get functions by risk level
     */
    getFunctionsByRiskLevel(riskLevel) {
        return Array.from(this.functions.values()).filter(entry => entry.metadata.riskLevel === riskLevel);
    }
    /**
     * Validate function parameters
     */
    validateParameters(functionName, parameters) {
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
exports.LambdaFunctionRegistry = LambdaFunctionRegistry;
/**
 * Get the singleton instance of the Lambda Function Registry
 */
const getLambdaRegistry = () => {
    return LambdaFunctionRegistry.getInstance();
};
exports.getLambdaRegistry = getLambdaRegistry;
