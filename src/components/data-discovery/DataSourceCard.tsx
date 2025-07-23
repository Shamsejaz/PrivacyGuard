import React from 'react';
import { Database, Cloud, HardDrive, Globe, Play, Pause, RefreshCw, Settings, AlertTriangle, CheckCircle, Clock, Zap, Scan, Eye } from 'lucide-react';
import Card from '../ui/Card';
import Button from '../ui/Button';
import Badge from '../ui/Badge';
import ProgressBar from '../ui/ProgressBar';
import { DataSource } from '../../types';

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

interface DataSourceCardProps {
  source: DataSource;
  onScan: (id: string) => void;
  onAdvancedScan: (id: string) => void;
  onViewDetails: (id: string) => void;
  onConfigure: (id: string) => void;
  onToggleStatus: (id: string) => void;
  onRefresh: (id: string) => void;
  isScanning: boolean;
  scanResult?: ScanResult;
}

const getTypeIcon = (type: string) => {
  switch (type) {
    case 'database': return Database;
    case 'cloud_storage': return Cloud;
    case 'file_system': return HardDrive;
    case 'saas': return Globe;
    default: return Database;
  }
};

const getStatusColor = (status: string) => {
  switch (status) {
    case 'active': return 'bg-green-100 text-green-800';
    case 'inactive': return 'bg-gray-100 text-gray-800';
    case 'error': return 'bg-red-100 text-red-800';
    default: return 'bg-gray-100 text-gray-800';
  }
};

const getRiskColor = (risk: string) => {
  switch (risk) {
    case 'low': return 'bg-green-100 text-green-800';
    case 'medium': return 'bg-yellow-100 text-yellow-800';
    case 'high': return 'bg-orange-100 text-orange-800';
    case 'critical': return 'bg-red-100 text-red-800';
    default: return 'bg-gray-100 text-gray-800';
  }
};

const getTypeLabel = (type: string) => {
  switch (type) {
    case 'database': return 'Database';
    case 'cloud_storage': return 'Cloud Storage';
    case 'file_system': return 'File System';
    case 'saas': return 'SaaS Application';
    default: return type;
  }
};

export const DataSourceCard: React.FC<DataSourceCardProps> = ({
  source,
  onScan,
  onAdvancedScan,
  onViewDetails,
  onConfigure,
  onToggleStatus,
  onRefresh,
  isScanning,
  scanResult
}) => {
  const TypeIcon = getTypeIcon(source.type);

  const handleScanClick = () => {
    onScan(source.id);
  };

  const handleAdvancedScanClick = () => {
    onAdvancedScan(source.id);
  };

  const formatLastScan = (date: Date) => {
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getPiiDensity = () => {
    return source.recordCount > 0 ? ((source.piiCount / source.recordCount) * 100).toFixed(1) : '0.0';
  };

  const getScanProgress = () => {
    if (scanResult && scanResult.status === 'running') {
      return scanResult.progress;
    }
    return 0;
  };

  const getScanEstimate = () => {
    if (scanResult && scanResult.status === 'running') {
      const elapsed = Date.now() - scanResult.startTime.getTime();
      const remaining = (elapsed / scanResult.progress) * (100 - scanResult.progress);
      const minutes = Math.ceil(remaining / (1000 * 60));
      return `${minutes} min remaining`;
    }
    return '';
  };

  return (
    <Card className="p-6 hover:shadow-lg transition-shadow">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-blue-100 rounded-lg">
            <TypeIcon className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">{source.name}</h3>
            <p className="text-sm text-gray-500">{getTypeLabel(source.type)}</p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <Badge className={getStatusColor(source.status)}>
            {isScanning && <Zap className="w-3 h-3 mr-1 animate-pulse" />}
            {source.status === 'active' && !isScanning && <CheckCircle className="w-3 h-3 mr-1" />}
            {source.status === 'error' && <AlertTriangle className="w-3 h-3 mr-1" />}
            {source.status === 'inactive' && <Clock className="w-3 h-3 mr-1" />}
            {isScanning ? 'scanning' : source.status}
          </Badge>
          <Badge className={getRiskColor(source.riskLevel)}>
            {source.riskLevel} risk
          </Badge>
        </div>
      </div>

      {isScanning && scanResult && (
        <div className="mb-4">
          <div className="flex justify-between text-sm text-gray-600 mb-2">
            <span>
              {scanResult.scanType === 'quick' ? 'Quick Scan' : 'Advanced Scan'} in progress...
            </span>
            <span>{getScanProgress()}%</span>
          </div>
          <ProgressBar value={getScanProgress()} variant="info" />
          <div className="flex justify-between text-xs text-gray-500 mt-1">
            <span>Records: {scanResult.recordsScanned.toLocaleString()}</span>
            <span>{getScanEstimate()}</span>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="text-center p-3 bg-gray-50 rounded-lg">
          <p className="text-2xl font-bold text-gray-900">{source.recordCount.toLocaleString()}</p>
          <p className="text-sm text-gray-600">Records Found</p>
        </div>
        <div className="text-center p-3 bg-gray-50 rounded-lg">
          <p className="text-2xl font-bold text-red-600">{source.piiCount.toLocaleString()}</p>
          <p className="text-sm text-gray-600">PII Detected</p>
        </div>
      </div>

      <div className="flex items-center justify-between text-sm text-gray-600 mb-4">
        <span>Last scan: {formatLastScan(source.lastScan)}</span>
        <span>{getPiiDensity()}% PII density</span>
      </div>

      <div className="space-y-2">
        <div className="flex items-center space-x-2">
          <Button
            onClick={handleScanClick}
            disabled={source.status === 'error' || isScanning}
            className="flex-1"
            variant={isScanning ? 'secondary' : 'primary'}
            size="sm"
          >
            {isScanning ? (
              <>
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                Scanning...
              </>
            ) : (
              <>
                <Play className="w-4 h-4 mr-2" />
                Quick Scan
              </>
            )}
          </Button>
          
          <Button
            onClick={() => onViewDetails(source.id)}
            variant="outline"
            size="sm"
          >
            <Eye className="w-4 h-4" />
          </Button>
          
          <Button
            onClick={() => onConfigure(source.id)}
            variant="outline"
            size="sm"
          >
            <Settings className="w-4 h-4" />
          </Button>
          
          <Button
            onClick={() => onRefresh(source.id)}
            variant="outline"
            size="sm"
          >
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>

        <Button
          onClick={handleAdvancedScanClick}
          variant="outline"
          className="w-full"
          size="sm"
          disabled={isScanning}
        >
          <Scan className="w-4 h-4 mr-2" />
          Advanced Scan
        </Button>
      </div>

      {scanResult && scanResult.status === 'completed' && scanResult.findings.length > 0 && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <p className="text-sm font-medium text-gray-700 mb-2">Latest Scan Results</p>
          <div className="space-y-1">
            {scanResult.findings.slice(0, 2).map((finding, index) => (
              <div key={index} className="flex justify-between text-xs">
                <span className="text-gray-600">{finding.field}</span>
                <span className="font-medium text-orange-600">{finding.type}</span>
              </div>
            ))}
            {scanResult.findings.length > 2 && (
              <p className="text-xs text-gray-500">+{scanResult.findings.length - 2} more findings</p>
            )}
          </div>
        </div>
      )}
    </Card>
  );
};