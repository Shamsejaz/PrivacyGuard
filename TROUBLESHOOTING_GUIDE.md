# PrivacyComply Troubleshooting Guide

This guide provides solutions to common issues encountered when running PrivacyComply in production.

## Table of Contents

1. [General Troubleshooting](#general-troubleshooting)
2. [Application Issues](#application-issues)
3. [Database Issues](#database-issues)
4. [Performance Issues](#performance-issues)
5. [Security Issues](#security-issues)
6. [Network Issues](#network-issues)
7. [Deployment Issues](#deployment-issues)
8. [Monitoring and Logging](#monitoring-and-logging)

## General Troubleshooting

### Quick Diagnostic Commands

```bash
# Check all service status
docker-compose -f docker-compose.production.yml ps

# View service logs
docker-compose -f docker-compose.production.yml logs -f [service-name]

# Check system resources
docker stats

# Check network connectivity
docker network ls
docker network inspect privacycomply_privacycomply-network

# Health check
curl -f http://localhost:3001/health
```

### Log Locations

- **Application Logs**: `docker-compose logs backend`
- **Database Logs**: `docker-compose logs postgres mongodb redis`
- **Web Server Logs**: `docker-compose logs nginx`
- **System Logs**: `/var/log/` (host system)

## Application Issues

### Issue: Backend Service Won't Start

**Symptoms:**
- Backend container exits immediately
- "Connection refused" errors
- Health check failures

**Diagnostic Steps:**
```bash
# Check backend logs
docker-compose logs backend

# Check environment variables
docker-compose config

# Verify database connectivity
docker-compose exec backend npm run db:test
```

**Common Causes & Solutions:**

1. **Missing Environment Variables**
   ```bash
   # Check required variables are set
   grep -E "POSTGRES_PASSWORD|JWT_SECRET|MONGODB_ROOT_PASSWORD" .env.production
   ```

2. **Database Connection Issues**
   ```bash
   # Test database connections individually
   docker-compose exec postgres pg_isready
   docker-compose exec mongodb mongosh --eval "db.adminCommand('ping')"
   docker-compose exec redis redis-cli ping
   ```

3. **Port Conflicts**
   ```bash
   # Check if ports are already in use
   netstat -tulpn | grep :3001
   ```

### Issue: Frontend Not Loading

**Symptoms:**
- Blank page or loading errors
- 404 errors for static assets
- API connection failures

**Diagnostic Steps:**
```bash
# Check frontend container status
docker-compose ps frontend

# Check frontend logs
docker-compose logs frontend

# Test frontend accessibility
curl -I http://localhost:80
```

**Solutions:**

1. **Build Issues**
   ```bash
   # Rebuild frontend
   docker-compose build --no-cache frontend
   docker-compose up -d frontend
   ```

2. **API Configuration**
   ```bash
   # Check API URL configuration
   grep VITE_API_BASE_URL .env.production
   ```

3. **CORS Issues**
   ```bash
   # Verify CORS configuration
   grep CORS_ORIGIN .env.production
   ```

### Issue: Authentication Failures

**Symptoms:**
- Login attempts fail
- JWT token errors
- Session timeouts

**Diagnostic Steps:**
```bash
# Check auth service logs
docker-compose logs backend | grep -i auth

# Test auth endpoint
curl -X POST http://localhost:3001/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password"}'
```

**Solutions:**

1. **JWT Secret Issues**
   ```bash
   # Verify JWT secret is set and long enough
   echo $JWT_SECRET | wc -c  # Should be 32+ characters
   ```

2. **Database User Issues**
   ```bash
   # Check user table
   docker-compose exec postgres psql -U privacycomply_user -d privacycomply \
     -c "SELECT id, email, role FROM users LIMIT 5;"
   ```

3. **Password Hashing Issues**
   ```bash
   # Check bcrypt configuration
   grep BCRYPT_ROUNDS .env.production
   ```

## Database Issues

### Issue: PostgreSQL Connection Failures

**Symptoms:**
- "Connection refused" errors
- "Password authentication failed"
- Slow query responses

**Diagnostic Steps:**
```bash
# Check PostgreSQL status
docker-compose exec postgres pg_isready -U privacycomply_user -d privacycomply

# Check connection limits
docker-compose exec postgres psql -U privacycomply_user -d privacycomply \
  -c "SELECT count(*) FROM pg_stat_activity;"

# Check database size
docker-compose exec postgres psql -U privacycomply_user -d privacycomply \
  -c "SELECT pg_size_pretty(pg_database_size('privacycomply'));"
```

**Solutions:**

1. **Connection Pool Exhaustion**
   ```bash
   # Increase max connections in .env.production
   POSTGRES_MAX_CONNECTIONS=50
   
   # Restart PostgreSQL
   docker-compose restart postgres
   ```

2. **Disk Space Issues**
   ```bash
   # Check disk usage
   df -h
   
   # Clean up old WAL files
   docker-compose exec postgres psql -U privacycomply_user -d privacycomply \
     -c "SELECT pg_switch_wal();"
   ```

3. **Performance Issues**
   ```bash
   # Check slow queries
   docker-compose exec postgres psql -U privacycomply_user -d privacycomply \
     -c "SELECT query, mean_time, calls FROM pg_stat_statements ORDER BY mean_time DESC LIMIT 10;"
   ```

### Issue: MongoDB Connection Problems

**Symptoms:**
- "MongoNetworkError" messages
- Slow document operations
- Replica set issues

**Diagnostic Steps:**
```bash
# Check MongoDB status
docker-compose exec mongodb mongosh --eval "db.adminCommand('ping')"

# Check database stats
docker-compose exec mongodb mongosh --eval "db.stats()"

# Check connection count
docker-compose exec mongodb mongosh --eval "db.serverStatus().connections"
```

**Solutions:**

1. **Connection Pool Issues**
   ```bash
   # Adjust pool settings in .env.production
   MONGODB_MAX_POOL_SIZE=20
   MONGODB_MIN_POOL_SIZE=10
   ```

2. **Index Issues**
   ```bash
   # Check index usage
   docker-compose exec mongodb mongosh --eval "db.collection.getIndexes()"
   
   # Create missing indexes
   docker-compose exec backend npm run db:create-indexes
   ```

### Issue: Redis Cache Problems

**Symptoms:**
- Cache misses
- Memory usage warnings
- Connection timeouts

**Diagnostic Steps:**
```bash
# Check Redis status
docker-compose exec redis redis-cli ping

# Check memory usage
docker-compose exec redis redis-cli info memory

# Check cache statistics
docker-compose exec redis redis-cli info stats
```

**Solutions:**

1. **Memory Issues**
   ```bash
   # Check memory configuration
   docker-compose exec redis redis-cli config get maxmemory
   
   # Adjust memory limit
   docker-compose exec redis redis-cli config set maxmemory 512mb
   ```

2. **Eviction Policy**
   ```bash
   # Check eviction policy
   docker-compose exec redis redis-cli config get maxmemory-policy
   
   # Set appropriate policy
   docker-compose exec redis redis-cli config set maxmemory-policy allkeys-lru
   ```

## Performance Issues

### Issue: Slow API Response Times

**Symptoms:**
- High response times (>5 seconds)
- Timeout errors
- Poor user experience

**Diagnostic Steps:**
```bash
# Check API response times
curl -w "@curl-format.txt" -o /dev/null -s http://localhost:3001/api/v1/health

# Monitor system resources
docker stats --no-stream

# Check database query performance
docker-compose logs backend | grep -i "slow query"
```

**Solutions:**

1. **Database Optimization**
   ```bash
   # Add database indexes
   docker-compose exec backend npm run db:optimize
   
   # Analyze query performance
   docker-compose exec postgres psql -U privacycomply_user -d privacycomply \
     -c "EXPLAIN ANALYZE SELECT * FROM users WHERE email = 'test@example.com';"
   ```

2. **Caching Improvements**
   ```bash
   # Check cache hit rates
   curl http://localhost:3001/api/v1/monitoring/cache-stats
   
   # Increase cache TTL for static data
   # Update cache configuration in backend
   ```

3. **Resource Scaling**
   ```bash
   # Increase container resources in docker-compose.production.yml
   deploy:
     resources:
       limits:
         memory: 2G
         cpus: '2.0'
   ```

### Issue: High Memory Usage

**Symptoms:**
- Out of memory errors
- Container restarts
- System slowdown

**Diagnostic Steps:**
```bash
# Check memory usage by container
docker stats --format "table {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.MemPerc}}"

# Check system memory
free -h

# Check for memory leaks
docker-compose exec backend npm run memory:profile
```

**Solutions:**

1. **Memory Leaks**
   ```bash
   # Restart affected services
   docker-compose restart backend
   
   # Enable memory monitoring
   # Add memory profiling to application
   ```

2. **Resource Limits**
   ```bash
   # Adjust memory limits in docker-compose.production.yml
   # Monitor and tune based on actual usage
   ```

### Issue: High CPU Usage

**Symptoms:**
- CPU usage consistently >80%
- Slow response times
- System unresponsiveness

**Diagnostic Steps:**
```bash
# Check CPU usage by container
docker stats --format "table {{.Container}}\t{{.CPUPerc}}\t{{.PIDs}}"

# Check system load
uptime

# Profile application CPU usage
docker-compose exec backend npm run cpu:profile
```

**Solutions:**

1. **Code Optimization**
   ```bash
   # Identify CPU-intensive operations
   # Optimize database queries
   # Implement caching for expensive operations
   ```

2. **Horizontal Scaling**
   ```bash
   # Scale backend services
   docker-compose up -d --scale backend=3
   
   # Add load balancer configuration
   ```

## Security Issues

### Issue: Authentication Bypass

**Symptoms:**
- Unauthorized access to protected resources
- JWT token validation failures
- Session hijacking attempts

**Diagnostic Steps:**
```bash
# Check authentication logs
docker-compose logs backend | grep -i "auth\|unauthorized\|forbidden"

# Verify JWT configuration
curl -H "Authorization: Bearer invalid_token" http://localhost:3001/api/v1/protected

# Check session management
docker-compose exec redis redis-cli keys "session:*"
```

**Solutions:**

1. **JWT Security**
   ```bash
   # Rotate JWT secret
   # Update JWT_SECRET in .env.production
   # Restart backend service
   docker-compose restart backend
   ```

2. **Session Security**
   ```bash
   # Clear all sessions
   docker-compose exec redis redis-cli flushdb
   
   # Implement session timeout
   # Update SESSION_TIMEOUT in configuration
   ```

### Issue: Rate Limiting Bypass

**Symptoms:**
- Excessive requests from single IP
- API abuse attempts
- DoS attack patterns

**Diagnostic Steps:**
```bash
# Check rate limiting logs
docker-compose logs backend | grep -i "rate limit"

# Monitor request patterns
docker-compose logs nginx | awk '{print $1}' | sort | uniq -c | sort -nr

# Check Redis rate limit keys
docker-compose exec redis redis-cli keys "rate_limit:*"
```

**Solutions:**

1. **Adjust Rate Limits**
   ```bash
   # Update rate limiting configuration
   RATE_LIMIT_WINDOW_MS=300000  # 5 minutes
   RATE_LIMIT_MAX_REQUESTS=50   # 50 requests per window
   ```

2. **IP Blocking**
   ```bash
   # Block malicious IPs at nginx level
   # Add to nginx configuration:
   # deny 192.168.1.100;
   ```

## Network Issues

### Issue: Service Communication Failures

**Symptoms:**
- Services can't communicate with each other
- DNS resolution failures
- Network timeouts

**Diagnostic Steps:**
```bash
# Check Docker network
docker network ls
docker network inspect privacycomply_privacycomply-network

# Test service connectivity
docker-compose exec backend ping postgres
docker-compose exec backend ping mongodb
docker-compose exec backend ping redis

# Check port bindings
docker-compose port backend 3001
```

**Solutions:**

1. **Network Configuration**
   ```bash
   # Recreate network
   docker-compose down
   docker network prune
   docker-compose up -d
   ```

2. **DNS Issues**
   ```bash
   # Check service names in configuration
   # Ensure services use container names for internal communication
   ```

### Issue: External Connectivity Problems

**Symptoms:**
- Can't access application from outside
- Firewall blocking connections
- Load balancer issues

**Diagnostic Steps:**
```bash
# Check port accessibility
netstat -tulpn | grep :80
netstat -tulpn | grep :443
netstat -tulpn | grep :3001

# Test external access
curl -I http://your-domain.com
curl -I https://your-domain.com

# Check firewall rules
sudo ufw status
sudo iptables -L
```

**Solutions:**

1. **Firewall Configuration**
   ```bash
   # Open required ports
   sudo ufw allow 80
   sudo ufw allow 443
   sudo ufw allow 3001
   ```

2. **Load Balancer Setup**
   ```bash
   # Configure nginx properly
   # Check nginx configuration
   docker-compose exec nginx nginx -t
   ```

## Deployment Issues

### Issue: Deployment Failures

**Symptoms:**
- Deployment script errors
- Container build failures
- Service startup failures

**Diagnostic Steps:**
```bash
# Check deployment logs
./scripts/deploy.sh deploy 2>&1 | tee deployment.log

# Verify environment configuration
docker-compose config

# Check Docker daemon
docker version
docker info
```

**Solutions:**

1. **Build Issues**
   ```bash
   # Clean Docker cache
   docker system prune -a
   
   # Rebuild without cache
   docker-compose build --no-cache
   ```

2. **Environment Issues**
   ```bash
   # Validate environment file
   source .env.production
   echo "Required vars: $POSTGRES_PASSWORD $JWT_SECRET"
   ```

### Issue: Migration Failures

**Symptoms:**
- Database schema out of sync
- Migration script errors
- Data corruption

**Diagnostic Steps:**
```bash
# Check migration status
docker-compose exec backend npm run migrate:status

# Check migration logs
docker-compose logs backend | grep -i migration

# Verify database schema
docker-compose exec postgres psql -U privacycomply_user -d privacycomply \
  -c "\dt"  # List tables
```

**Solutions:**

1. **Manual Migration**
   ```bash
   # Run migrations manually
   docker-compose exec backend npm run migrate:up
   
   # Rollback if needed
   docker-compose exec backend npm run migrate:down
   ```

2. **Schema Repair**
   ```bash
   # Backup database first
   ./scripts/deploy.sh backup
   
   # Reset and re-run migrations
   docker-compose exec backend npm run migrate:reset
   docker-compose exec backend npm run migrate:up
   ```

## Monitoring and Logging

### Issue: Missing Logs

**Symptoms:**
- No application logs
- Log rotation issues
- Monitoring gaps

**Diagnostic Steps:**
```bash
# Check log configuration
grep LOG_ .env.production

# Check log files
docker-compose exec backend ls -la logs/

# Check Docker logging driver
docker info | grep "Logging Driver"
```

**Solutions:**

1. **Log Configuration**
   ```bash
   # Enable logging in environment
   LOG_LEVEL=info
   LOG_FILE=true
   LOG_CONSOLE=true
   ```

2. **Log Rotation**
   ```bash
   # Configure log rotation
   # Add to docker-compose.production.yml:
   logging:
     driver: "json-file"
     options:
       max-size: "10m"
       max-file: "3"
   ```

### Issue: Monitoring Alerts

**Symptoms:**
- False positive alerts
- Missing critical alerts
- Alert fatigue

**Solutions:**

1. **Tune Alert Thresholds**
   ```bash
   # Adjust thresholds in .env.production
   ALERT_RESPONSE_TIME=10000  # 10 seconds
   ALERT_ERROR_RATE=0.10      # 10%
   ALERT_MEMORY_USAGE=0.90    # 90%
   ```

2. **Alert Configuration**
   ```bash
   # Configure alert channels
   # Set up email/Slack notifications
   # Implement alert escalation
   ```

## Emergency Procedures

### Complete System Recovery

```bash
# 1. Stop all services
docker-compose -f docker-compose.production.yml down

# 2. Backup current state
./scripts/deploy.sh backup

# 3. Restore from known good backup
./scripts/deploy.sh rollback

# 4. Verify system health
./scripts/deploy.sh status
curl -f http://localhost:3001/health
```

### Data Recovery

```bash
# 1. Stop application services (keep databases running)
docker-compose stop backend frontend nginx

# 2. Restore database from backup
docker-compose exec postgres psql -U privacycomply_user -d privacycomply < backup.sql

# 3. Restart services
docker-compose start backend frontend nginx

# 4. Verify data integrity
docker-compose exec backend npm run db:verify
```

## Getting Help

### Log Collection for Support

```bash
# Collect all relevant logs
mkdir -p support-logs
docker-compose logs > support-logs/docker-compose.log
docker stats --no-stream > support-logs/docker-stats.txt
docker system df > support-logs/docker-disk-usage.txt
cp .env.production support-logs/env-config.txt  # Remove sensitive data first!

# Create support package
tar -czf support-package-$(date +%Y%m%d-%H%M%S).tar.gz support-logs/
```

### Contact Information

- **Technical Support**: technical-support@your-org.com
- **Security Issues**: security@your-org.com
- **Emergency**: emergency@your-org.com

### Additional Resources

#### Core Documentation
- [Deployment Guide](./DEPLOYMENT_GUIDE.md) - Production deployment procedures
- [API Documentation](./API_DOCUMENTATION.md) - Complete API reference
- [API Integration Guide](./API_INTEGRATION_GUIDE.md) - Developer integration guide

#### System Administration
- [System Administration Guide](./SYSTEM_ADMINISTRATION_GUIDE.md) - Complete admin procedures
- [Operational Runbook](./OPERATIONAL_RUNBOOK.md) - Daily operations guide
- [Maintenance and Monitoring Guide](./MAINTENANCE_MONITORING_GUIDE.md) - Monitoring procedures

#### Specialized Resources
- [Security Guide](./SECURITY_GUIDE.md) - Security best practices
- [Performance Tuning](./PERFORMANCE_TUNING.md) - Optimization techniques
- [Disaster Recovery](./DISASTER_RECOVERY.md) - Recovery procedures
