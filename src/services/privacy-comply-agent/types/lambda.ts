/**
 * Lambda function types and interfaces for Privacy Comply Agent
 */

export interface LambdaEvent<T = any> {
  parameters: T;
  context?: {
    requestId: string;
    functionName: string;
    functionVersion: string;
    invokedFunctionArn: string;
    memoryLimitInMB: string;
    awsRequestId: string;
    logGroupName: string;
    logStreamName: string;
    identity?: any;
    clientContext?: any;
  };
}

export interface LambdaContext {
  callbackWaitsForEmptyEventLoop: boolean;
  functionName: string;
  functionVersion: string;
  invokedFunctionArn: string;
  memoryLimitInMB: string;
  awsRequestId: string;
  logGroupName: string;
  logStreamName: string;
  identity?: any;
  clientContext?: any;
  getRemainingTimeInMillis(): number;
  done(error?: Error, result?: any): void;
  fail(error: Error | string): void;
  succeed(messageOrObject: any): void;
}

export type LambdaHandler<TEvent = any, TResult = any> = (
  event: LambdaEvent<TEvent>,
  context?: LambdaContext
) => Promise<TResult>;

export type LambdaCallback<TResult = any> = (
  error?: Error | null,
  result?: TResult
) => void;

/**
 * Standard Lambda response format for remediation functions
 */
export interface LambdaRemediationResponse {
  success: boolean;
  message: string;
  resourceIdentifier: string;
  actionsPerformed: string[];
  rollbackData?: any;
  executionTime?: number;
  timestamp: string;
}

/**
 * Lambda function metadata for registration
 */
export interface LambdaFunctionMetadata {
  functionName: string;
  description: string;
  supportedActions: string[];
  requiredParameters: string[];
  optionalParameters: string[];
  rollbackSupported: boolean;
  estimatedExecutionTime: number; // in seconds
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
}