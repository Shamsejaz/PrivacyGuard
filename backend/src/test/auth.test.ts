import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { Request, Response, NextFunction } from 'express';
import { authenticate, authorize, AuthenticatedRequest } from '../middleware/auth';
import { AuthService } from '../services/AuthService';
import { UserRepository } from '../repositories/UserRepository';
import { AuthenticationError, ValidationError } from '../middleware/errorHandler';

// Mock dependencies
vi.mock('../repositories/UserRepository.js');
vi.mock('../utils/logger.js', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn()
  },
  auditLog: vi.fn(),
  securityLog: vi.fn()
}));

describe('Authentication Middleware', () => {
  let req: Partial<AuthenticatedRequest>;
  let res: Partial<Response>;
  let next: NextFunction;

  beforeEach(() => {
    req = {
      headers: {},
      user: undefined
    };
    res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn()
    };
    next = vi.fn();
    
    // Set up JWT secret for tests
    process.env.JWT_SECRET = 'test-secret-key';
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('authenticate middleware', () => {
    it('should authenticate valid JWT token', () => {
      const payload = {
        id: 'user-123',
        email: 'test@example.com',
        role: 'admin',
        permissions: ['*']
      };
      
      const token = jwt.sign(payload, process.env.JWT_SECRET!);
      req.headers!.authorization = `Bearer ${token}`;

      authenticate(req as AuthenticatedRequest, res as Response, next);

      expect(req.user).toEqual({
        id: 'user-123',
        email: 'test@example.com',
        role: 'admin',
        permissions: ['*']
      });
      expect(next).toHaveBeenCalledWith();
    });

    it('should reject request without authorization header', () => {
      authenticate(req as AuthenticatedRequest, res as Response, next);

      expect(next).toHaveBeenCalledWith(
        expect.any(AuthenticationError)
      );
      expect(req.user).toBeUndefined();
    });

    it('should reject request with invalid token format', () => {
      req.headers!.authorization = 'InvalidFormat token123';

      authenticate(req as AuthenticatedRequest, res as Response, next);

      expect(next).toHaveBeenCalledWith(
        expect.any(AuthenticationError)
      );
      expect(req.user).toBeUndefined();
    });

    it('should reject request with invalid JWT token', () => {
      req.headers!.authorization = 'Bearer invalid-token';

      authenticate(req as AuthenticatedRequest, res as Response, next);

      expect(next).toHaveBeenCalledWith(
        expect.any(AuthenticationError)
      );
      expect(req.user).toBeUndefined();
    });

    it('should reject expired JWT token', () => {
      const payload = {
        id: 'user-123',
        email: 'test@example.com',
        role: 'admin',
        permissions: ['*']
      };
      
      const expiredToken = jwt.sign(payload, process.env.JWT_SECRET!, { expiresIn: '-1h' });
      req.headers!.authorization = `Bearer ${expiredToken}`;

      authenticate(req as AuthenticatedRequest, res as Response, next);

      expect(next).toHaveBeenCalledWith(
        expect.any(AuthenticationError)
      );
      expect(req.user).toBeUndefined();
    });

    it('should handle missing JWT_SECRET', () => {
      delete process.env.JWT_SECRET;
      
      const payload = { id: 'user-123', email: 'test@example.com', role: 'admin' };
      const token = jwt.sign(payload, 'some-secret');
      req.headers!.authorization = `Bearer ${token}`;

      authenticate(req as AuthenticatedRequest, res as Response, next);

      expect(next).toHaveBeenCalledWith(expect.any(Error));
    });
  });

  describe('authorize middleware', () => {
    beforeEach(() => {
      req.user = {
        id: 'user-123',
        email: 'test@example.com',
        role: 'compliance',
        permissions: ['dsar:read', 'dsar:update', 'gdpr:read']
      };
    });

    it('should allow admin users full access', () => {
      req.user!.role = 'admin';
      const middleware = authorize(['users:delete']);

      middleware(req as AuthenticatedRequest, res as Response, next);

      expect(next).toHaveBeenCalledWith();
    });

    it('should allow users with wildcard permissions', () => {
      req.user!.permissions = ['*'];
      const middleware = authorize(['users:delete']);

      middleware(req as AuthenticatedRequest, res as Response, next);

      expect(next).toHaveBeenCalledWith();
    });

    it('should allow users with specific permissions', () => {
      const middleware = authorize(['dsar:read']);

      middleware(req as AuthenticatedRequest, res as Response, next);

      expect(next).toHaveBeenCalledWith();
    });

    it('should allow users with resource wildcard permissions', () => {
      req.user!.permissions = ['dsar:*'];
      const middleware = authorize(['dsar:delete']);

      middleware(req as AuthenticatedRequest, res as Response, next);

      expect(next).toHaveBeenCalledWith();
    });

    it('should deny users without required permissions', () => {
      const middleware = authorize(['users:delete']);

      middleware(req as AuthenticatedRequest, res as Response, next);

      expect(next).toHaveBeenCalledWith(
        expect.any(Error)
      );
    });

    it('should deny unauthenticated requests', () => {
      req.user = undefined;
      const middleware = authorize(['dsar:read']);

      middleware(req as AuthenticatedRequest, res as Response, next);

      expect(next).toHaveBeenCalledWith(
        expect.any(AuthenticationError)
      );
    });

    it('should handle multiple required permissions', () => {
      const middleware = authorize(['dsar:read', 'gdpr:read']);

      middleware(req as AuthenticatedRequest, res as Response, next);

      expect(next).toHaveBeenCalledWith();
    });

    it('should deny when user has none of the required permissions', () => {
      const middleware = authorize(['users:create', 'users:delete']);

      middleware(req as AuthenticatedRequest, res as Response, next);

      expect(next).toHaveBeenCalledWith(
        expect.any(Error)
      );
    });
  });
});

describe('AuthService', () => {
  let authService: AuthService;
  let mockUserRepository: any;

  beforeEach(() => {
    // Set up environment variables
    process.env.JWT_SECRET = 'test-secret-key';
    process.env.JWT_REFRESH_SECRET = 'test-refresh-secret';
    process.env.JWT_ACCESS_EXPIRY = '15m';
    process.env.JWT_REFRESH_EXPIRY = '7d';
    process.env.BCRYPT_ROUNDS = '10';

    // Mock UserRepository
    mockUserRepository = {
      findByEmail: vi.fn(),
      findById: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      updateLastLogin: vi.fn(),
      logActivity: vi.fn(),
      createSession: vi.fn(),
      findSessionByTokenHash: vi.fn(),
      deleteSession: vi.fn()
    };

    vi.mocked(UserRepository).mockImplementation(() => mockUserRepository);
    authService = new AuthService();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('register', () => {
    it('should register a new user successfully', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'Password123!',
        name: 'Test User',
        role: 'compliance' as const
      };

      const hashedPassword = await bcrypt.hash(userData.password, 10);
      const mockUser = {
        id: 'user-123',
        email: userData.email,
        password_hash: hashedPassword,
        name: userData.name,
        role: userData.role,
        permissions: [],
        created_at: new Date(),
        updated_at: new Date()
      };

      mockUserRepository.findByEmail.mockResolvedValue(null);
      mockUserRepository.create.mockResolvedValue(mockUser);

      const result = await authService.register(userData);

      expect(mockUserRepository.findByEmail).toHaveBeenCalledWith(userData.email);
      expect(mockUserRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          email: userData.email,
          name: userData.name,
          role: userData.role,
          password_hash: expect.any(String)
        })
      );
      expect(result).toEqual(expect.objectContaining({
        id: mockUser.id,
        email: mockUser.email,
        name: mockUser.name,
        role: mockUser.role
      }));
      expect(result).not.toHaveProperty('password_hash');
    });

    it('should reject registration with invalid email', async () => {
      const userData = {
        email: 'invalid-email',
        password: 'Password123!',
        name: 'Test User',
        role: 'compliance' as const
      };

      await expect(authService.register(userData)).rejects.toThrow(ValidationError);
    });

    it('should reject registration with weak password', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'weak',
        name: 'Test User',
        role: 'compliance' as const
      };

      await expect(authService.register(userData)).rejects.toThrow(ValidationError);
    });

    it('should reject registration with existing email', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'Password123!',
        name: 'Test User',
        role: 'compliance' as const
      };

      mockUserRepository.findByEmail.mockResolvedValue({ id: 'existing-user' });

      await expect(authService.register(userData)).rejects.toThrow(ValidationError);
    });
  });

  describe('login', () => {
    it('should login user with valid credentials', async () => {
      const loginData = {
        email: 'test@example.com',
        password: 'Password123!'
      };

      const hashedPassword = await bcrypt.hash(loginData.password, 10);
      const mockUser = {
        id: 'user-123',
        email: loginData.email,
        password_hash: hashedPassword,
        name: 'Test User',
        role: 'compliance',
        permissions: [],
        created_at: new Date(),
        updated_at: new Date()
      };

      mockUserRepository.findByEmail.mockResolvedValue(mockUser);
      mockUserRepository.updateLastLogin.mockResolvedValue(undefined);
      mockUserRepository.logActivity.mockResolvedValue(undefined);
      mockUserRepository.createSession.mockResolvedValue({});

      const result = await authService.login(loginData);

      expect(mockUserRepository.findByEmail).toHaveBeenCalledWith(loginData.email);
      expect(mockUserRepository.updateLastLogin).toHaveBeenCalledWith(mockUser.id);
      expect(result).toHaveProperty('user');
      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(result).toHaveProperty('expiresIn');
      expect(result.user).not.toHaveProperty('password_hash');
    });

    it('should reject login with invalid email', async () => {
      const loginData = {
        email: 'nonexistent@example.com',
        password: 'Password123!'
      };

      mockUserRepository.findByEmail.mockResolvedValue(null);

      await expect(authService.login(loginData)).rejects.toThrow(AuthenticationError);
    });

    it('should reject login with invalid password', async () => {
      const loginData = {
        email: 'test@example.com',
        password: 'WrongPassword'
      };

      const hashedPassword = await bcrypt.hash('CorrectPassword', 10);
      const mockUser = {
        id: 'user-123',
        email: loginData.email,
        password_hash: hashedPassword,
        name: 'Test User',
        role: 'compliance',
        permissions: []
      };

      mockUserRepository.findByEmail.mockResolvedValue(mockUser);

      await expect(authService.login(loginData)).rejects.toThrow(AuthenticationError);
    });
  });

  describe('validateToken', () => {
    it('should validate valid token and return user', async () => {
      const payload = {
        id: 'user-123',
        email: 'test@example.com',
        role: 'compliance',
        permissions: []
      };

      const token = jwt.sign(payload, process.env.JWT_SECRET!);
      const mockUser = {
        id: payload.id,
        email: payload.email,
        password_hash: 'hashed',
        name: 'Test User',
        role: payload.role,
        permissions: payload.permissions,
        created_at: new Date(),
        updated_at: new Date()
      };

      mockUserRepository.findById.mockResolvedValue(mockUser);

      const result = await authService.validateToken(token);

      expect(mockUserRepository.findById).toHaveBeenCalledWith(payload.id);
      expect(result).toEqual(expect.objectContaining({
        id: mockUser.id,
        email: mockUser.email,
        role: mockUser.role
      }));
      expect(result).not.toHaveProperty('password_hash');
    });

    it('should return null for invalid token', async () => {
      const result = await authService.validateToken('invalid-token');
      expect(result).toBeNull();
    });

    it('should return null for valid token with non-existent user', async () => {
      const payload = { id: 'nonexistent-user', email: 'test@example.com', role: 'compliance' };
      const token = jwt.sign(payload, process.env.JWT_SECRET!);

      mockUserRepository.findById.mockResolvedValue(null);

      const result = await authService.validateToken(token);
      expect(result).toBeNull();
    });
  });

  describe('refreshToken', () => {
    it('should refresh valid token', async () => {
      const payload = { id: 'user-123', type: 'refresh' };
      const refreshToken = jwt.sign(payload, process.env.JWT_REFRESH_SECRET!);
      
      const mockSession = {
        id: 'session-123',
        user_id: payload.id,
        token_hash: 'hash',
        expires_at: new Date(Date.now() + 86400000)
      };

      const mockUser = {
        id: payload.id,
        email: 'test@example.com',
        password_hash: 'hashed',
        name: 'Test User',
        role: 'compliance',
        permissions: [],
        created_at: new Date(),
        updated_at: new Date()
      };

      mockUserRepository.findSessionByTokenHash.mockResolvedValue(mockSession);
      mockUserRepository.findById.mockResolvedValue(mockUser);
      mockUserRepository.deleteSession.mockResolvedValue(undefined);
      mockUserRepository.createSession.mockResolvedValue({});
      mockUserRepository.logActivity.mockResolvedValue(undefined);

      const result = await authService.refreshToken(refreshToken);

      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(result).toHaveProperty('expiresIn');
    });

    it('should reject invalid refresh token', async () => {
      await expect(authService.refreshToken('invalid-token')).rejects.toThrow(AuthenticationError);
    });

    it('should reject refresh token without valid session', async () => {
      const payload = { id: 'user-123', type: 'refresh' };
      const refreshToken = jwt.sign(payload, process.env.JWT_REFRESH_SECRET!);

      mockUserRepository.findSessionByTokenHash.mockResolvedValue(null);

      await expect(authService.refreshToken(refreshToken)).rejects.toThrow(AuthenticationError);
    });
  });

  describe('changePassword', () => {
    it('should change password with valid current password', async () => {
      const userId = 'user-123';
      const currentPassword = 'OldPassword123!';
      const newPassword = 'NewPassword123!';

      const hashedCurrentPassword = await bcrypt.hash(currentPassword, 10);
      const mockUser = {
        id: userId,
        email: 'test@example.com',
        password_hash: hashedCurrentPassword,
        name: 'Test User',
        role: 'compliance',
        permissions: []
      };

      mockUserRepository.findById.mockResolvedValue(mockUser);
      mockUserRepository.update.mockResolvedValue(mockUser);
      mockUserRepository.logActivity.mockResolvedValue(undefined);

      await expect(authService.changePassword(userId, currentPassword, newPassword)).resolves.not.toThrow();

      expect(mockUserRepository.update).toHaveBeenCalledWith(
        userId,
        expect.objectContaining({
          password_hash: expect.any(String)
        })
      );
    });

    it('should reject password change with invalid current password', async () => {
      const userId = 'user-123';
      const currentPassword = 'WrongPassword';
      const newPassword = 'NewPassword123!';

      const hashedCurrentPassword = await bcrypt.hash('CorrectPassword', 10);
      const mockUser = {
        id: userId,
        email: 'test@example.com',
        password_hash: hashedCurrentPassword,
        name: 'Test User',
        role: 'compliance',
        permissions: []
      };

      mockUserRepository.findById.mockResolvedValue(mockUser);

      await expect(authService.changePassword(userId, currentPassword, newPassword)).rejects.toThrow(AuthenticationError);
    });

    it('should reject weak new password', async () => {
      const userId = 'user-123';
      const currentPassword = 'OldPassword123!';
      const newPassword = 'weak';

      const hashedCurrentPassword = await bcrypt.hash(currentPassword, 10);
      const mockUser = {
        id: userId,
        email: 'test@example.com',
        password_hash: hashedCurrentPassword,
        name: 'Test User',
        role: 'compliance',
        permissions: []
      };

      mockUserRepository.findById.mockResolvedValue(mockUser);

      await expect(authService.changePassword(userId, currentPassword, newPassword)).rejects.toThrow(ValidationError);
    });
  });
});
