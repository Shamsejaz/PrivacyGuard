-- External System Configurations
CREATE TABLE IF NOT EXISTS external_system_configs (
    id VARCHAR(255) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL CHECK (type IN ('database', 'api', 'file_system', 'cloud_storage')),
    category VARCHAR(50) NOT NULL CHECK (category IN ('source', 'target', 'both')),
    config JSONB NOT NULL DEFAULT '{}',
    credentials JSONB NOT NULL DEFAULT '{}',
    metadata JSONB NOT NULL DEFAULT '{}',
    status VARCHAR(50) NOT NULL DEFAULT 'inactive' CHECK (status IN ('active', 'inactive', 'error')),
    validation JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_external_system_configs_type ON external_system_configs(type);
CREATE INDEX IF NOT EXISTS idx_external_system_configs_category ON external_system_configs(category);
CREATE INDEX IF NOT EXISTS idx_external_system_configs_status ON external_system_configs(status);
CREATE INDEX IF NOT EXISTS idx_external_system_configs_created_at ON external_system_configs(created_at);

-- Data Synchronization Jobs
CREATE TABLE IF NOT EXISTS data_sync_jobs (
    id VARCHAR(255) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    source_connection_id VARCHAR(255) NOT NULL,
    target_connection_id VARCHAR(255) NOT NULL,
    sync_type VARCHAR(50) NOT NULL CHECK (sync_type IN ('full', 'incremental', 'real-time')),
    schedule VARCHAR(255), -- cron expression
    conflict_resolution VARCHAR(50) NOT NULL DEFAULT 'source-wins' CHECK (conflict_resolution IN ('source-wins', 'target-wins', 'manual', 'timestamp')),
    transformations JSONB DEFAULT '[]',
    filters JSONB DEFAULT '[]',
    status VARCHAR(50) NOT NULL DEFAULT 'inactive' CHECK (status IN ('active', 'inactive', 'running', 'paused', 'error')),
    last_run_at TIMESTAMP,
    next_run_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    FOREIGN KEY (source_connection_id) REFERENCES external_system_configs(id) ON DELETE CASCADE,
    FOREIGN KEY (target_connection_id) REFERENCES external_system_configs(id) ON DELETE CASCADE
);

-- Create indexes for sync jobs
CREATE INDEX IF NOT EXISTS idx_data_sync_jobs_source_connection ON data_sync_jobs(source_connection_id);
CREATE INDEX IF NOT EXISTS idx_data_sync_jobs_target_connection ON data_sync_jobs(target_connection_id);
CREATE INDEX IF NOT EXISTS idx_data_sync_jobs_status ON data_sync_jobs(status);
CREATE INDEX IF NOT EXISTS idx_data_sync_jobs_next_run ON data_sync_jobs(next_run_at);

-- Sync Job Execution History
CREATE TABLE IF NOT EXISTS sync_job_executions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id VARCHAR(255) NOT NULL,
    status VARCHAR(50) NOT NULL CHECK (status IN ('success', 'partial', 'failed')),
    records_processed INTEGER DEFAULT 0,
    records_succeeded INTEGER DEFAULT 0,
    records_failed INTEGER DEFAULT 0,
    conflicts JSONB DEFAULT '[]',
    errors JSONB DEFAULT '[]',
    started_at TIMESTAMP NOT NULL,
    completed_at TIMESTAMP,
    duration_ms INTEGER,
    created_at TIMESTAMP DEFAULT NOW(),
    FOREIGN KEY (job_id) REFERENCES data_sync_jobs(id) ON DELETE CASCADE
);

-- Create indexes for execution history
CREATE INDEX IF NOT EXISTS idx_sync_job_executions_job_id ON sync_job_executions(job_id);
CREATE INDEX IF NOT EXISTS idx_sync_job_executions_status ON sync_job_executions(status);
CREATE INDEX IF NOT EXISTS idx_sync_job_executions_started_at ON sync_job_executions(started_at);

-- Import/Export Jobs
CREATE TABLE IF NOT EXISTS import_export_jobs (
    id VARCHAR(255) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL CHECK (type IN ('import', 'export')),
    source_type VARCHAR(50) NOT NULL CHECK (source_type IN ('file', 'database', 'api')),
    target_type VARCHAR(50) NOT NULL CHECK (target_type IN ('file', 'database', 'api')),
    source_config JSONB NOT NULL DEFAULT '{}',
    target_config JSONB NOT NULL DEFAULT '{}',
    mapping JSONB DEFAULT '[]',
    validation JSONB DEFAULT '[]',
    filters JSONB DEFAULT '[]',
    status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed', 'cancelled')),
    progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
    records_processed INTEGER DEFAULT 0,
    records_succeeded INTEGER DEFAULT 0,
    records_failed INTEGER DEFAULT 0,
    errors JSONB DEFAULT '[]',
    file_path VARCHAR(500),
    created_at TIMESTAMP DEFAULT NOW(),
    started_at TIMESTAMP,
    completed_at TIMESTAMP
);

-- Create indexes for import/export jobs
CREATE INDEX IF NOT EXISTS idx_import_export_jobs_type ON import_export_jobs(type);
CREATE INDEX IF NOT EXISTS idx_import_export_jobs_status ON import_export_jobs(status);
CREATE INDEX IF NOT EXISTS idx_import_export_jobs_created_at ON import_export_jobs(created_at);

-- External API Connections
CREATE TABLE IF NOT EXISTS external_api_connections (
    id VARCHAR(255) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    base_url VARCHAR(500) NOT NULL,
    authentication JSONB DEFAULT '{}',
    headers JSONB DEFAULT '{}',
    timeout INTEGER DEFAULT 30000,
    retry_config JSONB DEFAULT '{}',
    circuit_breaker_config JSONB DEFAULT '{}',
    status VARCHAR(50) NOT NULL DEFAULT 'inactive' CHECK (status IN ('active', 'inactive', 'error')),
    last_used TIMESTAMP,
    last_error TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for API connections
CREATE INDEX IF NOT EXISTS idx_external_api_connections_status ON external_api_connections(status);
CREATE INDEX IF NOT EXISTS idx_external_api_connections_last_used ON external_api_connections(last_used);

-- API Request History
CREATE TABLE IF NOT EXISTS api_request_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    connection_id VARCHAR(255) NOT NULL,
    request_id VARCHAR(255) NOT NULL,
    method VARCHAR(10) NOT NULL,
    endpoint VARCHAR(500) NOT NULL,
    success BOOLEAN NOT NULL,
    status_code INTEGER,
    response_time INTEGER NOT NULL,
    retry_count INTEGER DEFAULT 0,
    error_message TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    FOREIGN KEY (connection_id) REFERENCES external_api_connections(id) ON DELETE CASCADE
);

-- Create indexes for request history
CREATE INDEX IF NOT EXISTS idx_api_request_history_connection_id ON api_request_history(connection_id);
CREATE INDEX IF NOT EXISTS idx_api_request_history_success ON api_request_history(success);
CREATE INDEX IF NOT EXISTS idx_api_request_history_created_at ON api_request_history(created_at);

-- Data Quality Reports
CREATE TABLE IF NOT EXISTS data_quality_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_connection_id VARCHAR(255),
    source_table VARCHAR(255),
    total_records INTEGER NOT NULL,
    valid_records INTEGER NOT NULL,
    invalid_records INTEGER NOT NULL,
    duplicate_records INTEGER NOT NULL,
    missing_fields JSONB DEFAULT '{}',
    data_types JSONB DEFAULT '{}',
    value_distribution JSONB DEFAULT '{}',
    quality_score DECIMAL(5,2) NOT NULL,
    recommendations JSONB DEFAULT '[]',
    generated_at TIMESTAMP DEFAULT NOW(),
    FOREIGN KEY (source_connection_id) REFERENCES external_system_configs(id) ON DELETE SET NULL
);

-- Create indexes for quality reports
CREATE INDEX IF NOT EXISTS idx_data_quality_reports_source_connection ON data_quality_reports(source_connection_id);
CREATE INDEX IF NOT EXISTS idx_data_quality_reports_quality_score ON data_quality_reports(quality_score);
CREATE INDEX IF NOT EXISTS idx_data_quality_reports_generated_at ON data_quality_reports(generated_at);

-- Update trigger for external_system_configs
CREATE OR REPLACE FUNCTION update_external_system_configs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_external_system_configs_updated_at
    BEFORE UPDATE ON external_system_configs
    FOR EACH ROW
    EXECUTE FUNCTION update_external_system_configs_updated_at();

-- Update trigger for data_sync_jobs
CREATE OR REPLACE FUNCTION update_data_sync_jobs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_data_sync_jobs_updated_at
    BEFORE UPDATE ON data_sync_jobs
    FOR EACH ROW
    EXECUTE FUNCTION update_data_sync_jobs_updated_at();

-- Update trigger for external_api_connections
CREATE OR REPLACE FUNCTION update_external_api_connections_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_external_api_connections_updated_at
    BEFORE UPDATE ON external_api_connections
    FOR EACH ROW
    EXECUTE FUNCTION update_external_api_connections_updated_at();