import React, { useState, useEffect } from 'react';
import { Settings, Database, Mail, Globe, Bell, Shield, Save, AlertTriangle, CheckCircle } from 'lucide-react';
import Card from '../ui/Card';
import Button from '../ui/Button';
import Badge from '../ui/Badge';

interface SystemConfig {
  general: {
    organizationName: string;
    timezone: string;
    dateFormat: string;
    language: string;
    logoUrl: string;
    supportEmail: string;
    supportPhone: string;
  };
  database: {
    connectionString: string;
    maxConnections: number;
    connectionTimeout: number;
    queryTimeout: number;
    backupEnabled: boolean;
    backupSchedule: string;
    retentionDays: number;
  };
  email: {
    provider: 'smtp' | 'sendgrid' | 'ses' | 'mailgun';
    smtpHost: string;
    smtpPort: number;
    smtpUser: string;
    smtpPassword: string;
    fromEmail: string;
    fromName: string;
    encryption: 'none' | 'tls' | 'ssl';
  };
  notifications: {
    emailEnabled: boolean;
    smsEnabled: boolean;
    webhookEnabled: boolean;
    webhookUrl: string;
    slackEnabled: boolean;
    slackWebhook: string;
    teamsEnabled: boolean;
    teamsWebhook: string;
  };
  security: {
    encryptionKey: string;
    apiRateLimit: number;
    corsOrigins: string[];
    trustedProxies: string[];
    auditLogEnabled: boolean;
    auditLogRetention: number;
    ipWhitelist: string[];
    ipBlacklist: string[];
  };
  compliance: {
    dataRetentionDays: number;
    anonymizationEnabled: boolean;
    consentRequired: boolean;
    cookieBannerEnabled: boolean;
    privacyPolicyUrl: string;
    termsOfServiceUrl: string;
    dpoContact: string;
  };
}

const SystemConfigPanel: React.FC = () => {
  const [activeSection, setActiveSection] = useState('general');
  const [config, setConfig] = useState<SystemConfig>({
    general: {
      organizationName: 'PrivacyComply Enterprise',
      timezone: 'UTC',
      dateFormat: 'YYYY-MM-DD',
      language: 'en',
      logoUrl: '',
      supportEmail: 'support@privacycomply.com',
      supportPhone: '+1-555-0123'
    },
    database: {
      connectionString: 'postgresql://localhost:5432/privacycomply',
      maxConnections: 100,
      connectionTimeout: 30,
      queryTimeout: 60,
      backupEnabled: true,
      backupSchedule: '0 2 * * *',
      retentionDays: 30
    },
    email: {
      provider: 'smtp',
      smtpHost: 'smtp.gmail.com',
      smtpPort: 587,
      smtpUser: '',
      smtpPassword: '',
      fromEmail: 'noreply@privacycomply.com',
      fromName: 'PrivacyComply',
      encryption: 'tls'
    },
    notifications: {
      emailEnabled: true,
      smsEnabled: false,
      webhookEnabled: false,
      webhookUrl: '',
      slackEnabled: false,
      slackWebhook: '',
      teamsEnabled: false,
      teamsWebhook: ''
    },
    security: {
      encryptionKey: '',
      apiRateLimit: 1000,
      corsOrigins: ['http://localhost:3000'],
      trustedProxies: [],
      auditLogEnabled: true,
      auditLogRetention: 365,
      ipWhitelist: [],
      ipBlacklist: []
    },
    compliance: {
      dataRetentionDays: 2555, // 7 years
      anonymizationEnabled: true,
      consentRequired: true,
      cookieBannerEnabled: true,
      privacyPolicyUrl: '/privacy-policy',
      termsOfServiceUrl: '/terms-of-service',
      dpoContact: 'dpo@company.com'
    }
  });

  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = () => {
    const savedConfig = localStorage.getItem('systemConfig');
    if (savedConfig) {
      setConfig(JSON.parse(savedConfig));
    }
  };

  const saveConfig = async () => {
    setIsSaving(true);
    setSaveMessage(null);

    try {
      localStorage.setItem('systemConfig', JSON.stringify(config));
      
      setSaveMessage({
        type: 'success',
        text: 'System configuration saved successfully.'
      });
    } catch (error) {
      setSaveMessage({
        type: 'error',
        text: `Failed to save configuration: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
    } finally {
      setIsSaving(false);
    }
  };

  const updateConfig = (section: keyof SystemConfig, field: string, value: any) => {
    setConfig(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: value
      }
    }));
  };

  const sections = [
    { id: 'general', label: 'General', icon: Settings },
    { id: 'database', label: 'Database', icon: Database },
    { id: 'email', label: 'Email', icon: Mail },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'security', label: 'Security', icon: Shield },
    { id: 'compliance', label: 'Compliance', icon: Globe }
  ];

  const renderGeneralSection = () => (
    <div className="space-y-6">
      <h3 className="text-lg font-medium text-gray-900">General Settings</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Organization Name
          </label>
          <input
            type="text"
            value={config.general.organizationName}
            onChange={(e) => updateConfig('general', 'organizationName', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Timezone
          </label>
          <select
            value={config.general.timezone}
            onChange={(e) => updateConfig('general', 'timezone', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="UTC">UTC</option>
            <option value="America/New_York">Eastern Time</option>
            <option value="America/Chicago">Central Time</option>
            <option value="America/Denver">Mountain Time</option>
            <option value="America/Los_Angeles">Pacific Time</option>
            <option value="Europe/London">London</option>
            <option value="Europe/Paris">Paris</option>
            <option value="Asia/Tokyo">Tokyo</option>
          </select>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Date Format
          </label>
          <select
            value={config.general.dateFormat}
            onChange={(e) => updateConfig('general', 'dateFormat', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="YYYY-MM-DD">YYYY-MM-DD</option>
            <option value="MM/DD/YYYY">MM/DD/YYYY</option>
            <option value="DD/MM/YYYY">DD/MM/YYYY</option>
            <option value="DD-MM-YYYY">DD-MM-YYYY</option>
          </select>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Language
          </label>
          <select
            value={config.general.language}
            onChange={(e) => updateConfig('general', 'language', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="en">English</option>
            <option value="es">Spanish</option>
            <option value="fr">French</option>
            <option value="de">German</option>
            <option value="it">Italian</option>
            <option value="pt">Portuguese</option>
          </select>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Support Email
          </label>
          <input
            type="email"
            value={config.general.supportEmail}
            onChange={(e) => updateConfig('general', 'supportEmail', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Support Phone
          </label>
          <input
            type="tel"
            value={config.general.supportPhone}
            onChange={(e) => updateConfig('general', 'supportPhone', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>
      
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Logo URL
        </label>
        <input
          type="url"
          value={config.general.logoUrl}
          onChange={(e) => updateConfig('general', 'logoUrl', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="https://example.com/logo.png"
        />
      </div>
    </div>
  );

  const renderDatabaseSection = () => (
    <div className="space-y-6">
      <h3 className="text-lg font-medium text-gray-900">Database Configuration</h3>
      
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Connection String
        </label>
        <input
          type="text"
          value={config.database.connectionString}
          onChange={(e) => updateConfig('database', 'connectionString', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="postgresql://user:password@host:port/database"
        />
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Max Connections
          </label>
          <input
            type="number"
            value={config.database.maxConnections}
            onChange={(e) => updateConfig('database', 'maxConnections', parseInt(e.target.value))}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            min="10"
            max="1000"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Connection Timeout (seconds)
          </label>
          <input
            type="number"
            value={config.database.connectionTimeout}
            onChange={(e) => updateConfig('database', 'connectionTimeout', parseInt(e.target.value))}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            min="5"
            max="300"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Query Timeout (seconds)
          </label>
          <input
            type="number"
            value={config.database.queryTimeout}
            onChange={(e) => updateConfig('database', 'queryTimeout', parseInt(e.target.value))}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            min="10"
            max="600"
          />
        </div>
      </div>
      
      <div className="space-y-4">
        <div className="flex items-center space-x-3">
          <input
            type="checkbox"
            id="backupEnabled"
            checked={config.database.backupEnabled}
            onChange={(e) => updateConfig('database', 'backupEnabled', e.target.checked)}
            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
          />
          <label htmlFor="backupEnabled" className="text-sm font-medium text-gray-700">
            Enable Automatic Backups
          </label>
        </div>
        
        {config.database.backupEnabled && (
          <div className="ml-7 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Backup Schedule (Cron)
              </label>
              <input
                type="text"
                value={config.database.backupSchedule}
                onChange={(e) => updateConfig('database', 'backupSchedule', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="0 2 * * *"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Retention Days
              </label>
              <input
                type="number"
                value={config.database.retentionDays}
                onChange={(e) => updateConfig('database', 'retentionDays', parseInt(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                min="1"
                max="365"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );

  const renderEmailSection = () => (
    <div className="space-y-6">
      <h3 className="text-lg font-medium text-gray-900">Email Configuration</h3>
      
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Email Provider
        </label>
        <select
          value={config.email.provider}
          onChange={(e) => updateConfig('email', 'provider', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="smtp">SMTP</option>
          <option value="sendgrid">SendGrid</option>
          <option value="ses">Amazon SES</option>
          <option value="mailgun">Mailgun</option>
        </select>
      </div>
      
      {config.email.provider === 'smtp' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              SMTP Host
            </label>
            <input
              type="text"
              value={config.email.smtpHost}
              onChange={(e) => updateConfig('email', 'smtpHost', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              SMTP Port
            </label>
            <input
              type="number"
              value={config.email.smtpPort}
              onChange={(e) => updateConfig('email', 'smtpPort', parseInt(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              SMTP Username
            </label>
            <input
              type="text"
              value={config.email.smtpUser}
              onChange={(e) => updateConfig('email', 'smtpUser', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              SMTP Password
            </label>
            <input
              type="password"
              value={config.email.smtpPassword}
              onChange={(e) => updateConfig('email', 'smtpPassword', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      )}
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            From Email
          </label>
          <input
            type="email"
            value={config.email.fromEmail}
            onChange={(e) => updateConfig('email', 'fromEmail', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            From Name
          </label>
          <input
            type="text"
            value={config.email.fromName}
            onChange={(e) => updateConfig('email', 'fromName', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-900">System Configuration</h2>
          <Button onClick={saveConfig} disabled={isSaving}>
            <Save className="h-4 w-4 mr-2" />
            {isSaving ? 'Saving...' : 'Save Configuration'}
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {/* Navigation */}
          <div className="md:col-span-1">
            <nav className="space-y-1">
              {sections.map((section) => (
                <button
                  key={section.id}
                  onClick={() => setActiveSection(section.id)}
                  className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-left transition-colors duration-200 ${
                    activeSection === section.id
                      ? 'bg-blue-50 text-blue-700'
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <section.icon className="h-5 w-5" />
                  <span className="font-medium">{section.label}</span>
                </button>
              ))}
            </nav>
          </div>

          {/* Content */}
          <div className="md:col-span-3">
            <Card className="p-6">
              {activeSection === 'general' && renderGeneralSection()}
              {activeSection === 'database' && renderDatabaseSection()}
              {activeSection === 'email' && renderEmailSection()}
              {activeSection === 'notifications' && (
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Notification Settings</h3>
                  <p className="text-gray-600">Notification configuration coming soon...</p>
                </div>
              )}
              {activeSection === 'security' && (
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Security Settings</h3>
                  <p className="text-gray-600">Security configuration coming soon...</p>
                </div>
              )}
              {activeSection === 'compliance' && (
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Compliance Settings</h3>
                  <p className="text-gray-600">Compliance configuration coming soon...</p>
                </div>
              )}
            </Card>
          </div>
        </div>

        {saveMessage && (
          <div className="flex items-center space-x-2 p-4 rounded-lg bg-gray-50 mt-6">
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
    </div>
  );
};

export default SystemConfigPanel;