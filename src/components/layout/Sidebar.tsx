import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useCompliance } from '../../contexts/ComplianceContext';
import { cn } from '../../utils/cn';
import { 
  Shield, 
  Home, 
  Search, 
  FileText, 
  Users, 
  AlertTriangle, 
  Settings,
  BarChart3,
  Scale,
  UserCheck,
  Building2,
  Bot,
  ChevronDown,
  ChevronRight,
  Lock
} from 'lucide-react';
import { ComplianceFramework } from '../../types/compliance';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab }) => {
  const { user } = useAuth();
  const { activeFramework, setActiveFramework, setActiveSection } = useCompliance();
  const [expandedCompliance, setExpandedCompliance] = useState(false);

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: Home, roles: ['dpo', 'compliance', 'admin', 'legal', 'business'] },
    { id: 'data-discovery', label: 'Data Discovery', icon: Search, roles: ['dpo', 'compliance', 'admin'] },
    { id: 'risk-assessment', label: 'Risk Assessment', icon: AlertTriangle, roles: ['dpo', 'compliance', 'admin'] },
    { id: 'policies', label: 'Policy Management', icon: FileText, roles: ['dpo', 'compliance', 'legal'] },
    { id: 'dsar', label: 'DSAR Requests', icon: UserCheck, roles: ['dpo', 'compliance', 'business'] },
    { id: 'vendors', label: 'Vendor Risk', icon: Building2, roles: ['dpo', 'compliance', 'admin'] },
    { id: 'breach-management', label: 'Breach Management', icon: Shield, roles: ['dpo', 'compliance', 'admin'] },
    { id: 'incidents', label: 'Incidents', icon: AlertTriangle, roles: ['dpo', 'compliance', 'admin'] },
    { id: 'privacy-comply-agent', label: 'AI Compliance Agent', icon: Bot, roles: ['dpo', 'compliance', 'admin'] },
    { id: 'analytics', label: 'Analytics', icon: BarChart3, roles: ['dpo', 'compliance', 'admin'] },
    { id: 'settings', label: 'Settings', icon: Settings, roles: ['admin'], adminOnly: true },
  ];

  const complianceFrameworks = [
    { id: 'GDPR', label: 'GDPR', icon: Scale, color: 'text-blue-600' },
    { id: 'PDPL', label: 'PDPL', icon: Shield, color: 'text-green-600' },
    { id: 'HIPAA', label: 'HIPAA', icon: Lock, color: 'text-purple-600' },
    { id: 'CCPA', label: 'CCPA', icon: Users, color: 'text-orange-600' },
  ];

  const filteredItems = menuItems.filter(item => {
    // Check if user has the required role
    const hasRequiredRole = user?.role && item.roles.includes(user.role);
    
    // For admin-only items, check if user is specifically an admin
    if (item.adminOnly) {
      return user?.role === 'admin';
    }
    
    return hasRequiredRole;
  });

  const hasComplianceAccess = user?.role && ['dpo', 'compliance', 'legal'].includes(user.role);

  const handleComplianceFrameworkClick = (frameworkId: ComplianceFramework) => {
    setActiveTab('compliance');
    setActiveFramework(frameworkId);
    setActiveSection('matrix');
    setExpandedCompliance(true);
  };

  const handleComplianceToggle = () => {
    if (expandedCompliance) {
      setExpandedCompliance(false);
    } else {
      setActiveTab('compliance');
      setExpandedCompliance(true);
      if (!activeFramework) {
        setActiveFramework('GDPR');
        setActiveSection('matrix');
      }
    }
  };

  return (
    <div className="w-64 bg-white border-r border-gray-200 min-h-screen">
      <div className="p-6">
        <div className="flex items-center space-x-2 mb-8">
          <Shield className="h-8 w-8 text-blue-600" />
          <div>
            <h1 className="text-xl font-bold text-gray-900">PrivacyGuard</h1>
            <p className="text-xs text-gray-500">AI-Powered Compliance</p>
          </div>
        </div>
        
        <nav className="space-y-2">
          {filteredItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={cn(
                'w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-left transition-colors duration-200',
                activeTab === item.id
                  ? 'bg-blue-50 text-blue-700 border-r-2 border-blue-600'
                  : 'text-gray-700 hover:bg-gray-50'
              )}
            >
              <item.icon className="h-5 w-5" />
              <span className="font-medium">{item.label}</span>
            </button>
          ))}

          {/* Compliance Frameworks Section */}
          {hasComplianceAccess && (
            <div className="mt-6">
              <div className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Compliance Frameworks
              </div>
              
              <button
                onClick={handleComplianceToggle}
                className={cn(
                  'w-full flex items-center justify-between px-3 py-2 rounded-lg text-left transition-colors duration-200',
                  activeTab === 'compliance'
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-gray-700 hover:bg-gray-50'
                )}
              >
                <div className="flex items-center space-x-3">
                  <Scale className="h-5 w-5" />
                  <span className="font-medium">Compliance</span>
                </div>
                {expandedCompliance ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
              </button>

              {expandedCompliance && (
                <div className="ml-4 mt-2 space-y-1">
                  {complianceFrameworks.map((framework) => (
                    <button
                      key={framework.id}
                      onClick={() => handleComplianceFrameworkClick(framework.id as ComplianceFramework)}
                      className={cn(
                        'w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-left transition-colors duration-200 text-sm',
                        activeTab === 'compliance' && activeFramework === framework.id
                          ? 'bg-blue-100 text-blue-800'
                          : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                      )}
                    >
                      <framework.icon className={cn('h-4 w-4', framework.color)} />
                      <span className="font-medium">{framework.label}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </nav>
      </div>
    </div>
  );
};

export default Sidebar;