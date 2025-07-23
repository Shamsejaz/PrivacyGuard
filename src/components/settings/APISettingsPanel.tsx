import React, { useState, useEffect } from 'react';
import { Key, Server, Save, RefreshCw, CheckCircle, AlertTriangle } from 'lucide-react';
import Card from '../ui/Card';
import Button from '../ui/Button';
import Badge from '../ui/Badge';
import { dlpService } from '../../services/dlpService';
import { pythonPIIService } from '../../services/pythonPIIService';

interface APISettings {
  googleCloudApiKey: string;
  googleCloudProjectId: string;
  pythonPiiEndpoint: string;
}

const APISettingsPanel: React.FC = () => {
  const [settings, setSettings] = useState<APISettings>({
    googleCloudApiKey: localStorage.getItem('googleCloudApiKey') || '',
    googleCloudProjectId: localStorage.getItem('googleCloudProjectId') || '',
    pythonPiiEndpoint: localStorage.getItem('pythonPiiEndpoint') || 'http://localhost:8000'
  });

  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [serviceStatus, setServiceStatus] = useState<{
    googleDlp: boolean;
    pythonService: boolean;
  }>({
    googleDlp: false,
    pythonService: false
  });
  const [isCheckingStatus, setIsCheckingStatus] = useState(false);

  useEffect(() => {
    checkServiceStatus();
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setSettings(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const saveSettings = () => {
    setIsSaving(true);
    setSaveMessage(null);

    try {
      // Save to localStorage
      localStorage.setItem('googleCloudApiKey', settings.googleCloudApiKey);
      localStorage.setItem('googleCloudProjectId', settings.googleCloudProjectId);
      localStorage.setItem('pythonPiiEndpoint', settings.pythonPiiEndpoint);

      // Update environment variables (these will only persist for the current session)
      (window as any).env = {
        ...(window as any).env,
        VITE_GOOGLE_CLOUD_API_KEY: settings.googleCloudApiKey,
        VITE_GOOGLE_CLOUD_PROJECT_ID: settings.googleCloudProjectId,
        VITE_PYTHON_PII_ENDPOINT: settings.pythonPiiEndpoint
      };

      // Show success message
      setSaveMessage({
        type: 'success',
        text: 'Settings saved successfully. You may need to refresh the page for changes to take effect.'
      });

      // Check service status after saving
      checkServiceStatus();
    } catch (error) {
      setSaveMessage({
        type: 'error',
        text: `Failed to save settings: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
    } finally {
      setIsSaving(false);
    }
  };

  const checkServiceStatus = async () => {
    setIsCheckingStatus(true);
    
    try {
      // Check Google DLP API status
      let googleDlpStatus = false;
      try {
        const dlpStatus = await dlpService.getEngineStatus();
        googleDlpStatus = dlpStatus.google_dlp;
      } catch (error) {
        console.error('Failed to check Google DLP status:', error);
      }

      // Check Python PII service status
      let pythonServiceStatus = false;
      try {
        pythonServiceStatus = await pythonPIIService.isServiceAvailable();
      } catch (error) {
        console.error('Failed to check Python PII service status:', error);
      }

      setServiceStatus({
        googleDlp: googleDlpStatus,
        pythonService: pythonServiceStatus
      });
    } finally {
      setIsCheckingStatus(false);
    }
  };

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-gray-900">API Settings</h2>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={checkServiceStatus}
          disabled={isCheckingStatus}
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${isCheckingStatus ? 'animate-spin' : ''}`} />
          Check Status
        </Button>
      </div>

      <div className="space-y-6">
        {/* Google Cloud DLP Settings */}
        <div>
          <div className="flex items-center space-x-2 mb-4">
            <Key className="h-5 w-5 text-blue-600" />
            <h3 className="text-lg font-medium text-gray-900">Google Cloud DLP API</h3>
            <Badge 
              variant={serviceStatus.googleDlp ? 'success' : 'danger'}
              size="sm"
            >
              {serviceStatus.googleDlp ? 'Connected' : 'Not Connected'}
            </Badge>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                API Key
              </label>
              <input
                type="password"
                name="googleCloudApiKey"
                value={settings.googleCloudApiKey}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter your Google Cloud API Key"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Project ID
              </label>
              <input
                type="text"
                name="googleCloudProjectId"
                value={settings.googleCloudProjectId}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter your Google Cloud Project ID"
              />
            </div>
          </div>

          <div className="bg-blue-50 p-4 rounded-lg text-sm text-blue-800">
            <p className="font-medium mb-1">How to get Google Cloud DLP API credentials:</p>
            <ol className="list-decimal list-inside space-y-1">
              <li>Go to <a href="https://console.cloud.google.com/" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Google Cloud Console</a></li>
              <li>Create a new project or select an existing one</li>
              <li>Enable the "Cloud Data Loss Prevention (DLP) API"</li>
              <li>Go to "APIs & Services" &gt; "Credentials"</li>
              <li>Create an API key with DLP API permissions</li>
              <li>Copy the API key and Project ID here</li>
            </ol>
          </div>
        </div>

        {/* Python PII Service Settings */}
        <div>
          <div className="flex items-center space-x-2 mb-4">
            <Server className="h-5 w-5 text-purple-600" />
            <h3 className="text-lg font-medium text-gray-900">Python PII Service</h3>
            <Badge 
              variant={serviceStatus.pythonService ? 'success' : 'danger'}
              size="sm"
            >
              {serviceStatus.pythonService ? 'Connected' : 'Not Connected'}
            </Badge>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Service Endpoint
            </label>
            <input
              type="text"
              name="pythonPiiEndpoint"
              value={settings.pythonPiiEndpoint}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="http://localhost:8000"
            />
          </div>

          <div className="bg-blue-50 p-4 rounded-lg text-sm text-blue-800">
            <p className="font-medium mb-1">How to start the Python PII Service:</p>
            <ol className="list-decimal list-inside space-y-1">
              <li>Navigate to the <code className="bg-blue-100 px-1 rounded">python_pii_service</code> directory</li>
              <li>Run <code className="bg-blue-100 px-1 rounded">source venv/bin/activate</code> to activate the virtual environment</li>
              <li>Run <code className="bg-blue-100 px-1 rounded">python main.py</code> to start the service</li>
              <li>The service will be available at <code className="bg-blue-100 px-1 rounded">http://localhost:8000</code></li>
              <li>API documentation will be available at <code className="bg-blue-100 px-1 rounded">http://localhost:8000/docs</code></li>
            </ol>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex items-center justify-between pt-4 border-t border-gray-200">
          <div>
            {saveMessage && (
              <div className="flex items-center space-x-2">
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
          </div>
          <Button 
            onClick={saveSettings}
            disabled={isSaving}
          >
            <Save className="h-4 w-4 mr-2" />
            {isSaving ? 'Saving...' : 'Save Settings'}
          </Button>
        </div>
      </div>
    </Card>
  );
};

export default APISettingsPanel;