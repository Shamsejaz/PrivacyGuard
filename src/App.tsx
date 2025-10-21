import React, { useState, useEffect } from 'react';
import { Eye, Settings } from 'lucide-react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { TenantProvider } from './contexts/TenantContext';
import { ComplianceProvider, useCompliance } from './contexts/ComplianceContext';
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
import SettingsDashboard from './components/settings/SettingsDashboard';
import AnalyticsDashboard from './components/analytics/AnalyticsDashboard';
import { PrivacyComplyAgentDashboard } from './components/privacy-comply-agent';
import ComplianceDashboard from './components/compliance/ComplianceDashboard';
import { BreachManagementModule } from './components/breach-management/BreachManagementModule';
import { NotificationSystem } from './components/ui/NotificationSystem';
import { RealTimeDashboard } from './components/dashboard/RealTimeDashboard';
import { useWebSocket } from './hooks/useWebSocket';
import { ErrorBoundary } from './components/ui/ErrorBoundary';
import { OfflineIndicator, PageLoading } from './components/ui/LoadingStates';
import { SystemStatusIndicator, MaintenanceNotification } from './components/ui/SystemStatus';
import { errorReportingService } from './services/errorReportingService';

const DashboardContent: React.FC = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [showUserPortal, setShowUserPortal] = useState(false);
  const { activeFramework, setActiveFramework, setActiveSection } = useCompliance();
  
  // Initialize WebSocket connection
  const { isConnected } = useWebSocket({
    autoConnect: true,
    channels: ['system:notifications', 'dashboard:metrics', 'compliance:alerts']
  });

  // Show user portal if URL contains portal parameter
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('portal') === 'true') {
      setShowUserPortal(true);
    }
  }, []);

  // Handle compliance framework routing
  useEffect(() => {
    if (activeTab === 'compliance' && !activeFramework) {
      setActiveFramework('GDPR');
      setActiveSection('matrix');
    }
  }, [activeTab, activeFramework, setActiveFramework, setActiveSection]);

  if (showUserPortal) {
    return <DSARUserPortal />;
  }

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return (
          <div className="space-y-6">
            <RealTimeDashboard />
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
      case 'breach-management':
        return <BreachManagementModule />;
      case 'incidents':
        return (
          <div className="bg-white p-8 rounded-lg shadow-sm">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Incident Response</h1>
            <p className="text-gray-600">Automated incident detection and response management coming soon...</p>
          </div>
        );
      case 'compliance':
        return <ComplianceDashboard />;
      case 'analytics':
        return (
          <AnalyticsDashboard />
        );
      case 'settings':
        return <SettingsDashboard />;
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
    <div className="flex h-screen bg-neutral-50 dark:bg-neutral-950 text-neutral-900 dark:text-neutral-50">
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto p-6">
          {renderContent()}
        </main>
      </div>
      <NotificationSystem />
    </div>
  );
};

const AppContent: React.FC = () => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return <PageLoading message="Initializing PrivacyGuard..." />;
  }

  return isAuthenticated ? <DashboardContent /> : <LoginForm />;
};

function App() {
  const [showMaintenance, setShowMaintenance] = useState(false);

  // Check for maintenance notifications
  useEffect(() => {
    const checkMaintenance = async () => {
      try {
        const response = await fetch('/api/v1/monitoring/maintenance');
        if (response.ok) {
          const data = await response.json();
          setShowMaintenance(data.scheduled);
        }
      } catch (error) {
        // Silently fail - maintenance check is not critical
      }
    };

    checkMaintenance();
  }, []);

  return (
    <ErrorBoundary
      onError={(error, errorInfo) => {
        errorReportingService.reportError(error, {
          category: 'javascript',
          severity: 'high',
          context: { componentStack: errorInfo.componentStack },
        });
      }}
    >
      <ThemeProvider>
        <AuthProvider>
          <TenantProvider>
            <ComplianceProvider>
              <OfflineIndicator />
              <MaintenanceNotification
                isVisible={showMaintenance}
                message="Scheduled maintenance is planned for tonight at 2:00 AM UTC."
                onDismiss={() => setShowMaintenance(false)}
              />
              <AppContent />
            </ComplianceProvider>
          </TenantProvider>
        </AuthProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;