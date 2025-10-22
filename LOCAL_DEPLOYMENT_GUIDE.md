# PrivacyGuard Local Deployment Guide

Deploy the complete PrivacyGuard application stack locally using Docker Desktop in just a few minutes.

## 🚀 Quick Start

### One-Command Deployment

**Linux/Mac:**
```bash
chmod +x deploy-local.sh
./deploy-local.sh
```

**Windows PowerShell:**
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
.\deploy-local.ps1
```

That's it! The script will automatically:
- ✅ Check prerequisites
- ✅ Pull and build Docker images
- ✅ Start all services in the correct order
- ✅ Set up databases with sample data
- ✅ Configure networking and health checks
- ✅ Start development tools

## 📋 Prerequisites

- **Docker Desktop** 4.0+ with at least 4GB RAM allocated
- **5GB free disk space** (for images and data)
- **Available ports**: 80, 3001, 5173, 5432, 6379, 8000, 8025, 8080-8082, 27017

## 🏗️ Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    PrivacyGuard Stack                       │
├─────────────────────────────────────────────────────────────┤
│  Frontend (React + Vite)           :5173                   │
│  Backend (Node.js + Express)       :3001                   │
│  Python PII Service (FastAPI)      :8000                   │
├─────────────────────────────────────────────────────────────┤
│  PostgreSQL Database               :5432                   │
│  MongoDB Database                  :27017                  │
│  Redis Cache                       :6379                   │
├─────────────────────────────────────────────────────────────┤
│  Adminer (PostgreSQL UI)           :8080                   │
│  Mongo Express (MongoDB UI)        :8081                   │
│  Redis Commander (Redis UI)        :8082                   │
│  Mailhog (Email Testing)           :8025                   │
│  Nginx Reverse Proxy (Optional)    :80                     │
└─────────────────────────────────────────────────────────────┘
```

## 🌐 Service URLs

Once deployed, access these URLs:

### 🎯 Main Application
- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:3001
- **API Documentation**: http://localhost:3001/api-docs
- **Python PII Service**: http://localhost:8000
- **PII Service Docs**: http://localhost:8000/docs

### 🛠️ Development Tools
- **Adminer (PostgreSQL)**: http://localhost:8080
- **Mongo Express**: http://localhost:8081
- **Redis Commander**: http://localhost:8082
- **Mailhog (Email)**: http://localhost:8025

### 👤 Default Login
- **Email**: `admin@privacyguard.local`
- **Password**: `admin123`

## 🔧 Management Commands

### Basic Operations
```bash
# Linux/Mac
./deploy-local.sh start     # Start services
./deploy-local.sh stop      # Stop services
./deploy-local.sh restart   # Restart services
./deploy-local.sh status    # Show status
./deploy-local.sh logs      # Show logs
./deploy-local.sh cleanup   # Full cleanup

# Windows
.\deploy-local.ps1 start
.\deploy-local.ps1 stop
.\deploy-local.ps1 restart
.\deploy-local.ps1 status
.\deploy-local.ps1 logs
.\deploy-local.ps1 cleanup
```

### Docker Compose Commands
```bash
# View all services
docker-compose -f docker-compose.local.yml ps

# View logs for specific service
docker-compose -f docker-compose.local.yml logs -f backend

# Restart specific service
docker-compose -f docker-compose.local.yml restart frontend

# Scale services (if needed)
docker-compose -f docker-compose.local.yml up -d --scale backend=2
```

### Database Access
```bash
# PostgreSQL shell
docker-compose -f docker-compose.local.yml exec postgres psql -U privacyguard_user -d privacyguard_local

# MongoDB shell
docker-compose -f docker-compose.local.yml exec mongodb mongosh privacyguard_local

# Redis CLI
docker-compose -f docker-compose.local.yml exec redis redis-cli
```

## 🗄️ Database Information

### PostgreSQL
- **Host**: localhost:5432
- **Database**: privacyguard_local
- **Username**: privacyguard_user
- **Password**: local_password_123

### MongoDB
- **Host**: localhost:27017
- **Database**: privacyguard_local
- **Admin Username**: admin
- **Admin Password**: local_admin_123

### Redis
- **Host**: localhost:6379
- **No authentication required**

## 📊 Sample Data

The deployment includes sample data for testing:

### Users
- **Admin User**: admin@privacyguard.local / admin123
- **DPO User**: dpo@privacyguard.local / admin123

### Compliance Findings
- S3 bucket encryption issues
- IAM overprivileged roles
- RDS logging disabled

### DSAR Requests
- Sample access requests
- Sample erasure requests

### GDPR Data
- Customer data processing activities
- Employee data processing activities

## 🔍 Testing Features

### 1. Compliance Dashboard
- Navigate to http://localhost:5173
- Login with admin credentials
- View compliance findings and risk scores

### 2. DSAR Management
- Go to DSAR section
- View sample requests
- Test request processing workflow

### 3. PII Detection
- Access PII service at http://localhost:8000/docs
- Test with sample text containing PII
- View detection results and confidence scores

### 4. Risk Assessment
- Create new risk assessments
- Generate DPIA reports
- Export compliance reports

### 5. Policy Management
- Manage privacy policies
- Track policy versions
- Generate policy reports

## 🧪 Development Workflow

### Hot Reloading
- **Frontend**: Vite dev server with HMR
- **Backend**: Nodemon for automatic restarts
- **Changes reflect immediately**

### Code Changes
1. Edit source code in your IDE
2. Changes are automatically detected
3. Services restart/reload as needed
4. Refresh browser to see changes

### Adding New Features
1. Modify source code
2. Test in local environment
3. Use development tools for debugging
4. Check logs for any issues

## 🐛 Troubleshooting

### Common Issues

**Port Already in Use**
```bash
# Find process using port
netstat -tulpn | grep :5173  # Linux
netstat -ano | findstr :5173  # Windows

# Kill process or change port in docker-compose.local.yml
```

**Services Not Starting**
```bash
# Check Docker Desktop is running
docker info

# Check service logs
docker-compose -f docker-compose.local.yml logs backend

# Restart specific service
docker-compose -f docker-compose.local.yml restart backend
```

**Database Connection Issues**
```bash
# Check database health
docker-compose -f docker-compose.local.yml exec postgres pg_isready

# Reset database
docker-compose -f docker-compose.local.yml down -v
./deploy-local.sh deploy
```

**PII Service Taking Long to Start**
```bash
# PII service downloads ML models on first run (2-3 minutes)
docker-compose -f docker-compose.local.yml logs -f python-pii-service

# Wait for "Application startup complete" message
```

**Frontend Build Issues**
```bash
# Clear node_modules and rebuild
docker-compose -f docker-compose.local.yml down
docker-compose -f docker-compose.local.yml build --no-cache frontend
docker-compose -f docker-compose.local.yml up -d
```

### Performance Optimization

**Increase Docker Resources**
- Docker Desktop → Settings → Resources
- Allocate at least 4GB RAM
- Allocate 2+ CPU cores

**Clean Up Unused Resources**
```bash
# Remove unused images and containers
docker system prune -a

# Remove unused volumes
docker volume prune
```

## 🔒 Security Notes

### Development Environment
- Uses development secrets (not for production)
- Debug mode enabled
- CORS configured for local development
- Sample data includes test credentials

### Production Deployment
- Change all default passwords
- Use environment-specific secrets
- Enable proper authentication
- Configure production CORS settings
- Use HTTPS with proper certificates

## 📈 Monitoring

### Health Checks
All services include health checks:
- **Frontend**: HTTP GET /
- **Backend**: HTTP GET /health
- **PII Service**: HTTP GET /health
- **Databases**: Native health checks

### Logs
```bash
# View all logs
docker-compose -f docker-compose.local.yml logs -f

# View specific service logs
docker-compose -f docker-compose.local.yml logs -f backend

# Follow logs in real-time
docker-compose -f docker-compose.local.yml logs -f --tail=100
```

### Metrics
- Container resource usage via Docker Desktop
- Application metrics via backend /metrics endpoint
- Database performance via management UIs

## 🚀 Next Steps

### Production Deployment
1. Review security configurations
2. Set up proper CI/CD pipeline
3. Configure production databases
4. Set up monitoring and alerting
5. Implement backup strategies

### AWS Integration
1. Configure AWS credentials in .env.local
2. Test Bedrock integration
3. Set up S3 for report storage
4. Configure DynamoDB for findings

### Customization
1. Modify docker-compose.local.yml for your needs
2. Add custom environment variables
3. Configure additional services
4. Set up custom domains

---

**🎉 You're all set!** PrivacyGuard is now running locally with full functionality. Start exploring the compliance features and building your privacy management workflows.