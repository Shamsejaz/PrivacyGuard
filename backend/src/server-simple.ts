import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3002;

// CORS configuration
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:5174',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    version: '1.0.0',
  });
});

// Mock API endpoints for Risk Assessment
app.get('/api/v1/risk/assessments', (req, res) => {
  const mockAssessments = [
    {
      id: '1',
      name: 'Customer Data Processing Risk',
      description: 'Risk assessment for customer personal data processing activities',
      riskLevel: 'high',
      impactScore: 4,
      likelihoodScore: 3,
      overallScore: 75,
      status: 'active',
      category: 'Data Processing',
      dataTypes: ['Personal Data', 'Financial Data', 'Contact Information'],
      mitigationMeasures: [
        {
          id: '1',
          description: 'Implement data encryption at rest',
          status: 'completed',
          priority: 'high',
          assignedTo: 'Security Team'
        }
      ],
      ownerId: 'user1',
      reviewDate: new Date('2024-12-01'),
      createdAt: new Date('2024-01-15'),
      updatedAt: new Date('2024-10-15')
    }
  ];

  res.json({
    success: true,
    data: {
      items: mockAssessments,
      total: mockAssessments.length,
      page: 1,
      limit: 10,
      totalPages: 1
    }
  });
});

app.get('/api/v1/risk/findings', (req, res) => {
  const mockFindings = [
    {
      id: '1',
      title: 'Missing Data Processing Agreement',
      description: 'Third-party vendor lacks proper data processing agreement for GDPR compliance',
      regulation: 'GDPR',
      severity: 'high',
      status: 'open',
      category: 'Vendor Management',
      affectedSystems: ['CRM System', 'Marketing Platform'],
      remediationSteps: [
        {
          id: '1',
          description: 'Draft and negotiate DPA with vendor',
          status: 'in_progress',
          priority: 'high',
          assignedTo: 'Legal Team',
          dueDate: new Date('2024-11-15')
        }
      ],
      assignedTo: 'Legal Team',
      dueDate: new Date('2024-11-30'),
      createdAt: new Date('2024-10-01'),
      updatedAt: new Date('2024-10-15')
    }
  ];

  res.json({
    success: true,
    data: {
      items: mockFindings,
      total: mockFindings.length,
      page: 1,
      limit: 10,
      totalPages: 1
    }
  });
});

app.get('/api/v1/risk/metrics', (req, res) => {
  res.json({
    success: true,
    data: {
      totalAssessments: 15,
      criticalRisks: 2,
      highRisks: 4,
      mediumRisks: 6,
      lowRisks: 3,
      averageScore: 3.2,
      trendsData: [
        {
          date: new Date('2024-10-01'),
          criticalCount: 1,
          highCount: 3,
          mediumCount: 5,
          lowCount: 4,
          averageScore: 2.8
        }
      ],
      complianceFindings: {
        total: 8,
        open: 3,
        critical: 1,
        overdue: 2
      }
    }
  });
});

app.get('/api/v1/risk/trends', (req, res) => {
  const days = parseInt(req.query.days as string) || 30;
  const trends: any[] = [];
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  
  for (let i = 0; i < days; i += 7) {
    const date = new Date(startDate);
    date.setDate(date.getDate() + i);
    
    trends.push({
      date,
      criticalCount: Math.floor(Math.random() * 3) + 1,
      highCount: Math.floor(Math.random() * 5) + 2,
      mediumCount: Math.floor(Math.random() * 8) + 4,
      lowCount: Math.floor(Math.random() * 6) + 2,
      averageScore: Math.random() * 2 + 2.5
    });
  }
  
  res.json({
    success: true,
    data: trends
  });
});

// Mock DSAR endpoints
app.get('/api/v1/dsar/requests', (req, res) => {
  const mockRequests = [
    {
      id: '1',
      requestId: 'DSAR-2024-001',
      subjectName: 'John Doe',
      subjectEmail: 'john.doe@example.com',
      requestType: 'access',
      status: 'in_progress',
      priority: 'medium',
      description: 'Request for access to personal data',
      dataCategories: ['Personal Information', 'Transaction History'],
      assignedTo: 'Privacy Team',
      dueDate: new Date('2024-11-15'),
      createdAt: new Date('2024-10-01'),
      updatedAt: new Date('2024-10-15')
    }
  ];

  res.json({
    success: true,
    data: {
      items: mockRequests,
      total: mockRequests.length,
      page: 1,
      limit: 10,
      totalPages: 1
    }
  });
});

// Mock GDPR endpoints
app.get('/api/v1/gdpr/dashboard', (req, res) => {
  res.json({
    success: true,
    data: {
      overallScore: 87,
      lawfulBasisCoverage: 92,
      dpiasCompleted: 15,
      recordsOfProcessing: 23,
      breachResponseTime: '< 72h',
      dataPortabilityRequests: 8,
      complianceByCategory: {
        principles: 85,
        rights: 90,
        obligations: 88,
        governance: 92,
        security: 80
      },
      recentActivities: [
        {
          id: '1',
          type: 'DPIA',
          description: 'Marketing automation DPIA completed',
          timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
          status: 'completed'
        },
        {
          id: '2',
          type: 'Breach',
          description: 'Data breach notification submitted to supervisory authority',
          timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000),
          status: 'submitted'
        }
      ]
    }
  });
});

app.get('/api/v1/gdpr/lawful-basis', (req, res) => {
  const mockRecords = [
    {
      id: '1',
      processingActivity: 'Customer Registration',
      lawfulBasis: 'contract',
      dataCategories: ['Personal Identifiers', 'Contact Information'],
      purposes: ['Account creation', 'Service provision'],
      dataSubjects: ['Customers'],
      retentionPeriod: '7 years after account closure',
      status: 'active',
      reviewDate: new Date('2024-07-15'),
      createdAt: new Date('2024-01-15'),
      updatedAt: new Date('2024-01-15')
    },
    {
      id: '2',
      processingActivity: 'Marketing Communications',
      lawfulBasis: 'consent',
      dataCategories: ['Contact Information', 'Communication Preferences'],
      purposes: ['Newsletter distribution', 'Product updates'],
      dataSubjects: ['Newsletter Subscribers'],
      retentionPeriod: 'Until consent withdrawn',
      status: 'active',
      reviewDate: new Date('2024-08-01'),
      createdAt: new Date('2024-02-01'),
      updatedAt: new Date('2024-02-01')
    }
  ];

  res.json({
    success: true,
    data: mockRecords
  });
});

app.get('/api/v1/gdpr/processing-records', (req, res) => {
  const mockRecords = [
    {
      id: '1',
      activityName: 'Customer Registration and Account Management',
      controller: 'PrivacyGuard Ltd.',
      processor: 'Cloud Services Provider',
      purposes: ['Account creation', 'Service provision', 'Customer support'],
      lawfulBasis: 'Contract (Article 6(1)(b))',
      dataCategories: ['Name', 'Email', 'Phone', 'Address', 'Payment information'],
      dataSubjects: ['Customers', 'Prospects'],
      recipients: ['Payment processors', 'Customer support team'],
      thirdCountryTransfers: true,
      retentionPeriod: '7 years after account closure',
      technicalMeasures: ['Encryption at rest', 'Encryption in transit', 'Access controls'],
      organisationalMeasures: ['Staff training', 'Data handling procedures', 'Regular audits'],
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-01')
    }
  ];

  res.json({
    success: true,
    data: mockRecords
  });
});

app.get('/api/v1/gdpr/dpias', (req, res) => {
  const mockDPIAs = [
    {
      id: '1',
      title: 'Customer Analytics Platform',
      description: 'Implementation of advanced customer behavior analytics using AI/ML',
      processingType: 'Automated Decision Making',
      riskLevel: 'high',
      status: 'approved',
      createdDate: new Date('2024-01-15'),
      completedDate: new Date('2024-02-01'),
      reviewer: 'Sarah Johnson (DPO)',
      dataCategories: ['Personal Identifiers', 'Behavioral Data', 'Transaction History'],
      mitigationMeasures: [
        'Implement data minimization principles',
        'Regular algorithm auditing',
        'User consent management',
        'Data anonymization where possible'
      ],
      residualRisk: 'medium',
      createdAt: new Date('2024-01-15'),
      updatedAt: new Date('2024-02-01')
    }
  ];

  res.json({
    success: true,
    data: mockDPIAs
  });
});

app.get('/api/v1/gdpr/breaches', (req, res) => {
  const mockBreaches = [
    {
      id: '1',
      title: 'Email Database Unauthorized Access',
      description: 'Unauthorized access to customer email database through compromised admin credentials',
      discoveryDate: new Date('2024-02-15'),
      reportedDate: new Date('2024-02-16'),
      severity: 'high',
      status: 'reported',
      affectedDataSubjects: 15000,
      dataCategories: ['Email addresses', 'Names', 'Subscription preferences'],
      likelyConsequences: 'Potential spam emails, phishing attempts targeting affected users',
      mitigationMeasures: [
        'Immediate password reset for all admin accounts',
        'Enhanced access controls implemented',
        'Security audit conducted',
        'Affected users notified'
      ],
      supervisoryAuthorityNotified: true,
      dataSubjectsNotified: true,
      notificationDeadline: new Date('2024-02-18'),
      assignedTo: 'Sarah Johnson (DPO)',
      createdAt: new Date('2024-02-15'),
      updatedAt: new Date('2024-02-16')
    }
  ];

  res.json({
    success: true,
    data: mockBreaches
  });
});

app.get('/api/v1/gdpr/portability-requests', (req, res) => {
  const mockRequests = [
    {
      id: '1',
      requestId: 'DP-2024-001',
      dataSubject: {
        name: 'John Smith',
        email: 'john.smith@email.com',
        userId: 'USR-12345'
      },
      requestDate: new Date('2024-02-10'),
      status: 'delivered',
      dataCategories: ['Profile Information', 'Transaction History', 'Communication Preferences'],
      format: 'json',
      deliveryMethod: 'email',
      completionDate: new Date('2024-02-12'),
      expiryDate: new Date('2024-03-12'),
      fileSize: '2.3 MB',
      downloadCount: 1,
      notes: 'Complete data export including all historical transactions',
      createdAt: new Date('2024-02-10'),
      updatedAt: new Date('2024-02-12')
    }
  ];

  res.json({
    success: true,
    data: mockRequests
  });
});

// Mock Authentication endpoints
app.post('/api/v1/auth/login', (req, res) => {
  const { email, password } = req.body;
  
  // Mock authentication - accept any email/password for demo
  if (email && password) {
    const mockUser = {
      id: '1',
      email: email,
      name: email.split('@')[0].replace(/[._]/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
      role: 'admin',
      permissions: ['read', 'write', 'admin'],
      tenantId: 'tenant-1',
      preferences: {
        theme: 'light',
        language: 'en',
        notifications: true
      }
    };

    const mockTokens = {
      accessToken: 'mock-access-token-' + Date.now(),
      refreshToken: 'mock-refresh-token-' + Date.now(),
      expiresIn: 3600
    };

    res.json({
      success: true,
      data: {
        user: mockUser,
        tokens: mockTokens
      }
    });
  } else {
    res.status(400).json({
      success: false,
      error: 'Invalid credentials',
      message: 'Email and password are required'
    });
  }
});

app.post('/api/v1/auth/logout', (req, res) => {
  res.json({
    success: true,
    message: 'Logged out successfully'
  });
});

app.post('/api/v1/auth/refresh', (req, res) => {
  const { refreshToken } = req.body;
  
  if (refreshToken) {
    res.json({
      success: true,
      data: {
        accessToken: 'mock-access-token-refreshed-' + Date.now(),
        expiresIn: 3600
      }
    });
  } else {
    res.status(401).json({
      success: false,
      error: 'Invalid refresh token'
    });
  }
});

app.get('/api/v1/auth/me', (req, res) => {
  const authHeader = req.headers.authorization;
  
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const mockUser = {
      id: '1',
      email: 'demo@privacyguard.com',
      name: 'Demo User',
      role: 'admin',
      permissions: ['read', 'write', 'admin'],
      tenantId: 'tenant-1',
      preferences: {
        theme: 'light',
        language: 'en',
        notifications: true
      }
    };

    res.json({
      success: true,
      data: mockUser
    });
  } else {
    res.status(401).json({
      success: false,
      error: 'Unauthorized',
      message: 'Valid access token required'
    });
  }
});

// API documentation endpoint
app.get('/api/v1', (req, res) => {
  res.json({
    name: 'PrivacyGuard API',
    version: '1.0.0',
    description: 'Backend API for PrivacyGuard privacy compliance platform',
    endpoints: {
      health: '/health',
      auth: '/api/v1/auth',
      risk: '/api/v1/risk',
      dsar: '/api/v1/dsar',
      gdpr: '/api/v1/gdpr',
    },
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Route ${req.originalUrl} not found`,
    timestamp: new Date().toISOString()
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`✅ PrivacyGuard Backend Server running on port ${PORT}`);
  console.log(`📊 Health check available at http://localhost:${PORT}/health`);
  console.log(`🔗 API available at http://localhost:${PORT}/api/v1`);
  console.log(`🔧 Development mode - mock data enabled`);
});
