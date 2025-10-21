import React, { useState, useEffect } from 'react';
import { 
  Calendar, 
  Clock, 
  Bell, 
  Archive, 
  AlertTriangle, 
  CheckCircle,
  Users,
  Settings,
  Trash2,
  RefreshCw,
  Eye,
  Edit
} from 'lucide-react';
import { 
  Document, 
  DocumentLifecycle, 
  ReviewSchedule, 
  LifecycleNotification 
} from '../../types/document-management';
import { documentManagementService } from '../../services/documentManagementService';

interface DocumentLifecycleManagerProps {
  document: Document;
  onLifecycleUpdate?: () => void;
}

export const DocumentLifecycleManager: React.FC<DocumentLifecycleManagerProps> = ({
  document,
  onLifecycleUpdate
}) => {
  const [lifecycle, setLifecycle] = useState<DocumentLifecycle | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [showRetentionModal, setShowRetentionModal] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<ReviewSchedule | null>(null);

  useEffect(() => {
    loadLifecycle();
  }, [document.id]);

  const loadLifecycle = async () => {
    try {
      setLoading(true);
      const lifecycleData = await documentManagementService.getDocumentLifecycle(document.id);
      setLifecycle(lifecycleData);
    } catch (err) {
      // If no lifecycle exists, create a default one
      const defaultLifecycle: Partial<DocumentLifecycle> = {
        documentId: document.id,
        reviewSchedule: {
          frequency: 'annually',
          nextReviewDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year from now
          assignedReviewers: [],
          reminderDays: [30, 7, 1]
        },
        retentionPeriod: 2555, // 7 years in days
        isArchived: false,
        notifications: []
      };
      setLifecycle(defaultLifecycle as DocumentLifecycle);
    } finally {
      setLoading(false);
    }
  };

  const updateLifecycle = async (updates: Partial<DocumentLifecycle>) => {
    try {
      setSaving(true);
      setError(null);
      
      const updatedLifecycle = await documentManagementService.updateDocumentLifecycle(
        document.id,
        updates
      );
      
      setLifecycle(updatedLifecycle);
      setSuccess('Lifecycle settings updated successfully');
      onLifecycleUpdate?.();
    } catch (err) {
      setError('Failed to update lifecycle settings');
      console.error('Error updating lifecycle:', err);
    } finally {
      setSaving(false);
    }
  };

  const scheduleReview = async (reviewDate: Date, reviewers: string[]) => {
    try {
      await documentManagementService.scheduleReview(document.id, reviewDate, reviewers);
      await loadLifecycle();
      setSuccess('Review scheduled successfully');
      setShowScheduleModal(false);
    } catch (err) {
      setError('Failed to schedule review');
      console.error('Error scheduling review:', err);
    }
  };

  const archiveDocument = async () => {
    if (window.confirm('Are you sure you want to archive this document? It will no longer be accessible for regular use.')) {
      try {
        await documentManagementService.archiveDocument(document.id);
        await loadLifecycle();
        setSuccess('Document archived successfully');
        onLifecycleUpdate?.();
      } catch (err) {
        setError('Failed to archive document');
        console.error('Error archiving document:', err);
      }
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'current':
        return 'bg-green-100 text-green-800';
      case 'review_due':
        return 'bg-yellow-100 text-yellow-800';
      case 'overdue':
        return 'bg-red-100 text-red-800';
      case 'archived':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-blue-100 text-blue-800';
    }
  };

  const getDocumentStatus = () => {
    if (!lifecycle) return 'unknown';
    
    if (lifecycle.isArchived) return 'archived';
    
    const now = new Date();
    const reviewDate = new Date(lifecycle.reviewSchedule.nextReviewDate);
    
    if (reviewDate < now) return 'overdue';
    
    const daysUntilReview = Math.ceil((reviewDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    if (daysUntilReview <= 30) return 'review_due';
    
    return 'current';
  };

  const getDaysUntilReview = () => {
    if (!lifecycle) return 0;
    
    const now = new Date();
    const reviewDate = new Date(lifecycle.reviewSchedule.nextReviewDate);
    return Math.ceil((reviewDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  };

  const getDaysUntilExpiration = () => {
    if (!lifecycle || !lifecycle.expirationDate) return null;
    
    const now = new Date();
    const expirationDate = new Date(lifecycle.expirationDate);
    return Math.ceil((expirationDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!lifecycle) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-md p-4">
        <p className="text-sm text-red-700">Failed to load document lifecycle information.</p>
      </div>
    );
  }

  const documentStatus = getDocumentStatus();
  const daysUntilReview = getDaysUntilReview();
  const daysUntilExpiration = getDaysUntilExpiration();

  return (
    <div className="space-y-6">
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex">
            <AlertTriangle className="h-5 w-5 text-red-400" />
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Error</h3>
              <p className="mt-1 text-sm text-red-700">{error}</p>
            </div>
          </div>
        </div>
      )}

      {success && (
        <div className="bg-green-50 border border-green-200 rounded-md p-4">
          <div className="flex">
            <CheckCircle className="h-5 w-5 text-green-400" />
            <div className="ml-3">
              <h3 className="text-sm font-medium text-green-800">Success</h3>
              <p className="mt-1 text-sm text-green-700">{success}</p>
            </div>
          </div>
        </div>
      )}

      {/* Document Status Overview */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-medium text-gray-900">Document Lifecycle Status</h3>
            <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(documentStatus)}`}>
              {documentStatus === 'current' && <CheckCircle className="w-4 h-4 mr-1" />}
              {documentStatus === 'review_due' && <Clock className="w-4 h-4 mr-1" />}
              {documentStatus === 'overdue' && <AlertTriangle className="w-4 h-4 mr-1" />}
              {documentStatus === 'archived' && <Archive className="w-4 h-4 mr-1" />}
              {documentStatus.replace('_', ' ').toUpperCase()}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Review Status */}
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center mb-2">
                <Calendar className="w-5 h-5 text-blue-500 mr-2" />
                <h4 className="text-sm font-medium text-gray-900">Next Review</h4>
              </div>
              <p className="text-lg font-semibold text-gray-900">
                {new Date(lifecycle.reviewSchedule.nextReviewDate).toLocaleDateString()}
              </p>
              <p className="text-sm text-gray-600">
                {daysUntilReview > 0 
                  ? `${daysUntilReview} days remaining`
                  : `${Math.abs(daysUntilReview)} days overdue`
                }
              </p>
            </div>

            {/* Expiration Status */}
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center mb-2">
                <Clock className="w-5 h-5 text-orange-500 mr-2" />
                <h4 className="text-sm font-medium text-gray-900">Expiration</h4>
              </div>
              {lifecycle.expirationDate ? (
                <>
                  <p className="text-lg font-semibold text-gray-900">
                    {new Date(lifecycle.expirationDate).toLocaleDateString()}
                  </p>
                  <p className="text-sm text-gray-600">
                    {daysUntilExpiration !== null && daysUntilExpiration > 0 
                      ? `${daysUntilExpiration} days remaining`
                      : daysUntilExpiration !== null
                      ? `Expired ${Math.abs(daysUntilExpiration)} days ago`
                      : 'Expired'
                    }
                  </p>
                </>
              ) : (
                <p className="text-sm text-gray-500">No expiration date set</p>
              )}
            </div>

            {/* Archive Status */}
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center mb-2">
                <Archive className="w-5 h-5 text-gray-500 mr-2" />
                <h4 className="text-sm font-medium text-gray-900">Archive Status</h4>
              </div>
              {lifecycle.isArchived ? (
                <>
                  <p className="text-lg font-semibold text-gray-900">Archived</p>
                  {lifecycle.archiveDate && (
                    <p className="text-sm text-gray-600">
                      {new Date(lifecycle.archiveDate).toLocaleDateString()}
                    </p>
                  )}
                </>
              ) : (
                <p className="text-sm text-gray-500">Active document</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Review Schedule */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900">Review Schedule</h3>
            <button
              onClick={() => setShowScheduleModal(true)}
              className="inline-flex items-center px-3 py-1.5 border border-gray-300 shadow-sm text-sm font-medium rounded text-gray-700 bg-white hover:bg-gray-50"
            >
              <Edit className="w-4 h-4 mr-1" />
              Edit Schedule
            </button>
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Frequency</label>
                <p className="mt-1 text-sm text-gray-900 capitalize">
                  {lifecycle.reviewSchedule.frequency}
                  {lifecycle.reviewSchedule.interval && ` (every ${lifecycle.reviewSchedule.interval})`}
                </p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">Next Review Date</label>
                <p className="mt-1 text-sm text-gray-900">
                  {new Date(lifecycle.reviewSchedule.nextReviewDate).toLocaleDateString()}
                </p>
              </div>
            </div>

            {lifecycle.reviewSchedule.assignedReviewers.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Assigned Reviewers</label>
                <div className="flex flex-wrap gap-2">
                  {lifecycle.reviewSchedule.assignedReviewers.map((reviewer, index) => (
                    <span key={index} className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      <Users className="w-3 h-3 mr-1" />
                      {reviewer}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Reminder Schedule</label>
              <div className="flex flex-wrap gap-2">
                {lifecycle.reviewSchedule.reminderDays.map((days, index) => (
                  <span key={index} className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                    <Bell className="w-3 h-3 mr-1" />
                    {days} day{days !== 1 ? 's' : ''} before
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Retention Policy */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900">Retention Policy</h3>
            <button
              onClick={() => setShowRetentionModal(true)}
              className="inline-flex items-center px-3 py-1.5 border border-gray-300 shadow-sm text-sm font-medium rounded text-gray-700 bg-white hover:bg-gray-50"
            >
              <Settings className="w-4 h-4 mr-1" />
              Configure
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Retention Period</label>
              <p className="mt-1 text-sm text-gray-900">
                {Math.floor(lifecycle.retentionPeriod / 365)} years ({lifecycle.retentionPeriod} days)
              </p>
            </div>
            
            {lifecycle.expirationDate && (
              <div>
                <label className="block text-sm font-medium text-gray-700">Expiration Date</label>
                <p className="mt-1 text-sm text-gray-900">
                  {new Date(lifecycle.expirationDate).toLocaleDateString()}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Notifications */}
      {lifecycle.notifications && lifecycle.notifications.length > 0 && (
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Upcoming Notifications</h3>
            
            <div className="space-y-3">
              {lifecycle.notifications
                .filter(notification => !notification.sentDate)
                .sort((a, b) => new Date(a.scheduledDate).getTime() - new Date(b.scheduledDate).getTime())
                .map((notification) => (
                  <div key={notification.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center">
                      <Bell className="w-4 h-4 text-blue-500 mr-3" />
                      <div>
                        <p className="text-sm font-medium text-gray-900">{notification.type.replace('_', ' ')}</p>
                        <p className="text-xs text-gray-600">{notification.message}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-900">
                        {new Date(notification.scheduledDate).toLocaleDateString()}
                      </p>
                      <p className="text-xs text-gray-500">
                        {notification.recipients.length} recipient{notification.recipients.length !== 1 ? 's' : ''}
                      </p>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}

      {/* Actions */}
      {!lifecycle.isArchived && (
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Lifecycle Actions</h3>
            
            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => scheduleReview(
                  new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 1 week from now
                  lifecycle.reviewSchedule.assignedReviewers
                )}
                className="inline-flex items-center px-3 py-2 border border-blue-300 text-sm font-medium rounded text-blue-700 bg-blue-50 hover:bg-blue-100"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Schedule Immediate Review
              </button>
              
              <button
                onClick={archiveDocument}
                className="inline-flex items-center px-3 py-2 border border-gray-300 text-sm font-medium rounded text-gray-700 bg-white hover:bg-gray-50"
              >
                <Archive className="w-4 h-4 mr-2" />
                Archive Document
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Schedule Review Modal */}
      {showScheduleModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Edit Review Schedule
              </h3>
              
              {/* Schedule form would go here */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Review Frequency
                  </label>
                  <select className="w-full border border-gray-300 rounded-md px-3 py-2">
                    <option value="monthly">Monthly</option>
                    <option value="quarterly">Quarterly</option>
                    <option value="annually">Annually</option>
                    <option value="custom">Custom</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Next Review Date
                  </label>
                  <input
                    type="date"
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => setShowScheduleModal(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    // Handle save
                    setShowScheduleModal(false);
                  }}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md"
                >
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};