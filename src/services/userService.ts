import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';

export interface User {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'dpo' | 'compliance' | 'legal' | 'business';
  department?: string;
  permissions: Permission[];
  createdAt: string;
  updatedAt: string;
  lastLoginAt?: string;
  isActive: boolean;
}

export interface Permission {
  resource: string;
  actions: ('create' | 'read' | 'update' | 'delete')[];
  conditions?: Record<string, any>;
}

export interface CreateUserRequest {
  email: string;
  password: string;
  name: string;
  role: 'admin' | 'dpo' | 'compliance' | 'legal' | 'business';
  department?: string;
  permissions?: Permission[];
}

export interface UpdateUserRequest {
  name?: string;
  role?: 'admin' | 'dpo' | 'compliance' | 'legal' | 'business';
  department?: string;
  permissions?: Permission[];
}

export interface GetUsersParams {
  role?: string;
  department?: string;
  page?: number;
  limit?: number;
}

export interface GetUsersResponse {
  users: User[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

class UserService {
  private getAuthHeaders() {
    const token = localStorage.getItem('accessToken');
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };
  }

  async getUsers(params: GetUsersParams = {}): Promise<GetUsersResponse> {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/v1/users`, {
        headers: this.getAuthHeaders(),
        params
      });

      if (response.data.success) {
        return response.data.data;
      } else {
        throw new Error(response.data.message || 'Failed to fetch users');
      }
    } catch (error) {
      console.error('Error fetching users:', error);
      throw error;
    }
  }

  async getUserById(id: string): Promise<User> {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/v1/users/${id}`, {
        headers: this.getAuthHeaders()
      });

      if (response.data.success) {
        return response.data.data.user;
      } else {
        throw new Error(response.data.message || 'Failed to fetch user');
      }
    } catch (error) {
      console.error('Error fetching user:', error);
      throw error;
    }
  }

  async createUser(userData: CreateUserRequest): Promise<User> {
    try {
      const response = await axios.post(`${API_BASE_URL}/api/v1/users`, userData, {
        headers: this.getAuthHeaders()
      });

      if (response.data.success) {
        return response.data.data.user;
      } else {
        throw new Error(response.data.message || 'Failed to create user');
      }
    } catch (error) {
      console.error('Error creating user:', error);
      throw error;
    }
  }

  async updateUser(id: string, userData: UpdateUserRequest): Promise<User> {
    try {
      const response = await axios.put(`${API_BASE_URL}/api/v1/users/${id}`, userData, {
        headers: this.getAuthHeaders()
      });

      if (response.data.success) {
        return response.data.data.user;
      } else {
        throw new Error(response.data.message || 'Failed to update user');
      }
    } catch (error) {
      console.error('Error updating user:', error);
      throw error;
    }
  }

  async deleteUser(id: string): Promise<void> {
    try {
      const response = await axios.delete(`${API_BASE_URL}/api/v1/users/${id}`, {
        headers: this.getAuthHeaders()
      });

      if (!response.data.success) {
        throw new Error(response.data.message || 'Failed to delete user');
      }
    } catch (error) {
      console.error('Error deleting user:', error);
      throw error;
    }
  }

  async updateUserRole(id: string, role: string): Promise<User> {
    try {
      const response = await axios.put(`${API_BASE_URL}/api/v1/users/${id}/role`, { role }, {
        headers: this.getAuthHeaders()
      });

      if (response.data.success) {
        return response.data.data.user;
      } else {
        throw new Error(response.data.message || 'Failed to update user role');
      }
    } catch (error) {
      console.error('Error updating user role:', error);
      throw error;
    }
  }

  async getRoles(): Promise<Array<{
    id: string;
    name: string;
    description: string;
    permissions: Permission[];
    userCount: number;
  }>> {
    return [
      {
        id: 'admin',
        name: 'Administrator',
        description: 'Full system access and configuration',
        permissions: [
          { resource: '*', actions: ['create', 'read', 'update', 'delete'] }
        ],
        userCount: 0
      },
      {
        id: 'dpo',
        name: 'Data Protection Officer',
        description: 'Privacy compliance management and oversight',
        permissions: [
          { resource: 'dsar', actions: ['create', 'read', 'update', 'delete'] },
          { resource: 'gdpr', actions: ['create', 'read', 'update', 'delete'] }
        ],
        userCount: 0
      },
      {
        id: 'compliance',
        name: 'Compliance Manager',
        description: 'Compliance monitoring and reporting',
        permissions: [
          { resource: 'compliance', actions: ['create', 'read', 'update'] }
        ],
        userCount: 0
      }
    ];
  }
}

export const userService = new UserService();