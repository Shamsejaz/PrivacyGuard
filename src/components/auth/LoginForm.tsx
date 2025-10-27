import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Shield, Eye, EyeOff, Users, Key, Globe } from 'lucide-react';
import Button from '../ui/Button';
import MFAVerification from './MFAVerification';

const LoginForm: React.FC = () => {
  const { login, loginWithMFA, loading, requiresMFA, mfaMethods, sessionId } = useAuth();
  const [email, setEmail] = useState('admin@privacycomply.com');
  const [password, setPassword] = useState('Admin123!@#');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [authProvider, setAuthProvider] = useState<'local' | 'active_directory' | 'saml' | 'oauth'>('local');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      const result = await login(email, password, { 
        type: authProvider, 
        name: `${authProvider.toUpperCase()} Provider`,
        config: {} 
      });
      
      if (!result.success && result.error) {
        setError(result.error);
      }
    } catch (err) {
      setError('Invalid credentials. Please try again.');
    }
  };

  const handleMFASuccess = async (newSessionId: string) => {
    // MFA verification successful, user will be logged in automatically
    console.log('MFA verification successful');
  };

  const handleMFACancel = () => {
    // Reset MFA state and return to login
    setError('');
  };

  // Show MFA verification if required
  if (requiresMFA && sessionId && mfaMethods.length > 0) {
    return (
      <MFAVerification
        sessionId={sessionId}
        availableMethods={mfaMethods}
        onSuccess={handleMFASuccess}
        onCancel={handleMFACancel}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-teal-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <Shield className="h-12 w-12 text-blue-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">PrivacyComply AI</h1>
          <p className="text-gray-600 mt-2">Enterprise Privacy Compliance Platform</p>
        </div>

        {/* Authentication Provider Selection */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Authentication Method
          </label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setAuthProvider('local')}
              className={`p-3 border rounded-lg flex items-center justify-center space-x-2 ${
                authProvider === 'local' 
                  ? 'border-blue-500 bg-blue-50 text-blue-700' 
                  : 'border-gray-300 hover:border-gray-400'
              }`}
            >
              <Shield className="h-4 w-4" />
              <span className="text-sm">Local</span>
            </button>
            <button
              type="button"
              onClick={() => setAuthProvider('active_directory')}
              className={`p-3 border rounded-lg flex items-center justify-center space-x-2 ${
                authProvider === 'active_directory' 
                  ? 'border-blue-500 bg-blue-50 text-blue-700' 
                  : 'border-gray-300 hover:border-gray-400'
              }`}
            >
              <Users className="h-4 w-4" />
              <span className="text-sm">AD</span>
            </button>
            <button
              type="button"
              onClick={() => setAuthProvider('saml')}
              className={`p-3 border rounded-lg flex items-center justify-center space-x-2 ${
                authProvider === 'saml' 
                  ? 'border-blue-500 bg-blue-50 text-blue-700' 
                  : 'border-gray-300 hover:border-gray-400'
              }`}
            >
              <Key className="h-4 w-4" />
              <span className="text-sm">SAML</span>
            </button>
            <button
              type="button"
              onClick={() => setAuthProvider('oauth')}
              className={`p-3 border rounded-lg flex items-center justify-center space-x-2 ${
                authProvider === 'oauth' 
                  ? 'border-blue-500 bg-blue-50 text-blue-700' 
                  : 'border-gray-300 hover:border-gray-400'
              }`}
            >
              <Globe className="h-4 w-4" />
              <span className="text-sm">OAuth</span>
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
              {authProvider === 'active_directory' ? 'Username' : 'Email Address'}
            </label>
            <input
              id="email"
              type={authProvider === 'active_directory' ? 'text' : 'email'}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder={authProvider === 'active_directory' ? 'Enter your username' : 'Enter your email'}
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
              Password
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter your password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
          </div>

          {error && (
            <div className="text-red-600 text-sm text-center">{error}</div>
          )}

          <Button
            type="submit"
            className="w-full"
            disabled={loading}
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </Button>
        </form>

        <div className="mt-6 p-4 bg-gray-50 rounded-lg">
          <p className="text-sm text-gray-600 text-center">
            Demo Credentials:
          </p>
          <div className="text-sm text-gray-800 text-center mt-1 space-y-1">
            <p>
              <strong>Admin:</strong> admin@privacycomply.com / Admin123!@#
            </p>
            <p>
              <strong>DPO:</strong> dpo@privacycomply.com / DPO123!@#
            </p>
            <p>
              <strong>Compliance:</strong> compliance@privacycomply.com / Compliance123!@#
            </p>
            <p>
              <strong>Legal:</strong> legal@privacycomply.com / Legal123!@#
            </p>
            <p>
              <strong>Business:</strong> business@privacycomply.com / Business123!@#
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginForm;