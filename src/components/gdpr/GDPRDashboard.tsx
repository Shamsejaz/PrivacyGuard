import React, { useState } from 'react';
import { Shield, FileText, Users, Clock, AlertTriangle, CheckCircle, Eye, Settings } from 'lucide-react';
import LawfulBasisManager from './LawfulBasisManager';
import DataProtectionImpactAssessment from './DataProtectionImpactAssessment';
import RecordsOfProcessing from './RecordsOfProcessing';
import BreachNotification from './BreachNotification';
import DataPortability from './DataPortability';
import GDPRComplianceMatrix from './GDPRComplianceMatrix';

const GDPRDashboard: React.FC = () => {
  const [activeSubTab, setActiveSubTab] = useState('overview');

  const complianceStats = {
    overallScore: 87,
    lawfulBasisCoverage: 92,
    dpiasCompleted: 15,
    recordsOfProcessing: 23,
    breachResponseTime: '< 72h',
    dataPortabilityRequests: 8
  };

  const recentActivities = [
    { id: 1, type: 'DPIA', description: 'Marketing automation DPIA completed', timestamp: '2 hours ago', status: 'completed' },
    { id: 2, type: 'Breach', description: 'Data breach notification submitted to supervisory authority', timestamp: '1 day ago', status: 'submitted' },
    { id: 3, type: 'Lawful Basis', description: 'Updated lawful basis for customer analytics', timestamp: '3 days ago', status: 'updated' },
    { id: 4, type: 'Records', description: 'New processing activity added to records', timestamp: '5 days ago', status: 'added' }
  ];

  const renderSubContent = () => {
    switch (activeSubTab) {
      case 'lawful-basis':
        return <LawfulBasisManager />;
      case 'dpia':
        return <DataProtectionImpactAssessment />;
      case 'records':
        return <RecordsOfProcessing />;
      case 'breach':
        return <BreachNotification />;
      case 'portability':
        return <DataPortability />;
      case 'compliance-matrix':
        return <GDPRComplianceMatrix />;
      default:
        return (
          <div className="space-y-6">
            {/* GDPR Compliance Overview */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="bg-white p-6 rounded-lg shadow-sm border">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Overall GDPR Score</p>
                    <p className="text-3xl font-bold text-green-600">{complianceStats.overallScore}%</p>
                  </div>
                  <Shield className="h-8 w-8 text-green-600" />
                </div>
                <div className="mt-4">
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-green-600 h-2 rounded-full" 
                      style={{ width: `${complianceStats.overallScore}%` }}
                    ></div>
                  </div>
                </div>
              </div>

              <div className="bg-white p-6 rounded-lg shadow-sm border">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Lawful Basis Coverage</p>
                    <p className="text-3xl font-bold text-blue-600">{complianceStats.lawfulBasisCoverage}%</p>
                  </div>
                  <FileText className="h-8 w-8 text-blue-600" />
                </div>
                <p className="text-sm text-gray-500 mt-2">All processing activities covered</p>
              </div>

              <div className="bg-white p-6 rounded-lg shadow-sm border">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">DPIAs Completed</p>
                    <p className="text-3xl font-bold text-purple-600">{complianceStats.dpiasCompleted}</p>
                  </div>
                  <AlertTriangle className="h-8 w-8 text-purple-600" />
                </div>
                <p className="text-sm text-gray-500 mt-2">High-risk processing assessed</p>
              </div>

              <div className="bg-white p-6 rounded-lg shadow-sm border">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Records of Processing</p>
                    <p className="text-3xl font-bold text-indigo-600">{complianceStats.recordsOfProcessing}</p>
                  </div>
                  <Users className="h-8 w-8 text-indigo-600" />
                </div>
                <p className="text-sm text-gray-500 mt-2">Processing activities documented</p>
              </div>

              <div className="bg-white p-6 rounded-lg shadow-sm border">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Breach Response Time</p>
                    <p className="text-3xl font-bold text-green-600">{complianceStats.breachResponseTime}</p>
                  </div>
                  <Clock className="h-8 w-8 text-green-600" />
                </div>
                <p className="text-sm text-gray-500 mt-2">Within GDPR requirements</p>
              </div>

              <div className="bg-white p-6 rounded-lg shadow-sm border">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Data Portability Requests</p>
                    <p className="text-3xl font-bold text-orange-600">{complianceStats.dataPortabilityRequests}</p>
                  </div>
                  <Eye className="h-8 w-8 text-orange-600" />
                </div>
                <p className="text-sm text-gray-500 mt-2">Processed this month</p>
              </div>
            </div>

            {/* Recent GDPR Activities */}
            <div className="bg-white rounded-lg shadow-sm border">
              <div className="p-6 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">Recent GDPR Activities</h3>
              </div>
              <div className="p-6">
                <div className="space-y-4">
                  {recentActivities.map((activity) => (
                    <div key={activity.id} className="flex items-center space-x-4 p-4 bg-gray-50 rounded-lg">
                      <div className="flex-shrink-0">
                        {activity.status === 'completed' && <CheckCircle className="h-5 w-5 text-green-600" />}
                        {activity.status === 'submitted' && <FileText className="h-5 w-5 text-blue-600" />}
                        {activity.status === 'updated' && <Settings className="h-5 w-5 text-orange-600" />}
                        {activity.status === 'added' && <Users className="h-5 w-5 text-purple-600" />}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-gray-900">{activity.description}</p>
                            <p className="text-xs text-gray-500">{activity.type} • {activity.timestamp}</p>
                          </div>
                          <span className={`px-2 py-1 text-xs rounded-full ${
                            activity.status === 'completed' ? 'bg-green-100 text-green-800' :
                            activity.status === 'submitted' ? 'bg-blue-100 text-blue-800' :
                            activity.status === 'updated' ? 'bg-orange-100 text-orange-800' :
                            'bg-purple-100 text-purple-800'
                          }`}>
                            {activity.status}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        );
    }
  };

  const subTabs = [
    { id: 'overview', label: 'Overview', icon: Shield },
    { id: 'lawful-basis', label: 'Lawful Basis', icon: FileText },
    { id: 'dpia', label: 'DPIA', icon: AlertTriangle },
    { id: 'records', label: 'Records of Processing', icon: Users },
    { id: 'breach', label: 'Breach Notification', icon: Clock },
    { id: 'portability', label: 'Data Portability', icon: Eye },
    { id: 'compliance-matrix', label: 'Compliance Matrix', icon: CheckCircle }
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">GDPR Compliance</h1>
          <p className="text-gray-600 mt-1">General Data Protection Regulation compliance management</p>
        </div>
      </div>

      {/* Sub-navigation tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {subTabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveSubTab(tab.id)}
              className={`flex items-center space-x-2 py-2 px-1 border-b-2 font-medium text-sm ${
                activeSubTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <tab.icon className="h-4 w-4" />
              <span>{tab.label}</span>
            </button>
          ))}
        </nav>
      </div>

      {/* Sub-content */}
      {renderSubContent()}
    </div>
  );
};

export default GDPRDashboard;