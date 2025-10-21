-- Migration: 001_initial_schema
-- Description: Create initial database schema for PrivacyGuard
-- Created: 2024-01-01

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create users table for authentication and authorization
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL CHECK (role IN ('admin', 'dpo', 'compliance', 'legal', 'business')),
    department VARCHAR(255),
    permissions JSONB DEFAULT '[]'::jsonb,
    last_login TIMESTAMP,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Create index on email for faster lookups
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);

-- Create user sessions table for JWT token management
CREATE TABLE user_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    token_hash VARCHAR(255) NOT NULL,
    refresh_token_hash VARCHAR(255),
    expires_at TIMESTAMP NOT NULL,
    refresh_expires_at TIMESTAMP,
    ip_address INET,
    user_agent TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for session management
CREATE INDEX idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX idx_user_sessions_token_hash ON user_sessions(token_hash);
CREATE INDEX idx_user_sessions_expires_at ON user_sessions(expires_at);

-- Create DSAR requests table
CREATE TABLE dsar_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    request_id VARCHAR(50) UNIQUE NOT NULL,
    subject_name VARCHAR(255) NOT NULL,
    subject_email VARCHAR(255) NOT NULL,
    subject_phone VARCHAR(50),
    request_type VARCHAR(50) NOT NULL CHECK (request_type IN ('access', 'rectification', 'erasure', 'portability', 'restriction', 'objection')),
    status VARCHAR(50) NOT NULL DEFAULT 'submitted' CHECK (status IN ('submitted', 'in_review', 'in_progress', 'completed', 'rejected', 'cancelled')),
    priority VARCHAR(20) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    description TEXT,
    legal_basis TEXT,
    data_categories JSONB DEFAULT '[]'::jsonb,
    processing_purposes JSONB DEFAULT '[]'::jsonb,
    assigned_to UUID REFERENCES users(id),
    due_date TIMESTAMP,
    completed_at TIMESTAMP,
    rejection_reason TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for DSAR requests
CREATE INDEX idx_dsar_requests_request_id ON dsar_requests(request_id);
CREATE INDEX idx_dsar_requests_subject_email ON dsar_requests(subject_email);
CREATE INDEX idx_dsar_requests_status ON dsar_requests(status);
CREATE INDEX idx_dsar_requests_assigned_to ON dsar_requests(assigned_to);
CREATE INDEX idx_dsar_requests_due_date ON dsar_requests(due_date);

-- Create DSAR status history table for audit trail
CREATE TABLE dsar_status_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    dsar_id UUID REFERENCES dsar_requests(id) ON DELETE CASCADE,
    status VARCHAR(50) NOT NULL,
    comment TEXT,
    changed_by UUID REFERENCES users(id),
    changed_at TIMESTAMP DEFAULT NOW()
);

-- Create index for status history
CREATE INDEX idx_dsar_status_history_dsar_id ON dsar_status_history(dsar_id);
CREATE INDEX idx_dsar_status_history_changed_at ON dsar_status_history(changed_at);

-- Create risk assessments table
CREATE TABLE risk_assessments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    risk_level VARCHAR(20) NOT NULL CHECK (risk_level IN ('low', 'medium', 'high', 'critical')),
    impact_score INTEGER CHECK (impact_score BETWEEN 1 AND 5),
    likelihood_score INTEGER CHECK (likelihood_score BETWEEN 1 AND 5),
    overall_score DECIMAL(3,2),
    status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'mitigated', 'accepted', 'transferred')),
    category VARCHAR(100),
    data_types JSONB DEFAULT '[]'::jsonb,
    mitigation_measures JSONB DEFAULT '[]'::jsonb,
    owner_id UUID REFERENCES users(id),
    review_date DATE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for risk assessments
CREATE INDEX idx_risk_assessments_risk_level ON risk_assessments(risk_level);
CREATE INDEX idx_risk_assessments_status ON risk_assessments(status);
CREATE INDEX idx_risk_assessments_owner_id ON risk_assessments(owner_id);
CREATE INDEX idx_risk_assessments_review_date ON risk_assessments(review_date);

-- Create compliance findings table
CREATE TABLE compliance_findings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    regulation VARCHAR(50) NOT NULL CHECK (regulation IN ('GDPR', 'CCPA', 'HIPAA', 'PDPL', 'Other')),
    severity VARCHAR(20) NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    status VARCHAR(50) DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved', 'accepted')),
    category VARCHAR(100),
    affected_systems JSONB DEFAULT '[]'::jsonb,
    remediation_steps JSONB DEFAULT '[]'::jsonb,
    assigned_to UUID REFERENCES users(id),
    due_date DATE,
    resolved_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for compliance findings
CREATE INDEX idx_compliance_findings_regulation ON compliance_findings(regulation);
CREATE INDEX idx_compliance_findings_severity ON compliance_findings(severity);
CREATE INDEX idx_compliance_findings_status ON compliance_findings(status);
CREATE INDEX idx_compliance_findings_assigned_to ON compliance_findings(assigned_to);

-- Create lawful basis records table for GDPR compliance
CREATE TABLE lawful_basis_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    processing_activity VARCHAR(255) NOT NULL,
    lawful_basis VARCHAR(100) NOT NULL CHECK (lawful_basis IN ('consent', 'contract', 'legal_obligation', 'vital_interests', 'public_task', 'legitimate_interests')),
    data_categories JSONB DEFAULT '[]'::jsonb,
    purposes JSONB DEFAULT '[]'::jsonb,
    data_subjects JSONB DEFAULT '[]'::jsonb,
    retention_period VARCHAR(100),
    status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'under_review')),
    review_date DATE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for lawful basis records
CREATE INDEX idx_lawful_basis_records_lawful_basis ON lawful_basis_records(lawful_basis);
CREATE INDEX idx_lawful_basis_records_status ON lawful_basis_records(status);
CREATE INDEX idx_lawful_basis_records_review_date ON lawful_basis_records(review_date);

-- Create processing records table for GDPR Article 30
CREATE TABLE processing_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    activity_name VARCHAR(255) NOT NULL,
    controller VARCHAR(255) NOT NULL,
    processor VARCHAR(255),
    purposes JSONB DEFAULT '[]'::jsonb,
    lawful_basis VARCHAR(100) NOT NULL,
    data_categories JSONB DEFAULT '[]'::jsonb,
    data_subjects JSONB DEFAULT '[]'::jsonb,
    recipients JSONB DEFAULT '[]'::jsonb,
    third_country_transfers BOOLEAN DEFAULT FALSE,
    third_country_details JSONB DEFAULT '{}'::jsonb,
    retention_period VARCHAR(100),
    technical_measures JSONB DEFAULT '[]'::jsonb,
    organisational_measures JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for processing records
CREATE INDEX idx_processing_records_controller ON processing_records(controller);
CREATE INDEX idx_processing_records_lawful_basis ON processing_records(lawful_basis);

-- Create audit log table for tracking all data operations
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id),
    action VARCHAR(100) NOT NULL,
    resource_type VARCHAR(100) NOT NULL,
    resource_id VARCHAR(255),
    old_values JSONB,
    new_values JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for audit logs
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
CREATE INDEX idx_audit_logs_resource_type ON audit_logs(resource_type);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at);

-- Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at columns
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_dsar_requests_updated_at BEFORE UPDATE ON dsar_requests FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_risk_assessments_updated_at BEFORE UPDATE ON risk_assessments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_compliance_findings_updated_at BEFORE UPDATE ON compliance_findings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_lawful_basis_records_updated_at BEFORE UPDATE ON lawful_basis_records FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_processing_records_updated_at BEFORE UPDATE ON processing_records FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();