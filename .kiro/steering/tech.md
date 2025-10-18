# Technology Stack & Build System

## Frontend Stack

- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite 5.4+ for fast development and optimized builds
- **Styling**: Tailwind CSS 3.4+ with PostCSS
- **Icons**: Lucide React for consistent iconography
- **State Management**: React Context API (AuthContext)
- **HTTP Client**: Axios for API communication

## Backend Services

- **PII Detection Service**: Python FastAPI service with multiple ML engines:
  - Microsoft Presidio for enterprise-grade PII detection
  - spaCy for natural language processing
  - Transformers (BERT) for advanced entity recognition
  - Hybrid analysis combining all engines

## Development Tools

- **Linting**: ESLint with TypeScript support and React hooks rules
- **Type Checking**: TypeScript with strict mode enabled
- **Package Manager**: npm (package-lock.json present)

## Build & Development Commands

```bash
# Development
npm run dev          # Start Vite dev server (http://localhost:5173)
npm run build        # Production build
npm run preview      # Preview production build
npm run lint         # Run ESLint

# Python PII Service
cd python_pii_service
./setup.sh           # Linux/Mac setup
./setup.ps1          # Windows setup
python main.py       # Start service (http://localhost:8000)
```

## Docker Deployment

```bash
# Production deployment
docker-compose up --build

# Development with hot reloading
docker-compose -f docker-compose.dev.yml up --build
```

## Key Dependencies

- **Data Processing**: Chart.js, jsPDF, html2canvas, xlsx, mammoth, tesseract.js
- **Database Connectors**: MongoDB, MySQL2, PostgreSQL
- **Cloud Services**: Google Cloud DLP API
- **PDF Processing**: pdfjs-dist for client-side PDF parsing

## Configuration Files

- `vite.config.ts`: Vite configuration with React plugin and PDF.js worker alias
- `tsconfig.app.json`: TypeScript configuration with strict mode
- `tailwind.config.js`: Tailwind CSS configuration
- `eslint.config.js`: ESLint configuration with TypeScript and React rules