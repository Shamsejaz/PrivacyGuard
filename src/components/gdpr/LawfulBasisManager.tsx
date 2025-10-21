import React, { useState } from 'react';
import { Plus, Edit, Trash2, FileText, AlertTriangle } from 'lucide-react';
import { useLawfulBasis } from '../../hooks/useGDPR';
import { LawfulBasisRecord } from '../../services/gdprService';

const LawfulBasisManager: React.FC = () => {
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingBasis, setEditingBasis] = useState<LawfulBasisRecord | null>(null);
  const { records, loading, error, createRecord, updateRecord, deleteRecord } = useLawfulBasis();

  const lawfulBasisOptions = [
    { value: 'consent', label: 'Consent (Article 6(1)(a))', description: 'The data subject has given consent' },
    { value: 'contract', label: 'Contract (Article 6(1)(b))', description: 'Processing is necessary for contract performance' },
    { value: 'legal_obligation', label: 'Legal Obligation (Article 6(1)(c))', description: 'Processing is necessary for compliance with legal obligation' },
    { value: 'vital_interests', label: 'Vital Interests (Article 6(1)(d))', description: 'Processing is necessary to protect vital interests' },
    { value: 'public_task', label: 'Public Task (Article 6(1)(e))', description: 'Processing is necessary for public task or official authority' },
    { value: 'legitimate_interests', label: 'Legitimate Interests (Article 6(1)(f))', description: 'Processing is necessary for legitimate interests' }
  ];



  const [formData, setFormData] = useState({
    processingActivity: '',
    lawfulBasis: '',
    dataCategories: [] as string[],
    purposes: [] as string[],
    dataSubjects: [] as string[],
    retentionPeriod: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (editingBasis) {
        await updateRecord(editingBasis.id, {
          processingActivity: formData.processingActivity,
          lawfulBasis: formData.lawfulBasis,
          dataCategories: formData.dataCategories,
          purposes: formData.purposes,
          dataSubjects: formData.dataSubjects,
          retentionPeriod: formData.retentionPeriod
        });
        setEditingBasis(null);
      } else {
        await createRecord({
          processingActivity: formData.processingActivity,
          lawfulBasis: formData.lawfulBasis,
          dataCategories: formData.dataCategories,
          purposes: formData.purposes,
          dataSubjects: formData.dataSubjects,
          retentionPeriod: formData.retentionPeriod
        });
      }
      
      setFormData({
        processingActivity: '',
        lawfulBasis: '',
        dataCategories: [],
        purposes: [],
        dataSubjects: [],
        retentionPeriod: ''
      });
      setShowAddForm(false);
    } catch (err) {
      console.error('Error saving lawful basis record:', err);
      // You could add a toast notification here
    }
  };

  const handleEdit = (basis: LawfulBasisRecord) => {
    setEditingBasis(basis);
    setFormData({
      processingActivity: basis.processingActivity,
      lawfulBasis: basis.lawfulBasis,
      dataCategories: basis.dataCategories,
      purposes: basis.purposes,
      dataSubjects: basis.dataSubjects,
      retentionPeriod: basis.retentionPeriod
    });
    setShowAddForm(true);
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteRecord(id);
    } catch (err) {
      console.error('Error deleting lawful basis record:', err);
      // You could add a toast notification here
    }
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-md p-4">
        <div className="flex">
          <AlertTriangle className="h-5 w-5 text-red-400" />
          <div className="ml-3">
            <h3 className="text-sm font-medium text-red-800">Error loading lawful basis records</h3>
            <p className="text-sm text-red-700 mt-1">{error}</p>
          </div>
        </div>
      </div>
    );
  }

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
                  Data Categories (comma-separated)
                </label>
                <input
                  type="text"
                  value={formData.dataCategories.join(', ')}
                  onChange={(e) => setFormData(prev => ({ ...prev, dataCategories: e.target.value.split(',').map(s => s.trim()) }))}
                  placeholder="e.g., Personal Identifiers, Contact Information"
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
                Purposes (comma-separated)
              </label>
              <textarea
                value={formData.purposes.join(', ')}
                onChange={(e) => setFormData(prev => ({ ...prev, purposes: e.target.value.split(',').map(s => s.trim()) }))}
                rows={3}
                placeholder="e.g., Account creation, Service provision, Customer support"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Data Subjects (comma-separated)
                </label>
                <input
                  type="text"
                  value={formData.dataSubjects.join(', ')}
                  onChange={(e) => setFormData(prev => ({ ...prev, dataSubjects: e.target.value.split(',').map(s => s.trim()) }))}
                  placeholder="e.g., Customers, Employees, Prospects"
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
                    lawfulBasis: '',
                    dataCategories: [],
                    purposes: [],
                    dataSubjects: [],
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
              {records.map((basis) => (
                <tr key={basis.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <FileText className="h-5 w-5 text-gray-400 mr-3" />
                      <div>
                        <div className="text-sm font-medium text-gray-900">{basis.processingActivity}</div>
                        <div className="text-sm text-gray-500">{basis.purposes.join(', ')}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {basis.dataCategories.join(', ')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{getLawfulBasisLabel(basis.lawfulBasis)}</div>
                    <div className="text-sm text-gray-500">Last reviewed: {basis.reviewDate ? new Date(basis.reviewDate).toLocaleDateString() : 'Not reviewed'}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {basis.dataSubjects.join(', ')}
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