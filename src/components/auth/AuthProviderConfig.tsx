import React, { useState, useEffect } from 'react';
import { AuthProvider, AuthProviderConfig } from '../../types';
import Button from '../ui/Button';
import Card from '../ui/Card';
import { Settings, Shield, Key, Users, Globe } from 'lucide-react';

interface AuthProviderConfigProps {
  onSave: (providers: AuthProvider[]) => void;
  initialProviders?: AuthProvider[];
}

const AuthProviderConfigComponent: React.FC<AuthProviderConfigProps> = ({
  onSave,
  initialProviders = []
}) => {
  const [providers, setProviders] = useState<AuthProvider[]>(initialProviders);
  const [activeProvider, setActiveProvider] = useState<AuthProvider | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  const providerTypes = [
    { type: 'active_directory', name: 'Active Directory', icon: Users },
    { type: 'ldap', name: 'LDAP', icon: Users },
    { type: 'saml', name: 'SAML 2.0', icon: Shield },
    { type: 'oauth', name: 'OAuth 2.0', icon: Key },
  ];

  const handleAddProvider = (type: string) => {
    const newProvider: AuthProvider = {
      type: type as any,
      name: `${type.toUpperCase()} Provider`,
      config: {}
    };
    setActiveProvider(newProvider);
    setIsEditing(true);
  };

  const handleEditProvider = (provider: AuthProvider) => {
    setActiveProvider({ ...provider });
    setIsEditing(true);
  };

  const handleSaveProvider = () => {
    if (!activeProvider) return;

    const existingIndex = providers.findIndex(p => p.name === activeProvider.name);
    let updatedProviders;

    if (existingIndex >= 0) {
      updatedProviders = [...providers];
      updatedProviders[existingIndex] = activeProvider;
    } else {
      updatedProviders = [...providers, activeProvider];
    }

    setProviders(updatedProviders);
    setActiveProvider(null);
    setIsEditing(false);
    onSave(updatedProviders);
  };

  const handleDeleteProvider = (providerName: string) => {
    const updatedProviders = providers.filter(p => p.name !== providerName);
    setProviders(updatedProviders);
    onSave(updatedProviders);
  };

  const renderProviderConfig = () => {
    if (!activeProvider || !isEditing) return null;

    const updateConfig = (key: string, value: string) => {
      setActiveProvider({
        ...activeProvider,
        config: {
          ...activeProvider.config,
          [key]: value
        }
      });
    };

    const updateName = (name: string) => {
      setActiveProvider({
        ...activeProvider,
        name
      });
    };

    switch (activeProvider.type) {
      case 'active_directory':
      case 'ldap':
        return (
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">
              {activeProvider.type === 'active_directory' ? 'Active Directory' : 'LDAP'} Configuration
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Provider Name
                </label>
                <input
                  type="text"
                  value={activeProvider.name}
                  onChange={(e) => updateName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Server URL
                </label>
                <input
                  type="text"
                  value={activeProvider.config.serverUrl || ''}
                  onChange={(e) => updateConfig('serverUrl', e.target.value)}
                  placeholder="ldap://your-server.com:389"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Base DN
                </label>
                <input
                  type="text"
                  value={activeProvider.config.baseDN || ''}
                  onChange={(e) => updateConfig('baseDN', e.target.value)}
                  placeholder="dc=company,dc=com"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Bind DN
                </label>
                <input
                  type="text"
                  value={activeProvider.config.bindDN || ''}
                  onChange={(e) => updateConfig('bindDN', e.target.value)}
                  placeholder="cn=admin,dc=company,dc=com"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Bind Password
                </label>
                <input
                  type="password"
                  value={activeProvider.config.bindPassword || ''}
                  onChange={(e) => updateConfig('bindPassword', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  User Search Base
                </label>
                <input
                  type="text"
                  value={activeProvider.config.userSearchBase || ''}
                  onChange={(e) => updateConfig('userSearchBase', e.target.value)}
                  placeholder="ou=users,dc=company,dc=com"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </Card>
        );

      case 'saml':
        return (
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">SAML 2.0 Configuration</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Provider Name
                </label>
                <input
                  type="text"
                  value={activeProvider.name}
                  onChange={(e) => updateName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Entity ID
                </label>
                <input
                  type="text"
                  value={activeProvider.config.entityId || ''}
                  onChange={(e) => updateConfig('entityId', e.target.value)}
                  placeholder="https://your-idp.com/metadata"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  SSO URL
                </label>
                <input
                  type="text"
                  value={activeProvider.config.ssoUrl || ''}
                  onChange={(e) => updateConfig('ssoUrl', e.target.value)}
                  placeholder="https://your-idp.com/sso"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  X.509 Certificate
                </label>
                <textarea
                  value={activeProvider.config.x509Certificate || ''}
                  onChange={(e) => updateConfig('x509Certificate', e.target.value)}
                  placeholder="-----BEGIN CERTIFICATE-----"
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </Card>
        );

      case 'oauth':
        return (
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">OAuth 2.0 Configuration</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Provider Name
                </label>
                <input
                  type="text"
                  value={activeProvider.name}
                  onChange={(e) => updateName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Client ID
                </label>
                <input
                  type="text"
                  value={activeProvider.config.clientId || ''}
                  onChange={(e) => updateConfig('clientId', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Client Secret
                </label>
                <input
                  type="password"
                  value={activeProvider.config.clientSecret || ''}
                  onChange={(e) => updateConfig('clientSecret', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Authorization URL
                </label>
                <input
                  type="text"
                  value={activeProvider.config.authorizationUrl || ''}
                  onChange={(e) => updateConfig('authorizationUrl', e.target.value)}
                  placeholder="https://provider.com/oauth/authorize"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Token URL
                </label>
                <input
                  type="text"
                  value={activeProvider.config.tokenUrl || ''}
                  onChange={(e) => updateConfig('tokenUrl', e.target.value)}
                  placeholder="https://provider.com/oauth/token"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  User Info URL
                </label>
                <input
                  type="text"
                  value={activeProvider.config.userInfoUrl || ''}
                  onChange={(e) => updateConfig('userInfoUrl', e.target.value)}
                  placeholder="https://provider.com/oauth/userinfo"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </Card>
        );

      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Authentication Providers</h2>
        <div className="flex space-x-2">
          {providerTypes.map(({ type, name, icon: Icon }) => (
            <Button
              key={type}
              variant="outline"
              size="sm"
              onClick={() => handleAddProvider(type)}
              className="flex items-center space-x-2"
            >
              <Icon className="h-4 w-4" />
              <span>Add {name}</span>
            </Button>
          ))}
        </div>
      </div>

      {/* Existing Providers */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {providers.map((provider) => {
          const providerType = providerTypes.find(pt => pt.type === provider.type);
          const Icon = providerType?.icon || Settings;
          
          return (
            <Card key={provider.name} className="p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-2">
                  <Icon className="h-5 w-5 text-blue-600" />
                  <h3 className="font-semibold">{provider.name}</h3>
                </div>
                <div className="flex space-x-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleEditProvider(provider)}
                  >
                    Edit
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteProvider(provider.name)}
                    className="text-red-600 hover:text-red-700"
                  >
                    Delete
                  </Button>
                </div>
              </div>
              <p className="text-sm text-gray-600">
                Type: {providerType?.name || provider.type}
              </p>
            </Card>
          );
        })}
      </div>

      {/* Provider Configuration Form */}
      {renderProviderConfig()}

      {isEditing && (
        <div className="flex justify-end space-x-3">
          <Button
            variant="outline"
            onClick={() => {
              setActiveProvider(null);
              setIsEditing(false);
            }}
          >
            Cancel
          </Button>
          <Button onClick={handleSaveProvider}>
            Save Provider
          </Button>
        </div>
      )}
    </div>
  );
};

export default AuthProviderConfigComponent;