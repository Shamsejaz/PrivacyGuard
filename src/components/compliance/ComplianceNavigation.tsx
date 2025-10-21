import React from 'react';
import { ChevronRight, Grid, Scale, Shield, FileText, AlertTriangle, Download, CheckSquare, Globe, Calendar, Lock, AlertCircle, Users, UserX } from 'lucide-react';
import { useCompliance } from '../../contexts/ComplianceContext';
import { ComplianceFramework } from '../../types/compliance';
import { cn } from '../../utils/cn';

interface ComplianceNavigationProps {
  onSectionSelect: (framework: ComplianceFramework, section: string) => void;
}

const iconMap = {
  Grid,
  Scale,
  Shield,
  FileText,
  AlertTriangle,
  Download,
  CheckSquare,
  Globe,
  Calendar,
  Lock,
  AlertCircle,
  Users,
  UserX
};

const ComplianceNavigation: React.FC<ComplianceNavigationProps> = ({ onSectionSelect }) => {
  const { activeFramework, activeSection, modules, progress } = useCompliance();

  const getProgressColor = (score: number) => {
    if (score >= 80) return 'text-green-600 bg-green-100';
    if (score >= 60) return 'text-yellow-600 bg-yellow-100';
    return 'text-red-600 bg-red-100';
  };

  // Find the active module
  const activeModule = modules.find(module => module.id === activeFramework);

  return (
    <div className="bg-white border-r border-gray-200 w-80 min-h-screen overflow-y-auto">
      <div className="p-6">
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-2">
            {activeModule ? `${activeModule.name} Sections` : 'Compliance Frameworks'}
          </h2>
          <p className="text-sm text-gray-600">
            {activeModule ? activeModule.description : 'Matrix-based compliance management'}
          </p>
        </div>

        {activeModule ? (
          // Show sections for active framework
          <div className="space-y-2">
            {activeModule.sections.map((section) => {
              const IconComponent = iconMap[section.icon as keyof typeof iconMap];
              const isSectionActive = activeSection === section.id;
              
              return (
                <div
                  key={section.id}
                  className={cn(
                    'p-4 cursor-pointer border border-gray-200 rounded-lg transition-colors',
                    isSectionActive ? 'bg-blue-50 border-blue-200 text-blue-900' : 'hover:bg-gray-50'
                  )}
                  onClick={() => onSectionSelect(activeModule.id, section.id)}
                >
                  <div className="flex items-center space-x-3">
                    {IconComponent && <IconComponent className="h-5 w-5" />}
                    <div className="flex-1">
                      <div className="font-medium">{section.name}</div>
                      <div className="text-sm text-gray-600 mt-1">{section.description}</div>
                    </div>
                    <ChevronRight className="h-4 w-4 text-gray-400" />
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          // Show all frameworks overview
          <div className="space-y-4">
            {modules.map((module) => {
              const moduleProgress = progress[module.id];
              
              return (
                <div key={module.id} className="border border-gray-200 rounded-lg overflow-hidden">
                  <div
                    className="p-4 cursor-pointer transition-colors hover:bg-gray-50"
                    onClick={() => onSectionSelect(module.id, 'matrix')}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-medium text-gray-900">{module.name}</h3>
                      {moduleProgress && (
                        <span className={cn(
                          'px-2 py-1 rounded-full text-xs font-medium',
                          getProgressColor(moduleProgress.overallScore)
                        )}>
                          {moduleProgress.overallScore}%
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 mb-3">{module.description}</p>
                    
                    {moduleProgress && (
                      <div className="flex items-center space-x-4 text-xs text-gray-500">
                        <span>Total: {moduleProgress.totalRequirements}</span>
                        <span className="text-green-600">✓ {moduleProgress.compliantRequirements}</span>
                        <span className="text-yellow-600">⚠ {moduleProgress.partialRequirements}</span>
                        <span className="text-red-600">✗ {moduleProgress.nonCompliantRequirements}</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default ComplianceNavigation;