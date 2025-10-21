import { Session } from '../types';

export interface SessionConfig {
  timeoutMinutes: number;
  warningMinutes: number;
  maxConcurrentSessions: number;
  extendOnActivity: boolean;
  requireReauthForSensitive: boolean;
}

export interface SessionWarning {
  show: boolean;
  remainingMinutes: number;
  onExtend: () => void;
  onLogout: () => void;
}

export class SessionService {
  private static instance: SessionService;
  private baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';
  private sessionTimer: NodeJS.Timeout | null = null;
  private warningTimer: NodeJS.Timeout | null = null;
  private activityTimer: NodeJS.Timeout | null = null;
  private sessionConfig: SessionConfig = {
    timeoutMinutes: 30,
    warningMinutes: 5,
    maxConcurrentSessions: 3,
    extendOnActivity: true,
    requireReauthForSensitive: false
  };
  private onSessionWarning?: (warning: SessionWarning) => void;
  private onSessionExpired?: () => void;

  static getInstance(): SessionService {
    if (!SessionService.instance) {
      SessionService.instance = new SessionService();
    }
    return SessionService.instance;
  }

  // Initialize session monitoring
  initializeSession(
    sessionId: string,
    config?: Partial<SessionConfig>,
    onWarning?: (warning: SessionWarning) => void,
    onExpired?: () => void
  ) {
    if (config) {
      this.sessionConfig = { ...this.sessionConfig, ...config };
    }
    this.onSessionWarning = onWarning;
    this.onSessionExpired = onExpired;

    this.startSessionTimer(sessionId);
    this.startActivityMonitoring(sessionId);
  }

  // Start session timeout timer
  private startSessionTimer(sessionId: string) {
    this.clearTimers();

    const timeoutMs = this.sessionConfig.timeoutMinutes * 60 * 1000;
    const warningMs = (this.sessionConfig.timeoutMinutes - this.sessionConfig.warningMinutes) * 60 * 1000;

    // Set warning timer
    this.warningTimer = setTimeout(() => {
      this.showSessionWarning(sessionId);
    }, warningMs);

    // Set session expiry timer
    this.sessionTimer = setTimeout(() => {
      this.handleSessionExpiry(sessionId);
    }, timeoutMs);
  }

  // Show session warning
  private showSessionWarning(sessionId: string) {
    if (this.onSessionWarning) {
      this.onSessionWarning({
        show: true,
        remainingMinutes: this.sessionConfig.warningMinutes,
        onExtend: () => this.extendSession(sessionId),
        onLogout: () => this.logout(sessionId)
      });
    }
  }

  // Handle session expiry
  private handleSessionExpiry(sessionId: string) {
    this.clearTimers();
    if (this.onSessionExpired) {
      this.onSessionExpired();
    }
    this.logout(sessionId);
  }

  // Start activity monitoring
  private startActivityMonitoring(sessionId: string) {
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
    
    const activityHandler = () => {
      if (this.sessionConfig.extendOnActivity) {
        // Debounce activity-based session extension
        if (this.activityTimer) {
          clearTimeout(this.activityTimer);
        }
        
        this.activityTimer = setTimeout(() => {
          this.extendSessionOnActivity(sessionId);
        }, 30000); // Extend session every 30 seconds of activity
      }
    };

    events.forEach(event => {
      document.addEventListener(event, activityHandler, true);
    });
  }

  // Extend session on activity
  private async extendSessionOnActivity(sessionId: string) {
    try {
      const result = await this.refreshSession(sessionId);
      if (result.success && result.newSessionId) {
        this.startSessionTimer(result.newSessionId);
      }
    } catch (error) {
      console.error('Failed to extend session on activity:', error);
    }
  }

  // Clear all timers
  private clearTimers() {
    if (this.sessionTimer) {
      clearTimeout(this.sessionTimer);
      this.sessionTimer = null;
    }
    if (this.warningTimer) {
      clearTimeout(this.warningTimer);
      this.warningTimer = null;
    }
    if (this.activityTimer) {
      clearTimeout(this.activityTimer);
      this.activityTimer = null;
    }
  }

  // Extend session manually
  async extendSession(sessionId: string): Promise<{ success: boolean; newSessionId?: string; error?: string }> {
    try {
      const result = await this.refreshSession(sessionId);
      if (result.success && result.newSessionId) {
        this.startSessionTimer(result.newSessionId);
      }
      return result;
    } catch (error) {
      return { success: false, error: 'Network error during session extension' };
    }
  }

  // Refresh session
  async refreshSession(sessionId: string): Promise<{ success: boolean; newSessionId?: string; error?: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/auth/session/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${sessionId}`
        },
      });

      const data = await response.json();

      if (!response.ok) {
        return { success: false, error: data.message || 'Failed to refresh session' };
      }

      return { success: true, newSessionId: data.sessionId };
    } catch (error) {
      return { success: false, error: 'Network error during session refresh' };
    }
  }

  // Validate session
  async validateSession(sessionId: string): Promise<{ valid: boolean; user?: any; error?: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/auth/session/validate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${sessionId}`
        },
      });

      const data = await response.json();

      if (!response.ok) {
        return { valid: false, error: data.message || 'Session validation failed' };
      }

      return { valid: true, user: data.user };
    } catch (error) {
      return { valid: false, error: 'Network error during session validation' };
    }
  }

  // Get active sessions
  async getActiveSessions(userId: string): Promise<Session[]> {
    try {
      const response = await fetch(`${this.baseUrl}/auth/sessions/${userId}`, {
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

  // Terminate specific session
  async terminateSession(sessionId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/auth/session/terminate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ sessionId }),
      });

      if (!response.ok) {
        const data = await response.json();
        return { success: false, error: data.message || 'Failed to terminate session' };
      }

      return { success: true };
    } catch (error) {
      return { success: false, error: 'Network error during session termination' };
    }
  }

  // Logout current session
  async logout(sessionId: string): Promise<void> {
    this.clearTimers();
    
    try {
      await fetch(`${this.baseUrl}/auth/logout`, {
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

  // Logout all sessions
  async logoutAllSessions(userId: string): Promise<{ success: boolean; error?: string }> {
    this.clearTimers();
    
    try {
      const response = await fetch(`${this.baseUrl}/auth/logout-all`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId }),
      });

      if (!response.ok) {
        const data = await response.json();
        return { success: false, error: data.message || 'Failed to logout all sessions' };
      }

      return { success: true };
    } catch (error) {
      return { success: false, error: 'Network error during logout all sessions' };
    }
  }

  // Check concurrent session limit
  async checkConcurrentSessions(userId: string): Promise<{ withinLimit: boolean; activeCount: number; limit: number }> {
    try {
      const sessions = await this.getActiveSessions(userId);
      const activeCount = sessions.filter(s => s.isActive).length;
      
      return {
        withinLimit: activeCount < this.sessionConfig.maxConcurrentSessions,
        activeCount,
        limit: this.sessionConfig.maxConcurrentSessions
      };
    } catch (error) {
      console.error('Check concurrent sessions error:', error);
      return { withinLimit: true, activeCount: 0, limit: this.sessionConfig.maxConcurrentSessions };
    }
  }

  // Update session configuration
  updateConfig(config: Partial<SessionConfig>) {
    this.sessionConfig = { ...this.sessionConfig, ...config };
  }

  // Get current session configuration
  getConfig(): SessionConfig {
    return { ...this.sessionConfig };
  }

  // Cleanup on component unmount
  cleanup() {
    this.clearTimers();
  }
}

export const sessionService = SessionService.getInstance();