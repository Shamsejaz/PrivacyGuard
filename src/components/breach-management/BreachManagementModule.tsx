import React, { useState } from 'react';
import { AlertTriangle, FileText, Bell, BarChart3, Settings, Shield } from 'lucide-react';
import { DataBreach } from '../../types/breach-management';
import { IncidentResponseDashboard } from './IncidentResponseDashboard';
import { BreachDetectionSystem } from './BreachDetectionSystem';
import { RegulatoryNotificationManager } from './RegulatoryNotificationManager';
import { DataSubjectNotificationManager } from './DataSubjectNotificationManager';
import { NotificationDeadlineTracker } from './NotificationDeadlineTracker';
import { BreachTimelineManager } from './BreachTimelineManager';
import { EvidenceManager } from './EvidenceManager';
import { RemediationActionTracker } from './RemediationActionTracker';
import { PostIncidentAnalysisComponent } from './PostIncidentAnalysis';
import { IncidentClassificationForm } from './IncidentClassificationForm';

type BreachManagementView = 
  | 'dashboard'
  | 'detection'
  | 'breach_details'
  | 'notifications'
  | 'deadlines'
  | 'create_breach';

interface BreachManagementModuleProps {
  initialView?: BreachManagementView;
}

export const BreachManagementModule: React.FC<BreachManagementModuleProps> = ({
  initialView = 'dashboard'
}) => {
  const [currentView, setCurrentView] = useState<BreachManagementView>(initialView);
  const [selectedBreach, setSelectedBreach] = useState<DataBreach | null>(null);
  const [breachDetailsTab, setBreachDetailsTab] = useState<'overview' | 'timeline' | 'evidence' | 'remediation' | 'notifications' | 'analysis'>('overview');

  const handleBreachSelect = (breach: DataBreach) => {
    setSelectedBreach(breach);
    setCurrentView('breach_details');
    setBreachDetailsTab('overview');
  };

  const handleCreateBreach = () => {
    setCurrentView('create_breach');
  };

  const handleBreachCreated = (breach: DataBreach) => {
    setSelectedBreach(breach);
    setCurrentView('breach_details');
    setBreachDetailsTab('overview');
  };

  const navigationItems = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: BarChart3,
      description: 'Overview of all incidents'
    },
    {
      id: 'detection',
      label: 'Detection System',
      icon: Shield,
      description: 'Automated breach detection'
    },
    {
      id: 'notifications',
      label: 'Notifications',
      icon: Bell,
      description: 'Regulatory & data subject notifications'
    },
    {
      id: 'deadlines',
      label: 'Deadlines',
      icon: AlertTriangle,
      description: 'Notification deadline tracking'
    }
  ];

  const renderNavigation = () => (
    <div className="bg-white border-b border-gray-200 px-6 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-8">
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-6 w-6 text-red-600" />
            <h1 className="text-xl font-bold text-gray-900">Data Breach Management</h1>
          </div>
          
          <nav className="flex space-x-6">
            {navigationItems.map((item) => (
              <button
                key={item.id}
                onClick={() => setCurrentView(item.id as BreachManagementView)}
                className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  currentView === item.id
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </button>
            ))}
          </nav>
        </div>

        {currentView === 'breach_details' && selectedBreach && (
          <button
            onClick={() => setCurrentView('dashboard')}
            className="text-sm text-gray-600 hover:text-gray-900"
          >
            ← Back to Dashboard
          </button>
        )}
      </div>
    </div>
  );

  const renderBreachDetailsNavigation = () => {
    if (currentView !== 'breach_details' || !selectedBreach) return null;

    const tabs = [
      { id: 'overview', label: 'Overview', icon: FileText },
      { id: 'timeline', label: 'Timeline', icon: AlertTriangle },
      { id: 'evidence', label: 'Evidence', icon: Shield },
      { id: 'remediation', label: 'Remediation', icon: Settings },
      { id: 'notifications', label: 'Notifications', icon: Bell },
      { id: 'analysis', label: 'Analysis', icon: BarChart3 }
    ];

    return (
      <div className="bg-white border-b border-gray-200 px-6">
        <div className="flex items-center justify-between py-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">{selectedBreach.title}</h2>
            <p className="text-sm text-gray-600">
              Breach ID: {selectedBreach.id} • Detected: {new Date(selectedBreach.detectedAt).toLocaleDateString()}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className={`px-3 py-1 text-xs font-medium rounded-full ${
              selectedBreach.severity === 'critical' ? 'text-red-600 bg-red-50' :
              selectedBreach.severity === 'high' ? 'text-orange-600 bg-orange-50' :
              selectedBreach.severity === 'medium' ? 'text-yellow-600 bg-yellow-50' :
              'text-green-600 bg-green-50'
            }`}>
              {selectedBreach.severity.toUpperCase()}
            </span>
            <span className={`px-3 py-1 text-xs font-medium rounded-full ${
              selectedBreach.status === 'detected' ? 'text-red-600 bg-red-50' :
              selectedBreach.status === 'investigating' ? 'text-blue-600 bg-blue-50' :
              selectedBreach.status === 'contained' ? 'text-yellow-600 bg-yellow-50' :
              'text-green-600 bg-green-50'
            }`}>
              {selectedBreach.status.replace('_', ' ').toUpperCase()}
            </span>
          </div>
        </div>
        
        <nav className="flex space-x-8">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setBreachDetailsTab(tab.id as any)}
              className={`flex items-center gap-2 py-2 px-1 border-b-2 font-medium text-sm ${
                breachDetailsTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <tab.icon className="h-4 w-4" />
              {tab.label}
            </button>
          ))}
        </nav>
      </div>
    );
  };

  const renderContent = () => {
    if (currentView === 'create_breach') {
      return (
        <div className="p-6">
          <IncidentClassificationForm
            onSave={handleBreachCreated}
            onCancel={() => setCurrentView('dashboard')}
          />
        </div>
      );
    }

    if (currentView === 'breach_details' && selectedBreach) {
      return (
        <div className="p-6">
          {breachDetailsTab === 'overview' && (
            <IncidentClassificationForm
              breach={selectedBreach}
              onSave={(data) => {
                // Update breach with classification data
                console.log('Updating breach:', data);
              }}
              onCancel={() => setCurrentView('dashboard')}
            />
          )}
          {breachDetailsTab === 'timeline' && (
            <BreachTimelineManager breachId={selectedBreach.id} />
          )}
          {breachDetailsTab === 'evidence' && (
            <EvidenceManager breachId={selectedBreach.id} />
          )}
          {breachDetailsTab === 'remediation' && (
            <RemediationActionTracker breachId={selectedBreach.id} />
          )}
          {breachDetailsTab === 'notifications' && (
            <div className="space-y-8">
              <RegulatoryNotificationManager breachId={selectedBreach.id} />
              <DataSubjectNotificationManager breachId={selectedBreach.id} />
            </div>
          )}
          {breachDetailsTab === 'analysis' && (
            <PostIncidentAnalysisComponent breachId={selectedBreach.id} />
          )}
        </div>
      );
    }

    switch (currentView) {
      case 'dashboard':
        return (
          <div className="p-6">
            <IncidentResponseDashboard
              onBreachSelect={handleBreachSelect}
              onCreateBreach={handleCreateBreach}
            />
          </div>
        );
      
      case 'detection':
        return (
          <div className="p-6">
            <BreachDetectionSystem />
          </div>
        );
      
      case 'notifications':
        return (
          <div className="p-6 space-y-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Regulatory Notifications</h3>
                <p className="text-gray-600 mb-4">Manage notifications to regulatory authorities</p>
                {/* This would show a summary or allow selection of a breach */}
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Data Subject Notifications</h3>
                <p className="text-gray-600 mb-4">Manage notifications to affected individuals</p>
                {/* This would show a summary or allow selection of a breach */}
              </div>
            </div>
          </div>
        );
      
      case 'deadlines':
        return (
          <div className="p-6">
            <NotificationDeadlineTracker />
          </div>
        );
      
      default:
        return (
          <div className="p-6">
            <IncidentResponseDashboard
              onBreachSelect={handleBreachSelect}
              onCreateBreach={handleCreateBreach}
            />
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {renderNavigation()}
      {renderBreachDetailsNavigation()}
      {renderContent()}
    </div>
  );
};