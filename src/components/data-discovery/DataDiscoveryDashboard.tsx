import React, { useState, useRef } from 'react';
import { Search, Plus, Settings, Download, RefreshCw, AlertTriangle, CheckCircle, Database, Cloud, FileText, Globe, X, Upload, Key, Folder, Link } from 'lucide-react';
import Button from '../ui/Button';
import Card from '../ui/Card';
import Badge from '../ui/Badge';
import ProgressBar from '../ui/ProgressBar';
import { DataSourceCard } from './DataSourceCard';
import DataFlowDiagram from './DataFlowDiagram';
import ClassificationResults from './ClassificationResults';
import ScanningProgress from './ScanningProgress';
import AdvancedScanningModal from './AdvancedScanningModal';
import { DataSource } from '../../types';

interface SourceConnectionForm {
  name: string;
  type: 'database' | 'cloud_storage' | 'file_system' | 'saas';
  // Database fields
  dbType?: 'mysql' | 'postgresql' | 'mongodb' | 'oracle' | 'sqlserver';
  host?: string;
  port?: number;
  database?: string;
  username?: string;
  password?: string;
  ssl?: boolean;
  // Cloud Storage fields
  cloudProvider?: 'aws_s3' | 'azure_blob' | 'google_cloud' | 'dropbox';
  bucketName?: string;
  region?: string;
  accessKey?: string;
  secretKey?: string;
  // File System fields
  path?: string;
  networkPath?: string;
  shareUsername?: string;
  sharePassword?: string;
  // SaaS fields
  saasProvider?: 'salesforce' | 'hubspot' | 'zendesk' | 'slack' | 'microsoft365' | 'google_workspace';
  apiEndpoint?: string;
  apiKey?: string;
  clientId?: string;
  clientSecret?: string;
  tenantId?: string;
}

interface ScanResult {
  id: string;
  sourceId: string;
  scanType: 'quick' | 'advanced';
  status: 'running' | 'completed' | 'failed';
  progress: number;
  startTime: Date;
  endTime?: Date;
  recordsScanned: number;
  piiFound: number;
  classifications: Array<{
    type: string;
    count: number;
    confidence: number;
  }>;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  findings: Array<{
    field: string;
    type: string;
    sample: string;
    confidence: number;
  }>;
}

const DataDiscoveryDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState('sources');
  const [searchTerm, setSearchTerm] = useState('');
  const [scanningSourceIds, setScanningSourceIds] = useState<Set<string>>(new Set());
  const [showAdvancedModal, setShowAdvancedModal] = useState(false);
  const [selectedSourceForAdvanced, setSelectedSourceForAdvanced] = useState<{ id: string; name: string; type: string } | null>(null);
  const [scanResults, setScanResults] = useState<ScanResult[]>([]);
  const [dataSources, setDataSources] = useState<DataSource[]>([
    {
      id: '1',
      name: 'Customer Database',
      type: 'database',
      status: 'active',
      recordCount: 150000,
      piiCount: 89000,
      lastScan: new Date('2024-01-15T10:30:00'),
      riskLevel: 'medium'
    },
    {
      id: '2',
      name: 'AWS S3 Bucket',
      type: 'cloud_storage',
      status: 'active',
      recordCount: 45000,
      piiCount: 12000,
      lastScan: new Date('2024-01-15T09:15:00'),
      riskLevel: 'low'
    },
    {
      id: '3',
      name: 'SharePoint Documents',
      type: 'file_system',
      status: 'error',
      recordCount: 8500,
      piiCount: 3200,
      lastScan: new Date('2024-01-14T16:45:00'),
      riskLevel: 'high'
    },
    {
      id: '4',
      name: 'Salesforce CRM',
      type: 'saas',
      status: 'active',
      recordCount: 75000,
      piiCount: 45000,
      lastScan: new Date('2024-01-15T08:20:00'),
      riskLevel: 'medium'
    },
    {
      id: '5',
      name: 'HR Database',
      type: 'database',
      status: 'active',
      recordCount: 2500,
      piiCount: 2500,
      lastScan: new Date('2024-01-15T07:10:00'),
      riskLevel: 'critical'
    },
    {
      id: '6',
      name: 'Google Drive',
      type: 'cloud_storage',
      status: 'inactive',
      recordCount: 12000,
      piiCount: 4500,
      lastScan: new Date('2024-01-13T14:30:00'),
      riskLevel: 'medium'
    }
  ]);

  const [showAddSource, setShowAddSource] = useState(false);
  const [connectionForm, setConnectionForm] = useState<SourceConnectionForm>({
    name: '',
    type: 'database',
    dbType: 'mysql',
    host: '',
    port: 3306,
    database: '',
    username: '',
    password: '',
    ssl: false,
    cloudProvider: 'aws_s3',
    bucketName: '',
    region: 'us-east-1',
    accessKey: '',
    secretKey: '',
    path: '',
    networkPath: '',
    shareUsername: '',
    sharePassword: '',
    saasProvider: 'salesforce',
    apiEndpoint: '',
    apiKey: '',
    clientId: '',
    clientSecret: '',
    tenantId: ''
  });

  const sourceTypes = [
    { value: 'database', label: 'Database', icon: Database },
    { value: 'cloud_storage', label: 'Cloud Storage', icon: Cloud },
    { value: 'file_system', label: 'File System', icon: FileText },
    { value: 'saas', label: 'SaaS Application', icon: Globe }
  ];

  const databaseTypes = [
    { 
      value: 'mysql', 
      label: 'MySQL', 
      defaultPort: 3306,
      example: 'mysql://username:password@hostname:3306/database_name',
      sampleConnection: 'mysql://admin:mypassword@localhost:3306/customer_db'
    },
    { 
      value: 'postgresql', 
      label: 'PostgreSQL', 
      defaultPort: 5432,
      example: 'postgresql://username:password@hostname:5432/database_name',
      sampleConnection: 'postgresql://postgres:secretpass@db.company.com:5432/analytics_db'
    },
    { 
      value: 'mongodb', 
      label: 'MongoDB', 
      defaultPort: 27017,
      example: 'mongodb://username:password@hostname:27017/database_name',
      sampleConnection: 'mongodb://dbuser:dbpass123@cluster0.mongodb.net:27017/userdata'
    },
    { 
      value: 'oracle', 
      label: 'Oracle', 
      defaultPort: 1521,
      example: 'oracle://username:password@hostname:1521/service_name',
      sampleConnection: 'oracle://hr_user:oracle123@oracle-server:1521/ORCL'
    },
    { 
      value: 'sqlserver', 
      label: 'SQL Server', 
      defaultPort: 1433,
      example: 'sqlserver://username:password@hostname:1433;database=database_name',
      sampleConnection: 'sqlserver://sa:SqlPass123@sql-server:1433;database=CompanyDB'
    }
  ];

  const cloudProviders = [
    {
      value: 'aws_s3',
      label: 'Amazon S3',
      example: 's3://bucket-name/path',
      sampleConnection: 's3://my-company-data/customer-files/',
      authExample: 'Access Key: AKIAIOSFODNN7EXAMPLE\nSecret Key: wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY'
    },
    {
      value: 'azure_blob',
      label: 'Azure Blob Storage',
      example: 'https://account.blob.core.windows.net/container',
      sampleConnection: 'https://mystorageaccount.blob.core.windows.net/documents',
      authExample: 'Account Name: mystorageaccount\nAccount Key: base64encodedkey=='
    },
    {
      value: 'google_cloud',
      label: 'Google Cloud Storage',
      example: 'gs://bucket-name/path',
      sampleConnection: 'gs://company-data-bucket/customer-documents/',
      authExample: 'Service Account JSON Key\nProject ID: my-project-123456'
    },
    {
      value: 'dropbox',
      label: 'Dropbox Business',
      example: 'dropbox://team-folder/path',
      sampleConnection: 'dropbox://company-files/customer-data/',
      authExample: 'App Key: your_app_key\nApp Secret: your_app_secret\nAccess Token: your_access_token'
    }
  ];

  const saasProviders = [
    {
      value: 'salesforce',
      label: 'Salesforce',
      example: 'https://your-domain.salesforce.com',
      sampleConnection: 'https://mycompany.salesforce.com',
      authExample: 'Username: admin@company.com\nPassword: your_password\nSecurity Token: your_token'
    },
    {
      value: 'hubspot',
      label: 'HubSpot',
      example: 'https://api.hubapi.com',
      sampleConnection: 'https://api.hubapi.com',
      authExample: 'API Key: your-hubspot-api-key\nPrivate App Token: pat-na1-your-token'
    },
    {
      value: 'microsoft365',
      label: 'Microsoft 365',
      example: 'https://graph.microsoft.com',
      sampleConnection: 'https://graph.microsoft.com',
      authExample: 'Client ID: your-client-id\nClient Secret: your-client-secret\nTenant ID: your-tenant-id'
    },
    {
      value: 'google_workspace',
      label: 'Google Workspace',
      example: 'https://www.googleapis.com',
      sampleConnection: 'https://www.googleapis.com',
      authExample: 'Service Account JSON\nDomain: company.com\nAdmin Email: admin@company.com'
    },
    {
      value: 'slack',
      label: 'Slack',
      example: 'https://slack.com/api',
      sampleConnection: 'https://slack.com/api',
      authExample: 'Bot Token: xoxb-your-bot-token\nApp Token: xapp-your-app-token'
    },
    {
      value: 'zendesk',
      label: 'Zendesk',
      example: 'https://your-domain.zendesk.com',
      sampleConnection: 'https://mycompany.zendesk.com',
      authExample: 'Email: admin@company.com\nAPI Token: your-api-token'
    }
  ];

  const fileSystemTypes = [
    {
      value: 'local',
      label: 'Local File System',
      example: '/path/to/directory',
      sampleConnection: '/home/data/customer-files'
    },
    {
      value: 'network',
      label: 'Network Share (SMB/CIFS)',
      example: '\\\\server\\share\\path',
      sampleConnection: '\\\\fileserver\\customer-data\\documents'
    },
    {
      value: 'ftp',
      label: 'FTP/SFTP Server',
      example: 'ftp://server.com/path',
      sampleConnection: 'sftp://files.company.com/customer-uploads'
    }
  ];

  const handleQuickScan = async (sourceId: string) => {
    const source = dataSources.find(s => s.id === sourceId);
    if (!source) return;
    
    console.log(`Starting quick scan for source: ${source.name}`);

    setScanningSourceIds(prev => new Set(prev).add(sourceId));

    const scanId = `scan-${Date.now()}`;
    const newScanResult: ScanResult = {
      id: scanId,
      sourceId,
      scanType: 'quick',
      status: 'running',
      progress: 0,
      startTime: new Date(),
      recordsScanned: 0,
      piiFound: 0,
      classifications: [],
      riskLevel: 'low',
      findings: []
    };

    setScanResults(prev => [...prev, newScanResult]);

    try {
      // Simulate progressive scanning
      for (let progress = 0; progress <= 100; progress += 10) {
        await new Promise(resolve => setTimeout(resolve, 300));
        
        // Use deterministic values based on source properties instead of random
        const recordsScanned = Math.floor((progress / 100) * source.recordCount);
        const piiFound = Math.floor((progress / 100) * source.piiCount);
        
        setScanResults(prev => prev.map(scan => 
          scan.id === scanId ? {
            ...scan,
            progress,
            recordsScanned,
            piiFound
          } : scan
        ));
      }

      // Generate final results
      const finalRecords = source.recordCount;
      const finalPii = source.piiCount;
      const finalRisk = source.riskLevel;

      // Create deterministic classifications based on source type
      const classifications = source.type === 'database' ? [
        { type: 'EMAIL_ADDRESS', count: Math.floor(finalPii * 0.4), confidence: 95 },
        { type: 'PHONE_NUMBER', count: Math.floor(finalPii * 0.2), confidence: 92 },
        { type: 'PERSON_NAME', count: Math.floor(finalPii * 0.3), confidence: 90 },
        { type: 'DATE_OF_BIRTH', count: Math.floor(finalPii * 0.1), confidence: 88 }
      ] : source.type === 'cloud_storage' ? [
        { type: 'EMAIL_ADDRESS', count: Math.floor(finalPii * 0.3), confidence: 94 },
        { type: 'CREDIT_CARD', count: Math.floor(finalPii * 0.1), confidence: 98 },
        { type: 'DOCUMENT_ID', count: Math.floor(finalPii * 0.4), confidence: 91 },
        { type: 'IP_ADDRESS', count: Math.floor(finalPii * 0.2), confidence: 96 }
      ] : [
        { type: 'EMAIL_ADDRESS', count: Math.floor(finalPii * 0.5), confidence: 93 },
        { type: 'PHONE_NUMBER', count: Math.floor(finalPii * 0.3), confidence: 91 },
        { type: 'ADDRESS', count: Math.floor(finalPii * 0.2), confidence: 89 }
      ];

      // Create findings based on source type
      let findings = [];
      if (source.type === 'database') {
        findings = [
          { field: 'email', type: 'EMAIL_ADDRESS', sample: 'j***@example.com', confidence: 95 },
          { field: 'phone', type: 'PHONE_NUMBER', sample: '555-***-****', confidence: 92 },
          { field: 'name', type: 'PERSON_NAME', sample: 'J*** D**', confidence: 90 }
        ];
      } else if (source.type === 'cloud_storage') {
        findings = [
          { field: 'contact_email', type: 'EMAIL_ADDRESS', sample: 'c***@company.com', confidence: 94 },
          { field: 'payment_data', type: 'CREDIT_CARD', sample: '****-****-****-1234', confidence: 98 },
          { field: 'user_id', type: 'DOCUMENT_ID', sample: 'ID****789', confidence: 91 }
        ];
      } else {
        findings = [
          { field: 'user_email', type: 'EMAIL_ADDRESS', sample: 'u***@domain.com', confidence: 93 },
          { field: 'contact_number', type: 'PHONE_NUMBER', sample: '(***) ***-5678', confidence: 91 },
          { field: 'location', type: 'ADDRESS', sample: '*** Main St, ***', confidence: 89 }
        ];
      }

      setScanResults(prev => prev.map(scan => 
        scan.id === scanId ? {
          ...scan,
          status: 'completed',
          progress: 100,
          endTime: new Date(),
          recordsScanned: finalRecords,
          piiFound: finalPii,
          riskLevel: finalRisk,
          classifications,
          findings
        } : scan
      ));

      // Update source with new scan results
      setDataSources(prev => prev.map(s => 
        s.id === sourceId ? {
          ...s,
          recordCount: finalRecords,
          piiCount: finalPii,
          riskLevel: finalRisk,
          lastScan: new Date(),
          status: 'active' as const
        } : s
      ));

    } catch (error) {
      console.error('Quick scan failed:', error);
      setScanResults(prev => prev.map(scan => 
        scan.id === scanId ? { ...scan, status: 'failed' } : scan
      ));
    } finally {
      setScanningSourceIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(sourceId);
        return newSet;
      });
    }
  };

  const handleAdvancedScan = (sourceId: string) => {
    const source = dataSources.find(s => s.id === sourceId);
    if (source) {
      setSelectedSourceForAdvanced({
        id: source.id,
        name: source.name,
        type: source.type
      });
      setShowAdvancedModal(true);
    }
  };

  const handleViewDetails = (sourceId: string) => {
    const source = dataSources.find(s => s.id === sourceId);
    const recentScan = scanResults.filter(scan => scan.sourceId === sourceId).pop();
    
    if (source) {
      let details = `Source: ${source.name}\nType: ${source.type}\nRecords: ${source.recordCount.toLocaleString()}\nPII: ${source.piiCount.toLocaleString()}\nRisk Level: ${source.riskLevel}\nStatus: ${source.status}`;
      
      if (recentScan) {
        details += `\n\nLast Scan Results:\nScan Type: ${recentScan.scanType}\nStatus: ${recentScan.status}\nClassifications Found: ${recentScan.classifications.length}`;
        
        if (recentScan.findings.length > 0) {
          details += '\n\nKey Findings:\n' + recentScan.findings.map(f => `- ${f.field}: ${f.type} (${f.confidence}%)`).join('\n');
        }
      }
      
      alert(details);
    }
  };

  const handleConfigure = (sourceId: string) => {
    const source = dataSources.find(s => s.id === sourceId);
    if (source) {
      const newName = prompt(`Configure ${source.name}:\n\nEnter new name:`, source.name);
      if (newName && newName !== source.name) {
        setDataSources(prev => prev.map(s => 
          s.id === sourceId ? { ...s, name: newName } : s
        ));
      }
    }
  };

  const handleToggleStatus = (sourceId: string) => {
    setDataSources(prev => prev.map(source => {
      if (source.id === sourceId) {
        const newStatus = source.status === 'active' ? 'inactive' : 
                         source.status === 'inactive' ? 'active' : 
                         source.status === 'error' ? 'active' : source.status;
        return { ...source, status: newStatus };
      }
      return source;
    }));
  };

  const handleRefresh = (sourceId: string) => {
    setDataSources(prev => prev.map(source => {
      if (source.id === sourceId) {
        return { 
          ...source, 
          lastScan: new Date(),
          status: source.status === 'error' ? 'active' : source.status
        };
      }
      return source;
    }));
  };

  const handleRefreshAll = () => {
    setDataSources(prev => prev.map(source => ({
      ...source,
      lastScan: new Date(),
      status: source.status === 'error' ? 'active' : source.status
    })));
  };

  const handleSourceTypeChange = (type: string) => {
    setConnectionForm(prev => ({
      ...prev,
      type: type as SourceConnectionForm['type'],
      // Reset type-specific fields
      dbType: type === 'database' ? 'mysql' : undefined,
      port: type === 'database' ? 3306 : undefined,
      cloudProvider: type === 'cloud_storage' ? 'aws_s3' : undefined,
      region: type === 'cloud_storage' ? 'us-east-1' : undefined,
      saasProvider: type === 'saas' ? 'salesforce' : undefined
    }));
  };

  const handleDatabaseTypeChange = (dbType: string) => {
    const db = databaseTypes.find(d => d.value === dbType);
    setConnectionForm(prev => ({
      ...prev,
      dbType: dbType as SourceConnectionForm['dbType'],
      port: db?.defaultPort || 3306
    }));
  };

  const handleTestConnection = async () => {
    try {
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      if (Math.random() < 0.15) {
        throw new Error('Connection timeout - please check your credentials and network connectivity');
      }
      
      alert('✅ Connection successful! Source is ready to be added.');
    } catch (error) {
      alert(`❌ Connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleAddSource = () => {
    if (connectionForm.name.trim()) {
      const newSource: DataSource = {
        id: (dataSources.length + 1).toString(),
        name: connectionForm.name,
        type: connectionForm.type,
        status: 'active',
        recordCount: Math.floor(Math.random() * 100000) + 1000,
        piiCount: Math.floor(Math.random() * 50000) + 500,
        lastScan: new Date(),
        riskLevel: ['low', 'medium', 'high'][Math.floor(Math.random() * 3)] as any
      };
      
      setDataSources(prev => [...prev, newSource]);
      setConnectionForm({
        name: '',
        type: 'database',
        dbType: 'mysql',
        host: '',
        port: 3306,
        database: '',
        username: '',
        password: '',
        ssl: false,
        cloudProvider: 'aws_s3',
        bucketName: '',
        region: 'us-east-1',
        accessKey: '',
        secretKey: '',
        path: '',
        networkPath: '',
        shareUsername: '',
        sharePassword: '',
        saasProvider: 'salesforce',
        apiEndpoint: '',
        apiKey: '',
        clientId: '',
        clientSecret: '',
        tenantId: ''
      });
      setShowAddSource(false);
    }
  };

  const filteredSources = dataSources.filter(source =>
    source.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    source.type.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalRecords = dataSources.reduce((sum, source) => sum + source.recordCount, 0);
  const totalPII = dataSources.reduce((sum, source) => sum + source.piiCount, 0);
  const activeSources = dataSources.filter(s => s.status === 'active').length;
  const errorSources = dataSources.filter(s => s.status === 'error').length;

  const getConnectionExample = () => {
    switch (connectionForm.type) {
      case 'database':
        const dbType = databaseTypes.find(db => db.value === connectionForm.dbType);
        return dbType;
      case 'cloud_storage':
        return cloudProviders.find(cp => cp.value === connectionForm.cloudProvider);
      case 'saas':
        return saasProviders.find(sp => sp.value === connectionForm.saasProvider);
      case 'file_system':
        return fileSystemTypes[0]; // Default to local for now
      default:
        return null;
    }
  };

  const renderConnectionFields = () => {
    switch (connectionForm.type) {
      case 'database':
        return (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Database Type *</label>
              <select
                value={connectionForm.dbType}
                onChange={(e) => handleDatabaseTypeChange(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {databaseTypes.map(db => (
                  <option key={db.value} value={db.value}>{db.label}</option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Host *</label>
                <input
                  type="text"
                  value={connectionForm.host}
                  onChange={(e) => setConnectionForm(prev => ({ ...prev, host: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="localhost or server.company.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Port</label>
                <input
                  type="number"
                  value={connectionForm.port}
                  onChange={(e) => setConnectionForm(prev => ({ ...prev, port: parseInt(e.target.value) || 3306 }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Database Name *</label>
              <input
                type="text"
                value={connectionForm.database}
                onChange={(e) => setConnectionForm(prev => ({ ...prev, database: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="database_name"
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Username *</label>
                <input
                  type="text"
                  value={connectionForm.username}
                  onChange={(e) => setConnectionForm(prev => ({ ...prev, username: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="database_user"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Password *</label>
                <input
                  type="password"
                  value={connectionForm.password}
                  onChange={(e) => setConnectionForm(prev => ({ ...prev, password: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="••••••••"
                />
              </div>
            </div>
            <div className="flex items-center">
              <input
                type="checkbox"
                id="ssl"
                checked={connectionForm.ssl}
                onChange={(e) => setConnectionForm(prev => ({ ...prev, ssl: e.target.checked }))}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="ssl" className="ml-2 block text-sm text-gray-900">
                Use SSL/TLS encryption
              </label>
            </div>
          </>
        );

      case 'cloud_storage':
        return (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Cloud Provider *</label>
              <select
                value={connectionForm.cloudProvider}
                onChange={(e) => setConnectionForm(prev => ({ ...prev, cloudProvider: e.target.value as any }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {cloudProviders.map(cp => (
                  <option key={cp.value} value={cp.value}>{cp.label}</option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Bucket/Container Name *</label>
                <input
                  type="text"
                  value={connectionForm.bucketName}
                  onChange={(e) => setConnectionForm(prev => ({ ...prev, bucketName: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="my-data-bucket"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Region</label>
                <input
                  type="text"
                  value={connectionForm.region}
                  onChange={(e) => setConnectionForm(prev => ({ ...prev, region: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="us-east-1"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Access Key *</label>
                <input
                  type="text"
                  value={connectionForm.accessKey}
                  onChange={(e) => setConnectionForm(prev => ({ ...prev, accessKey: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="AKIAIOSFODNN7EXAMPLE"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Secret Key *</label>
                <input
                  type="password"
                  value={connectionForm.secretKey}
                  onChange={(e) => setConnectionForm(prev => ({ ...prev, secretKey: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="••••••••••••••••••••••••••••••••••••••••"
                />
              </div>
            </div>
          </>
        );

      case 'file_system':
        return (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">File System Path *</label>
              <input
                type="text"
                value={connectionForm.path}
                onChange={(e) => setConnectionForm(prev => ({ ...prev, path: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="/path/to/directory or \\server\share\path"
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Share Username</label>
                <input
                  type="text"
                  value={connectionForm.shareUsername}
                  onChange={(e) => setConnectionForm(prev => ({ ...prev, shareUsername: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="domain\username"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Share Password</label>
                <input
                  type="password"
                  value={connectionForm.sharePassword}
                  onChange={(e) => setConnectionForm(prev => ({ ...prev, sharePassword: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="••••••••"
                />
              </div>
            </div>
          </>
        );

      case 'saas':
        return (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">SaaS Provider *</label>
              <select
                value={connectionForm.saasProvider}
                onChange={(e) => setConnectionForm(prev => ({ ...prev, saasProvider: e.target.value as any }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {saasProviders.map(sp => (
                  <option key={sp.value} value={sp.value}>{sp.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">API Endpoint *</label>
              <input
                type="url"
                value={connectionForm.apiEndpoint}
                onChange={(e) => setConnectionForm(prev => ({ ...prev, apiEndpoint: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="https://api.provider.com"
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">API Key / Client ID *</label>
                <input
                  type="text"
                  value={connectionForm.apiKey}
                  onChange={(e) => setConnectionForm(prev => ({ ...prev, apiKey: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="your-api-key"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Client Secret</label>
                <input
                  type="password"
                  value={connectionForm.clientSecret}
                  onChange={(e) => setConnectionForm(prev => ({ ...prev, clientSecret: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="••••••••••••••••••••••••••••••••"
                />
              </div>
            </div>
            {connectionForm.saasProvider === 'microsoft365' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Tenant ID</label>
                <input
                  type="text"
                  value={connectionForm.tenantId}
                  onChange={(e) => setConnectionForm(prev => ({ ...prev, tenantId: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="your-tenant-id"
                />
              </div>
            )}
          </>
        );

      default:
        return null;
    }
  };

  const AddSourceModal = () => {
    const connectionExample = getConnectionExample();
    const selectedSourceType = sourceTypes.find(st => st.value === connectionForm.type);

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                {selectedSourceType && <selectedSourceType.icon className="h-6 w-6 text-blue-600" />}
                <h2 className="text-xl font-bold text-gray-900">Add Data Source</h2>
              </div>
              <button
                onClick={() => setShowAddSource(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
          </div>
          
          <div className="p-6 space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Source Name *</label>
              <input
                type="text"
                value={connectionForm.name}
                onChange={(e) => setConnectionForm(prev => ({ ...prev, name: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter a descriptive name for this data source"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Source Type *</label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {sourceTypes.map(type => (
                  <button
                    key={type.value}
                    onClick={() => handleSourceTypeChange(type.value)}
                    className={`p-4 border-2 rounded-lg flex flex-col items-center space-y-2 transition-colors ${
                      connectionForm.type === type.value
                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <type.icon className="h-6 w-6" />
                    <span className="text-sm font-medium">{type.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {renderConnectionFields()}

            {connectionExample && (
              <div className="bg-blue-50 p-4 rounded-lg">
                <h4 className="font-medium text-blue-900 mb-2">Connection Example:</h4>
                <code className="text-sm text-blue-800 bg-blue-100 p-2 rounded block mb-2">
                  {connectionExample.example}
                </code>
                <h4 className="font-medium text-blue-900 mb-2">Sample Connection:</h4>
                <code className="text-sm text-blue-800 bg-blue-100 p-2 rounded block mb-2">
                  {connectionExample.sampleConnection}
                </code>
                {connectionExample.authExample && (
                  <>
                    <h4 className="font-medium text-blue-900 mb-2">Authentication:</h4>
                    <pre className="text-sm text-blue-800 bg-blue-100 p-2 rounded whitespace-pre-wrap">
                      {connectionExample.authExample}
                    </pre>
                  </>
                )}
              </div>
            )}

            <div className="bg-yellow-50 p-4 rounded-lg">
              <h4 className="font-medium text-yellow-900 mb-2">Security Notes:</h4>
              <ul className="text-sm text-yellow-800 space-y-1">
                <li>• Credentials are encrypted and stored securely</li>
                <li>• Use read-only accounts when possible</li>
                <li>• Enable SSL/TLS encryption for production systems</li>
                <li>• Ensure firewall rules allow connections from this system</li>
                <li>• Test connections before adding to production</li>
              </ul>
            </div>
          </div>
          
          <div className="p-6 border-t border-gray-200 flex justify-between">
            <Button variant="outline" onClick={handleTestConnection}>
              <Key className="h-4 w-4 mr-2" />
              Test Connection
            </Button>
            <div className="flex space-x-3">
              <Button variant="outline" onClick={() => setShowAddSource(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handleAddSource}
                disabled={!connectionForm.name.trim()}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Source
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const tabs = [
    { id: 'sources', label: 'Data Sources', count: dataSources.length },
    { id: 'scanning', label: 'Scanning Progress', count: scanResults.filter(s => s.status === 'running').length },
    { id: 'classification', label: 'Classification Results', count: scanResults.filter(s => s.status === 'completed').length },
    { id: 'dataflow', label: 'Data Flow Mapping', count: null }
  ];

  const renderTabContent = () => {
    switch (activeTab) {
      case 'sources':
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Total Sources</p>
                    <p className="text-2xl font-bold text-blue-600">{dataSources.length}</p>
                  </div>
                  <Database className="h-8 w-8 text-blue-600" />
                </div>
              </Card>
              <Card>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Active Sources</p>
                    <p className="text-2xl font-bold text-green-600">{activeSources}</p>
                  </div>
                  <CheckCircle className="h-8 w-8 text-green-600" />
                </div>
              </Card>
              <Card>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Total Records</p>
                    <p className="text-2xl font-bold text-gray-900">{totalRecords.toLocaleString()}</p>
                  </div>
                  <Cloud className="h-8 w-8 text-teal-600" />
                </div>
              </Card>
              <Card>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">PII Records</p>
                    <p className="text-2xl font-bold text-red-600">{totalPII.toLocaleString()}</p>
                  </div>
                  <AlertTriangle className="h-8 w-8 text-red-600" />
                </div>
              </Card>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search data sources..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 pr-4 py-2 w-80 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <Button variant="outline">
                  <Settings className="h-4 w-4 mr-2" />
                  Configure
                </Button>
              </div>
              <div className="flex items-center space-x-2">
                <Button variant="outline" onClick={handleRefreshAll}>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Refresh All
                </Button>
                <Button onClick={() => setShowAddSource(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Source
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredSources.map((source) => (
                <DataSourceCard
                  key={source.id}
                  source={source}
                  onScan={handleQuickScan}
                  onAdvancedScan={handleAdvancedScan}
                  onViewDetails={handleViewDetails}
                  onConfigure={handleConfigure}
                  onToggleStatus={handleToggleStatus}
                  onRefresh={handleRefresh}
                  isScanning={scanningSourceIds.has(source.id)}
                  scanResult={scanResults.find(scan => scan.sourceId === source.id && scan.status === 'running')}
                />
              ))}
            </div>

            {filteredSources.length === 0 && (
              <div className="text-center py-12">
                <Database className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">No data sources found matching your search.</p>
              </div>
            )}
          </div>
        );
      case 'scanning':
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Active Scans</p>
                    <p className="text-2xl font-bold text-blue-600">
                      {scanResults.filter(s => s.status === 'running').length}
                    </p>
                  </div>
                  <RefreshCw className="h-8 w-8 text-blue-600" />
                </div>
              </Card>
              <Card>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Completed Scans</p>
                    <p className="text-2xl font-bold text-green-600">
                      {scanResults.filter(s => s.status === 'completed').length}
                    </p>
                  </div>
                  <CheckCircle className="h-8 w-8 text-green-600" />
                </div>
              </Card>
              <Card>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Records Scanned</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {scanResults.reduce((sum, scan) => sum + scan.recordsScanned, 0).toLocaleString()}
                    </p>
                  </div>
                  <Database className="h-8 w-8 text-teal-600" />
                </div>
              </Card>
              <Card>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">PII Discovered</p>
                    <p className="text-2xl font-bold text-orange-600">
                      {scanResults.reduce((sum, scan) => sum + scan.piiFound, 0).toLocaleString()}
                    </p>
                  </div>
                  <AlertTriangle className="h-8 w-8 text-orange-600" />
                </div>
              </Card>
            </div>

            <Card>
              <h2 className="text-xl font-semibold text-gray-900 mb-6">Scan Results</h2>
              <div className="space-y-4">
                {scanResults.map((scan) => {
                  const source = dataSources.find(s => s.id === scan.sourceId);
                  return (
                    <div key={scan.id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <h3 className="font-medium text-gray-900">{source?.name}</h3>
                          <p className="text-sm text-gray-600">
                            {scan.scanType === 'quick' ? 'Quick Scan' : 'Advanced Scan'} • 
                            Started {scan.startTime.toLocaleTimeString()}
                          </p>
                        </div>
                        <Badge variant={
                          scan.status === 'completed' ? 'success' :
                          scan.status === 'running' ? 'info' : 'danger'
                        }>
                          {scan.status}
                        </Badge>
                      </div>

                      {scan.status === 'running' && (
                        <div className="mb-3">
                          <div className="flex justify-between text-sm text-gray-600 mb-1">
                            <span>Progress</span>
                            <span>{scan.progress}%</span>
                          </div>
                          <ProgressBar value={scan.progress} variant="info" />
                        </div>
                      )}

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <p className="text-gray-600">Records Scanned</p>
                          <p className="font-medium">{scan.recordsScanned.toLocaleString()}</p>
                        </div>
                        <div>
                          <p className="text-gray-600">PII Found</p>
                          <p className="font-medium text-orange-600">{scan.piiFound.toLocaleString()}</p>
                        </div>
                        <div>
                          <p className="text-gray-600">Risk Level</p>
                          <Badge variant={
                            scan.riskLevel === 'critical' ? 'danger' :
                            scan.riskLevel === 'high' ? 'danger' :
                            scan.riskLevel === 'medium' ? 'warning' : 'success'
                          } size="sm">
                            {scan.riskLevel.toUpperCase()}
                          </Badge>
                        </div>
                        <div>
                          <p className="text-gray-600">Classifications</p>
                          <p className="font-medium">{scan.classifications.length}</p>
                        </div>
                      </div>

                      {scan.status === 'completed' && scan.findings.length > 0 && (
                        <div className="mt-3 pt-3 border-t border-gray-200">
                          <p className="text-sm font-medium text-gray-700 mb-2">Key Findings</p>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                            {scan.findings.slice(0, 3).map((finding, index) => (
                              <div key={index} className="bg-gray-50 p-2 rounded text-xs">
                                <span className="font-medium">{finding.field}</span>: {finding.type}
                                <span className="text-gray-500"> ({finding.confidence}%)</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {scanResults.length === 0 && (
                <div className="text-center py-8">
                  <p className="text-gray-500">No scan results available. Start a scan to see results here.</p>
                </div>
              )}
            </Card>
          </div>
        );
      case 'classification':
        return <ClassificationResults />;
      case 'dataflow':
        return <DataFlowDiagram />;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Data Discovery & Classification</h1>
          <p className="text-gray-600 mt-1">AI-powered data discovery across your entire infrastructure</p>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export Report
          </Button>
          <Button onClick={handleRefreshAll}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Start Full Scan
          </Button>
        </div>
      </div>

      <div className="border-b border-gray-200">
        <nav className="flex space-x-8">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors duration-200 ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.label}
              {tab.count !== null && (
                <span className="ml-2 bg-gray-100 text-gray-600 py-0.5 px-2 rounded-full text-xs">
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </nav>
      </div>

      {renderTabContent()}

      {showAddSource && <AddSourceModal />}
      
      {showAdvancedModal && selectedSourceForAdvanced && (
        <AdvancedScanningModal
          isOpen={showAdvancedModal}
          onClose={() => {
            setShowAdvancedModal(false);
            setSelectedSourceForAdvanced(null);
          }}
          sourceId={selectedSourceForAdvanced.id}
          sourceName={selectedSourceForAdvanced.name}
          sourceType={selectedSourceForAdvanced.type as any}
        />
      )}
    </div>
  );
};

export default DataDiscoveryDashboard;