import React, { useState } from 'react';
import { Plus, Edit, Trash2, FileText } from 'lucide-react';

interface LawfulBasis {
  id: string;
  processingActivity: string;
  dataCategory: string;
  lawfulBasis: string;
  description: string;
  dataSubjects: string;
  retentionPeriod: string;
  status: 'active' | 'inactive' | 'review';
  lastReviewed: string;
}

const LawfulBasisManager: React.FC = () => {
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingBasis, setEditingBasis] = useState<LawfulBasis | null>(null);

  const lawfulBasisOptions = [
    { value: 'consent', label: 'Consent (Article 6(1)(a))', description: 'The data subject has given consent' },
    { value: 'contract', label: 'Contract (Article 6(1)(b))', description: 'Processing is necessary for contract performance' },
    { value: 'legal_obligation', label: 'Legal Obligation (Article 6(1)(c))', description: 'Processing is necessary for compliance with legal obligation' },
    { value: 'vital_interests', label: 'Vital Interests (Article 6(1)(d))', description: 'Processing is necessary to protect vital interests' },
    { value: 'public_task', label: 'Public Task (Article 6(1)(e))', description: 'Processing is necessary for public task or official authority' },
    { value: 'legitimate_interests', label: 'Legitimate Interests (Article 6(1)(f))', description: 'Processing is necessary for legitimate interests' }
  ];

  const [lawfulBases, setLawfulBases] = useState<LawfulBasis[]>([
    {
      id: '1',
      processingActivity: 'Customer Registration',
      dataCategory: 'Personal Identifiers',
      lawfulBasis: 'contract',
      description: 'Processing customer data for account creation and service provision',
      dataSubjects: 'Customers',
      retentionPeriod: '7 years after account closure',
      status: 'active',
      lastReviewed: '2024-01-15'
    },
    {
      id: '2',
      processingActivity: 'Marketing Communications',
      dataCategory: 'Contact Information',
      lawfulBasis: 'consent',
      description: 'Sending promotional emails and newsletters to subscribers',
      dataSubjects: 'Newsletter Subscribers',
      retentionPeriod: 'Until consent withdrawn',
      status: 'active',
      lastReviewed: '2024-02-01'
    },
    {
      id: '3',
      processingActivity: 'Financial Reporting',
      dataCategory: 'Transaction Data',
      lawfulBasis: 'legal_obligation',
      description: 'Processing transaction data for tax and regulatory compliance',
      dataSubjects: 'Customers',
      retentionPeriod: '10 years',
      status: 'active',
      lastReviewed: '2024-01-30'
    }
  ]);

  const [formData, setFormData] = useState({
    processingActivity: '',
    dataCategory: '',
    lawfulBasis: '',
    description: '',
    dataSubjects: '',
    retentionPeriod: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (editingBasis) {
      setLawfulBases(prev => prev.map(basis => 
        basis.id === editingBasis.id 
          ? { ...basis, ...formData, lastReviewed: new Date().toISOString().split('T')[0] }
          : basis
      ));
      setEditingBasis(null);
    } else {
      const newBasis: LawfulBasis = {
        id: Date.now().toString(),
        ...formData,
        status: 'active',
        lastReviewed: new Date().toISOString().split('T')[0]
      };
      setLawfulBases(prev => [...prev, newBasis]);
    }
    
    setFormData({
      processingActivity: '',
      dataCategory: '',
      lawfulBasis: '',
      description: '',
      dataSubjects: '',
      retentionPeriod: ''
    });
    setShowAddForm(false);
  };

  const handleEdit = (basis: LawfulBasis) => {
    setEditingBasis(basis);
    setFormData({
      processingActivity: basis.processingActivity,
      dataCategory: basis.dataCategory,
      lawfulBasis: basis.lawfulBasis,
      description: basis.description,
      dataSubjects: basis.dataSubjects,
      retentionPeriod: basis.retentionPeriod
    });
    setShowAddForm(true);
  };

  const handleDelete = (id: string) => {
    setLawfulBases(prev => prev.filter(basis => basis.id !== id));
  };

  const getLawfulBasisLabel = (value: string) => {
    return lawfulBasisOptions.find(option => option.value === value)?.label || value;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'inactive': return 'bg-red-100 text-red-800';
      case 'review': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Lawful Basis Management</h2>
          <p className="text-gray-600 mt-1">Manage lawful basis for all processing activities under GDPR Article 6</p>
        </div>
        <button
          onClick={() => setShowAddForm(true)}
          className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Lawful Basis
        </button>
      </div>

      {/* Add/Edit Form */}
      {showAddForm && (
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            {editingBasis ? 'Edit Lawful Basis' : 'Add New Lawful Basis'}
          </h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Processing Activity
                </label>
                <input
                  type="text"
                  value={formData.processingActivity}
                  onChange={(e) => setFormData(prev => ({ ...prev, processingActivity: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Data Category
                </label>
                <input
                  type="text"
                  value={formData.dataCategory}
                  onChange={(e) => setFormData(prev => ({ ...prev, dataCategory: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Lawful Basis
              </label>
              <select
                value={formData.lawfulBasis}
                onChange={(e) => setFormData(prev => ({ ...prev, lawfulBasis: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value="">Select lawful basis...</option>
                {lawfulBasisOptions.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Data Subjects
                </label>
                <input
                  type="text"
                  value={formData.dataSubjects}
                  onChange={(e) => setFormData(prev => ({ ...prev, dataSubjects: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Retention Period
                </label>
                <input
                  type="text"
                  value={formData.retentionPeriod}
                  onChange={(e) => setFormData(prev => ({ ...prev, retentionPeriod: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
            </div>

            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => {
                  setShowAddForm(false);
                  setEditingBasis(null);
                  setFormData({
                    processingActivity: '',
                    dataCategory: '',
                    lawfulBasis: '',
                    description: '',
                    dataSubjects: '',
                    retentionPeriod: ''
                  });
                }}
                className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
              >
                {editingBasis ? 'Update' : 'Add'} Lawful Basis
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Lawful Basis List */}
      <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Current Lawful Bases</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Processing Activity
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Data Category
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Lawful Basis
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Data Subjects
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {lawfulBases.map((basis) => (
                <tr key={basis.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <FileText className="h-5 w-5 text-gray-400 mr-3" />
                      <div>
                        <div className="text-sm font-medium text-gray-900">{basis.processingActivity}</div>
                        <div className="text-sm text-gray-500">{basis.description}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {basis.dataCategory}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{getLawfulBasisLabel(basis.lawfulBasis)}</div>
                    <div className="text-sm text-gray-500">Last reviewed: {basis.lastReviewed}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {basis.dataSubjects}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(basis.status)}`}>
                      {basis.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleEdit(basis)}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(basis.id)}
                        className="text-red-600 hover:text-red-900"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default LawfulBasisManager;