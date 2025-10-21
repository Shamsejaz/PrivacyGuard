import React, { useState, useEffect } from 'react';
import { Users, Mail, Globe, BarChart3, Send, CheckCircle, AlertTriangle } from 'lucide-react';
import { DataSubjectNotification, BreachNotificationTemplate } from '../../types/breach-management';
import { breachManagementService } from '../../services/breachManagementService';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';

interface DataSubjectNotificationManagerProps {
  breachId: string;
}

export const DataSubjectNotificationManager: React.FC<DataSubjectNotificationManagerProps> = ({
  breachId
}) => {
  const [notifications, setNotifications] = useState<DataSubjectNotification[]>([]);
  const [templates, setTemplates] = useState<BreachNotificationTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');

  useEffect(() => {
    loadNotificationData();
  }, [breachId]);

  const loadNotificationData = async () => {
    try {
      setLoading(true);
      const [breach, templatesData] = await Promise.all([
        breachManagementService.getBreach(breachId),
        breachManagementService.getNotificationTemplates('data_subject')
      ]);
      setNotifications(breach.dataSubjectNotifications || []);
      setTemplates(templatesData);
    } catch (error) {
      console.error('Failed to load notification data:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateNotification = async () => {
    if (!selectedTemplate) return;

    try {
      const notification = await breachManagementService.generateDataSubjectNotification(
        breachId,
        selectedTemplate
      );
      setNotifications(prev => [...prev, notification]);
      setShowTemplateModal(false);
      setSelectedTemplate('');
    } catch (error) {
      console.error('Failed to generate notification:', error);
    }
  };

  const sendNotification = async (notificationId: string) => {
    try {
      await breachManagementService.sendDataSubjectNotification(breachId, notificationId);
      setNotifications(prev => prev.map(notification =>
        notification.id === notificationId
          ? { ...notification, status: 'sending', sentAt: new Date() }
          : notification
      ));
    } catch (error) {
      console.error('Failed to send notification:', error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft': return 'text-gray-600 bg-gray-50';
      case 'pending_approval': return 'text-yellow-600 bg-yellow-50';
      case 'sending': return 'text-blue-600 bg-blue-50';
      case 'sent': return 'text-green-600 bg-green-50';
      case 'failed': return 'text-red-600 bg-red-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const getMethodIcon = (method: string) => {
    switch (method) {
      case 'email': return <Mail className="h-4 w-4" />;
      case 'postal': return <Mail className="h-4 w-4" />;
      case 'website': return <Globe className="h-4 w-4" />;
      case 'media': return <Globe className="h-4 w-4" />;
      case 'direct': return <Users className="h-4 w-4" />;
      default: return <Mail className="h-4 w-4" />;
    }
  };

  if (loading) {
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
          <h3 className="text-lg font-semibold text-gray-900">Data Subject Notifications</h3>
          <p className="text-gray-600">Notify affected individuals about the breach</p>
        </div>
        <Button onClick={() => setShowTemplateModal(true)} className="flex items-center gap-2">
          <Users className="h-4 w-4" />
          Create Notification
        </Button>
      </div>

      {/* Risk Assessment Alert */}
      <Card className="p-4 border-blue-200 bg-blue-50">
        <div className="flex items-center gap-3">
          <AlertTriangle className="h-5 w-5 text-blue-600" />
          <div>
            <h4 className="font-medium text-blue-900">Data Subject Notification Requirements</h4>
            <p className="text-sm text-blue-700">
              Notification required when breach is likely to result in high risk to rights and freedoms of individuals
            </p>
          </div>
        </div>
      </Card>

      {/* Notifications List */}
      <div className="space-y-4">
        {notifications.length === 0 ? (
          <Card className="p-8 text-center">
            <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Data Subject Notifications</h3>
            <p className="text-gray-600 mb-4">Create notifications for affected individuals</p>
            <Button onClick={() => setShowTemplateModal(true)}>
              Create First Notification
            </Button>
          </Card>
        ) : (
          notifications.map((notification) => (
            <Card key={notification.id} className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="flex items-center gap-2">
                      {getMethodIcon(notification.notificationMethod)}
                      <h4 className="font-semibold text-gray-900 capitalize">
                        {notification.notificationMethod} Notification
                      </h4>
                    </div>
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(notification.status)}`}>
                      {notification.status.replace('_', ' ').toUpperCase()}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-600 mb-4">
                    <div>
                      <span className="font-medium">Recipients:</span> {notification.recipientCount.toLocaleString()}
                    </div>
                    <div>
                      <span className="font-medium">Method:</span> {notification.notificationMethod}
                    </div>
                    {notification.scheduledAt && (
                      <div>
                        <span className="font-medium">Scheduled:</span> {new Date(notification.scheduledAt).toLocaleString()}
                      </div>
                    )}
                    {notification.sentAt && (
                      <div>
                        <span className="font-medium">Sent:</span> {new Date(notification.sentAt).toLocaleString()}
                      </div>
                    )}
                  </div>

                  {/* Delivery Metrics */}
                  {notification.status === 'sent' && (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-3 bg-gray-50 rounded-lg">
                      <div className="text-center">
                        <div className="text-lg font-semibold text-gray-900">
                          {notification.deliveryRate ? `${Math.round(notification.deliveryRate * 100)}%` : 'N/A'}
                        </div>
                        <div className="text-xs text-gray-600">Delivery Rate</div>
                      </div>
                      <div className="text-center">
                        <div className="text-lg font-semibold text-gray-900">
                          {notification.responseRate ? `${Math.round(notification.responseRate * 100)}%` : 'N/A'}
                        </div>
                        <div className="text-xs text-gray-600">Response Rate</div>
                      </div>
                      <div className="text-center">
                        <div className="text-lg font-semibold text-gray-900">
                          {notification.deliveryRate ? Math.round(notification.recipientCount * notification.deliveryRate) : 'N/A'}
                        </div>
                        <div className="text-xs text-gray-600">Delivered</div>
                      </div>
                      <div className="text-center">
                        <div className="text-lg font-semibold text-gray-900">
                          {notification.responseRate ? Math.round(notification.recipientCount * notification.responseRate) : 'N/A'}
                        </div>
                        <div className="text-xs text-gray-600">Responses</div>
                      </div>
                    </div>
                  )}

                  {/* Progress Bar for Sending */}
                  {notification.status === 'sending' && (
                    <div className="mt-3">
                      <div className="flex items-center justify-between text-sm text-gray-600 mb-1">
                        <span>Sending notifications...</span>
                        <span>75%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div className="bg-blue-600 h-2 rounded-full" style={{ width: '75%' }}></div>
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2 ml-4">
                  {notification.status === 'draft' && (
                    <Button
                      size="sm"
                      onClick={() => sendNotification(notification.id)}
                      className="flex items-center gap-1"
                    >
                      <Send className="h-3 w-3" />
                      Send
                    </Button>
                  )}

                  {notification.status === 'sent' && (
                    <div className="flex items-center gap-1 text-green-600">
                      <CheckCircle className="h-4 w-4" />
                      <span className="text-sm">Sent</span>
                    </div>
                  )}

                  <Button variant="outline" size="sm">
                    <BarChart3 className="h-3 w-3 mr-1" />
                    Analytics
                  </Button>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>

      {/* Template Selection Modal */}
      {showTemplateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl">
            <h3 className="text-lg font-semibold mb-4">Select Notification Template</h3>
            
            <div className="space-y-3 mb-6">
              {templates.map((template) => (
                <label
                  key={template.id}
                  className={`flex items-start p-4 border rounded-lg cursor-pointer transition-all ${
                    selectedTemplate === template.id
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="template"
                    value={template.id}
                    checked={selectedTemplate === template.id}
                    onChange={(e) => setSelectedTemplate(e.target.value)}
                    className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                  />
                  <div className="ml-3 flex-1">
                    <div className="font-medium text-gray-900">{template.name}</div>
                    <div className="text-sm text-gray-600 mt-1">
                      {template.jurisdiction} • {template.language}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      Used {template.usageCount} times
                    </div>
                  </div>
                </label>
              ))}
            </div>

            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setShowTemplateModal(false)}>
                Cancel
              </Button>
              <Button 
                onClick={generateNotification}
                disabled={!selectedTemplate}
              >
                Create Notification
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Notification Summary */}
      <Card className="p-6 bg-green-50 border-green-200">
        <div className="flex items-center gap-3 mb-3">
          <BarChart3 className="h-5 w-5 text-green-600" />
          <h4 className="font-medium text-green-900">Notification Summary</h4>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
          <div>
            <span className="font-medium text-green-800">Total Recipients:</span>
            <span className="ml-2 text-green-700">
              {notifications.reduce((sum, n) => sum + n.recipientCount, 0).toLocaleString()}
            </span>
          </div>
          <div>
            <span className="font-medium text-green-800">Notifications Sent:</span>
            <span className="ml-2 text-green-700">
              {notifications.filter(n => n.status === 'sent').length}
            </span>
          </div>
          <div>
            <span className="font-medium text-green-800">Avg Delivery Rate:</span>
            <span className="ml-2 text-green-700">
              {notifications.length > 0 
                ? Math.round(notifications.reduce((sum, n) => sum + (n.deliveryRate || 0), 0) / notifications.length * 100)
                : 0}%
            </span>
          </div>
          <div>
            <span className="font-medium text-green-800">Avg Response Rate:</span>
            <span className="ml-2 text-green-700">
              {notifications.length > 0 
                ? Math.round(notifications.reduce((sum, n) => sum + (n.responseRate || 0), 0) / notifications.length * 100)
                : 0}%
            </span>
          </div>
        </div>
      </Card>
    </div>
  );
};