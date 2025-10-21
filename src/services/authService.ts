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

  static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService();
    }
    return AuthService.instance;
  }

  // Basic authentication
  async authenticate(email: string, password: string, provider?: AuthProvider): Promise<AuthenticationResult> {
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
      return { success: false, error: 'Network error during authentication' };
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