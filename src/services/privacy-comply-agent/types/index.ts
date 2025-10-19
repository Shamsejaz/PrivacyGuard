// Core data models and interfaces for Privacy Comply Agent

// AWS Resource Models
export interface AWSResource {
  arn: string;
  resourceType: string;
  region: string;
  tags: Record<string, string>;
  lastModified: Date;
}

export interface S3BucketResource extends AWSResource {
  bucketName: string;
  publicAccess: boolean;
  encryption: {
    enabled: boolean;
    keyId?: string;
  };
  versioning: boolean;
  logging: boolean;
}

// Compliance Finding Models
export interface ComplianceFinding {
  id: string;
  resourceArn: string;
  findingType: 'ENCRYPTION' | 'ACCESS_CONTROL' | 'PII_EXPOSURE' | 'LOGGING';
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  description: string;
  detectedAt: Date;
  rawData: any;
}

export interface S3ComplianceFindings extends ComplianceFinding {
  bucketName: string;
  publicAccessIssues: string[];
  encryptionIssues: string[];
}

export interface IAMComplianceFindings extends ComplianceFinding {
  roleName: string;
  policyArn: string;
  overprivilegedActions: string[];
  riskyPermissions: string[];
}

export interface AccessViolationFindings extends ComplianceFinding {
  eventName: string;
  sourceIPAddress: string;
  userIdentity: any;
  unauthorizedAccess: boolean;
}

export interface PIIDetectionFindings extends ComplianceFinding {
  piiTypes: string[];
  confidence: number;
  location: string;
}

export interface SecurityComplianceFindings extends ComplianceFinding {
  complianceType: string;
  productArn: string;
  generatorId: string;
}

// Legal Mapping Models
export interface LegalMapping {
  regulation: 'GDPR' | 'PDPL' | 'CCPA';
  article: string;
  description: string;
  applicability: number;
}

// Compliance Assessment Models
export interface ComplianceAssessment {
  findingId: string;
  legalMappings: LegalMapping[];
  riskScore: number;
  confidenceScore: number;
  recommendations: RemediationRecommendation[];
  reasoning: string;
  assessedAt: Date;
}

// Remediation Models
export interface RemediationRecommendation {
  id: string;
  findingId: string;
  action: 'RESTRICT_ACCESS' | 'ENABLE_ENCRYPTION' | 'UPDATE_POLICY' | 'ENABLE_LOGGING';
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  automatable: boolean;
  lambdaFunction: string;
  parameters: Record<string, any>;
  estimatedImpact: string;
}

export interface RemediationResult {
  remediationId: string;
  success: boolean;
  message: string;
  executedAt: Date;
  rollbackAvailable: boolean;
}

export interface RemediationStatus {
  id: string;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED' | 'ROLLED_BACK';
  progress: number;
  lastUpdated: Date;
  logs: string[];
}

// Compliance Rule Models
export interface ComplianceRule {
  id: string;
  regulation: string;
  article: string;
  description: string;
  checkFunction: string;
  severity: string;
  automatedRemediation?: string;
}

export interface ComplianceStatus {
  resourceArn: string;
  rules: {
    ruleId: string;
    compliant: boolean;
    lastChecked: Date;
    findings?: ComplianceFinding[];
  }[];
  overallScore: number;
}

// Reporting Models
export interface ReportScope {
  departments?: string[];
  regulations?: string[];
  timeRange?: DateRange;
  resourceTypes?: string[];
}

export interface DateRange {
  startDate: Date;
  endDate: Date;
}

export interface ComplianceReport {
  id: string;
  type: 'DPIA' | 'ROPA' | 'AUDIT' | 'SUMMARY';
  generatedAt: Date;
  scope: ReportScope;
  findings: ComplianceFinding[];
  assessments: ComplianceAssessment[];
  recommendations: RemediationRecommendation[];
  executiveSummary: string;
}

export interface DPIAReport extends ComplianceReport {
  type: 'DPIA';
  dataProcessingActivities: ProcessingActivity[];
  riskAssessment: RiskAssessment;
  mitigationMeasures: string[];
}

export interface RoPAReport extends ComplianceReport {
  type: 'ROPA';
  processingActivities: ProcessingActivity[];
  dataCategories: DataCategory[];
  legalBases: string[];
}

export interface AuditReport extends ComplianceReport {
  type: 'AUDIT';
  auditPeriod: DateRange;
  complianceScore: number;
  violations: ComplianceFinding[];
  remediationActions: RemediationResult[];
}

export interface ComplianceSummary extends ComplianceReport {
  type: 'SUMMARY';
  overallScore: number;
  trendAnalysis: TrendData[];
  keyMetrics: Record<string, number>;
}

// Supporting Models
export interface ProcessingActivity {
  id: string;
  name: string;
  purpose: string;
  dataCategories: DataCategory[];
  legalBasis: string;
  dataSubjects: string[];
  recipients: string[];
  retentionPeriod: string;
}

export interface DataCategory {
  name: string;
  type: 'PERSONAL' | 'SENSITIVE' | 'SPECIAL';
  description: string;
  sources: string[];
}

export interface RiskAssessment {
  overallRisk: 'LOW' | 'MEDIUM' | 'HIGH' | 'VERY_HIGH';
  riskFactors: RiskFactor[];
  mitigationMeasures: string[];
  residualRisk: 'LOW' | 'MEDIUM' | 'HIGH' | 'VERY_HIGH';
}

export interface RiskFactor {
  factor: string;
  impact: 'LOW' | 'MEDIUM' | 'HIGH';
  likelihood: 'LOW' | 'MEDIUM' | 'HIGH';
  description: string;
}

export interface TrendData {
  period: string;
  value: number;
  change: number;
}

// Natural Language Interface Models
export interface ConversationContext {
  conversationId: string;
  userId: string;
  previousQueries: string[];
  context: Record<string, any>;
}

export interface QueryResponse {
  answer: string;
  confidence: number;
  sources: string[];
  relatedFindings: ComplianceFinding[];
  suggestedActions: string[];
  conversationId: string;
}

// Query Processing Models
export enum QueryIntent {
  COMPLIANCE_STATUS = 'compliance_status',
  FINDING_EXPLANATION = 'finding_explanation',
  LEGAL_MAPPING = 'legal_mapping',
  REMEDIATION_GUIDANCE = 'remediation_guidance',
  REPORT_GENERATION = 'report_generation',
  RISK_ASSESSMENT = 'risk_assessment',
  REGULATION_INQUIRY = 'regulation_inquiry',
  GENERAL_HELP = 'general_help'
}

export interface ParsedQuery {
  intent: QueryIntent;
  entities: {
    regulations?: string[];
    resources?: string[];
    timeframe?: string;
    severity?: string;
    department?: string;
  };
  confidence: number;
  originalQuery: string;
}

export interface LegalContext {
  applicableRegulations: string[];
  relevantArticles: LegalMapping[];
  complianceRequirements: string[];
  penalties: string[];
}

// ML Training Models
export interface TrainingData {
  findingId: string;
  features: Record<string, any>;
  humanFeedback?: {
    correctAssessment: boolean;
    correctRemediation: boolean;
    comments: string;
  };
  outcome: {
    remediationSuccess: boolean;
    falsePositive: boolean;
  };
}

// SageMaker Pipeline Models
export interface SageMakerTrainingJob {
  trainingJobName: string;
  trainingJobStatus: 'InProgress' | 'Completed' | 'Failed' | 'Stopping' | 'Stopped';
  creationTime: Date;
  trainingStartTime?: Date;
  trainingEndTime?: Date;
  modelArtifacts?: {
    s3ModelArtifacts: string;
  };
  finalMetricDataList?: Array<{
    metricName: string;
    value: number;
  }>;
}

export interface SageMakerEndpoint {
  endpointName: string;
  endpointArn: string;
  endpointConfigName: string;
  endpointStatus: 'OutOfService' | 'Creating' | 'Updating' | 'SystemUpdating' | 'RollingBack' | 'InService' | 'Deleting' | 'Failed';
  creationTime: Date;
  lastModifiedTime: Date;
  productionVariants?: Array<{
    variantName: string;
    deployedImages: Array<{
      specifiedImage: string;
      resolvedImage: string;
    }>;
    currentWeight: number;
    desiredWeight: number;
    currentInstanceCount: number;
    desiredInstanceCount: number;
  }>;
}

export interface ModelRegistry {
  modelPackageGroupName: string;
  modelPackageVersion: string;
  modelPackageArn: string;
  modelPackageDescription?: string;
  creationTime: Date;
  modelApprovalStatus: 'Approved' | 'Rejected' | 'PendingManualApproval';
  modelMetrics?: {
    modelQuality?: {
      statistics?: {
        contentType: string;
        s3Uri: string;
      };
    };
  };
}

// Error Handling Models
export interface ErrorResponse {
  errorCode: string;
  message: string;
  details?: any;
  retryable: boolean;
  suggestedAction?: string;
  timestamp: Date;
}

// Lambda Function Models
export interface LambdaEvent<T = any> {
  parameters: T;
  context?: {
    requestId: string;
    functionName: string;
    functionVersion: string;
    invokedFunctionArn: string;
    memoryLimitInMB: string;
    awsRequestId: string;
  };
}

export interface LambdaResult<T = any> {
  success: boolean;
  message: string;
  data?: T;
  error?: string;
}

export type LambdaHandler<TParams = any, TResult = any> = (
  event: LambdaEvent<TParams>
) => Promise<TResult>;

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

// AWS Configuration Models
export interface AWSConfig {
  region: string;
  accessKeyId?: string;
  secretAccessKey?: string;
  sessionToken?: string;
  profile?: string;
}

export interface ServiceConfig {
  bedrock: {
    modelId: string;
    region: string;
  };
  sagemaker: {
    endpointName: string;
    region: string;
  };
  s3: {
    reportsBucket: string;
    region: string;
  };
  dynamodb: {
    tableName: string;
    region: string;
  };
}

// Agent Configuration
export interface AgentConfiguration {
  scanInterval: number; // milliseconds between scans
  autoRemediation: boolean; // enable automatic remediation
  maxConcurrentRemediations: number; // max parallel remediations
  riskThreshold: number; // threshold for auto-remediation (0-1)
  enableContinuousMonitoring: boolean; // enable continuous monitoring
  retryAttempts: number; // number of retry attempts for failed operations
  retryDelay: number; // delay between retries in milliseconds
}