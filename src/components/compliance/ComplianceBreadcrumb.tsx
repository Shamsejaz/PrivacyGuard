import React from 'react';
import { ChevronRight, Home } from 'lucide-react';
import { useCompliance } from '../../contexts/ComplianceContext';
import { ComplianceFramework } from '../../types/compliance';

interface BreadcrumbItem {
  label: string;
  path?: string;
  onClick?: () => void;
}

interface ComplianceBreadcrumbProps {
  onNavigate: (framework: ComplianceFramework | null, section: string | null) => void;
}

const ComplianceBreadcrumb: React.FC<ComplianceBreadcrumbProps> = ({ onNavigate }) => {
  const { activeFramework, activeSection, modules } = useCompliance();

  const getBreadcrumbItems = (): BreadcrumbItem[] => {
    const items: BreadcrumbItem[] = [
      {
        label: 'Dashboard',
        onClick: () => {
          // Navigate back to main dashboard
          window.location.hash = '#dashboard';
        }
      },
      {
        label: 'Compliance Frameworks',
        onClick: () => onNavigate(null, null)
      }
    ];

    if (activeFramework) {
      const module = modules.find(m => m.id === activeFramework);
      if (module) {
        items.push({
          label: module.name,
          onClick: () => onNavigate(activeFramework, 'matrix')
        });

        if (activeSection && activeSection !== 'matrix') {
          const section = module.sections.find(s => s.id === activeSection);
          if (section) {
            items.push({
              label: section.name
            });
          }
        }
      }
    }

    return items;
  };

  const breadcrumbItems = getBreadcrumbItems();

  return (
    <nav className="flex items-center space-x-2 text-sm text-gray-600 mb-6">
      <Home className="h-4 w-4" />
      {breadcrumbItems.map((item, index) => (
        <React.Fragment key={index}>
          {index > 0 && <ChevronRight className="h-4 w-4 text-gray-400" />}
          {item.onClick ? (
            <button
              onClick={item.onClick}
              className="hover:text-blue-600 transition-colors"
            >
              {item.label}
            </button>
          ) : (
            <span className="text-gray-900 font-medium">{item.label}</span>
          )}
        </React.Fragment>
      ))}
    </nav>
  );
};

export default ComplianceBreadcrumb;