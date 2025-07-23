import React, { useState, useEffect } from 'react';
import { Settings, Key, Shield, Bell, Globe, Users, Database } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import APISettingsPanel from './APISettingsPanel';
import Card from '../ui/Card';
import Button from '../ui/Button';

const SettingsDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState('api');
  const { user } = useAuth();
  const [hasAccess, setHasAccess] = useState(false);

  useEffect(() => {
    // Check if user has admin role
    if (user && user.role === 'admin') {
      setHasAccess(true);
    } else {
      setHasAccess(false);
    }
  }, [user]);

  const tabs = [
    { id: 'api', label: 'API Settings', icon: Key },
    { id: 'security', label: 'Security', icon: Shield },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'localization', label: 'Localization', icon: Globe },
    { id: 'users', label: 'User Management', icon: Users },
    { id: 'data', label: 'Data Sources', icon: Database },
  ];

  const renderTabContent = () => {
    switch (activeTab) {
      case 'api':
        return <APISettingsPanel />;
      case 'security':
        return (
          <Card className="p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Security Settings</h2>
            <p className="text-gray-600">Security settings coming soon...</p>
          </Card>
        );
      case 'notifications':
        return (
          <Card className="p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Notification Settings</h2>
            <p className="text-gray-600">Notification settings coming soon...</p>
          </Card>
        );
      case 'localization':
        return (
          <Card className="p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Localization Settings</h2>
            <p className="text-gray-600">Localization settings coming soon...</p>
          </Card>
        );
      case 'users':
        return (
          <Card className="p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">User Management</h2>
            <p className="text-gray-600">User management settings coming soon...</p>
          </Card>
        );
      case 'data':
        return (
          <Card className="p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Data Source Settings</h2>
            <p className="text-gray-600">Data source settings coming soon...</p>
          </Card>
        );
      default:
        return null;
    }
  };

  return (
    <>
    {!hasAccess ? (
      <Card className="p-6">
        <div className="text-center">
          <Shield className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Access Restricted</h2>
          <p className="text-gray-600 mb-4">
            You need administrator permissions to access system settings.
            Please contact your system administrator for assistance.
          </p>
        </div>
      </Card>
    ) : (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
          <p className="text-gray-600 mt-1">Configure system settings and integrations</p>
        </div>
        <Button>
          <Settings className="h-4 w-4 mr-2" />
          Save All Settings
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="md:col-span-1">
          <Card className="p-4">
            <nav className="space-y-1">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-left transition-colors duration-200 ${
                    activeTab === tab.id
                      ? 'bg-blue-50 text-blue-700'
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <tab.icon className="h-5 w-5" />
                  <span className="font-medium">{tab.label}</span>
                </button>
              ))}
            </nav>
          </Card>
        </div>

        <div className="md:col-span-3">
          {renderTabContent()}
        </div>
      </div>
    </div>
    )}
    </>
  );
};

export default SettingsDashboard;