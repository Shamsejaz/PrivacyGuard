import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

// Extend Express Request interface
interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
    permissions: string[];
  };
}

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// In-memory storage (temporary until databases are set up)
const users = new Map();
const sessions = new Map();

// Initialize with default users
const initializeUsers = async () => {
  const saltRounds = 12;
  
  // Admin user
  const adminPasswordHash = await bcrypt.hash('Admin123!@#', saltRounds);
  users.set('admin@privacyguard.com', {
    id: '1',
    email: 'admin@privacyguard.com',
    password_hash: adminPasswordHash,
    name: 'System Administrator',
    role: 'admin',
    department: 'IT Security',
    permissions: ['read', 'write', 'admin', 'manage_users', 'manage_system'],
    createdAt: new Date(),
    updatedAt: new Date()
  });

  // DPO user
  const dpoPasswordHash = await bcrypt.hash('DPO123!@#', saltRounds);
  users.set('dpo@privacyguard.com', {
    id: '2',
    email: 'dpo@privacyguard.com',
    password_hash: dpoPasswordHash,
    name: 'Data Protection Officer',
    role: 'dpo',
    department: 'Legal & Compliance',
    permissions: ['read', 'write', 'manage_compliance', 'manage_dsar'],
    createdAt: new Date(),
    updatedAt: new Date()
  });

  // Compliance user
  const compliancePasswordHash = await bcrypt.hash('Compliance123!@#', saltRounds);
  users.set('compliance@privacyguard.com', {
    id: '3',
    email: 'compliance@privacyguard.com',
    password_hash: compliancePasswordHash,
    name: 'Compliance Manager',
    role: 'compliance',
    department: 'Legal & Compliance',
    permissions: ['read', 'write', 'manage_compliance'],
    createdAt: new Date(),
    updatedAt: new Date()
  });

  console.log('✅ Default users initialized');
  console.log('📋 Available Credentials:');
  console.log('  Admin: admin@privacyguard.com / Admin123!@#');
  console.log('  DPO: dpo@privacyguard.com / DPO123!@#');
  console.log('  Compliance: compliance@privacyguard.com / Compliance123!@#');
};

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
}));

// CORS configuration
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Compression middleware
app.use(compression());

// Logging middleware
app.use(morgan('combined'));

// JWT middleware
const authenticateToken = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({
      success: false,
      error: 'Access token required'
    });
  }

  jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret', (err: any, decoded: any) => {
    if (err) {
      return res.status(403).json({
        success: false,
        error: 'Invalid or expired token'
      });
    }
    req.user = decoded;
    next();
  });
};

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    version: '1.0.0',
    database: 'in-memory (temporary)',
  });
});

// Authentication endpoints
app.post('/api/v1/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Email and password are required'
      });
    }

    const user = users.get(email.toLowerCase());
    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials'
      });
    }

    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    if (!isValidPassword) {
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials'
      });
    }

    // Generate JWT tokens
    const accessToken = jwt.sign(
      { 
        id: user.id, 
        email: user.email, 
        role: user.role,
        permissions: user.permissions 
      },
      process.env.JWT_SECRET || 'fallback-secret',
      { expiresIn: process.env.JWT_ACCESS_EXPIRY || '15m' }
    );

    const refreshToken = jwt.sign(
      { id: user.id, email: user.email },
      process.env.JWT_REFRESH_SECRET || 'fallback-refresh-secret',
      { expiresIn: process.env.JWT_REFRESH_EXPIRY || '7d' }
    );

    // Store session
    sessions.set(refreshToken, {
      userId: user.id,
      email: user.email,
      createdAt: new Date()
    });

    // Return user data (without password)
    const { password_hash, ...userWithoutPassword } = user;

    res.json({
      success: true,
      data: {
        user: userWithoutPassword,
        tokens: {
          accessToken,
          refreshToken,
          expiresIn: 900 // 15 minutes
        }
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

app.post('/api/v1/auth/logout', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  // In a real implementation, you'd add the token to a blacklist
  // For now, just return success
  
  res.json({
    success: true,
    message: 'Logged out successfully'
  });
});

app.post('/api/v1/auth/refresh', (req, res) => {
  const { refreshToken } = req.body;
  
  if (!refreshToken) {
    return res.status(401).json({
      success: false,
      error: 'Refresh token required'
    });
  }

  const session = sessions.get(refreshToken);
  if (!session) {
    return res.status(401).json({
      success: false,
      error: 'Invalid refresh token'
    });
  }

  try {
    jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET || 'fallback-refresh-secret');
    
    const user = users.get(session.email);
    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'User not found'
      });
    }

    // Generate new access token
    const accessToken = jwt.sign(
      { 
        id: user.id, 
        email: user.email, 
        role: user.role,
        permissions: user.permissions 
      },
      process.env.JWT_SECRET || 'fallback-secret',
      { expiresIn: process.env.JWT_ACCESS_EXPIRY || '15m' }
    );

    res.json({
      success: true,
      data: {
        accessToken,
        expiresIn: 900
      }
    });

  } catch (error) {
    res.status(401).json({
      success: false,
      error: 'Invalid refresh token'
    });
  }
});

app.get('/api/v1/auth/me', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  const user = users.get(req.user.email);
  if (!user) {
    return res.status(404).json({
      success: false,
      error: 'User not found'
    });
  }

  const { password_hash, ...userWithoutPassword } = user;
  res.json({
    success: true,
    data: userWithoutPassword
  });
});

// Include all the mock endpoints from the simple server
// Risk Assessment endpoints
app.get('/api/v1/risk/assessments', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
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
      ownerId: req.user.id,
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

// API documentation endpoint
app.get('/api/v1', (req, res) => {
  res.json({
    name: 'PrivacyGuard API',
    version: '1.0.0',
    description: 'Backend API for PrivacyGuard privacy compliance platform',
    authentication: 'JWT Bearer Token',
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

// Error handler
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    success: false,
    error: 'Internal server error',
    timestamp: new Date().toISOString()
  });
});

// Initialize and start server
const startServer = async () => {
  try {
    await initializeUsers();
    
    app.listen(PORT, () => {
      console.log(`✅ PrivacyGuard Backend Server running on port ${PORT}`);
      console.log(`📊 Health check available at http://localhost:${PORT}/health`);
      console.log(`🔗 API available at http://localhost:${PORT}/api/v1`);
      console.log(`🔐 Authentication: Real JWT-based auth with bcrypt`);
      console.log(`💾 Storage: In-memory (temporary until databases are set up)`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();