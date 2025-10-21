import React, { useState } from 'react';
import { Upload, FileText, Download, Trash2, Eye, Calendar, User } from 'lucide-react';
import { Evidence } from '../../types/compliance';
import { cn } from '../../utils/cn';

interface EvidenceManagerProps {
  requirementId: string;
  evidence: Evidence[];
  onEvidenceAdd: (evidence: Evidence) => void;
  onEvidenceRemove: (evidenceId: string) => void;
  onEvidenceView: (evidence: Evidence) => void;
}

const EvidenceManager: React.FC<EvidenceManagerProps> = ({
  requirementId,
  evidence,
  onEvidenceAdd,
  onEvidenceRemove,
  onEvidenceView
}) => {
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [uploadForm, setUploadForm] = useState({
    name: '',
    type: 'document' as Evidence['type'],
    description: '',
    file: null as File | null
  });

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setUploadForm(prev => ({
        ...prev,
        file,
        name: prev.name || file.name
      }));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadForm.name || !uploadForm.file) return;

    const newEvidence: Evidence = {
      id: Date.now().toString(),
      name: uploadForm.name,
      type: uploadForm.type,
      description: uploadForm.description,
      uploadedAt: new Date(),
      uploadedBy: 'Current User', // This would come from auth context
      url: URL.createObjectURL(uploadForm.file) // In real app, this would be uploaded to storage
    };

    onEvidenceAdd(newEvidence);
    setUploadForm({
      name: '',
      type: 'document',
      description: '',
      file: null
    });
    setShowUploadForm(false);
  };

  const getTypeIcon = (type: Evidence['type']) => {
    switch (type) {
      case 'document':
        return <FileText className="h-5 w-5 text-blue-600" />;
      case 'policy':
        return <FileText className="h-5 w-5 text-green-600" />;
      case 'procedure':
        return <FileText className="h-5 w-5 text-purple-600" />;
      case 'assessment':
        return <FileText className="h-5 w-5 text-orange-600" />;
      case 'audit':
        return <FileText className="h-5 w-5 text-red-600" />;
      default:
        return <FileText className="h-5 w-5 text-gray-600" />;
    }
  };

  const getTypeColor = (type: Evidence['type']) => {
    switch (type) {
      case 'document':
        return 'bg-blue-100 text-blue-800';
      case 'policy':
        return 'bg-green-100 text-green-800';
      case 'procedure':
        return 'bg-purple-100 text-purple-800';
      case 'assessment':
        return 'bg-orange-100 text-orange-800';
      case 'audit':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium text-gray-900">Evidence Management</h3>
        <button
          onClick={() => setShowUploadForm(!showUploadForm)}
          className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          <Upload className="h-4 w-4 mr-2" />
          Upload Evidence
        </button>
      </div>

      {/* Upload Form */}
      {showUploadForm && (
        <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Evidence Name
                </label>
                <input
                  type="text"
                  value={uploadForm.name}
                  onChange={(e) => setUploadForm(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter evidence name"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Evidence Type
                </label>
                <select
                  value={uploadForm.type}
                  onChange={(e) => setUploadForm(prev => ({ ...prev, type: e.target.value as Evidence['type'] }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="document">Document</option>
                  <option value="policy">Policy</option>
                  <option value="procedure">Procedure</option>
                  <option value="assessment">Assessment</option>
                  <option value="audit">Audit</option>
                </select>
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                value={uploadForm.description}
                onChange={(e) => setUploadForm(prev => ({ ...prev, description: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={3}
                placeholder="Enter evidence description"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                File Upload
              </label>
              <input
                type="file"
                onChange={handleFileUpload}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.jpg,.jpeg,.png"
                required
              />
            </div>
            
            <div className="flex items-center space-x-3">
              <button
                type="submit"
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Upload Evidence
              </button>
              <button
                type="button"
                onClick={() => setShowUploadForm(false)}
                className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Evidence List */}
      <div className="space-y-3">
        {evidence.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <FileText className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <p>No evidence uploaded yet</p>
            <p className="text-sm">Upload documents, policies, or assessments to support compliance</p>
          </div>
        ) : (
          evidence.map((item) => (
            <div key={item.id} className="bg-white p-4 rounded-lg border border-gray-200 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-3">
                  {getTypeIcon(item.type)}
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-1">
                      <h4 className="text-sm font-medium text-gray-900">{item.name}</h4>
                      <span className={cn(
                        'inline-flex px-2 py-1 text-xs font-medium rounded-full',
                        getTypeColor(item.type)
                      )}>
                        {item.type}
                      </span>
                    </div>
                    {item.description && (
                      <p className="text-sm text-gray-600 mb-2">{item.description}</p>
                    )}
                    <div className="flex items-center space-x-4 text-xs text-gray-500">
                      <div className="flex items-center space-x-1">
                        <User className="h-3 w-3" />
                        <span>{item.uploadedBy}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Calendar className="h-3 w-3" />
                        <span>{item.uploadedAt.toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => onEvidenceView(item)}
                    className="p-1 text-gray-400 hover:text-blue-600"
                    title="View Evidence"
                  >
                    <Eye className="h-4 w-4" />
                  </button>
                  {item.url && (
                    <a
                      href={item.url}
                      download={item.name}
                      className="p-1 text-gray-400 hover:text-green-600"
                      title="Download Evidence"
                    >
                      <Download className="h-4 w-4" />
                    </a>
                  )}
                  <button
                    onClick={() => onEvidenceRemove(item.id)}
                    className="p-1 text-gray-400 hover:text-red-600"
                    title="Remove Evidence"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default EvidenceManager;