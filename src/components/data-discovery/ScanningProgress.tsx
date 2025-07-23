import React from 'react';
import { Play, Pause, Square, RefreshCw, CheckCircle, AlertTriangle, Clock } from 'lucide-react';
import Card from '../ui/Card';
import Badge from '../ui/Badge';
import Button from '../ui/Button';
import ProgressBar from '../ui/ProgressBar';

interface ScanJob {
  id: string;
  name: string;
  source: string;
  status: 'running' | 'completed' | 'failed' | 'queued' | 'paused';
  progress: number;
  startTime: Date;
  estimatedCompletion?: Date;
  recordsScanned: number;
  piiFound: number;
  errors: number;
}

const ScanningProgress: React.FC = () => {
  const scanJobs: ScanJob[] = [
    {
      id: '1',
      name: 'Full Database Scan',
      source: 'Customer Database',
      status: 'running',
      progress: 67,
      startTime: new Date('2024-01-15T14:30:00'),
      estimatedCompletion: new Date('2024-01-15T15:45:00'),
      recordsScanned: 89500,
      piiFound: 12340,
      errors: 0
    },
    {
      id: '2',
      name: 'Cloud Storage Audit',
      source: 'AWS S3 Bucket',
      status: 'completed',
      progress: 100,
      startTime: new Date('2024-01-15T13:00:00'),
      recordsScanned: 45000,
      piiFound: 8900,
      errors: 2
    },
    {
      id: '3',
      name: 'SharePoint Document Scan',
      source: 'SharePoint Documents',
      status: 'failed',
      progress: 23,
      startTime: new Date('2024-01-15T12:15:00'),
      recordsScanned: 1200,
      piiFound: 340,
      errors: 15
    },
    {
      id: '4',
      name: 'Salesforce Data Discovery',
      source: 'Salesforce CRM',
      status: 'queued',
      progress: 0,
      startTime: new Date('2024-01-15T16:00:00'),
      recordsScanned: 0,
      piiFound: 0,
      errors: 0
    }
  ];

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'running': return <Badge variant="info">Running</Badge>;
      case 'completed': return <Badge variant="success">Completed</Badge>;
      case 'failed': return <Badge variant="danger">Failed</Badge>;
      case 'queued': return <Badge variant="warning">Queued</Badge>;
      case 'paused': return <Badge variant="default">Paused</Badge>;
      default: return <Badge variant="default">Unknown</Badge>;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'running': return <RefreshCw className="h-5 w-5 text-blue-500 animate-spin" />;
      case 'completed': return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'failed': return <AlertTriangle className="h-5 w-5 text-red-500" />;
      case 'queued': return <Clock className="h-5 w-5 text-yellow-500" />;
      case 'paused': return <Pause className="h-5 w-5 text-gray-500" />;
      default: return <Clock className="h-5 w-5 text-gray-500" />;
    }
  };

  const getProgressVariant = (status: string) => {
    switch (status) {
      case 'running': return 'info';
      case 'completed': return 'success';
      case 'failed': return 'danger';
      default: return 'default';
    }
  };

  const formatDuration = (startTime: Date, endTime?: Date) => {
    const end = endTime || new Date();
    const diff = end.getTime() - startTime.getTime();
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    }
    return `${minutes}m`;
  };

  const totalRecordsScanned = scanJobs.reduce((sum, job) => sum + job.recordsScanned, 0);
  const totalPiiFound = scanJobs.reduce((sum, job) => sum + job.piiFound, 0);
  const totalErrors = scanJobs.reduce((sum, job) => sum + job.errors, 0);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Active Scans</p>
              <p className="text-2xl font-bold text-blue-600">
                {scanJobs.filter(job => job.status === 'running').length}
              </p>
            </div>
            <RefreshCw className="h-8 w-8 text-blue-600" />
          </div>
        </Card>
        
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Records Scanned</p>
              <p className="text-2xl font-bold text-gray-900">{totalRecordsScanned.toLocaleString()}</p>
            </div>
            <CheckCircle className="h-8 w-8 text-teal-600" />
          </div>
        </Card>
        
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">PII Discovered</p>
              <p className="text-2xl font-bold text-orange-600">{totalPiiFound.toLocaleString()}</p>
            </div>
            <AlertTriangle className="h-8 w-8 text-orange-600" />
          </div>
        </Card>
        
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Scan Errors</p>
              <p className="text-2xl font-bold text-red-600">{totalErrors}</p>
            </div>
            <AlertTriangle className="h-8 w-8 text-red-600" />
          </div>
        </Card>
      </div>

      <Card>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-900">Scanning Progress</h2>
          <div className="flex items-center space-x-2">
            <Button variant="outline" size="sm">
              <Pause className="h-4 w-4 mr-2" />
              Pause All
            </Button>
            <Button size="sm">
              <Play className="h-4 w-4 mr-2" />
              Start New Scan
            </Button>
          </div>
        </div>

        <div className="space-y-4">
          {scanJobs.map((job) => (
            <div key={job.id} className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-3">
                  {getStatusIcon(job.status)}
                  <div>
                    <h3 className="font-medium text-gray-900">{job.name}</h3>
                    <p className="text-sm text-gray-600">{job.source}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  {getStatusBadge(job.status)}
                  <div className="flex items-center space-x-2">
                    {job.status === 'running' && (
                      <>
                        <Button variant="ghost" size="sm">
                          <Pause className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm">
                          <Square className="h-4 w-4" />
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </div>

              <div className="mb-3">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-sm font-medium text-gray-700">Progress</span>
                  <span className="text-sm text-gray-600">{job.progress}%</span>
                </div>
                <ProgressBar 
                  value={job.progress} 
                  variant={getProgressVariant(job.status)} 
                />
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <p className="text-gray-600">Records Scanned</p>
                  <p className="font-medium">{job.recordsScanned.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-gray-600">PII Found</p>
                  <p className="font-medium text-orange-600">{job.piiFound.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-gray-600">Duration</p>
                  <p className="font-medium">{formatDuration(job.startTime)}</p>
                </div>
                <div>
                  <p className="text-gray-600">Errors</p>
                  <p className={`font-medium ${job.errors > 0 ? 'text-red-600' : 'text-green-600'}`}>
                    {job.errors}
                  </p>
                </div>
              </div>

              {job.estimatedCompletion && job.status === 'running' && (
                <div className="mt-3 text-sm text-gray-600">
                  Estimated completion: {job.estimatedCompletion.toLocaleTimeString()}
                </div>
              )}
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
};

export default ScanningProgress;