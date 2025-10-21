import React, { useState, useEffect } from 'react';
import { Clock, Send, CheckCircle, AlertTriangle, FileText, Calendar } from 'lucide-react';
import { RegulatoryNotification, BreachNotificationTemplate } from '../../types/breach-management';
import { breachManagementService } from '../../services/breachManagementService';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';

interface RegulatoryNotificationManagerProps {
  breachId: string;
}

export const RegulatoryNotificationManager: React.FC<RegulatoryNotificationManagerProps> = ({
  breachId
}) => {
  const [notifications, setNotifications] = useState<RegulatoryNotification[]>([]);
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
        breachManagementService.getNotificationTemplates('regulatory')
      ]);
      setNotifications(breach.regulatoryNotifications || []);
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
      const notification = await breachManagementService.generateRegulatoryNotification(
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
      await breachManagementService.sendRegulatoryNotification(breachId, notificationId);
      setNotifications(prev => prev.map(notification =>
        notification.id === notificationId
          ? { ...notification, status: 'sent', sentAt: new Date() }
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
      case 'sent': return 'text-green-600 bg-green-50';
      case 'acknowledged': return 'text-blue-600 bg-blue-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const getUrgencyColor = (deadline: Date) => {
    const now = new Date();
    const hoursUntilDeadline = (deadline.getTime() - now.getTime()) / (1000 * 60 * 60);
    
    if (hoursUntilDeadline < 0) return 'text-red-600 bg-red-50';
    if (hoursUntilDeadline < 24) return 'text-orange-600 bg-orange-50';
    if (hoursUntilDeadline < 72) return 'text-yellow-600 bg-yellow-50';
    return 'text-green-600 bg-green-50';
  };

  const formatTimeRemaining = (deadline: Date) => {
    const now = new Date();
    const hoursUntilDeadline = (deadline.getTime() - now.getTime()) / (1000 * 60 * 60);
    
    if (hoursUntilDeadline < 0) {
      return `Overdue by ${Math.abs(Math.round(hoursUntilDeadline))}h`;
    }
    
    if (hoursUntilDeadline < 24) {
      return `${Math.round(hoursUntilDeadline)}h remaining`;
    }
    
    const daysRemaining = Math.round(hoursUntilDeadline / 24);
    return `${daysRemaining}d remaining`;
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
          <h3 className="text-lg font-semibold text-gray-900">Regulatory Notifications</h3>
          <p className="text-gray-600">Manage notifications to regulatory authorities</p>
        </div>
        <Button onClick={() => setShowTemplateModal(true)} className="flex items-center gap-2">
          <FileText className="h-4 w-4" />
          Generate Notification
        </Button>
      </div>

      {/* 72-Hour Compliance Alert */}
      <Card className="p-4 border-orange-200 bg-orange-50">
        <div className="flex items-center gap-3">
          <Clock className="h-5 w-5 text-orange-600" />
          <div>
            <h4 className="font-medium text-orange-900">72-Hour Notification Requirement</h4>
            <p className="text-sm text-orange-700">
              GDPR requires notification to supervisory authorities within 72 hours of becoming aware of the breach
            </p>
          </div>
        </div>
      </Card>

      {/* Notifications List */}
      <div className="space-y-4">
        {notifications.length === 0 ? (
          <Card className="p-8 text-center">
            <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Regulatory Notifications</h3>
            <p className="text-gray-600 mb-4">Generate notifications to regulatory authorities</p>
            <Button onClick={() => setShowTemplateModal(true)}>
              Generate First Notification
            </Button>
          </Card>
        ) : (
          notifications.map((notification) => (
            <Card key={notification.id} className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h4 className="font-semibold text-gray-900">{notification.authority}</h4>
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(notification.status)}`}>
                      {notification.status.replace('_', ' ').toUpperCase()}
                    </span>
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${getUrgencyColor(notification.notificationDeadline)}`}>
                      {formatTimeRemaining(notification.notificationDeadline)}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-600 mb-4">
                    <div>
                      <span className="font-medium">Jurisdiction:</span> {notification.jurisdiction}
                    </div>
                    <div>
                      <span className="font-medium">Framework:</span> {notification.regulatoryFramework}
                    </div>
                    <div>
                      <span className="font-medium">Deadline:</span> {new Date(notification.notificationDeadline).toLocaleString()}
                    </div>
                    <div>
                      <span className="font-medium">Reference:</span> {notification.referenceNumber || 'Pending'}
                    </div>
                  </div>

                  {notification.sentAt && (
                    <div className="text-sm text-gray-600 mb-2">
                      <span className="font-medium">Sent:</span> {new Date(notification.sentAt).toLocaleString()}
                    </div>
                  )}

                  {notification.acknowledgedAt && (
                    <div className="text-sm text-gray-600 mb-2">
                      <span className="font-medium">Acknowledged:</span> {new Date(notification.acknowledgedAt).toLocaleString()}
                    </div>
                  )}

                  {notification.followUpRequired && (
                    <div className="flex items-center gap-2 mt-2 p-2 bg-yellow-50 rounded">
                      <AlertTriangle className="h-4 w-4 text-yellow-600" />
                      <span className="text-sm text-yellow-800">
                        Follow-up required by {notification.followUpDate ? new Date(notification.followUpDate).toLocaleDateString() : 'TBD'}
                      </span>
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
                    View Details
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
                      {template.jurisdiction} • {template.regulatoryFramework} • {template.language}
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
                Generate Notification
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Compliance Summary */}
      <Card className="p-6 bg-blue-50 border-blue-200">
        <div className="flex items-center gap-3 mb-3">
          <Calendar className="h-5 w-5 text-blue-600" />
          <h4 className="font-medium text-blue-900">Compliance Summary</h4>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div>
            <span className="font-medium text-blue-800">Total Notifications:</span>
            <span className="ml-2 text-blue-700">{notifications.length}</span>
          </div>
          <div>
            <span className="font-medium text-blue-800">Sent:</span>
            <span className="ml-2 text-blue-700">
              {notifications.filter(n => n.status === 'sent' || n.status === 'acknowledged').length}
            </span>
          </div>
          <div>
            <span className="font-medium text-blue-800">Pending:</span>
            <span className="ml-2 text-blue-700">
              {notifications.filter(n => n.status === 'draft' || n.status === 'pending_approval').length}
            </span>
          </div>
        </div>
      </Card>
    </div>
  );
};