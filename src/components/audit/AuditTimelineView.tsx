import React, { useMemo } from 'react';
import { 
  User, 
  Calendar, 
  AlertCircle, 
  CheckCircle, 
  XCircle, 
  Clock,
  Activity
} from 'lucide-react';
import { Card } from '../ui/Card';
import { AuditEvent, AuditSeverity, AuditOutcome } from '../../types/audit';

interface AuditTimelineViewProps {
  events: AuditEvent[];
  onEventSelect: (event: AuditEvent) => void;
}

const AuditTimelineView: React.FC<AuditTimelineViewProps> = ({ events, onEventSelect }) => {
  // Group events by date
  const groupedEvents = useMemo(() => {
    const groups: Record<string, AuditEvent[]> = {};
    
    events.forEach(event => {
      const date = new Date(event.timestamp).toDateString();
      if (!groups[date]) {
        groups[date] = [];
      }
      groups[date].push(event);
    });

    // Sort events within each group by timestamp (newest first)
    Object.keys(groups).forEach(date => {
      groups[date].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    });

    return groups;
  }, [events]);

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

  const getSeverityColor = (severity: AuditSeverity) => {
    switch (severity) {
      case AuditSeverity.CRITICAL:
        return 'border-red-500 bg-red-50';
      case AuditSeverity.HIGH:
        return 'border-orange-500 bg-orange-50';
      case AuditSeverity.MEDIUM:
        return 'border-yellow-500 bg-yellow-50';
      default:
        return 'border-blue-500 bg-blue-50';
    }
  };

  const formatTime = (timestamp: Date) => {
    return new Date(timestamp).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit',
      second: '2-digit'
    });
  };

  if (events.length === 0) {
    return (
      <Card className="p-12 text-center">
        <Activity className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">No audit events found</h3>
        <p className="text-gray-500">No events match your current filters.</p>
      </Card>
    );
  }

  return (
    <div className="space-y-8">
      {Object.entries(groupedEvents)
        .sort(([a], [b]) => new Date(b).getTime() - new Date(a).getTime())
        .map(([date, dayEvents]) => (
          <div key={date} className="relative">
            {/* Date Header */}
            <div className="sticky top-0 z-10 bg-white border-b border-gray-200 pb-2 mb-4">
              <div className="flex items-center space-x-2">
                <Calendar className="w-5 h-5 text-gray-400" />
                <h3 className="text-lg font-medium text-gray-900">
                  {new Date(date).toLocaleDateString([], { 
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </h3>
                <span className="text-sm text-gray-500">({dayEvents.length} events)</span>
              </div>
            </div>

            {/* Timeline */}
            <div className="relative">
              {/* Timeline line */}
              <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-gray-200"></div>

              {/* Events */}
              <div className="space-y-4">
                {dayEvents.map((event, index) => (
                  <div key={event.id} className="relative flex items-start space-x-4">
                    {/* Timeline dot */}
                    <div className={`relative z-10 flex items-center justify-center w-8 h-8 rounded-full border-2 ${getSeverityColor(event.severity)}`}>
                      {getSeverityIcon(event.severity)}
                    </div>

                    {/* Event card */}
                    <Card 
                      className="flex-1 p-4 cursor-pointer hover:shadow-md transition-shadow"
                      onClick={() => onEventSelect(event)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          {/* Event header */}
                          <div className="flex items-center space-x-2 mb-2">
                            <span className="text-sm font-medium text-gray-900">
                              {formatTime(event.timestamp)}
                            </span>
                            <span className="text-xs text-gray-500">•</span>
                            <span className="text-sm text-gray-600">
                              {event.action.replace(/_/g, ' ')}
                            </span>
                            {getOutcomeIcon(event.outcome)}
                          </div>

                          {/* Event details */}
                          <div className="space-y-1">
                            <div className="flex items-center space-x-2 text-sm text-gray-600">
                              <User className="w-3 h-3" />
                              <span>{event.userName}</span>
                              <span className="text-gray-400">•</span>
                              <span>{event.resource}</span>
                            </div>
                            
                            {event.resourceId && (
                              <div className="text-xs text-gray-500">
                                Resource ID: {event.resourceId}
                              </div>
                            )}

                            {/* Event description from details */}
                            {event.details && Object.keys(event.details).length > 0 && (
                              <div className="text-sm text-gray-600 mt-2">
                                {Object.entries(event.details)
                                  .slice(0, 2)
                                  .map(([key, value]) => (
                                    <div key={key} className="truncate">
                                      <span className="font-medium">{key}:</span> {String(value)}
                                    </div>
                                  ))
                                }
                                {Object.keys(event.details).length > 2 && (
                                  <div className="text-xs text-gray-400">
                                    +{Object.keys(event.details).length - 2} more details
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Severity badge */}
                        <div className="flex flex-col items-end space-y-1">
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                            event.severity === AuditSeverity.CRITICAL ? 'bg-red-100 text-red-800' :
                            event.severity === AuditSeverity.HIGH ? 'bg-orange-100 text-orange-800' :
                            event.severity === AuditSeverity.MEDIUM ? 'bg-yellow-100 text-yellow-800' :
                            'bg-blue-100 text-blue-800'
                          }`}>
                            {event.severity}
                          </span>
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                            event.outcome === AuditOutcome.SUCCESS ? 'bg-green-100 text-green-800' :
                            event.outcome === AuditOutcome.FAILURE ? 'bg-red-100 text-red-800' :
                            event.outcome === AuditOutcome.DENIED ? 'bg-orange-100 text-orange-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {event.outcome}
                          </span>
                        </div>
                      </div>

                      {/* Category and type */}
                      <div className="flex items-center space-x-4 mt-3 pt-3 border-t border-gray-100">
                        <span className="text-xs text-gray-500">
                          Category: {event.category.replace(/_/g, ' ')}
                        </span>
                        <span className="text-xs text-gray-500">
                          Type: {event.eventType.replace(/_/g, ' ')}
                        </span>
                        {event.ipAddress && (
                          <span className="text-xs text-gray-500">
                            IP: {event.ipAddress}
                          </span>
                        )}
                      </div>
                    </Card>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
    </div>
  );
};

export default AuditTimelineView;