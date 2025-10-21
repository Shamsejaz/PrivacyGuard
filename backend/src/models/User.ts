export interface User {
  id: string;
  email: string;
  password_hash: string;
  name: string;
  role: 'admin' | 'dpo' | 'compliance' | 'legal' | 'business';
  department?: string;
  permissions: Permission[];
  last_login?: Date;
  created_at: Date;
  updated_at: Date;
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

export interface LoginRequest {
  email: string;
  password: string;
}

export interface AuthResponse {
  user: Omit<User, 'password_hash'>;
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface UserSession {
  id: string;
  user_id: string;
  token_hash: string;
  expires_at: Date;
  created_at: Date;
}

export interface UserActivity {
  id: string;
  user_id: string;
  action: string;
  resource_type?: string;
  resource_id?: string;
  ip_address?: string;
  user_agent?: string;
  details?: Record<string, any>;
  created_at: Date;
}

// Default permissions by role
export const DEFAULT_PERMISSIONS: Record<string, Permission[]> = {
  admin: [
    { resource: '*', actions: ['create', 'read', 'update', 'delete'] }
  ],
  dpo: [
    { resource: 'dsar', actions: ['create', 'read', 'update', 'delete'] },
    { resource: 'gdpr', actions: ['create', 'read', 'update', 'delete'] },
    { resource: 'risk', actions: ['create', 'read', 'update', 'delete'] },
    { resource: 'policy', actions: ['create', 'read', 'update', 'delete'] },
    { resource: 'analytics', actions: ['read'] },
    { resource: 'users', actions: ['read'] }
  ],
  compliance: [
    { resource: 'dsar', actions: ['read', 'update'] },
    { resource: 'gdpr', actions: ['read', 'update'] },
    { resource: 'risk', actions: ['read', 'update'] },
    { resource: 'policy', actions: ['read'] },
    { resource: 'analytics', actions: ['read'] }
  ],
  legal: [
    { resource: 'dsar', actions: ['read', 'update'] },
    { resource: 'gdpr', actions: ['read'] },
    { resource: 'policy', actions: ['create', 'read', 'update'] },
    { resource: 'analytics', actions: ['read'] }
  ],
  business: [
    { resource: 'dsar', actions: ['create', 'read'] },
    { resource: 'gdpr', actions: ['read'] },
    { resource: 'policy', actions: ['read'] },
    { resource: 'analytics', actions: ['read'] }
  ]
};
