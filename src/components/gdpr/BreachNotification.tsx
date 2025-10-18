import React, { useState } from 'react';
import { Plus, AlertTriangle, Clock, CheckCircle, FileText, Send } from 'lucide-react';

interface DataBreach {
  id: string;
  title: string;
  description: string;
  discoveryDate: string;
  reportedDate?: string;
  severity: 'low' | 'medium' | 'high';
  status: 'discovered' | 'assessed' | 'reported' | 'resolved';
  affectedDataSubjects: number;
  dataCategories: string[];
  likelyConsequences: string;
  mitigationMeasures: string[];
  supervisoryAuthorityNotified: boolean;
  dataSubjectsNotified: boolean;
  notificationDeadline: string;
  assignedTo: string;
}

const BreachNotification: React.FC = () => {
  const [showAddForm, setShowAddForm] = useState(false);
  
  const [breaches, setBreaches] = useState<DataBreach[]>([
    {
      id: '1',
      title: 'Email Database Unauthorized Access',
      description: 'Unauthorized access to customer email database through compromised admin credentials',
      discoveryDate: '2024-02-15',
      reportedDate: '2024-02-16',
      severity: 'high',
      status: 'reported',
      affectedDataSubjects: 15000,
      dataCategories: ['Email addresses', 'Names', 'Subscription preferences'],
      likelyConsequences: 'Potential spam emails, phishing attempts targeting affected users',
      mitigationMeasures: [
        'Immediate password reset for all admin accounts',
        'Enhanced access controls implemented',
        'Security audit conducted',
        'Affected users notified'
      ],
      supervisoryAuthorityNotified: true,
      dataSubjectsNotified: true,
      notificationDeadline: '2024-02-18',
      assignedTo: 'Sarah Johnson (DPO)'
    },
    {
      id: '2',
      title: 'Payment Processing System Glitch',
      description: 'System error exposed payment card details in transaction logs',
      discoveryDate: '2024-02-10',
      reportedDate: '2024-02-11',
      severity: 'high',
      status: 'resolved',
      affectedDataSubjects: 250,
      dataCategories: ['Payment card numbers', 'Expiry dates', 'Transaction amounts'],
      likelyConsequences: 'Risk of financial fraud, identity theft',
      mitigationMeasures: [
        'Immediate system patch applied',
        'Log files secured and encrypted',
        'Payment processor notified',
        'Credit monitoring offered to affected customers'
      ],
      supervisoryAuthorityNotified: true,
      dataSubjectsNotified: true,
      notificationDeadline: '2024-02-13',
      assignedTo: 'Michael Chen (Security)'
    },
    {
      id: '3',
      title: 'Employee Data Misdirection',
      description: 'HR report containing employee personal data sent to wrong recipient',
      discoveryDate: '2024-02-08',
      severity: 'medium',
      status: 'assessed',
      affectedDataSubjects: 45,
      dataCategories: ['Employee names', 'Salaries', 'Performance ratings'],
      likelyConsequences: 'Privacy violation, potential workplace discrimination',
      mitigationMeasures: [
        'Recipient confirmed data deletion',
        'Email recall attempted',
        'Enhanced email verification procedures',
        'Staff training scheduled'
      ],
      supervisoryAuthorityNotified: false,
      dataSubjectsNotified: true,
      notificationDeadline: '2024-02-11',
      assignedTo: 'Lisa Wong (HR)'
    }
  ]);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    discoveryDate: '',
    severity: 'medium' as 'low' | 'medium' | 'high',
    affectedDataSubjects: '',
    dataCategories: '',
    likelyConsequences: '',
    mitigationMeasures: '',
    assignedTo: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const notificationDeadline = new Date(formData.discoveryDate);
    notificationDeadline.setDate(notificationDeadline.getDate() + 3); // 72 hours
    
    const newBreach: DataBreach = {
      id: Date.now().toString(),
      title: formData.title,
      description: formData.description,
      discoveryDate: formData.discoveryDate,
      severity: formData.severity,
      status: 'discovered',
      affectedDataSubjects: parseInt(formData.affectedDataSubjects),
      dataCategories: formData.dataCategories.split(',').map(c => c.trim()),
      likelyConsequences: formData.likelyConsequences,
      mitigationMeasures: formData.mitigationMeasures.split(',').map(m => m.trim()),
      supervisoryAuthorityNotified: false,
      dataSubjectsNotified: false,
      notificationDeadline: notificationDeadline.toISOString().split('T')[0],
      assignedTo: formData.assignedTo
    };
    
    setBreaches(prev => [...prev, newBreach]);
    setFormData({
      title: '',
      description: '',
      discoveryDate: '',
      severity: 'medium',
      affectedDataSubjects: '',
      dataCategories: '',
      likelyConsequences: '',
      mitigationMeasures: '',
      assignedTo: ''
    });
    setShowAddForm(false);
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high': return 'bg-red-100 text-red-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'resolved': return 'bg-green-100 text-green-800';
      case 'reported': return 'bg-blue-100 text-blue-800';
      case 'assessed': return 'bg-yellow-100 text-yellow-800';
      case 'discovered': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'resolved': return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'reported': return <Send className="h-5 w-5 text-blue-600" />;
      case 'assessed': return <FileText className="h-5 w-5 text-yellow-600" />;
      case 'discovered': return <AlertTriangle className="h-5 w-5 text-red-600" />;
      default: return <Clock className="h-5 w-5 text-gray-600" />;
    }
  };

  const isDeadlineApproaching = (deadline: string) => {
    const deadlineDate = new Date(deadline);
    const now = new Date();
    const hoursUntilDeadline = (deadlineDate.getTime() - now.getTime()) / (1000 * 60 * 60);
    return hoursUntilDeadline <= 24 && hoursUntilDeadline > 0;
  };

  const isDeadlinePassed = (deadline: string) => {
    const deadlineDate = new Date(deadline);
    const now = new Date();
    return now > deadlineDate;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Data Breach Notification</h2>
          <p className="text-gray-600 mt-1">Manage data breach incidents and GDPR Article 33/34 notifications</p>
        </div>
        <button
          onClick={() => setShowAddForm(true)}
          className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700"
        >
          <Plus className="h-4 w-4 mr-2" />
          Report Breach
        </button>
      </div>

      {/* Breach Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg shadow-sm border">
          <div className="flex items-center">
            <AlertTriangle className="h-8 w-8 text-red-600" />
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-600">Total Breaches</p>
              <p className="text-2xl font-bold text-gray-900">{breaches.length}</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm border">
          <div className="flex items-center">
            <Clock className="h-8 w-8 text-yellow-600" />
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-600">Pending</p>
              <p className="text-2xl font-bold text-gray-900">
                {breaches.filter(b => b.status !== 'resolved').length}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm border">
          <div className="flex items-center">
            <Send className="h-8 w-8 text-blue-600" />
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-600">Reported</p>
              <p className="text-2xl font-bold text-gray-900">
                {breaches.filter(b => b.supervisoryAuthorityNotified).length}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm border">
          <div className="flex items-center">
            <CheckCircle className="h-8 w-8 text-green-600" />
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-600">Resolved</p>
              <p className="text-2xl font-bold text-gray-900">
                {breaches.filter(b => b.status === 'resolved').length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Add Breach Form */}
      {showAddForm && (
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Report New Data Breach</h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Breach Title *
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description *
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Discovery Date *
                </label>
                <input
                  type="date"
                  value={formData.discoveryDate}
                  onChange={(e) => setFormData(prev => ({ ...prev, discoveryDate: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Severity *
                </label>
                <select
                  value={formData.severity}
                  onChange={(e) => setFormData(prev => ({ ...prev, severity: e.target.value as 'low' | 'medium' | 'high' }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                  required
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Affected Data Subjects *
                </label>
                <input
                  type="number"
                  value={formData.affectedDataSubjects}
                  onChange={(e) => setFormData(prev => ({ ...prev, affectedDataSubjects: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Data Categories (comma-separated) *
              </label>
              <input
                type="text"
                value={formData.dataCategories}
                onChange={(e) => setFormData(prev => ({ ...prev, dataCategories: e.target.value }))}
                placeholder="e.g., Email addresses, Names, Payment information"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Likely Consequences *
              </label>
              <textarea
                value={formData.likelyConsequences}
                onChange={(e) => setFormData(prev => ({ ...prev, likelyConsequences: e.target.value }))}
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Mitigation Measures (comma-separated) *
              </label>
              <textarea
                value={formData.mitigationMeasures}
                onChange={(e) => setFormData(prev => ({ ...prev, mitigationMeasures: e.target.value }))}
                rows={3}
                placeholder="e.g., Password reset, System patch, User notification"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Assigned To *
              </label>
              <input
                type="text"
                value={formData.assignedTo}
                onChange={(e) => setFormData(prev => ({ ...prev, assignedTo: e.target.value }))}
                placeholder="e.g., John Doe (DPO)"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                required
              />
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
                className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700"
              >
                Report Breach
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Breaches List */}
      <div className="bg-white rounded-lg shadow-sm border">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Data Breach Incidents</h3>
        </div>
        <div className="divide-y divide-gray-200">
          {breaches.map((breach) => (
            <div key={breach.id} className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-3">
                    {getStatusIcon(breach.status)}
                    <h4 className="text-lg font-medium text-gray-900">{breach.title}</h4>
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getSeverityColor(breach.severity)}`}>
                      {breach.severity} severity
                    </span>
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(breach.status)}`}>
                      {breach.status}
                    </span>
                  </div>
                  
                  <p className="text-gray-600 mt-2">{breach.description}</p>
                  
                  <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                    <div>
                      <span className="font-medium text-gray-700">Discovery Date:</span>
                      <p className="text-gray-600">{breach.discoveryDate}</p>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700">Affected Data Subjects:</span>
                      <p className="text-gray-600">{breach.affectedDataSubjects.toLocaleString()}</p>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700">Assigned To:</span>
                      <p className="text-gray-600">{breach.assignedTo}</p>
                    </div>
                  </div>

                  <div className="mt-4">
                    <span className="font-medium text-gray-700 text-sm">Data Categories:</span>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {breach.dataCategories.map((category, index) => (
                        <span key={index} className="inline-flex px-2 py-1 text-xs bg-red-100 text-red-800 rounded-full">
                          {category}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="font-medium text-gray-700">Notification Status:</span>
                      <div className="mt-1 space-y-1">
                        <div className="flex items-center">
                          {breach.supervisoryAuthorityNotified ? (
                            <CheckCircle className="h-4 w-4 text-green-600 mr-2" />
                          ) : (
                            <Clock className="h-4 w-4 text-yellow-600 mr-2" />
                          )}
                          <span className="text-gray-600">Supervisory Authority</span>
                        </div>
                        <div className="flex items-center">
                          {breach.dataSubjectsNotified ? (
                            <CheckCircle className="h-4 w-4 text-green-600 mr-2" />
                          ) : (
                            <Clock className="h-4 w-4 text-yellow-600 mr-2" />
                          )}
                          <span className="text-gray-600">Data Subjects</span>
                        </div>
                      </div>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700">Notification Deadline:</span>
                      <p className={`text-sm mt-1 ${
                        isDeadlinePassed(breach.notificationDeadline) ? 'text-red-600 font-medium' :
                        isDeadlineApproaching(breach.notificationDeadline) ? 'text-yellow-600 font-medium' :
                        'text-gray-600'
                      }`}>
                        {breach.notificationDeadline}
                        {isDeadlinePassed(breach.notificationDeadline) && ' (OVERDUE)'}
                        {isDeadlineApproaching(breach.notificationDeadline) && ' (URGENT)'}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4">
                    <span className="font-medium text-gray-700 text-sm">Mitigation Measures:</span>
                    <ul className="list-disc list-inside text-gray-600 mt-1 text-sm">
                      {breach.mitigationMeasures.map((measure, index) => (
                        <li key={index}>{measure}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default BreachNotification;