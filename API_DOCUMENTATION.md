# PrivacyGuard API Documentation

This document provides comprehensive documentation for the PrivacyGuard REST API.

## Table of Contents

1. [Overview](#overview)
2. [Authentication](#authentication)
3. [API Endpoints](#api-endpoints)
4. [Data Models](#data-models)
5. [Error Handling](#error-handling)
6. [Rate Limiting](#rate-limiting)
7. [WebSocket Events](#websocket-events)
8. [Integration Examples](#integration-examples)

## Overview

### Base URL

```
Production: https://your-domain.com/api/v1
Development: http://localhost:3001/api/v1
```

### API Version

Current API version: `v1`

### Content Type

All API requests and responses use `application/json` content type.

### Response Format

All API responses follow this standard format:

```json
{
  "success": true,
  "data": {},
  "message": "Success message",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "requestId": "req_123456789"
}
```

Error responses:

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Error description",
    "details": {}
  },
  "timestamp": "2024-01-01T00:00:00.000Z",
  "requestId": "req_123456789"
}
```

## Authentication

### JWT Token Authentication

The API uses JWT (JSON Web Token) for authentication. Include the token in the Authorization header:

```
Authorization: Bearer <jwt_token>
```

### Authentication Endpoints

#### Login

```http
POST /auth/login
```

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "user_123",
      "email": "user@example.com",
      "name": "John Doe",
      "role": "admin"
    },
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expiresIn": 3600
  }
}
```

#### Refresh Token

```http
POST /auth/refresh
```

**Request Body:**
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

#### Logout

```http
POST /auth/logout
```

**Headers:**
```
Authorization: Bearer <jwt_token>
```

### User Roles

- `admin`: Full system access
- `dpo`: Data Protection Officer access
- `compliance`: Compliance team access
- `legal`: Legal team access
- `business`: Business user access

## API Endpoints

### Health Check

#### System Health

```http
GET /health
```

**Response:**
```json
{
  "success": true,
  "data": {
    "status": "ok",
    "timestamp": "2024-01-01T00:00:00.000Z",
    "uptime": 3600,
    "environment": "production",
    "version": "1.0.0",
    "databases": {
      "postgresql": "connected",
      "mongodb": "connected",
      "redis": "connected"
    },
    "memory": {
      "rss": 123456789,
      "heapTotal": 98765432,
      "heapUsed": 87654321,
      "external": 12345678
    }
  }
}
```

### User Management

#### Get Current User

```http
GET /users/me
```

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "user_123",
    "email": "user@example.com",
    "name": "John Doe",
    "role": "admin",
    "department": "IT",
    "permissions": ["read", "write", "admin"],
    "lastLogin": "2024-01-01T00:00:00.000Z",
    "createdAt": "2024-01-01T00:00:00.000Z"
  }
}
```

#### Update User Profile

```http
PUT /users/me
```

**Request Body:**
```json
{
  "name": "John Smith",
  "department": "Legal"
}
```

#### List Users (Admin Only)

```http
GET /users
```

**Query Parameters:**
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 20)
- `role`: Filter by role
- `department`: Filter by department
- `search`: Search by name or email

**Response:**
```json
{
  "success": true,
  "data": {
    "users": [
      {
        "id": "user_123",
        "email": "user@example.com",
        "name": "John Doe",
        "role": "admin",
        "department": "IT",
        "lastLogin": "2024-01-01T00:00:00.000Z",
        "createdAt": "2024-01-01T00:00:00.000Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 100,
      "totalPages": 5
    }
  }
}
```

### DSAR Management

#### Create DSAR Request

```http
POST /dsar/requests
```

**Request Body:**
```json
{
  "subjectName": "Jane Doe",
  "subjectEmail": "jane@example.com",
  "requestType": "access",
  "description": "Request for personal data access",
  "dataCategories": ["personal_info", "contact_details"],
  "processingPurposes": ["customer_service", "marketing"]
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "dsar_123",
    "requestId": "DSAR-2024-001",
    "subjectName": "Jane Doe",
    "subjectEmail": "jane@example.com",
    "requestType": "access",
    "status": "submitted",
    "priority": "medium",
    "dueDate": "2024-02-01T00:00:00.000Z",
    "createdAt": "2024-01-01T00:00:00.000Z"
  }
}
```

#### Get DSAR Requests

```http
GET /dsar/requests
```

**Query Parameters:**
- `page`: Page number
- `limit`: Items per page
- `status`: Filter by status
- `requestType`: Filter by request type
- `assignedTo`: Filter by assigned user
- `fromDate`: Filter from date
- `toDate`: Filter to date

#### Update DSAR Request

```http
PUT /dsar/requests/:id
```

**Request Body:**
```json
{
  "status": "in_progress",
  "assignedTo": "user_456",
  "comment": "Started processing request"
}
```

#### Get DSAR Request Details

```http
GET /dsar/requests/:id
```

#### Delete DSAR Request

```http
DELETE /dsar/requests/:id
```

### Risk Assessment

#### Create Risk Assessment

```http
POST /risk/assessments
```

**Request Body:**
```json
{
  "name": "Data Processing Risk Assessment",
  "description": "Assessment of data processing activities",
  "riskLevel": "medium",
  "impactScore": 3,
  "likelihoodScore": 2,
  "category": "data_processing",
  "dataTypes": ["personal_data", "sensitive_data"],
  "mitigationMeasures": [
    {
      "measure": "Implement encryption",
      "status": "planned",
      "dueDate": "2024-02-01T00:00:00.000Z"
    }
  ]
}
```

#### Get Risk Assessments

```http
GET /risk/assessments
```

**Query Parameters:**
- `page`: Page number
- `limit`: Items per page
- `riskLevel`: Filter by risk level
- `status`: Filter by status
- `category`: Filter by category
- `ownerId`: Filter by owner

#### Update Risk Assessment

```http
PUT /risk/assessments/:id
```

#### Get Risk Metrics

```http
GET /risk/metrics
```

**Response:**
```json
{
  "success": true,
  "data": {
    "totalAssessments": 50,
    "riskDistribution": {
      "critical": 2,
      "high": 8,
      "medium": 25,
      "low": 15
    },
    "averageScore": 2.3,
    "trendsLastMonth": {
      "newAssessments": 5,
      "resolvedRisks": 3,
      "escalatedRisks": 1
    }
  }
}
```

### GDPR Compliance

#### Create Lawful Basis Record

```http
POST /gdpr/lawful-basis
```

**Request Body:**
```json
{
  "processingActivity": "Customer Registration",
  "lawfulBasis": "consent",
  "dataCategories": ["name", "email", "phone"],
  "purposes": ["account_creation", "communication"],
  "dataSubjects": ["customers"],
  "retentionPeriod": "5 years"
}
```

#### Get Compliance Matrix

```http
GET /gdpr/compliance-matrix
```

#### Create Processing Record

```http
POST /gdpr/processing-records
```

#### Get GDPR Dashboard

```http
GET /gdpr/dashboard
```

**Response:**
```json
{
  "success": true,
  "data": {
    "complianceScore": 85,
    "totalRecords": 25,
    "pendingActions": 3,
    "lastAssessment": "2024-01-01T00:00:00.000Z",
    "riskAreas": [
      {
        "area": "Data Retention",
        "score": 70,
        "issues": 2
      }
    ]
  }
}
```

### Policy Management

#### Create Policy

```http
POST /policies
```

**Request Body:**
```json
{
  "title": "Privacy Policy",
  "type": "privacy_policy",
  "content": "Policy content here...",
  "version": "1.0",
  "language": "en",
  "jurisdiction": "EU",
  "effectiveDate": "2024-01-01T00:00:00.000Z",
  "tags": ["privacy", "gdpr"]
}
```

#### Get Policies

```http
GET /policies
```

**Query Parameters:**
- `page`: Page number
- `limit`: Items per page
- `type`: Filter by policy type
- `status`: Filter by status
- `language`: Filter by language
- `jurisdiction`: Filter by jurisdiction

#### Update Policy

```http
PUT /policies/:id
```

#### Get Policy Analytics

```http
GET /policies/analytics
```

### External Systems

#### Get System Connections

```http
GET /external-systems/connections
```

#### Create Database Connection

```http
POST /external-systems/databases
```

**Request Body:**
```json
{
  "name": "Customer Database",
  "type": "postgresql",
  "host": "db.example.com",
  "port": 5432,
  "database": "customers",
  "username": "readonly_user",
  "password": "encrypted_password",
  "ssl": true
}
```

#### Test Connection

```http
POST /external-systems/connections/:id/test
```

#### Import Data

```http
POST /external-systems/import
```

**Request Body:**
```json
{
  "connectionId": "conn_123",
  "source": "table_name",
  "mapping": {
    "name": "full_name",
    "email": "email_address"
  },
  "filters": {
    "created_date": ">= 2024-01-01"
  }
}
```

### Monitoring

#### Get System Metrics

```http
GET /monitoring/metrics
```

**Response:**
```json
{
  "success": true,
  "data": {
    "performance": {
      "averageResponseTime": 250,
      "requestsPerMinute": 120,
      "errorRate": 0.02
    },
    "resources": {
      "cpuUsage": 45.2,
      "memoryUsage": 67.8,
      "diskUsage": 23.1
    },
    "databases": {
      "postgresql": {
        "connections": 15,
        "queryTime": 45
      },
      "mongodb": {
        "connections": 8,
        "queryTime": 32
      },
      "redis": {
        "connections": 25,
        "hitRate": 94.5
      }
    }
  }
}
```

#### Get Cache Statistics

```http
GET /monitoring/cache-stats
```

#### Get Error Logs

```http
GET /monitoring/errors
```

**Query Parameters:**
- `page`: Page number
- `limit`: Items per page
- `level`: Filter by error level
- `fromDate`: Filter from date
- `toDate`: Filter to date

## Data Models

### User Model

```typescript
interface User {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'dpo' | 'compliance' | 'legal' | 'business';
  department?: string;
  permissions: string[];
  lastLogin?: Date;
  createdAt: Date;
  updatedAt: Date;
}
```

### DSAR Request Model

```typescript
interface DSARRequest {
  id: string;
  requestId: string;
  subjectName: string;
  subjectEmail: string;
  requestType: 'access' | 'rectification' | 'erasure' | 'portability' | 'restriction' | 'objection';
  status: 'submitted' | 'in_review' | 'in_progress' | 'completed' | 'rejected' | 'cancelled';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  description?: string;
  legalBasis?: string;
  dataCategories: string[];
  processingPurposes: string[];
  assignedTo?: string;
  dueDate?: Date;
  completedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}
```

### Risk Assessment Model

```typescript
interface RiskAssessment {
  id: string;
  name: string;
  description?: string;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  impactScore: number; // 1-5
  likelihoodScore: number; // 1-5
  overallScore: number;
  status: 'active' | 'mitigated' | 'accepted' | 'transferred';
  category?: string;
  dataTypes: string[];
  mitigationMeasures: MitigationMeasure[];
  ownerId?: string;
  reviewDate?: Date;
  createdAt: Date;
  updatedAt: Date;
}
```

### Policy Model

```typescript
interface Policy {
  id: string;
  title: string;
  type: string;
  content: string;
  version: string;
  status: 'draft' | 'active' | 'archived';
  language: string;
  jurisdiction: string;
  effectiveDate?: Date;
  expiryDate?: Date;
  createdBy: string;
  approvedBy?: string;
  approvalDate?: Date;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
}
```

## Error Handling

### HTTP Status Codes

- `200 OK`: Successful request
- `201 Created`: Resource created successfully
- `400 Bad Request`: Invalid request data
- `401 Unauthorized`: Authentication required
- `403 Forbidden`: Insufficient permissions
- `404 Not Found`: Resource not found
- `409 Conflict`: Resource conflict
- `422 Unprocessable Entity`: Validation errors
- `429 Too Many Requests`: Rate limit exceeded
- `500 Internal Server Error`: Server error

### Error Codes

| Code | Description |
|------|-------------|
| `VALIDATION_ERROR` | Request validation failed |
| `AUTHENTICATION_FAILED` | Invalid credentials |
| `AUTHORIZATION_FAILED` | Insufficient permissions |
| `RESOURCE_NOT_FOUND` | Requested resource not found |
| `RESOURCE_CONFLICT` | Resource already exists |
| `RATE_LIMIT_EXCEEDED` | Too many requests |
| `DATABASE_ERROR` | Database operation failed |
| `EXTERNAL_SERVICE_ERROR` | External service unavailable |
| `INTERNAL_ERROR` | Unexpected server error |

### Error Response Example

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Request validation failed",
    "details": {
      "field": "email",
      "message": "Invalid email format",
      "value": "invalid-email"
    }
  },
  "timestamp": "2024-01-01T00:00:00.000Z",
  "requestId": "req_123456789"
}
```

## Rate Limiting

### Default Limits

- **General API**: 100 requests per 15 minutes per IP
- **Authentication**: 5 requests per 15 minutes per IP
- **File Upload**: 10 requests per hour per IP
- **Authenticated Users**: 1000 requests per 15 minutes per user

### Rate Limit Headers

```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1640995200
```

### Rate Limit Exceeded Response

```json
{
  "success": false,
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Too many requests, please try again later",
    "retryAfter": 900
  },
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

## WebSocket Events

### Connection

```javascript
const ws = new WebSocket('ws://localhost:3001');
```

### Authentication

```javascript
ws.send(JSON.stringify({
  type: 'auth',
  token: 'your_jwt_token'
}));
```

### Event Types

#### DSAR Events

```javascript
// New DSAR request created
{
  "type": "dsar:created",
  "data": {
    "id": "dsar_123",
    "requestId": "DSAR-2024-001",
    "subjectName": "Jane Doe",
    "status": "submitted"
  }
}

// DSAR status updated
{
  "type": "dsar:updated",
  "data": {
    "id": "dsar_123",
    "status": "in_progress",
    "assignedTo": "user_456"
  }
}
```

#### Risk Events

```javascript
// New risk assessment
{
  "type": "risk:assessment_created",
  "data": {
    "id": "risk_123",
    "name": "Data Processing Risk",
    "riskLevel": "high"
  }
}

// Risk alert
{
  "type": "risk:alert",
  "data": {
    "id": "risk_123",
    "message": "Critical risk threshold exceeded",
    "severity": "critical"
  }
}
```

#### System Events

```javascript
// System notification
{
  "type": "system:notification",
  "data": {
    "message": "Scheduled maintenance in 30 minutes",
    "type": "warning",
    "timestamp": "2024-01-01T00:00:00.000Z"
  }
}
```

## Integration Examples

### JavaScript/Node.js

```javascript
const axios = require('axios');

class PrivacyGuardAPI {
  constructor(baseURL, token) {
    this.client = axios.create({
      baseURL,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
  }

  async createDSARRequest(data) {
    try {
      const response = await this.client.post('/dsar/requests', data);
      return response.data;
    } catch (error) {
      throw new Error(`API Error: ${error.response.data.error.message}`);
    }
  }

  async getRiskAssessments(filters = {}) {
    try {
      const response = await this.client.get('/risk/assessments', {
        params: filters
      });
      return response.data;
    } catch (error) {
      throw new Error(`API Error: ${error.response.data.error.message}`);
    }
  }
}

// Usage
const api = new PrivacyGuardAPI('http://localhost:3001/api/v1', 'your_token');

api.createDSARRequest({
  subjectName: 'John Doe',
  subjectEmail: 'john@example.com',
  requestType: 'access'
}).then(result => {
  console.log('DSAR created:', result.data);
}).catch(error => {
  console.error('Error:', error.message);
});
```

### Python

```python
import requests
import json

class PrivacyGuardAPI:
    def __init__(self, base_url, token):
        self.base_url = base_url
        self.headers = {
            'Authorization': f'Bearer {token}',
            'Content-Type': 'application/json'
        }
    
    def create_dsar_request(self, data):
        response = requests.post(
            f'{self.base_url}/dsar/requests',
            headers=self.headers,
            json=data
        )
        response.raise_for_status()
        return response.json()
    
    def get_risk_assessments(self, filters=None):
        params = filters or {}
        response = requests.get(
            f'{self.base_url}/risk/assessments',
            headers=self.headers,
            params=params
        )
        response.raise_for_status()
        return response.json()

# Usage
api = PrivacyGuardAPI('http://localhost:3001/api/v1', 'your_token')

try:
    result = api.create_dsar_request({
        'subjectName': 'John Doe',
        'subjectEmail': 'john@example.com',
        'requestType': 'access'
    })
    print('DSAR created:', result['data'])
except requests.exceptions.RequestException as e:
    print('Error:', e)
```

### cURL Examples

#### Authentication

```bash
# Login
curl -X POST http://localhost:3001/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@example.com",
    "password": "password123"
  }'
```

#### Create DSAR Request

```bash
curl -X POST http://localhost:3001/api/v1/dsar/requests \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "subjectName": "Jane Doe",
    "subjectEmail": "jane@example.com",
    "requestType": "access",
    "description": "Request for personal data access"
  }'
```

#### Get Risk Assessments

```bash
curl -X GET "http://localhost:3001/api/v1/risk/assessments?page=1&limit=10&riskLevel=high" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## Support

For API support and questions:

- **Documentation**: [API Docs](https://your-domain.com/api/docs)
- **Support Email**: api-support@your-org.com
- **Developer Portal**: [Developer Portal](https://developers.your-domain.com)

### Additional Resources

#### Documentation
- [API Integration Guide](./API_INTEGRATION_GUIDE.md) - Comprehensive integration guide with SDKs
- [System Administration Guide](./SYSTEM_ADMINISTRATION_GUIDE.md) - System admin procedures
- [Deployment Guide](./DEPLOYMENT_GUIDE.md) - Production deployment guide
- [Troubleshooting Guide](./TROUBLESHOOTING_GUIDE.md) - Common issues and solutions

#### Online Resources
- [API Documentation](https://docs.privacyguard.com/api) - Interactive API docs
- [Developer Portal](https://developers.privacyguard.com) - Developer resources
- [Status Page](https://status.privacyguard.com) - System status monitoring
- [Community Forum](https://community.privacyguard.com) - Developer community

#### Support
- [API Support](api-support@privacyguard.com) - Technical API support
- [System Administration](sysadmin@privacyguard.com) - Infrastructure support
- [Security Issues](security@privacyguard.com) - Security-related issues

## Changelog

### v1.0.0 (2024-01-01)
- Initial API release
- Authentication endpoints
- DSAR management
- Risk assessment
- GDPR compliance
- Policy management
- External systems integration
- Real-time WebSocket events