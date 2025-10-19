import React, { useState, useEffect } from 'react';
import Card from '../ui/Card';
import Button from '../ui/Button';
import Badge from '../ui/Badge';
import { 
  AlertTriangle, 
  Shield, 
  Eye, 
  Filter,
  Download,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Search
} from 'lucide-react';

interface ComplianceFinding {
  id: string;
  resourceArn: string;
  findingType: 'ENCRYPTION' | 'ACCESS_CONTROL' | 'PII_EXPOSURE' | 'LOGGING';
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  description: string;
  detectedAt: string;
  region: string;
  status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED';
}

interface FindingsFilter {
  severity?: string;
  findingType?: string;
  status?: string;
  region?: string;
  search?: string;
}

export const ComplianceFindingsTable: React.FC = () => {
  const [findings, setFindings] = useState<ComplianceFinding[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<FindingsFilter>({});
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedFindings, setSelectedFindings] = useState<Set<string>>(new Set());
  const [showFilters, setShowFilters] = useState(false);

  const itemsPerPage = 10;

  useEffect(() => {
    loadFindings();
  }, [filters, currentPage]);

  const loadFindings = async () => {
    try {
      setLoading(true);
      
      // In a real implementation, this would call the compliance API
      // For now, we'll simulate the data
      const mockFindings: ComplianceFinding[] = [
        {
          id: 'finding-001',
          resourceArn: 'arn:aws:s3:::my-bucket-1',
          findingType: 'ENCRYPTION',
          severity: 'CRITICAL',
          description: 'S3 bucket is not encrypted at rest',
          detectedAt: new Date(Date.now() - 3600000).toISOString(),
          region: 'us-east-1',
          status: 'OPEN'
        },
        {
          id: 'finding-002',
          resourceArn: 'arn:aws:iam::123456789012:role/OverprivilegedRole',
          findingType: 'ACCESS_CONTROL',
          severity: 'HIGH',
          description: 'IAM role has excessive permissions including admin access',
          detectedAt: new Date(Date.now() - 7200000).toISOString(),
          region: 'us-east-1',
          status: 'IN_PROGRESS'
        },
        {
          id: 'finding-003',
          resourceArn: 'arn:aws:s3:::customer-data-bucket',
          findingType: 'PII_EXPOSURE',
          severity: 'CRITICAL',
          description: 'S3 bucket contains PII data and is publicly accessible',
          detectedAt: new Date(Date.now() - 1800000).toISOString(),
          region: 'us-west-2',
          status: 'OPEN'
        },
        {
          id: 'finding-004',
          resourceArn: 'arn:aws:cloudtrail:us-east-1:123456789012:trail/MyTrail',
          findingType: 'LOGGING',
          severity: 'MEDIUM',
          description: 'CloudTrail logging is not enabled for data events',
          detectedAt: new Date(Date.now() - 10800000).toISOString(),
          region: 'us-east-1',
          status: 'RESOLVED'
        },
        {
          id: 'finding-005',
          resourceArn: 'arn:aws:s3:::backup-bucket',
          findingType: 'ENCRYPTION',
          severity: 'HIGH',
          description: 'S3 bucket encryption uses default keys instead of customer-managed keys',
          detectedAt: new Date(Date.now() - 14400000).toISOString(),
          region: 'eu-west-1',
          status: 'OPEN'
        }
      ];

      // Apply filters
      let filteredFindings = mockFindings;
      
      if (filters.severity) {
        filteredFindings = filteredFindings.filter(f => f.severity === filters.severity);
      }
      
      if (filters.findingType) {
        filteredFindings = filteredFindings.filter(f => f.findingType === filters.findingType);
      }
      
      if (filters.status) {
        filteredFindings = filteredFindings.filter(f => f.status === filters.status);
      }
      
      if (filters.region) {
        filteredFindings = filteredFindings.filter(f => f.region === filters.region);
      }
      
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        filteredFindings = filteredFindings.filter(f => 
          f.description.toLowerCase().includes(searchLower) ||
          f.resourceArn.toLowerCase().includes(searchLower) ||
          f.id.toLowerCase().includes(searchLower)
        );
      }

      setFindings(filteredFindings);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load findings');
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (key: keyof FindingsFilter, value: string) => {
    setFilters(prev => ({
      ...prev,
      [key]: value || undefined
    }));
    setCurrentPage(1);
  };

  const handleSelectFinding = (findingId: string) => {
    const newSelected = new Set(selectedFindings);
    if (newSelected.has(findingId)) {
      newSelected.delete(findingId);
    } else {
      newSelected.add(findingId);
    }
    setSelectedFindings(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedFindings.size === paginatedFindings.length) {
      setSelectedFindings(new Set());
    } else {
      setSelectedFindings(new Set(paginatedFindings.map(f => f.id)));
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'CRITICAL': return 'bg-red-100 text-red-800';
      case 'HIGH': return 'bg-orange-100 text-orange-800';
      case 'MEDIUM': return 'bg-yellow-100 text-yellow-800';
      case 'LOW': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'OPEN': return 'bg-red-100 text-red-800';
      case 'IN_PROGRESS': return 'bg-yellow-100 text-yellow-800';
      case 'RESOLVED': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'ENCRYPTION': return '🔒';
      case 'ACCESS_CONTROL': return '👤';
      case 'PII_EXPOSURE': return '🔍';
      case 'LOGGING': return '📝';
      default: return '⚠️';
    }
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const totalPages = Math.ceil(findings.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedFindings = findings.slice(startIndex, startIndex + itemsPerPage);

  return (
    <div className="space-y-6">
      {/* Header and Controls */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Compliance Findings</h2>
          <p className="text-gray-600">
            {findings.length} findings found
            {selectedFindings.size > 0 && ` • ${selectedFindings.size} selected`}
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <Button
            onClick={() => setShowFilters(!showFilters)}
            variant="outline"
          >
            <Filter className="h-4 w-4 mr-2" />
            Filters
          </Button>
          <Button onClick={loadFindings} variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button className="bg-blue-600 hover:bg-blue-700">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Filters */}
      {showFilters && (
        <Card>
          <div className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Search
                </label>
                <div className="relative">
                  <Search className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search findings..."
                    className="pl-10 pr-3 py-2 border border-gray-300 rounded-md text-sm w-full focus:ring-blue-500 focus:border-blue-500"
                    value={filters.search || ''}
                    onChange={(e) => handleFilterChange('search', e.target.value)}
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Severity
                </label>
                <select
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500"
                  value={filters.severity || ''}
                  onChange={(e) => handleFilterChange('severity', e.target.value)}
                >
                  <option value="">All Severities</option>
                  <option value="CRITICAL">Critical</option>
                  <option value="HIGH">High</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="LOW">Low</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Type
                </label>
                <select
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500"
                  value={filters.findingType || ''}
                  onChange={(e) => handleFilterChange('findingType', e.target.value)}
                >
                  <option value="">All Types</option>
                  <option value="ENCRYPTION">Encryption</option>
                  <option value="ACCESS_CONTROL">Access Control</option>
                  <option value="PII_EXPOSURE">PII Exposure</option>
                  <option value="LOGGING">Logging</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Status
                </label>
                <select
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500"
                  value={filters.status || ''}
                  onChange={(e) => handleFilterChange('status', e.target.value)}
                >
                  <option value="">All Statuses</option>
                  <option value="OPEN">Open</option>
                  <option value="IN_PROGRESS">In Progress</option>
                  <option value="RESOLVED">Resolved</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Region
                </label>
                <select
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500"
                  value={filters.region || ''}
                  onChange={(e) => handleFilterChange('region', e.target.value)}
                >
                  <option value="">All Regions</option>
                  <option value="us-east-1">US East 1</option>
                  <option value="us-west-2">US West 2</option>
                  <option value="eu-west-1">EU West 1</option>
                </select>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Findings Table */}
      <Card>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left">
                  <input
                    type="checkbox"
                    checked={selectedFindings.size === paginatedFindings.length && paginatedFindings.length > 0}
                    onChange={handleSelectAll}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Finding
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Resource
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Severity
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Detected
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center">
                    <div className="flex items-center justify-center">
                      <RefreshCw className="h-6 w-6 animate-spin mr-2" />
                      Loading findings...
                    </div>
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center">
                    <div className="text-red-600">
                      <AlertTriangle className="h-6 w-6 mx-auto mb-2" />
                      {error}
                    </div>
                  </td>
                </tr>
              ) : paginatedFindings.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                    No findings match your criteria
                  </td>
                </tr>
              ) : (
                paginatedFindings.map((finding) => (
                  <tr key={finding.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <input
                        type="checkbox"
                        checked={selectedFindings.has(finding.id)}
                        onChange={() => handleSelectFinding(finding.id)}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-start space-x-3">
                        <span className="text-lg">{getTypeIcon(finding.findingType)}</span>
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {finding.id}
                          </div>
                          <div className="text-sm text-gray-600 max-w-md">
                            {finding.description}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900 font-mono max-w-xs truncate">
                        {finding.resourceArn}
                      </div>
                      <div className="text-xs text-gray-500">
                        {finding.region}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <Badge className={getSeverityColor(finding.severity)}>
                        {finding.severity}
                      </Badge>
                    </td>
                    <td className="px-6 py-4">
                      <Badge className={getStatusColor(finding.status)}>
                        {finding.status.replace('_', ' ')}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {formatDateTime(finding.detectedAt)}
                    </td>
                    <td className="px-6 py-4">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          // In a real implementation, this would open a finding details modal
                          console.log('View finding details:', finding.id);
                        }}
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        View
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
            <div className="text-sm text-gray-700">
              Showing {startIndex + 1} to {Math.min(startIndex + itemsPerPage, findings.length)} of {findings.length} results
            </div>
            <div className="flex items-center space-x-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm text-gray-700">
                Page {currentPage} of {totalPages}
              </span>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Bulk Actions */}
      {selectedFindings.size > 0 && (
        <Card className="border-blue-200 bg-blue-50">
          <div className="p-4">
            <div className="flex items-center justify-between">
              <div className="text-sm font-medium text-blue-900">
                {selectedFindings.size} finding{selectedFindings.size > 1 ? 's' : ''} selected
              </div>
              <div className="flex items-center space-x-2">
                <Button size="sm" variant="outline">
                  Bulk Remediate
                </Button>
                <Button size="sm" variant="outline">
                  Export Selected
                </Button>
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => setSelectedFindings(new Set())}
                >
                  Clear Selection
                </Button>
              </div>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
};