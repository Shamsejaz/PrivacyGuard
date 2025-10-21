# PrivacyGuard Production Deployment Guide

This guide provides comprehensive instructions for deploying PrivacyGuard to production environments.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Environment Setup](#environment-setup)
3. [Configuration](#configuration)
4. [Deployment Methods](#deployment-methods)
5. [Post-Deployment Verification](#post-deployment-verification)
6. [Monitoring and Maintenance](#monitoring-and-maintenance)
7. [Troubleshooting](#troubleshooting)
8. [Security Considerations](#security-considerations)

## Prerequisites

### System Requirements

**Minimum Requirements:**
- CPU: 4 cores
- RAM: 8GB
- Storage: 50GB SSD
- Network: 1Gbps

**Recommended Requirements:**
- CPU: 8 cores
- RAM: 16GB
- Storage: 100GB SSD
- Network: 1Gbps

### Software Dependencies

- Docker Engine 20.10+
- Docker Compose 2.0+
- Git
- OpenSSL (for SSL certificate generation)
- curl (for health checks)

### Network Requirements

**Required Ports:**
- 80 (HTTP)
- 443 (HTTPS)
- 3001 (Backend API)
- 5432 (PostgreSQL - internal)
- 27017 (MongoDB - internal)
- 6379 (Redis - internal)

**Optional Ports (for monitoring):**
- 3000 (Grafana)
- 9090 (Prometheus)

## Environment Setup

### 1. Clone the Repository

```bash
git clone https://github.com/your-org/privacyguard.git
cd privacyguard
```

### 2. Create Environment Configuration

```bash
# Copy the production environment template
cp .env.production.example .env.production

# Edit the configuration file
nano .env.production
```

### 3. Generate Required Secrets

```bash
# Generate JWT secret (32+ characters)
openssl rand -base64 32

# Generate database passwords
openssl rand -base64 24
```

## Configuration

### Environment Variables

Edit `.env.production` and configure the following critical variables:

#### Required Variables

```bash
# Database passwords (MUST be changed)
POSTGRES_PASSWORD=your_strong_postgres_password
MONGODB_ROOT_PASSWORD=your_strong_mongodb_password
REDIS_PASSWORD=your_strong_redis_password

# JWT secret (MUST be changed)
JWT_SECRET=your_jwt_secret_at_least_32_characters_long

# CORS origin (MUST match your domain)
CORS_ORIGIN=https://your-domain.com
```

#### Optional but Recommended

```bash
# Email configuration for notifications
EMAIL_ENABLED=true
EMAIL_PROVIDER=smtp
SMTP_HOST=smtp.your-provider.com
SMTP_USER=your_smtp_username
SMTP_PASS=your_smtp_password

# Monitoring
GRAFANA_ADMIN_PASSWORD=your_grafana_password
```

### SSL Certificates

For production, you should use proper SSL certificates:

#### Option 1: Let's Encrypt (Recommended)

```bash
# Install certbot
sudo apt-get install certbot

# Generate certificates
sudo certbot certonly --standalone -d your-domain.com

# Copy certificates to nginx directory
sudo cp /etc/letsencrypt/live/your-domain.com/fullchain.pem nginx/ssl/privacyguard.crt
sudo cp /etc/letsencrypt/live/your-domain.com/privkey.pem nginx/ssl/privacyguard.key
```

#### Option 2: Self-Signed (Development/Testing)

The deployment script will automatically generate self-signed certificates if none are found.

## Deployment Methods

### Method 1: Automated Deployment (Recommended)

```bash
# Make deployment script executable (Linux/Mac)
chmod +x scripts/deploy.sh

# Run deployment
./scripts/deploy.sh deploy
```

### Method 2: Manual Deployment

```bash
# Create necessary directories
mkdir -p backups/{postgresql,mongodb,redis}
mkdir -p logs/nginx
mkdir -p nginx/ssl

# Build and start services
docker-compose -f docker-compose.production.yml --env-file .env.production up -d --build

# Run database migrations
docker-compose -f docker-compose.production.yml --env-file .env.production exec backend npm run migrate

# Seed initial data (optional)
docker-compose -f docker-compose.production.yml --env-file .env.production exec backend npm run seed
```

### Method 3: Kubernetes Deployment

For Kubernetes deployment, see [KUBERNETES_DEPLOYMENT.md](./KUBERNETES_DEPLOYMENT.md).

## Post-Deployment Verification

### 1. Check Service Health

```bash
# Check all services are running
docker-compose -f docker-compose.production.yml ps

# Check service logs
docker-compose -f docker-compose.production.yml logs -f backend
```

### 2. Verify API Endpoints

```bash
# Health check
curl -f http://localhost:3001/health

# API status
curl -f http://localhost:3001/api/v1/auth/status
```

### 3. Test Frontend Access

```bash
# Frontend accessibility
curl -f http://localhost:80

# Or with SSL
curl -f https://localhost:443
```

### 4. Database Connectivity

```bash
# PostgreSQL
docker-compose -f docker-compose.production.yml exec postgres psql -U privacyguard_user -d privacyguard -c "SELECT version();"

# MongoDB
docker-compose -f docker-compose.production.yml exec mongodb mongosh --eval "db.adminCommand('ping')"

# Redis
docker-compose -f docker-compose.production.yml exec redis redis-cli ping
```

## Monitoring and Maintenance

### Health Monitoring

The application includes built-in health checks:

- **Application Health**: `GET /health`
- **Database Health**: Included in health endpoint
- **Service Dependencies**: Monitored via Docker health checks

### Log Management

Logs are stored in the following locations:

```bash
# Application logs
docker-compose logs backend

# Database logs
docker-compose logs postgres
docker-compose logs mongodb
docker-compose logs redis

# Web server logs
docker-compose logs nginx
```

### Backup Management

Automated backups are configured via environment variables:

```bash
# Manual backup
./scripts/deploy.sh backup

# View backup history
ls -la backups/
```

### Performance Monitoring

If monitoring is enabled:

- **Grafana Dashboard**: http://localhost:3000
- **Prometheus Metrics**: http://localhost:9090

### Maintenance Tasks

#### Regular Updates

```bash
# Update application
git pull origin main
./scripts/deploy.sh deploy

# Update base images
docker-compose pull
./scripts/deploy.sh deploy
```

#### Database Maintenance

```bash
# PostgreSQL maintenance
docker-compose exec postgres psql -U privacyguard_user -d privacyguard -c "VACUUM ANALYZE;"

# MongoDB maintenance
docker-compose exec mongodb mongosh --eval "db.runCommand({compact: 'collection_name'})"
```

#### Log Rotation

```bash
# Clean old logs
docker system prune -f
./scripts/deploy.sh cleanup
```

## Troubleshooting

### Common Issues

#### 1. Services Won't Start

**Symptoms**: Services fail to start or immediately exit

**Solutions**:
```bash
# Check logs
docker-compose logs [service-name]

# Check environment variables
docker-compose config

# Verify file permissions
ls -la .env.production
```

#### 2. Database Connection Issues

**Symptoms**: Backend can't connect to databases

**Solutions**:
```bash
# Check database service status
docker-compose ps postgres mongodb redis

# Test database connectivity
docker-compose exec backend npm run db:test

# Check network connectivity
docker network ls
docker network inspect privacyguard_privacyguard-network
```

#### 3. High Memory Usage

**Symptoms**: Services consuming excessive memory

**Solutions**:
```bash
# Check memory usage
docker stats

# Adjust resource limits in docker-compose.production.yml
# Restart services
docker-compose restart
```

#### 4. SSL Certificate Issues

**Symptoms**: HTTPS not working or certificate errors

**Solutions**:
```bash
# Check certificate files
ls -la nginx/ssl/

# Verify certificate validity
openssl x509 -in nginx/ssl/privacyguard.crt -text -noout

# Regenerate certificates if needed
./scripts/deploy.sh deploy
```

### Performance Issues

#### Slow API Responses

1. Check database query performance
2. Review cache hit rates
3. Monitor resource usage
4. Check network latency

#### High CPU Usage

1. Review application logs for errors
2. Check for infinite loops or heavy computations
3. Monitor database query performance
4. Consider scaling horizontally

### Recovery Procedures

#### Service Recovery

```bash
# Restart individual service
docker-compose restart [service-name]

# Full system restart
docker-compose down
docker-compose up -d
```

#### Database Recovery

```bash
# Restore from backup
./scripts/deploy.sh rollback

# Manual database restore
docker-compose exec postgres psql -U privacyguard_user -d privacyguard < backup.sql
```

#### Disaster Recovery

See [DISASTER_RECOVERY.md](./DISASTER_RECOVERY.md) for comprehensive disaster recovery procedures.

## Security Considerations

### Network Security

1. **Firewall Configuration**: Only expose necessary ports
2. **VPN Access**: Use VPN for administrative access
3. **Network Segmentation**: Isolate database networks

### Application Security

1. **Regular Updates**: Keep all components updated
2. **Security Scanning**: Regular vulnerability scans
3. **Access Control**: Implement proper RBAC
4. **Audit Logging**: Enable comprehensive audit trails

### Data Security

1. **Encryption at Rest**: Enable database encryption
2. **Encryption in Transit**: Use SSL/TLS for all communications
3. **Backup Encryption**: Encrypt backup files
4. **Key Management**: Secure key storage and rotation

### Monitoring Security

1. **Failed Login Attempts**: Monitor and alert
2. **Unusual Activity**: Detect anomalous patterns
3. **Resource Usage**: Monitor for DoS attacks
4. **Data Access**: Audit data access patterns

## Scaling Considerations

### Horizontal Scaling

For high-traffic environments:

1. **Load Balancer**: Add NGINX load balancer
2. **Multiple Backend Instances**: Scale backend services
3. **Database Clustering**: Implement database clusters
4. **CDN**: Use CDN for static assets

### Vertical Scaling

For resource-intensive workloads:

1. **Increase Resources**: Add CPU/RAM to existing services
2. **Optimize Queries**: Improve database performance
3. **Caching Strategy**: Implement advanced caching
4. **Connection Pooling**: Optimize database connections

## Support and Maintenance

### Regular Maintenance Schedule

- **Daily**: Monitor logs and health checks
- **Weekly**: Review performance metrics and backup status
- **Monthly**: Update dependencies and security patches
- **Quarterly**: Full security audit and disaster recovery testing

### Support Contacts

- **Technical Issues**: [technical-support@your-org.com]
- **Security Issues**: [security@your-org.com]
- **Emergency**: [emergency@your-org.com]

### Documentation Updates

Keep this documentation updated with:
- Configuration changes
- New deployment procedures
- Troubleshooting solutions
- Performance optimizations

---

## Additional Documentation

For comprehensive system management, refer to these additional guides:

### Core Documentation
- [API Documentation](./API_DOCUMENTATION.md) - Complete API reference and integration guide
- [API Integration Guide](./API_INTEGRATION_GUIDE.md) - Developer integration patterns and SDKs
- [Troubleshooting Guide](./TROUBLESHOOTING_GUIDE.md) - Common issues and solutions

### System Administration
- [System Administration Guide](./SYSTEM_ADMINISTRATION_GUIDE.md) - Complete system admin procedures
- [Operational Runbook](./OPERATIONAL_RUNBOOK.md) - Daily operations and incident response
- [Maintenance and Monitoring Guide](./MAINTENANCE_MONITORING_GUIDE.md) - Monitoring and maintenance procedures

### Specialized Guides
- [Security Guide](./SECURITY_GUIDE.md) - Security hardening and best practices
- [Performance Tuning](./PERFORMANCE_TUNING.md) - Performance optimization techniques
- [Disaster Recovery](./DISASTER_RECOVERY.md) - Business continuity procedures