import { Router, type Response } from 'express';
import * as Joi from 'joi';
import { asyncHandler, ValidationError } from '../middleware/errorHandler';
import { authenticate, authorize } from '../middleware/auth';
import type { AuthenticatedRequest } from '../middleware/auth';
import { UserService } from '../services/UserService';
import { logger } from '../utils/logger';

const router = Router();
const userService = new UserService();

// Apply authentication to all user routes
router.use(authenticate);

// Validation schemas
const createUserSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(8).required(),
  name: Joi.string().min(1).max(255).required(),
  role: Joi.string().valid('admin', 'dpo', 'compliance', 'legal', 'business').required(),
  department: Joi.string().max(255).optional(),
  permissions: Joi.array().items(Joi.object({
    resource: Joi.string().required(),
    actions: Joi.array().items(Joi.string().valid('create', 'read', 'update', 'delete')).required(),
    conditions: Joi.object().optional()
  })).optional()
});

const updateUserSchema = Joi.object({
  name: Joi.string().min(1).max(255).optional(),
  role: Joi.string().valid('admin', 'dpo', 'compliance', 'legal', 'business').optional(),
  department: Joi.string().max(255).optional().allow(''),
  permissions: Joi.array().items(Joi.object({
    resource: Joi.string().required(),
    actions: Joi.array().items(Joi.string().valid('create', 'read', 'update', 'delete')).required(),
    conditions: Joi.object().optional()
  })).optional()
});

const getUsersQuerySchema = Joi.object({
  role: Joi.string().valid('admin', 'dpo', 'compliance', 'legal', 'business').optional(),
  department: Joi.string().optional(),
  page: Joi.number().integer().min(1).optional(),
  limit: Joi.number().integer().min(1).max(100).optional()
});

// GET /api/v1/users - Get all users (admin or users with read permission)
router.get('/', authorize(['users:read']), asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  // Validate query parameters
  const { error, value } = getUsersQuerySchema.validate(req.query);
  if (error) {
    throw new ValidationError(error.details[0].message);
  }

  try {
    const result = await userService.getUsers({
      role: value.role,
      department: value.department,
      page: value.page,
      limit: value.limit
    });

    res.json({
      success: true,
      data: result,
      message: 'Users retrieved successfully'
    });

  } catch (error) {
    logger.error('Error retrieving users:', error);
    throw error;
  }
}));

// GET /api/v1/users/:id - Get user by ID
router.get('/:id', authorize(['users:read']), asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;

  try {
    const user = await userService.getUserById(id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      data: { user },
      message: 'User retrieved successfully'
    });

  } catch (error) {
    logger.error('Error retrieving user:', error);
    throw error;
  }
}));

// POST /api/v1/users - Create new user (admin only)
router.post('/', authorize(['users:create']), asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  // Validate request body
  const { error, value } = createUserSchema.validate(req.body);
  if (error) {
    throw new ValidationError(error.details[0].message);
  }

  const createdBy = req.user?.id;
  if (!createdBy) {
    throw new ValidationError('User not authenticated');
  }

  try {
    const user = await userService.createUser(value, createdBy);

    logger.info(`User created: ${user.email}`, {
      createdBy,
      userId: user.id,
      role: user.role
    });

    return res.status(201).json({
      success: true,
      data: { user },
      message: 'User created successfully'
    });

  } catch (error) {
    logger.error('Error creating user:', error);
    throw error;
  }
}));

// PUT /api/v1/users/:id - Update user
router.put('/:id', authorize(['users:update']), asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  
  // Validate request body
  const { error, value } = updateUserSchema.validate(req.body);
  if (error) {
    throw new ValidationError(error.details[0].message);
  }

  const updatedBy = req.user?.id;
  if (!updatedBy) {
    throw new ValidationError('User not authenticated');
  }

  try {
    const user = await userService.updateUser(id, value, updatedBy);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    logger.info(`User updated: ${user.email}`, {
      updatedBy,
      userId: user.id,
      changes: value
    });

    res.json({
      success: true,
      data: { user },
      message: 'User updated successfully'
    });

  } catch (error) {
    logger.error('Error updating user:', error);
    throw error;
  }
}));

// DELETE /api/v1/users/:id - Delete user (admin only)
router.delete('/:id', authorize(['users:delete']), asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  
  const deletedBy = req.user?.id;
  if (!deletedBy) {
    throw new ValidationError('User not authenticated');
  }

  try {
    const deleted = await userService.deleteUser(id, deletedBy);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    logger.info(`User deleted`, {
      deletedBy,
      userId: id
    });

    res.json({
      success: true,
      message: 'User deleted successfully'
    });

  } catch (error) {
    logger.error('Error deleting user:', error);
    throw error;
  }
}));

// PUT /api/v1/users/:id/role - Update user role (admin only)
router.put('/:id/role', authorize(['users:update']), asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const { role } = req.body;

  if (!role) {
    throw new ValidationError('Role is required');
  }

  const updatedBy = req.user?.id;
  if (!updatedBy) {
    throw new ValidationError('User not authenticated');
  }

  try {
    const user = await userService.updateUserRole(id, role, updatedBy);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    logger.info(`User role updated: ${user.email}`, {
      updatedBy,
      userId: user.id,
      newRole: role
    });

    res.json({
      success: true,
      data: { user },
      message: 'User role updated successfully'
    });

  } catch (error) {
    logger.error('Error updating user role:', error);
    throw error;
  }
}));

// PUT /api/v1/users/:id/permissions - Update user permissions (admin only)
router.put('/:id/permissions', authorize(['users:update']), asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const { permissions } = req.body;

  if (!Array.isArray(permissions)) {
    throw new ValidationError('Permissions must be an array');
  }

  const updatedBy = req.user?.id;
  if (!updatedBy) {
    throw new ValidationError('User not authenticated');
  }

  try {
    const user = await userService.updateUserPermissions(id, permissions, updatedBy);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    logger.info(`User permissions updated: ${user.email}`, {
      updatedBy,
      userId: user.id,
      permissionsCount: permissions.length
    });

    res.json({
      success: true,
      data: { user },
      message: 'User permissions updated successfully'
    });

  } catch (error) {
    logger.error('Error updating user permissions:', error);
    throw error;
  }
}));

// GET /api/v1/users/:id/activity - Get user activity log
router.get('/:id/activity', authorize(['users:read']), asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const { action, resourceType, limit, offset } = req.query;

  try {
    const activities = await userService.getUserActivity(id, {
      action: action as string,
      resourceType: resourceType as string,
      limit: limit ? parseInt(limit as string) : undefined,
      offset: offset ? parseInt(offset as string) : undefined
    });

    res.json({
      success: true,
      data: { activities },
      message: 'User activity retrieved successfully'
    });

  } catch (error) {
    logger.error('Error retrieving user activity:', error);
    throw error;
  }
}));

// GET /api/v1/users/me/profile - Get current user profile
router.get('/me/profile', asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    throw new ValidationError('User not authenticated');
  }

  try {
    const user = await userService.getUserById(req.user.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      data: { user },
      message: 'Profile retrieved successfully'
    });

  } catch (error) {
    logger.error('Error retrieving user profile:', error);
    throw error;
  }
}));

// PUT /api/v1/users/me/profile - Update current user profile
router.put('/me/profile', asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    throw new ValidationError('User not authenticated');
  }

  // Only allow updating name and department for own profile
  const allowedUpdates = {
    name: req.body.name,
    department: req.body.department
  };

  // Remove undefined values
  Object.keys(allowedUpdates).forEach(key => {
    if (allowedUpdates[key as keyof typeof allowedUpdates] === undefined) {
      delete allowedUpdates[key as keyof typeof allowedUpdates];
    }
  });

  try {
    const user = await userService.updateUser(req.user.id, allowedUpdates, req.user.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    logger.info(`User updated own profile: ${user.email}`, {
      userId: user.id,
      changes: allowedUpdates
    });

    res.json({
      success: true,
      data: { user },
      message: 'Profile updated successfully'
    });

  } catch (error) {
    logger.error('Error updating user profile:', error);
    throw error;
  }
}));

export default router;
