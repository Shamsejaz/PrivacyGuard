import React, { useState, useEffect } from 'react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { 
  Vendor, 
  VendorCommunication, 
  VendorPortalAccess,
  Evidence 
} from '../../types/vendor-risk';
import { vendorRiskService } from '../../services/vendorRiskService';
import { 
  MessageSquare, 
  Send, 
  Paperclip, 
  Download, 
  Eye, 
  EyeOff, 
  Clock, 
  CheckCircle, 
  Mail, 
  Phone, 
  Globe, 
  Users,
  Plus,
  Edit,
  Trash2,
  Filter,
  Search,
  FileText,
  AlertCircle,
  Bell
} from 'lucide-react';

interface VendorCommunicationPortalProps {
  vendor: Vendor;
  onCommunicationSent?: (communication: VendorCommunication) => void;
}

export const VendorCommunicationPortal: React.FC<VendorCommunicationPortalProps> = ({
  vendor,
  onCommunicationSent
}) => {
  const [communications, setCommunications] = useState<VendorCommunication[]>([]);
  const [portalUsers, setPortalUsers] = useState<VendorPortalAccess[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewMessage, setShowNewMessage] = useState(false);
  const [showInviteUser, setShowInviteUser] = useState(false);
  const [filter, setFilter] = useState({
    type: 'all',
    status: 'all',
    dateRange: 'all'
  });

  const [newMessage, setNewMessage] = useState({
    type: 'portal_message' as const,
    subject: '',
    message: '',
    attachments: [] as File[]
  });

  const [newUserInvite, setNewUserInvite] = useState({
    email: '',
    role: 'user' as const
  });

  useEffect(() => {
    loadCommunicationData();
  }, [vendor.id]);

  const loadCommunicationData = async () => {
    try {
      setLoading(true);
      const [communicationsData, portalUsersData] = await Promise.all([
        vendorRiskService.getVendorCommunications(vendor.id),
        vendorRiskService.getVendorPortalAccess(vendor.id)
      ]);

      setCommunications(communicationsData);
      setPortalUsers(portalUsersData);
    } catch (error) {
      console.error('Failed to load communication data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const messageData = {
        ...newMessage,
        vendorId: vendor.id,
        sentBy: 'current-user' // This should come from auth context
      };

      const sentMessage = await vendorRiskService.sendVendorMessage(vendor.id, messageData);
      setCommunications(prev => [sentMessage, ...prev]);
      
      if (onCommunicationSent) {
        onCommunicationSent(sentMessage);
      }

      // Reset form
      setNewMessage({
        type: 'portal_message',
        subject: '',
        message: '',
        attachments: []
      });
      setShowNewMessage(false);
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  };

  const handleInviteUser = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const invitedUser = await vendorRiskService.inviteVendorUser(
        vendor.id, 
        newUserInvite.email, 
        newUserInvite.role
      );
      
      setPortalUsers(prev => [...prev, invitedUser]);
      
      // Reset form
      setNewUserInvite({
        email: '',
        role: 'user'
      });
      setShowInviteUser(false);
    } catch (error) {
      console.error('Failed to invite user:', error);
    }
  };

  const handleFileUpload = (files: FileList) => {
    const fileArray = Array.from(files);
    setNewMessage(prev => ({
      ...prev,
      attachments: [...prev.attachments, ...fileArray]
    }));
  };

  const removeAttachment = (index: number) => {
    setNewMessage(prev => ({
      ...prev,
      attachments: prev.attachments.filter((_, i) => i !== index)
    }));
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'sent': return <Send className="w-4 h-4 text-blue-600" />;
      case 'delivered': return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'read': return <Eye className="w-4 h-4 text-green-600" />;
      case 'responded': return <MessageSquare className="w-4 h-4 text-purple-600" />;
      default: return <Clock className="w-4 h-4 text-gray-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'sent': return 'bg-blue-100 text-blue-800';
      case 'delivered': return 'bg-green-100 text-green-800';
      case 'read': return 'bg-green-100 text-green-800';
      case 'responded': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin': return 'bg-red-100 text-red-800';
      case 'user': return 'bg-blue-100 text-blue-800';
      case 'viewer': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const filteredCommunications = communications.filter(comm => {
    if (filter.type !== 'all' && comm.type !== filter.type) return false;
    if (filter.status !== 'all' && comm.status !== filter.status) return false;
    
    if (filter.dateRange !== 'all') {
      const commDate = new Date(comm.sentAt);
      const now = new Date();
      const daysAgo = parseInt(filter.dateRange);
      const cutoffDate = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000);
      if (commDate < cutoffDate) return false;
    }

    return true;
  });

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
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Communication Portal</h3>
          <p className="text-sm text-gray-600">
            Manage communications and portal access for {vendor.name}
          </p>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline" onClick={() => setShowInviteUser(true)}>
            <Users className="w-4 h-4 mr-2" />
            Invite User
          </Button>
          <Button onClick={() => setShowNewMessage(true)}>
            <MessageSquare className="w-4 h-4 mr-2" />
            New Message
          </Button>
        </div>
      </div>

      {/* Vendor Contact Info */}
      <Card className="p-6">
        <h4 className="text-lg font-semibold text-gray-900 mb-4">Vendor Contact Information</h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="flex items-center space-x-3">
            <Mail className="w-5 h-5 text-gray-400" />
            <div>
              <p className="text-sm font-medium text-gray-700">Primary Email</p>
              <p className="text-sm text-gray-600">{vendor.contactEmail}</p>
            </div>
          </div>
          
          {vendor.contactPhone && (
            <div className="flex items-center space-x-3">
              <Phone className="w-5 h-5 text-gray-400" />
              <div>
                <p className="text-sm font-medium text-gray-700">Phone</p>
                <p className="text-sm text-gray-600">{vendor.contactPhone}</p>
              </div>
            </div>
          )}
          
          {vendor.website && (
            <div className="flex items-center space-x-3">
              <Globe className="w-5 h-5 text-gray-400" />
              <div>
                <p className="text-sm font-medium text-gray-700">Website</p>
                <a 
                  href={vendor.website} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-sm text-blue-600 hover:underline"
                >
                  {vendor.website}
                </a>
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* Portal Users */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-lg font-semibold text-gray-900">Portal Access Users</h4>
          <Badge variant="outline">{portalUsers.length} users</Badge>
        </div>
        
        <div className="space-y-3">
          {portalUsers.map(user => (
            <div key={user.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center space-x-4">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                  user.status === 'active' ? 'bg-green-100' : 'bg-gray-100'
                }`}>
                  <Users className={`w-5 h-5 ${
                    user.status === 'active' ? 'text-green-600' : 'text-gray-400'
                  }`} />
                </div>
                <div>
                  <p className="font-medium text-gray-900">{user.email}</p>
                  <div className="flex items-center space-x-2 mt-1">
                    <Badge className={getRoleColor(user.role)}>
                      {user.role.toUpperCase()}
                    </Badge>
                    <Badge variant={user.status === 'active' ? 'default' : 'secondary'}>
                      {user.status.toUpperCase()}
                    </Badge>
                  </div>
                </div>
              </div>
              
              <div className="text-right text-sm text-gray-500">
                {user.lastLogin ? (
                  <div>
                    <p>Last login:</p>
                    <p>{new Date(user.lastLogin).toLocaleDateString()}</p>
                  </div>
                ) : (
                  <p>Never logged in</p>
                )}
              </div>
            </div>
          ))}
          
          {portalUsers.length === 0 && (
            <div className="text-center py-8">
              <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">No portal users invited yet</p>
              <Button 
                variant="outline" 
                className="mt-2"
                onClick={() => setShowInviteUser(true)}
              >
                Invite First User
              </Button>
            </div>
          )}
        </div>
      </Card>

      {/* Communication Filters */}
      <Card className="p-4">
        <div className="flex items-center space-x-4">
          <Filter className="w-5 h-5 text-gray-400" />
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
            <select
              value={filter.type}
              onChange={(e) => setFilter(prev => ({ ...prev, type: e.target.value }))}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Types</option>
              <option value="email">Email</option>
              <option value="portal_message">Portal Message</option>
              <option value="document_request">Document Request</option>
              <option value="assessment_reminder">Assessment Reminder</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select
              value={filter.status}
              onChange={(e) => setFilter(prev => ({ ...prev, status: e.target.value }))}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Statuses</option>
              <option value="sent">Sent</option>
              <option value="delivered">Delivered</option>
              <option value="read">Read</option>
              <option value="responded">Responded</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Date Range</label>
            <select
              value={filter.dateRange}
              onChange={(e) => setFilter(prev => ({ ...prev, dateRange: e.target.value }))}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Time</option>
              <option value="7">Last 7 days</option>
              <option value="30">Last 30 days</option>
              <option value="90">Last 90 days</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Communications List */}
      <div className="space-y-4">
        {filteredCommunications.map(communication => (
          <Card key={communication.id} className="p-6">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center space-x-3 mb-2">
                  <h4 className="text-lg font-semibold text-gray-900">{communication.subject}</h4>
                  <Badge variant="outline">{communication.type.replace('_', ' ')}</Badge>
                  <Badge className={getStatusColor(communication.status)}>
                    {communication.status.toUpperCase()}
                  </Badge>
                </div>
                
                <p className="text-gray-600 mb-4">{communication.message}</p>
                
                <div className="flex items-center space-x-6 text-sm text-gray-500">
                  <div className="flex items-center space-x-2">
                    <Clock className="w-4 h-4" />
                    <span>Sent: {new Date(communication.sentAt).toLocaleString()}</span>
                  </div>
                  
                  {communication.readAt && (
                    <div className="flex items-center space-x-2">
                      <Eye className="w-4 h-4" />
                      <span>Read: {new Date(communication.readAt).toLocaleString()}</span>
                    </div>
                  )}
                  
                  {communication.responseAt && (
                    <div className="flex items-center space-x-2">
                      <MessageSquare className="w-4 h-4" />
                      <span>Responded: {new Date(communication.responseAt).toLocaleString()}</span>
                    </div>
                  )}
                </div>

                {communication.attachments && communication.attachments.length > 0 && (
                  <div className="mt-4">
                    <p className="text-sm font-medium text-gray-700 mb-2">Attachments:</p>
                    <div className="flex flex-wrap gap-2">
                      {communication.attachments.map(attachment => (
                        <div key={attachment.id} className="flex items-center space-x-2 bg-gray-100 rounded-md px-3 py-2">
                          <FileText className="w-4 h-4 text-gray-600" />
                          <span className="text-sm text-gray-700">{attachment.name}</span>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => window.open(attachment.url, '_blank')}
                          >
                            <Download className="w-3 h-3" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex items-center space-x-2 ml-4">
                {getStatusIcon(communication.status)}
              </div>
            </div>
          </Card>
        ))}

        {filteredCommunications.length === 0 && (
          <Card className="p-8 text-center">
            <MessageSquare className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h4 className="text-lg font-medium text-gray-900 mb-2">No Communications Found</h4>
            <p className="text-gray-600 mb-4">
              {communications.length === 0 
                ? "No communications have been sent yet."
                : "No communications match the current filters."
              }
            </p>
            <Button onClick={() => setShowNewMessage(true)}>
              <MessageSquare className="w-4 h-4 mr-2" />
              Send First Message
            </Button>
          </Card>
        )}
      </div>

      {/* New Message Modal */}
      {showNewMessage && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto m-4">
            <div className="p-6 border-b">
              <h3 className="text-lg font-semibold text-gray-900">Send Message to {vendor.name}</h3>
            </div>

            <form onSubmit={handleSendMessage} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Message Type
                </label>
                <select
                  value={newMessage.type}
                  onChange={(e) => setNewMessage(prev => ({ ...prev, type: e.target.value as any }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="portal_message">Portal Message</option>
                  <option value="email">Email</option>
                  <option value="document_request">Document Request</option>
                  <option value="assessment_reminder">Assessment Reminder</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Subject *
                </label>
                <Input
                  value={newMessage.subject}
                  onChange={(e) => setNewMessage(prev => ({ ...prev, subject: e.target.value }))}
                  placeholder="Enter message subject"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Message *
                </label>
                <textarea
                  value={newMessage.message}
                  onChange={(e) => setNewMessage(prev => ({ ...prev, message: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={6}
                  placeholder="Enter your message"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Attachments
                </label>
                <input
                  type="file"
                  multiple
                  onChange={(e) => e.target.files && handleFileUpload(e.target.files)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                
                {newMessage.attachments.length > 0 && (
                  <div className="mt-2 space-y-2">
                    {newMessage.attachments.map((file, index) => (
                      <div key={index} className="flex items-center justify-between bg-gray-100 rounded-md px-3 py-2">
                        <div className="flex items-center space-x-2">
                          <Paperclip className="w-4 h-4 text-gray-600" />
                          <span className="text-sm text-gray-700">{file.name}</span>
                          <span className="text-xs text-gray-500">({(file.size / 1024).toFixed(1)} KB)</span>
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => removeAttachment(index)}
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex justify-end space-x-4 pt-6 border-t">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setShowNewMessage(false)}
                >
                  Cancel
                </Button>
                <Button type="submit">
                  <Send className="w-4 h-4 mr-2" />
                  Send Message
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Invite User Modal */}
      {showInviteUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg max-w-md w-full m-4">
            <div className="p-6 border-b">
              <h3 className="text-lg font-semibold text-gray-900">Invite Portal User</h3>
            </div>

            <form onSubmit={handleInviteUser} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email Address *
                </label>
                <Input
                  type="email"
                  value={newUserInvite.email}
                  onChange={(e) => setNewUserInvite(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="user@vendor.com"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Role
                </label>
                <select
                  value={newUserInvite.role}
                  onChange={(e) => setNewUserInvite(prev => ({ ...prev, role: e.target.value as any }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="viewer">Viewer - Read-only access</option>
                  <option value="user">User - Can respond to assessments</option>
                  <option value="admin">Admin - Full portal access</option>
                </select>
              </div>

              <div className="flex justify-end space-x-4 pt-6 border-t">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setShowInviteUser(false)}
                >
                  Cancel
                </Button>
                <Button type="submit">
                  <Send className="w-4 h-4 mr-2" />
                  Send Invitation
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};