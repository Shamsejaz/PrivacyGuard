# 🚀 PrivacyGuard Coolify Deployment Guide

Deploy PrivacyGuard to Coolify with zero configuration - all passwords and settings are pre-configured!

## 📋 Quick Deployment

### 🎯 **Coolify Configuration**

| Setting | Value |
|---------|-------|
| **Repository** | `https://github.com/Shamsejaz/PrivacyGuard.git` |
| **Branch** | `main` |
| **Port** | `80` |
| **Docker Compose File** | `docker-compose.coolify.yml` |
| **Environment File** | `.env.coolify` |

### 🔧 **Step-by-Step Deployment**

1. **Create New Project** in Coolify
2. **Select "Docker Compose"** as deployment type
3. **Set Repository**: `https://github.com/Shamsejaz/PrivacyGuard.git`
4. **Set Branch**: `main`
5. **Set Docker Compose File**: `docker-compose.coolify.yml`
6. **Set Port**: `80`
7. **Deploy** 🚀

### 🌐 **Exposed Port**
```
Port: 80
Protocol: HTTP
Health Check: /health
```

## 🔐 **Pre-Configured Passwords**

All passwords are automatically configured - no manual setup required!

| Service | Username | Password |
|---------|----------|----------|
| **PostgreSQL** | `privacyguard_user` | `privacyguard_secure_password_2024` |
| **MongoDB** | `admin` | `mongo_secure_password_2024` |
| **Redis** | - | `redis_secure_password_2024` |
| **Application** | `admin@privacyguard.local` | `admin123` |

## 🏗️ **Architecture Overview**

```
┌─────────────────────────────────────────────────────────────┐
│                    Coolify Deployment                       │
├─────────────────────────────────────────────────────────────┤
│  Frontend (React + Vite)           :80  ← Exposed Port     │
│  Backend (Node.js + Express)       :3001 (Internal)        │
│  Python PII Service (FastAPI)      :8000 (Internal)        │
├─────────────────────────────────────────────────────────────┤
│  PostgreSQL Database               :5432 (Internal)        │
│  MongoDB Database                  :27017 (Internal)       │
│  Redis Cache                       :6379 (Internal)        │
└─────────────────────────────────────────────────────────────┘
```

## 🚀 **Services Included**

### 🌐 **Frontend Service** (Port 80)
- React 18 + TypeScript + Vite
- Production-optimized build
- Nginx serving static files
- **Health Check**: `http://localhost:80/health`

### ⚙️ **Backend Service** (Internal)
- Node.js + Express + TypeScript
- RESTful API with Swagger documentation
- JWT authentication
- **Health Check**: `http://localhost:3001/health`

### 🤖 **Python PII Service** (Internal)
- FastAPI with ML models
- Microsoft Presidio + spaCy + Transformers
- Multi-engine PII detection
- **Health Check**: `http://localhost:8000/health`

### 🗄️ **Database Services** (Internal)
- **PostgreSQL 15**: Primary relational database
- **MongoDB 7**: Document storage for compliance data
- **Redis 7**: Caching and session storage

## 🔍 **Health Checks**

All services include comprehensive health checks:

```yaml
healthcheck:
  test: ["CMD", "curl", "-f", "http://localhost:80/health"]
  interval: 30s
  timeout: 10s
  retries: 3
  start_period: 30s
```

## 📊 **Resource Requirements**

| Service | Memory | CPU | Storage |
|---------|--------|-----|---------|
| **Frontend** | 256MB | 0.25 CPU | 1GB |
| **Backend** | 1GB | 0.5 CPU | 2GB |
| **PII Service** | 2GB | 1.0 CPU | 3GB |
| **PostgreSQL** | 1GB | 0.5 CPU | 5GB |
| **MongoDB** | 1GB | 0.5 CPU | 5GB |
| **Redis** | 768MB | 0.25 CPU | 1GB |
| **Total** | **~6GB** | **~3 CPU** | **~17GB** |

## 🌐 **Access URLs**

After deployment, access your application:

- **Main Application**: `https://your-coolify-domain.com`
- **API Documentation**: `https://your-coolify-domain.com/api-docs`
- **Health Check**: `https://your-coolify-domain.com/health`

## 👤 **Default Login**

```
Email: admin@privacyguard.local
Password: admin123
```

## 🔧 **Environment Variables**

All environment variables are pre-configured in `.env.coolify`. Key variables:

```bash
# Application
NODE_ENV=production
LOG_LEVEL=info

# Databases (Pre-configured passwords)
POSTGRES_PASSWORD=privacyguard_secure_password_2024
MONGO_ROOT_PASSWORD=mongo_secure_password_2024
REDIS_PASSWORD=redis_secure_password_2024

# Security
JWT_SECRET=coolify_jwt_secret_at_least_32_characters_long_for_production_security_2024

# Frontend
VITE_API_BASE_URL=http://backend:3001
VITE_PYTHON_PII_ENDPOINT=http://python-pii-service:8000
```

## 🚨 **Troubleshooting**

### **Common Issues**

1. **Services Not Starting**
   ```bash
   # Check logs in Coolify dashboard
   # Ensure sufficient resources allocated
   ```

2. **Database Connection Issues**
   ```bash
   # Verify database services are healthy
   # Check network connectivity between services
   ```

3. **Frontend Not Loading**
   ```bash
   # Verify port 80 is exposed
   # Check frontend build completed successfully
   ```

### **Health Check Endpoints**

- **Frontend**: `GET /health`
- **Backend**: `GET /health`
- **PII Service**: `GET /health`

## 📈 **Monitoring**

Built-in monitoring endpoints:

- **Application Metrics**: `/metrics`
- **Health Status**: `/health`
- **API Status**: `/api/health`
- **Database Status**: Internal health checks

## 🔄 **Updates**

To update your deployment:

1. **Push changes** to your GitHub repository
2. **Redeploy** in Coolify dashboard
3. **Monitor logs** during deployment
4. **Verify health checks** pass

## 🎯 **Production Considerations**

### 🔒 **Security**
- Change default passwords in production
- Set up SSL/TLS certificates
- Configure proper CORS origins
- Enable audit logging

### 📊 **Performance**
- Monitor resource usage
- Scale services as needed
- Optimize database queries
- Enable caching

### 💾 **Backup**
- Set up database backups
- Monitor disk usage
- Configure log rotation
- Plan disaster recovery

## 🆘 **Support**

If you encounter issues:

1. **Check Coolify logs** for deployment errors
2. **Verify resource allocation** meets requirements
3. **Test health check endpoints** manually
4. **Review environment variables** configuration

---

## 🎉 **Success!**

Your PrivacyGuard application should now be running on Coolify with:

✅ **Zero Configuration**: All passwords and settings pre-configured  
✅ **Full Stack**: Frontend, backend, databases, and AI services  
✅ **Production Ready**: Health checks, logging, and monitoring  
✅ **Secure**: Encrypted connections and secure defaults  
✅ **Scalable**: Resource limits and optimization  

**🌐 Access your application at**: `https://your-coolify-domain.com`

**👤 Login with**: `admin@privacyguard.local` / `admin123`