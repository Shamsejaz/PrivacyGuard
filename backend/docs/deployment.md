# PrivacyGuard Backend Deployment Guide

## 🚀 Production Deployment

This guide covers deploying the PrivacyGuard backend to production environments.

## Prerequisites

### System Requirements
- **Node.js**: 20.x or higher
- **PostgreSQL**: 15.x or higher
- **MongoDB**: 7.x or higher
- **Redis**: 7.x or higher
- **Docker**: 24.x or higher (for containerized deployment)
- **Memory**: Minimum 2GB RAM, Recommended 4GB+
- **Storage**: Minimum 20GB, Recommended 100GB+

### Network Requirements
- **Inbound Ports**: 3001 (API), 5432 (PostgreSQL), 27017 (MongoDB), 6379 (Redis)
- **Outbound**: HTTPS (443) for external API calls
- **Load Balancer**: Recommended for production traffic

## Environment Configuration

### 1. Environment Variables

Create a production `.env` file:

```bash
# Server Configuration
NODE_ENV=production
PORT=3001
HOST=0.0.0.0

# Database Configuration
POSTGRES_HOST=your-postgres-host
POSTGRES_PORT=5432
POSTGRES_DB=privacyguard_prod
POSTGRES_USER=privacyguard_user
POSTGRES_PASSWORD=your-secure-password
POSTGRES_SSL=true
POSTGRES_MAX_CONNECTIONS=20

# MongoDB Configuration
MONGODB_URI=mongodb://username:password@your-mongo-host:27017/privacyguard_prod?authSource=admin&ssl=true

# Redis Configuration
REDIS_HOST=your-redis-host
REDIS_PORT=6379
REDIS_PASSWORD=your-redis-password
REDIS_DB=0
REDIS_TLS=true

# Security Configuration
JWT_SECRET=your-very-secure-jwt-secret-key-min-32-chars
JWT_EXPIRES_IN=24h
JWT_REFRESH_EXPIRES_IN=7d
BCRYPT_ROUNDS=12

# CORS Configuration
CORS_ORIGIN=https://your-frontend-domain.com
CORS_CREDENTIALS=true

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
RATE_LIMIT_AUTH_MAX=5

# Logging
LOG_LEVEL=info
LOG_FILE=true
LOG_MAX_SIZE=10m
LOG_MAX_FILES=5

# Monitoring
HEALTH_CHECK_INTERVAL=30000
METRICS_ENABLED=true

# External Services
PYTHON_PII_SERVICE_URL=http://your-pii-service:8000
EXTERNAL_API_TIMEOUT=30000

# Email Configuration (for notifications)
SMTP_HOST=your-smtp-host
SMTP_PORT=587
SMTP_SECURE=true
SMTP_USER=your-smtp-user
SMTP_PASS=your-smtp-password
FROM_EMAIL=noreply@your-domain.com
```

### 2. SSL/TLS Configuration

For production, ensure all database connections use SSL:

```bash
# PostgreSQL SSL
POSTGRES_SSL=true
POSTGRES_SSL_REJECT_UNAUTHORIZED=true

# MongoDB SSL
MONGODB_URI=mongodb://user:pass@host:27017/db?ssl=true&sslValidate=true

# Redis TLS
REDIS_TLS=true
```

## Deployment Methods

### Method 1: Docker Deployment (Recommended)

#### 1. Build Production Image
```bash
# Clone repository
git clone https://github.com/your-org/privacyguard.git
cd privacyguard/backend

# Build production image
docker build -f Dockerfile -t privacyguard-backend:latest .
```

#### 2. Docker Compose Production
```yaml
# docker-compose.prod.yml
version: '3.8'

services:
  backend:
    image: privacyguard-backend:latest
    ports:
      - "3001:3001"
    environment:
      - NODE_ENV=production
    env_file:
      - .env.production
    depends_on:
      - postgres
      - mongodb
      - redis
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3001/health"]
      interval: 30s
      timeout: 10s
      retries: 3
    deploy:
      resources:
        limits:
          memory: 2G
          cpus: '1.0'
        reservations:
          memory: 1G
          cpus: '0.5'

  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: privacyguard_prod
      POSTGRES_USER: privacyguard_user
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./backups:/backups
    restart: unless-stopped
    command: >
      postgres
      -c max_connections=100
      -c shared_buffers=256MB
      -c effective_cache_size=1GB

  mongodb:
    image: mongo:7
    environment:
      MONGO_INITDB_ROOT_USERNAME: ${MONGO_ROOT_USER}
      MONGO_INITDB_ROOT_PASSWORD: ${MONGO_ROOT_PASSWORD}
    volumes:
      - mongodb_data:/data/db
      - ./backups:/backups
    restart: unless-stopped
    command: mongod --auth

  redis:
    image: redis:7-alpine
    command: redis-server --requirepass ${REDIS_PASSWORD}
    volumes:
      - redis_data:/data
    restart: unless-stopped

volumes:
  postgres_data:
  mongodb_data:
  redis_data:
```

#### 3. Deploy with Docker Compose
```bash
# Deploy to production
docker-compose -f docker-compose.prod.yml up -d

# Check status
docker-compose -f docker-compose.prod.yml ps

# View logs
docker-compose -f docker-compose.prod.yml logs -f backend
```

### Method 2: Direct Server Deployment

#### 1. Server Setup
```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PM2 for process management
sudo npm install -g pm2

# Create application user
sudo useradd -m -s /bin/bash privacyguard
sudo usermod -aG sudo privacyguard
```

#### 2. Application Deployment
```bash
# Switch to application user
sudo su - privacyguard

# Clone and setup application
git clone https://github.com/your-org/privacyguard.git
cd privacyguard/backend

# Install dependencies
npm ci --only=production

# Build application
npm run build

# Setup PM2 ecosystem
cat > ecosystem.config.js << EOF
module.exports = {
  apps: [{
    name: 'privacyguard-backend',
    script: 'dist/server.js',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 3001
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true,
    max_memory_restart: '1G',
    node_args: '--max-old-space-size=1024'
  }]
};
EOF

# Start with PM2
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

## Database Setup

### 1. PostgreSQL Setup
```bash
# Connect to PostgreSQL
psql -h your-postgres-host -U postgres

# Create database and user
CREATE DATABASE privacyguard_prod;
CREATE USER privacyguard_user WITH ENCRYPTED PASSWORD 'your-secure-password';
GRANT ALL PRIVILEGES ON DATABASE privacyguard_prod TO privacyguard_user;

# Grant schema permissions
\c privacyguard_prod
GRANT ALL ON SCHEMA public TO privacyguard_user;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO privacyguard_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO privacyguard_user;
```

### 2. Run Migrations
```bash
# Run database migrations
npm run migrate

# Verify migration status
npm run migrate:status
```

### 3. MongoDB Setup
```bash
# Connect to MongoDB
mongosh "mongodb://your-mongo-host:27017" --username admin

# Create database and user
use privacyguard_prod
db.createUser({
  user: "privacyguard_user",
  pwd: "your-secure-password",
  roles: [
    { role: "readWrite", db: "privacyguard_prod" },
    { role: "dbAdmin", db: "privacyguard_prod" }
  ]
})
```

## Load Balancer Configuration

### Nginx Configuration
```nginx
# /etc/nginx/sites-available/privacyguard-backend
upstream privacyguard_backend {
    least_conn;
    server 127.0.0.1:3001 max_fails=3 fail_timeout=30s;
    # Add more backend servers for high availability
    # server 127.0.0.1:3002 max_fails=3 fail_timeout=30s;
}

server {
    listen 80;
    server_name api.your-domain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name api.your-domain.com;

    # SSL Configuration
    ssl_certificate /path/to/your/certificate.crt;
    ssl_certificate_key /path/to/your/private.key;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512;
    ssl_prefer_server_ciphers off;

    # Security Headers
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains";

    # Rate Limiting
    limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
    limit_req zone=api burst=20 nodelay;

    # Proxy Configuration
    location / {
        proxy_pass http://privacyguard_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
    }

    # WebSocket Support
    location /ws {
        proxy_pass http://privacyguard_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Health Check
    location /health {
        proxy_pass http://privacyguard_backend/health;
        access_log off;
    }
}
```

## Monitoring & Logging

### 1. Application Monitoring
```bash
# Install monitoring tools
npm install -g @pm2/io

# Setup PM2 monitoring
pm2 install pm2-server-monit
```

### 2. Log Management
```bash
# Setup log rotation
sudo cat > /etc/logrotate.d/privacyguard << EOF
/home/privacyguard/privacyguard/backend/logs/*.log {
    daily
    missingok
    rotate 30
    compress
    delaycompress
    notifempty
    create 644 privacyguard privacyguard
    postrotate
        pm2 reloadLogs
    endscript
}
EOF
```

### 3. Health Monitoring
```bash
# Setup health check monitoring
cat > /home/privacyguard/health-check.sh << EOF
#!/bin/bash
HEALTH_URL="http://localhost:3001/health"
RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" $HEALTH_URL)

if [ $RESPONSE -ne 200 ]; then
    echo "Health check failed with status: $RESPONSE"
    # Send alert notification
    # pm2 restart privacyguard-backend
fi
EOF

chmod +x /home/privacyguard/health-check.sh

# Add to crontab
(crontab -l 2>/dev/null; echo "*/5 * * * * /home/privacyguard/health-check.sh") | crontab -
```

## Backup Strategy

### 1. Database Backups
```bash
# PostgreSQL backup script
cat > /home/privacyguard/backup-postgres.sh << EOF
#!/bin/bash
BACKUP_DIR="/home/privacyguard/backups"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="postgres_backup_$DATE.sql"

pg_dump -h $POSTGRES_HOST -U $POSTGRES_USER -d $POSTGRES_DB > $BACKUP_DIR/$BACKUP_FILE
gzip $BACKUP_DIR/$BACKUP_FILE

# Keep only last 7 days of backups
find $BACKUP_DIR -name "postgres_backup_*.sql.gz" -mtime +7 -delete
EOF

# MongoDB backup script
cat > /home/privacyguard/backup-mongodb.sh << EOF
#!/bin/bash
BACKUP_DIR="/home/privacyguard/backups"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="mongodb_backup_$DATE"

mongodump --uri="$MONGODB_URI" --out=$BACKUP_DIR/$BACKUP_FILE
tar -czf $BACKUP_DIR/$BACKUP_FILE.tar.gz -C $BACKUP_DIR $BACKUP_FILE
rm -rf $BACKUP_DIR/$BACKUP_FILE

# Keep only last 7 days of backups
find $BACKUP_DIR -name "mongodb_backup_*.tar.gz" -mtime +7 -delete
EOF

chmod +x /home/privacyguard/backup-*.sh

# Schedule backups
(crontab -l 2>/dev/null; echo "0 2 * * * /home/privacyguard/backup-postgres.sh") | crontab -
(crontab -l 2>/dev/null; echo "0 3 * * * /home/privacyguard/backup-mongodb.sh") | crontab -
```

## Security Hardening

### 1. Firewall Configuration
```bash
# Configure UFW firewall
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow ssh
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw allow from your-trusted-ip to any port 3001
sudo ufw enable
```

### 2. SSL/TLS Setup
```bash
# Install Certbot for Let's Encrypt
sudo apt install certbot python3-certbot-nginx

# Obtain SSL certificate
sudo certbot --nginx -d api.your-domain.com

# Auto-renewal
sudo crontab -e
# Add: 0 12 * * * /usr/bin/certbot renew --quiet
```

## Troubleshooting

### Common Issues

#### 1. Application Won't Start
```bash
# Check logs
pm2 logs privacyguard-backend

# Check process status
pm2 status

# Restart application
pm2 restart privacyguard-backend
```

#### 2. Database Connection Issues
```bash
# Test PostgreSQL connection
psql -h $POSTGRES_HOST -U $POSTGRES_USER -d $POSTGRES_DB -c "SELECT version();"

# Test MongoDB connection
mongosh "$MONGODB_URI" --eval "db.adminCommand('ping')"

# Test Redis connection
redis-cli -h $REDIS_HOST -p $REDIS_PORT -a $REDIS_PASSWORD ping
```

#### 3. Performance Issues
```bash
# Monitor system resources
htop
iotop
netstat -tulpn

# Check application metrics
pm2 monit

# Analyze logs
tail -f /home/privacyguard/privacyguard/backend/logs/combined.log
```

## Maintenance

### Regular Maintenance Tasks
1. **Weekly**: Review logs and performance metrics
2. **Monthly**: Update dependencies and security patches
3. **Quarterly**: Review and rotate secrets
4. **Annually**: Review and update SSL certificates

### Update Procedure
```bash
# 1. Backup current version
cp -r /home/privacyguard/privacyguard /home/privacyguard/privacyguard.backup

# 2. Pull latest changes
cd /home/privacyguard/privacyguard/backend
git pull origin main

# 3. Install dependencies
npm ci --only=production

# 4. Run migrations
npm run migrate

# 5. Build application
npm run build

# 6. Restart application
pm2 restart privacyguard-backend

# 7. Verify deployment
curl -f http://localhost:3001/health
```

---

## Support

For deployment issues:
- Check application logs: `pm2 logs privacyguard-backend`
- Verify health endpoint: `curl http://localhost:3001/health`
- Review system resources: `pm2 monit`
- Check database connectivity using the test commands above

For additional support, refer to the [troubleshooting guide](./troubleshooting.md).