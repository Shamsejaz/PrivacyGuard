import React, { useState, useEffect } from 'react';
import { 
  CheckCircle, 
  Clock, 
  Users, 
  Mail, 
  Download, 
  Eye,
  AlertTriangle,
  RefreshCw,
  Filter,
  Search,
  FileSignature
} from 'lucide-react';
import { Document, DigitalSignature } from '../../types/document-management';
import { documentManagementService } from '../../services/documentManagementService';

interface DocumentAcknowledgment {
  id: string;
  documentId: string;
  userId: string;
  userName: string;
  userEmail: string;
  userRole: string;
  acknowledgedAt?: Date;
  viewedAt?: Date;
  downloadedAt?: Date;
  signedAt?: Date;
  digitalSignature?: DigitalSignature;
  status: 'pending' | 'viewed' | 'acknowledged' | 'signed';
  remindersSent: number;
  lastReminderSent?: Date;
  dueDate?: Date;
}

interface DocumentAcknowledgmentTrackerProps {
  document: Document;
  onAcknowledgmentUpdate?: () => void;
}

export const DocumentAcknowledgmentTracker: React.FC<DocumentAcknowledgmentTrackerProps> = ({
  document,
  onAcknowledgmentUpdate
}) => {
  const [acknowledgments, setAcknowledgments] = useState<DocumentAcknowledgment[]>([]);
  const [filteredAcknowledgments, setFilteredAcknowledgments] = useState<DocumentAcknowledgment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showReminderModal, setShowReminderModal] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [reminderMessage, setReminderMessage] = useState('');
  const [sending, setSending] = useState(false);

  const statusOptions = [
    { value: 'all', label: 'All Statuses' },
    { value: 'pending', label: 'Pending' },
    { value: 'viewed', label: 'Viewed' },
    { value: 'acknowledged', label: 'Acknowledged' },
    { value: 'signed', label: 'Signed' }
  ];

  useEffect(() => {
    loadAcknowledgments();
  }, [document.id]);

  useEffect(() => {
    filterAcknowledgments();
  }, [acknowledgments, searchQuery, statusFilter]);

  const loadAcknowledgments = async () => {
    try {
      setLoading(true);
      // This would typically fetch from an API endpoint
      // For now, we'll simulate this data
      const mockAcknowledgments: DocumentAcknowledgment[] = [
        {
          id: '1',
          documentId: document.id,
          userId: 'user1',
          userName: 'John Doe',
          userEmail: 'john@example.com',
          userRole: 'Privacy Officer',
          acknowledgedAt: new Date('2023-12-01'),
          viewedAt: new Date('2023-11-30'),
          status: 'acknowledged',
          remindersSent: 1,
          lastReminderSent: new Date('2023-11-25'),
          dueDate: new Date('2023-12-15')
        },
        {
          id: '2',
          documentId: document.id,
          userId: 'user2',
          userName: 'Jane Smith',
          userEmail: 'jane@example.com',
          userRole: 'Legal Counsel',
          viewedAt: new Date('2023-12-02'),
          status: 'viewed',
          remindersSent: 0,
          dueDate: new Date('2023-12-15')
        },
        {
          id: '3',
          documentId: document.id,
          userId: 'user3',
          userName: 'Bob Johnson',
          userEmail: 'bob@example.com',
          userRole: 'IT Administrator',
          status: 'pending',
          remindersSent: 2,
          lastReminderSent: new Date('2023-12-01'),
          dueDate: new Date('2023-12-15')
        }
      ];
      
      setAcknowledgments(mockAcknowledgments);
    } catch (err) {
      setError('Failed to load acknowledgments');
      console.error('Error loading acknowledgments:', err);
    } finally {
      setLoading(false);
    }
  };

  const filterAcknowledgments = () => {
    let filtered = acknowledgments;

    if (searchQuery) {
      filtered = filtered.filter(ack =>
        ack.userName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        ack.userEmail.toLowerCase().includes(searchQuery.toLowerCase()) ||
        ack.userRole.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(ack => ack.status === statusFilter);
    }

    setFilteredAcknowledgments(filtered);
  };

  const sendReminder = async (userIds: string[]) => {
    try {
      setSending(true);
      // This would typically make an API call to send reminders
      
      // Update acknowledgments to reflect sent reminders
      setAcknowledgments(prev => 
        prev.map(ack => 
          userIds.includes(ack.userId) 
            ? { 
                ...ack, 
                remindersSent: ack.remindersSent + 1,
                lastReminderSent: new Date()
              }
            : ack
        )
      );
      
      setShowReminderModal(false);
      setSelectedUsers([]);
      setReminderMessage('');
      onAcknowledgmentUpdate?.();
    } catch (err) {
      setError('Failed to send reminders');
      console.error('Error sending reminders:', err);
    } finally {
      setSending(false);
    }
  };

  const exportAcknowledgments = () => {
    // Create CSV content
    const headers = ['Name', 'Email', 'Role', 'Status', 'Viewed At', 'Acknowledged At', 'Reminders Sent', 'Due Date'];
    const csvContent = [
      headers.join(','),
      ...acknowledgments.map(ack => [
        ack.userName,
        ack.userEmail,
        ack.userRole,
        ack.status,
        ack.viewedAt ? ack.viewedAt.toLocaleDateString() : '',
        ack.acknowledgedAt ? ack.acknowledgedAt.toLocaleDateString() : '',
        ack.remindersSent.toString(),
        ack.dueDate ? ack.dueDate.toLocaleDateString() : ''
      ].join(','))
    ].join('\n');

    // Download CSV
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${document.title}_acknowledgments.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'acknowledged':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'signed':
        return <FileSignature className="w-5 h-5 text-blue-500" />;
      case 'viewed':
        return <Eye className="w-5 h-5 text-yellow-500" />;
      default:
        return <Clock className="w-5 h-5 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'acknowledged':
        return 'bg-green-100 text-green-800';
      case 'signed':
        return 'bg-blue-100 text-blue-800';
      case 'viewed':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const isOverdue = (ack: DocumentAcknowledgment) => {
    return ack.dueDate && new Date() > ack.dueDate && ack.status === 'pending';
  };

  const getCompletionRate = () => {
    const completed = acknowledgments.filter(ack => 
      ack.status === 'acknowledged' || ack.status === 'signed'
    ).length;
    return acknowledgments.length > 0 ? (completed / acknowledgments.length) * 100 : 0;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const completionRate = getCompletionRate();
  const overdueCount = acknowledgments.filter(isOverdue).length;
  const pendingCount = acknowledgments.filter(ack => ack.status === 'pending').length;

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
          <h2 className="text-2xl font-bold text-gray-900">Document Acknowledgments</h2>
          <p className="text-sm text-gray-600 mt-1">
            Track who has viewed and acknowledged this document
          </p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={() => setShowReminderModal(true)}
            disabled={pendingCount === 0}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
          >
            <Mail className="w-4 h-4 mr-2" />
            Send Reminders
          </button>
          <button
            onClick={exportAcknowledgments}
            className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
          >
            <Download className="w-4 h-4 mr-2" />
            Export
          </button>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white shadow rounded-lg p-6">
          <div className="flex items-center">
            <Users className="w-8 h-8 text-blue-500" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Total Recipients</p>
              <p className="text-2xl font-semibold text-gray-900">{acknowledgments.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white shadow rounded-lg p-6">
          <div className="flex items-center">
            <CheckCircle className="w-8 h-8 text-green-500" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Completion Rate</p>
              <p className="text-2xl font-semibold text-gray-900">{completionRate.toFixed(0)}%</p>
            </div>
          </div>
        </div>

        <div className="bg-white shadow rounded-lg p-6">
          <div className="flex items-center">
            <Clock className="w-8 h-8 text-yellow-500" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Pending</p>
              <p className="text-2xl font-semibold text-gray-900">{pendingCount}</p>
            </div>
          </div>
        </div>

        <div className="bg-white shadow rounded-lg p-6">
          <div className="flex items-center">
            <AlertTriangle className="w-8 h-8 text-red-500" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Overdue</p>
              <p className="text-2xl font-semibold text-gray-900">{overdueCount}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white shadow rounded-lg p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search by name, email, or role..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <Filter className="w-4 h-4 text-gray-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-blue-500 focus:border-blue-500"
            >
              {statusOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Acknowledgments Table */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  User
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Activity
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Reminders
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Due Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredAcknowledgments.map((ack) => (
                <tr key={ack.id} className={isOverdue(ack) ? 'bg-red-50' : ''}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="w-10 h-10 rounded-full bg-gray-300 flex items-center justify-center text-gray-600 font-medium">
                        {ack.userName.charAt(0)}
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">{ack.userName}</div>
                        <div className="text-sm text-gray-500">{ack.userEmail}</div>
                        <div className="text-xs text-gray-400">{ack.userRole}</div>
                      </div>
                    </div>
                  </td>
                  
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      {getStatusIcon(ack.status)}
                      <span className={`ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(ack.status)}`}>
                        {ack.status}
                      </span>
                      {isOverdue(ack) && (
                        <AlertTriangle className="w-4 h-4 text-red-500 ml-2" title="Overdue" />
                      )}
                    </div>
                  </td>
                  
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <div className="space-y-1">
                      {ack.viewedAt && (
                        <div className="flex items-center">
                          <Eye className="w-3 h-3 mr-1" />
                          Viewed: {ack.viewedAt.toLocaleDateString()}
                        </div>
                      )}
                      {ack.acknowledgedAt && (
                        <div className="flex items-center">
                          <CheckCircle className="w-3 h-3 mr-1" />
                          Acknowledged: {ack.acknowledgedAt.toLocaleDateString()}
                        </div>
                      )}
                      {ack.downloadedAt && (
                        <div className="flex items-center">
                          <Download className="w-3 h-3 mr-1" />
                          Downloaded: {ack.downloadedAt.toLocaleDateString()}
                        </div>
                      )}
                      {ack.signedAt && (
                        <div className="flex items-center">
                          <FileSignature className="w-3 h-3 mr-1" />
                          Signed: {ack.signedAt.toLocaleDateString()}
                        </div>
                      )}
                    </div>
                  </td>
                  
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <div>
                      <div className="font-medium">{ack.remindersSent} sent</div>
                      {ack.lastReminderSent && (
                        <div className="text-xs">
                          Last: {ack.lastReminderSent.toLocaleDateString()}
                        </div>
                      )}
                    </div>
                  </td>
                  
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {ack.dueDate ? (
                      <div className={isOverdue(ack) ? 'text-red-600 font-medium' : ''}>
                        {ack.dueDate.toLocaleDateString()}
                      </div>
                    ) : (
                      <span className="text-gray-400">No due date</span>
                    )}
                  </td>
                  
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex space-x-2">
                      {ack.status === 'pending' && (
                        <button
                          onClick={() => {
                            setSelectedUsers([ack.userId]);
                            setShowReminderModal(true);
                          }}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          Remind
                        </button>
                      )}
                      {ack.digitalSignature && (
                        <button
                          onClick={() => {/* View signature */}}
                          className="text-green-600 hover:text-green-900"
                        >
                          View Signature
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Reminder Modal */}
      {showReminderModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Send Reminder
              </h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Recipients ({selectedUsers.length > 0 ? selectedUsers.length : pendingCount} selected)
                  </label>
                  {selectedUsers.length === 0 && (
                    <p className="text-sm text-gray-500">
                      All users with pending acknowledgments will receive a reminder.
                    </p>
                  )}
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Custom Message (Optional)
                  </label>
                  <textarea
                    value={reminderMessage}
                    onChange={(e) => setReminderMessage(e.target.value)}
                    rows={4}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Add a custom message to the reminder email..."
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => {
                    setShowReminderModal(false);
                    setSelectedUsers([]);
                    setReminderMessage('');
                  }}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md"
                >
                  Cancel
                </button>
                <button
                  onClick={() => sendReminder(selectedUsers.length > 0 ? selectedUsers : acknowledgments.filter(ack => ack.status === 'pending').map(ack => ack.userId))}
                  disabled={sending}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md disabled:opacity-50"
                >
                  {sending ? 'Sending...' : 'Send Reminder'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};