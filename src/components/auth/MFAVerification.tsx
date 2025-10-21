import React, { useState, useEffect } from 'react';
import { MFAMethod } from '../../types';
import { mfaService } from '../../services/mfaService';
import { authService } from '../../services/authService';
import Button from '../ui/Button';
import Card from '../ui/Card';
import { Shield, Smartphone, Mail, Key, RefreshCw } from 'lucide-react';

interface MFAVerificationProps {
  sessionId: string;
  availableMethods: MFAMethod[];
  onSuccess: (sessionId: string) => void;
  onCancel: () => void;
}

const MFAVerification: React.FC<MFAVerificationProps> = ({
  sessionId,
  availableMethods,
  onSuccess,
  onCancel
}) => {
  const [selectedMethod, setSelectedMethod] = useState<MFAMethod | null>(null);
  const [verificationCode, setVerificationCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [codeSent, setCodeSent] = useState(false);
  const [countdown, setCountdown] = useState(0);

  useEffect(() => {
    if (availableMethods.length === 1) {
      setSelectedMethod(availableMethods[0]);
    }
  }, [availableMethods]);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (countdown > 0) {
      timer = setTimeout(() => setCountdown(countdown - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [countdown]);

  const handleSendCode = async () => {
    if (!selectedMethod || (selectedMethod.type !== 'sms' && selectedMethod.type !== 'email')) {
      return;
    }

    setLoading(true);
    setError('');

    try {
      const result = await mfaService.sendMFACode(sessionId, selectedMethod.type);
      if (result.success) {
        setCodeSent(true);
        setCountdown(60); // 60 second cooldown
      } else {
        setError(result.error || 'Failed to send verification code');
      }
    } catch (error) {
      setError('Network error while sending verification code');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async () => {
    if (!selectedMethod || !verificationCode) {
      setError('Please enter the verification code');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const result = await authService.verifyMFA(sessionId, selectedMethod.type, verificationCode);
      if (result.success && result.sessionId) {
        onSuccess(result.sessionId);
      } else {
        setError(result.error || 'Invalid verification code');
      }
    } catch (error) {
      setError('Network error during verification');
    } finally {
      setLoading(false);
    }
  };

  const getMethodIcon = (type: string) => {
    switch (type) {
      case 'totp':
        return Smartphone;
      case 'sms':
        return Smartphone;
      case 'email':
        return Mail;
      case 'hardware_token':
        return Key;
      default:
        return Shield;
    }
  };

  const getMethodName = (method: MFAMethod) => {
    switch (method.type) {
      case 'totp':
        return 'Authenticator App';
      case 'sms':
        return `SMS (${method.phoneNumber?.replace(/(\d{3})(\d{3})(\d{4})/, '***-***-$3') || '***'})`;
      case 'email':
        return `Email (${method.email?.replace(/(.{2})(.*)(@.*)/, '$1***$3') || '***'})`;
      case 'hardware_token':
        return 'Hardware Token';
      default:
        return 'Unknown Method';
    }
  };

  const getMethodDescription = (method: MFAMethod) => {
    switch (method.type) {
      case 'totp':
        return 'Enter the 6-digit code from your authenticator app';
      case 'sms':
        return 'Enter the code sent to your phone';
      case 'email':
        return 'Enter the code sent to your email';
      case 'hardware_token':
        return 'Insert your hardware token and follow the prompts';
      default:
        return 'Complete the verification process';
    }
  };

  if (!selectedMethod) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-teal-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full p-8">
          <div className="text-center mb-6">
            <Shield className="h-12 w-12 text-blue-600 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-gray-900">Multi-Factor Authentication</h1>
            <p className="text-gray-600 mt-2">Choose a verification method to continue</p>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
              <p className="text-red-800">{error}</p>
            </div>
          )}

          <div className="space-y-3">
            {availableMethods.map((method, index) => {
              const Icon = getMethodIcon(method.type);
              return (
                <button
                  key={index}
                  onClick={() => setSelectedMethod(method)}
                  className="w-full p-4 text-left border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-colors"
                >
                  <div className="flex items-center space-x-3">
                    <Icon className="h-5 w-5 text-blue-600" />
                    <div>
                      <p className="font-medium text-gray-900">{getMethodName(method)}</p>
                      <p className="text-sm text-gray-600">{getMethodDescription(method)}</p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          <div className="mt-6">
            <Button
              variant="outline"
              onClick={onCancel}
              className="w-full"
            >
              Cancel
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-teal-50 flex items-center justify-center p-4">
      <Card className="max-w-md w-full p-8">
        <div className="text-center mb-6">
          <Shield className="h-12 w-12 text-blue-600 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900">Verify Your Identity</h1>
          <p className="text-gray-600 mt-2">{getMethodDescription(selectedMethod)}</p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
            <p className="text-red-800">{error}</p>
          </div>
        )}

        <div className="space-y-4">
          {/* Show selected method */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center space-x-3">
              {React.createElement(getMethodIcon(selectedMethod.type), {
                className: "h-5 w-5 text-blue-600"
              })}
              <span className="font-medium text-blue-900">{getMethodName(selectedMethod)}</span>
            </div>
          </div>

          {/* Send code button for SMS/Email */}
          {(selectedMethod.type === 'sms' || selectedMethod.type === 'email') && !codeSent && (
            <Button
              onClick={handleSendCode}
              disabled={loading}
              className="w-full"
            >
              {loading ? 'Sending...' : `Send Code via ${selectedMethod.type.toUpperCase()}`}
            </Button>
          )}

          {/* Resend code button */}
          {(selectedMethod.type === 'sms' || selectedMethod.type === 'email') && codeSent && (
            <div className="text-center">
              <p className="text-sm text-gray-600 mb-2">Code sent successfully!</p>
              <Button
                variant="outline"
                onClick={handleSendCode}
                disabled={loading || countdown > 0}
                className="text-sm"
              >
                {countdown > 0 ? (
                  `Resend in ${countdown}s`
                ) : (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Resend Code
                  </>
                )}
              </Button>
            </div>
          )}

          {/* Verification code input */}
          {(selectedMethod.type === 'totp' || codeSent) && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Verification Code
                </label>
                <input
                  type="text"
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="000000"
                  maxLength={6}
                  className="w-full px-3 py-2 text-center text-lg font-mono border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  autoComplete="one-time-code"
                />
              </div>

              <Button
                onClick={handleVerifyCode}
                disabled={loading || verificationCode.length !== 6}
                className="w-full"
              >
                {loading ? 'Verifying...' : 'Verify Code'}
              </Button>
            </>
          )}

          {/* Hardware token verification */}
          {selectedMethod.type === 'hardware_token' && (
            <div className="text-center py-8">
              <Key className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">Insert your hardware security key and follow the prompts on your device.</p>
              <Button
                onClick={handleVerifyCode}
                disabled={loading}
                className="mt-4"
              >
                {loading ? 'Verifying...' : 'I\'ve completed the verification'}
              </Button>
            </div>
          )}

          {/* Back and Cancel buttons */}
          <div className="flex space-x-3">
            <Button
              variant="outline"
              onClick={() => setSelectedMethod(null)}
              disabled={loading}
              className="flex-1"
            >
              Back
            </Button>
            <Button
              variant="outline"
              onClick={onCancel}
              disabled={loading}
              className="flex-1"
            >
              Cancel
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default MFAVerification;