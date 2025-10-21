# PrivacyGuard Operational Runbook

This runbook provides step-by-step procedures for common operational tasks and incident response for PrivacyGuard.

## Table of Contents

1. [Daily Operations](#daily-operations)
2. [Incident Response](#incident-response)
3. [Maintenance Procedures](#maintenance-procedures)
4. [Backup and Recovery](#backup-and-recovery)
5. [Performance Monitoring](#performance-monitoring)
6. [Security Operations](#security-operations)
7. [Emergency Procedures](#emergency-procedures)
8. [Escalation Procedures](#escalation-procedures)

## Daily Operations

### Morning Health Check (9:00 AM)

**Frequency**: Daily  
**Duration**: 10 minutes  
**Responsible**: Operations Team

#### Checklist

1. **System Status Check**
   ```bash
   # Check all services are running
   ./scripts/deploy.sh status
   
   # Verify health endpoints
   curl -f http://localhost:3001/health
   curl -f http://localhost:80
   ```

2. **Resource Monitoring**
   ```bash
   # Check system resources
   docker stats --no-stream
   
   # Check disk usage
   df -h
   
   # Check memory usage
   free -h
   ```

3. **Database Health**
   ```bash
   # PostgreSQL health
   docker-compose exec postgres pg_isready -U privacyguard_user
   
   # MongoDB health
   docker-compose exec mongodb mongosh --eval "db.adminCommand('ping')"
   
   # Redis health
   docker-compose exec redis redis-cli ping
   ```

4. **Log Review**
   ```bash
   # Check for errors in last 24 hours
   docker-compose logs --since 24h backend | grep -i error
   
   # Check authentication failures
   docker-compose logs --since 24h backend | grep -i "auth.*fail"
   
   # Check rate limiting
   docker-compose logs --since 24h backend | grep -i "rate limit"
   ```

5. **Backup Verification**
   ```bash
   # Check last backup status
   ls -la backups/ | head -10
   
   # Verify backup integrity
   ./scripts/deploy.sh backup
   ```

**Action Items**:
- Document any issues found
- Create tickets for non-critical issues
- Escalate critical issues immediately

### Evening Monitoring Review (6:00 PM)

**Frequency**: Daily  
**Duration**: 15 minutes  
**Responsible**: Operations Team

#### Checklist

1. **Performance Metrics Review**
   - Check response times (target: <2s average)
   - Review error rates (target: <1%)
   - Monitor throughput trends

2. **Security Events Review**
   ```bash
   # Check security logs
   docker-compose logs backend | grep -i "security\|unauthorized\|forbidden"
   
   # Review failed login attempts
   docker-compose logs backend | grep -i "login.*fail"
   ```

3. **Capacity Planning**
   - Review resource utilization trends
   - Check database growth rates
   - Monitor cache hit rates

4. **User Activity Review**
   - Check active user sessions
   - Review DSAR request volumes
   - Monitor compliance activities

## Incident Response

### Severity Levels

| Severity | Description | Response Time | Examples |
|----------|-------------|---------------|----------|
| P1 - Critical | System down, data loss | 15 minutes | Complete outage, security breach |
| P2 - High | Major functionality impacted | 1 hour | Database connectivity issues |
| P3 - Medium | Minor functionality impacted | 4 hours | Slow performance, non-critical errors |
| P4 - Low | Cosmetic issues, enhancement requests | 24 hours | UI glitches, documentation updates |

### P1 - Critical Incident Response

#### Immediate Actions (0-15 minutes)

1. **Incident Declaration**
   ```bash
   # Create incident channel
   # Notify on-call team
   # Start incident log
   ```

2. **Initial Assessment**
   ```bash
   # Check system status
   ./scripts/deploy.sh status
   
   # Check service health
   curl -f http://localhost:3001/health
   
   # Check logs for errors
   docker-compose logs --tail 100 backend
   ```

3. **Communication**
   - Notify stakeholders
   - Update status page
   - Start incident bridge

#### Investigation (15-30 minutes)

1. **System Diagnostics**
   ```bash
   # Check resource usage
   docker stats
   
   # Check disk space
   df -h
   
   # Check network connectivity
   docker network ls
   ```

2. **Database Status**
   ```bash
   # PostgreSQL status
   docker-compose exec postgres psql -U privacyguard_user -c "SELECT version();"
   
   # MongoDB status
   docker-compose exec mongodb mongosh --eval "db.serverStatus()"
   
   # Redis status
   docker-compose exec redis redis-cli info
   ```

3. **Log Analysis**
   ```bash
   # Recent errors
   docker-compose logs --since 1h backend | grep -i error
   
   # System events
   journalctl -u docker --since "1 hour ago"
   ```

#### Resolution Actions

1. **Service Recovery**
   ```bash
   # Restart affected services
   docker-compose restart [service-name]
   
   # Full system restart if needed
   docker-compose down
   docker-compose up -d
   ```

2. **Database Recovery**
   ```bash
   # If database corruption suspected
   ./scripts/deploy.sh rollback
   
   # Restore from backup
   # See backup procedures below
   ```

3. **Verification**
   ```bash
   # Verify system functionality
   curl -f http://localhost:3001/health
   
   # Test critical user flows
   # Run smoke tests
   ```

### P2 - High Incident Response

#### Assessment (0-60 minutes)

1. **Impact Analysis**
   - Identify affected functionality
   - Estimate user impact
   - Determine business impact

2. **Root Cause Investigation**
   ```bash
   # Detailed log analysis
   docker-compose logs --since 2h backend | grep -A5 -B5 error
   
   # Performance analysis
   docker stats --format "table {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}"
   
   # Database performance
   docker-compose exec postgres psql -U privacyguard_user -c "SELECT * FROM pg_stat_activity;"
   ```

#### Resolution

1. **Temporary Mitigation**
   - Implement workarounds
   - Scale resources if needed
   - Enable maintenance mode if necessary

2. **Permanent Fix**
   - Apply code fixes
   - Update configuration
   - Deploy patches

## Maintenance Procedures

### Weekly Maintenance (Sundays 2:00 AM)

**Duration**: 2 hours  
**Maintenance Window**: 2:00 AM - 4:00 AM

#### Pre-Maintenance Checklist

1. **Backup Creation**
   ```bash
   # Create pre-maintenance backup
   ./scripts/deploy.sh backup
   
   # Verify backup integrity
   ls -la backups/ | head -5
   ```

2. **Notification**
   - Send maintenance notification to users
   - Update status page
   - Notify operations team

#### Maintenance Tasks

1. **System Updates**
   ```bash
   # Update base images
   docker-compose pull
   
   # Update application
   git pull origin main
   
   # Rebuild and deploy
   ./scripts/deploy.sh deploy
   ```

2. **Database Maintenance**
   ```bash
   # PostgreSQL maintenance
   docker-compose exec postgres psql -U privacyguard_user -d privacyguard -c "VACUUM ANALYZE;"
   
   # MongoDB maintenance
   docker-compose exec mongodb mongosh --eval "db.runCommand({compact: 'users'})"
   
   # Redis maintenance
   docker-compose exec redis redis-cli BGREWRITEAOF
   ```

3. **Log Rotation**
   ```bash
   # Rotate application logs
   docker-compose exec backend npm run logs:rotate
   
   # Clean old Docker logs
   docker system prune -f
   ```

4. **Security Updates**
   ```bash
   # Update SSL certificates if needed
   # Rotate secrets if scheduled
   # Update security configurations
   ```

#### Post-Maintenance Verification

1. **System Health Check**
   ```bash
   # Verify all services
   ./scripts/deploy.sh status
   
   # Run health checks
   curl -f http://localhost:3001/health
   ```

2. **Functionality Testing**
   - Test user authentication
   - Verify DSAR functionality
   - Check risk assessment features
   - Test policy management

3. **Performance Verification**
   - Check response times
   - Verify database performance
   - Monitor resource usage

### Monthly Maintenance (First Sunday)

**Additional Tasks**:

1. **Security Audit**
   ```bash
   # Check for security vulnerabilities
   docker run --rm -v /var/run/docker.sock:/var/run/docker.sock \
     aquasec/trivy image privacyguard-backend
   
   # Review access logs
   docker-compose logs nginx | grep -E "40[0-9]|50[0-9]"
   ```

2. **Capacity Planning Review**
   - Analyze resource usage trends
   - Review database growth
   - Plan for scaling needs

3. **Backup Testing**
   ```bash
   # Test backup restoration
   ./scripts/deploy.sh rollback
   
   # Verify data integrity
   # Restore to current state
   ```

## Backup and Recovery

### Automated Backup Process

**Schedule**: Daily at 2:00 AM  
**Retention**: 7 daily, 4 weekly, 12 monthly

#### Backup Verification

```bash
# Check backup status
./scripts/deploy.sh status | grep -i backup

# List recent backups
ls -la backups/ | head -10

# Verify backup integrity
sha256sum backups/latest/postgresql.sql
```

### Manual Backup Creation

```bash
# Create immediate backup
./scripts/deploy.sh backup

# Create named backup
BACKUP_NAME="pre-upgrade-$(date +%Y%m%d)" ./scripts/deploy.sh backup
```

### Recovery Procedures

#### Full System Recovery

1. **Stop Services**
   ```bash
   docker-compose down
   ```

2. **Restore Databases**
   ```bash
   # PostgreSQL restore
   docker-compose up -d postgres
   docker-compose exec postgres psql -U privacyguard_user -d privacyguard < backups/latest/postgresql.sql
   
   # MongoDB restore
   docker-compose up -d mongodb
   docker-compose exec mongodb mongorestore --drop backups/latest/mongodb/
   
   # Redis restore
   docker-compose up -d redis
   docker cp backups/latest/redis.rdb redis:/data/dump.rdb
   docker-compose restart redis
   ```

3. **Start Services**
   ```bash
   docker-compose up -d
   ```

4. **Verify Recovery**
   ```bash
   ./scripts/deploy.sh status
   curl -f http://localhost:3001/health
   ```

#### Point-in-Time Recovery

1. **Identify Recovery Point**
   ```bash
   # List available backups
   ls -la backups/
   
   # Choose appropriate backup timestamp
   ```

2. **Restore to Specific Point**
   ```bash
   # Use specific backup
   BACKUP_ID="backup_20240101_020000" ./scripts/deploy.sh rollback
   ```

## Performance Monitoring

### Key Performance Indicators (KPIs)

| Metric | Target | Warning | Critical |
|--------|--------|---------|----------|
| Response Time | <2s | >3s | >5s |
| Error Rate | <1% | >2% | >5% |
| CPU Usage | <70% | >80% | >90% |
| Memory Usage | <80% | >85% | >95% |
| Disk Usage | <80% | >85% | >95% |

### Monitoring Commands

#### Real-time Monitoring

```bash
# System resources
watch -n 5 'docker stats --no-stream'

# API response times
while true; do
  curl -w "@curl-format.txt" -o /dev/null -s http://localhost:3001/health
  sleep 10
done

# Database connections
watch -n 10 'docker-compose exec postgres psql -U privacyguard_user -c "SELECT count(*) FROM pg_stat_activity;"'
```

#### Performance Analysis

```bash
# Slow queries
docker-compose exec postgres psql -U privacyguard_user -c "
  SELECT query, mean_time, calls 
  FROM pg_stat_statements 
  ORDER BY mean_time DESC 
  LIMIT 10;"

# Cache hit rates
docker-compose exec redis redis-cli info stats | grep hit

# Memory usage analysis
docker-compose exec backend node -e "console.log(process.memoryUsage())"
```

### Performance Tuning

#### Database Optimization

```bash
# PostgreSQL tuning
docker-compose exec postgres psql -U privacyguard_user -c "
  ALTER SYSTEM SET shared_buffers = '256MB';
  ALTER SYSTEM SET effective_cache_size = '1GB';
  SELECT pg_reload_conf();"

# MongoDB indexing
docker-compose exec mongodb mongosh --eval "
  db.users.createIndex({email: 1});
  db.dsar_requests.createIndex({status: 1, created_at: -1});"
```

#### Application Tuning

```bash
# Increase Node.js memory limit
# Update docker-compose.production.yml:
# environment:
#   NODE_OPTIONS: "--max-old-space-size=2048"

# Optimize connection pools
# Update .env.production:
# POSTGRES_MAX_CONNECTIONS=30
# MONGODB_MAX_POOL_SIZE=15
```

## Security Operations

### Daily Security Checks

1. **Failed Authentication Review**
   ```bash
   # Check failed logins
   docker-compose logs backend | grep -i "authentication failed" | tail -20
   
   # Check suspicious IPs
   docker-compose logs nginx | awk '{print $1}' | sort | uniq -c | sort -nr | head -10
   ```

2. **Rate Limiting Review**
   ```bash
   # Check rate limit violations
   docker-compose logs backend | grep -i "rate limit exceeded"
   
   # Review blocked IPs
   docker-compose exec redis redis-cli keys "rate_limit:*"
   ```

3. **Security Event Analysis**
   ```bash
   # Check security logs
   docker-compose logs backend | grep -i "security\|breach\|attack"
   
   # Review audit logs
   docker-compose logs backend | grep -i "audit"
   ```

### Security Incident Response

#### Suspected Breach

1. **Immediate Actions**
   ```bash
   # Isolate affected systems
   docker-compose stop [affected-service]
   
   # Preserve evidence
   docker-compose logs [affected-service] > incident-logs-$(date +%Y%m%d-%H%M%S).log
   
   # Block suspicious IPs
   # Add to nginx configuration or firewall
   ```

2. **Investigation**
   ```bash
   # Analyze access patterns
   docker-compose logs nginx | grep [suspicious-ip]
   
   # Check data access
   docker-compose logs backend | grep -i "data\|query\|access"
   
   # Review user activities
   docker-compose exec postgres psql -U privacyguard_user -c "
     SELECT * FROM audit_logs 
     WHERE created_at > NOW() - INTERVAL '24 hours'
     ORDER BY created_at DESC;"
   ```

3. **Containment**
   - Reset compromised credentials
   - Revoke suspicious sessions
   - Apply security patches
   - Update access controls

#### Password Reset Procedure

```bash
# Reset user password (admin only)
docker-compose exec backend npm run user:reset-password [user-email]

# Force password reset for all users
docker-compose exec backend npm run user:force-password-reset

# Clear all sessions
docker-compose exec redis redis-cli flushdb
```

## Emergency Procedures

### Complete System Failure

#### Immediate Response (0-5 minutes)

1. **Assess Situation**
   ```bash
   # Check if host system is responsive
   ping localhost
   
   # Check Docker daemon
   docker version
   
   # Check disk space
   df -h
   ```

2. **Emergency Communication**
   - Activate incident response team
   - Notify stakeholders
   - Update status page

#### Recovery Actions (5-30 minutes)

1. **System Recovery**
   ```bash
   # Restart Docker daemon if needed
   sudo systemctl restart docker
   
   # Attempt service restart
   docker-compose down
   docker-compose up -d
   ```

2. **Fallback Procedures**
   ```bash
   # If primary system fails, activate backup system
   # Switch DNS to backup infrastructure
   # Restore from latest backup
   ```

### Data Corruption

#### Detection
```bash
# Check database integrity
docker-compose exec postgres psql -U privacyguard_user -c "
  SELECT datname, pg_database_size(datname) 
  FROM pg_database 
  WHERE datname = 'privacyguard';"

# Verify data consistency
docker-compose exec backend npm run db:verify-integrity
```

#### Recovery
```bash
# Stop application services
docker-compose stop backend frontend

# Restore from backup
./scripts/deploy.sh rollback

# Verify data integrity
docker-compose exec backend npm run db:verify-integrity

# Restart services
docker-compose start backend frontend
```

### Network Isolation

#### Symptoms
- External connectivity lost
- Internal service communication fails
- DNS resolution issues

#### Response
```bash
# Check network configuration
docker network ls
docker network inspect privacyguard_privacyguard-network

# Recreate network if needed
docker-compose down
docker network prune
docker-compose up -d

# Check firewall rules
sudo ufw status
sudo iptables -L
```

## Escalation Procedures

### Escalation Matrix

| Issue Type | L1 (Operations) | L2 (Engineering) | L3 (Architecture) |
|------------|----------------|------------------|-------------------|
| Service Restart | ✓ | | |
| Configuration Change | ✓ | | |
| Performance Issues | ✓ | ✓ | |
| Database Issues | | ✓ | |
| Security Incidents | | ✓ | ✓ |
| Architecture Changes | | | ✓ |

### Contact Information

#### Operations Team (L1)
- **Primary**: ops-primary@your-org.com
- **Secondary**: ops-secondary@your-org.com
- **Phone**: +1-555-0101
- **Slack**: #ops-team

#### Engineering Team (L2)
- **Primary**: eng-primary@your-org.com
- **Secondary**: eng-secondary@your-org.com
- **Phone**: +1-555-0102
- **Slack**: #engineering

#### Architecture Team (L3)
- **Primary**: arch-primary@your-org.com
- **Phone**: +1-555-0103
- **Slack**: #architecture

### Escalation Triggers

#### Automatic Escalation
- P1 incidents not resolved within 30 minutes
- P2 incidents not resolved within 2 hours
- Multiple P3 incidents in 24 hours
- Security incidents of any severity

#### Manual Escalation
- Complex technical issues
- Cross-team coordination needed
- Customer impact exceeds thresholds
- Regulatory compliance concerns

### Escalation Process

1. **Initial Contact**
   - Use primary contact method
   - Provide incident summary
   - Include current status and actions taken

2. **Information Handoff**
   - Share incident logs
   - Provide system access if needed
   - Brief on troubleshooting steps attempted

3. **Follow-up**
   - Maintain communication
   - Provide updates on progress
   - Document resolution steps

## Documentation Updates

### Runbook Maintenance

- **Monthly Review**: Update procedures based on incidents
- **Quarterly Review**: Review contact information and escalation paths
- **Annual Review**: Complete runbook overhaul

### Change Management

- All runbook changes must be reviewed by operations team
- Critical procedure changes require engineering approval
- Version control all runbook updates

---

**Document Version**: 1.0  
**Last Updated**: 2024-01-01  
**Next Review**: 2024-04-01  
**Owner**: Operations Team