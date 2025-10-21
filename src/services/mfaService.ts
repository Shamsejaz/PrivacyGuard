import { MFAMethod } from '../types';

export interface TOTPSetupResult {
  secret: string;
  qrCodeUrl: string;
  backupCodes: string[];
}

export interface MFASetupResult {
  success: boolean;
  method?: MFAMethod;
  setupData?: TOTPSetupResult;
  error?: string;
}

export class MFAService {
  private static instance: MFAService;
  private baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';

  static getInstance(): MFAService {
    if (!MFAService.instance) {
      MFAService.instance = new MFAService();
    }
    return MFAService.instance;
  }

  // Setup TOTP
  async setupTOTP(userId: string): Promise<MFASetupResult> {
    try {
      const response = await fetch(`${this.baseUrl}/auth/mfa/totp/setup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId }),
      });

      const data = await response.json();

      if (!response.ok) {
        return { success: false, error: data.message || 'TOTP setup failed' };
      }

      return {
        success: true,
        setupData: {
          secret: data.secret,
          qrCodeUrl: data.qrCodeUrl,
          backupCodes: data.backupCodes
        }
      };
    } catch (error) {
      return { success: false, error: 'Network error during TOTP setup' };
    }
  }

  // Verify TOTP setup
  async verifyTOTPSetup(userId: string, code: string): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/auth/mfa/totp/verify-setup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId, code }),
      });

      const data = await response.json();

      return {
        success: response.ok,
        error: response.ok ? undefined : data.message || 'TOTP verification failed'
      };
    } catch (error) {
      return { success: false, error: 'Network error during TOTP verification' };
    }
  }

  // Setup SMS MFA
  async setupSMS(userId: string, phoneNumber: string): Promise<MFASetupResult> {
    try {
      const response = await fetch(`${this.baseUrl}/auth/mfa/sms/setup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId, phoneNumber }),
      });

      const data = await response.json();

      if (!response.ok) {
        return { success: false, error: data.message || 'SMS MFA setup failed' };
      }

      return {
        success: true,
        method: data.method
      };
    } catch (error) {
      return { success: false, error: 'Network error during SMS MFA setup' };
    }
  }

  // Setup Email MFA
  async setupEmail(userId: string, email: string): Promise<MFASetupResult> {
    try {
      const response = await fetch(`${this.baseUrl}/auth/mfa/email/setup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId, email }),
      });

      const data = await response.json();

      if (!response.ok) {
        return { success: false, error: data.message || 'Email MFA setup failed' };
      }

      return {
        success: true,
        method: data.method
      };
    } catch (error) {
      return { success: false, error: 'Network error during Email MFA setup' };
    }
  }

  // Setup Hardware Token
  async setupHardwareToken(userId: string, deviceId: string): Promise<MFASetupResult> {
    try {
      const response = await fetch(`${this.baseUrl}/auth/mfa/hardware/setup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId, deviceId }),
      });

      const data = await response.json();

      if (!response.ok) {
        return { success: false, error: data.message || 'Hardware token setup failed' };
      }

      return {
        success: true,
        method: data.method
      };
    } catch (error) {
      return { success: false, error: 'Network error during hardware token setup' };
    }
  }

  // Send MFA code
  async sendMFACode(userId: string, method: 'sms' | 'email'): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/auth/mfa/send-code`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId, method }),
      });

      const data = await response.json();

      return {
        success: response.ok,
        error: response.ok ? undefined : data.message || 'Failed to send MFA code'
      };
    } catch (error) {
      return { success: false, error: 'Network error while sending MFA code' };
    }
  }

  // Get user MFA methods
  async getUserMFAMethods(userId: string): Promise<MFAMethod[]> {
    try {
      const response = await fetch(`${this.baseUrl}/auth/mfa/methods/${userId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();
      return data.methods || [];
    } catch (error) {
      console.error('Get MFA methods error:', error);
      return [];
    }
  }

  // Disable MFA method
  async disableMFAMethod(userId: string, methodType: string): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/auth/mfa/disable`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId, methodType }),
      });

      const data = await response.json();

      return {
        success: response.ok,
        error: response.ok ? undefined : data.message || 'Failed to disable MFA method'
      };
    } catch (error) {
      return { success: false, error: 'Network error while disabling MFA method' };
    }
  }

  // Generate QR code for TOTP
  generateQRCode(secret: string, userEmail: string, issuer: string = 'PrivacyGuard'): string {
    const otpAuthUrl = `otpauth://totp/${encodeURIComponent(issuer)}:${encodeURIComponent(userEmail)}?secret=${secret}&issuer=${encodeURIComponent(issuer)}`;
    return `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(otpAuthUrl)}`;
  }
}

export const mfaService = MFAService.getInstance();