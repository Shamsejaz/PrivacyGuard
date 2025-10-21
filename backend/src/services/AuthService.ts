import * as bcrypt from 'bcryptjs';
import * as jwt from 'jsonwebtoken';
import * as crypto from 'crypto';
import { UserRepository } from '../repositories/UserRepository';
import type { User, CreateUserRequest, LoginRequest, AuthResponse } from '../models/User';
import { DEFAULT_PERMISSIONS } from '../config/permissions';
import { logger, auditLog, securityLog } from '../utils/logger';
import { AuthenticationError, ValidationError } from '../middleware/errorHandler';

export class AuthService {
  private userRepository: UserRepository;
  private jwtSecret: string;
  private jwtRefreshSecret: string;
  private accessTokenExpiry: string;
  private refreshTokenExpiry: string;

  constructor() {
    this.userRepository = new UserRepository();
    
    this.jwtSecret = process.env.JWT_SECRET || '';
    this.jwtRefreshSecret = process.env.JWT_REFRESH_SECRET || '';
    this.accessTokenExpiry = process.env.JWT_ACCESS_EXPIRY || '15m';
    this.refreshTokenExpiry = process.env.JWT_REFRESH_EXPIRY || '7d';

    if (!this.jwtSecret || !this.jwtRefreshSecret) {
      throw new Error('JWT secrets not configured');
    }
  }

  async register(userData: CreateUserRequest, createdBy?: string): Promise<User> {
    try {
      // Validate email format
      if (!this.isValidEmail(userData.email)) {
        throw new ValidationError('Invalid email format');
      }

      // Check if user already exists
      const existingUser = await this.userRepository.findByEmail(userData.email);
      if (existingUser) {
        throw new ValidationError('User with this email already exists');
      }

      // Validate password strength
      if (!this.isValidPassword(userData.password)) {
        throw new ValidationError('Password must be at least 8 characters long and contain uppercase, lowercase, number, and special character');
      }

      // Hash password
      const saltRounds = parseInt(process.env.BCRYPT_ROUNDS || '12');
      const password_hash = await bcrypt.hash(userData.password, saltRounds);

      // Set default permissions if not provided
      const permissions = userData.permissions || DEFAULT_PERMISSIONS[userData.role] || [];

      // Create user
      const user = await this.userRepository.create({
        ...userData,
        password_hash,
        permissions
      });

      // Log audit event
      auditLog('user_created', createdBy, 'user', user.id, {
        email: user.email,
        role: user.role,
        department: user.department
      });

      // Remove password hash from response
      const { password_hash: _, ...userWithoutPassword } = user;
      return userWithoutPassword as User;

    } catch (error) {
      logger.error('Error registering user:', error);
      throw error;
    }
  }

  async login(loginData: LoginRequest, ipAddress?: string, userAgent?: string): Promise<AuthResponse> {
    try {
      // Find user by email
      const user = await this.userRepository.findByEmail(loginData.email);
      if (!user) {
        securityLog('login_failed', 'medium', { email: loginData.email, reason: 'user_not_found', ipAddress });
        throw new AuthenticationError('Invalid email or password');
      }

      // Verify password
      const isValidPassword = await bcrypt.compare(loginData.password, user.password_hash);
      if (!isValidPassword) {
        securityLog('login_failed', 'medium', { 
          email: loginData.email, 
          userId: user.id, 
          reason: 'invalid_password', 
          ipAddress 
        });
        throw new AuthenticationError('Invalid email or password');
      }

      // Generate tokens
      const { accessToken, refreshToken } = await this.generateTokens(user);

      // Update last login
      await this.userRepository.updateLastLogin(user.id);

      // Log activity
      await this.userRepository.logActivity({
        user_id: user.id,
        action: 'login',
        ip_address: ipAddress,
        user_agent: userAgent
      });

      // Log audit event
      auditLog('user_login', user.id, 'user', user.id, { ipAddress, userAgent });

      // Remove password hash from response
      const { password_hash: _, ...userWithoutPassword } = user;

      return {
        user: userWithoutPassword as Omit<User, 'password_hash'>,
        accessToken,
        refreshToken,
        expiresIn: this.getTokenExpirySeconds(this.accessTokenExpiry)
      };

    } catch (error) {
      logger.error('Error during login:', error);
      throw error;
    }
  }

  async logout(refreshToken: string, userId?: string): Promise<void> {
    try {
      if (refreshToken) {
        const tokenHash = this.hashToken(refreshToken);
        await this.userRepository.deleteSession(tokenHash);
      }

      if (userId) {
        // Log activity
        await this.userRepository.logActivity({
          user_id: userId,
          action: 'logout'
        });

        // Log audit event
        auditLog('user_logout', userId, 'user', userId);
      }

    } catch (error) {
      logger.error('Error during logout:', error);
      throw error;
    }
  }

  async refreshToken(refreshToken: string): Promise<{ accessToken: string; refreshToken: string; expiresIn: number }> {
    try {
      // Verify refresh token
      const decoded = jwt.verify(refreshToken, this.jwtRefreshSecret) as any;
      
      // Check if session exists and is valid
      const tokenHash = this.hashToken(refreshToken);
      const session = await this.userRepository.findSessionByTokenHash(tokenHash);
      
      if (!session) {
        throw new AuthenticationError('Invalid refresh token');
      }

      // Get user
      const user = await this.userRepository.findById(decoded.id);
      if (!user) {
        throw new AuthenticationError('User not found');
      }

      // Generate new tokens
      const tokens = await this.generateTokens(user);

      // Delete old session
      await this.userRepository.deleteSession(tokenHash);

      // Log activity
      await this.userRepository.logActivity({
        user_id: user.id,
        action: 'token_refresh'
      });

      return {
        ...tokens,
        expiresIn: this.getTokenExpirySeconds(this.accessTokenExpiry)
      };

    } catch (error) {
      if (error instanceof jwt.JsonWebTokenError) {
        throw new AuthenticationError('Invalid refresh token');
      }
      logger.error('Error refreshing token:', error);
      throw error;
    }
  }

  async validateToken(token: string): Promise<Omit<User, 'password_hash'> | null> {
    try {
      const decoded = jwt.verify(token, this.jwtSecret) as any;
      
      const user = await this.userRepository.findById(decoded.id);
      if (!user) {
        return null;
      }

      // Remove password hash from response
      const { password_hash: _, ...userWithoutPassword } = user;
      return userWithoutPassword as Omit<User, 'password_hash'>;

    } catch (error) {
      if (error instanceof jwt.JsonWebTokenError) {
        return null;
      }
      logger.error('Error validating token:', error);
      throw error;
    }
  }

  async changePassword(userId: string, currentPassword: string, newPassword: string): Promise<void> {
    try {
      // Get user
      const user = await this.userRepository.findById(userId);
      if (!user) {
        throw new AuthenticationError('User not found');
      }

      // Verify current password
      const isValidPassword = await bcrypt.compare(currentPassword, user.password_hash);
      if (!isValidPassword) {
        throw new AuthenticationError('Current password is incorrect');
      }

      // Validate new password
      if (!this.isValidPassword(newPassword)) {
        throw new ValidationError('New password must be at least 8 characters long and contain uppercase, lowercase, number, and special character');
      }

      // Hash new password
      const saltRounds = parseInt(process.env.BCRYPT_ROUNDS || '12');
      const password_hash = await bcrypt.hash(newPassword, saltRounds);

      // Update password in database
      await this.userRepository.update(userId, { password_hash } as any);

      // Log activity
      await this.userRepository.logActivity({
        user_id: userId,
        action: 'password_changed'
      });

      // Log audit event
      auditLog('password_changed', userId, 'user', userId);

    } catch (error) {
      logger.error('Error changing password:', error);
      throw error;
    }
  }

  private async generateTokens(user: User): Promise<{ accessToken: string; refreshToken: string }> {
    const payload = {
      id: user.id,
      email: user.email,
      role: user.role,
      permissions: user.permissions.map(p => `${p.resource}:${p.actions.join(',')}`),
    };

    // Generate access token
    const accessToken = jwt.sign(payload, this.jwtSecret, {
      expiresIn: this.accessTokenExpiry,
      issuer: 'privacyguard',
      audience: 'privacyguard-app'
    } as jwt.SignOptions);

    // Generate refresh token
    const refreshToken = jwt.sign(
      { id: user.id, type: 'refresh' },
      this.jwtRefreshSecret,
      {
        expiresIn: this.refreshTokenExpiry,
        issuer: 'privacyguard',
        audience: 'privacyguard-app'
      } as jwt.SignOptions
    );

    // Store refresh token session
    const tokenHash = this.hashToken(refreshToken);
    const expiresAt = new Date(Date.now() + this.getTokenExpirySeconds(this.refreshTokenExpiry) * 1000);
    
    await this.userRepository.createSession(user.id, tokenHash, expiresAt);

    return { accessToken, refreshToken };
  }

  private hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  private getTokenExpirySeconds(expiry: string): number {
    const match = expiry.match(/^(\d+)([smhd])$/);
    if (!match) return 900; // Default 15 minutes

    const value = parseInt(match[1]);
    const unit = match[2];

    switch (unit) {
      case 's': return value;
      case 'm': return value * 60;
      case 'h': return value * 60 * 60;
      case 'd': return value * 24 * 60 * 60;
      default: return 900;
    }
  }

  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  private isValidPassword(password: string): boolean {
    // At least 8 characters, 1 uppercase, 1 lowercase, 1 number, 1 special character
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    return passwordRegex.test(password);
  }

  // Cleanup expired sessions (should be called periodically)
  async cleanupExpiredSessions(): Promise<void> {
    try {
      await this.userRepository.deleteExpiredSessions();
    } catch (error) {
      logger.error('Error cleaning up expired sessions:', error);
    }
  }
}
