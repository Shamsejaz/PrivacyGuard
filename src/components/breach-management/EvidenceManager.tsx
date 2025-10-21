import React, { useState, useEffect } from 'react';
import { Upload, FileText, Image, Download, Eye, Trash2, Shield, Clock, User } from 'lucide-react';
import { BreachEvidence, ChainOfCustodyEntry } from '../../types/breach-management';
import { breachManagementService } from '../../services/breachManagementService';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';

interface EvidenceManagerProps {
  breachId: string;
}

export const EvidenceManager: React.FC<EvidenceManagerProps> = ({
  breachId
}) => {
  const [evidence, setEvidence] = useState<BreachEvidence[]>([]);
  const [loading, setLoading] = useState(true);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [selectedEvidence, setSelectedEvidence] = useState<BreachEvidence | null>(null);
  const [showCustodyModal, setShowCustodyModal] = useState(false);

  useEffect(() => {
    loadEvidence();
  }, [breachId]);

  const loadEvidence = async () => {
    try {
      setLoading(true);
      const breach = await breachManagementService.getBreach(breachId);
      setEvidence(breach.evidence || []);
    } catch (error) {
      console.error('Failed to load evidence:', error);
    } finally {
      setLoading(false);
    }
  };

  const uploadEvidence = async (file: File, metadata: any) => {
    try {
      const newEvidence = await breachManagementService.uploadEvidenceFile(breachId, file, metadata);
      setEvidence(prev => [...prev, newEvidence]);
      setShowUploadModal(false);
    } catch (error) {
      console.error('Failed to upload evidence:', error);
    }
  };

  const getFileTypeIcon = (type: string) => {
    switch (type) {
      case 'document': return <FileText className="h-5 w-5 text-blue-500" />;
      case 'screenshot': return <Image className="h-5 w-5 text-green-500" />;
      case 'log_file': return <FileText className="h-5 w-5 text-orange-500" />;
      case 'forensic_image': return <Shield className="h-5 w-5 text-red-500" />;
      case 'witness_statement': return <User className="h-5 w-5 text-purple-500" />;
      default: return <FileText className="h-5 w-5 text-gray-500" />;
    }
  };

  const getFileTypeColor = (type: string) => {
    switch (type) {
      case 'document': return 'text-blue-600 bg-blue-50';
      case 'screenshot': return 'text-green-600 bg-green-50';
      case 'log_file': return 'text-orange-600 bg-orange-50';
      case 'forensic_image': return 'text-red-600 bg-red-50';
      case 'witness_statement': return 'text-purple-600 bg-purple-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
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
          <h3 className="text-lg font-semibold text-gray-900">Evidence Collection</h3>
          <p className="text-gray-600">Manage and track all evidence related to this breach</p>
        </div>
        <Button onClick={() => setShowUploadModal(true)} className="flex items-center gap-2">
          <Upload className="h-4 w-4" />
          Upload Evidence
        </Button>
      </div>

      {/* Evidence Grid */}
      <div className="grid gap-4">
        {evidence.length === 0 ? (
          <Card className="p-8 text-center">
            <Shield className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Evidence Collected</h3>
            <p className="text-gray-600 mb-4">Start collecting and documenting evidence for this breach</p>
            <Button onClick={() => setShowUploadModal(true)}>
              Upload First Evidence
            </Button>
          </Card>
        ) : (
          evidence.map((item) => (
            <Card key={item.id} className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-4 flex-1">
                  {getFileTypeIcon(item.type)}
                  
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h4 className="font-semibold text-gray-900">{item.name}</h4>
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getFileTypeColor(item.type)}`}>
                        {item.type.replace('_', ' ').toUpperCase()}
                      </span>
                    </div>
                    
                    <p className="text-sm text-gray-600 mb-3">{item.description}</p>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-600">
                      <div>
                        <span className="font-medium">Collected By:</span> {item.collectedBy}
                      </div>
                      <div>
                        <span className="font-medium">Date:</span> {new Date(item.collectedAt).toLocaleDateString()}
                      </div>
                      <div>
                        <span className="font-medium">Chain of Custody:</span> {item.chainOfCustody.length} entries
                      </div>
                      {item.hash && (
                        <div>
                          <span className="font-medium">Hash:</span> 
                          <span className="font-mono text-xs ml-1">{item.hash.substring(0, 8)}...</span>
                        </div>
                      )}
                    </div>

                    {/* Chain of Custody Preview */}
                    {item.chainOfCustody.length > 0 && (
                      <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-medium text-gray-700">Latest Chain of Custody Entry:</span>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedEvidence(item);
                              setShowCustodyModal(true);
                            }}
                            className="text-xs"
                          >
                            View Full Chain
                          </Button>
                        </div>
                        {item.chainOfCustody[item.chainOfCustody.length - 1] && (
                          <div className="text-xs text-gray-600">
                            <span className="font-medium">
                              {item.chainOfCustody[item.chainOfCustody.length - 1].action}
                            </span> by {item.chainOfCustody[item.chainOfCustody.length - 1].performedBy} on{' '}
                            {new Date(item.chainOfCustody[item.chainOfCustody.length - 1].timestamp).toLocaleString()}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 ml-4">
                  <Button variant="outline" size="sm" className="flex items-center gap-1">
                    <Eye className="h-3 w-3" />
                    View
                  </Button>
                  
                  <Button variant="outline" size="sm" className="flex items-center gap-1">
                    <Download className="h-3 w-3" />
                    Download
                  </Button>
                  
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="flex items-center gap-1 text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="h-3 w-3" />
                    Delete
                  </Button>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>

      {/* Evidence Statistics */}
      <Card className="p-6 bg-blue-50 border-blue-200">
        <h4 className="font-medium text-blue-900 mb-4">Evidence Summary</h4>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
          {['document', 'screenshot', 'log_file', 'forensic_image', 'witness_statement'].map(type => (
            <div key={type} className="text-center">
              <div className="text-lg font-semibold text-blue-900">
                {evidence.filter(e => e.type === type).length}
              </div>
              <div className="text-blue-700 capitalize">{type.replace('_', ' ')}</div>
            </div>
          ))}
        </div>
      </Card>

      {/* Upload Modal */}
      {showUploadModal && (
        <EvidenceUploadModal
          onUpload={uploadEvidence}
          onCancel={() => setShowUploadModal(false)}
        />
      )}

      {/* Chain of Custody Modal */}
      {showCustodyModal && selectedEvidence && (
        <ChainOfCustodyModal
          evidence={selectedEvidence}
          onClose={() => {
            setShowCustodyModal(false);
            setSelectedEvidence(null);
          }}
        />
      )}
    </div>
  );
};

interface EvidenceUploadModalProps {
  onUpload: (file: File, metadata: any) => void;
  onCancel: () => void;
}

const EvidenceUploadModal: React.FC<EvidenceUploadModalProps> = ({ onUpload, onCancel }) => {
  const [file, setFile] = useState<File | null>(null);
  const [metadata, setMetadata] = useState({
    type: 'document',
    name: '',
    description: '',
    collectedBy: '',
    location: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (file) {
      onUpload(file, metadata);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-2xl">
        <h3 className="text-lg font-semibold mb-4">Upload Evidence</h3>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              File
            </label>
            <input
              type="file"
              required
              onChange={(e) => {
                const selectedFile = e.target.files?.[0];
                if (selectedFile) {
                  setFile(selectedFile);
                  if (!metadata.name) {
                    setMetadata(prev => ({ ...prev, name: selectedFile.name }));
                  }
                }
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Evidence Type
              </label>
              <select
                value={metadata.type}
                onChange={(e) => setMetadata(prev => ({ ...prev, type: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="document">Document</option>
                <option value="screenshot">Screenshot</option>
                <option value="log_file">Log File</option>
                <option value="forensic_image">Forensic Image</option>
                <option value="witness_statement">Witness Statement</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Evidence Name
              </label>
              <input
                type="text"
                required
                value={metadata.name}
                onChange={(e) => setMetadata(prev => ({ ...prev, name: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Descriptive name for the evidence"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description
            </label>
            <textarea
              required
              value={metadata.description}
              onChange={(e) => setMetadata(prev => ({ ...prev, description: e.target.value }))}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Detailed description of the evidence"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Collected By
              </label>
              <input
                type="text"
                required
                value={metadata.collectedBy}
                onChange={(e) => setMetadata(prev => ({ ...prev, collectedBy: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Person who collected the evidence"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Location
              </label>
              <input
                type="text"
                required
                value={metadata.location}
                onChange={(e) => setMetadata(prev => ({ ...prev, location: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Where the evidence was collected"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
            <Button type="submit" disabled={!file}>
              Upload Evidence
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

interface ChainOfCustodyModalProps {
  evidence: BreachEvidence;
  onClose: () => void;
}

const ChainOfCustodyModal: React.FC<ChainOfCustodyModalProps> = ({ evidence, onClose }) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[80vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h3 className="text-lg font-semibold">Chain of Custody</h3>
            <p className="text-gray-600">{evidence.name}</p>
          </div>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>

        <div className="space-y-4">
          {evidence.chainOfCustody.map((entry, index) => (
            <Card key={entry.id} className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-sm font-medium text-gray-900 capitalize">
                      {entry.action}
                    </span>
                    <span className="text-xs text-gray-500">
                      Entry #{evidence.chainOfCustody.length - index}
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-600">
                    <div>
                      <span className="font-medium">Performed By:</span> {entry.performedBy}
                    </div>
                    <div>
                      <span className="font-medium">Timestamp:</span> {new Date(entry.timestamp).toLocaleString()}
                    </div>
                    <div>
                      <span className="font-medium">Location:</span> {entry.location}
                    </div>
                    <div>
                      <span className="font-medium">Action:</span> {entry.action}
                    </div>
                  </div>

                  {entry.notes && (
                    <div className="mt-2 text-sm text-gray-600">
                      <span className="font-medium">Notes:</span> {entry.notes}
                    </div>
                  )}
                </div>

                <div className="ml-4">
                  <Clock className="h-4 w-4 text-gray-400" />
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
};