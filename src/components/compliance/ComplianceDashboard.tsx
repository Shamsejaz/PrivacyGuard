import React from 'react';
import { useCompliance } from '../../contexts/ComplianceContext';
import { ComplianceFramework } from '../../types/compliance';
import ComplianceNavigation from './ComplianceNavigation';
import ComplianceBreadcrumb from './ComplianceBreadcrumb';

// Temporary placeholder for ComplianceOverview
const ComplianceOverview: React.FC<{ onFrameworkSelect: (framework: ComplianceFramework, section: string) => void }> = ({ onFrameworkSelect }) => {
  return (
    <div className="bg-white p-8 rounded-lg shadow-sm">
      <h1 className="text-2xl font-bold text-gray-900 mb-4">Compliance Overview</h1>
      <p className="text-gray-600">Compliance overview coming soon...</p>
      <div className="mt-4 space-x-2">
        <button 
          onClick={() => onFrameworkSelect('GDPR', 'matrix')}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          View GDPR
        </button>
        <button 
          onClick={() => onFrameworkSelect('PDPL', 'matrix')}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          View PDPL
        </button>
      </div>
    </div>
  );
};

// Import existing components
import GDPRComplianceMatrix from '../gdpr/GDPRComplianceMatrix';
import LawfulBasisManager from '../gdpr/LawfulBasisManager';
import DataProtectionImpactAssessment from '../gdpr/DataProtectionImpactAssessment';
import RecordsOfProcessing from '../gdpr/RecordsOfProcessing';
import BreachNotification from '../gdpr/BreachNotification';
import DataPortability from '../gdpr/DataPortability';

import PDPLComplianceMatrix from '../pdpl/PDPLComplianceMatrix';
import ConsentManagement from '../pdpl/ConsentManagement';
import CrossBorderTransfers from '../pdpl/CrossBorderTransfers';
import RetentionPolicyEngine from '../pdpl/RetentionPolicyEngine';

const ComplianceDashboard: React.FC = () => {
  const { activeFramework, activeSection, setActiveFramework, setActiveSection } = useCompliance();

  const handleSectionSelect = (framework: ComplianceFramework, section: string) => {
    setActiveFramework(framework);
    setActiveSection(section);
  };

  const handleNavigate = (framework: ComplianceFramework | null, section: string | null) => {
    setActiveFramework(framework);
    setActiveSection(section);
  };

  const renderContent = () => {
    if (!activeFramework || !activeSection) {
      return <ComplianceOverview onFrameworkSelect={handleSectionSelect} />;
    }

    // GDPR Components
    if (activeFramework === 'GDPR') {
      switch (activeSection) {
        case 'matrix':
          return <GDPRComplianceMatrix />;
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
        default:
          return <GDPRComplianceMatrix />;
      }
    }

    // PDPL Components
    if (activeFramework === 'PDPL') {
      switch (activeSection) {
        case 'matrix':
          return <PDPLComplianceMatrix />;
        case 'consent':
          return <ConsentManagement />;
        case 'transfers':
          return <CrossBorderTransfers />;
        case 'retention':
          return <RetentionPolicyEngine />;
        default:
          return <PDPLComplianceMatrix />;
      }
    }

    // HIPAA Components (placeholder for now)
    if (activeFramework === 'HIPAA') {
      return (
        <div className="bg-white p-8 rounded-lg shadow-sm">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">HIPAA {activeSection}</h1>
          <p className="text-gray-600">HIPAA compliance module coming soon...</p>
        </div>
      );
    }

    // CCPA Components (placeholder for now)
    if (activeFramework === 'CCPA') {
      return (
        <div className="bg-white p-8 rounded-lg shadow-sm">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">CCPA {activeSection}</h1>
          <p className="text-gray-600">CCPA compliance module coming soon...</p>
        </div>
      );
    }

    return <ComplianceOverview onFrameworkSelect={handleSectionSelect} />;
  };

  return (
    <div className="flex h-full">
      <ComplianceNavigation onSectionSelect={handleSectionSelect} />
      <div className="flex-1 overflow-y-auto">
        <div className="p-6">
          <ComplianceBreadcrumb onNavigate={handleNavigate} />
          {renderContent()}
        </div>
      </div>
    </div>
  );
};

export default ComplianceDashboard;