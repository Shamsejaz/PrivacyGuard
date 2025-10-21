# PrivacyGuard Backend API Documentation

## Overview

The PrivacyGuard Backend API provides comprehensive privacy compliance management capabilities through RESTful endpoints and WebSocket connections.

**Base URL**: `http://localhost:3001/api/v1`  
**Authentication**: JWT Bearer Token  
**Content-Type**: `application/json`

## Authentication

### Login
```http
POST /api/v1/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "user-123",
    "email": "user@example.com",
    "role": "dpo",
    "permissions": ["dsar:read", "dsar:write"]
  }
}
```

### Authorization Header
```http
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

## DSAR Management

### Submit DSAR Request (Public)
```http
POST /api/v1/dsar/submit
Content-Type: application/json

{
  "requesterName": "John Doe",
  "requesterEmail": "john@example.com",
  "requestType": "access",
  "description": "I would like to access my personal data",
  "identificationMethod": "email",
  "identificationValue": "john@example.com"
}
```

### List DSAR Requests (Admin)
```http
GET /api/v1/dsar?status=pending&limit=10&offset=0
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "dsar-123",
      "requesterName": "John Doe",
      "requesterEmail": "john@example.com",
      "requestType": "access",
      "status": "pending",
      "submittedAt": "2024-01-15T10:30:00Z",
      "dueDate": "2024-02-14T10:30:00Z"
    }
  ],
  "pagination": {
    "total": 25,
    "limit": 10,
    "offset": 0
  }
}
```

### Update DSAR Status
```http
POST /api/v1/dsar/dsar-123/status
Authorization: Bearer <token>
Content-Type: application/json

{
  "status": "in_progress",
  "notes": "Started processing the request",
  "assignedTo": "processor-456"
}
```

## Risk Assessment

### Create Risk Assessment
```http
POST /api/v1/risk/assessments
Authorization: Bearer <token>
Content-Type: application/json

{
  "title": "New Marketing Campaign Risk Assessment",
  "description": "Assessment for email marketing campaign",
  "category": "marketing",
  "riskLevel": "medium",
  "dataTypes": ["email", "name", "preferences"],
  "processingPurposes": ["marketing", "analytics"],
  "dataSubjects": ["customers", "prospects"]
}
```

### Get Risk Trends
```http
GET /api/v1/risk/trends?days=30
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "date": "2024-01-15",
      "criticalCount": 2,
      "highCount": 5,
      "mediumCount": 12,
      "lowCount": 8,
      "averageScore": 3.2
    }
  ]
}
```

## Policy Management

### Create Policy Document
```http
POST /api/v1/policy
Authorization: Bearer <token>
Content-Type: application/json

{
  "title": "Privacy Policy v2.1",
  "type": "privacy_policy",
  "content": "This privacy policy describes...",
  "language": "en",
  "jurisdiction": "EU",
  "effectiveDate": "2024-02-01T00:00:00Z",
  "tags": ["gdpr", "marketing", "cookies"]
}
```

### Approve Policy
```http
POST /api/v1/policy/policy-123/approve
Authorization: Bearer <token>
Content-Type: application/json

{
  "approved": true,
  "approvalNotes": "Policy reviewed and approved for publication"
}
```

## GDPR Compliance

### Create Lawful Basis Record
```http
POST /api/v1/gdpr/lawful-basis
Authorization: Bearer <token>
Content-Type: application/json

{
  "dataCategory": "customer_data",
  "lawfulBasis": "consent",
  "purposes": ["service_delivery", "customer_support"],
  "dataSubjects": ["customers"],
  "retentionPeriod": "5 years",
  "description": "Customer data processing for service delivery"
}
```

### Create DPIA
```http
POST /api/v1/gdpr/dpia
Authorization: Bearer <token>
Content-Type: application/json

{
  "title": "AI-Powered Analytics DPIA",
  "description": "DPIA for new AI analytics system",
  "processingType": "automated_decision_making",
  "dataTypes": ["behavioral", "demographic"],
  "riskLevel": "high",
  "necessityAssessment": "Required for business intelligence",
  "proportionalityAssessment": "Proportionate to business needs"
}
```

## External Systems

### List Database Connections
```http
GET /api/v1/external-systems/connections
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "conn-123",
      "name": "Production Database",
      "type": "postgresql",
      "status": "active",
      "lastScan": "2024-01-15T14:30:00Z",
      "recordCount": 150000
    }
  ]
}
```

### Trigger Data Scan
```http
POST /api/v1/external-systems/scan
Authorization: Bearer <token>
Content-Type: application/json

{
  "connectionId": "conn-123",
  "scanType": "pii_detection",
  "tables": ["users", "orders", "customer_data"]
}
```

## Analytics

### Dashboard Metrics
```http
GET /api/v1/analytics/dashboard
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "dsarMetrics": {
      "totalRequests": 145,
      "pendingRequests": 12,
      "averageResponseTime": 18.5,
      "complianceRate": 98.2
    },
    "riskMetrics": {
      "totalAssessments": 89,
      "highRiskCount": 7,
      "averageRiskScore": 2.8,
      "trendsImproving": true
    },
    "complianceScore": 94.5,
    "lastUpdated": "2024-01-15T16:45:00Z"
  }
}
```

## WebSocket Events

### Connection
```javascript
const ws = new WebSocket('ws://localhost:3001');

// Authentication
ws.send(JSON.stringify({
  type: 'auth',
  token: 'your-jwt-token'
}));
```

### Event Types
- `dsar:created` - New DSAR request submitted
- `dsar:updated` - DSAR request updated
- `dsar:status_changed` - DSAR status changed
- `risk:assessment_updated` - Risk assessment updated
- `risk:new_finding` - New compliance finding
- `system:notification` - System notifications
- `compliance:alert` - Compliance alerts

### Example Event
```json
{
  "type": "dsar:created",
  "data": {
    "id": "dsar-456",
    "requesterEmail": "jane@example.com",
    "requestType": "deletion",
    "submittedAt": "2024-01-15T17:00:00Z"
  },
  "timestamp": "2024-01-15T17:00:01Z"
}
```

## Error Handling

### Error Response Format
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid request data",
    "details": {
      "field": "email",
      "reason": "Invalid email format"
    }
  },
  "timestamp": "2024-01-15T17:00:00Z"
}
```

### HTTP Status Codes
- `200` - Success
- `201` - Created
- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `409` - Conflict
- `422` - Validation Error
- `429` - Rate Limited
- `500` - Internal Server Error

## Rate Limiting

- **General API**: 100 requests per minute per IP
- **Authentication**: 5 login attempts per minute per IP
- **Public DSAR**: 10 submissions per hour per IP
- **WebSocket**: 50 messages per minute per connection

## Pagination

Most list endpoints support pagination:

```http
GET /api/v1/dsar?limit=20&offset=40&sortBy=submittedAt&sortOrder=desc
```

**Parameters:**
- `limit` - Number of items per page (default: 10, max: 100)
- `offset` - Number of items to skip (default: 0)
- `sortBy` - Field to sort by
- `sortOrder` - Sort direction (`asc` or `desc`)

## Health Check

```http
GET /health
```

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2024-01-15T17:00:00Z",
  "services": {
    "database": "healthy",
    "mongodb": "healthy",
    "redis": "healthy"
  },
  "version": "1.0.0",
  "uptime": 86400
}
```

## Security Headers

All responses include security headers:
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `X-XSS-Protection: 1; mode=block`
- `Strict-Transport-Security: max-age=31536000`
- `Content-Security-Policy: default-src 'self'`

---

For more detailed information, see the [OpenAPI specification](./openapi.yaml).