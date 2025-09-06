# Docker Setup

This project includes Docker configurations for running the PrivacyGuard application in containerized environments.

## Prerequisites

- Docker Engine 20.10+
- Docker Compose 1.29+

## Production Deployment

To build and run the production version of the application:

```bash
docker-compose up --build
```

This will start:
- Frontend application on port 80
- Python PII service on port 8000

## Development Environment

To run the development version with hot reloading:

```bash
docker-compose -f docker-compose.dev.yml up --build
```

This will start:
- Frontend development server on port 5173
- Python PII service on port 8000

## Accessing the Application

- Production: http://localhost
- Development: http://localhost:5173
- Python PII Service API: http://localhost:8000
- Python PII Service Docs: http://localhost:8000/docs

## Stopping the Services

To stop the services:

```bash
# For production
docker-compose down

# For development
docker-compose -f docker-compose.dev.yml down
```

## Notes

- On first run, the Python PII service may take several minutes to download required models
- The frontend application will automatically connect to the Python service via the configured endpoint
- All data is stored in container filesystems and will be lost when containers are removed