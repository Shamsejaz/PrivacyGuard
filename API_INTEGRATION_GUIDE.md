# PrivacyGuard API Integration Guide

This comprehensive guide provides developers with detailed information for integrating with the PrivacyGuard API, including authentication, endpoints, SDKs, and best practices.

## Table of Contents

1. [Getting Started](#getting-started)
2. [Authentication](#authentication)
3. [API Reference](#api-reference)
4. [SDKs and Libraries](#sdks-and-libraries)
5. [Integration Patterns](#integration-patterns)
6. [Webhooks and Real-time Events](#webhooks-and-real-time-events)
7. [Error Handling](#error-handling)
8. [Rate Limiting](#rate-limiting)
9. [Best Practices](#best-practices)
10. [Testing and Development](#testing-and-development)
11. [Production Deployment](#production-deployment)
12. [Troubleshooting](#troubleshooting)

## Getting Started

### API Overview

The PrivacyGuard API is a RESTful API that provides programmatic access to privacy compliance management features including:

- Data Subject Access Request (DSAR) management
- Risk assessment and compliance monitoring
- GDPR compliance tracking
- Policy management
- Analytics and reporting
- External system integrations

### Base URLs

```
Production:  https://api.privacyguard.com/v1
Staging:     https://staging-api.privacyguard.com/v1
Development: http://localhost:3001/api/v1
```

### API Versioning

The API uses URL-based versioning. The current version is `v1`. All endpoints are prefixed with `/api/v1/`.

### Content Types

- **Request Content-Type**: `application/json`
- **Response Content-Type**: `application/json`
- **File Upload Content-Type**: `multipart/form-data`

### Standard Response Format

All API responses follow this consistent format:

```json
{
  "success": true,
  "data": {
    // Response data
  },
  "message": "Operation completed successfully",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "requestId": "req_abc123def456"
}
```

Error responses:

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Request validation failed",
    "details": {
      "field": "email",
      "message": "Invalid email format"
    }
  },
  "timestamp": "2024-01-01T00:00:00.000Z",
  "requestId": "req_abc123def456"
}
```

## Authentication

### JWT Token Authentication

PrivacyGuard uses JWT (JSON Web Token) for API authentication. Include the token in the `Authorization` header:

```http
Authorization: Bearer <jwt_token>
```

### Obtaining Access Tokens

#### Login Endpoint

```http
POST /auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "your_password"
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

#### Token Refresh

```http
POST /auth/refresh
Content-Type: application/json

{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

### API Key Authentication (Alternative)

For server-to-server integrations, you can use API keys:

```http
X-API-Key: your_api_key_here
```

Contact your administrator to generate API keys.

### Role-Based Access Control

API access is controlled by user roles:

- **admin**: Full API access
- **dpo**: Data Protection Officer access
- **compliance**: Compliance team access
- **legal**: Legal team access
- **business**: Limited business user access

## API Reference

### Health Check

#### System Health Status

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
    }
  }
}
```

### User Management

#### Get Current User

```http
GET /users/me
Authorization: Bearer <token>
```

#### Update User Profile

```http
PUT /users/me
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Updated Name",
  "department": "Legal"
}
```

#### List Users (Admin Only)

```http
GET /users?page=1&limit=20&role=admin
Authorization: Bearer <token>
```

**Query Parameters:**
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 20, max: 100)
- `role`: Filter by user role
- `department`: Filter by department
- `search`: Search by name or email

### DSAR Management

#### Submit DSAR Request (Public)

```http
POST /dsar/submit
Content-Type: application/json

{
  "subjectName": "Jane Doe",
  "subjectEmail": "jane@example.com",
  "requestType": "access",
  "description": "I would like to access my personal data",
  "dataCategories": ["personal_info", "contact_details"],
  "processingPurposes": ["customer_service"]
}
```

**Request Types:**
- `access`: Data access request
- `rectification`: Data correction request
- `erasure`: Data deletion request
- `portability`: Data portability request
- `restriction`: Processing restriction request
- `objection`: Processing objection

#### Get DSAR Requests (Admin)

```http
GET /dsar/requests?status=submitted&page=1&limit=20
Authorization: Bearer <token>
```

**Query Parameters:**
- `status`: Filter by status (`submitted`, `in_review`, `in_progress`, `completed`, `rejected`)
- `requestType`: Filter by request type
- `assignedTo`: Filter by assigned user ID
- `fromDate`: Filter from date (ISO 8601)
- `toDate`: Filter to date (ISO 8601)
- `priority`: Filter by priority (`low`, `medium`, `high`, `urgent`)

#### Update DSAR Request

```http
PUT /dsar/requests/{id}
Authorization: Bearer <token>
Content-Type: application/json

{
  "status": "in_progress",
  "assignedTo": "user_456",
  "comment": "Started processing the request",
  "priority": "high"
}
```

#### Get DSAR Request Details

```http
GET /dsar/requests/{id}
Authorization: Bearer <token>
```

#### Track DSAR Request (Public)

```http
GET /dsar/track/{requestId}
```

### Risk Assessment

#### Create Risk Assessment

```http
POST /risk/assessments
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Customer Data Processing Risk",
  "description": "Risk assessment for customer data processing activities",
  "riskLevel": "medium",
  "impactScore": 3,
  "likelihoodScore": 2,
  "category": "data_processing",
  "dataTypes": ["personal_data", "contact_info"],
  "mitigationMeasures": [
    {
      "measure": "Implement data encryption",
      "status": "planned",
      "dueDate": "2024-02-01T00:00:00.000Z",
      "assignedTo": "user_789"
    }
  ],
  "ownerId": "user_456"
}
```

#### Get Risk Assessments

```http
GET /risk/assessments?riskLevel=high&status=active
Authorization: Bearer <token>
```

#### Update Risk Assessment

```http
PUT /risk/assessments/{id}
Authorization: Bearer <token>
Content-Type: application/json

{
  "status": "mitigated",
  "mitigationMeasures": [
    {
      "measure": "Data encryption implemented",
      "status": "completed",
      "completedDate": "2024-01-15T00:00:00.000Z"
    }
  ]
}
```

#### Get Risk Metrics

```http
GET /risk/metrics?period=last_30_days
Authorization: Bearer <token>
```

### GDPR Compliance

#### Create Lawful Basis Record

```http
POST /gdpr/lawful-basis
Authorization: Bearer <token>
Content-Type: application/json

{
  "processingActivity": "Customer Registration",
  "lawfulBasis": "consent",
  "dataCategories": ["name", "email", "phone"],
  "purposes": ["account_creation", "communication"],
  "dataSubjects": ["customers"],
  "retentionPeriod": "5 years",
  "status": "active"
}
```

#### Get Processing Records

```http
GET /gdpr/processing-records
Authorization: Bearer <token>
```

#### Create Processing Record

```http
POST /gdpr/processing-records
Authorization: Bearer <token>
Content-Type: application/json

{
  "activityName": "Customer Support",
  "controller": "Your Company Ltd",
  "processor": "Support Service Provider",
  "purposes": ["customer_support", "issue_resolution"],
  "lawfulBasis": "legitimate_interest",
  "dataCategories": ["contact_info", "support_history"],
  "dataSubjects": ["customers"],
  "recipients": ["internal_support", "external_processor"],
  "thirdCountryTransfers": false,
  "retentionPeriod": "3 years",
  "technicalMeasures": ["encryption", "access_controls"],
  "organisationalMeasures": ["staff_training", "data_policies"]
}
```

#### Get GDPR Compliance Dashboard

```http
GET /gdpr/dashboard
Authorization: Bearer <token>
```

### Policy Management

#### Create Policy Document

```http
POST /policies
Authorization: Bearer <token>
Content-Type: application/json

{
  "title": "Privacy Policy",
  "type": "privacy_policy",
  "content": "This privacy policy describes...",
  "version": "1.0",
  "language": "en",
  "jurisdiction": "EU",
  "effectiveDate": "2024-01-01T00:00:00.000Z",
  "tags": ["privacy", "gdpr", "customer_facing"]
}
```

#### Get Policy Documents

```http
GET /policies?type=privacy_policy&status=active&language=en
Authorization: Bearer <token>
```

#### Update Policy Document

```http
PUT /policies/{id}
Authorization: Bearer <token>
Content-Type: application/json

{
  "content": "Updated policy content...",
  "version": "1.1",
  "status": "draft"
}
```

#### Approve Policy Document

```http
POST /policies/{id}/approve
Authorization: Bearer <token>
Content-Type: application/json

{
  "approvalComment": "Approved after legal review"
}
```

### External Systems Integration

#### List System Connections

```http
GET /external-systems/connections
Authorization: Bearer <token>
```

#### Create Database Connection

```http
POST /external-systems/databases
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Customer Database",
  "type": "postgresql",
  "host": "db.example.com",
  "port": 5432,
  "database": "customers",
  "username": "readonly_user",
  "password": "encrypted_password",
  "ssl": true,
  "description": "Main customer database for DSAR processing"
}
```

#### Test Database Connection

```http
POST /external-systems/connections/{id}/test
Authorization: Bearer <token>
```

#### Import Data from External System

```http
POST /external-systems/import
Authorization: Bearer <token>
Content-Type: application/json

{
  "connectionId": "conn_123",
  "source": "customers",
  "mapping": {
    "name": "full_name",
    "email": "email_address",
    "phone": "phone_number"
  },
  "filters": {
    "created_date": ">= 2024-01-01",
    "status": "active"
  },
  "batchSize": 1000
}
```

### Analytics and Reporting

#### Get Dashboard Analytics

```http
GET /analytics/dashboard?period=last_30_days
Authorization: Bearer <token>
```

#### Generate Custom Report

```http
POST /analytics/reports
Authorization: Bearer <token>
Content-Type: application/json

{
  "reportType": "dsar_summary",
  "dateRange": {
    "start": "2024-01-01T00:00:00.000Z",
    "end": "2024-01-31T23:59:59.000Z"
  },
  "filters": {
    "status": ["completed", "in_progress"],
    "requestType": ["access", "erasure"]
  },
  "format": "pdf"
}
```

#### Export Data

```http
POST /analytics/export
Authorization: Bearer <token>
Content-Type: application/json

{
  "dataType": "dsar_requests",
  "format": "csv",
  "dateRange": {
    "start": "2024-01-01T00:00:00.000Z",
    "end": "2024-01-31T23:59:59.000Z"
  },
  "includeFields": ["id", "subjectName", "requestType", "status", "createdAt"]
}
```

## SDKs and Libraries

### JavaScript/Node.js SDK

#### Installation

```bash
npm install @privacyguard/sdk
```

#### Usage

```javascript
const PrivacyGuard = require('@privacyguard/sdk');

const client = new PrivacyGuard({
  baseURL: 'https://api.privacyguard.com/v1',
  apiKey: 'your_api_key_here'
});

// Submit DSAR request
const dsarRequest = await client.dsar.submit({
  subjectName: 'John Doe',
  subjectEmail: 'john@example.com',
  requestType: 'access'
});

// Get risk assessments
const riskAssessments = await client.risk.getAssessments({
  riskLevel: 'high',
  status: 'active'
});

// Create policy document
const policy = await client.policies.create({
  title: 'Privacy Policy',
  type: 'privacy_policy',
  content: 'Policy content...'
});
```

### Python SDK

#### Installation

```bash
pip install privacyguard-sdk
```

#### Usage

```python
from privacyguard import PrivacyGuardClient

client = PrivacyGuardClient(
    base_url='https://api.privacyguard.com/v1',
    api_key='your_api_key_here'
)

# Submit DSAR request
dsar_request = client.dsar.submit({
    'subjectName': 'John Doe',
    'subjectEmail': 'john@example.com',
    'requestType': 'access'
})

# Get risk assessments
risk_assessments = client.risk.get_assessments(
    risk_level='high',
    status='active'
)

# Create policy document
policy = client.policies.create({
    'title': 'Privacy Policy',
    'type': 'privacy_policy',
    'content': 'Policy content...'
})
```

### PHP SDK

#### Installation

```bash
composer require privacyguard/sdk
```

#### Usage

```php
<?php
use PrivacyGuard\Client;

$client = new Client([
    'base_url' => 'https://api.privacyguard.com/v1',
    'api_key' => 'your_api_key_here'
]);

// Submit DSAR request
$dsarRequest = $client->dsar()->submit([
    'subjectName' => 'John Doe',
    'subjectEmail' => 'john@example.com',
    'requestType' => 'access'
]);

// Get risk assessments
$riskAssessments = $client->risk()->getAssessments([
    'riskLevel' => 'high',
    'status' => 'active'
]);
```

## Integration Patterns

### Synchronous Integration

For real-time operations where you need immediate responses:

```javascript
// Example: Real-time DSAR submission validation
async function submitDSARRequest(requestData) {
  try {
    const response = await client.dsar.submit(requestData);
    return {
      success: true,
      requestId: response.data.requestId,
      message: 'DSAR request submitted successfully'
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}
```

### Asynchronous Integration

For batch operations or long-running processes:

```javascript
// Example: Bulk data import
async function importCustomerData(connectionId, batchSize = 1000) {
  const importJob = await client.externalSystems.startImport({
    connectionId,
    batchSize
  });
  
  // Poll for completion
  let status = 'running';
  while (status === 'running') {
    await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5 seconds
    const jobStatus = await client.externalSystems.getImportStatus(importJob.id);
    status = jobStatus.data.status;
  }
  
  return status;
}
```

### Webhook Integration

For event-driven integrations:

```javascript
// Express.js webhook handler
app.post('/webhooks/privacyguard', (req, res) => {
  const event = req.body;
  
  switch (event.type) {
    case 'dsar.created':
      handleNewDSARRequest(event.data);
      break;
    case 'dsar.completed':
      handleCompletedDSARRequest(event.data);
      break;
    case 'risk.alert':
      handleRiskAlert(event.data);
      break;
  }
  
  res.status(200).send('OK');
});
```

## Webhooks and Real-time Events

### Webhook Configuration

Configure webhooks to receive real-time notifications:

```http
POST /webhooks
Authorization: Bearer <token>
Content-Type: application/json

{
  "url": "https://your-app.com/webhooks/privacyguard",
  "events": ["dsar.created", "dsar.updated", "risk.alert"],
  "secret": "your_webhook_secret"
}
```

### Event Types

#### DSAR Events

- `dsar.created`: New DSAR request submitted
- `dsar.updated`: DSAR request updated
- `dsar.status_changed`: DSAR status changed
- `dsar.assigned`: DSAR request assigned to user
- `dsar.completed`: DSAR request completed

#### Risk Events

- `risk.assessment_created`: New risk assessment created
- `risk.assessment_updated`: Risk assessment updated
- `risk.alert`: Risk threshold exceeded
- `risk.finding_created`: New compliance finding

#### System Events

- `system.notification`: System notification
- `system.maintenance`: Maintenance notification
- `system.alert`: System alert

### Webhook Payload Example

```json
{
  "id": "evt_123456789",
  "type": "dsar.created",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "data": {
    "id": "dsar_123",
    "requestId": "DSAR-2024-001",
    "subjectName": "John Doe",
    "subjectEmail": "john@example.com",
    "requestType": "access",
    "status": "submitted",
    "createdAt": "2024-01-01T00:00:00.000Z"
  }
}
```

### WebSocket Connection

For real-time updates in web applications:

```javascript
const ws = new WebSocket('wss://api.privacyguard.com/ws');

// Authenticate
ws.onopen = () => {
  ws.send(JSON.stringify({
    type: 'auth',
    token: 'your_jwt_token'
  }));
};

// Handle events
ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  
  switch (data.type) {
    case 'dsar:created':
      updateDSARList(data.data);
      break;
    case 'risk:alert':
      showRiskAlert(data.data);
      break;
  }
};
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

### Error Response Format

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

### Error Codes

| Code | Description | HTTP Status |
|------|-------------|-------------|
| `VALIDATION_ERROR` | Request validation failed | 422 |
| `AUTHENTICATION_FAILED` | Invalid credentials | 401 |
| `AUTHORIZATION_FAILED` | Insufficient permissions | 403 |
| `RESOURCE_NOT_FOUND` | Resource not found | 404 |
| `RESOURCE_CONFLICT` | Resource already exists | 409 |
| `RATE_LIMIT_EXCEEDED` | Too many requests | 429 |
| `DATABASE_ERROR` | Database operation failed | 500 |
| `EXTERNAL_SERVICE_ERROR` | External service unavailable | 502 |
| `INTERNAL_ERROR` | Unexpected server error | 500 |

### Error Handling Best Practices

```javascript
async function handleAPICall(apiFunction) {
  try {
    const response = await apiFunction();
    return { success: true, data: response.data };
  } catch (error) {
    if (error.response) {
      // API error response
      const { status, data } = error.response;
      
      switch (status) {
        case 401:
          // Handle authentication error
          await refreshToken();
          return handleAPICall(apiFunction); // Retry
        case 429:
          // Handle rate limiting
          await delay(error.response.headers['retry-after'] * 1000);
          return handleAPICall(apiFunction); // Retry
        case 422:
          // Handle validation errors
          return { success: false, errors: data.error.details };
        default:
          return { success: false, error: data.error.message };
      }
    } else {
      // Network or other error
      return { success: false, error: 'Network error occurred' };
    }
  }
}
```

## Rate Limiting

### Rate Limit Headers

All API responses include rate limiting headers:

```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1640995200
X-RateLimit-Window: 900
```

### Rate Limits by Endpoint Category

| Category | Limit | Window |
|----------|-------|--------|
| Authentication | 5 requests | 15 minutes |
| General API | 100 requests | 15 minutes |
| File Upload | 10 requests | 1 hour |
| Bulk Operations | 5 requests | 1 hour |
| Webhooks | 1000 requests | 15 minutes |

### Handling Rate Limits

```javascript
async function makeAPICallWithRetry(apiCall, maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await apiCall();
    } catch (error) {
      if (error.response?.status === 429) {
        const retryAfter = error.response.headers['retry-after'] || Math.pow(2, attempt);
        console.log(`Rate limited. Retrying after ${retryAfter} seconds...`);
        await delay(retryAfter * 1000);
      } else {
        throw error;
      }
    }
  }
  throw new Error('Max retries exceeded');
}
```

## Best Practices

### Authentication

1. **Secure Token Storage**: Store JWT tokens securely (e.g., httpOnly cookies, secure storage)
2. **Token Refresh**: Implement automatic token refresh before expiration
3. **API Key Security**: Never expose API keys in client-side code
4. **Scope Limitation**: Use the minimum required permissions for API keys

### Request Optimization

1. **Pagination**: Always use pagination for list endpoints
2. **Field Selection**: Request only needed fields when supported
3. **Caching**: Implement client-side caching for frequently accessed data
4. **Batch Operations**: Use bulk endpoints when available

### Error Handling

1. **Retry Logic**: Implement exponential backoff for retries
2. **Graceful Degradation**: Handle API failures gracefully
3. **User Feedback**: Provide meaningful error messages to users
4. **Logging**: Log API errors for debugging

### Security

1. **HTTPS Only**: Always use HTTPS in production
2. **Input Validation**: Validate all input data before sending to API
3. **Rate Limiting**: Respect rate limits and implement client-side limiting
4. **Audit Logging**: Log all API interactions for audit purposes

## Testing and Development

### Development Environment Setup

```bash
# Clone the repository
git clone https://github.com/your-org/privacyguard.git
cd privacyguard

# Start development environment
docker-compose -f docker-compose.dev.yml up -d

# API will be available at http://localhost:3001/api/v1
```

### Testing with Postman

Import the Postman collection:

```bash
curl -o PrivacyGuard-API.postman_collection.json \
  https://api.privacyguard.com/docs/postman-collection.json
```

### API Testing Examples

#### Test Authentication

```bash
# Login
curl -X POST http://localhost:3001/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@privacyguard.com",
    "password": "admin123"
  }'
```

#### Test DSAR Submission

```bash
# Submit DSAR request
curl -X POST http://localhost:3001/api/v1/dsar/submit \
  -H "Content-Type: application/json" \
  -d '{
    "subjectName": "Test User",
    "subjectEmail": "test@example.com",
    "requestType": "access",
    "description": "Test DSAR request"
  }'
```

#### Test Protected Endpoint

```bash
# Get user profile (requires authentication)
curl -X GET http://localhost:3001/api/v1/users/me \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Unit Testing

```javascript
// Example Jest test
describe('PrivacyGuard API Client', () => {
  let client;
  
  beforeEach(() => {
    client = new PrivacyGuardClient({
      baseURL: 'http://localhost:3001/api/v1',
      apiKey: 'test_api_key'
    });
  });
  
  test('should submit DSAR request', async () => {
    const requestData = {
      subjectName: 'Test User',
      subjectEmail: 'test@example.com',
      requestType: 'access'
    };
    
    const response = await client.dsar.submit(requestData);
    
    expect(response.success).toBe(true);
    expect(response.data.requestId).toBeDefined();
  });
  
  test('should handle validation errors', async () => {
    const invalidData = {
      subjectName: '',
      subjectEmail: 'invalid-email'
    };
    
    await expect(client.dsar.submit(invalidData))
      .rejects.toThrow('Request validation failed');
  });
});
```

## Production Deployment

### Environment Configuration

```bash
# Production environment variables
PRIVACYGUARD_API_URL=https://api.privacyguard.com/v1
PRIVACYGUARD_API_KEY=your_production_api_key
PRIVACYGUARD_WEBHOOK_SECRET=your_webhook_secret

# Optional: Custom timeout settings
PRIVACYGUARD_TIMEOUT=30000
PRIVACYGUARD_RETRY_ATTEMPTS=3
```

### Production Checklist

- [ ] API keys configured and secured
- [ ] Webhook endpoints configured and tested
- [ ] Rate limiting handled appropriately
- [ ] Error handling and logging implemented
- [ ] SSL/TLS certificates configured
- [ ] Monitoring and alerting set up
- [ ] Backup and recovery procedures tested

### Monitoring Integration Health

```javascript
// Health check endpoint for your integration
app.get('/health/privacyguard', async (req, res) => {
  try {
    const health = await privacyGuardClient.health.check();
    res.json({
      status: 'ok',
      privacyguard: health.data.status,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(503).json({
      status: 'error',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});
```

## Troubleshooting

### Common Issues

#### Authentication Issues

**Problem**: 401 Unauthorized errors
```javascript
// Solution: Check token expiration and refresh
if (error.response?.status === 401) {
  await refreshToken();
  // Retry the request
}
```

#### Rate Limiting Issues

**Problem**: 429 Too Many Requests
```javascript
// Solution: Implement exponential backoff
const retryAfter = error.response.headers['retry-after'] || 60;
await delay(retryAfter * 1000);
```

#### Network Issues

**Problem**: Connection timeouts
```javascript
// Solution: Increase timeout and add retry logic
const client = new PrivacyGuardClient({
  timeout: 30000,
  retries: 3
});
```

### Debug Mode

Enable debug logging:

```javascript
const client = new PrivacyGuardClient({
  baseURL: 'https://api.privacyguard.com/v1',
  apiKey: 'your_api_key',
  debug: true
});
```

### Support Resources

- **API Documentation**: https://docs.privacyguard.com/api
- **Developer Portal**: https://developers.privacyguard.com
- **Status Page**: https://status.privacyguard.com
- **Support Email**: api-support@privacyguard.com
- **Community Forum**: https://community.privacyguard.com

### Getting Help

When contacting support, include:

1. **Request ID**: From the API response
2. **Timestamp**: When the issue occurred
3. **HTTP Status Code**: Response status
4. **Request Details**: Method, endpoint, payload
5. **Error Message**: Complete error response
6. **Environment**: Development, staging, or production

---

**Document Version**: 1.0  
**Last Updated**: 2024-01-01  
**Next Review**: 2024-04-01  
**Owner**: API Team