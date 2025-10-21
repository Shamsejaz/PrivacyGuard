import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { UserService } from '../services/UserService';
import { UserRepository } from '../repositories/UserRepository';
import { AuthService } from '../services/AuthService';
import { ValidationError, NotFoundError } from '../middleware/errorHandler';
import { DEFAULT_PERMISSIONS } from '../config/permissions';

// Mock dependencies
vi.mock('../repositories/UserRepository.js');
vi.mock('../services/AuthService.js');
vi.mock('../utils/logger.js', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn()
  },
  auditLog: vi.fn()
}));

describe('UserService', () => {
  let userService: UserService;
  let mockUserRepository: any;
  let mockAuthService: any;

  beforeEach(() => {
    // Mock UserRepository
    mockUserRepository = {
      findById: vi.fn(),
      findByEmail: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      logActivity: vi.fn()
    };

    // Mock AuthService
    mockAuthService = {
      register: vi.fn()
    };

    vi.mocked(UserRepository).mockImplementation(() => mockUserRepository);
    vi.mocked(AuthService).mockImplementation(() => mockAuthService);
    
    userService = new UserService();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('createUser', () => {
    it('should create user successfully', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'Password123!',
        name: 'Test User',
        role: 'compliance' as const
      };

      const mockUser = {
        id: 'user-123',
        email: userData.email,
        name: userData.name,
        role: userData.role,
        permissions: DEFAULT_PERMISSIONS.compliance,
        created_at: new Date(),
        updated_at: new Date()
      };

      mockAuthService.register.mockResolvedValue(mockUser);

      const result = await userService.createUser(userData, 'admin-123');

      expect(mockAuthService.register).toHaveBeenCalledWith(userData, 'admin-123');
      expect(result).toEqual(mockUser);
    });

    it('should reject user creation with missing required fields', async () => {
      const userData = {
        email: 'test@example.com',
        password: '',
        name: 'Test User',
        role: 'compliance' as const
      };

      await expect(userService.createUser(userData, 'admin-123')).rejects.toThrow(ValidationError);
    });
  });

  describe('getUserById', () => {
    it('should return user without password hash', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        password_hash: 'hashed-password',
        name: 'Test User',
        role: 'compliance',
        permissions: [],
        created_at: new Date(),
        updated_at: new Date()
      };

      mockUserRepository.findById.mockResolvedValue(mockUser);

      const result = await userService.getUserById('user-123');

      expect(mockUserRepository.findById).toHaveBeenCalledWith('user-123');
      expect(result).toEqual(expect.objectContaining({
        id: mockUser.id,
        email: mockUser.email,
        name: mockUser.name,
        role: mockUser.role
      }));
      expect(result).not.toHaveProperty('password_hash');
    });

    it('should return null for non-existent user', async () => {
      mockUserRepository.findById.mockResolvedValue(null);

      const result = await userService.getUserById('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('updateUser', () => {
    it('should update user successfully', async () => {
      const userId = 'user-123';
      const updates = {
        name: 'Updated Name',
        department: 'New Department'
      };

      const existingUser = {
        id: userId,
        email: 'test@example.com',
        password_hash: 'hashed',
        name: 'Old Name',
        role: 'compliance',
        department: 'Old Department',
        permissions: [],
        created_at: new Date(),
        updated_at: new Date()
      };

      const updatedUser = {
        ...existingUser,
        ...updates,
        updated_at: new Date()
      };

      mockUserRepository.findById.mockResolvedValue(existingUser);
      mockUserRepository.update.mockResolvedValue(updatedUser);

      const result = await userService.updateUser(userId, updates, 'admin-123');

      expect(mockUserRepository.findById).toHaveBeenCalledWith(userId);
      expect(mockUserRepository.update).toHaveBeenCalledWith(userId, updates);
      expect(result).toEqual(expect.objectContaining({
        id: userId,
        name: updates.name,
        department: updates.department
      }));
      expect(result).not.toHaveProperty('password_hash');
    });

    it('should update permissions when role changes', async () => {
      const userId = 'user-123';
      const updates = {
        role: 'admin' as const
      };

      const existingUser = {
        id: userId,
        email: 'test@example.com',
        password_hash: 'hashed',
        name: 'Test User',
        role: 'compliance',
        permissions: DEFAULT_PERMISSIONS.compliance,
        created_at: new Date(),
        updated_at: new Date()
      };

      const updatedUser = {
        ...existingUser,
        role: 'admin',
        permissions: DEFAULT_PERMISSIONS.admin,
        updated_at: new Date()
      };

      mockUserRepository.findById.mockResolvedValue(existingUser);
      mockUserRepository.update.mockResolvedValue(updatedUser);

      const result = await userService.updateUser(userId, updates, 'admin-123');

      expect(mockUserRepository.update).toHaveBeenCalledWith(userId, {
        role: 'admin',
        permissions: DEFAULT_PERMISSIONS.admin
      });
      expect(result?.role).toBe('admin');
    });

    it('should throw NotFoundError for non-existent user', async () => {
      mockUserRepository.findById.mockResolvedValue(null);

      await expect(userService.updateUser('nonexistent', {}, 'admin-123')).rejects.toThrow(NotFoundError);
    });
  });

  describe('deleteUser', () => {
    it('should delete user successfully', async () => {
      const userId = 'user-123';
      const deletedBy = 'admin-123';

      const existingUser = {
        id: userId,
        email: 'test@example.com',
        password_hash: 'hashed',
        name: 'Test User',
        role: 'compliance',
        department: 'Legal',
        permissions: [],
        created_at: new Date(),
        updated_at: new Date()
      };

      mockUserRepository.findById.mockResolvedValue(existingUser);
      mockUserRepository.delete.mockResolvedValue(true);

      const result = await userService.deleteUser(userId, deletedBy);

      expect(mockUserRepository.findById).toHaveBeenCalledWith(userId);
      expect(mockUserRepository.delete).toHaveBeenCalledWith(userId);
      expect(result).toBe(true);
    });

    it('should prevent self-deletion', async () => {
      const userId = 'user-123';

      const existingUser = {
        id: userId,
        email: 'test@example.com',
        password_hash: 'hashed',
        name: 'Test User',
        role: 'admin',
        permissions: [],
        created_at: new Date(),
        updated_at: new Date()
      };

      mockUserRepository.findById.mockResolvedValue(existingUser);

      await expect(userService.deleteUser(userId, userId)).rejects.toThrow(ValidationError);
    });

    it('should throw NotFoundError for non-existent user', async () => {
      mockUserRepository.findById.mockResolvedValue(null);

      await expect(userService.deleteUser('nonexistent', 'admin-123')).rejects.toThrow(NotFoundError);
    });
  });

  describe('getUsers', () => {
    it('should return paginated users without password hashes', async () => {
      const mockUsers = [
        {
          id: 'user-1',
          email: 'user1@example.com',
          password_hash: 'hashed1',
          name: 'User 1',
          role: 'compliance',
          permissions: [],
          created_at: new Date(),
          updated_at: new Date()
        },
        {
          id: 'user-2',
          email: 'user2@example.com',
          password_hash: 'hashed2',
          name: 'User 2',
          role: 'dpo',
          permissions: [],
          created_at: new Date(),
          updated_at: new Date()
        }
      ];

      mockUserRepository.findMany
        .mockResolvedValueOnce(mockUsers) // First call for paginated results
        .mockResolvedValueOnce(mockUsers); // Second call for total count

      const result = await userService.getUsers({
        page: 1,
        limit: 10
      });

      expect(result.users).toHaveLength(2);
      expect(result.users[0]).not.toHaveProperty('password_hash');
      expect(result.users[1]).not.toHaveProperty('password_hash');
      expect(result.total).toBe(2);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(10);
    });

    it('should apply filters correctly', async () => {
      const filters = {
        role: 'admin',
        department: 'IT',
        page: 2,
        limit: 5
      };

      mockUserRepository.findMany.mockResolvedValue([]);

      await userService.getUsers(filters);

      expect(mockUserRepository.findMany).toHaveBeenCalledWith({
        role: 'admin',
        department: 'IT',
        limit: 5,
        offset: 5 // (page - 1) * limit
      });
    });

    it('should enforce maximum limit', async () => {
      mockUserRepository.findMany.mockResolvedValue([]);

      await userService.getUsers({ limit: 200 });

      expect(mockUserRepository.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          limit: 100 // Maximum enforced
        })
      );
    });
  });

  describe('updateUserRole', () => {
    it('should update user role and permissions', async () => {
      const userId = 'user-123';
      const newRole = 'admin';
      const updatedBy = 'admin-456';

      const existingUser = {
        id: userId,
        email: 'test@example.com',
        password_hash: 'hashed',
        name: 'Test User',
        role: 'compliance',
        permissions: DEFAULT_PERMISSIONS.compliance,
        created_at: new Date(),
        updated_at: new Date()
      };

      const updatedUser = {
        ...existingUser,
        role: 'admin',
        permissions: DEFAULT_PERMISSIONS.admin,
        updated_at: new Date()
      };

      mockUserRepository.findById.mockResolvedValue(existingUser);
      mockUserRepository.update.mockResolvedValue(updatedUser);

      const result = await userService.updateUserRole(userId, newRole, updatedBy);

      expect(result?.role).toBe('admin');
      expect(result?.permissions).toEqual(DEFAULT_PERMISSIONS.admin);
    });

    it('should reject invalid role', async () => {
      await expect(userService.updateUserRole('user-123', 'invalid-role', 'admin-123'))
        .rejects.toThrow(ValidationError);
    });
  });

  describe('checkUserPermission', () => {
    it('should return true for admin users', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'admin@example.com',
        password_hash: 'hashed',
        name: 'Admin User',
        role: 'admin',
        permissions: [],
        created_at: new Date(),
        updated_at: new Date()
      };

      mockUserRepository.findById.mockResolvedValue(mockUser);

      const result = await userService.checkUserPermission('user-123', 'users', 'delete');

      expect(result).toBe(true);
    });

    it('should return true for users with specific permission', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'user@example.com',
        password_hash: 'hashed',
        name: 'Regular User',
        role: 'compliance',
        permissions: [
          { resource: 'dsar', actions: ['read', 'update'] }
        ],
        created_at: new Date(),
        updated_at: new Date()
      };

      mockUserRepository.findById.mockResolvedValue(mockUser);

      const result = await userService.checkUserPermission('user-123', 'dsar', 'read');

      expect(result).toBe(true);
    });

    it('should return true for users with wildcard resource permission', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'user@example.com',
        password_hash: 'hashed',
        name: 'Regular User',
        role: 'compliance',
        permissions: [
          { resource: 'dsar:*', actions: ['read'] }
        ],
        created_at: new Date(),
        updated_at: new Date()
      };

      mockUserRepository.findById.mockResolvedValue(mockUser);

      const result = await userService.checkUserPermission('user-123', 'dsar:requests', 'read');

      expect(result).toBe(true);
    });

    it('should return false for users without permission', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'user@example.com',
        password_hash: 'hashed',
        name: 'Regular User',
        role: 'compliance',
        permissions: [
          { resource: 'dsar', actions: ['read'] }
        ],
        created_at: new Date(),
        updated_at: new Date()
      };

      mockUserRepository.findById.mockResolvedValue(mockUser);

      const result = await userService.checkUserPermission('user-123', 'users', 'delete');

      expect(result).toBe(false);
    });

    it('should return false for non-existent user', async () => {
      mockUserRepository.findById.mockResolvedValue(null);

      const result = await userService.checkUserPermission('nonexistent', 'dsar', 'read');

      expect(result).toBe(false);
    });
  });
});
