# 🛡️ PrivacyComply - Enterprise PrivacyOps Platform

<div align="center">

![PrivacyComply Logo](https://via.placeholder.com/200x80/4A90E2/FFFFFF?text=PrivacyComply)

**AI-Powered Privacy Compliance Management Platform**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen)](https://nodejs.org/)
[![Python Version](https://img.shields.io/badge/python-%3E%3D3.9-blue)](https://python.org/)
[![Docker](https://img.shields.io/badge/docker-supported-blue)](https://docker.com/)
[![AWS](https://img.shields.io/badge/AWS-integrated-orange)](https://aws.amazon.com/)

[🚀 Quick Start](#-quick-start) • [📖 Documentation](#-documentation) • [🏗️ Architecture](#️-architecture) • [🤝 Contributing](#-contributing)

</div>

---

## 📋 Table of Contents

- [🌟 Overview](#-overview)
- [✨ Key Features](#-key-features)
- [🏗️ Architecture](#️-architecture)
- [🚀 Quick Start](#-quick-start)
- [🐳 Docker Deployment](#-docker-deployment)
- [☁️ AWS Deployment](#️-aws-deployment)
- [🔧 Manual Installation](#-manual-installation)
- [⚙️ Configuration](#️-configuration)
- [🧪 Testing](#-testing)
- [📖 Documentation](#-documentation)
- [🤖 AI Agent](#-ai-agent)
- [🔒 Security](#-security)
- [📊 Monitoring](#-monitoring)
- [🤝 Contributing](#-contributing)
- [📄 License](#-license)

## 🚫 Fork Policy Notice

**⚠️ FORKING IS DISABLED** - This is proprietary software. See [FORK-POLICY.md](FORK-POLICY.md) for details.

## 🌟 Overview

PrivacyComply is a comprehensive, enterprise-grade PrivacyOps platform that leverages AI to automate privacy compliance management. Built with modern technologies and designed for scalability, it helps organizations manage GDPR, CCPA, HIPAA, and PDPL compliance requirements through intelligent automation and real-time monitoring.

### 🎯 Target Users
- **Privacy Officers & DPOs**: Comprehensive compliance management
- **Compliance Teams**: Automated risk assessment and reporting
- **IT Security Teams**: Data discovery and classification
- **Legal Teams**: Policy management and audit trails
- **Data Subjects**: Self-service DSAR portal

### 🌍 Global Compliance
- **🇪🇺 GDPR**: European Union General Data Protection Regulation
- **🇺🇸 CCPA**: California Consumer Privacy Act
- **🏥 HIPAA**: Health Insurance Portability and Accountability Act
- **🇸🇬 PDPL**: Singapore Personal Data Protection Law

## ✨ Key Features

### 🔍 **AI-Powered Data Discovery**
- **Multi-Source Scanning**: Databases, cloud storage, file systems, SaaS applications
- **Intelligent Classification**: ML-powered data categorization and sensitivity scoring
- **Real-Time Monitoring**: Continuous data discovery with automated alerts
- **Visual Data Mapping**: Interactive data flow visualization and lineage tracking

### 🤖 **Advanced PII Detection**
- **Multi-Engine Analysis**: Microsoft Presidio, spaCy, Transformers, and custom models
- **99%+ Accuracy**: Enterprise-grade detection with minimal false positives
- **50+ PII Types**: Email, phone, SSN, credit cards, medical records, and more
- **Custom Patterns**: Configurable detection rules for organization-specific data

### 📋 **DSAR Management**
- **Automated Processing**: End-to-end DSAR workflow automation
- **Multi-Regulation Support**: GDPR, CCPA, HIPAA, PDPL compliance
- **Self-Service Portal**: User-friendly interface for data subjects
- **SLA Tracking**: Automated deadline monitoring and escalation

### 📊 **Risk Assessment & Analytics**
- **Real-Time Risk Scoring**: Dynamic risk calculation based on multiple factors
- **Compliance Dashboards**: Executive and operational dashboards
- **Predictive Analytics**: AI-powered compliance trend analysis
- **Automated Reporting**: DPIA, ROPA, and audit report generation

### 🔐 **Policy Management**
- **Template Library**: Pre-built privacy policy templates
- **Version Control**: Policy change tracking and approval workflows
- **Impact Assessment**: Automated policy impact analysis
- **Compliance Mapping**: Regulation-to-policy alignment tracking

### 🌐 **Multi-Region Support**
- **Data Residency**: Region-specific data storage and processing
- **Local Compliance**: Country-specific regulation support
- **Cross-Border Transfers**: Automated adequacy decision tracking
- **Global Dashboards**: Unified view across all regions

## 🏗️ Architecture

### 🖥️ **Frontend Stack**
```
React 18 + TypeScript + Vite
├── 🎨 Tailwind CSS (Styling)
├── 📊 Chart.js (Analytics)
├── 🔗 Axios (HTTP Client)
├── 🎯 Lucide React (Icons)
└── 🔄 React Context (State Management)
```

### ⚙️ **Backend Stack**
```
Node.js + Express + TypeScript
├── 🗄️ PostgreSQL (Primary Database)
├── 📄 MongoDB (Document Storage)
├── ⚡ Redis (Caching)
├── 🔐 JWT (Authentication)
└── 📝 Winston (Logging)
```

### 🤖 **AI/ML Services**
```
Python FastAPI + Machine Learning
├── 🧠 Microsoft Presidio (PII Detection)
├── 📝 spaCy (NLP Processing)
├── 🤖 Transformers (BERT Models)
├── ☁️ Amazon Bedrock (Claude 3 Sonnet)
└── 🔬 SageMaker (Custom Models)
```

### ☁️ **AWS Integration**
```
Serverless Architecture
├── 🚀 Lambda Functions (Compute)
├── 🌐 API Gateway (API Management)
├── 📊 DynamoDB (NoSQL Database)
├── 🗄️ S3 (Object Storage)
├── 🔒 KMS (Encryption)
├── 🔐 Secrets Manager (Configuration)
├── 📈 CloudWatch (Monitoring)
└── 🛡️ WAF (Security)
```

## 🚀 Quick Start

### 🐳 **Docker (Recommended)**
Get up and running in 5 minutes:

```bash
# Clone the repository
git clone https://github.com/PrivacyComply/PrivacyComply.git
cd PrivacyComply

# Start with Docker Compose
docker-compose -f docker-compose.local.yml up --build

# Or use the deployment script
chmod +x deploy-local.sh
./deploy-local.sh
```

**🌐 Access URLs:**
- Frontend: http://localhost:5173
- Backend API: http://localhost:3001
- PII Service: http://localhost:8000
- Database UI: http://localhost:8080

**👤 Demo Credentials (Mock Authentication):**
- **Admin**: `admin@privacycomply.com` / `Admin123!@#`
- **DPO**: `dpo@privacycomply.com` / `DPO123!@#`
- **Compliance**: `compliance@privacycomply.com` / `Compliance123!@#`
- **Legal**: `legal@privacycomply.com` / `Legal123!@#`
- **Business**: `business@privacycomply.com` / `Business123!@#`

> 🎭 **Mock Mode**: The application runs in mock authentication mode by default for development, no backend API required!

### ☁️ **AWS Deployment**
Deploy to AWS in minutes:

```bash
# Setup AWS environment
chmod +x setup-aws-env.sh
./setup-aws-env.sh

# Run comprehensive tests
node run-aws-tests.js

# Deploy with CDK
cd infrastructure/aws-cdk
npm install
npm run deploy:prod
```

## 🐳 Docker Deployment

### 🚀 **Local Development**
Complete development environment with hot reloading:

```bash
# Full stack with databases and tools
./deploy-local.sh

# Or manually with Docker Compose
docker-compose -f docker-compose.local.yml up --build
```

**Includes:**
- ✅ Frontend (React + Vite) with hot reload
- ✅ Backend (Node.js + Express) with nodemon
- ✅ Python PII Service (FastAPI)
- ✅ PostgreSQL + Adminer UI
- ✅ MongoDB + Mongo Express UI
- ✅ Redis + Redis Commander UI
- ✅ Mailhog (Email testing)

### 🏭 **Production Deployment**
Production-ready containers with optimizations:

```bash
# Production deployment
docker-compose up --build

# With custom configuration
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up --build
```

### 🛠️ **Development Tools**
Access development tools:

```bash
# Start with development tools
docker-compose -f docker-compose.local.yml --profile tools up -d

# Individual tool access
docker-compose -f docker-compose.local.yml exec postgres psql -U PrivacyComply_user
docker-compose -f docker-compose.local.yml exec mongodb mongosh PrivacyComply_local
docker-compose -f docker-compose.local.yml exec redis redis-cli
```

## 🎭 Mock Authentication Mode

For development and testing, PrivacyComply includes a built-in mock authentication system that works without any backend API.

### 🚀 **Quick Setup**

1. **Start the frontend only:**
   ```bash
   npm install
   npm run dev
   ```

2. **Use demo credentials:**
   - **DPO User**: `dpo@privacycomply.com` / `DPO123!@#`
   - **Compliance User**: `compliance@privacycomply.com` / `Compliance123!@#`
   - **Admin User**: `admin@privacycomply.com` / `Admin123!@#`

3. **Access compliance frameworks:**
   - Log in with DPO or Compliance credentials
   - Navigate to "Compliance Frameworks" in the sidebar
   - Access GDPR, PDPL, HIPAA, and CCPA compliance tools

### ⚙️ **Configuration**

Mock authentication is enabled by default through `.env.development`:

```bash
# Disable backend API calls
VITE_API_BASE_URL=http://mock-disabled:9999
VITE_API_URL=http://mock-disabled:9999
VITE_WS_URL=ws://mock-disabled:9999
```

### 🔧 **Switching to Real Backend**

To use a real backend API, update your `.env.local`:

```bash
VITE_API_BASE_URL=http://localhost:3001
VITE_API_URL=http://localhost:3001
VITE_WS_URL=ws://localhost:3001
```

## ☁️ AWS Deployment

### 🤖 **AI Agent Testing**
Test AWS Bedrock integration:

```bash
# Setup AWS credentials and test environment
./setup-aws-env.sh

# Run comprehensive AI agent tests
node run-aws-tests.js

# Expected results:
# ✅ Bedrock connectivity
# ✅ Claude 3 Sonnet integration
# ✅ Compliance analysis
# ✅ Report generation
# ✅ Natural language queries
```

### 🏗️ **Infrastructure Deployment**
Deploy with AWS CDK:

```bash
# Navigate to CDK directory
cd infrastructure/aws-cdk

# Install dependencies
npm install

# Deploy development environment
npm run deploy:dev

# Deploy production environment
npm run deploy:prod

# Deploy multi-region (GDPR/PDPL compliance)
npm run deploy:multi-region
```

### 🌍 **Multi-Region Architecture**
- **🇺🇸 US East 1**: Primary region (all services)
- **🇪🇺 EU West 1**: GDPR compliance region
- **🇸🇬 AP Southeast 1**: PDPL compliance region

## 🔧 Manual Installation

### 📋 **Prerequisites**
- Node.js 18+ and npm
- Python 3.9+ and pip
- PostgreSQL 13+
- MongoDB 5+
- Redis 6+

### 🖥️ **Frontend Setup**

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Run linting
npm run lint
```

### ⚙️ **Backend Setup**

```bash
# Navigate to backend
cd backend

# Install dependencies
npm install

# Setup environment
cp .env.example .env

# Run database migrations
npm run migrate

# Seed sample data
npm run seed

# Start development server
npm run dev

# Build for production
npm run build

# Start production server
npm start
```

### 🐍 **Python PII Service Setup**

```bash
# Navigate to service directory
cd python_pii_service

# Setup virtual environment
python -m venv venv

# Activate virtual environment
source venv/bin/activate  # Linux/Mac
# or
venv\Scripts\activate     # Windows

# Install dependencies
pip install -r requirements.txt

# Download ML models
python -m spacy download en_core_web_sm
python -m spacy download en_core_web_lg

# Start service
python main.py
```

## ⚙️ Configuration

### 🔐 **Environment Variables**

Create `.env` files for each service:

**Frontend (`.env`):**
```bash
VITE_API_BASE_URL=http://localhost:3001
VITE_WS_URL=ws://localhost:3001
VITE_PYTHON_PII_ENDPOINT=http://localhost:8000
VITE_APP_NAME=PrivacyComply
VITE_APP_VERSION=1.0.0
```

**Backend (`backend/.env`):**
```bash
NODE_ENV=development
PORT=3001
DATABASE_URL=postgresql://user:password@localhost:5432/PrivacyComply
MONGODB_URI=mongodb://localhost:27017/PrivacyComply
REDIS_URL=redis://localhost:6379
JWT_SECRET=your-super-secret-jwt-key
BCRYPT_ROUNDS=12
```

**AWS Configuration (`.env.aws`):**
```bash
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
BEDROCK_MODEL_ID=anthropic.claude-3-sonnet-20240229-v1:0
S3_REPORTS_BUCKET=PrivacyComply-reports
DYNAMODB_TABLE_NAME=PrivacyComply-compliance-findings
```

### 🗄️ **Database Configuration**

**PostgreSQL Setup:**
```sql
-- Create database and user
CREATE DATABASE PrivacyComply;
CREATE USER PrivacyComply_user WITH PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE PrivacyComply TO PrivacyComply_user;

-- Run migrations
npm run migrate
```

**MongoDB Setup:**
```javascript
// Create collections and indexes
use PrivacyComply;
db.createCollection('users');
db.createCollection('complianceFindings');
db.createCollection('dsarRequests');

// Create indexes
db.users.createIndex({ email: 1 }, { unique: true });
db.complianceFindings.createIndex({ resourceArn: 1 });
db.dsarRequests.createIndex({ status: 1 });
```

## 🧪 Testing

### 🔬 **Test Suites**

```bash
# Frontend tests
npm test
npm run test:coverage
npm run test:e2e

# Backend tests
cd backend
npm test
npm run test:integration
npm run test:load

# Python service tests
cd python_pii_service
python -m pytest tests/
python -m pytest tests/ --cov=.

# AWS integration tests
node run-aws-tests.js
```

### 📊 **Test Coverage**
- **Frontend**: 85%+ coverage target
- **Backend**: 90%+ coverage target
- **Python Service**: 95%+ coverage target
- **Integration**: End-to-end workflow testing

### 🚀 **Performance Testing**

```bash
# Load testing with Artillery
npm install -g artillery
artillery run tests/load/api-load-test.yml

# Stress testing
artillery run tests/load/stress-test.yml

# AWS Bedrock performance testing
node tests/performance/bedrock-performance.js
```

## 📖 Documentation

### 🚀 **Quick Start Guides**
| Guide | Description | Audience |
|-------|-------------|----------|
| [🐳 Local Deployment Guide](./LOCAL_DEPLOYMENT_GUIDE.md) | Docker-based local setup | Developers |
| [☁️ AWS Quick Start](./AWS_QUICK_START.md) | 15-minute AWS deployment | DevOps |
| [🧪 AWS Testing Guide](./AWS_TESTING_GUIDE.md) | Comprehensive AWS testing | QA Engineers |

### 🏗️ **Architecture & Design**
| Document | Description | Audience |
|----------|-------------|----------|
| [🏗️ AWS Architecture Diagrams](./AWS_ARCHITECTURE_DIAGRAMS.md) | Complete architecture overview | Architects |
| [📋 AWS Integration Roadmap](./AWS_INTEGRATION_ROADMAP.md) | Implementation phases | Project Managers |
| [🔧 API Integration Guide](./API_INTEGRATION_GUIDE.md) | Complete integration guide | Developers |

### 🔧 **Development & Operations**
| Resource | Description | Audience |
|----------|-------------|----------|
| [📚 Documentation Index](./DOCUMENTATION_INDEX.md) | Complete documentation overview | All Users |
| [🚀 Deployment Guide](./DEPLOYMENT_GUIDE.md) | Production deployment procedures | DevOps |
| [🛠️ System Administration Guide](./SYSTEM_ADMINISTRATION_GUIDE.md) | Complete admin procedures | SysAdmins |
| [📊 Operational Runbook](./OPERATIONAL_RUNBOOK.md) | Daily operations and incident response | Operations |
| [🔍 Troubleshooting Guide](./TROUBLESHOOTING_GUIDE.md) | Common issues and solutions | Support |

### 📋 **API & Integration**
| Documentation | Description | Audience |
|---------------|-------------|----------|
| [📖 API Documentation](./API_DOCUMENTATION.md) | Full API reference | Developers |
| [🔗 Integration Summary](./INTEGRATION_SUMMARY.md) | System integration overview | Architects |
| [🧪 Deployment Testing Guide](./DEPLOYMENT_TESTING_GUIDE.md) | Testing procedures | QA Engineers |

## 🤖 AI Agent

### 🧠 **Claude 3 Sonnet Integration**
PrivacyComply leverages Amazon Bedrock with Claude 3 Sonnet for advanced compliance reasoning:

```javascript
// Example: AI-powered compliance analysis
const analysis = await bedrockService.analyzeComplianceFindings([
  {
    resourceArn: 'arn:aws:s3:::customer-data-bucket',
    findingType: 'ENCRYPTION',
    severity: 'HIGH',
    description: 'S3 bucket not encrypted at rest'
  }
]);

console.log(analysis);
// Output:
// {
//   riskScore: 85,
//   recommendations: [
//     'Enable S3 server-side encryption with KMS',
//     'Implement bucket policies for encryption enforcement'
//   ],
//   legalMappings: [
//     { regulation: 'GDPR', article: 'Article 32', applicability: 0.95 }
//   ]
// }
```

### 🔍 **Natural Language Queries**
Ask complex compliance questions in plain English:

```javascript
const response = await bedrockService.processComplianceQuery(
  "What are my GDPR obligations for customer email addresses?",
  { dataTypes: ['email'], regions: ['EU'] }
);
```

### 📊 **Automated Report Generation**
Generate compliance reports with AI:

```javascript
const report = await bedrockService.generateComplianceReport('DPIA', {
  organization: 'Healthcare Provider',
  dataProcessingActivities: [...],
  riskFactors: [...]
});
```

## 🔒 Security

### 🛡️ **Security Features**
- **🔐 End-to-End Encryption**: All data encrypted in transit and at rest
- **🔑 Multi-Factor Authentication**: TOTP and SMS-based 2FA
- **👤 Role-Based Access Control**: Granular permissions system
- **📝 Audit Logging**: Comprehensive activity tracking
- **🔒 Zero-Trust Architecture**: Assume breach security model

### 🔐 **Data Protection**
- **🗄️ Database Encryption**: AES-256 encryption for all databases
- **☁️ Cloud Security**: AWS KMS for key management
- **🔄 Backup Encryption**: Encrypted backups with rotation
- **🌐 Network Security**: VPC isolation and security groups

### 🛡️ **Compliance Certifications**
- **SOC 2 Type II**: Security and availability controls
- **ISO 27001**: Information security management
- **GDPR Compliant**: European data protection standards
- **HIPAA Ready**: Healthcare data protection controls

## 📊 Monitoring

### 📈 **Observability Stack**
- **📊 Metrics**: Prometheus + Grafana dashboards
- **📝 Logging**: Structured logging with ELK stack
- **🔍 Tracing**: Distributed tracing with Jaeger
- **🚨 Alerting**: PagerDuty integration for incidents

### 🎯 **Key Metrics**
- **⚡ Performance**: API response times, throughput
- **🔍 Accuracy**: PII detection precision and recall
- **📊 Usage**: Active users, scan volumes, DSAR processing
- **🛡️ Security**: Failed login attempts, suspicious activities

### 📱 **Real-Time Dashboards**
- **Executive Dashboard**: High-level compliance metrics
- **Operational Dashboard**: System health and performance
- **Security Dashboard**: Threat detection and response
- **Compliance Dashboard**: Regulation-specific metrics

## 🤝 Contributing

We welcome contributions from the community! Here's how to get started:

### 🚀 **Getting Started**

1. **Fork the repository**
   ```bash
   git clone https://github.com/your-username/PrivacyComply.git
   cd PrivacyComply
   ```

2. **Set up development environment**
   ```bash
   ./deploy-local.sh
   ```

3. **Create a feature branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

4. **Make your changes and test**
   ```bash
   npm test
   npm run test:integration
   ```

5. **Submit a pull request**

### 📋 **Development Guidelines**
- **Code Style**: Follow ESLint and Prettier configurations
- **Testing**: Maintain 85%+ test coverage
- **Documentation**: Update docs for new features
- **Security**: Follow secure coding practices

### 🐛 **Bug Reports**
Found a bug? Please create an issue with:
- **Environment details** (OS, Node.js version, etc.)
- **Steps to reproduce** the issue
- **Expected vs actual behavior**
- **Screenshots** if applicable

### 💡 **Feature Requests**
Have an idea? We'd love to hear it! Please include:
- **Use case description**
- **Proposed solution**
- **Alternative approaches considered**
- **Implementation complexity estimate**

## 📞 Support

### 🆘 **Getting Help**
| Type | Contact | Response Time |
|------|---------|---------------|
| 🐛 **Bug Reports** | [GitHub Issues](https://github.com/PrivacyComply/PrivacyComply/issues) | 24-48 hours |
| 💬 **General Questions** | [Discussions](https://github.com/PrivacyComply/PrivacyComply/discussions) | 1-3 days |
| 🔒 **Security Issues** | security@PrivacyComply.com | 4-8 hours |
| 🏢 **Enterprise Support** | enterprise@PrivacyComply.com | 2-4 hours |

### 📚 **Additional Resources**
- **📖 Wiki**: Comprehensive guides and tutorials
- **🎥 Video Tutorials**: Step-by-step walkthroughs
- **📱 Community Slack**: Real-time community support
- **📧 Newsletter**: Monthly updates and best practices

## 📄 License

This project is licensed under the **MIT License** - see the [LICENSE](LICENSE) file for details.

### 🤝 **Third-Party Licenses**
- **React**: MIT License
- **Node.js**: MIT License
- **Python**: PSF License
- **PostgreSQL**: PostgreSQL License
- **MongoDB**: SSPL License

---

<div align="center">

**Made with ❤️ by the PrivacyComply Team**

[🌟 Star us on GitHub](https://github.com/PrivacyComply/PrivacyComply) • [🐦 Follow on Twitter](https://twitter.com/PrivacyComply) • [💼 LinkedIn](https://linkedin.com/company/PrivacyComply)

</div>
