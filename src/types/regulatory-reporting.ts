export interface RegulatoryReport {
  id: string;
  name: string;
  type: RegulatoryReportType;
  framework: ComplianceFramework;
  status: ReportStatus;
  createdAt: Date;
  updatedAt: Date;
  generatedAt?: Date;
  scheduledAt?: Date;
  createdBy: string;
  tenantId: string;
  template: ReportTemplate;
  parameters: ReportParameters;
  metadata: ReportMetadata;
  digitalSignature?: DigitalSignature;
  fileUrl?: string;
  fileSize?: number;
  expiresAt?: Date;
}

export enum RegulatoryReportType {
  GDPR_COMPLIANCE_REPORT = 'GDPR_COMPLIANCE_REPORT',
  GDPR_BREACH_NOTIFICATION = 'GDPR_BREACH_NOTIFICATION',
  GDPR_DPIA_REPORT = 'GDPR_DPIA_REPORT',
  GDPR_RECORDS_OF_PROCESSING = 'GDPR_RECORDS_OF_PROCESSING',
  
  CCPA_COMPLIANCE_REPORT = 'CCPA_COMPLIANCE_REPORT',
  CCPA_CONSUMER_REQUESTS = 'CCPA_CONSUMER_REQUESTS',
  CCPA_DATA_INVENTORY = 'CCPA_DATA_INVENTORY',
  
  HIPAA_COMPLIANCE_REPORT = 'HIPAA_COMPLIANCE_REPORT',
  HIPAA_RISK_ASSESSMENT = 'HIPAA_RISK_ASSESSMENT',
  HIPAA_BREACH_REPORT = 'HIPAA_BREACH_REPORT',
  
  PDPL_COMPLIANCE_REPORT = 'PDPL_COMPLIANCE_REPORT',
  PDPL_CONSENT_REPORT = 'PDPL_CONSENT_REPORT',
  PDPL_TRANSFER_REPORT = 'PDPL_TRANSFER_REPORT',
  
  CUSTOM_REPORT = 'CUSTOM_REPORT'
}

export enum ComplianceFramework {
  GDPR = 'GDPR',
  CCPA = 'CCPA',
  HIPAA = 'HIPAA',
  PDPL = 'PDPL',
  SOX = 'SOX',
  PCI_DSS = 'PCI_DSS'
}

export enum ReportStatus {
  DRAFT = 'DRAFT',
  SCHEDULED = 'SCHEDULED',
  GENERATING = 'GENERATING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  EXPIRED = 'EXPIRED'
}

export interface ReportTemplate {
  id: string;
  name: string;
  description: string;
  framework: ComplianceFramework;
  type: RegulatoryReportType;
  version: string;
  sections: ReportSection[];
  customFields: CustomField[];
  formatting: ReportFormatting;
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ReportSection {
  id: string;
  title: string;
  description?: string;
  order: number;
  required: boolean;
  dataSource: DataSource;
  template: string; // HTML template with placeholders
  conditions?: ReportCondition[];
}

export interface DataSource {
  type: 'audit_logs' | 'compliance_data' | 'dsar_requests' | 'risk_assessments' | 'custom_query';
  query: string;
  parameters: Record<string, any>;
  aggregations?: DataAggregation[];
}

export interface DataAggregation {
  field: string;
  type: 'count' | 'sum' | 'avg' | 'min' | 'max' | 'group_by';
  alias?: string;
}

export interface ReportCondition {
  field: string;
  operator: 'equals' | 'not_equals' | 'greater_than' | 'less_than' | 'contains' | 'in' | 'between';
  value: any;
}

export interface CustomField {
  id: string;
  name: string;
  type: 'text' | 'number' | 'date' | 'boolean' | 'select' | 'multiselect';
  required: boolean;
  defaultValue?: any;
  options?: string[];
  validation?: FieldValidation;
}

export interface FieldValidation {
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  min?: number;
  max?: number;
}

export interface ReportFormatting {
  pageSize: 'A4' | 'Letter' | 'Legal';
  orientation: 'portrait' | 'landscape';
  margins: {
    top: number;
    right: number;
    bottom: number;
    left: number;
  };
  header?: ReportHeader;
  footer?: ReportFooter;
  styles: ReportStyles;
}

export interface ReportHeader {
  enabled: boolean;
  template: string;
  height: number;
}

export interface ReportFooter {
  enabled: boolean;
  template: string;
  height: number;
  includePageNumbers: boolean;
  includeTimestamp: boolean;
}

export interface ReportStyles {
  fontFamily: string;
  fontSize: number;
  lineHeight: number;
  colors: {
    primary: string;
    secondary: string;
    text: string;
    background: string;
  };
}

export interface ReportParameters {
  dateRange: {
    startDate: Date;
    endDate: Date;
  };
  filters: Record<string, any>;
  customFields: Record<string, any>;
  includeCharts: boolean;
  includeRawData: boolean;
  format: ReportFormat;
  language: string;
  timezone: string;
}

export enum ReportFormat {
  PDF = 'PDF',
  HTML = 'HTML',
  DOCX = 'DOCX',
  XLSX = 'XLSX',
  CSV = 'CSV',
  JSON = 'JSON'
}

export interface ReportMetadata {
  totalRecords: number;
  dataSourcesUsed: string[];
  generationTime: number; // milliseconds
  fileHash?: string;
  complianceVersion: string;
  regulatoryRequirements: string[];
  certifications?: string[];
}

export interface DigitalSignature {
  algorithm: string;
  signature: string;
  certificate: string;
  timestamp: Date;
  signedBy: string;
  valid: boolean;
}

export interface ReportSchedule {
  id: string;
  name: string;
  description?: string;
  reportTemplateId: string;
  parameters: ReportParameters;
  schedule: ScheduleConfig;
  recipients: ReportRecipient[];
  enabled: boolean;
  lastRun?: Date;
  nextRun?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface ScheduleConfig {
  type: 'once' | 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'annually' | 'cron';
  interval?: number;
  dayOfWeek?: number; // 0-6, Sunday = 0
  dayOfMonth?: number; // 1-31
  hour: number; // 0-23
  minute: number; // 0-59
  cronExpression?: string;
  timezone: string;
}

export interface ReportRecipient {
  type: 'email' | 'webhook' | 'sftp' | 'api';
  address: string;
  name?: string;
  configuration?: Record<string, any>;
  enabled: boolean;
}

export interface ReportGenerationRequest {
  templateId: string;
  parameters: ReportParameters;
  scheduleId?: string;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  notifyOnCompletion: boolean;
  recipients?: ReportRecipient[];
}

export interface ReportGenerationStatus {
  id: string;
  status: ReportStatus;
  progress: number; // 0-100
  currentStep: string;
  estimatedCompletion?: Date;
  error?: string;
  warnings: string[];
}

export interface ReportAuditTrail {
  reportId: string;
  action: 'created' | 'generated' | 'downloaded' | 'shared' | 'deleted' | 'modified';
  timestamp: Date;
  userId: string;
  userEmail: string;
  details: Record<string, any>;
  ipAddress: string;
}

export interface ReportAnalytics {
  totalReports: number;
  reportsByType: Record<RegulatoryReportType, number>;
  reportsByFramework: Record<ComplianceFramework, number>;
  reportsByStatus: Record<ReportStatus, number>;
  averageGenerationTime: number;
  mostUsedTemplates: Array<{
    templateId: string;
    templateName: string;
    usageCount: number;
  }>;
  recentActivity: ReportAuditTrail[];
  scheduledReports: number;
  failureRate: number;
}

export interface ComplianceReportData {
  // GDPR specific data
  gdpr?: {
    lawfulBasisBreakdown: Record<string, number>;
    dataSubjectRights: {
      accessRequests: number;
      deletionRequests: number;
      portabilityRequests: number;
      rectificationRequests: number;
    };
    breachNotifications: number;
    dpiaCount: number;
    consentWithdrawals: number;
  };
  
  // CCPA specific data
  ccpa?: {
    consumerRequests: {
      knowRequests: number;
      deleteRequests: number;
      optOutRequests: number;
    };
    personalInfoCategories: string[];
    businessPurposes: string[];
    thirdPartyDisclosures: number;
  };
  
  // HIPAA specific data
  hipaa?: {
    coveredEntities: number;
    businessAssociates: number;
    riskAssessments: number;
    securityIncidents: number;
    breachReports: number;
  };
  
  // PDPL specific data
  pdpl?: {
    consentRecords: number;
    crossBorderTransfers: number;
    dataRetentionPolicies: number;
    privacyImpactAssessments: number;
  };
}