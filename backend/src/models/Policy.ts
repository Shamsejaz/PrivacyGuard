export interface PolicyDocument {
  _id?: string;
  title: string;
  type: 'privacy_policy' | 'cookie_policy' | 'terms_of_service' | 'data_processing_agreement' | 'consent_form' | 'other';
  content: string;
  version: string;
  status: 'draft' | 'review' | 'approved' | 'active' | 'archived' | 'rejected';
  language: string;
  jurisdiction: string;
  effective_date?: Date;
  expiry_date?: Date;
  created_by: string;
  approved_by?: string;
  approval_date?: Date;
  tags: string[];
  metadata: PolicyMetadata;
  version_history: PolicyVersionHistory[];
  created_at: Date;
  updated_at: Date;
}

export interface PolicyMetadata {
  word_count: number;
  last_review_date?: Date;
  next_review_date?: Date;
  compliance_frameworks: string[];
  category?: string;
  priority?: 'low' | 'medium' | 'high' | 'critical';
  review_frequency?: 'monthly' | 'quarterly' | 'semi-annual' | 'annual';
  stakeholders?: string[];
  related_policies?: string[];
}

export interface PolicyVersionHistory {
  version: string;
  changes: string;
  changed_by: string;
  changed_at: Date;
  approval_status?: 'pending' | 'approved' | 'rejected';
  approved_by?: string;
  approval_date?: Date;
}

export interface PolicyTemplate {
  _id?: string;
  name: string;
  description: string;
  category: string;
  regulation: 'GDPR' | 'CCPA' | 'HIPAA' | 'PDPL' | 'SOX' | 'PCI-DSS' | 'Other';
  language: string;
  jurisdiction: string;
  content: string;
  variables: PolicyVariable[];
  is_active: boolean;
  created_by: string;
  created_at: Date;
  updated_at: Date;
}

export interface PolicyVariable {
  name: string;
  type: 'text' | 'date' | 'number' | 'boolean' | 'select';
  label: string;
  description?: string;
  required: boolean;
  default_value?: any;
  options?: string[]; // For select type
  validation?: {
    min_length?: number;
    max_length?: number;
    pattern?: string;
  };
}

export interface PolicyAnalytics {
  _id?: string;
  policy_id: string;
  metric_type: 'views' | 'downloads' | 'compliance_score' | 'effectiveness' | 'gap_analysis';
  period: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'annual';
  date_range: {
    start: Date;
    end: Date;
  };
  data: {
    total_count?: number;
    score?: number;
    breakdown?: Record<string, any>;
    trends?: Array<{
      date: Date;
      value: number;
    }>;
    gaps?: PolicyGap[];
    recommendations?: string[];
  };
  generated_by: string;
  generated_at: Date;
}

export interface PolicyGap {
  requirement: string;
  current_coverage: number; // 0-100 percentage
  target_coverage: number; // 0-100 percentage
  gap_severity: 'low' | 'medium' | 'high' | 'critical';
  remediation_steps: string[];
  due_date?: Date;
  assigned_to?: string;
}

export interface PolicyReview {
  _id?: string;
  policy_id: string;
  reviewer_id: string;
  review_type: 'scheduled' | 'ad_hoc' | 'compliance' | 'legal';
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  scheduled_date: Date;
  completed_date?: Date;
  findings: PolicyReviewFinding[];
  recommendations: string[];
  approval_status?: 'approved' | 'rejected' | 'requires_changes';
  created_at: Date;
  updated_at: Date;
}

export interface PolicyReviewFinding {
  section: string;
  issue: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  recommendation: string;
  status: 'open' | 'addressed' | 'accepted_risk';
}

export interface PolicyRelationship {
  _id?: string;
  source_policy_id: string;
  target_policy_id: string;
  relationship_type: 'references' | 'supersedes' | 'complements' | 'conflicts' | 'depends_on';
  description?: string;
  created_by: string;
  created_at: Date;
}

// Request/Response interfaces
export interface CreatePolicyRequest {
  title: string;
  type: PolicyDocument['type'];
  content: string;
  language: string;
  jurisdiction: string;
  tags?: string[];
  metadata?: Partial<PolicyMetadata>;
  effective_date?: Date;
  expiry_date?: Date;
}

export interface UpdatePolicyRequest {
  title?: string;
  content?: string;
  tags?: string[];
  metadata?: Partial<PolicyMetadata>;
  effective_date?: Date;
  expiry_date?: Date;
}

export interface PolicySearchFilters {
  type?: PolicyDocument['type'];
  status?: PolicyDocument['status'];
  language?: string;
  jurisdiction?: string;
  tags?: string[];
  compliance_frameworks?: string[];
  created_by?: string;
  date_range?: {
    start: Date;
    end: Date;
  };
  search_text?: string;
  page?: number;
  limit?: number;
  sort_by?: 'created_at' | 'updated_at' | 'title' | 'effective_date';
  sort_order?: 'asc' | 'desc';
}

export interface PolicyApprovalRequest {
  policy_id: string;
  action: 'approve' | 'reject' | 'request_changes';
  comments?: string;
  changes_required?: string[];
}

export interface PolicyVersionRequest {
  changes: string;
  major_version?: boolean; // If true, increment major version (1.0 -> 2.0), else minor (1.0 -> 1.1)
}

export interface CreateTemplateRequest {
  name: string;
  description: string;
  category: string;
  regulation: PolicyTemplate['regulation'];
  language: string;
  jurisdiction: string;
  content: string;
  variables: PolicyVariable[];
}

export interface GeneratePolicyFromTemplateRequest {
  template_id: string;
  title: string;
  variable_values: Record<string, any>;
  language?: string;
  jurisdiction?: string;
  tags?: string[];
}

export interface PolicyComplianceReport {
  policy_id: string;
  policy_title: string;
  compliance_score: number; // 0-100
  framework_scores: Record<string, number>;
  gaps: PolicyGap[];
  recommendations: string[];
  last_review_date?: Date;
  next_review_date?: Date;
  status: 'compliant' | 'minor_gaps' | 'major_gaps' | 'non_compliant';
}

export interface PolicyEffectivenessMetrics {
  policy_id: string;
  views: number;
  downloads: number;
  user_feedback_score?: number; // 1-5 rating
  compliance_incidents: number;
  training_completion_rate?: number; // 0-100 percentage
  last_updated: Date;
  effectiveness_score: number; // 0-100 calculated score
}

// Default policy types and their configurations
export const POLICY_TYPES = {
  privacy_policy: {
    label: 'Privacy Policy',
    required_sections: ['data_collection', 'data_use', 'data_sharing', 'user_rights', 'contact_info'],
    compliance_frameworks: ['GDPR', 'CCPA', 'PIPEDA']
  },
  cookie_policy: {
    label: 'Cookie Policy',
    required_sections: ['cookie_types', 'purpose', 'consent', 'opt_out'],
    compliance_frameworks: ['GDPR', 'ePrivacy']
  },
  terms_of_service: {
    label: 'Terms of Service',
    required_sections: ['service_description', 'user_obligations', 'liability', 'termination'],
    compliance_frameworks: ['Consumer Protection']
  },
  data_processing_agreement: {
    label: 'Data Processing Agreement',
    required_sections: ['processing_purposes', 'data_categories', 'security_measures', 'data_transfers'],
    compliance_frameworks: ['GDPR', 'CCPA']
  },
  consent_form: {
    label: 'Consent Form',
    required_sections: ['purpose', 'data_types', 'retention', 'withdrawal'],
    compliance_frameworks: ['GDPR', 'CCPA', 'PIPEDA']
  }
};

export const COMPLIANCE_FRAMEWORKS = [
  'GDPR',
  'CCPA',
  'HIPAA',
  'PDPL',
  'PIPEDA',
  'SOX',
  'PCI-DSS',
  'ISO 27001',
  'NIST',
  'ePrivacy'
];

export const JURISDICTIONS = [
  'EU',
  'US',
  'CA',
  'UK',
  'AU',
  'SG',
  'UAE',
  'Global'
];

export const LANGUAGES = [
  'en',
  'es',
  'fr',
  'de',
  'it',
  'pt',
  'ar',
  'zh',
  'ja',
  'ko'
];