# PrivacyGuard Application Audit

## Overview

PrivacyGuard is an enterprise PrivacyOps platform built with React, TypeScript, and Vite. The application provides comprehensive data privacy management capabilities including PII detection, data discovery, DSAR (Data Subject Access Request) processing, and compliance management.

## Application Architecture

### Frontend
- **Framework**: React with TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS
- **UI Components**: Custom component library with Lucide React icons
- **State Management**: React Context API
- **Routing**: Client-side routing with React Router patterns

### Backend Services
- **Primary PII Detection**: Python service using multiple NLP engines
  - Microsoft Presidio
  - spaCy
  - Transformers (BERT-based models)
- **Alternative PII Detection**: Google Cloud DLP API
- **Database Support**: MySQL, PostgreSQL, MongoDB
- **Cloud Storage**: AWS S3, Azure Blob Storage, Google Cloud Storage
- **File Processing**: PDF, DOCX, image files via Tesseract OCR

## Core Features

### 1. Authentication & User Management
- Role-based access control (Admin, DPO, Compliance, Legal, Business)
- Mock authentication system (localStorage-based)
- User session management

### 2. Data Discovery & Classification
- Multi-source data scanning:
  - Databases (MySQL, PostgreSQL, MongoDB, Oracle, SQL Server)
  - Cloud storage (AWS S3, Azure Blob, Google Cloud Storage)
  - File systems (local/network shares)
  - SaaS applications (Salesforce, HubSpot, Microsoft 365, Google Workspace)
- Automated PII classification
- Risk scoring and assessment
- Real-time scanning progress tracking

### 3. PII Detection Engines
- **Hybrid Detection**: Combines multiple engines for maximum accuracy
- **Microsoft Presidio**: Enterprise-grade PII detection
- **spaCy**: Fast NLP with named entity recognition
- **Transformers**: BERT-based context-aware detection
- **Google Cloud DLP**: Alternative commercial solution

### 4. Data Subject Access Requests (DSAR)
- Automated request processing
- Multi-regulation support (GDPR, CCPA, HIPAA, PDPL)
- Request lifecycle management (pending, processing, completed, rejected, expired)
- Identity verification workflows
- Communication tracking
- Progress monitoring

### 5. Risk Assessment
- Comprehensive risk scoring across multiple regulations
- Data flow mapping
- Vendor risk management
- Incident response tracking

### 6. Policy Management
- Privacy policy templates
- Compliance document management
- Version control for policies
- Multi-language support

### 7. PDPL (Personal Data Protection Law) Compliance
- Consent management
- Cross-border transfer tracking
- Data retention policy engine
- Compliance matrix

## Technical Implementation

### Project Structure
```
src/
├── components/          # React components organized by feature
├── contexts/           # React context providers
├── services/           # API service integrations
├── types/              # TypeScript interfaces and types
├── utils/              # Utility functions
├── App.tsx             # Main application component
└── main.tsx            # Application entry point
```

### Key Services
1. **DLP Service** (`dlpService.ts`): Integration with Google Cloud DLP API
2. **Python PII Service** (`pythonPIIService.ts`): Client for Python-based PII detection
3. **Database Scanner** (`databaseScanner.ts`): Database connection and scanning
4. **PDF Service** (`pdfService.ts`): PDF document processing
5. **Office Document Service** (`officeDocumentService.ts`): DOCX and other office document processing
6. **Tesseract Service** (`tesseractService.ts`): OCR processing for images

### Data Models
- **User**: Authentication and role management
- **DataSource**: Data source configuration and status
- **DSARRequest**: Data subject access request tracking
- **RiskScore**: Compliance risk assessment
- **PolicyDocument**: Privacy policy and compliance documents
- **ComplianceTask**: Task management for compliance activities

### Environment Configuration
The application uses environment variables for configuration:
- `VITE_GOOGLE_CLOUD_API_KEY`: Google Cloud DLP API key
- `VITE_GOOGLE_CLOUD_PROJECT_ID`: Google Cloud project ID
- `VITE_PYTHON_PII_ENDPOINT`: Python PII service endpoint

## Python PII Detection Service

Located in `python_pii_service/` directory:
- **FastAPI** backend service
- **Multiple Detection Engines**:
  - Presidio Analyzer and Anonymizer
  - spaCy NLP
  - Transformers (BERT NER)
- **Hybrid Mode**: Consolidates results from all engines
- **Benchmarking**: Performance comparison between engines
- **RESTful API**: Standardized endpoints for integration

## Security Considerations

1. **Credential Management**: 
   - API keys stored in environment variables
   - Database credentials encrypted at rest
   - OAuth for SaaS integrations

2. **Data Protection**:
   - PII detection and redaction
   - Secure data transmission
   - Access logging and audit trails

3. **Compliance**:
   - Multi-regulation support
   - Automated compliance checks
   - Reporting capabilities

## Deployment Requirements

### Frontend
- Node.js 16+
- npm or yarn package manager
- Modern web browser

### Python PII Service
- Python 3.8+
- 4GB+ RAM (for Transformers models)
- Internet connection (for initial model downloads)

### Optional Services
- Google Cloud account with DLP API enabled
- Database servers (MySQL, PostgreSQL, MongoDB)
- Cloud storage accounts (AWS, Azure, Google Cloud)

## Development Setup

1. Install frontend dependencies:
   ```bash
   npm install
   ```

2. Set up Python PII service:
   ```bash
   cd python_pii_service
   ./setup.sh  # or setup.ps1 on Windows
   ```

3. Configure environment variables:
   - Copy `.env.example` to `.env`
   - Update with your API keys and service endpoints

4. Start development servers:
   ```bash
   # Frontend
   npm run dev
   
   # Python service
   cd python_pii_service
   python main.py
   ```

## API Endpoints

### Python PII Service
- `GET /health`: Service health check
- `POST /analyze/presidio`: Presidio-based analysis
- `POST /analyze/spacy`: spaCy-based analysis
- `POST /analyze/transformers`: Transformers-based analysis
- `POST /analyze/hybrid`: Combined analysis
- `POST /benchmark`: Performance benchmarking

## Future Enhancements

1. **Vendor Risk Management**: Third-party vendor assessment
2. **Incident Response**: Automated incident detection and response
3. **Compliance Management**: Comprehensive compliance tracking
4. **Advanced Analytics**: Enhanced reporting and dashboarding
5. **Mobile Application**: Mobile interface for on-the-go access

## Testing

The application includes:
- Component testing with Jest/React Testing Library
- End-to-end testing with Cypress
- Integration testing for API services
- Performance benchmarking for PII detection engines

## License

This project is licensed under the MIT License - see the LICENSE file for details.