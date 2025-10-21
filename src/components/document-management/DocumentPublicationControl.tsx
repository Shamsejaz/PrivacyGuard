import React, { useState, useEffect } from 'react';
import { 
  Globe, 
  Users, 
  Mail, 
  Calendar, 
  Download, 
  Eye,
  EyeOff,
  Send,
  Clock,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import { Document, DocumentPermission } from '../../types/document-management';
import { documentManagementService } from '../../services/documentManagementService';

interface DocumentPublicationControlProps {
  document: Document;
  onPublicationUpdate?: () => void;
}

export const DocumentPublicationControl: React.FC<DocumentPublicationControlProps> = ({
  document,
  onPublicationUpdate
}) => {
  const [isPublishing, setIsPublishing] = useState(false);
  const [isDistributing, setIsDistributing] = useState(false);
  const [showDistributionModal, setShowDistributionModal] = useState(false);
  const [distributionRecipients, setDistributionRecipients] = useState<string[]>([]);
  const [distributionMessage, setDistributionMessage] = useState('');
  const [newRecipient, setNewRecipient] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handlePublish = async () => {
    try {
      setIsPublishing(true);
      setError(null);
      
      await documentManagementService.publishDocument(
        document.id, 
        document.version.toString()
      );
      
      setSuccess('Document published successfully');
      onPublicationUpdate?.();
    } catch (err) {
      setError('Failed to publish document');
      console.error('Error publishing document:', err);
    } finally {
      setIsPublishing(false);
    }
  };

  const handleUnpublish = async () => {
    if (window.confirm('Are you sure you want to unpublish this document? It will no longer be accessible to users.')) {
      try {
        setIsPublishing(true);
        setError(null);
        
        await documentManagementService.unpublishDocument(document.id);
        
        setSuccess('Document unpublished successfully');
        onPublicationUpdate?.();
      } catch (err) {
        setError('Failed to unpublish document');
        console.error('Error unpublishing document:', err);
      } finally {
        setIsPublishing(false);
      }
    }
  };

  const handleDistribute = async () => {
    if (distributionRecipients.length === 0) {
      setError('Please add at least one recipient');
      return;
    }

    try {
      setIsDistributing(true);
      setError(null);
      
      await documentManagementService.distributeDocument(
        document.id,
        distributionRecipients,
        distributionMessage
      );
      
      setSuccess(`Document distributed to ${distributionRecipients.length} recipient(s)`);
      setShowDistributionModal(false);
      setDistributionRecipients([]);
      setDistributionMessage('');
    } catch (err) {
      setError('Failed to distribute document');
      console.error('Error distributing document:', err);
    } finally {
      setIsDistributing(false);
    }
  };

  const addRecipient = () => {
    if (newRecipient.trim() && !distributionRecipients.includes(newRecipient.trim())) {
      setDistributionRecipients([...distributionRecipients, newRecipient.trim()]);
      setNewRecipient('');
    }
  };

  const removeRecipient = (email: string) => {
    setDistributionRecipients(distributionRecipients.filter(r => r !== email));
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addRecipient();
    }
  };

  const getPublicationStatusColor = () => {
    switch (document.status) {
      case 'published':
        return 'bg-green-100 text-green-800';
      case 'approved':
        return 'bg-blue-100 text-blue-800';
      case 'archived':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-yellow-100 text-yellow-800';
    }
  };

  const getPublicationStatusIcon = () => {
    switch (document.status) {
      case 'published':
        return <Globe className="w-4 h-4" />;
      case 'approved':
        return <CheckCircle className="w-4 h-4" />;
      case 'archived':
        return <EyeOff className="w-4 h-4" />;
      default:
        return <Clock className="w-4 h-4" />;
    }
  };

  const canPublish = document.status === 'approved';
  const canUnpublish = document.status === 'published';
  const canDistribute = document.status === 'published' || document.status === 'approved';

  return (
    <div className="space-y-6">
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex">
            <AlertCircle className="h-5 w-5 text-red-400" />
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

      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-medium text-gray-900">Publication Status</h3>
            <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getPublicationStatusColor()}`}>
              {getPublicationStatusIcon()}
              <span className="ml-2">{document.status.replace('_', ' ').toUpperCase()}</span>
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Publication Controls */}
            <div className="space-y-4">
              <h4 className="text-sm font-medium text-gray-900">Publication Controls</h4>
              
              <div className="space-y-3">
                {canPublish && (
                  <button
                    onClick={handlePublish}
                    disabled={isPublishing}
                    className="w-full inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 disabled:opacity-50"
                  >
                    <Globe className="w-4 h-4 mr-2" />
                    {isPublishing ? 'Publishing...' : 'Publish Document'}
                  </button>
                )}

                {canUnpublish && (
                  <button
                    onClick={handleUnpublish}
                    disabled={isPublishing}
                    className="w-full inline-flex items-center justify-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                  >
                    <EyeOff className="w-4 h-4 mr-2" />
                    {isPublishing ? 'Unpublishing...' : 'Unpublish Document'}
                  </button>
                )}

                {canDistribute && (
                  <button
                    onClick={() => setShowDistributionModal(true)}
                    className="w-full inline-flex items-center justify-center px-4 py-2 border border-blue-300 text-sm font-medium rounded-md text-blue-700 bg-blue-50 hover:bg-blue-100"
                  >
                    <Send className="w-4 h-4 mr-2" />
                    Distribute Document
                  </button>
                )}

                <button
                  onClick={() => {/* Handle export */}}
                  className="w-full inline-flex items-center justify-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Export Document
                </button>
              </div>
            </div>

            {/* Document Information */}
            <div className="space-y-4">
              <h4 className="text-sm font-medium text-gray-900">Document Information</h4>
              
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Version:</span>
                  <span className="text-gray-900">v{document.version}</span>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-gray-500">Last Modified:</span>
                  <span className="text-gray-900">
                    {new Date(document.updatedAt).toLocaleDateString()}
                  </span>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-gray-500">Author:</span>
                  <span className="text-gray-900">{document.createdBy}</span>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-gray-500">Classification:</span>
                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                    document.metadata.classification === 'public' ? 'bg-green-100 text-green-800' :
                    document.metadata.classification === 'internal' ? 'bg-blue-100 text-blue-800' :
                    document.metadata.classification === 'confidential' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-red-100 text-red-800'
                  }`}>
                    {document.metadata.classification.toUpperCase()}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Access Permissions */}
          {document.permissions && document.permissions.length > 0 && (
            <div className="mt-6 pt-6 border-t border-gray-200">
              <h4 className="text-sm font-medium text-gray-900 mb-3">Access Permissions</h4>
              <div className="space-y-2">
                {document.permissions.map((permission, index) => (
                  <div key={index} className="flex items-center justify-between text-sm">
                    <div className="flex items-center">
                      <Users className="w-4 h-4 text-gray-400 mr-2" />
                      <span className="text-gray-900">{permission.role}</span>
                    </div>
                    <div className="flex space-x-2">
                      {permission.permissions.map((perm) => (
                        perm.granted && (
                          <span key={perm.action} className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs">
                            {perm.action}
                          </span>
                        )
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Distribution Modal */}
      {showDistributionModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Distribute Document
              </h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Recipients
                  </label>
                  <div className="flex space-x-2">
                    <input
                      type="email"
                      value={newRecipient}
                      onChange={(e) => setNewRecipient(e.target.value)}
                      onKeyPress={handleKeyPress}
                      placeholder="Enter email address"
                      className="flex-1 border border-gray-300 rounded-md px-3 py-2 text-sm"
                    />
                    <button
                      onClick={addRecipient}
                      className="px-3 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700"
                    >
                      Add
                    </button>
                  </div>
                  
                  {distributionRecipients.length > 0 && (
                    <div className="mt-2 space-y-1">
                      {distributionRecipients.map((email) => (
                        <div key={email} className="flex items-center justify-between bg-gray-50 px-3 py-2 rounded">
                          <span className="text-sm text-gray-700">{email}</span>
                          <button
                            onClick={() => removeRecipient(email)}
                            className="text-red-500 hover:text-red-700 text-sm"
                          >
                            Remove
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Message (Optional)
                  </label>
                  <textarea
                    value={distributionMessage}
                    onChange={(e) => setDistributionMessage(e.target.value)}
                    rows={4}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                    placeholder="Add a message for recipients..."
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => {
                    setShowDistributionModal(false);
                    setDistributionRecipients([]);
                    setDistributionMessage('');
                    setNewRecipient('');
                  }}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDistribute}
                  disabled={isDistributing || distributionRecipients.length === 0}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md disabled:opacity-50"
                >
                  {isDistributing ? 'Distributing...' : 'Distribute'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};