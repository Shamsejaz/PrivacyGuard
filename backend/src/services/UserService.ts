import { UserRepository } from '../repositories/UserRepository';
import type { User, CreateUserRequest, UpdateUserRequest } from '../models/User';
import { DEFAULT_PERMISSIONS } from '../config/permissions';
import { AuthService } from './AuthService';
import { logger, auditLog } from '../utils/logger';
import { ValidationError, NotFoundError, AuthorizationError } from '../middleware/errorHandler';

export class UserService {
  private userRepository: UserRepository;
  private authService: AuthService;

  constructor() {
    this.userRepository = new UserRepository();
    this.authService = new AuthService();
  }

  async createUser(userData: CreateUserRequest, createdBy: string): Promise<Omit<User, 'password_hash'>> {
    try {
      // Validate required fields
      if (!userData.email || !userData.password || !userData.name || !userData.role) {
        throw new ValidationError('Email, password, name, and role are required');
      }

      // Create user through auth service (handles validation and hashing)
      const user = await this.authService.register(userData, createdBy);
      
      return user;

    } catch (error) {
      logger.error('Error creating user:', error);
      throw error;
    }
  }

  async getUserById(id: string): Promise<Omit<User, 'password_hash'> | null> {
    try {
      const user = await this.userRepository.findById(id);
      
      if (!user) {
        return null;
      }

      // Remove password hash from response
      const { password_hash: _, ...userWithoutPassword } = user;
      return userWithoutPassword as Omit<User, 'password_hash'>;

    } catch (error) {
      logger.error('Error getting user by ID:', error);
      throw error;
    }
  }

  async getUserByEmail(email: string): Promise<Omit<User, 'password_hash'> | null> {
    try {
      const user = await this.userRepository.findByEmail(email);
      
      if (!user) {
        return null;
      }

      // Remove password hash from response
      const { password_hash: _, ...userWithoutPassword } = user;
      return userWithoutPassword as Omit<User, 'password_hash'>;

    } catch (error) {
      logger.error('Error getting user by email:', error);
      throw error;
    }
  }

  async updateUser(id: string, updates: UpdateUserRequest, updatedBy: string): Promise<Omit<User, 'password_hash'> | null> {
    try {
      // Check if user exists
      const existingUser = await this.userRepository.findById(id);
      if (!existingUser) {
        throw new NotFoundError('User not found');
      }

      // If role is being updated, set default permissions for new role
      if (updates.role && updates.role !== existingUser.role) {
        updates.permissions = DEFAULT_PERMISSIONS[updates.role] || [];
      }

      const updatedUser = await this.userRepository.update(id, updates);
      
      if (!updatedUser) {
        throw new NotFoundError('User not found');
      }

      // Log audit event
      auditLog('user_updated', updatedBy, 'user', id, {
        changes: updates,
        previousRole: existingUser.role,
        newRole: updates.role
      });

      // Remove password hash from response
      const { password_hash: _, ...userWithoutPassword } = updatedUser;
      return userWithoutPassword as Omit<User, 'password_hash'>;

    } catch (error) {
      logger.error('Error updating user:', error);
      throw error;
    }
  }

  async deleteUser(id: string, deletedBy: string): Promise<boolean> {
    try {
      // Check if user exists
      const existingUser = await this.userRepository.findById(id);
      if (!existingUser) {
        throw new NotFoundError('User not found');
      }

      // Prevent self-deletion
      if (id === deletedBy) {
        throw new ValidationError('Cannot delete your own account');
      }

      const deleted = await this.userRepository.delete(id);

      if (deleted) {
        // Log audit event
        auditLog('user_deleted', deletedBy, 'user', id, {
          deletedUser: {
            email: existingUser.email,
            role: existingUser.role,
            department: existingUser.department
          }
        });
      }

      return deleted;

    } catch (error) {
      logger.error('Error deleting user:', error);
      throw error;
    }
  }

  async getUsers(filters: {
    role?: string;
    department?: string;
    page?: number;
    limit?: number;
  }): Promise<{
    users: Omit<User, 'password_hash'>[];
    total: number;
    page: number;
    limit: number;
  }> {
    try {
      const page = filters.page || 1;
      const limit = Math.min(filters.limit || 20, 100); // Max 100 users per page
      const offset = (page - 1) * limit;

      const users = await this.userRepository.findMany({
        role: filters.role,
        department: filters.department,
        limit,
        offset
      });

      // Remove password hashes from response
      const usersWithoutPasswords = users.map(user => {
        const { password_hash: _, ...userWithoutPassword } = user;
        return userWithoutPassword as Omit<User, 'password_hash'>;
      });

      // Get total count (simplified - in production you'd want a separate count query)
      const allUsers = await this.userRepository.findMany({
        role: filters.role,
        department: filters.department
      });

      return {
        users: usersWithoutPasswords,
        total: allUsers.length,
        page,
        limit
      };

    } catch (error) {
      logger.error('Error getting users:', error);
      throw error;
    }
  }

  async updateUserRole(id: string, newRole: string, updatedBy: string): Promise<Omit<User, 'password_hash'> | null> {
    try {
      // Validate role
      const validRoles = ['admin', 'dpo', 'compliance', 'legal', 'business'];
      if (!validRoles.includes(newRole)) {
        throw new ValidationError('Invalid role');
      }

      // Get default permissions for new role
      const permissions = DEFAULT_PERMISSIONS[newRole as keyof typeof DEFAULT_PERMISSIONS] || [];

      const updatedUser = await this.updateUser(id, { 
        role: newRole as any, 
        permissions 
      }, updatedBy);

      return updatedUser;

    } catch (error) {
      logger.error('Error updating user role:', error);
      throw error;
    }
  }

  async updateUserPermissions(id: string, permissions: any[], updatedBy: string): Promise<Omit<User, 'password_hash'> | null> {
    try {
      // Validate permissions structure
      for (const permission of permissions) {
        if (!permission.resource || !Array.isArray(permission.actions)) {
          throw new ValidationError('Invalid permission structure');
        }
      }

      const updatedUser = await this.updateUser(id, { permissions }, updatedBy);

      return updatedUser;

    } catch (error) {
      logger.error('Error updating user permissions:', error);
      throw error;
    }
  }

  async getUserActivity(userId: string, filters: {
    action?: string;
    resourceType?: string;
    limit?: number;
    offset?: number;
  } = {}): Promise<any[]> {
    try {
      // This would need to be implemented in the repository
      // For now, return empty array
      return [];

    } catch (error) {
      logger.error('Error getting user activity:', error);
      throw error;
    }
  }

  async checkUserPermission(userId: string, resource: string, action: string): Promise<boolean> {
    try {
      const user = await this.userRepository.findById(userId);
      
      if (!user) {
        return false;
      }

      // Admin has all permissions
      if (user.role === 'admin') {
        return true;
      }

      // Check specific permissions
      return user.permissions.some(permission => {
        // Wildcard permission
        if (permission.resource === '*') {
          return permission.actions.includes(action as any) || permission.actions.includes('*' as any);
        }

        // Exact resource match
        if (permission.resource === resource) {
          return permission.actions.includes(action as any);
        }

        // Resource wildcard (e.g., "dsar:*" matches "dsar:read")
        if (permission.resource.endsWith(':*')) {
          const resourcePrefix = permission.resource.slice(0, -2);
          return resource.startsWith(resourcePrefix) && permission.actions.includes(action as any);
        }

        return false;
      });

    } catch (error) {
      logger.error('Error checking user permission:', error);
      return false;
    }
  }
}
