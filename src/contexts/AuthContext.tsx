import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, MFAMethod } from '../types';
import type { AuthProvider as AuthProviderType } from '../types';
import { authService, AuthenticationResult } from '../services/authService';
import { sessionService, SessionWarning } from '../services/sessionService';
import SessionTimeoutWarning from '../components/auth/SessionTimeoutWarning';

interface AuthContextType {
  user: User | null;
  sessionId: string | null;
  login: (email: string, password: string, provider?: AuthProviderType) => Promise<AuthenticationResult>;
  loginWithMFA: (sessionId: string, method: string, code: string) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
  loading: boolean;
  requiresMFA: boolean;
  mfaMethods: MFAMethod[];
  sessionWarning: SessionWarning | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthContextProviderProps {
  children: ReactNode;
}

export const AuthContextProvider: React.FC<AuthContextProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [requiresMFA, setRequiresMFA] = useState(false);
  const [mfaMethods, setMfaMethods] = useState<MFAMethod[]>([]);
  const [sessionWarning, setSessionWarning] = useState<SessionWarning | null>(null);

  useEffect(() => {
    checkExistingSession();
  }, []);

  const checkExistingSession = async () => {
    try {
      const savedSessionId = localStorage.getItem('privacyguard_session');
      const savedUser = localStorage.getItem('privacyguard_user');
      
      if (savedSessionId && savedUser) {
        const result = await sessionService.validateSession(savedSessionId);
        if (result.valid && result.user) {
          setUser(result.user);
          setSessionId(savedSessionId);
          initializeSession(savedSessionId);
        } else {
          // Session invalid, clear storage
          localStorage.removeItem('privacyguard_session');
          localStorage.removeItem('privacyguard_user');
        }
      }
    } catch (error) {
      console.error('Session check failed:', error);
      localStorage.removeItem('privacyguard_session');
      localStorage.removeItem('privacyguard_user');
    } finally {
      setLoading(false);
    }
  };

  const initializeSession = (sessionId: string) => {
    sessionService.initializeSession(
      sessionId,
      {
        timeoutMinutes: 30,
        warningMinutes: 5,
        maxConcurrentSessions: 3,
        extendOnActivity: true,
        requireReauthForSensitive: false
      },
      (warning) => setSessionWarning(warning),
      () => handleSessionExpired()
    );
  };

  const handleSessionExpired = () => {
    setUser(null);
    setSessionId(null);
    setSessionWarning(null);
    localStorage.removeItem('privacyguard_session');
    localStorage.removeItem('privacyguard_user');
    // Redirect to login or show expired message
    window.location.href = '/login?expired=true';
  };

  const login = async (email: string, password: string, provider?: AuthProviderType): Promise<AuthenticationResult> => {
    setLoading(true);
    setRequiresMFA(false);
    setMfaMethods([]);
    
    try {
      const result = await authService.authenticate(email, password, provider);
      
      if (result.success) {
        if (result.requiresMFA && result.mfaMethods) {
          // MFA required
          setRequiresMFA(true);
          setMfaMethods(result.mfaMethods);
          if (result.sessionId) {
            setSessionId(result.sessionId);
          }
        } else if (result.user && result.sessionId) {
          // Direct login success
          setUser(result.user);
          setSessionId(result.sessionId);
          localStorage.setItem('privacyguard_user', JSON.stringify(result.user));
          localStorage.setItem('privacyguard_session', result.sessionId);
          
          // Store tokens if available
          if (result.tokens) {
            localStorage.setItem('privacyguard_access_token', result.tokens.accessToken);
            if (result.tokens.refreshToken) {
              localStorage.setItem('privacyguard_refresh_token', result.tokens.refreshToken);
            }
          }
          
          initializeSession(result.sessionId);
        }
      }
      
      return result;
    } catch (error) {
      return { success: false, error: 'Network error during authentication' };
    } finally {
      setLoading(false);
    }
  };

  const loginWithMFA = async (sessionId: string, method: string, code: string) => {
    setLoading(true);
    
    try {
      const result = await authService.verifyMFA(sessionId, method, code);
      
      if (result.success && result.user && result.sessionId) {
        setUser(result.user);
        setSessionId(result.sessionId);
        setRequiresMFA(false);
        setMfaMethods([]);
        localStorage.setItem('privacyguard_user', JSON.stringify(result.user));
        localStorage.setItem('privacyguard_session', result.sessionId);
        initializeSession(result.sessionId);
      } else {
        throw new Error(result.error || 'MFA verification failed');
      }
    } catch (error) {
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    if (sessionId) {
      await sessionService.logout(sessionId);
    }
    
    setUser(null);
    setSessionId(null);
    setRequiresMFA(false);
    setMfaMethods([]);
    setSessionWarning(null);
    localStorage.removeItem('privacyguard_user');
    localStorage.removeItem('privacyguard_session');
    sessionService.cleanup();
  };

  const handleExtendSession = async () => {
    if (!sessionId) return;
    
    try {
      const result = await sessionService.extendSession(sessionId);
      if (result.success && result.newSessionId) {
        setSessionId(result.newSessionId);
        localStorage.setItem('privacyguard_session', result.newSessionId);
        setSessionWarning(null);
      }
    } catch (error) {
      console.error('Failed to extend session:', error);
    }
  };

  const handleLogoutFromWarning = () => {
    logout();
  };

  return (
    <AuthContext.Provider value={{
      user,
      sessionId,
      login,
      loginWithMFA,
      logout,
      isAuthenticated: !!user && !!sessionId,
      loading,
      requiresMFA,
      mfaMethods,
      sessionWarning
    }}>
      {children}
      
      {/* Session Timeout Warning */}
      {sessionWarning && (
        <SessionTimeoutWarning
          show={sessionWarning.show}
          remainingMinutes={sessionWarning.remainingMinutes}
          onExtend={handleExtendSession}
          onLogout={handleLogoutFromWarning}
        />
      )}
    </AuthContext.Provider>
  );
};

// Export with original name for backward compatibility
export { AuthContextProvider as AuthProvider };