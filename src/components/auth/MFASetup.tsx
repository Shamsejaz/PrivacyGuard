import React, { useState, useEffect } from 'react';
import { MFAMethod } from '../../types';
import { mfaService, TOTPSetupResult } from '../../services/mfaService';
import Button from '../ui/Button';
import Card from '../ui/Card';
import { Shield, Smartphone, Mail, Key, QrCode, Copy, Check } from 'lucide-react';

interface MFASetupProps {
  userId: string;
  onComplete: (methods: MFAMethod[]) => void;
}

const MFASetup: React.FC<MFASetupProps> = ({ userId, onComplete }) => {
  const [mfaMethods, setMfaMethods] = useState<MFAMethod[]>([]);
  const [activeSetup, setActiveSetup] = useState<string | null>(null);
  const [totpSetup, setTotpSetup] = useState<TOTPSetupResult | null>(null);
  const [verificationCode, setVerificationCode] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    loadMFAMethods();
  }, [userId]);

  const loadMFAMethods = async () => {
    try {
      const methods = await mfaService.getUserMFAMethods(userId);
      setMfaMethods(methods);
    } catch (error) {
      console.error('Failed to load MFA methods:', error);
    }
  };

  const handleSetupTOTP = async () => {
    setLoading(true);
    setError('');
    
    try {
      const result = await mfaService.setupTOTP(userId);
      if (result.success && result.setupData) {
        setTotpSetup(result.setupData);
        setActiveSetup('totp');
      } else {
        setError(result.error || 'Failed to setup TOTP');
      }
    } catch (error) {
      setError('Network error during TOTP setup');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyTOTP = async () => {
    if (!verificationCode) {
      setError('Please enter the verification code');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const result = await mfaService.verifyTOTPSetup(userId, verificationCode);
      if (result.success) {
        setActiveSetup(null);
        setTotpSetup(null);
        setVerificationCode('');
        await loadMFAMethods();
        onComplete(await mfaService.getUserMFAMethods(userId));
      } else {
        setError(result.error || 'Invalid verification code');
      }
    } catch (error) {
      setError('Network error during TOTP verification');
    } finally {
      setLoading(false);
    }
  };

  const handleSetupSMS = async () => {
    if (!phoneNumber) {
      setError('Please enter a phone number');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const result = await mfaService.setupSMS(userId, phoneNumber);
      if (result.success) {
        setActiveSetup(null);
        setPhoneNumber('');
        await loadMFAMethods();
        onComplete(await mfaService.getUserMFAMethods(userId));
      } else {
        setError(result.error || 'Failed to setup SMS MFA');
      }
    } catch (error) {
      setError('Network error during SMS MFA setup');
    } finally {
      setLoading(false);
    }
  };

  const handleSetupEmail = async () => {
    if (!email) {
      setError('Please enter an email address');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const result = await mfaService.setupEmail(userId, email);
      if (result.success) {
        setActiveSetup(null);
        setEmail('');
        await loadMFAMethods();
        onComplete(await mfaService.getUserMFAMethods(userId));
      } else {
        setError(result.error || 'Failed to setup Email MFA');
      }
    } catch (error) {
      setError('Network error during Email MFA setup');
    } finally {
      setLoading(false);
    }
  };

  const handleDisableMethod = async (methodType: string) => {
    setLoading(true);
    setError('');

    try {
      const result = await mfaService.disableMFAMethod(userId, methodType);
      if (result.success) {
        await loadMFAMethods();
        onComplete(await mfaService.getUserMFAMethods(userId));
      } else {
        setError(result.error || 'Failed to disable MFA method');
      }
    } catch (error) {
      setError('Network error while disabling MFA method');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const mfaTypeIcons = {
    totp: Smartphone,
    sms: Smartphone,
    email: Mail,
    hardware_token: Key
  };

  const mfaTypeNames = {
    totp: 'Authenticator App (TOTP)',
    sms: 'SMS',
    email: 'Email',
    hardware_token: 'Hardware Token'
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-3">
        <Shield className="h-6 w-6 text-blue-600" />
        <h2 className="text-2xl font-bold text-gray-900">Multi-Factor Authentication</h2>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">{error}</p>
        </div>
      )}

      {/* Existing MFA Methods */}
      {mfaMethods.length > 0 && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Active MFA Methods</h3>
          <div className="space-y-3">
            {mfaMethods.map((method, index) => {
              const Icon = mfaTypeIcons[method.type];
              return (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <Icon className="h-5 w-5 text-green-600" />
                    <div>
                      <p className="font-medium">{mfaTypeNames[method.type]}</p>
                      {method.phoneNumber && (
                        <p className="text-sm text-gray-600">Phone: {method.phoneNumber}</p>
                      )}
                      {method.email && (
                        <p className="text-sm text-gray-600">Email: {method.email}</p>
                      )}
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDisableMethod(method.type)}
                    disabled={loading}
                    className="text-red-600 hover:text-red-700"
                  >
                    Disable
                  </Button>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* TOTP Setup */}
      {activeSetup === 'totp' && totpSetup ? (
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Setup Authenticator App</h3>
          <div className="space-y-4">
            <div className="text-center">
              <img
                src={totpSetup.qrCodeUrl}
                alt="QR Code for TOTP setup"
                className="mx-auto mb-4"
              />
              <p className="text-sm text-gray-600 mb-2">
                Scan this QR code with your authenticator app
              </p>
            </div>
            
            <div className="bg-gray-50 p-3 rounded-lg">
              <p className="text-sm font-medium text-gray-700 mb-2">Manual Entry Key:</p>
              <div className="flex items-center space-x-2">
                <code className="flex-1 text-sm bg-white p-2 rounded border">
                  {totpSetup.secret}
                </code>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => copyToClipboard(totpSetup.secret)}
                >
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Enter verification code from your app:
              </label>
              <input
                type="text"
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value)}
                placeholder="000000"
                maxLength={6}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="flex space-x-3">
              <Button
                variant="outline"
                onClick={() => {
                  setActiveSetup(null);
                  setTotpSetup(null);
                  setVerificationCode('');
                }}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button
                onClick={handleVerifyTOTP}
                disabled={loading || !verificationCode}
              >
                {loading ? 'Verifying...' : 'Verify & Enable'}
              </Button>
            </div>
          </div>
        </Card>
      ) : (
        /* Setup Options */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* TOTP Setup */}
          <Card className="p-6">
            <div className="flex items-center space-x-3 mb-4">
              <Smartphone className="h-6 w-6 text-blue-600" />
              <h3 className="text-lg font-semibold">Authenticator App</h3>
            </div>
            <p className="text-gray-600 mb-4">
              Use an authenticator app like Google Authenticator or Authy for secure TOTP codes.
            </p>
            <Button
              onClick={handleSetupTOTP}
              disabled={loading || mfaMethods.some(m => m.type === 'totp')}
              className="w-full"
            >
              {mfaMethods.some(m => m.type === 'totp') ? 'Already Enabled' : 'Setup TOTP'}
            </Button>
          </Card>

          {/* SMS Setup */}
          <Card className="p-6">
            <div className="flex items-center space-x-3 mb-4">
              <Smartphone className="h-6 w-6 text-green-600" />
              <h3 className="text-lg font-semibold">SMS Authentication</h3>
            </div>
            <p className="text-gray-600 mb-4">
              Receive verification codes via SMS to your mobile phone.
            </p>
            {activeSetup === 'sms' ? (
              <div className="space-y-3">
                <input
                  type="tel"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="+1234567890"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <div className="flex space-x-2">
                  <Button
                    variant="outline"
                    onClick={() => setActiveSetup(null)}
                    disabled={loading}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleSetupSMS}
                    disabled={loading || !phoneNumber}
                    className="flex-1"
                  >
                    {loading ? 'Setting up...' : 'Setup SMS'}
                  </Button>
                </div>
              </div>
            ) : (
              <Button
                onClick={() => setActiveSetup('sms')}
                disabled={loading || mfaMethods.some(m => m.type === 'sms')}
                className="w-full"
              >
                {mfaMethods.some(m => m.type === 'sms') ? 'Already Enabled' : 'Setup SMS'}
              </Button>
            )}
          </Card>

          {/* Email Setup */}
          <Card className="p-6">
            <div className="flex items-center space-x-3 mb-4">
              <Mail className="h-6 w-6 text-purple-600" />
              <h3 className="text-lg font-semibold">Email Authentication</h3>
            </div>
            <p className="text-gray-600 mb-4">
              Receive verification codes via email for additional security.
            </p>
            {activeSetup === 'email' ? (
              <div className="space-y-3">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your-email@company.com"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <div className="flex space-x-2">
                  <Button
                    variant="outline"
                    onClick={() => setActiveSetup(null)}
                    disabled={loading}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleSetupEmail}
                    disabled={loading || !email}
                    className="flex-1"
                  >
                    {loading ? 'Setting up...' : 'Setup Email'}
                  </Button>
                </div>
              </div>
            ) : (
              <Button
                onClick={() => setActiveSetup('email')}
                disabled={loading || mfaMethods.some(m => m.type === 'email')}
                className="w-full"
              >
                {mfaMethods.some(m => m.type === 'email') ? 'Already Enabled' : 'Setup Email'}
              </Button>
            )}
          </Card>

          {/* Hardware Token Setup */}
          <Card className="p-6">
            <div className="flex items-center space-x-3 mb-4">
              <Key className="h-6 w-6 text-orange-600" />
              <h3 className="text-lg font-semibold">Hardware Token</h3>
            </div>
            <p className="text-gray-600 mb-4">
              Use a hardware security key for the highest level of security.
            </p>
            <Button
              disabled={true}
              className="w-full"
              variant="outline"
            >
              Coming Soon
            </Button>
          </Card>
        </div>
      )}
    </div>
  );
};

export default MFASetup;