import { Router } from 'express';
import type { Request, Response } from 'express';
import Joi from 'joi';
import { asyncHandler, ValidationError } from '../middleware/errorHandler';
import { authRateLimiter } from '../middleware/rateLimiter';
import { authenticate } from '../middleware/auth';
import type { AuthenticatedRequest } from '../middleware/auth';
import { AuthService } from '../services/AuthService';
import { logger } from '../utils/logger';

const router = Router();
const authService = new AuthService();

// Apply rate limiting to auth routes
router.use((req, res, next) => {
  return authRateLimiter.middleware(req, res, next);
});

// Validation schemas
const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(1).required()
});

const refreshSchema = Joi.object({
  refreshToken: Joi.string().required()
});

const changePasswordSchema = Joi.object({
  currentPassword: Joi.string().required(),
  newPassword: Joi.string().min(8).required()
});

// POST /api/v1/auth/login
router.post('/login', asyncHandler(async (req: Request, res: Response) => {
  // Validate request body
  const { error, value } = loginSchema.validate(req.body);
  if (error) {
    throw new ValidationError(error.details[0].message);
  }

  const { email, password } = value;
  const ipAddress = req.ip || req.connection.remoteAddress;
  const userAgent = req.get('User-Agent');

  try {
    const authResponse = await authService.login(
      { email, password },
      ipAddress,
      userAgent
    );

    logger.info(`User logged in successfully: ${email}`, {
      userId: authResponse.user.id,
      ipAddress,
      userAgent
    });

    res.json({
      success: true,
      data: authResponse,
      message: 'Login successful'
    });

  } catch (error) {
    logger.warn(`Login failed for email: ${email}`, {
      ipAddress,
      userAgent,
      error: error.message
    });
    throw error;
  }
}));

// POST /api/v1/auth/logout
router.post('/logout', authenticate, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const refreshToken = req.body.refreshToken;
  const userId = req.user?.id;

  try {
    await authService.logout(refreshToken, userId);

    logger.info(`User logged out successfully`, {
      userId,
      ipAddress: req.ip
    });

    res.json({
      success: true,
      message: 'Logout successful'
    });

  } catch (error) {
    logger.error('Logout error:', error);
    // Don't throw error for logout - always return success
    res.json({
      success: true,
      message: 'Logout successful'
    });
  }
}));

// POST /api/v1/auth/refresh
router.post('/refresh', asyncHandler(async (req: Request, res: Response) => {
  // Validate request body
  const { error, value } = refreshSchema.validate(req.body);
  if (error) {
    throw new ValidationError(error.details[0].message);
  }

  const { refreshToken } = value;

  try {
    const tokens = await authService.refreshToken(refreshToken);

    logger.info('Token refreshed successfully');

    res.json({
      success: true,
      data: tokens,
      message: 'Token refreshed successfully'
    });

  } catch (error) {
    logger.warn('Token refresh failed:', error.message);
    throw error;
  }
}));

// GET /api/v1/auth/me
router.get('/me', authenticate, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    throw new ValidationError('User not found in request');
  }

  res.json({
    success: true,
    data: {
      user: req.user
    },
    message: 'User profile retrieved successfully'
  });
}));

// POST /api/v1/auth/change-password
router.post('/change-password', authenticate, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  // Validate request body
  const { error, value } = changePasswordSchema.validate(req.body);
  if (error) {
    throw new ValidationError(error.details[0].message);
  }

  const { currentPassword, newPassword } = value;
  const userId = req.user?.id;

  if (!userId) {
    throw new ValidationError('User not authenticated');
  }

  try {
    await authService.changePassword(userId, currentPassword, newPassword);

    logger.info(`Password changed successfully for user: ${userId}`);

    res.json({
      success: true,
      message: 'Password changed successfully'
    });

  } catch (error) {
    logger.warn(`Password change failed for user: ${userId}`, {
      error: error.message
    });
    throw error;
  }
}));

// POST /api/v1/auth/validate-token
router.post('/validate-token', asyncHandler(async (req: Request, res: Response) => {
  const token = req.body.token || req.headers.authorization?.replace('Bearer ', '');

  if (!token) {
    throw new ValidationError('Token is required');
  }

  try {
    const user = await authService.validateToken(token);

    if (!user) {
      res.json({
        success: false,
        valid: false,
        message: 'Invalid token'
      });
      return;
    }

    res.json({
      success: true,
      valid: true,
      data: { user },
      message: 'Token is valid'
    });

  } catch (error) {
    res.json({
      success: false,
      valid: false,
      message: 'Invalid token'
    });
  }
}));

export default router;
