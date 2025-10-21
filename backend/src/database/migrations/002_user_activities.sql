-- Migration: 002_user_activities
-- Description: Add user activities table for audit trail
-- Created: 2024-01-02

-- Create user activities table for detailed activity logging
CREATE TABLE user_activities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    action VARCHAR(100) NOT NULL,
    resource_type VARCHAR(100),
    resource_id VARCHAR(255),
    ip_address INET,
    user_agent TEXT,
    details JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for user activities
CREATE INDEX idx_user_activities_user_id ON user_activities(user_id);
CREATE INDEX idx_user_activities_action ON user_activities(action);
CREATE INDEX idx_user_activities_resource_type ON user_activities(resource_type);
CREATE INDEX idx_user_activities_created_at ON user_activities(created_at);

-- Create composite index for common queries
CREATE INDEX idx_user_activities_user_action_date ON user_activities(user_id, action, created_at DESC);