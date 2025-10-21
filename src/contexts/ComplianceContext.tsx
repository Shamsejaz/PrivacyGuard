import React, { createContext, useContext, useState, useEffect } from 'react';
import { ComplianceFramework, ComplianceModule, ComplianceProgress } from '../types/compliance';

interface ComplianceContextType {
  activeFramework: ComplianceFramework | null;
  activeSection: string | null;
  modules: ComplianceModule[];
  progress: Record<ComplianceFramework, ComplianceProgress>;
  setActiveFramework: (framework: ComplianceFramework | null) => void;
  setActiveSection: (section: string | null) => void;
  updateProgress: (framework: ComplianceFramework, progress: ComplianceProgress) => void;
}

const ComplianceContext = createContext<ComplianceContextType | undefined>(undefined);

export const useCompliance = () => {
  const context = useContext(ComplianceContext);
  if (!context) {
    throw new Error('useCompliance must be used within a ComplianceProvider');
  }
  return context;
};

const defaultModules: ComplianceModule[] = [
  {
    id: 'GDPR',
    name: 'GDPR Compliance',
    description: 'General Data Protection Regulation compliance management',
    enabled: true,
    sections: [
      { id: 'matrix', name: 'Compliance Matrix', path: '/compliance/gdpr/matrix', icon: 'Grid', description: 'Requirements tracking and status overview' },
      { id: 'lawful-basis', name: 'Lawful Basis', path: '/compliance/gdpr/lawful-basis', icon: 'Scale', description: 'Manage lawful basis for processing' },
      { id: 'dpia', name: 'DPIA', path: '/compliance/gdpr/dpia', icon: 'Shield', description: 'Data Protection Impact Assessments' },
      { id: 'records', name: 'Records of Processing', path: '/compliance/gdpr/records', icon: 'FileText', description: 'Article 30 records management' },
      { id: 'breach', name: 'Breach Notification', path: '/compliance/gdpr/breach', icon: 'AlertTriangle', description: 'Incident response and notifications' },
      { id: 'portability', name: 'Data Portability', path: '/compliance/gdpr/portability', icon: 'Download', description: 'Data export and portability' }
    ]
  },
  {
    id: 'PDPL',
    name: 'PDPL Compliance',
    description: 'Personal Data Protection Law compliance management',
    enabled: true,
    sections: [
      { id: 'matrix', name: 'Compliance Matrix', path: '/compliance/pdpl/matrix', icon: 'Grid', description: 'Requirements tracking and status overview' },
      { id: 'consent', name: 'Consent Management', path: '/compliance/pdpl/consent', icon: 'CheckSquare', description: 'Consent collection and management' },
      { id: 'transfers', name: 'Cross-Border Transfers', path: '/compliance/pdpl/transfers', icon: 'Globe', description: 'International data transfer compliance' },
      { id: 'retention', name: 'Retention Policies', path: '/compliance/pdpl/retention', icon: 'Calendar', description: 'Data retention and deletion policies' }
    ]
  },
  {
    id: 'HIPAA',
    name: 'HIPAA Compliance',
    description: 'Health Insurance Portability and Accountability Act compliance',
    enabled: true,
    sections: [
      { id: 'matrix', name: 'Compliance Matrix', path: '/compliance/hipaa/matrix', icon: 'Grid', description: 'Requirements tracking and status overview' },
      { id: 'safeguards', name: 'Safeguards', path: '/compliance/hipaa/safeguards', icon: 'Lock', description: 'Administrative, physical, and technical safeguards' },
      { id: 'risk-assessment', name: 'Risk Assessment', path: '/compliance/hipaa/risk-assessment', icon: 'AlertTriangle', description: 'HIPAA risk assessments' },
      { id: 'breach', name: 'Breach Notification', path: '/compliance/hipaa/breach', icon: 'AlertCircle', description: 'HIPAA breach notification requirements' }
    ]
  },
  {
    id: 'CCPA',
    name: 'CCPA Compliance',
    description: 'California Consumer Privacy Act compliance management',
    enabled: true,
    sections: [
      { id: 'matrix', name: 'Compliance Matrix', path: '/compliance/ccpa/matrix', icon: 'Grid', description: 'Requirements tracking and status overview' },
      { id: 'consumer-rights', name: 'Consumer Rights', path: '/compliance/ccpa/consumer-rights', icon: 'Users', description: 'Consumer request management' },
      { id: 'disclosures', name: 'Disclosures', path: '/compliance/ccpa/disclosures', icon: 'FileText', description: 'Privacy notice and disclosure management' },
      { id: 'opt-out', name: 'Opt-Out Rights', path: '/compliance/ccpa/opt-out', icon: 'UserX', description: 'Sale opt-out management' }
    ]
  }
];

export const ComplianceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activeFramework, setActiveFramework] = useState<ComplianceFramework | null>(null);
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const [modules] = useState<ComplianceModule[]>(defaultModules);
  const [progress, setProgress] = useState<Record<ComplianceFramework, ComplianceProgress>>({} as Record<ComplianceFramework, ComplianceProgress>);

  useEffect(() => {
    // Initialize progress for each framework with sample data
    const initialProgress: Record<ComplianceFramework, ComplianceProgress> = {} as Record<ComplianceFramework, ComplianceProgress>;
    
    modules.forEach(module => {
      // Sample progress data for demonstration
      const sampleData = {
        'GDPR': { total: 99, compliant: 65, partial: 20, nonCompliant: 14 },
        'PDPL': { total: 45, compliant: 30, partial: 10, nonCompliant: 5 },
        'HIPAA': { total: 78, compliant: 45, partial: 18, nonCompliant: 15 },
        'CCPA': { total: 56, compliant: 38, partial: 12, nonCompliant: 6 }
      };
      
      const data = sampleData[module.id as keyof typeof sampleData] || { total: 0, compliant: 0, partial: 0, nonCompliant: 0 };
      const overallScore = data.total > 0 ? Math.round((data.compliant / data.total) * 100) : 0;
      
      initialProgress[module.id] = {
        framework: module.id,
        totalRequirements: data.total,
        compliantRequirements: data.compliant,
        partialRequirements: data.partial,
        nonCompliantRequirements: data.nonCompliant,
        notApplicableRequirements: 0,
        overallScore,
        lastUpdated: new Date()
      };
    });
    
    setProgress(initialProgress);
  }, [modules]);

  const updateProgress = (framework: ComplianceFramework, newProgress: ComplianceProgress) => {
    setProgress(prev => ({
      ...prev,
      [framework]: newProgress
    }));
  };

  return (
    <ComplianceContext.Provider
      value={{
        activeFramework,
        activeSection,
        modules,
        progress,
        setActiveFramework,
        setActiveSection,
        updateProgress
      }}
    >
      {children}
    </ComplianceContext.Provider>
  );
};