import React, { useState } from 'react';
import { 
  BarChart3, 
  FileText, 
  Database, 
  TrendingUp,
  Shield,
  Users,
  Clock,
  Settings
} from 'lucide-react';
import DPODashboard from './DPODashboard';
import RoPAManagement from './RoPAManagement';
import DataLifecycleManagement from './DataLifecycleManagement';
import ExecutiveReporting from './ExecutiveReporting';
import DataFlowVisualization from './DataFlowVisualization';

interface DPOModuleProps {
  tenantId?: string;
}

type DPOSection = 'dashboard' | 'ropa' | 'lifecycle' | 'reporting' | 'dataflow';

export const DPOModule: React.FC<DPOModuleProps> = ({ tenantId }) => {
  const [activeSection, setActiveSection] = useState<DPOSection>('dashboard');

  const sections = [
    {
      id: 'dashboard' as DPOSection,
      name: 'DPO Dashboard',
      icon: BarChart3,
      description: 'Real-time compliance metrics and alerts'
    },
    {
      id: 'ropa' as DPOSection,
      name: 'RoPA Management',
      icon: FileText,
      description: 'Records of Processing Activities'
    },
    {
      id: 'lifecycle' as DPOSection,
      name: 'Data Lifecycle',
      icon: Database,
      description: 'Retention policies and automated deletion'
    },
    {
      id: 'reporting' as DPOSection,
      name: 'Executive Reporting',
      icon: TrendingUp,
      description: 'Analytics and compliance reports'
    },
    {
      id: 'dataflow' as DPOSection,
      name: 'Data Flow Mapping',
      icon: Shield,
      description: 'Visualize data processing flows'
    }
  ];

  const renderActiveSection = () => {
    switch (activeSection) {
      case 'dashboard':
        return <DPODashboard tenantId={tenantId} />;
      case 'ropa':
        return <RoPAManagement tenantId={tenantId} />;
      case 'lifecycle':
        return <DataLifecycleManagement tenantId={tenantId} />;
      case 'reporting':
        return <ExecutiveReporting tenantId={tenantId} />;
      case 'dataflow':
        return <DataFlowVisualization activityId="1" tenantId={tenantId} />;
      default:
        return <DPODashboard tenantId={tenantId} />;
    }
  };

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar Navigation */}
      <div className="w-64 bg-white shadow-sm border-r border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <Shield className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">DPO Module</h2>
              <p className="text-sm text-gray-500">Data Protection Officer</p>
            </div>
          </div>
        </div>
        
        <nav className="p-4 space-y-2">
          {sections.map((section) => {
            const Icon = section.icon;
            const isActive = activeSection === section.id;
            
            return (
              <button
                key={section.id}
                onClick={() => setActiveSection(section.id)}
                className={`w-full flex items-start space-x-3 p-3 rounded-lg text-left transition-colors ${
                  isActive
                    ? 'bg-blue-50 text-blue-700 border border-blue-200'
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                <Icon className={`h-5 w-5 mt-0.5 ${isActive ? 'text-blue-600' : 'text-gray-400'}`} />
                <div>
                  <p className={`font-medium ${isActive ? 'text-blue-900' : 'text-gray-900'}`}>
                    {section.name}
                  </p>
                  <p className={`text-sm ${isActive ? 'text-blue-600' : 'text-gray-500'}`}>
                    {section.description}
                  </p>
                </div>
              </button>
            );
          })}
        </nav>

        {/* Quick Stats */}
        <div className="p-4 border-t border-gray-200 mt-auto">
          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500">Active DSARs</span>
              <span className="font-medium text-gray-900">23</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500">Compliance Score</span>
              <span className="font-medium text-green-600">87%</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500">Risk Level</span>
              <span className="font-medium text-yellow-600">Medium</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-auto">
        {renderActiveSection()}
      </div>
    </div>
  );
};

export default DPOModule;