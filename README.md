# PrivacyGuard

PrivacyGuard is an enterprise PrivacyOps platform built with React, TypeScript, and Vite. The application provides comprehensive data privacy management capabilities including PII detection, data discovery, DSAR (Data Subject Access Request) processing, and compliance management.

## Features

- **Data Discovery & Classification**: AI-powered data discovery across databases, cloud storage, file systems, and SaaS applications
- **PII Detection**: Multi-engine PII detection using Microsoft Presidio, spaCy, and Transformers
- **DSAR Management**: Automated processing of Data Subject Access Requests (GDPR, CCPA, HIPAA, PDPL)
- **Risk Assessment**: Comprehensive risk scoring and compliance monitoring
- **Policy Management**: Privacy policy templates and compliance document management
- **PDPL Compliance**: Specialized tools for Personal Data Protection Law compliance

## Prerequisites

- Node.js 16+
- Python 3.8+ (for PII detection service)
- Docker and Docker Compose (optional, for containerized deployment)

## Quick Start with Docker

The easiest way to run PrivacyGuard is using Docker:

```bash
# Production deployment
docker-compose up --build

# Development environment with hot reloading
docker-compose -f docker-compose.dev.yml up --build
```

## Manual Installation

### Frontend Application

1. Install dependencies:
   ```bash
   npm install
   ```

2. Start the development server:
   ```bash
   npm run dev
   ```

3. Build for production:
   ```bash
   npm run build
   ```

### Python PII Detection Service

1. Navigate to the service directory:
   ```bash
   cd python_pii_service
   ```

2. Set up the service:
   ```bash
   # On Linux/Mac
   chmod +x setup.sh
   ./setup.sh
   
   # On Windows
   .\setup.ps1
   ```

3. Start the service:
   ```bash
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   python main.py
   ```

## Environment Configuration

Create a `.env` file based on `.env.example` and configure your API keys and service endpoints.

## Accessing the Application

- Frontend: http://localhost:5173 (development) or http://localhost (production)
- Python PII Service: http://localhost:8000
- API Documentation: http://localhost:8000/docs

## Docker Deployment

See [DOCKER.md](DOCKER.md) for detailed Docker deployment instructions.

## License

This project is licensed under the MIT License - see the LICENSE file for details.