

export interface Permission {
  resource: string;
  actions: string[];
  conditions?: Record<string, any>;
}

export interface User {
  id: string;
  email: string;
  name: string;
  password_hash: string;
  role: string;
  department?: string;
  position?: string;
  status: 'active' | 'inactive' | 'suspended';
  permissions: Permission[];
  createdAt: Date;
  updatedAt: Date;
  lastLoginAt?: Date;
  profilePicture?: string;
  phoneNumber?: string;
  twoFactorEnabled: boolean;
  emailVerified: boolean;
  resetPasswordToken?: string;
  resetPasswordExpires?: Date;
}

export interface CreateUserRequest {
  email: string;
  password: string;
  name: string;
  role: string;
  department?: string;
  position?: string;
  permissions?: Permission[];
  phoneNumber?: string;
  profilePicture?: string;
}

export interface UpdateUserRequest {
  email?: string;
  name?: string;
  role?: string;
  department?: string;
  position?: string;
  status?: 'active' | 'inactive' | 'suspended';
  permissions?: Permission[];
  phoneNumber?: string;
  profilePicture?: string;
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
  userId: string;
  tokenHash: string;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserActivity {
  id: string;
  userId: string;
  action: string;
  resourceType?: string;
  resourceId?: string;
  ip_address?: string;
  user_agent?: string;
  createdAt: Date;
}