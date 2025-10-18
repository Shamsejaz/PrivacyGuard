import React, { useState } from 'react';
import { Plus, FileText, AlertTriangle, CheckCircle, Clock, Eye } from 'lucide-react';

interface DPIA {
  id: string;
  title: string;
  description: string;
  processingType: string;
  riskLevel: 'low' | 'medium' | 'high';
  status: 'draft' | 'in_review' | 'approved' | 'requires_consultation';
  createdDate: string;
  completedDate?: string;
  reviewer: string;
  dataCategories: string[];
  mitigationMeasures: string[];
  residualRisk: 'low' | 'medium' | 'high';
}

const DataProtectionImpactAssessment: React.FC = () => {
  const [showNewDPIA, setShowNewDPIA] = useState(false);
  const [selectedDPIA, setSelectedDPIA] = useState<DPIA | null>(null);

  const [dpias, setDpias] = useState<DPIA[]>([
    {
      id: '1',
      title: 'Customer Analytics Platform',
      description: 'Implementation of advanced customer behavior analytics using AI/ML',
      processingType: 'Automated Decision Making',
      riskLevel: 'high',
      status: 'approved',
      createdDate: '2024-01-15',
      completedDate: '2024-02-01',
      reviewer: 'Sarah Johnson (DPO)',
      dataCategories: ['Personal Identifiers', 'Behavioral Data', 'Transaction History'],
      mitigationMeasures: [
        'Implement data minimization principles',
        'Regular algorithm auditing',
        'User consent management',
        'Data anonymization where possible'
      ],
      residualRisk: 'medium'
    },
    {
      id: '2',
      title: 'Employee Monitoring System',
      description: 'Deployment of workplace monitoring software for productivity tracking',
      processingType: 'Systematic Monitoring',
      riskLevel: 'high',
      status: 'in_review',
      createdDate: '2024-02-10',
      reviewer: 'Michael Chen (Legal)',
      dataCategories: ['Employee Data', 'Activity Logs', 'Location Data'],
      mitigationMeasures: [
        'Clear employee notification',
        'Purpose limitation enforcement',
        'Regular data deletion',
        'Access controls implementation'
      ],
      residualRisk: 'medium'
    },
    {
      id: '3',
      title: 'Marketing Automation Enhancement',
      description: 'Upgrade to marketing automation platform with enhanced profiling',
      processingType: 'Profiling',
      riskLevel: 'medium',
      status: 'draft',
      createdDate: '2024-02-15',
      reviewer: 'Not assigned',
      dataCategories: ['Contact Information', 'Preferences', 'Engagement Data'],
      mitigationMeasures: [
        'Opt-in consent collection',
        'Profile accuracy controls',
        'Easy opt-out mechanisms'
      ],
      residualRisk: 'low'
    }
  ]);

  const [newDPIA, setNewDPIA] = useState({
    title: '',
    description: '',
    processingType: '',
    dataCategories: '',
    mitigationMeasures: ''
  });

  const processingTypes = [
    'Automated Decision Making',
    'Systematic Monitoring',
    'Profiling',
    'Large Scale Processing',
    'Special Category Data',
    'Biometric Processing',
    'Genetic Processing',
    'Location Tracking',
    'Vulnerable Groups',
    'New Technology'
  ];

  const handleCreateDPIA = (e: React.FormEvent) => {
    e.preventDefault();
    
    const dpia: DPIA = {
      id: Date.now().toString(),
      title: newDPIA.title,
      description: newDPIA.description,
      processingType: newDPIA.processingType,
      riskLevel: 'medium', // Default, would be assessed
      status: 'draft',
      createdDate: new Date().toISOString().split('T')[0],
      reviewer: 'Not assigned',
      dataCategories: newDPIA.dataCategories.split(',').map(cat => cat.trim()),
      mitigationMeasures: newDPIA.mitigationMeasures.split(',').map(measure => measure.trim()),
      residualRisk: 'medium'
    };
    
    setDpias(prev => [...prev, dpia]);
    setNewDPIA({
      title: '',
      description: '',
      processingType: '',
      dataCategories: '',
      mitigationMeasures: ''
    });
    setShowNewDPIA(false);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'bg-green-100 text-green-800';
      case 'in_review': return 'bg-yellow-100 text-yellow-800';
      case 'draft': return 'bg-gray-100 text-gray-800';
      case 'requires_consultation': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'high': return 'bg-red-100 text-red-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved': return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'in_review': return <Clock className="h-5 w-5 text-yellow-600" />;
      case 'draft': return <FileText className="h-5 w-5 text-gray-600" />;
      case 'requires_consultation': return <AlertTriangle className="h-5 w-5 text-red-600" />;
      default: return <FileText className="h-5 w-5 text-gray-600" />;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Data Protection Impact Assessments</h2>
          <p className="text-gray-600 mt-1">Assess and mitigate privacy risks for high-risk processing activities</p>
        </div>
        <button
          onClick={() => setShowNewDPIA(true)}
          className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
        >
          <Plus className="h-4 w-4 mr-2" />
          New DPIA
        </button>
      </div>

      {/* DPIA Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg shadow-sm border">
          <div className="flex items-center">
            <FileText className="h-8 w-8 text-blue-600" />
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-600">Total DPIAs</p>
              <p className="text-2xl font-bold text-gray-900">{dpias.length}</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm border">
          <div className="flex items-center">
            <CheckCircle className="h-8 w-8 text-green-600" />
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-600">Approved</p>
              <p className="text-2xl font-bold text-gray-900">
                {dpias.filter(d => d.status === 'approved').length}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm border">
          <div className="flex items-center">
            <Clock className="h-8 w-8 text-yellow-600" />
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-600">In Review</p>
              <p className="text-2xl font-bold text-gray-900">
                {dpias.filter(d => d.status === 'in_review').length}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm border">
          <div className="flex items-center">
            <AlertTriangle className="h-8 w-8 text-red-600" />
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-600">High Risk</p>
              <p className="text-2xl font-bold text-gray-900">
                {dpias.filter(d => d.riskLevel === 'high').length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* New DPIA Form */}
      {showNewDPIA && (
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Create New DPIA</h3>
          <form onSubmit={handleCreateDPIA} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                DPIA Title
              </label>
              <input
                type="text"
                value={newDPIA.title}
                onChange={(e) => setNewDPIA(prev => ({ ...prev, title: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                value={newDPIA.description}
                onChange={(e) => setNewDPIA(prev => ({ ...prev, description: e.target.value }))}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Processing Type
              </label>
              <select
                value={newDPIA.processingType}
                onChange={(e) => setNewDPIA(prev => ({ ...prev, processingType: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value="">Select processing type...</option>
                {processingTypes.map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Data Categories (comma-separated)
              </label>
              <input
                type="text"
                value={newDPIA.dataCategories}
                onChange={(e) => setNewDPIA(prev => ({ ...prev, dataCategories: e.target.value }))}
                placeholder="e.g., Personal Identifiers, Behavioral Data, Location Data"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Mitigation Measures (comma-separated)
              </label>
              <textarea
                value={newDPIA.mitigationMeasures}
                onChange={(e) => setNewDPIA(prev => ({ ...prev, mitigationMeasures: e.target.value }))}
                rows={3}
                placeholder="e.g., Data minimization, Access controls, Regular audits"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => setShowNewDPIA(false)}
                className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
              >
                Create DPIA
              </button>
            </div>
          </form>
        </div>
      )}

      {/* DPIA List */}
      <div className="bg-white rounded-lg shadow-sm border">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Current DPIAs</h3>
        </div>
        <div className="divide-y divide-gray-200">
          {dpias.map((dpia) => (
            <div key={dpia.id} className="p-6 hover:bg-gray-50">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-3">
                    {getStatusIcon(dpia.status)}
                    <h4 className="text-lg font-medium text-gray-900">{dpia.title}</h4>
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(dpia.status)}`}>
                      {dpia.status.replace('_', ' ')}
                    </span>
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getRiskColor(dpia.riskLevel)}`}>
                      {dpia.riskLevel} risk
                    </span>
                  </div>
                  <p className="text-gray-600 mt-2">{dpia.description}</p>
                  
                  <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                    <div>
                      <span className="font-medium text-gray-700">Processing Type:</span>
                      <p className="text-gray-600">{dpia.processingType}</p>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700">Reviewer:</span>
                      <p className="text-gray-600">{dpia.reviewer}</p>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700">Created:</span>
                      <p className="text-gray-600">{dpia.createdDate}</p>
                    </div>
                  </div>

                  <div className="mt-4">
                    <span className="font-medium text-gray-700 text-sm">Data Categories:</span>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {dpia.dataCategories.map((category, index) => (
                        <span key={index} className="inline-flex px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full">
                          {category}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
                
                <button
                  onClick={() => setSelectedDPIA(dpia)}
                  className="ml-4 inline-flex items-center px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  <Eye className="h-4 w-4 mr-2" />
                  View Details
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* DPIA Detail Modal */}
      {selectedDPIA && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-1/2 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">{selectedDPIA.title}</h3>
                <button
                  onClick={() => setSelectedDPIA(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ×
                </button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <h4 className="font-medium text-gray-700">Description</h4>
                  <p className="text-gray-600 mt-1">{selectedDPIA.description}</p>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-medium text-gray-700">Processing Type</h4>
                    <p className="text-gray-600 mt-1">{selectedDPIA.processingType}</p>
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-700">Risk Level</h4>
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getRiskColor(selectedDPIA.riskLevel)}`}>
                      {selectedDPIA.riskLevel}
                    </span>
                  </div>
                </div>
                
                <div>
                  <h4 className="font-medium text-gray-700">Mitigation Measures</h4>
                  <ul className="list-disc list-inside text-gray-600 mt-1 space-y-1">
                    {selectedDPIA.mitigationMeasures.map((measure, index) => (
                      <li key={index}>{measure}</li>
                    ))}
                  </ul>
                </div>
                
                <div>
                  <h4 className="font-medium text-gray-700">Residual Risk</h4>
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getRiskColor(selectedDPIA.residualRisk)}`}>
                    {selectedDPIA.residualRisk}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DataProtectionImpactAssessment;