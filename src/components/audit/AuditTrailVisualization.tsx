import React, { useState, useEffect, useMemo } from 'react';
import { 
  Search, 
  Filter, 
  Download, 
  Calendar, 
  User, 
  Activity,
  AlertCircle,
  CheckCircle,
  XCircle,
  Clock,
  Eye,
  MoreVertical
} from 'lucide-react';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { 
  AuditEvent, 
  AuditFilter, 
  AuditSearchResult,
  AuditEventType,
  AuditCategory,
  AuditSeverity,
  AuditOutcome,
  AuditExportOptions
} from '../../types/audit';
import { auditService } from '../../services/auditService';
import { useAuditLogger } from '../../hooks/useAuditLogger';
import AuditEventDetails from './AuditEventDetails';
import AuditTimelineView from './AuditTimelineView';
import AuditExportModal from './AuditExportModal';

const AuditTrailVisualization: React.FC = () => {
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'table' | 'timeline'>('table');
  const [selectedEvent, setSelectedEvent] = useState<AuditEvent | null>(null);
  const [showExportModal, setShowExportModal] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(50);

  const [filters, setFilters] = useState<AuditFilter>({
    startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Last 7 days
    endDate: new Date(),
    limit: pageSize,
    offset: 0
  });

  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  const { logPageView, logButtonClick, logSearch, logDataDownload } = useAuditLogger({
    component: 'AuditTrailVisualization'
  });

  useEffect(() => {
    loadAuditEvents();
    logPageView('audit_trail_visualization');
  }, [filters, currentPage]);

  useEffect(() => {
    const delayedSearch = setTimeout(() => {
      if (searchTerm !== filters.searchTerm) {
        handleSearch();
      }
    }, 500);

    return () => clearTimeout(delayedSearch);
  }, [searchTerm]);

  const loadAuditEvents = async () => {
    try {
      setLoading(true);
      setError(null);

      const searchFilter: AuditFilter = {
        ...filters,
        offset: (currentPage - 1) * pageSize,
        limit: pageSize
      };

      const result: AuditSearchResult = await auditService.searchEvents(searchFilter);
      setEvents(result.events);
      setTotalCount(result.totalCount);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load audit events');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async () => {
    const updatedFilters = { ...filters, searchTerm, offset: 0 };
    setFilters(updatedFilters);
    setCurrentPage(1);
    
    await logSearch('audit_events', searchTerm, events.length, updatedFilters);
  };

  const handleFilterChange = (key: keyof AuditFilter, value: any) => {
    const updatedFilters = { ...filters, [key]: value, offset: 0 };
    setFilters(updatedFilters);
    setCurrentPage(1);
  };

  const handleExport = async (options: AuditExportOptions) => {
    try {
      await logButtonClick('export_audit_events', { format: options.format });
      
      const blob = await auditService.exportEvents(options);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `audit_trail_${new Date().toISOString().split('T')[0]}.${options.format.toLowerCase()}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      await logDataDownload('audit_trail', a.download, options.format, events.length);
      setShowExportModal(false);
    } catch (error) {
      console.error('Failed to export audit events:', error);
    }
  };

  const getSeverityIcon = (severity: AuditSeverity) => {
    switch (severity) {
      case AuditSeverity.CRITICAL:
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      case AuditSeverity.HIGH:
        return <AlertCircle className="w-4 h-4 text-orange-500" />;
      case AuditSeverity.MEDIUM:
        return <AlertCircle className="w-4 h-4 text-yellow-500" />;
      default:
        return <AlertCircle className="w-4 h-4 text-blue-500" />;
    }
  };

  const getOutcomeIcon = (outcome: AuditOutcome) => {
    switch (outcome) {
      case AuditOutcome.SUCCESS:
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case AuditOutcome.FAILURE:
        return <XCircle className="w-4 h-4 text-red-500" />;
      case AuditOutcome.DENIED:
        return <XCircle className="w-4 h-4 text-orange-500" />;
      default:
        return <Clock className="w-4 h-4 text-gray-500" />;
    }
  };

  const getCategoryColor = (category: AuditCategory) => {
    const colors = {
      [AuditCategory.AUTHENTICATION]: 'bg-blue-100 text-blue-800',
      [AuditCategory.AUTHORIZATION]: 'bg-purple-100 text-purple-800',
      [AuditCategory.DATA_MANAGEMENT]: 'bg-green-100 text-green-800',
      [AuditCategory.COMPLIANCE]: 'bg-yellow-100 text-yellow-800',
      [AuditCategory.PRIVACY]: 'bg-pink-100 text-pink-800',
      [AuditCategory.SECURITY]: 'bg-red-100 text-red-800',
      [AuditCategory.SYSTEM]: 'bg-gray-100 text-gray-800',
      [AuditCategory.USER_MANAGEMENT]: 'bg-indigo-100 text-indigo-800',
      [AuditCategory.TENANT_MANAGEMENT]: 'bg-teal-100 text-teal-800',
      [AuditCategory.AI_OPERATIONS]: 'bg-orange-100 text-orange-800'
    };
    return colors[category] || 'bg-gray-100 text-gray-800';
  };

  const totalPages = Math.ceil(totalCount / pageSize);

  const filteredEvents = useMemo(() => {
    if (!searchTerm) return events;
    
    return events.filter(event => 
      event.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
      event.resource.toLowerCase().includes(searchTerm.toLowerCase()) ||
      event.userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      event.userEmail.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [events, searchTerm]);

  if (loading && events.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Audit Trail</h1>
          <p className="text-gray-600">View and analyze system audit events</p>
        </div>
        <div className="flex items-center space-x-3">
          <div className="flex bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setViewMode('table')}
              className={`px-3 py-1 rounded-md text-sm font-medium ${
                viewMode === 'table'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Table
            </button>
            <button
              onClick={() => setViewMode('timeline')}
              className={`px-3 py-1 rounded-md text-sm font-medium ${
                viewMode === 'timeline'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Timeline
            </button>
          </div>
          <Button
            variant="outline"
            onClick={() => {
              setShowExportModal(true);
              logButtonClick('open_audit_export_modal');
            }}
            className="flex items-center space-x-2"
          >
            <Download className="w-4 h-4" />
            <span>Export</span>
          </Button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex">
            <XCircle className="h-5 w-5 text-red-400" />
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Error</h3>
              <p className="text-sm text-red-700 mt-1">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Search and Filters */}
      <Card className="p-4">
        <div className="flex items-center space-x-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search events, users, resources..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md text-sm"
            />
          </div>
          <Button
            variant="outline"
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center space-x-2"
          >
            <Filter className="w-4 h-4" />
            <span>Filters</span>
          </Button>
        </div>

        {showFilters && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                <input
                  type="datetime-local"
                  value={filters.startDate?.toISOString().slice(0, 16)}
                  onChange={(e) => handleFilterChange('startDate', new Date(e.target.value))}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                <input
                  type="datetime-local"
                  value={filters.endDate?.toISOString().slice(0, 16)}
                  onChange={(e) => handleFilterChange('endDate', new Date(e.target.value))}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                <select
                  value={filters.categories?.[0] || ''}
                  onChange={(e) => handleFilterChange('categories', e.target.value ? [e.target.value as AuditCategory] : undefined)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                >
                  <option value="">All Categories</option>
                  {Object.values(AuditCategory).map(category => (
                    <option key={category} value={category}>
                      {category.replace(/_/g, ' ')}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Severity</label>
                <select
                  value={filters.severities?.[0] || ''}
                  onChange={(e) => handleFilterChange('severities', e.target.value ? [e.target.value as AuditSeverity] : undefined)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                >
                  <option value="">All Severities</option>
                  {Object.values(AuditSeverity).map(severity => (
                    <option key={severity} value={severity}>
                      {severity}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        )}
      </Card>

      {/* Results Summary */}
      <div className="flex items-center justify-between text-sm text-gray-600">
        <span>
          Showing {((currentPage - 1) * pageSize) + 1} to {Math.min(currentPage * pageSize, totalCount)} of {totalCount} events
        </span>
        {loading && <span>Loading...</span>}
      </div>

      {/* Content */}
      {viewMode === 'table' ? (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Event
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    User
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Resource
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Category
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Timestamp
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="relative px-6 py-3">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredEvents.map((event) => (
                  <tr key={event.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        {getSeverityIcon(event.severity)}
                        <div className="ml-3">
                          <div className="text-sm font-medium text-gray-900">
                            {event.action.replace(/_/g, ' ')}
                          </div>
                          <div className="text-sm text-gray-500">
                            {event.eventType.replace(/_/g, ' ')}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <User className="w-4 h-4 text-gray-400 mr-2" />
                        <div>
                          <div className="text-sm font-medium text-gray-900">{event.userName}</div>
                          <div className="text-sm text-gray-500">{event.userEmail}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{event.resource}</div>
                      {event.resourceId && (
                        <div className="text-sm text-gray-500">{event.resourceId}</div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getCategoryColor(event.category)}`}>
                        {event.category.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(event.timestamp).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        {getOutcomeIcon(event.outcome)}
                        <span className="ml-1 text-sm text-gray-900">{event.outcome}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => setSelectedEvent(event)}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200">
              <div className="flex-1 flex justify-between sm:hidden">
                <Button
                  variant="outline"
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                >
                  Next
                </Button>
              </div>
              <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm text-gray-700">
                    Page <span className="font-medium">{currentPage}</span> of{' '}
                    <span className="font-medium">{totalPages}</span>
                  </p>
                </div>
                <div>
                  <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                    <Button
                      variant="outline"
                      onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                      disabled={currentPage === 1}
                      className="rounded-r-none"
                    >
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                      disabled={currentPage === totalPages}
                      className="rounded-l-none"
                    >
                      Next
                    </Button>
                  </nav>
                </div>
              </div>
            </div>
          )}
        </Card>
      ) : (
        <AuditTimelineView 
          events={filteredEvents}
          onEventSelect={setSelectedEvent}
        />
      )}

      {/* Event Details Modal */}
      {selectedEvent && (
        <AuditEventDetails
          event={selectedEvent}
          onClose={() => setSelectedEvent(null)}
        />
      )}

      {/* Export Modal */}
      {showExportModal && (
        <AuditExportModal
          filters={filters}
          onExport={handleExport}
          onClose={() => setShowExportModal(false)}
        />
      )}
    </div>
  );
};

export default AuditTrailVisualization;