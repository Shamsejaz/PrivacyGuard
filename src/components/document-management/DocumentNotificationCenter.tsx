import React, { useState, useEffect } from 'react';
import { 
  Bell, 
  Calendar, 
  AlertTriangle, 
  Clock, 
  CheckCircle,
  X,
  Eye,
  Archive,
  RefreshCw,
  Filter,
  Search
} from 'lucide-react';
import { 
  Document, 
  LifecycleNotification 
} from '../../types/document-management';
import { documentManagementService } from '../../services/documentManagementService';

interface DocumentNotification extends LifecycleNotification {
  document: Document;
}

interface DocumentNotificationCenterProps {
  onNotificationAction?: (notificationId: string, action: string) => void;
}

export const DocumentNotificationCenter: React.FC<DocumentNotificationCenterProps> = ({
  onNotificationAction
}) => {
  const [notifications, setNotifications] = useState<DocumentNotification[]>([]);
  const [filteredNotifications, setFilteredNotifications] = useState<DocumentNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedType, setSelectedType] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showRead, setShowRead] = useState(false);

  const notificationTypes = [
    { value: 'all', label: 'All Notifications' },
    { value: 'review_due', label: 'Review Due' },
    { value: 'expiring_soon', label: 'Expiring Soon' },
    { value: 'expired', label: 'Expired' },
    { value: 'archive_due', label: 'Archive Due' }
  ];

  useEffect(() => {
    loadNotifications();
  }, []);

  useEffect(() => {
    filterNotifications();
  }, [notifications, selectedType, searchQuery, showRead]);

  const loadNotifications = async () => {
    try {
      setLoading(true);
      // This would typically fetch from an API endpoint that returns notifications with document data
      // For now, we'll simulate this data
      const mockNotifications: DocumentNotification[] = [
        {
          id: '1',
          type: 'review_due',
          scheduledDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          recipients: ['user@example.com'],
          message: 'Document review is due in 7 days',
          document: {
            id: 'doc1',
            title: 'Privacy Policy v2.1',
            type: 'policy',
            category: 'privacy',
            status: 'published',
            version: 2,
            createdAt: new Date('2023-01-01'),
            updatedAt: new Date('2023-06-01'),
            createdBy: 'John Doe',
            lastModifiedBy: 'Jane Smith',
            metadata: {
              author: 'John Doe',
              subject: 'Privacy Policy',
              keywords: ['privacy', 'policy'],
              language: 'en',
              classification: 'public',
              complianceFrameworks: ['GDPR'],
              relatedDocuments: [],
              customFields: {}
            },
            tags: ['privacy', 'policy'],
            permissions: []
          }
        },
        {
          id: '2',
          type: 'expiring_soon',
          scheduledDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
          recipients: ['admin@example.com'],
          message: 'Document expires in 2 days',
          document: {
            id: 'doc2',
            title: 'Data Processing Agreement Template',
            type: 'template',
            category: 'legal',
            status: 'published',
            version: 1,
            createdAt: new Date('2023-03-01'),
            updatedAt: new Date('2023-03-01'),
            createdBy: 'Legal Team',
            lastModifiedBy: 'Legal Team',
            metadata: {
              author: 'Legal Team',
              subject: 'DPA Template',
              keywords: ['dpa', 'template'],
              language: 'en',
              classification: 'internal',
              complianceFrameworks: ['GDPR'],
              relatedDocuments: [],
              customFields: {}
            },
            tags: ['legal', 'template'],
            permissions: []
          }
        }
      ];
      
      setNotifications(mockNotifications);
    } catch (err) {
      setError('Failed to load notifications');
      console.error('Error loading notifications:', err);
    } finally {
      setLoading(false);
    }
  };

  const filterNotifications = () => {
    let filtered = notifications;

    // Filter by type
    if (selectedType !== 'all') {
      filtered = filtered.filter(notification => notification.type === selectedType);
    }

    // Filter by search query
    if (searchQuery) {
      filtered = filtered.filter(notification =>
        notification.document.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        notification.message.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Filter by read status
    if (!showRead) {
      filtered = filtered.filter(notification => !notification.sentDate);
    }

    setFilteredNotifications(filtered);
  };

  const markAsRead = async (notificationId: string) => {
    try {
      // This would typically make an API call to mark the notification as read
      setNotifications(prev => 
        prev.map(notification => 
          notification.id === notificationId 
            ? { ...notification, sentDate: new Date() }
            : notification
        )
      );
      onNotificationAction?.(notificationId, 'mark_read');
    } catch (err) {
      setError('Failed to mark notification as read');
      console.error('Error marking notification as read:', err);
    }
  };

  const dismissNotification = async (notificationId: string) => {
    try {
      setNotifications(prev => prev.filter(notification => notification.id !== notificationId));
      onNotificationAction?.(notificationId, 'dismiss');
    } catch (err) {
      setError('Failed to dismiss notification');
      console.error('Error dismissing notification:', err);
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'review_due':
        return <Calendar className="w-5 h-5 text-blue-500" />;
      case 'expiring_soon':
        return <Clock className="w-5 h-5 text-yellow-500" />;
      case 'expired':
        return <AlertTriangle className="w-5 h-5 text-red-500" />;
      case 'archive_due':
        return <Archive className="w-5 h-5 text-gray-500" />;
      default:
        return <Bell className="w-5 h-5 text-blue-500" />;
    }
  };

  const getNotificationColor = (type: string) => {
    switch (type) {
      case 'review_due':
        return 'border-l-blue-500 bg-blue-50';
      case 'expiring_soon':
        return 'border-l-yellow-500 bg-yellow-50';
      case 'expired':
        return 'border-l-red-500 bg-red-50';
      case 'archive_due':
        return 'border-l-gray-500 bg-gray-50';
      default:
        return 'border-l-blue-500 bg-blue-50';
    }
  };

  const getPriorityLevel = (type: string, scheduledDate: Date) => {
    const now = new Date();
    const daysUntil = Math.ceil((scheduledDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    
    if (type === 'expired' || daysUntil < 0) return 'high';
    if (type === 'expiring_soon' || daysUntil <= 3) return 'medium';
    return 'low';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Document Notifications</h2>
          <p className="text-sm text-gray-600 mt-1">
            {filteredNotifications.length} notification{filteredNotifications.length !== 1 ? 's' : ''}
          </p>
        </div>
        <button
          onClick={loadNotifications}
          className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded text-gray-700 bg-white hover:bg-gray-50"
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white shadow rounded-lg p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search notifications..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <Filter className="w-4 h-4 text-gray-400" />
              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-blue-500 focus:border-blue-500"
              >
                {notificationTypes.map(type => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>
            
            <label className="flex items-center text-sm">
              <input
                type="checkbox"
                checked={showRead}
                onChange={(e) => setShowRead(e.target.checked)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 mr-2"
              />
              Show read
            </label>
          </div>
        </div>
      </div>

      {/* Notifications List */}
      <div className="space-y-4">
        {filteredNotifications.length === 0 ? (
          <div className="text-center py-12 bg-white shadow rounded-lg">
            <Bell className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No notifications</h3>
            <p className="mt-1 text-sm text-gray-500">
              {searchQuery || selectedType !== 'all' 
                ? 'Try adjusting your search or filter criteria.'
                : 'All caught up! No pending notifications.'
              }
            </p>
          </div>
        ) : (
          filteredNotifications
            .sort((a, b) => {
              // Sort by priority first, then by date
              const priorityOrder = { high: 0, medium: 1, low: 2 };
              const aPriority = getPriorityLevel(a.type, a.scheduledDate);
              const bPriority = getPriorityLevel(b.type, b.scheduledDate);
              
              if (aPriority !== bPriority) {
                return priorityOrder[aPriority] - priorityOrder[bPriority];
              }
              
              return new Date(a.scheduledDate).getTime() - new Date(b.scheduledDate).getTime();
            })
            .map((notification) => {
              const priority = getPriorityLevel(notification.type, notification.scheduledDate);
              const isRead = !!notification.sentDate;
              
              return (
                <div
                  key={notification.id}
                  className={`bg-white shadow rounded-lg border-l-4 ${getNotificationColor(notification.type)} ${
                    isRead ? 'opacity-75' : ''
                  }`}
                >
                  <div className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-4 flex-1">
                        <div className="flex-shrink-0">
                          {getNotificationIcon(notification.type)}
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-2 mb-1">
                            <h4 className="text-sm font-medium text-gray-900">
                              {notification.document.title}
                            </h4>
                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                              priority === 'high' ? 'bg-red-100 text-red-800' :
                              priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-green-100 text-green-800'
                            }`}>
                              {priority} priority
                            </span>
                            {isRead && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                                Read
                              </span>
                            )}
                          </div>
                          
                          <p className="text-sm text-gray-600 mb-2">
                            {notification.message}
                          </p>
                          
                          <div className="flex items-center text-xs text-gray-500 space-x-4">
                            <span>
                              Due: {new Date(notification.scheduledDate).toLocaleDateString()}
                            </span>
                            <span>
                              Type: {notification.type.replace('_', ' ')}
                            </span>
                            <span>
                              Category: {notification.document.category}
                            </span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-2 ml-4">
                        <button
                          onClick={() => {/* Handle view document */}}
                          className="p-2 text-gray-400 hover:text-gray-600"
                          title="View Document"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        
                        {!isRead && (
                          <button
                            onClick={() => markAsRead(notification.id)}
                            className="p-2 text-gray-400 hover:text-green-600"
                            title="Mark as Read"
                          >
                            <CheckCircle className="w-4 h-4" />
                          </button>
                        )}
                        
                        <button
                          onClick={() => dismissNotification(notification.id)}
                          className="p-2 text-gray-400 hover:text-red-600"
                          title="Dismiss"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
        )}
      </div>

      {/* Summary Stats */}
      {filteredNotifications.length > 0 && (
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Notification Summary</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {notificationTypes.slice(1).map(type => {
              const count = filteredNotifications.filter(n => n.type === type.value).length;
              return (
                <div key={type.value} className="text-center">
                  <div className="text-2xl font-bold text-gray-900">{count}</div>
                  <div className="text-sm text-gray-500">{type.label}</div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};