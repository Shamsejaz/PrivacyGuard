import React from 'react';
import { X, User, Calendar, MapPin, Monitor, Shield, AlertCircle } from 'lucide-react';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { AuditEvent, AuditSeverity, AuditOutcome } from '../../types/audit';

interface AuditEventDetailsProps {
  event: AuditEvent;
  onClose: () => void;
}

const AuditEventDetails: React.FC<AuditEventDetailsProps> = ({ event, onClose }) => {
  const getSeverityColor = (severity: AuditSeverity) => {
    switch (severity) {
      case AuditSeverity.CRITICAL:
        return 'text-red-600 bg-red-100';
      case AuditSeverity.HIGH:
        return 'text-orange-600 bg-orange-100';
      case AuditSeverity.MEDIUM:
        return 'text-yellow-600 bg-yellow-100';
      default:
        return 'text-blue-600 bg-blue-100';
    }
  };

  const getOutcomeColor = (outcome: AuditOutcome) => {
    switch (outcome) {
      case AuditOutcome.SUCCESS:
        return 'text-green-600 bg-green-100';
      case AuditOutcome.FAILURE:
        return 'text-red-600 bg-red-100';
      case AuditOutcome.DENIED:
        return 'text-orange-600 bg-orange-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const formatValue = (value: any): string => {
    if (value === null || value === undefined) return 'N/A';
    if (typeof value === 'object') return JSON.stringify(value, null, 2);
    if (typeof value === 'boolean') return value ? 'Yes' : 'No';
    return String(value);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Audit Event Details</h2>
            <p className="text-sm text-gray-500 mt-1">Event ID: {event.id}</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Basic Information */}
            <Card className="p-4">
              <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                <AlertCircle className="w-5 h-5 mr-2" />
                Event Information
              </h3>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Action</label>
                  <p className="text-sm text-gray-900 mt-1">{event.action.replace(/_/g, ' ')}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Event Type</label>
                  <p className="text-sm text-gray-900 mt-1">{event.eventType.replace(/_/g, ' ')}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Category</label>
                  <p className="text-sm text-gray-900 mt-1">{event.category.replace(/_/g, ' ')}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Severity</label>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getSeverityColor(event.severity)}`}>
                    {event.severity}
                  </span>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Outcome</label>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getOutcomeColor(event.outcome)}`}>
                    {event.outcome}
                  </span>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Timestamp</label>
                  <p className="text-sm text-gray-900 mt-1 flex items-center">
                    <Calendar className="w-4 h-4 mr-1" />
                    {new Date(event.timestamp).toLocaleString()}
                  </p>
                </div>
              </div>
            </Card>

            {/* User Information */}
            <Card className="p-4">
              <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                <User className="w-5 h-5 mr-2" />
                User Information
              </h3>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700">User ID</label>
                  <p className="text-sm text-gray-900 mt-1">{event.userId}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Name</label>
                  <p className="text-sm text-gray-900 mt-1">{event.userName}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Email</label>
                  <p className="text-sm text-gray-900 mt-1">{event.userEmail}</p>
                </div>
                {event.tenantId && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Tenant ID</label>
                    <p className="text-sm text-gray-900 mt-1">{event.tenantId}</p>
                  </div>
                )}
                {event.sessionId && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Session ID</label>
                    <p className="text-sm text-gray-900 mt-1 font-mono text-xs">{event.sessionId}</p>
                  </div>
                )}
              </div>
            </Card>

            {/* Resource Information */}
            <Card className="p-4">
              <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                <Shield className="w-5 h-5 mr-2" />
                Resource Information
              </h3>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Resource</label>
                  <p className="text-sm text-gray-900 mt-1">{event.resource}</p>
                </div>
                {event.resourceId && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Resource ID</label>
                    <p className="text-sm text-gray-900 mt-1">{event.resourceId}</p>
                  </div>
                )}
              </div>
            </Card>

            {/* Technical Information */}
            <Card className="p-4">
              <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                <Monitor className="w-5 h-5 mr-2" />
                Technical Information
              </h3>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700">IP Address</label>
                  <p className="text-sm text-gray-900 mt-1">{event.ipAddress}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">User Agent</label>
                  <p className="text-sm text-gray-900 mt-1 break-all">{event.userAgent}</p>
                </div>
                {event.location && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Location</label>
                    <p className="text-sm text-gray-900 mt-1 flex items-center">
                      <MapPin className="w-4 h-4 mr-1" />
                      {event.location.city && event.location.country 
                        ? `${event.location.city}, ${event.location.country}`
                        : 'Unknown'
                      }
                    </p>
                  </div>
                )}
              </div>
            </Card>
          </div>

          {/* Event Details */}
          {Object.keys(event.details).length > 0 && (
            <Card className="p-4 mt-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Event Details</h3>
              <div className="bg-gray-50 rounded-md p-4">
                <pre className="text-sm text-gray-900 whitespace-pre-wrap overflow-x-auto">
                  {JSON.stringify(event.details, null, 2)}
                </pre>
              </div>
            </Card>
          )}

          {/* Metadata */}
          <Card className="p-4 mt-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Metadata</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Source</label>
                <p className="text-sm text-gray-900 mt-1">{event.metadata.source}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Version</label>
                <p className="text-sm text-gray-900 mt-1">{event.metadata.version}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Environment</label>
                <p className="text-sm text-gray-900 mt-1">{event.metadata.environment}</p>
              </div>
              {event.metadata.correlationId && (
                <div>
                  <label className="block text-sm font-medium text-gray-700">Correlation ID</label>
                  <p className="text-sm text-gray-900 mt-1 font-mono text-xs">{event.metadata.correlationId}</p>
                </div>
              )}
              {event.metadata.requestId && (
                <div>
                  <label className="block text-sm font-medium text-gray-700">Request ID</label>
                  <p className="text-sm text-gray-900 mt-1 font-mono text-xs">{event.metadata.requestId}</p>
                </div>
              )}
              {event.metadata.tags && event.metadata.tags.length > 0 && (
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700">Tags</label>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {event.metadata.tags.map((tag, index) => (
                      <span
                        key={index}
                        className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {event.metadata.customFields && Object.keys(event.metadata.customFields).length > 0 && (
              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Custom Fields</label>
                <div className="bg-gray-50 rounded-md p-4">
                  <div className="space-y-2">
                    {Object.entries(event.metadata.customFields).map(([key, value]) => (
                      <div key={key} className="flex justify-between">
                        <span className="text-sm font-medium text-gray-700">{key}:</span>
                        <span className="text-sm text-gray-900">{formatValue(value)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </Card>
        </div>

        {/* Footer */}
        <div className="flex justify-end p-6 border-t border-gray-200">
          <Button onClick={onClose}>Close</Button>
        </div>
      </div>
    </div>
  );
};

export default AuditEventDetails;