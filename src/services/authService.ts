import { User, AuthProvider, MFAMethod, Session } from '../types';

export interface AuthenticationResult {
  success: boolean;
  user?: User;
  requiresMFA?: boolean;
  mfaMethods?: MFAMethod[];
  sessionId?: string;
  tokens?: {
    accessToken: string;
    refreshToken?: string;
    expiresIn: number;
  };
  error?: string;
}

export interface MFAVerificationResult {
  success: boolean;
  user?: User;
  sessionId?: string;
  error?: string;
}

export class AuthService {
  private static instance: AuthService;
  private baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';

  constructor() {
    console.log('AuthService initialized with baseUrl:', this.baseUrl);
    if (this.baseUrl.includes('mock-disabled')) {
      console.log('🎭 Mock authentication mode enabled - no backend API calls will be made');
    }
  }

  static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService();
    }
    return AuthService.instance;
  }

  // Basic authentication
  async authenticate(email: string, password: string, provider?: AuthProvider): Promise<AuthenticationResult> {
    // Mock authentication for demo purposes - check this FIRST to avoid network calls
    const demoUsers = {
      'admin@privacycomply.com': {
        id: 'admin-1',
        name: 'Admin User',
        email: 'admin@privacycomply.com',
        role: 'admin' as const,
        department: 'IT',
        lastLogin: new Date(),
        permissions: [],
        mfaEnabled: false,
        authProvider: { type: 'local' as const, name: 'Local Provider', config: {} },
        password: 'Admin123!@#'
      },
      'dpo@privacycomply.com': {
        id: 'dpo-1',
        name: 'Data Protection Officer',
        email: 'dpo@privacycomply.com',
        role: 'dpo' as const,
        department: 'Legal',
        lastLogin: new Date(),
        permissions: [],
        mfaEnabled: false,
        authProvider: { type: 'local' as const, name: 'Local Provider', config: {} },
        password: 'DPO123!@#'
      },
      'compliance@privacycomply.com': {
        id: 'compliance-1',
        name: 'Compliance Officer',
        email: 'compliance@privacycomply.com',
        role: 'compliance' as const,
        department: 'Compliance',
        lastLogin: new Date(),
        permissions: [],
        mfaEnabled: false,
        authProvider: { type: 'local' as const, name: 'Local Provider', config: {} },
        password: 'Compliance123!@#'
      },
      'legal@privacycomply.com': {
        id: 'legal-1',
        name: 'Legal Counsel',
        email: 'legal@privacycomply.com',
        role: 'legal' as const,
        department: 'Legal',
        lastLogin: new Date(),
        permissions: [],
        mfaEnabled: false,
        authProvider: { type: 'local' as const, name: 'Local Provider', config: {} },
        password: 'Legal123!@#'
      },
      'business@privacycomply.com': {
        id: 'business-1',
        name: 'Business User',
        email: 'business@privacycomply.com',
        role: 'business' as const,
        department: 'Business',
        lastLogin: new Date(),
        permissions: [],
        mfaEnabled: false,
        authProvider: { type: 'local' as const, name: 'Local Provider', config: {} },
        password: 'Business123!@#'
      }
    };

    // Check if this is a demo user FIRST - no network calls for demo users
    const demoUser = demoUsers[email as keyof typeof demoUsers];
    if (demoUser && demoUser.password === password) {
      const { password: _, ...userWithoutPassword } = demoUser;
      const sessionId = `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      
      console.log('Demo user authenticated:', userWithoutPassword.email, 'Role:', userWithoutPassword.role);
      
      return {
        success: true,
        user: userWithoutPassword,
        sessionId,
        tokens: {
          accessToken: sessionId,
          expiresIn: 3600
        }
      };
    }

    // Only try backend API for non-demo users
    // Skip backend calls if in mock mode
    if (this.baseUrl.includes('mock-disabled')) {
      return { success: false, error: 'Invalid credentials. Please use demo accounts: dpo@privacycomply.com, compliance@privacycomply.com, etc.' };
    }

    // For production backend, try direct authentication without health check
    if (this.baseUrl.includes('privacycomply.ai')) {
      console.log('🌐 Using live backend authentication:', this.baseUrl);
    } else {
      // Check if local backend is available first
      const isBackendAvailable = await this.checkBackendHealth();
      if (!isBackendAvailable) {
        return { success: false, error: 'Backend unavailable. Please use demo accounts or check if the backend service is running.' };
      }
    }

    try {
      const response = await fetch(`${this.baseUrl}/api/v1/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          password,
          provider: provider?.type || 'local'
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        return { success: false, error: data.error || 'Authentication failed' };
      }

      // Handle the backend's response format
      if (data.success && data.data) {
        return {
          success: true,
          user: data.data.user,
          tokens: data.data.tokens,
          requiresMFA: data.data.requiresMFA || false,
          mfaMethods: data.data.mfaMethods || [],
          sessionId: data.data.tokens?.accessToken // Use access token as session ID
        };
      }

      return { success: false, error: 'Invalid response format' };
    } catch (error) {
      return { success: false, error: 'Backend unavailable. Please use demo accounts.' };
    }
  }

  // Check if backend is available
  private async checkBackendHealth(): Promise<boolean> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout for production
      
      // Try different health check endpoints
      const healthEndpoints = ['/health', '/api/v1/health', '/api/health'];
      
      for (const endpoint of healthEndpoints) {
        try {
          const response = await fetch(`${this.baseUrl}${endpoint}`, {
            method: 'GET',
            signal: controller.signal,
            headers: {
              'Accept': 'application/json',
              'Content-Type': 'application/json'
            }
          });
          
          if (response.ok) {
            clearTimeout(timeoutId);
            console.log(`✅ Backend health check passed: ${this.baseUrl}${endpoint}`);
            return true;
          }
        } catch (endpointError) {
          // Continue to next endpoint
          continue;
        }
      }
      
      clearTimeout(timeoutId);
      return false;
    } catch (error) {
      console.warn('⚠️ Backend health check failed:', error);
      return false;
    }
  }

  // Active Directory authentication
  async authenticateActiveDirectory(username: string, password: string, domain: string): Promise<AuthenticationResult> {
    try {
      const response = await fetch(`${this.baseUrl}/api/v1/auth/ad`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username,
          password,
          domain
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        return { success: false, error: data.message || 'Active Directory authentication failed' };
      }

      return {
        success: true,
        user: data.user,
        requiresMFA: data.requiresMFA,
        mfaMethods: data.mfaMethods,
        sessionId: data.sessionId
      };
    } catch (error) {
      return { success: false, error: 'Network error during AD authentication' };
    }
  }

  // SAML authentication
  async initiateSAMLAuth(providerId: string): Promise<{ redirectUrl: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/api/v1/auth/saml/initiate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ providerId }),
      });

      const data = await response.json();
      return { redirectUrl: data.redirectUrl };
    } catch (error) {
      throw new Error('Failed to initiate SAML authentication');
    }
  }

  // OAuth authentication
  async initiateOAuthAuth(providerId: string): Promise<{ redirectUrl: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/api/v1/auth/oauth/initiate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ providerId }),
      });

      const data = await response.json();
      return { redirectUrl: data.redirectUrl };
    } catch (error) {
      throw new Error('Failed to initiate OAuth authentication');
    }
  }

  // Handle OAuth/SAML callback
  async handleAuthCallback(code: string, state: string, provider: string): Promise<AuthenticationResult> {
    try {
      const response = await fetch(`${this.baseUrl}/api/v1/auth/callback`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ code, state, provider }),
      });

      const data = await response.json();

      if (!response.ok) {
        return { success: false, error: data.message || 'Callback authentication failed' };
      }

      return {
        success: true,
        user: data.user,
        requiresMFA: data.requiresMFA,
        mfaMethods: data.mfaMethods,
        sessionId: data.sessionId
      };
    } catch (error) {
      return { success: false, error: 'Network error during callback authentication' };
    }
  }

  // MFA verification
  async verifyMFA(sessionId: string, method: string, code: string): Promise<MFAVerificationResult> {
    try {
      const response = await fetch(`${this.baseUrl}/api/v1/auth/mfa/verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionId,
          method,
          code
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        return { success: false, error: data.message || 'MFA verification failed' };
      }

      return {
        success: true,
        user: data.user,
        sessionId: data.sessionId
      };
    } catch (error) {
      return { success: false, error: 'Network error during MFA verification' };
    }
  }

  // Session management
  async validateSession(sessionId: string): Promise<{ valid: boolean; user?: User }> {
    try {
      const response = await fetch(`${this.baseUrl}/api/v1/auth/session/validate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${sessionId}`
        },
      });

      const data = await response.json();

      return {
        valid: response.ok,
        user: data.user
      };
    } catch (error) {
      return { valid: false };
    }
  }

  async refreshSession(sessionId: string): Promise<{ success: boolean; newSessionId?: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/api/v1/auth/session/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${sessionId}`
        },
      });

      const data = await response.json();

      return {
        success: response.ok,
        newSessionId: data.sessionId
      };
    } catch (error) {
      return { success: false };
    }
  }

  async logout(sessionId: string): Promise<void> {
    try {
      await fetch(`${this.baseUrl}/api/v1/auth/logout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${sessionId}`
        },
      });
    } catch (error) {
      console.error('Logout error:', error);
    }
  }

  async logoutAllSessions(userId: string): Promise<void> {
    try {
      await fetch(`${this.baseUrl}/api/v1/auth/logout-all`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId }),
      });
    } catch (error) {
      console.error('Logout all sessions error:', error);
    }
  }

  // Get active sessions
  async getActiveSessions(userId: string): Promise<Session[]> {
    try {
      const response = await fetch(`${this.baseUrl}/api/v1/auth/sessions/${userId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();
      return data.sessions || [];
    } catch (error) {
      console.error('Get active sessions error:', error);
      return [];
    }
  }
}

export const authService = AuthService.getInstance();