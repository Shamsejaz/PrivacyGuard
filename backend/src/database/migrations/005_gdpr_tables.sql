-- GDPR Compliance Tables Migration

-- Lawful basis records table
CREATE TABLE IF NOT EXISTS lawful_basis_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    processing_activity VARCHAR(255) NOT NULL,
    lawful_basis VARCHAR(100) NOT NULL,
    data_categories JSONB DEFAULT '[]',
    purposes JSONB DEFAULT '[]',
    data_subjects JSONB DEFAULT '[]',
    retention_period VARCHAR(100),
    status VARCHAR(50) DEFAULT 'active',
    review_date DATE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Processing records table (Article 30)
CREATE TABLE IF NOT EXISTS processing_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    activity_name VARCHAR(255) NOT NULL,
    controller VARCHAR(255) NOT NULL,
    processor VARCHAR(255),
    purposes JSONB DEFAULT '[]',
    lawful_basis VARCHAR(100) NOT NULL,
    data_categories JSONB DEFAULT '[]',
    data_subjects JSONB DEFAULT '[]',
    recipients JSONB DEFAULT '[]',
    third_country_transfers BOOLEAN DEFAULT FALSE,
    retention_period VARCHAR(100),
    technical_measures JSONB DEFAULT '[]',
    organisational_measures JSONB DEFAULT '[]',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Data Protection Impact Assessments table
CREATE TABLE IF NOT EXISTS dpias (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    processing_type VARCHAR(100) NOT NULL,
    risk_level VARCHAR(20) NOT NULL DEFAULT 'medium',
    status VARCHAR(50) NOT NULL DEFAULT 'draft',
    created_date DATE DEFAULT CURRENT_DATE,
    completed_date DATE,
    reviewer VARCHAR(255),
    data_categories JSONB DEFAULT '[]',
    mitigation_measures JSONB DEFAULT '[]',
    residual_risk VARCHAR(20) DEFAULT 'medium',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Data breaches table
CREATE TABLE IF NOT EXISTS data_breaches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    discovery_date DATE NOT NULL,
    reported_date DATE,
    severity VARCHAR(20) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'discovered',
    affected_data_subjects INTEGER NOT NULL,
    data_categories JSONB DEFAULT '[]',
    likely_consequences TEXT,
    mitigation_measures JSONB DEFAULT '[]',
    supervisory_authority_notified BOOLEAN DEFAULT FALSE,
    data_subjects_notified BOOLEAN DEFAULT FALSE,
    notification_deadline DATE,
    assigned_to VARCHAR(255),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Data portability requests table
CREATE TABLE IF NOT EXISTS data_portability_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    request_id VARCHAR(50) UNIQUE NOT NULL,
    data_subject_name VARCHAR(255) NOT NULL,
    data_subject_email VARCHAR(255) NOT NULL,
    data_subject_user_id VARCHAR(255) NOT NULL,
    request_date DATE DEFAULT CURRENT_DATE,
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    data_categories JSONB DEFAULT '[]',
    format VARCHAR(20) NOT NULL,
    delivery_method VARCHAR(50) NOT NULL,
    completion_date DATE,
    expiry_date DATE NOT NULL,
    file_size VARCHAR(50),
    download_count INTEGER DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Compliance items table (for compliance matrix)
CREATE TABLE IF NOT EXISTS compliance_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    article VARCHAR(50) NOT NULL,
    requirement VARCHAR(255) NOT NULL,
    description TEXT,
    status VARCHAR(50) NOT NULL DEFAULT 'not_applicable',
    evidence JSONB DEFAULT '[]',
    responsible VARCHAR(255),
    last_reviewed DATE,
    next_review DATE,
    priority VARCHAR(20) DEFAULT 'medium',
    category VARCHAR(50) NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_lawful_basis_records_status ON lawful_basis_records(status);
CREATE INDEX IF NOT EXISTS idx_lawful_basis_records_processing_activity ON lawful_basis_records(processing_activity);

CREATE INDEX IF NOT EXISTS idx_processing_records_controller ON processing_records(controller);
CREATE INDEX IF NOT EXISTS idx_processing_records_lawful_basis ON processing_records(lawful_basis);

CREATE INDEX IF NOT EXISTS idx_dpias_status ON dpias(status);
CREATE INDEX IF NOT EXISTS idx_dpias_risk_level ON dpias(risk_level);

CREATE INDEX IF NOT EXISTS idx_data_breaches_status ON data_breaches(status);
CREATE INDEX IF NOT EXISTS idx_data_breaches_severity ON data_breaches(severity);
CREATE INDEX IF NOT EXISTS idx_data_breaches_discovery_date ON data_breaches(discovery_date);

CREATE INDEX IF NOT EXISTS idx_data_portability_requests_status ON data_portability_requests(status);
CREATE INDEX IF NOT EXISTS idx_data_portability_requests_email ON data_portability_requests(data_subject_email);

CREATE INDEX IF NOT EXISTS idx_compliance_items_status ON compliance_items(status);
CREATE INDEX IF NOT EXISTS idx_compliance_items_category ON compliance_items(category);

-- Add constraints
ALTER TABLE lawful_basis_records 
ADD CONSTRAINT chk_lawful_basis_status 
CHECK (status IN ('active', 'inactive', 'review'));

ALTER TABLE dpias 
ADD CONSTRAINT chk_dpia_status 
CHECK (status IN ('draft', 'in_review', 'approved', 'requires_consultation'));

ALTER TABLE dpias 
ADD CONSTRAINT chk_dpia_risk_level 
CHECK (risk_level IN ('low', 'medium', 'high'));

ALTER TABLE data_breaches 
ADD CONSTRAINT chk_breach_severity 
CHECK (severity IN ('low', 'medium', 'high'));

ALTER TABLE data_breaches 
ADD CONSTRAINT chk_breach_status 
CHECK (status IN ('discovered', 'assessed', 'reported', 'resolved'));

ALTER TABLE data_portability_requests 
ADD CONSTRAINT chk_portability_status 
CHECK (status IN ('pending', 'processing', 'ready', 'delivered', 'expired'));

ALTER TABLE data_portability_requests 
ADD CONSTRAINT chk_portability_format 
CHECK (format IN ('json', 'csv', 'xml', 'pdf'));

ALTER TABLE compliance_items 
ADD CONSTRAINT chk_compliance_status 
CHECK (status IN ('compliant', 'partial', 'non_compliant', 'not_applicable'));

ALTER TABLE compliance_items 
ADD CONSTRAINT chk_compliance_priority 
CHECK (priority IN ('high', 'medium', 'low'));

ALTER TABLE compliance_items 
ADD CONSTRAINT chk_compliance_category 
CHECK (category IN ('principles', 'rights', 'obligations', 'governance', 'security'));