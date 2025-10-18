import React from 'react';
import { useAuth } from '../../contexts/AuthContext';
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
  Database,
  Scale,
  UserCheck,
  Building2,
  CheckSquare,
  Globe,
  Calendar,
  Target,
  BookOpen
} from 'lucide-react';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab }) => {
  const { user } = useAuth();

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: Home, roles: ['dpo', 'compliance', 'admin', 'legal', 'business'] },
    { id: 'data-discovery', label: 'Data Discovery', icon: Search, roles: ['dpo', 'compliance', 'admin'] },
    { id: 'risk-assessment', label: 'Risk Assessment', icon: AlertTriangle, roles: ['dpo', 'compliance', 'admin'] },
    { id: 'policies', label: 'Policy Management', icon: FileText, roles: ['dpo', 'compliance', 'legal'] },
    { id: 'dsar', label: 'DSAR Requests', icon: UserCheck, roles: ['dpo', 'compliance', 'business'] },
    { id: 'vendors', label: 'Vendor Risk', icon: Building2, roles: ['dpo', 'compliance', 'admin'] },
    { id: 'incidents', label: 'Incidents', icon: Shield, roles: ['dpo', 'compliance', 'admin'] },
    { id: 'compliance', label: 'Compliance', icon: Scale, roles: ['dpo', 'compliance', 'legal'] },
    { id: 'gdpr', label: 'GDPR Compliance', icon: BookOpen, roles: ['dpo', 'compliance', 'legal'] },
    { id: 'analytics', label: 'Analytics', icon: BarChart3, roles: ['dpo', 'compliance', 'admin'] },
    { id: 'settings', label: 'Settings', icon: Settings, roles: ['admin'], adminOnly: true },
    { id: 'pdpl-consent', label: 'PDPL Consent Mgmt', icon: CheckSquare, roles: ['dpo', 'compliance', 'legal'] },
    { id: 'pdpl-transfers', label: 'Cross-Border Transfers', icon: Globe, roles: ['dpo', 'compliance', 'legal'] },
    { id: 'pdpl-retention', label: 'Retention Engine', icon: Calendar, roles: ['dpo', 'compliance', 'admin'] },
    { id: 'pdpl-matrix', label: 'PDPL Compliance Matrix', icon: Target, roles: ['dpo', 'compliance', 'admin'] },
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
        </nav>
      </div>
    </div>
  );
};

export default Sidebar;