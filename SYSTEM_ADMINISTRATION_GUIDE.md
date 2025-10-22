# PrivacyComply System Administration Guide

This comprehensive guide provides system administrators with detailed procedures for managing, maintaining, and troubleshooting the PrivacyComply platform in production environments.

## Table of Contents

1. [System Architecture Overview](#system-architecture-overview)
2. [Installation and Initial Setup](#installation-and-initial-setup)
3. [Configuration Management](#configuration-management)
4. [Database Administration](#database-administration)
5. [User Management](#user-management)
6. [Security Administration](#security-administration)
7. [Performance Monitoring](#performance-monitoring)
8. [Backup and Recovery](#backup-and-recovery)
9. [Log Management](#log-management)
10. [Maintenance Procedures](#maintenance-procedures)
11. [Troubleshooting](#troubleshooting)
12. [Scaling and Optimization](#scaling-and-optimization)

## System Architecture Overview

### Component Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Load Balancer │    │     Frontend    │    │     Backend     │
│     (NGINX)     │◄──►│   (React/Vite)  │◄──►│  (Node.js/API)  │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                                        │
                       ┌─────────────────┐             │
                       │   WebSocket     │◄────────────┤
                       │    Server       │             │
                       └─────────────────┘             │
                                                        │
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   PostgreSQL    │◄──►│      Redis      │◄──►│    MongoDB      │
│  (Structured)   │    │    (Cache)      │    │  (Documents)    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### Service Dependencies

- **Frontend**: Depends on Backend API
- **Backend**: Depends on PostgreSQL, MongoDB, Redis
- **WebSocket**: Depends on Redis for pub/sub
- **NGINX**: Depends on Frontend and Backend

### Network Architecture

- **External Network**: Internet-facing load balancer
- **Internal Network**: Service-to-service communication
- **Database Network**: Isolated database communications

## Installation and Initial Setup

### Prerequisites Verification

```bash
# System requirements check
./scripts/system-check.sh

# Required software versions
docker --version          # >= 20.10
docker-compose --version  # >= 2.0
git --version            # >= 2.30
openssl version          # >= 1.1.1
```

### Initial System Setup

#### 1. System User Creation

```bash
# Create dedicated system user
sudo useradd -m -s /bin/bash privacycomply
sudo usermod -aG docker privacycomply

# Set up directory structure
sudo mkdir -p /opt/privacycomply
sudo chown privacycomply:privacycomply /opt/privacycomply
```

#### 2. Repository Setup

```bash
# Clone repository
cd /opt/privacycomply
git clone https://github.com/your-org/privacycomply.git .

# Set proper permissions
chmod +x scripts/*.sh
```

#### 3. Environment Configuration

```bash
# Copy and configure environment
cp .env.production.example .env.production

# Generate secure secrets
./scripts/generate-secrets.sh > .env.secrets
source .env.secrets

# Update configuration
nano .env.production
```

#### 4. SSL Certificate Setup

```bash
# For production with Let's Encrypt
sudo certbot certonly --standalone -d your-domain.com

# Copy certificates
sudo cp /etc/letsencrypt/live/your-domain.com/fullchain.pem nginx/ssl/privacycomply.crt
sudo cp /etc/letsencrypt/live/your-domain.com/privkey.pem nginx/ssl/privacycomply.key
sudo chown privacycomply:privacycomply nginx/ssl/*
```

#### 5. Initial Deployment

```bash
# Run initial deployment
./scripts/deploy.sh deploy

# Verify installation
./scripts/deploy.sh status
curl -f http://localhost:3001/health
```

## Configuration Management

### Environment Variables Management

#### Critical Configuration Variables

```bash
# Database Configuration
POSTGRES_PASSWORD=<strong_password>
MONGODB_ROOT_PASSWORD=<strong_password>
REDIS_PASSWORD=<strong_password>

# Security Configuration
JWT_SECRET=<32+_character_secret>
BCRYPT_ROUNDS=12

# Application Configuration
NODE_ENV=production
LOG_LEVEL=info
CORS_ORIGIN=https://your-domain.com

# Monitoring Configuration
MONITORING_ENABLED=true
ALERT_EMAIL=admin@your-domain.com
```

#### Configuration Validation

```bash
# Validate configuration
./scripts/validate-config.sh

# Test database connections
./scripts/test-connections.sh

# Verify security settings
./scripts/security-check.sh
```

### Service Configuration

#### Backend API Configuration

```bash
# Update backend configuration
nano backend/src/config/production.ts

# Key settings to verify:
# - Database connection pools
# - Rate limiting thresholds
# - JWT token expiration
# - CORS settings
# - Logging configuration
```

#### Frontend Configuration

```bash
# Update frontend configuration
nano .env.production

# Key settings:
# VITE_API_BASE_URL=https://your-domain.com/api/v1
# VITE_WS_URL=wss://your-domain.com
```

#### NGINX Configuration

```bash
# Update NGINX configuration
nano nginx/nginx.conf

# Key settings:
# - SSL configuration
# - Proxy settings
# - Rate limiting
# - Security headers
```

## Database Administration

### PostgreSQL Administration

#### Connection Management

```bash
# Check active connections
docker-compose exec postgres psql -U privacycomply_user -d privacycomply -c "
  SELECT count(*) as active_connections, 
         max_conn, 
         max_conn-count(*) as available_connections 
  FROM pg_stat_activity, 
       (SELECT setting::int as max_conn FROM pg_settings WHERE name='max_connections') mc;"

# Kill long-running queries
docker-compose exec postgres psql -U privacycomply_user -d privacycomply -c "
  SELECT pg_terminate_backend(pid) 
  FROM pg_stat_activity 
  WHERE state = 'active' 
    AND query_start < NOW() - INTERVAL '10 minutes'
    AND pid <> pg_backend_pid();"
```

#### Performance Monitoring

```bash
# Check slow queries
docker-compose exec postgres psql -U privacycomply_user -d privacycomply -c "
  SELECT query, mean_time, calls, total_time
  FROM pg_stat_statements 
  ORDER BY mean_time DESC 
  LIMIT 10;"

# Check table sizes
docker-compose exec postgres psql -U privacycomply_user -d privacycomply -c "
  SELECT schemaname, tablename, 
         pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
  FROM pg_tables 
  WHERE schemaname = 'public' 
  ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;"
```

#### Maintenance Tasks

```bash
# Weekly maintenance
docker-compose exec postgres psql -U privacycomply_user -d privacycomply -c "
  VACUUM ANALYZE;
  REINDEX DATABASE privacycomply;"

# Update statistics
docker-compose exec postgres psql -U privacycomply_user -d privacycomply -c "
  ANALYZE;"
```

### MongoDB Administration

#### Connection and Status

```bash
# Check MongoDB status
docker-compose exec mongodb mongosh --eval "
  db.adminCommand('serverStatus').connections"

# Check database statistics
docker-compose exec mongodb mongosh --eval "
  db.stats(1024*1024)"  # Size in MB
```

#### Index Management

```bash
# List indexes
docker-compose exec mongodb mongosh --eval "
  db.policy_documents.getIndexes()"

# Create performance indexes
docker-compose exec mongodb mongosh --eval "
  db.policy_documents.createIndex({type: 1, status: 1});
  db.policy_documents.createIndex({created_at: -1});
  db.analytics.createIndex({metric_type: 1, date_range: 1});"

# Check index usage
docker-compose exec mongodb mongosh --eval "
  db.policy_documents.aggregate([{\$indexStats: {}}])"
```

#### Performance Optimization

```bash
# Check slow operations
docker-compose exec mongodb mongosh --eval "
  db.adminCommand('currentOp', {
    'active': true,
    'secs_running': {\$gte: 5}
  })"

# Compact collections (maintenance window)
docker-compose exec mongodb mongosh --eval "
  db.runCommand({compact: 'policy_documents'});
  db.runCommand({compact: 'analytics'});"
```

### Redis Administration

#### Memory Management

```bash
# Check memory usage
docker-compose exec redis redis-cli info memory

# Check key statistics
docker-compose exec redis redis-cli info keyspace

# Monitor commands
docker-compose exec redis redis-cli monitor
```

#### Cache Optimization

```bash
# Check cache hit rate
docker-compose exec redis redis-cli info stats | grep hit

# Clear specific cache patterns
docker-compose exec redis redis-cli --scan --pattern "cache:*" | xargs redis-cli del

# Set memory policies
docker-compose exec redis redis-cli config set maxmemory-policy allkeys-lru
```

## User Management

### Administrative User Operations

#### Creating Admin Users

```bash
# Create new admin user
docker-compose exec backend npm run user:create -- \
  --email admin@example.com \
  --name "Admin User" \
  --role admin \
  --password "secure_password"

# Promote existing user to admin
docker-compose exec backend npm run user:promote -- \
  --email user@example.com \
  --role admin
```

#### User Account Management

```bash
# List all users
docker-compose exec backend npm run user:list

# Disable user account
docker-compose exec backend npm run user:disable -- \
  --email user@example.com

# Reset user password
docker-compose exec backend npm run user:reset-password -- \
  --email user@example.com

# Force password reset on next login
docker-compose exec backend npm run user:force-password-reset -- \
  --email user@example.com
```

#### Bulk User Operations

```bash
# Import users from CSV
docker-compose exec backend npm run user:import -- \
  --file /app/data/users.csv

# Export user list
docker-compose exec backend npm run user:export -- \
  --output /app/data/users_export.csv

# Bulk role assignment
docker-compose exec backend npm run user:bulk-role -- \
  --department "Legal" \
  --role compliance
```

### Session Management

```bash
# View active sessions
docker-compose exec redis redis-cli keys "session:*"

# Clear all user sessions
docker-compose exec redis redis-cli flushdb

# Clear specific user sessions
docker-compose exec backend npm run session:clear -- \
  --user-id user_123
```

## Security Administration

### Access Control Management

#### Role-Based Access Control (RBAC)

```bash
# View role permissions
docker-compose exec backend npm run rbac:list-roles

# Create custom role
docker-compose exec backend npm run rbac:create-role -- \
  --name "auditor" \
  --permissions "read:dsar,read:risk,read:gdpr"

# Assign permissions to role
docker-compose exec backend npm run rbac:assign-permission -- \
  --role "compliance" \
  --permission "write:gdpr"
```

#### Security Monitoring

```bash
# Check failed login attempts
docker-compose logs backend | grep "authentication failed" | tail -20

# Monitor suspicious activities
docker-compose logs backend | grep -E "rate.limit|suspicious|security" | tail -50

# Check for brute force attempts
docker-compose logs nginx | awk '{print $1}' | sort | uniq -c | sort -nr | head -10
```

#### SSL/TLS Management

```bash
# Check certificate expiration
openssl x509 -in nginx/ssl/privacycomply.crt -noout -dates

# Renew Let's Encrypt certificates
sudo certbot renew --dry-run

# Update certificates
sudo certbot renew
sudo cp /etc/letsencrypt/live/your-domain.com/* nginx/ssl/
docker-compose restart nginx
```

### Security Hardening

#### System Security

```bash
# Update system packages
sudo apt update && sudo apt upgrade -y

# Check for security updates
sudo unattended-upgrades --dry-run

# Audit system security
sudo lynis audit system
```

#### Application Security

```bash
# Scan for vulnerabilities
docker run --rm -v /var/run/docker.sock:/var/run/docker.sock \
  aquasec/trivy image privacycomply-backend:latest

# Check dependency vulnerabilities
docker-compose exec backend npm audit

# Update dependencies
docker-compose exec backend npm update
```

## Performance Monitoring

### System Metrics

#### Resource Monitoring

```bash
# Monitor system resources
watch -n 5 'docker stats --no-stream'

# Check disk usage
df -h
du -sh /opt/privacycomply/*

# Monitor network connections
netstat -tulpn | grep -E ":80|:443|:3001|:5432|:27017|:6379"
```

#### Application Performance

```bash
# API response times
curl -w "@curl-format.txt" -o /dev/null -s http://localhost:3001/health

# Database query performance
docker-compose exec postgres psql -U privacycomply_user -d privacycomply -c "
  SELECT query, mean_time, calls 
  FROM pg_stat_statements 
  WHERE mean_time > 1000 
  ORDER BY mean_time DESC;"
```

### Performance Optimization

#### Database Optimization

```bash
# Optimize PostgreSQL configuration
# Edit postgresql.conf for production settings:
shared_buffers = 256MB
effective_cache_size = 1GB
work_mem = 4MB
maintenance_work_mem = 64MB
checkpoint_completion_target = 0.9
wal_buffers = 16MB
default_statistics_target = 100
random_page_cost = 1.1
```

#### Application Optimization

```bash
# Enable Node.js production optimizations
export NODE_ENV=production
export NODE_OPTIONS="--max-old-space-size=2048"

# Configure connection pooling
# Update .env.production:
POSTGRES_MAX_CONNECTIONS=20
MONGODB_MAX_POOL_SIZE=15
REDIS_MAX_CONNECTIONS=10
```

## Backup and Recovery

### Automated Backup System

#### Backup Configuration

```bash
# Configure backup schedule in crontab
sudo crontab -e

# Add backup jobs:
0 2 * * * /opt/privacycomply/scripts/backup.sh daily
0 2 * * 0 /opt/privacycomply/scripts/backup.sh weekly
0 2 1 * * /opt/privacycomply/scripts/backup.sh monthly
```

#### Manual Backup Operations

```bash
# Create immediate backup
./scripts/backup.sh manual

# Backup specific database
./scripts/backup.sh postgres-only
./scripts/backup.sh mongodb-only

# Backup with compression
BACKUP_COMPRESS=true ./scripts/backup.sh
```

### Recovery Procedures

#### Full System Recovery

```bash
# Stop services
docker-compose down

# Restore from backup
./scripts/restore.sh --backup-id backup_20240101_020000

# Verify restoration
./scripts/deploy.sh status
curl -f http://localhost:3001/health
```

#### Selective Recovery

```bash
# Restore only PostgreSQL
./scripts/restore.sh --database postgres --backup-id backup_20240101_020000

# Restore only MongoDB
./scripts/restore.sh --database mongodb --backup-id backup_20240101_020000

# Restore configuration only
./scripts/restore.sh --config-only --backup-id backup_20240101_020000
```

### Disaster Recovery

#### Disaster Recovery Plan

1. **Assessment Phase** (0-15 minutes)
   - Assess extent of damage
   - Determine recovery strategy
   - Notify stakeholders

2. **Recovery Phase** (15-60 minutes)
   - Restore from backups
   - Verify data integrity
   - Test system functionality

3. **Validation Phase** (60-120 minutes)
   - Full system testing
   - User acceptance testing
   - Performance validation

#### Recovery Testing

```bash
# Monthly DR test
./scripts/dr-test.sh --simulate-failure database
./scripts/dr-test.sh --simulate-failure application
./scripts/dr-test.sh --simulate-failure network
```

## Log Management

### Log Configuration

#### Centralized Logging

```bash
# Configure log aggregation
# Update docker-compose.production.yml logging section:
logging:
  driver: "json-file"
  options:
    max-size: "10m"
    max-file: "5"
    labels: "service,environment"
```

#### Log Rotation

```bash
# Configure logrotate
sudo nano /etc/logrotate.d/privacycomply

# Content:
/opt/privacycomply/logs/*.log {
    daily
    rotate 30
    compress
    delaycompress
    missingok
    notifempty
    create 644 privacycomply privacycomply
    postrotate
        docker-compose restart backend
    endscript
}
```

### Log Analysis

#### Error Analysis

```bash
# Find recent errors
docker-compose logs --since 24h backend | grep -i error

# Analyze error patterns
docker-compose logs backend | grep -i error | awk '{print $4}' | sort | uniq -c

# Check authentication failures
docker-compose logs backend | grep "authentication failed" | 
  awk '{print $1}' | sort | uniq -c | sort -nr
```

#### Performance Analysis

```bash
# Analyze response times
docker-compose logs nginx | grep -E "HTTP/[0-9.]+ [0-9]+" | 
  awk '{print $NF}' | sort -n | tail -20

# Check slow queries
docker-compose logs backend | grep "slow query" | tail -10
```

## Maintenance Procedures

### Scheduled Maintenance

#### Daily Maintenance (Automated)

```bash
#!/bin/bash
# /opt/privacycomply/scripts/daily-maintenance.sh

# Health checks
./scripts/health-check.sh

# Log rotation
./scripts/rotate-logs.sh

# Backup verification
./scripts/verify-backups.sh

# Performance monitoring
./scripts/performance-check.sh

# Security scan
./scripts/security-scan.sh
```

#### Weekly Maintenance

```bash
#!/bin/bash
# /opt/privacycomply/scripts/weekly-maintenance.sh

# Database maintenance
docker-compose exec postgres psql -U privacycomply_user -d privacycomply -c "VACUUM ANALYZE;"
docker-compose exec mongodb mongosh --eval "db.runCommand({compact: 'policy_documents'})"

# Update system packages
sudo apt update && sudo apt upgrade -y

# Clean Docker resources
docker system prune -f

# Update SSL certificates if needed
sudo certbot renew --quiet

# Performance optimization
./scripts/optimize-performance.sh
```

#### Monthly Maintenance

```bash
#!/bin/bash
# /opt/privacycomply/scripts/monthly-maintenance.sh

# Full security audit
./scripts/security-audit.sh

# Capacity planning review
./scripts/capacity-review.sh

# Disaster recovery test
./scripts/dr-test.sh

# Update documentation
./scripts/update-docs.sh

# Performance baseline update
./scripts/update-baselines.sh
```

### Update Procedures

#### Application Updates

```bash
# Update application
git fetch origin
git checkout main
git pull origin main

# Update dependencies
docker-compose exec backend npm update
docker-compose exec frontend npm update

# Run migrations
docker-compose exec backend npm run migrate

# Restart services
docker-compose restart
```

#### Security Updates

```bash
# Update base images
docker-compose pull

# Rebuild with security patches
docker-compose build --no-cache

# Deploy updates
./scripts/deploy.sh deploy

# Verify security
./scripts/security-check.sh
```

## Troubleshooting

### Common Issues and Solutions

#### Service Startup Issues

**Problem**: Services fail to start
```bash
# Diagnosis
docker-compose logs [service-name]
docker-compose ps

# Solutions
# 1. Check environment variables
docker-compose config

# 2. Check port conflicts
netstat -tulpn | grep -E ":80|:443|:3001"

# 3. Check disk space
df -h

# 4. Restart Docker daemon
sudo systemctl restart docker
```

#### Database Connection Issues

**Problem**: Cannot connect to databases
```bash
# Diagnosis
docker-compose exec backend npm run db:test

# Solutions
# 1. Check database service status
docker-compose ps postgres mongodb redis

# 2. Check network connectivity
docker network inspect privacycomply_privacycomply-network

# 3. Verify credentials
grep -E "POSTGRES_|MONGODB_|REDIS_" .env.production

# 4. Restart database services
docker-compose restart postgres mongodb redis
```

#### Performance Issues

**Problem**: Slow response times
```bash
# Diagnosis
curl -w "@curl-format.txt" -o /dev/null -s http://localhost:3001/health
docker stats --no-stream

# Solutions
# 1. Check resource usage
docker stats
free -h
df -h

# 2. Optimize database queries
docker-compose exec postgres psql -U privacycomply_user -d privacycomply -c "
  SELECT query, mean_time FROM pg_stat_statements ORDER BY mean_time DESC LIMIT 5;"

# 3. Clear cache
docker-compose exec redis redis-cli flushdb

# 4. Scale resources
# Update docker-compose.production.yml resource limits
```

### Emergency Procedures

#### System Recovery

```bash
# Emergency system restart
sudo systemctl restart docker
docker-compose down
docker-compose up -d

# Emergency rollback
./scripts/deploy.sh rollback

# Emergency maintenance mode
./scripts/maintenance-mode.sh enable
```

#### Data Recovery

```bash
# Emergency data restore
./scripts/restore.sh --emergency --latest-backup

# Partial data recovery
./scripts/restore.sh --table users --backup-id backup_20240101_020000
```

## Scaling and Optimization

### Horizontal Scaling

#### Load Balancer Configuration

```bash
# Configure NGINX for multiple backend instances
# Update nginx/nginx.conf:

upstream backend {
    server backend1:3001;
    server backend2:3001;
    server backend3:3001;
}

# Scale backend services
docker-compose up -d --scale backend=3
```

#### Database Scaling

```bash
# PostgreSQL read replicas
# Add to docker-compose.production.yml:

postgres-replica:
  image: postgres:15-alpine
  environment:
    POSTGRES_MASTER_SERVICE: postgres
    POSTGRES_REPLICA_USER: replica
    POSTGRES_REPLICA_PASSWORD: replica_password
  command: |
    bash -c "
    until pg_basebackup --pgdata=/var/lib/postgresql/data --format=p --write-recovery-conf --checkpoint=fast --label=myclone --host=postgres --port=5432 --username=replica --verbose --progress --wal-method=stream; do
    echo 'Waiting for master to connect...'
    sleep 1s
    done
    echo 'Backup done, starting replica...'
    chmod 0700 /var/lib/postgresql/data
    postgres
    "
```

### Vertical Scaling

#### Resource Optimization

```bash
# Update resource limits in docker-compose.production.yml
deploy:
  resources:
    limits:
      memory: 2G
      cpus: '2.0'
    reservations:
      memory: 1G
      cpus: '1.0'
```

#### Performance Tuning

```bash
# PostgreSQL tuning
shared_buffers = 512MB
effective_cache_size = 2GB
work_mem = 8MB
maintenance_work_mem = 128MB

# Node.js tuning
NODE_OPTIONS="--max-old-space-size=4096"
UV_THREADPOOL_SIZE=16

# Redis tuning
maxmemory 1gb
maxmemory-policy allkeys-lru
```

## Support and Escalation

### Support Contacts

- **Level 1 Support**: ops@your-domain.com
- **Level 2 Support**: engineering@your-domain.com
- **Emergency**: emergency@your-domain.com
- **Security Issues**: security@your-domain.com

### Escalation Procedures

1. **Level 1** (0-30 minutes): Basic troubleshooting
2. **Level 2** (30-120 minutes): Advanced technical issues
3. **Level 3** (2+ hours): Architecture and design issues

### Documentation Updates

Keep this guide updated with:
- New procedures and configurations
- Lessons learned from incidents
- Performance optimization discoveries
- Security enhancements

---

**Document Version**: 1.0  
**Last Updated**: 2024-01-01  
**Next Review**: 2024-04-01  
**Owner**: System Administration Team
