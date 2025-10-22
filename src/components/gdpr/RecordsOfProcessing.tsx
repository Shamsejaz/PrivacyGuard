import React, { useState } from 'react';
import { Plus, FileText, Building, Users, Calendar, Download } from 'lucide-react';

interface ProcessingRecord {
  id: string;
  activityName: string;
  controller: string;
  processor?: string;
  purposes: string[];
  lawfulBasis: string;
  dataCategories: string[];
  dataSubjects: string[];
  recipients: string[];
  thirdCountryTransfers: boolean;
  retentionPeriod: string;
  technicalMeasures: string[];
  organisationalMeasures: string[];
  lastUpdated: string;
}

const RecordsOfProcessing: React.FC = () => {
  const [showAddForm, setShowAddForm] = useState(false);
  
  const [records, setRecords] = useState<ProcessingRecord[]>([
    {
      id: '1',
      activityName: 'Customer Registration and Account Management',
      controller: 'PrivacyComply Ltd.',
      processor: 'Cloud Services Provider',
      purposes: ['Account creation', 'Service provision', 'Customer support'],
      lawfulBasis: 'Contract (Article 6(1)(b))',
      dataCategories: ['Name', 'Email', 'Phone', 'Address', 'Payment information'],
      dataSubjects: ['Customers', 'Prospects'],
      recipients: ['Payment processors', 'Customer support team'],
      thirdCountryTransfers: true,
      retentionPeriod: '7 years after account closure',
      technicalMeasures: ['Encryption at rest', 'Encryption in transit', 'Access controls'],
      organisationalMeasures: ['Staff training', 'Data handling procedures', 'Regular audits'],
      lastUpdated: '2024-02-01'
    },
    {
      id: '2',
      activityName: 'Marketing Communications',
      controller: 'PrivacyComply Ltd.',
      purposes: ['Newsletter distribution', 'Product updates', 'Promotional campaigns'],
      lawfulBasis: 'Consent (Article 6(1)(a))',
      dataCategories: ['Name', 'Email', 'Communication preferences'],
      dataSubjects: ['Newsletter subscribers', 'Marketing contacts'],
      recipients: ['Email service provider', 'Marketing team'],
      thirdCountryTransfers: false,
      retentionPeriod: 'Until consent withdrawn',
      technicalMeasures: ['Email encryption', 'Secure databases'],
      organisationalMeasures: ['Consent management', 'Opt-out procedures'],
      lastUpdated: '2024-01-15'
    },
    {
      id: '3',
      activityName: 'Employee Data Management',
      controller: 'PrivacyComply Ltd.',
      purposes: ['HR management', 'Payroll processing', 'Performance evaluation'],
      lawfulBasis: 'Contract (Article 6(1)(b)) / Legal obligation (Article 6(1)(c))',
      dataCategories: ['Personal details', 'Employment history', 'Salary information', 'Performance data'],
      dataSubjects: ['Employees', 'Job applicants'],
      recipients: ['Payroll provider', 'HR team', 'Management'],
      thirdCountryTransfers: false,
      retentionPeriod: '7 years after employment ends',
      technicalMeasures: ['HR system access controls', 'Data encryption'],
      organisationalMeasures: ['HR policies', 'Confidentiality agreements'],
      lastUpdated: '2024-01-30'
    }
  ]);

  const [formData, setFormData] = useState({
    activityName: '',
    controller: '',
    processor: '',
    purposes: '',
    lawfulBasis: '',
    dataCategories: '',
    dataSubjects: '',
    recipients: '',
    thirdCountryTransfers: false,
    retentionPeriod: '',
    technicalMeasures: '',
    organisationalMeasures: ''
  });

  const lawfulBasisOptions = [
    'Consent (Article 6(1)(a))',
    'Contract (Article 6(1)(b))',
    'Legal obligation (Article 6(1)(c))',
    'Vital interests (Article 6(1)(d))',
    'Public task (Article 6(1)(e))',
    'Legitimate interests (Article 6(1)(f))'
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const newRecord: ProcessingRecord = {
      id: Date.now().toString(),
      activityName: formData.activityName,
      controller: formData.controller,
      processor: formData.processor || undefined,
      purposes: formData.purposes.split(',').map(p => p.trim()),
      lawfulBasis: formData.lawfulBasis,
      dataCategories: formData.dataCategories.split(',').map(c => c.trim()),
      dataSubjects: formData.dataSubjects.split(',').map(s => s.trim()),
      recipients: formData.recipients.split(',').map(r => r.trim()),
      thirdCountryTransfers: formData.thirdCountryTransfers,
      retentionPeriod: formData.retentionPeriod,
      technicalMeasures: formData.technicalMeasures.split(',').map(m => m.trim()),
      organisationalMeasures: formData.organisationalMeasures.split(',').map(m => m.trim()),
      lastUpdated: new Date().toISOString().split('T')[0]
    };
    
    setRecords(prev => [...prev, newRecord]);
    setFormData({
      activityName: '',
      controller: '',
      processor: '',
      purposes: '',
      lawfulBasis: '',
      dataCategories: '',
      dataSubjects: '',
      recipients: '',
      thirdCountryTransfers: false,
      retentionPeriod: '',
      technicalMeasures: '',
      organisationalMeasures: ''
    });
    setShowAddForm(false);
  };

  const exportRecords = () => {
    const csvContent = [
      ['Activity Name', 'Controller', 'Processor', 'Purposes', 'Lawful Basis', 'Data Categories', 'Data Subjects', 'Recipients', 'Third Country Transfers', 'Retention Period', 'Technical Measures', 'Organisational Measures', 'Last Updated'],
      ...records.map(record => [
        record.activityName,
        record.controller,
        record.processor || '',
        record.purposes.join('; '),
        record.lawfulBasis,
        record.dataCategories.join('; '),
        record.dataSubjects.join('; '),
        record.recipients.join('; '),
        record.thirdCountryTransfers ? 'Yes' : 'No',
        record.retentionPeriod,
        record.technicalMeasures.join('; '),
        record.organisationalMeasures.join('; '),
        record.lastUpdated
      ])
    ].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'records-of-processing.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Records of Processing Activities</h2>
          <p className="text-gray-600 mt-1">Maintain comprehensive records as required by GDPR Article 30</p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={exportRecords}
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
          >
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </button>
          <button
            onClick={() => setShowAddForm(true)}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Record
          </button>
        </div>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg shadow-sm border">
          <div className="flex items-center">
            <FileText className="h-8 w-8 text-blue-600" />
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-600">Total Records</p>
              <p className="text-2xl font-bold text-gray-900">{records.length}</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm border">
          <div className="flex items-center">
            <Building className="h-8 w-8 text-green-600" />
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-600">Controllers</p>
              <p className="text-2xl font-bold text-gray-900">
                {new Set(records.map(r => r.controller)).size}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm border">
          <div className="flex items-center">
            <Users className="h-8 w-8 text-purple-600" />
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-600">Data Subject Types</p>
              <p className="text-2xl font-bold text-gray-900">
                {new Set(records.flatMap(r => r.dataSubjects)).size}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm border">
          <div className="flex items-center">
            <Calendar className="h-8 w-8 text-orange-600" />
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-600">Third Country Transfers</p>
              <p className="text-2xl font-bold text-gray-900">
                {records.filter(r => r.thirdCountryTransfers).length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Add Record Form */}
      {showAddForm && (
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Add New Processing Record</h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Activity Name *
                </label>
                <input
                  type="text"
                  value={formData.activityName}
                  onChange={(e) => setFormData(prev => ({ ...prev, activityName: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Controller *
                </label>
                <input
                  type="text"
                  value={formData.controller}
                  onChange={(e) => setFormData(prev => ({ ...prev, controller: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Processor (optional)
              </label>
              <input
                type="text"
                value={formData.processor}
                onChange={(e) => setFormData(prev => ({ ...prev, processor: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Purposes (comma-separated) *
              </label>
              <input
                type="text"
                value={formData.purposes}
                onChange={(e) => setFormData(prev => ({ ...prev, purposes: e.target.value }))}
                placeholder="e.g., Account creation, Service provision, Customer support"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Lawful Basis *
              </label>
              <select
                value={formData.lawfulBasis}
                onChange={(e) => setFormData(prev => ({ ...prev, lawfulBasis: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value="">Select lawful basis...</option>
                {lawfulBasisOptions.map(option => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Data Categories (comma-separated) *
                </label>
                <input
                  type="text"
                  value={formData.dataCategories}
                  onChange={(e) => setFormData(prev => ({ ...prev, dataCategories: e.target.value }))}
                  placeholder="e.g., Name, Email, Phone, Address"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Data Subjects (comma-separated) *
                </label>
                <input
                  type="text"
                  value={formData.dataSubjects}
                  onChange={(e) => setFormData(prev => ({ ...prev, dataSubjects: e.target.value }))}
                  placeholder="e.g., Customers, Employees, Prospects"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Recipients (comma-separated) *
              </label>
              <input
                type="text"
                value={formData.recipients}
                onChange={(e) => setFormData(prev => ({ ...prev, recipients: e.target.value }))}
                placeholder="e.g., Payment processors, Customer support team"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="thirdCountryTransfers"
                checked={formData.thirdCountryTransfers}
                onChange={(e) => setFormData(prev => ({ ...prev, thirdCountryTransfers: e.target.checked }))}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="thirdCountryTransfers" className="ml-2 block text-sm text-gray-700">
                Third country transfers
              </label>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Retention Period *
              </label>
              <input
                type="text"
                value={formData.retentionPeriod}
                onChange={(e) => setFormData(prev => ({ ...prev, retentionPeriod: e.target.value }))}
                placeholder="e.g., 7 years after account closure"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Technical Measures (comma-separated) *
                </label>
                <textarea
                  value={formData.technicalMeasures}
                  onChange={(e) => setFormData(prev => ({ ...prev, technicalMeasures: e.target.value }))}
                  rows={3}
                  placeholder="e.g., Encryption at rest, Access controls, Secure databases"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Organisational Measures (comma-separated) *
                </label>
                <textarea
                  value={formData.organisationalMeasures}
                  onChange={(e) => setFormData(prev => ({ ...prev, organisationalMeasures: e.target.value }))}
                  rows={3}
                  placeholder="e.g., Staff training, Data handling procedures, Regular audits"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
            </div>

            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
              >
                Add Record
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Records List */}
      <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Processing Records</h3>
        </div>
        <div className="divide-y divide-gray-200">
          {records.map((record) => (
            <div key={record.id} className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h4 className="text-lg font-medium text-gray-900">{record.activityName}</h4>
                  <p className="text-sm text-gray-600 mt-1">Controller: {record.controller}</p>
                  {record.processor && (
                    <p className="text-sm text-gray-600">Processor: {record.processor}</p>
                  )}
                  
                  <div className="mt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
                    <div>
                      <span className="font-medium text-gray-700">Purposes:</span>
                      <ul className="text-gray-600 mt-1">
                        {record.purposes.map((purpose, index) => (
                          <li key={index}>• {purpose}</li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700">Lawful Basis:</span>
                      <p className="text-gray-600 mt-1">{record.lawfulBasis}</p>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700">Retention:</span>
                      <p className="text-gray-600 mt-1">{record.retentionPeriod}</p>
                    </div>
                  </div>

                  <div className="mt-4">
                    <span className="font-medium text-gray-700 text-sm">Data Categories:</span>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {record.dataCategories.map((category, index) => (
                        <span key={index} className="inline-flex px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full">
                          {category}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="mt-2">
                    <span className="font-medium text-gray-700 text-sm">Data Subjects:</span>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {record.dataSubjects.map((subject, index) => (
                        <span key={index} className="inline-flex px-2 py-1 text-xs bg-green-100 text-green-800 rounded-full">
                          {subject}
                        </span>
                      ))}
                    </div>
                  </div>

                  {record.thirdCountryTransfers && (
                    <div className="mt-2">
                      <span className="inline-flex px-2 py-1 text-xs bg-red-100 text-red-800 rounded-full">
                        Third Country Transfers
                      </span>
                    </div>
                  )}
                </div>
                
                <div className="ml-4 text-sm text-gray-500">
                  Last updated: {record.lastUpdated}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default RecordsOfProcessing;
