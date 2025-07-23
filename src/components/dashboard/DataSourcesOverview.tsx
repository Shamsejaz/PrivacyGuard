import React from 'react';
import { Database, Cloud, FileText, Users, AlertTriangle, CheckCircle, Clock } from 'lucide-react';
import Card from '../ui/Card';
import Badge from '../ui/Badge';
import { DataSource } from '../../types';

const DataSourcesOverview: React.FC = () => {
  const dataSources: DataSource[] = [
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
    }
  ];

  const getSourceIcon = (type: string) => {
    switch (type) {
      case 'database': return <Database className="h-5 w-5 text-blue-600" />;
      case 'cloud_storage': return <Cloud className="h-5 w-5 text-teal-600" />;
      case 'file_system': return <FileText className="h-5 w-5 text-orange-600" />;
      case 'saas': return <Users className="h-5 w-5 text-purple-600" />;
      default: return <Database className="h-5 w-5 text-gray-600" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active': return <Badge variant="success">Active</Badge>;
      case 'inactive': return <Badge variant="warning">Inactive</Badge>;
      case 'error': return <Badge variant="danger">Error</Badge>;
      default: return <Badge variant="default">Unknown</Badge>;
    }
  };

  const getRiskBadge = (level: string) => {
    switch (level) {
      case 'low': return <Badge variant="success">Low Risk</Badge>;
      case 'medium': return <Badge variant="warning">Medium Risk</Badge>;
      case 'high': return <Badge variant="danger">High Risk</Badge>;
      case 'critical': return <Badge variant="danger">Critical Risk</Badge>;
      default: return <Badge variant="default">Unknown</Badge>;
    }
  };

  const totalRecords = dataSources.reduce((sum, source) => sum + source.recordCount, 0);
  const totalPII = dataSources.reduce((sum, source) => sum + source.piiCount, 0);

  return (
    <div className="mb-8">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Data Sources</p>
              <p className="text-2xl font-bold text-gray-900">{dataSources.length}</p>
            </div>
            <Database className="h-8 w-8 text-blue-600" />
          </div>
        </Card>
        
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Records</p>
              <p className="text-2xl font-bold text-gray-900">{totalRecords.toLocaleString()}</p>
            </div>
            <FileText className="h-8 w-8 text-teal-600" />
          </div>
        </Card>
        
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">PII Records</p>
              <p className="text-2xl font-bold text-gray-900">{totalPII.toLocaleString()}</p>
            </div>
            <AlertTriangle className="h-8 w-8 text-orange-600" />
          </div>
        </Card>
      </div>

      <Card>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-900">Data Sources</h2>
          <button className="text-blue-600 hover:text-blue-800 font-medium">
            View All
          </button>
        </div>
        
        <div className="space-y-4">
          {dataSources.map((source) => (
            <div key={source.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center space-x-4">
                {getSourceIcon(source.type)}
                <div>
                  <h3 className="font-medium text-gray-900">{source.name}</h3>
                  <p className="text-sm text-gray-600">
                    {source.recordCount.toLocaleString()} records • {source.piiCount.toLocaleString()} PII
                  </p>
                </div>
              </div>
              
              <div className="flex items-center space-x-4">
                <div className="text-right">
                  <p className="text-sm text-gray-600">Last Scan</p>
                  <p className="text-sm font-medium">
                    {source.lastScan.toLocaleDateString()}
                  </p>
                </div>
                {getRiskBadge(source.riskLevel)}
                {getStatusBadge(source.status)}
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
};

export default DataSourcesOverview;