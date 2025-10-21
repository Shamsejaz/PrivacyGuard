# PrivacyGuard - Simplified Development Setup Guide

This guide provides a simplified approach to running PrivacyGuard in development mode, bypassing complex TypeScript compilation issues.

## Prerequisites

1. Node.js 18+
2. Python 3.9+
3. Docker (optional, for certain services)
4. PostgreSQL (optional, for database features)

## Quick Start - Running in Development Mode

### Option 1: Using Docker Compose (Recommended)

```bash
# Navigate to the project root
cd PrivacyGuard-main

# Start all services in development mode
docker-compose -f docker-compose.dev.yml up -d

# Check that all services are running
docker-compose -f docker-compose.dev.yml ps
```

The services will be available at:
- Frontend: http://localhost:5173
- Backend API: http://localhost:3001
- Python PII Service: http://localhost:8000

### Option 2: Manual Setup

#### 1. Frontend Setup

```bash
# Navigate to the project root
cd PrivacyGuard-main

# Install frontend dependencies
npm install

# Start frontend in development mode
npm run dev
```

The frontend will be available at http://localhost:5173

#### 2. Backend Setup (Optional)

If you want to run the backend API locally:

```bash
# Navigate to the backend directory
cd backend

# Install backend dependencies
npm install

# Start backend in development mode
npm run dev
```

The backend API will be available at http://localhost:3001

Note: If you encounter TypeScript compilation errors, you can try:

```bash
# Skip type checking in development
npm run dev -- --no-typecheck
```

#### 3. Python PII Service

```bash
# Navigate to the project root
cd PrivacyGuard-main

# Build and start the Python PII service
docker-compose -f docker-compose.dev.yml up -d python-pii-service
```

Or run it directly:

```bash
# Navigate to the python_pii_service directory
cd python_pii_service

# Install Python dependencies
pip install -r requirements.txt

# Start the service
python main.py
```

The PII service will be available at http://localhost:8000

## Environment Variables

Create a `.env` file in the project root with the following variables:

```env
# API Configuration
VITE_API_URL=http://localhost:3001
VITE_PYTHON_PII_ENDPOINT=http://localhost:8000

# Development settings
NODE_ENV=development
```

## Common Issues and Solutions

### 1. TypeScript Compilation Errors

If you encounter TypeScript compilation errors when building:

- Run in development mode with type checking disabled: `npm run dev -- --no-typecheck`
- Or skip the build step and rely on the development server's built-in transpilation

### 2. Port Conflicts

If ports are already in use:

- Frontend: Change port in `vite.config.ts`
- Backend: Set PORT environment variable
- PII Service: Change port in Docker configuration or Python startup

### 3. Database Connection Issues

For development, the application uses in-memory storage by default. To enable persistent storage:

1. Set up PostgreSQL
2. Configure database connection strings in environment variables
3. Run database migrations (if available)

## Development Workflow

1. Start the frontend: `npm run dev`
2. (Optional) Start the backend: `cd backend && npm run dev`
3. (Optional) Start the PII service: `docker-compose -f docker-compose.dev.yml up python-pii-service`

## Building for Production

Note: Due to TypeScript compilation errors, building for production may not work without resolving those issues first.

To attempt a production build:

```bash
# Frontend build
npm run build

# Backend build (may fail due to TypeScript errors)
cd backend
npm run build
```

## Next Steps

1. Explore the application at http://localhost:5173
2. Use default credentials:
   - Admin: admin@privacyguard.com / admin123
   - DPO: dpo@privacyguard.com / dpo123
3. Experiment with different features
4. Refer to the main documentation for detailed feature descriptions

## Troubleshooting

### Blank Page Issue

If you see a blank page:

1. Check browser console for JavaScript errors
2. Verify all services are running (frontend, backend, PII service)
3. Check network tab for failed API requests
4. Ensure environment variables are correctly set
5. Try clearing browser cache and reloading

### Authentication Issues

1. Verify backend service is running
2. Check that database seeding completed successfully
3. Ensure correct credentials are being used
4. Check backend logs for authentication errors

### PII Detection Not Working

1. Verify Python PII service is running
2. Check service health: `curl http://localhost:8000/health`
3. Test detection: `curl -X POST http://localhost:8000/analyze -H "Content-Type: application/json" -d '{"text": "My email is test@example.com"}'`

For any issues not covered in this guide, please refer to the main documentation or create an issue in the repository.