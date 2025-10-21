import React, { useState } from 'react';
import { ComplianceFramework } from '../../types/compliance';
import ComplianceMatrixContainer from '../compliance/ComplianceMatrixContainer';

const ComplianceMatrixDemo: React.FC = () => {
  const [selectedFramework, setSelectedFramework] = useState<ComplianceFramework>('GDPR');

  const frameworks: { id: ComplianceFramework; name: string; description: string }[] = [
    {
      id: 'GDPR',
      name: 'GDPR',
      description: 'General Data Protection Regulation'
    },
    {
      id: 'PDPL',
      name: 'PDPL',
      description: 'Personal Data Protection Law'
    },
    {
      id: 'HIPAA',
      name: 'HIPAA',
      description: 'Health Insurance Portability and Accountability Act'
    },
    {
      id: 'CCPA',
      name: 'CCPA',
      description: 'California Consumer Privacy Act'
    }
  ];

  return (
    <div className="space-y-6">
      {/* Framework Selector */}
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          Enhanced Compliance Matrix Components Demo
        </h2>
        <p className="text-gray-600 mb-4">
          This demo showcases the enhanced compliance matrix components with integrated evidence management, 
          gap analysis, and remediation planning tools.
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {frameworks.map((framework) => (
            <button
              key={framework.id}
              onClick={() => setSelectedFramework(framework.id)}
              className={`p-4 rounded-lg border-2 text-left transition-colors ${
                selectedFramework === framework.id
                  ? 'border-blue-500 bg-blue-50 text-blue-900'
                  : 'border-gray-200 hover:border-gray-300 text-gray-700'
              }`}
            >
              <div className="font-medium">{framework.name}</div>
              <div className="text-sm text-gray-500 mt-1">{framework.description}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Features Overview */}
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Enhanced Features</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 bg-blue-50 rounded-lg">
            <h4 className="font-medium text-blue-900 mb-2">Requirements Display</h4>
            <p className="text-sm text-blue-700">
              Comprehensive matrix view with status tracking, filtering, and sorting capabilities.
            </p>
          </div>
          <div className="p-4 bg-green-50 rounded-lg">
            <h4 className="font-medium text-green-900 mb-2">Evidence Management</h4>
            <p className="text-sm text-green-700">
              Upload, organize, and manage compliance evidence with version control.
            </p>
          </div>
          <div className="p-4 bg-yellow-50 rounded-lg">
            <h4 className="font-medium text-yellow-900 mb-2">Gap Analysis</h4>
            <p className="text-sm text-yellow-700">
              Identify compliance gaps and create detailed remediation plans.
            </p>
          </div>
          <div className="p-4 bg-purple-50 rounded-lg">
            <h4 className="font-medium text-purple-900 mb-2">Status Tracking</h4>
            <p className="text-sm text-purple-700">
              Real-time status updates with progress visualization and reporting.
            </p>
          </div>
        </div>
      </div>

      {/* Compliance Matrix */}
      <ComplianceMatrixContainer framework={selectedFramework} />
    </div>
  );
};

export default ComplianceMatrixDemo;