# Project Structure & Organization

## Root Directory Structure

```
├── src/                    # Frontend React application
├── python_pii_service/     # Python FastAPI PII detection service
├── docker-compose.yml      # Production Docker configuration
├── docker-compose.dev.yml  # Development Docker configuration
├── Dockerfile              # Frontend container
├── Dockerfile.python       # Python service container
├── package.json            # Frontend dependencies and scripts
└── vite.config.ts          # Vite build configuration
```

## Frontend Architecture (`src/`)

### Component Organization
```
src/
├── components/
│   ├── analytics/          # Analytics dashboard components
│   ├── auth/              # Authentication components (LoginForm)
│   ├── dashboard/         # Main dashboard widgets
│   ├── data-discovery/    # Data discovery and classification
│   ├── dsar/              # Data Subject Access Request management
│   │   ├── portal/        # User-facing DSAR portal
│   │   └── admin/         # Admin DSAR management
│   ├── layout/            # Layout components (Sidebar, Header)
│   ├── gdpr/              # GDPR compliance management
│   ├── pdpl/              # PDPL compliance tools
│   ├── policy-management/ # Privacy policy management
│   ├── risk-assessment/   # Risk assessment tools
│   ├── settings/          # Application settings
│   └── ui/                # Reusable UI components
├── contexts/              # React Context providers
├── services/              # API and external service integrations
├── types/                 # TypeScript type definitions
├── utils/                 # Utility functions
├── App.tsx               # Main application component
└── main.tsx              # Application entry point
```

### Key Architectural Patterns

- **Component-Based Architecture**: Features organized by domain (DSAR, PDPL, etc.)
- **Context API**: Authentication state managed through AuthContext
- **Service Layer**: External integrations abstracted into service modules
- **Type Safety**: Comprehensive TypeScript types in dedicated types folder

## Backend Service Structure (`python_pii_service/`)

```
python_pii_service/
├── main.py               # FastAPI application with multiple PII engines
├── requirements.txt      # Python dependencies
├── setup.sh             # Linux/Mac setup script
├── setup.ps1            # Windows setup script
└── venv/                # Python virtual environment
```

## Navigation & Routing

The application uses a tab-based navigation system managed in `App.tsx`:
- Dashboard overview with risk metrics and activity
- Data Discovery for scanning and classification
- Risk Assessment for compliance monitoring
- DSAR Management with separate user portal and admin views
- GDPR Compliance with lawful basis, DPIA, records, breach notification, data portability, and compliance matrix
- PDPL Compliance tools (consent, transfers, retention, matrix)
- Policy Management for privacy documentation
- Analytics for reporting and insights
- Settings for configuration

## Service Integration Points

- **Python PII Service**: Communicates via HTTP API on port 8000
- **Database Scanners**: Direct database connections (MongoDB, MySQL, PostgreSQL)
- **Cloud Services**: Google Cloud DLP API integration
- **Document Processing**: Client-side PDF, Office document, and OCR processing

## Development Conventions

- Components follow PascalCase naming
- Services use camelCase with descriptive suffixes (e.g., `pythonPIIService.ts`)
- Types are centralized in `src/types/index.ts`
- Utility functions in `src/utils/` with descriptive names
- Context providers follow the pattern `[Feature]Context.tsx`