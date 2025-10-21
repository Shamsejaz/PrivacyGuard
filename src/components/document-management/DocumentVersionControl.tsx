import React, { useState, useEffect } from 'react';
import { 
  Clock, 
  GitBranch, 
  User, 
  MessageSquare, 
  Download, 
  RotateCcw,
  Eye,
  FileText,
  CheckCircle,
  XCircle,
  AlertCircle
} from 'lucide-react';
import { DocumentVersion, Document, DocumentApproval } from '../../types/document-management';
import { documentManagementService } from '../../services/documentManagementService';

interface DocumentVersionControlProps {
  document: Document;
  onVersionSelect?: (version: DocumentVersion) => void;
  onRevert?: (version: number) => void;
}

export const DocumentVersionControl: React.FC<DocumentVersionControlProps> = ({
  document,
  onVersionSelect,
  onRevert
}) => {
  const [versions, setVersions] = useState<DocumentVersion[]>([]);
  const [selectedVersions, setSelectedVersions] = useState<[number, number] | null>(null);
  const [comparison, setComparison] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadVersions();
  }, [document.id]);

  const loadVersions = async () => {
    try {
      setLoading(true);
      const versionsData = await documentManagementService.getDocumentVersions(document.id);
      setVersions(versionsData);
    } catch (err) {
      setError('Failed to load document versions');
      console.error('Error loading versions:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCompareVersions = async (v1: number, v2: number) => {
    try {
      const comparisonData = await documentManagementService.compareVersions(document.id, v1, v2);
      setComparison(comparisonData);
      setSelectedVersions([v1, v2]);
    } catch (err) {
      setError('Failed to compare versions');
      console.error('Error comparing versions:', err);
    }
  };

  const handleRevertVersion = async (version: number) => {
    if (window.confirm(`Are you sure you want to revert to version ${version}? This will create a new version.`)) {
      try {
        await documentManagementService.revertToVersion(document.id, version);
        await loadVersions();
        onRevert?.(version);
      } catch (err) {
        setError('Failed to revert to version');
        console.error('Error reverting version:', err);
      }
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'rejected':
        return <XCircle className="w-4 h-4 text-red-500" />;
      case 'in_review':
        return <AlertCircle className="w-4 h-4 text-yellow-500" />;
      default:
        return <FileText className="w-4 h-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
        return 'bg-green-100 text-green-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      case 'in_review':
        return 'bg-yellow-100 text-yellow-800';
      case 'published':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
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
          <div className="flex">
            <XCircle className="h-5 w-5 text-red-400" />
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Error</h3>
              <p className="mt-1 text-sm text-red-700">{error}</p>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900 flex items-center">
              <GitBranch className="w-5 h-5 mr-2" />
              Version History
            </h3>
            <div className="text-sm text-gray-500">
              Current: v{document.version}
            </div>
          </div>

          <div className="space-y-4">
            {versions.map((version) => (
              <div
                key={version.id}
                className={`border rounded-lg p-4 ${
                  version.version === document.version 
                    ? 'border-blue-200 bg-blue-50' 
                    : 'border-gray-200'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <span className="font-medium text-gray-900">
                        Version {version.version}
                      </span>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(version.status)}`}>
                        {getStatusIcon(version.status)}
                        <span className="ml-1">{version.status.replace('_', ' ')}</span>
                      </span>
                      {version.version === document.version && (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          Current
                        </span>
                      )}
                    </div>

                    <div className="flex items-center text-sm text-gray-500 space-x-4 mb-2">
                      <div className="flex items-center">
                        <User className="w-4 h-4 mr-1" />
                        {version.createdBy}
                      </div>
                      <div className="flex items-center">
                        <Clock className="w-4 h-4 mr-1" />
                        {new Date(version.createdAt).toLocaleString()}
                      </div>
                    </div>

                    {version.comment && (
                      <div className="flex items-start mt-2">
                        <MessageSquare className="w-4 h-4 mr-2 mt-0.5 text-gray-400" />
                        <p className="text-sm text-gray-600">{version.comment}</p>
                      </div>
                    )}

                    {version.approvals && version.approvals.length > 0 && (
                      <div className="mt-3">
                        <h4 className="text-sm font-medium text-gray-700 mb-2">Approvals:</h4>
                        <div className="space-y-1">
                          {version.approvals.map((approval) => (
                            <div key={approval.id} className="flex items-center text-sm">
                              {approval.status === 'approved' ? (
                                <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                              ) : approval.status === 'rejected' ? (
                                <XCircle className="w-4 h-4 text-red-500 mr-2" />
                              ) : (
                                <AlertCircle className="w-4 h-4 text-yellow-500 mr-2" />
                              )}
                              <span className="text-gray-600">
                                {approval.approverName} ({approval.approverRole}) - {approval.status}
                              </span>
                              {approval.digitalSignature && (
                                <span className="ml-2 text-xs text-blue-600">Digitally Signed</span>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center space-x-2 ml-4">
                    <button
                      onClick={() => onVersionSelect?.(version)}
                      className="inline-flex items-center px-3 py-1.5 border border-gray-300 shadow-sm text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50"
                    >
                      <Eye className="w-4 h-4 mr-1" />
                      View
                    </button>

                    {version.version !== document.version && (
                      <>
                        <button
                          onClick={() => handleCompareVersions(version.version, document.version)}
                          className="inline-flex items-center px-3 py-1.5 border border-gray-300 shadow-sm text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50"
                        >
                          <GitBranch className="w-4 h-4 mr-1" />
                          Compare
                        </button>

                        <button
                          onClick={() => handleRevertVersion(version.version)}
                          className="inline-flex items-center px-3 py-1.5 border border-gray-300 shadow-sm text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50"
                        >
                          <RotateCcw className="w-4 h-4 mr-1" />
                          Revert
                        </button>
                      </>
                    )}

                    <button
                      onClick={() => {/* Handle download */}}
                      className="inline-flex items-center px-3 py-1.5 border border-gray-300 shadow-sm text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50"
                    >
                      <Download className="w-4 h-4 mr-1" />
                      Export
                    </button>
                  </div>
                </div>

                {version.changes && version.changes.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-gray-200">
                    <h4 className="text-sm font-medium text-gray-700 mb-2">
                      Changes ({version.changes.length}):
                    </h4>
                    <div className="space-y-1">
                      {version.changes.slice(0, 3).map((change, index) => (
                        <div key={index} className="text-sm text-gray-600">
                          <span className={`inline-block w-2 h-2 rounded-full mr-2 ${
                            change.type === 'addition' ? 'bg-green-400' :
                            change.type === 'deletion' ? 'bg-red-400' : 'bg-yellow-400'
                          }`}></span>
                          {change.type} in {change.section}
                        </div>
                      ))}
                      {version.changes.length > 3 && (
                        <div className="text-sm text-gray-500">
                          +{version.changes.length - 3} more changes
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {comparison && selectedVersions && (
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Version Comparison: v{selectedVersions[0]} vs v{selectedVersions[1]}
            </h3>
            <div className="prose max-w-none">
              <div dangerouslySetInnerHTML={{ __html: comparison.diff }} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};