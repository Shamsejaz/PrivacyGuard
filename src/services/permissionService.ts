import { Permission, User } from '../types';

export interface Role {
  id: string;
  name: string;
  description: string;
  permissions: Permission[];
  isSystemRole: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface PermissionCheck {
  resource: string;
  action: 'create' | 'read' | 'update' | 'delete' | 'execute';
  conditions?: Record<string, any>;
}

export class PermissionService {
  private static instance: PermissionService;
  private baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';

  static getInstance(): PermissionService {
    if (!PermissionService.instance) {
      PermissionService.instance = new PermissionService();
    }
    return PermissionService.instance;
  }

  // Permission checking
  async checkPermission(userId: string, check: PermissionCheck): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/auth/permissions/check`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          resource: check.resource,
          action: check.action,
          conditions: check.conditions
        }),
      });

      const data = await response.json();
      return data.allowed || false;
    } catch (error) {
      console.error('Permission check error:', error);
      return false;
    }
  }

  // Batch permission checking
  async checkPermissions(userId: string, checks: PermissionCheck[]): Promise<Record<string, boolean>> {
    try {
      const response = await fetch(`${this.baseUrl}/auth/permissions/check-batch`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          checks
        }),
      });

      const data = await response.json();
      return data.results || {};
    } catch (error) {
      console.error('Batch permission check error:', error);
      return {};
    }
  }

  // Get user permissions
  async getUserPermissions(userId: string): Promise<Permission[]> {
    try {
      const response = await fetch(`${this.baseUrl}/auth/permissions/user/${userId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();
      return data.permissions || [];
    } catch (error) {
      console.error('Get user permissions error:', error);
      return [];
    }
  }

  // Role management
  async getRoles(): Promise<Role[]> {
    try {
      const response = await fetch(`${this.baseUrl}/auth/roles`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();
      return data.roles || [];
    } catch (error) {
      console.error('Get roles error:', error);
      return [];
    }
  }

  async createRole(role: Omit<Role, 'id' | 'createdAt' | 'updatedAt'>): Promise<{ success: boolean; role?: Role; error?: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/auth/roles`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(role),
      });

      const data = await response.json();

      if (!response.ok) {
        return { success: false, error: data.message || 'Failed to create role' };
      }

      return { success: true, role: data.role };
    } catch (error) {
      return { success: false, error: 'Network error during role creation' };
    }
  }

  async updateRole(roleId: string, updates: Partial<Role>): Promise<{ success: boolean; role?: Role; error?: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/auth/roles/${roleId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates),
      });

      const data = await response.json();

      if (!response.ok) {
        return { success: false, error: data.message || 'Failed to update role' };
      }

      return { success: true, role: data.role };
    } catch (error) {
      return { success: false, error: 'Network error during role update' };
    }
  }

  async deleteRole(roleId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/auth/roles/${roleId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const data = await response.json();
        return { success: false, error: data.message || 'Failed to delete role' };
      }

      return { success: true };
    } catch (error) {
      return { success: false, error: 'Network error during role deletion' };
    }
  }

  // User role assignment
  async assignRoleToUser(userId: string, roleId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/auth/users/${userId}/roles`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ roleId }),
      });

      if (!response.ok) {
        const data = await response.json();
        return { success: false, error: data.message || 'Failed to assign role' };
      }

      return { success: true };
    } catch (error) {
      return { success: false, error: 'Network error during role assignment' };
    }
  }

  async removeRoleFromUser(userId: string, roleId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/auth/users/${userId}/roles/${roleId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const data = await response.json();
        return { success: false, error: data.message || 'Failed to remove role' };
      }

      return { success: true };
    } catch (error) {
      return { success: false, error: 'Network error during role removal' };
    }
  }

  // Available permissions
  async getAvailablePermissions(): Promise<Permission[]> {
    try {
      const response = await fetch(`${this.baseUrl}/auth/permissions/available`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();
      return data.permissions || [];
    } catch (error) {
      console.error('Get available permissions error:', error);
      return [];
    }
  }

  // Client-side permission checking (for UI)
  hasPermission(user: User | null, resource: string, action: string): boolean {
    if (!user || !user.permissions) return false;

    return user.permissions.some(permission => 
      permission.resource === resource && permission.action === action
    );
  }

  // Check multiple permissions at once (for UI)
  hasAnyPermission(user: User | null, checks: PermissionCheck[]): boolean {
    if (!user || !user.permissions) return false;

    return checks.some(check => 
      user.permissions.some(permission => 
        permission.resource === check.resource && permission.action === check.action
      )
    );
  }

  // Check if user has all permissions (for UI)
  hasAllPermissions(user: User | null, checks: PermissionCheck[]): boolean {
    if (!user || !user.permissions) return false;

    return checks.every(check => 
      user.permissions.some(permission => 
        permission.resource === check.resource && permission.action === check.action
      )
    );
  }

  // Get permissions by resource (for UI)
  getPermissionsByResource(user: User | null, resource: string): Permission[] {
    if (!user || !user.permissions) return [];

    return user.permissions.filter(permission => permission.resource === resource);
  }
}

export const permissionService = PermissionService.getInstance();