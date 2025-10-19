import React, { useState } from 'react';
import { Eye, Settings } from 'lucide-react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import LoginForm from './components/auth/LoginForm';
import Sidebar from './components/layout/Sidebar';
import Header from './components/layout/Header';
import RiskOverview from './components/dashboard/RiskOverview';
import DataSourcesOverview from './components/dashboard/DataSourcesOverview';
import ComplianceTasks from './components/dashboard/ComplianceTasks';
import RecentActivity from './components/dashboard/RecentActivity';
import DataDiscoveryDashboard from './components/data-discovery/DataDiscoveryDashboard';
import RiskAssessmentDashboard from './components/risk-assessment/RiskAssessmentDashboard';
import PolicyManagementDashboard from './components/policy-management/PolicyManagementDashboard';
import DSARDashboard from './components/dsar/DSARDashboard';
import DSARUserPortal from './components/dsar/portal/DSARUserPortal';
import DSARAdminDashboard from './components/dsar/admin/DSARAdminDashboard';
import ConsentManagement from './components/pdpl/ConsentManagement';
import CrossBorderTransfers from './components/pdpl/CrossBorderTransfers';
import RetentionPolicyEngine from './components/pdpl/RetentionPolicyEngine';
import PDPLComplianceMatrix from './components/pdpl/PDPLComplianceMatrix';
import GDPRDashboard from './components/gdpr/GDPRDashboard';
import SettingsDashboard from './components/settings/SettingsDashboard';
import AnalyticsDashboard from './components/analytics/AnalyticsDashboard';
import { PrivacyComplyAgentDashboard } from './components/privacy-comply-agent';

const DashboardContent: React.FC = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [showUserPortal, setShowUserPortal] = useState(false);

  // Show user portal if URL contains portal parameter
  React.useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('portal') === 'true') {
      setShowUserPortal(true);
    }
  }, []);

  if (showUserPortal) {
    return <DSARUserPortal />;
  }

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return (
          <div className="space-y-6">
            <RiskOverview />
            <DataSourcesOverview />
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <ComplianceTasks />
              <RecentActivity />
            </div>
          </div>
        );
      case 'data-discovery':
        return (
          <DataDiscoveryDashboard />
        );
      case 'risk-assessment':
        return (
          <RiskAssessmentDashboard />
        );
      case 'policies':
        return (
          <PolicyManagementDashboard />
        );
      case 'dsar':
        return (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Data Subject Rights Management</h1>
                <p className="text-gray-600 mt-1">Automated DSAR processing and compliance management</p>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setActiveTab('dsar-admin')}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                >
                  <Settings className="h-4 w-4 mr-2" />
                  Admin Panel
                </button>
                <button
                  onClick={() => window.open('?portal=true', '_blank')}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                >
                  <Eye className="h-4 w-4 mr-2" />
                  View User Portal
                </button>
              </div>
            </div>
            <DSARDashboard />
          </div>
        );
      case 'dsar-admin':
        return <DSARAdminDashboard />;
      case 'vendors':
        return (
          <div className="bg-white p-8 rounded-lg shadow-sm">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Vendor Risk Management</h1>
            <p className="text-gray-600">Third-party vendor risk assessment and monitoring coming soon...</p>
          </div>
        );
      case 'incidents':
        return (
          <div className="bg-white p-8 rounded-lg shadow-sm">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Incident Response</h1>
            <p className="text-gray-600">Automated incident detection and response management coming soon...</p>
          </div>
        );
      case 'compliance':
        return (
          <div className="bg-white p-8 rounded-lg shadow-sm">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Compliance Management</h1>
            <p className="text-gray-600">Comprehensive compliance tracking and reporting coming soon...</p>
          </div>
        );
      case 'analytics':
        return (
          <AnalyticsDashboard />
        );
      case 'settings':
        return <SettingsDashboard />;
      case 'pdpl-consent':
        return <ConsentManagement />;
      case 'pdpl-transfers':
        return <CrossBorderTransfers />;
      case 'pdpl-retention':
        return <RetentionPolicyEngine />;
      case 'pdpl-matrix':
        return <PDPLComplianceMatrix />;
      case 'gdpr':
        return <GDPRDashboard />;
      case 'privacy-comply-agent':
        return <PrivacyComplyAgentDashboard />;
      default:
        return (
          <div className="bg-white p-8 rounded-lg shadow-sm">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Dashboard</h1>
            <p className="text-gray-600">Welcome to PrivacyGuard AI</p>
          </div>
        );
    }
  };

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto p-6">
          {renderContent()}
        </main>
      </div>
    </div>
  );
};

const AppContent: React.FC = () => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return isAuthenticated ? <DashboardContent /> : <LoginForm />;
};

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;