-- PostgreSQL initialization script for PrivacyGuard local development

-- Create extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create users table
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    role VARCHAR(50) DEFAULT 'user',
    is_active BOOLEAN DEFAULT true,
    email_verified BOOLEAN DEFAULT false,
    last_login TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create compliance_findings table
CREATE TABLE IF NOT EXISTS compliance_findings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    resource_arn VARCHAR(500) NOT NULL,
    finding_type VARCHAR(100) NOT NULL,
    severity VARCHAR(20) NOT NULL CHECK (severity IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    status VARCHAR(50) DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'IN_PROGRESS', 'RESOLVED', 'DISMISSED')),
    risk_score INTEGER CHECK (risk_score >= 0 AND risk_score <= 100),
    region VARCHAR(50),
    service VARCHAR(100),
    resource_tags JSONB,
    raw_data JSONB,
    detected_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    resolved_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create compliance_assessments table
CREATE TABLE IF NOT EXISTS compliance_assessments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    finding_id UUID REFERENCES compliance_findings(id) ON DELETE CASCADE,
    regulation VARCHAR(50) NOT NULL,
    article VARCHAR(100),
    description TEXT,
    applicability_score DECIMAL(3,2) CHECK (applicability_score >= 0 AND applicability_score <= 1),
    risk_score INTEGER CHECK (risk_score >= 0 AND risk_score <= 100),
    confidence_score DECIMAL(3,2) CHECK (confidence_score >= 0 AND confidence_score <= 1),
    reasoning TEXT,
    recommendations JSONB,
    assessed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create dsar_requests table
CREATE TABLE IF NOT EXISTS dsar_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    request_id VARCHAR(50) UNIQUE NOT NULL,
    requester_email VARCHAR(255) NOT NULL,
    requester_name VARCHAR(255),
    request_type VARCHAR(50) NOT NULL CHECK (request_type IN ('ACCESS', 'RECTIFICATION', 'ERASURE', 'PORTABILITY', 'RESTRICTION', 'OBJECTION')),
    status VARCHAR(50) DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'REJECTED', 'EXPIRED')),
    description TEXT,
    identity_verified BOOLEAN DEFAULT false,
    verification_method VARCHAR(100),
    priority VARCHAR(20) DEFAULT 'NORMAL' CHECK (priority IN ('LOW', 'NORMAL', 'HIGH', 'URGENT')),
    due_date TIMESTAMP,
    completed_at TIMESTAMP,
    response_data JSONB,
    internal_notes TEXT,
    assigned_to UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create risk_assessments table
CREATE TABLE IF NOT EXISTS risk_assessments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    assessment_name VARCHAR(255) NOT NULL,
    assessment_type VARCHAR(50) NOT NULL CHECK (assessment_type IN ('DPIA', 'ROPA', 'AUDIT', 'GENERAL')),
    scope TEXT,
    overall_risk VARCHAR(20) CHECK (overall_risk IN ('LOW', 'MEDIUM', 'HIGH', 'VERY_HIGH')),
    risk_score INTEGER CHECK (risk_score >= 0 AND risk_score <= 100),
    status VARCHAR(50) DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'IN_REVIEW', 'APPROVED', 'REJECTED')),
    data_categories JSONB,
    processing_activities JSONB,
    risk_factors JSONB,
    mitigation_measures JSONB,
    residual_risk VARCHAR(20) CHECK (residual_risk IN ('LOW', 'MEDIUM', 'HIGH', 'VERY_HIGH')),
    assessor_id UUID REFERENCES users(id),
    reviewer_id UUID REFERENCES users(id),
    approved_by UUID REFERENCES users(id),
    approved_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create policies table
CREATE TABLE IF NOT EXISTS policies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    policy_name VARCHAR(255) NOT NULL,
    policy_type VARCHAR(100) NOT NULL,
    version VARCHAR(20) DEFAULT '1.0',
    status VARCHAR(50) DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'ACTIVE', 'ARCHIVED', 'DEPRECATED')),
    content TEXT,
    metadata JSONB,
    effective_date DATE,
    expiry_date DATE,
    created_by UUID REFERENCES users(id),
    approved_by UUID REFERENCES users(id),
    approved_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create audit_logs table
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id),
    action VARCHAR(100) NOT NULL,
    resource_type VARCHAR(100),
    resource_id VARCHAR(255),
    details JSONB,
    ip_address INET,
    user_agent TEXT,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_compliance_findings_severity ON compliance_findings(severity);
CREATE INDEX IF NOT EXISTS idx_compliance_findings_status ON compliance_findings(status);
CREATE INDEX IF NOT EXISTS idx_compliance_findings_detected_at ON compliance_findings(detected_at);
CREATE INDEX IF NOT EXISTS idx_compliance_findings_resource_arn ON compliance_findings(resource_arn);

CREATE INDEX IF NOT EXISTS idx_dsar_requests_status ON dsar_requests(status);
CREATE INDEX IF NOT EXISTS idx_dsar_requests_requester_email ON dsar_requests(requester_email);
CREATE INDEX IF NOT EXISTS idx_dsar_requests_created_at ON dsar_requests(created_at);

CREATE INDEX IF NOT EXISTS idx_risk_assessments_status ON risk_assessments(status);
CREATE INDEX IF NOT EXISTS idx_risk_assessments_type ON risk_assessments(assessment_type);

CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs(timestamp);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);

-- Create triggers for updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_compliance_findings_updated_at BEFORE UPDATE ON compliance_findings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_dsar_requests_updated_at BEFORE UPDATE ON dsar_requests FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_risk_assessments_updated_at BEFORE UPDATE ON risk_assessments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_policies_updated_at BEFORE UPDATE ON policies FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert default admin user (password: admin123)
INSERT INTO users (email, password_hash, first_name, last_name, role, is_active, email_verified)
VALUES (
    'admin@privacyguard.local',
    '$2b$10$rQZ8kHWKQYXHOGGVQExOHOKmKvKzpQXQXQXQXQXQXQXQXQXQXQXQXQ', -- admin123
    'Admin',
    'User',
    'admin',
    true,
    true
) ON CONFLICT (email) DO NOTHING;

-- Insert sample compliance findings for testing
INSERT INTO compliance_findings (resource_arn, finding_type, severity, title, description, risk_score, region, service)
VALUES 
    ('arn:aws:s3:::test-bucket-unencrypted', 'ENCRYPTION', 'HIGH', 'S3 Bucket Not Encrypted', 'S3 bucket lacks server-side encryption', 85, 'us-east-1', 's3'),
    ('arn:aws:iam::123456789012:role/overprivileged-role', 'ACCESS_CONTROL', 'MEDIUM', 'Overprivileged IAM Role', 'IAM role has excessive permissions', 65, 'us-east-1', 'iam'),
    ('arn:aws:rds:us-east-1:123456789012:db:test-db', 'LOGGING', 'LOW', 'RDS Logging Disabled', 'RDS instance has logging disabled', 35, 'us-east-1', 'rds')
ON CONFLICT DO NOTHING;

-- Insert sample DSAR requests for testing
INSERT INTO dsar_requests (request_id, requester_email, requester_name, request_type, description, due_date)
VALUES 
    ('DSAR-2024-001', 'john.doe@example.com', 'John Doe', 'ACCESS', 'Request for all personal data held by the organization', CURRENT_TIMESTAMP + INTERVAL '30 days'),
    ('DSAR-2024-002', 'jane.smith@example.com', 'Jane Smith', 'ERASURE', 'Request to delete all personal data', CURRENT_TIMESTAMP + INTERVAL '30 days')
ON CONFLICT (request_id) DO NOTHING;

COMMIT;