import React, { useState } from 'react';
import { X, Download, FileText, Shield } from 'lucide-react';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { AuditFilter, AuditExportOptions } from '../../types/audit';

interface AuditExportModalProps {
  filters: AuditFilter;
  onExport: (options: AuditExportOptions) => void;
  onClose: () => void;
}

const AuditExportModal: React.FC<AuditExportModalProps> = ({ filters, onExport, onClose }) => {
  const [exportOptions, setExportOptions] = useState<AuditExportOptions>({
    format: 'json',
    filter: filters,
    includeMetadata: true,
    digitalSignature: false
  });

  const handleExport = () => {
    onExport(exportOptions);
  };

  const handleOptionChange = (key: keyof AuditExportOptions, value: any) => {
    setExportOptions(prev => ({ ...prev, [key]: value }));
  };

  const formatOptions = [
    { value: 'json', label: 'JSON', description: 'Machine-readable format with full data structure' },
    { value: 'csv', label: 'CSV', description: 'Spreadsheet format for data analysis' },
    { value: 'pdf', label: 'PDF', description: 'Human-readable report format' },
    { value: 'xml', label: 'XML', description: 'Structured markup format' }
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-2">
            <Download className="w-5 h-5 text-blue-600" />
            <h2 className="text-xl font-semibold text-gray-900">Export Audit Trail</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Export Format */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">Export Format</label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {formatOptions.map(option => (
                <Card
                  key={option.value}
                  className={`p-4 cursor-pointer transition-colors ${
                    exportOptions.format === option.value
                      ? 'border-blue-500 bg-blue-50'
                      : 'hover:bg-gray-50'
                  }`}
                  onClick={() => handleOptionChange('format', option.value)}
                >
                  <div className="flex items-start space-x-3">
                    <FileText className="w-5 h-5 text-gray-400 mt-0.5" />
                    <div>
                      <h4 className="font-medium text-gray-900">{option.label}</h4>
                      <p className="text-sm text-gray-500 mt-1">{option.description}</p>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>

          {/* Export Options */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">Export Options</label>
            <div className="space-y-3">
              <label className="flex items-start space-x-3">
                <input
                  type="checkbox"
                  checked={exportOptions.includeMetadata}
                  onChange={(e) => handleOptionChange('includeMetadata', e.target.checked)}
                  className="mt-1 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <div>
                  <span className="text-sm font-medium text-gray-900">Include Metadata</span>
                  <p className="text-sm text-gray-500">Include technical details like correlation IDs, request IDs, and custom fields</p>
                </div>
              </label>

              <label className="flex items-start space-x-3">
                <input
                  type="checkbox"
                  checked={exportOptions.digitalSignature}
                  onChange={(e) => handleOptionChange('digitalSignature', e.target.checked)}
                  className="mt-1 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <div className="flex items-start space-x-2">
                  <div>
                    <span className="text-sm font-medium text-gray-900">Digital Signature</span>
                    <p className="text-sm text-gray-500">Add cryptographic signature for tamper-proof verification</p>
                  </div>
                  <Shield className="w-4 h-4 text-blue-500 mt-0.5" />
                </div>
              </label>
            </div>
          </div>

          {/* Encryption (if digital signature is enabled) */}
          {exportOptions.digitalSignature && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Encryption Key (Optional)</label>
              <input
                type="password"
                placeholder="Enter encryption key for additional security"
                value={exportOptions.encryptionKey || ''}
                onChange={(e) => handleOptionChange('encryptionKey', e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
              />
              <p className="text-xs text-gray-500 mt-1">
                Leave empty to use default system encryption. Custom key provides additional security.
              </p>
            </div>
          )}

          {/* Filter Summary */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Export Filters</label>
            <Card className="p-4 bg-gray-50">
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Date Range:</span>
                  <span className="text-gray-900">
                    {filters.startDate?.toLocaleDateString()} - {filters.endDate?.toLocaleDateString()}
                  </span>
                </div>
                {filters.eventTypes && filters.eventTypes.length > 0 && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Event Types:</span>
                    <span className="text-gray-900">{filters.eventTypes.length} selected</span>
                  </div>
                )}
                {filters.categories && filters.categories.length > 0 && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Categories:</span>
                    <span className="text-gray-900">{filters.categories.length} selected</span>
                  </div>
                )}
                {filters.severities && filters.severities.length > 0 && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Severities:</span>
                    <span className="text-gray-900">{filters.severities.length} selected</span>
                  </div>
                )}
                {filters.searchTerm && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Search Term:</span>
                    <span className="text-gray-900">"{filters.searchTerm}"</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-gray-600">Limit:</span>
                  <span className="text-gray-900">{filters.limit || 'No limit'}</span>
                </div>
              </div>
            </Card>
          </div>

          {/* Security Notice */}
          {exportOptions.digitalSignature && (
            <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
              <div className="flex items-start space-x-2">
                <Shield className="w-5 h-5 text-blue-600 mt-0.5" />
                <div>
                  <h4 className="text-sm font-medium text-blue-900">Security Notice</h4>
                  <p className="text-sm text-blue-700 mt-1">
                    Digital signatures ensure the integrity and authenticity of exported audit data. 
                    The signature can be verified to detect any tampering with the exported file.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-gray-200">
          <div className="text-sm text-gray-500">
            Export will include all events matching your current filters
          </div>
          <div className="flex space-x-3">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={handleExport} className="flex items-center space-x-2">
              <Download className="w-4 h-4" />
              <span>Export</span>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuditExportModal;