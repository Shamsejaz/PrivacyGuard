import React, { useState, useEffect } from 'react';
import { Shield, Key, Users, Settings, Save, AlertTriangle, CheckCircle } from 'lucide-react';
import Card from '../ui/Card';
import Button from '../ui/Button';

interface AuthSettings {
  authMethod: 'local' | 'ad' | 'saml' | 'oauth';
  mfaEnabled: boolean;
  mfaMethod: 'totp' | 'sms' | 'email';
  sessionTimeout: number;
  passwordPolicy: {
    minLength: number;
    requireUppercase: boolean;
    requireLowercase: boolean;
    requireNumbers: boolean;
    requireSpecialChars: boolean;
    maxAge: number;
  };
  adSettings: {
    domain: string;
    server: string;
    port: number;
    baseDN: string;
    bindUser: string;
    bindPassword: string;
    userSearchFilter: string;
    groupSearchFilter: string;
  };
  samlSettings: {
    entityId: string;
    ssoUrl: string;
    x509Certificate: string;
    attributeMapping: {
      email: string;
      firstName: string;
      lastName: string;
      groups: string;
    };
  };
  oauthSettings: {
    provider: 'google' | 'microsoft' | 'okta' | 'custom';
    clientId: string;
    clientSecret: string;
    redirectUri: string;
    scope: string;
  };
}

const AuthenticationPanel: React.FC = () => {
  const [settings, setSettings] = useState<AuthSettings>({
    authMethod: 'local',
    mfaEnabled: false,
    mfaMethod: 'totp',
    sessionTimeout: 480, // 8 hours in minutes
    passwordPolicy: {
      minLength: 8,
      requireUppercase: true,
      requireLowercase: true,
      requireNumbers: true,
      requireSpecialChars: true,
      maxAge: 90
    },
    adSettings: {
      domain: '',
      server: '',
      port: 389,
      baseDN: '',
      bindUser: '',
      bindPassword: '',
      userSearchFilter: '(&(objectClass=user)(sAMAccountName={username}))',
      groupSearchFilter: '(&(objectClass=group)(member={userDN}))'
    },
    samlSettings: {
      entityId: '',
      ssoUrl: '',
      x509Certificate: '',
      attributeMapping: {
        email: 'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress',
        firstName: 'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/givenname',
        lastName: 'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/surname',
        groups: 'http://schemas.microsoft.com/ws/2008/06/identity/claims/groups'
      }
    },
    oauthSettings: {
      provider: 'google',
      clientId: '',
      clientSecret: '',
      redirectUri: '',
      scope: 'openid profile email'
    }
  });

  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [testingConnection, setTestingConnection] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = () => {
    const savedSettings = localStorage.getItem('authSettings');
    if (savedSettings) {
      setSettings(JSON.parse(savedSettings));
    }
  };

  const saveSettings = async () => {
    setIsSaving(true);
    setSaveMessage(null);

    try {
      localStorage.setItem('authSettings', JSON.stringify(settings));
      
      setSaveMessage({
        type: 'success',
        text: 'Authentication settings saved successfully.'
      });
    } catch (error) {
      setSaveMessage({
        type: 'error',
        text: `Failed to save settings: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
    } finally {
      setIsSaving(false);
    }
  };

  const testConnection = async () => {
    setTestingConnection(true);
    
    try {
      // Simulate connection test
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      setSaveMessage({
        type: 'success',
        text: 'Connection test successful!'
      });
    } catch (error) {
      setSaveMessage({
        type: 'error',
        text: 'Connection test failed. Please check your settings.'
      });
    } finally {
      setTestingConnection(false);
    }
  };

  const updateSettings = (path: string, value: any) => {
    setSettings(prev => {
      const keys = path.split('.');
      const updated = { ...prev };
      let current: any = updated;
      
      for (let i = 0; i < keys.length - 1; i++) {
        current[keys[i]] = { ...current[keys[i]] };
        current = current[keys[i]];
      }
      
      current[keys[keys.length - 1]] = value;
      return updated;
    });
  };

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-900">Authentication Settings</h2>
          <div className="flex space-x-2">
            {settings.authMethod !== 'local' && (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={testConnection}
                disabled={testingConnection}
              >
                {testingConnection ? 'Testing...' : 'Test Connection'}
              </Button>
            )}
            <Button onClick={saveSettings} disabled={isSaving}>
              <Save className="h-4 w-4 mr-2" />
              {isSaving ? 'Saving...' : 'Save Settings'}
            </Button>
          </div>
        </div>

        {/* Authentication Method */}
        <div className="mb-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Authentication Method</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { value: 'local', label: 'Local Database', icon: Users },
              { value: 'ad', label: 'Active Directory', icon: Shield },
              { value: 'saml', label: 'SAML SSO', icon: Key },
              { value: 'oauth', label: 'OAuth 2.0', icon: Settings }
            ].map(({ value, label, icon: Icon }) => (
              <button
                key={value}
                onClick={() => updateSettings('authMethod', value)}
                className={`p-4 border rounded-lg text-center transition-colors ${
                  settings.authMethod === value
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-gray-300 hover:border-gray-400'
                }`}
              >
                <Icon className="h-6 w-6 mx-auto mb-2" />
                <div className="font-medium">{label}</div>
              </button>
            ))}
          </div>
        </div>

        {/* MFA Settings */}
        <div className="mb-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Multi-Factor Authentication</h3>
          <div className="space-y-4">
            <div className="flex items-center space-x-3">
              <input
                type="checkbox"
                id="mfaEnabled"
                checked={settings.mfaEnabled}
                onChange={(e) => updateSettings('mfaEnabled', e.target.checked)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="mfaEnabled" className="text-sm font-medium text-gray-700">
                Enable Multi-Factor Authentication
              </label>
            </div>

            {settings.mfaEnabled && (
              <div className="ml-7 space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    MFA Method
                  </label>
                  <select
                    value={settings.mfaMethod}
                    onChange={(e) => updateSettings('mfaMethod', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="totp">TOTP (Authenticator App)</option>
                    <option value="sms">SMS</option>
                    <option value="email">Email</option>
                  </select>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Session Settings */}
        <div className="mb-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Session Settings</h3>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Session Timeout (minutes)
            </label>
            <input
              type="number"
              value={settings.sessionTimeout}
              onChange={(e) => updateSettings('sessionTimeout', parseInt(e.target.value))}
              className="w-32 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              min="5"
              max="1440"
            />
            <p className="text-sm text-gray-500 mt-1">
              Users will be automatically logged out after this period of inactivity
            </p>
          </div>
        </div>

        {/* Password Policy */}
        <div className="mb-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Password Policy</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Minimum Length
              </label>
              <input
                type="number"
                value={settings.passwordPolicy.minLength}
                onChange={(e) => updateSettings('passwordPolicy.minLength', parseInt(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                min="6"
                max="32"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Password Max Age (days)
              </label>
              <input
                type="number"
                value={settings.passwordPolicy.maxAge}
                onChange={(e) => updateSettings('passwordPolicy.maxAge', parseInt(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                min="30"
                max="365"
              />
            </div>
          </div>
          
          <div className="mt-4 space-y-2">
            {[
              { key: 'requireUppercase', label: 'Require uppercase letters' },
              { key: 'requireLowercase', label: 'Require lowercase letters' },
              { key: 'requireNumbers', label: 'Require numbers' },
              { key: 'requireSpecialChars', label: 'Require special characters' }
            ].map(({ key, label }) => (
              <div key={key} className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  id={key}
                  checked={settings.passwordPolicy[key as keyof typeof settings.passwordPolicy] as boolean}
                  onChange={(e) => updateSettings(`passwordPolicy.${key}`, e.target.checked)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor={key} className="text-sm text-gray-700">
                  {label}
                </label>
              </div>
            ))}
          </div>
        </div>

        {saveMessage && (
          <div className="flex items-center space-x-2 p-4 rounded-lg bg-gray-50">
            {saveMessage.type === 'success' ? (
              <CheckCircle className="h-4 w-4 text-green-500" />
            ) : (
              <AlertTriangle className="h-4 w-4 text-red-500" />
            )}
            <span className={saveMessage.type === 'success' ? 'text-green-600' : 'text-red-600'}>
              {saveMessage.text}
            </span>
          </div>
        )}
      </Card>

      {/* Active Directory Settings */}
      {settings.authMethod === 'ad' && (
        <Card className="p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Active Directory Configuration</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Domain</label>
              <input
                type="text"
                value={settings.adSettings.domain}
                onChange={(e) => updateSettings('adSettings.domain', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="example.com"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Server</label>
              <input
                type="text"
                value={settings.adSettings.server}
                onChange={(e) => updateSettings('adSettings.server', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="ldap.example.com"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Port</label>
              <input
                type="number"
                value={settings.adSettings.port}
                onChange={(e) => updateSettings('adSettings.port', parseInt(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="389"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Base DN</label>
              <input
                type="text"
                value={settings.adSettings.baseDN}
                onChange={(e) => updateSettings('adSettings.baseDN', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="DC=example,DC=com"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Bind User</label>
              <input
                type="text"
                value={settings.adSettings.bindUser}
                onChange={(e) => updateSettings('adSettings.bindUser', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="CN=service,OU=Users,DC=example,DC=com"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Bind Password</label>
              <input
                type="password"
                value={settings.adSettings.bindPassword}
                onChange={(e) => updateSettings('adSettings.bindPassword', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </Card>
      )}

      {/* SAML Settings */}
      {settings.authMethod === 'saml' && (
        <Card className="p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">SAML SSO Configuration</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Entity ID</label>
              <input
                type="text"
                value={settings.samlSettings.entityId}
                onChange={(e) => updateSettings('samlSettings.entityId', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="https://your-app.com/saml/metadata"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">SSO URL</label>
              <input
                type="url"
                value={settings.samlSettings.ssoUrl}
                onChange={(e) => updateSettings('samlSettings.ssoUrl', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="https://idp.example.com/sso"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">X.509 Certificate</label>
              <textarea
                value={settings.samlSettings.x509Certificate}
                onChange={(e) => updateSettings('samlSettings.x509Certificate', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={4}
                placeholder="-----BEGIN CERTIFICATE-----&#10;...&#10;-----END CERTIFICATE-----"
              />
            </div>
          </div>
        </Card>
      )}

      {/* OAuth Settings */}
      {settings.authMethod === 'oauth' && (
        <Card className="p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">OAuth 2.0 Configuration</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Provider</label>
              <select
                value={settings.oauthSettings.provider}
                onChange={(e) => updateSettings('oauthSettings.provider', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="google">Google</option>
                <option value="microsoft">Microsoft</option>
                <option value="okta">Okta</option>
                <option value="custom">Custom</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Client ID</label>
              <input
                type="text"
                value={settings.oauthSettings.clientId}
                onChange={(e) => updateSettings('oauthSettings.clientId', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Client Secret</label>
              <input
                type="password"
                value={settings.oauthSettings.clientSecret}
                onChange={(e) => updateSettings('oauthSettings.clientSecret', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Redirect URI</label>
              <input
                type="url"
                value={settings.oauthSettings.redirectUri}
                onChange={(e) => updateSettings('oauthSettings.redirectUri', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="https://your-app.com/auth/callback"
              />
            </div>
          </div>
        </Card>
      )}
    </div>
  );
};

export default AuthenticationPanel;