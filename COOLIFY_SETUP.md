# Coolify Deployment Guide for PrivacyGuard
## Domain: app.privacycomply.ai

### 1. Repository Setup in Coolify

1. **Add Repository**:
   - Go to Coolify dashboard
   - Add new resource → Git Repository
   - Repository URL: `https://github.com/Shamsejaz/PrivacyGuard.git`
   - Branch: `main`

2. **Application Type**:
   - Select "Docker Compose"
   - Docker Compose file: `docker-compose.yml`

### 2. Environment Variables Configuration

In Coolify, go to your application → Environment Variables and add these:

#### **Application Configuration**
```
NODE_ENV=production
DOMAIN=app.privacycomply.ai
FRONTEND_URL=https://app.privacycomply.ai
API_URL=https://app.privacycomply.ai/api/v1
WS_URL=wss://app.privacycomply.ai
```

#### **Security Configuration** (Generate secure passwords!)
```
JWT_SECRET=your_super_secure_jwt_secret_at_least_32_characters_long_2024
BCRYPT_ROUNDS=12
```

#### **Database Configuration**
```
POSTGRES_DB=privacyguard_prod
POSTGRES_USER=privacyguard_user
POSTGRES_PASSWORD=your_secure_postgres_password_123
POSTGRES_MAX_CONNECTIONS=50

MONGO_ROOT_USER=admin
MONGO_ROOT_PASSWORD=your_secure_mongo_password_456
MONGO_DB=privacyguard_prod

REDIS_PASSWORD=your_secure_redis_password_789
```

#### **CORS Configuration**
```
CORS_ORIGIN=https://app.privacycomply.ai,https://privacycomply.ai
```

#### **Logging Configuration**
```
LOG_LEVEL=info
LOG_CONSOLE=true
LOG_FILE=true
LOG_AUDIT=true
```

#### **Feature Flags**
```
PII_SERVICE_ENABLED=false
PII_SERVICE_URL=disabled
DEBUG_MODE=false
ENABLE_SWAGGER=false
SEED_DATA=true
```

#### **Rate Limiting**
```
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=1000
```

### 3. Domain Configuration

1. **Custom Domain**:
   - Go to Domains section in your Coolify application
   - Add domain: `app.privacycomply.ai`
   - Enable SSL certificate (Let's Encrypt)

2. **DNS Configuration**:
   - Point `app.privacycomply.ai` A record to your Coolify server IP
   - Optionally add `privacycomply.ai` CNAME to `app.privacycomply.ai`

### 4. Port Configuration

In Coolify application settings:
- **Frontend Port**: 80 (mapped to container port 80)
- **Backend Port**: 3001 (mapped to container port 3001)

### 5. Health Checks

Coolify will automatically use the health checks defined in docker-compose.yml:
- Frontend: `http://localhost:80/health`
- Backend: `http://localhost:3001/health`

### 6. Deployment Process

1. **Initial Deploy**:
   - Click "Deploy" in Coolify
   - Monitor logs for any issues
   - Wait for all services to be healthy

2. **Verify Deployment**:
   - Check all containers are running
   - Test frontend at `https://app.privacycomply.ai`
   - Test API at `https://app.privacycomply.ai/api/v1/health`

### 7. Post-Deployment

1. **Test Authentication**:
   - Go to `https://app.privacycomply.ai`
   - Try login with: `admin@privacyguard.local` / `admin123`

2. **Monitor Logs**:
   - Use Coolify's log viewer to monitor application logs
   - Check for any errors or warnings

### 8. Backup Configuration

Set up regular backups for:
- PostgreSQL database
- MongoDB database
- Application logs

### 9. Security Checklist

- ✅ All passwords changed from defaults
- ✅ JWT secret is unique and secure
- ✅ SSL certificate is active
- ✅ CORS is properly configured
- ✅ Rate limiting is enabled
- ✅ Debug mode is disabled in production

### 10. Troubleshooting

**Common Issues**:

1. **SSL Certificate Issues**:
   - Ensure DNS is pointing to correct IP
   - Wait for DNS propagation (up to 24 hours)

2. **Database Connection Issues**:
   - Check environment variables are set correctly
   - Verify database passwords match

3. **CORS Issues**:
   - Ensure CORS_ORIGIN includes your domain
   - Check protocol (http vs https)

4. **Authentication Issues**:
   - Verify API_URL is correct
   - Check JWT_SECRET is set
   - Ensure backend is accessible

**Useful Commands in Coolify**:
- View logs: Use Coolify's log viewer
- Restart services: Use Coolify's restart button
- Check environment: Environment Variables tab
- Monitor resources: Resources tab

### 11. Environment Variables Summary

Copy these to Coolify Environment Variables (update passwords!):

```env
NODE_ENV=production
DOMAIN=app.privacycomply.ai
FRONTEND_URL=https://app.privacycomply.ai
API_URL=https://app.privacycomply.ai/api/v1
WS_URL=wss://app.privacycomply.ai
POSTGRES_DB=privacyguard_prod
POSTGRES_USER=privacyguard_user
POSTGRES_PASSWORD=CHANGE_THIS_SECURE_PASSWORD_123
POSTGRES_MAX_CONNECTIONS=50
MONGO_ROOT_USER=admin
MONGO_ROOT_PASSWORD=CHANGE_THIS_SECURE_PASSWORD_456
MONGO_DB=privacyguard_prod
REDIS_PASSWORD=CHANGE_THIS_SECURE_PASSWORD_789
JWT_SECRET=CHANGE_THIS_SUPER_SECRET_JWT_KEY_AT_LEAST_32_CHARACTERS_LONG
BCRYPT_ROUNDS=12
CORS_ORIGIN=https://app.privacycomply.ai,https://privacycomply.ai
LOG_LEVEL=info
LOG_CONSOLE=true
LOG_FILE=true
LOG_AUDIT=true
PII_SERVICE_ENABLED=false
PII_SERVICE_URL=disabled
DEBUG_MODE=false
ENABLE_SWAGGER=false
SEED_DATA=true
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=1000
```

**Remember to change all passwords marked with "CHANGE_THIS"!**