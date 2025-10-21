import React, { useState, useEffect } from 'react';
import { ComplianceFramework, ComplianceRequirement, Evidence, GapAnalysis as GapAnalysisType } from '../../types/compliance';
import ComplianceMatrix from './ComplianceMatrix';

interface ComplianceMatrixContainerProps {
  framework: ComplianceFramework;
}

const ComplianceMatrixContainer: React.FC<ComplianceMatrixContainerProps> = ({ framework }) => {
  const [requirements, setRequirements] = useState<ComplianceRequirement[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simulate loading requirements data
    const loadRequirements = async () => {
      setLoading(true);
      
      // Sample data for demonstration
      const sampleRequirements: ComplianceRequirement[] = [
        {
          id: '1',
          article: 'Art. 5',
          title: 'Principles relating to processing of personal data',
          description: 'Personal data shall be processed lawfully, fairly and in a transparent manner in relation to the data subject.',
          category: 'data_protection',
          priority: 'high',
          status: 'partial',
          evidence: [
            {
              id: 'e1',
              type: 'policy',
              name: 'Data Processing Policy v2.1',
              description: 'Updated data processing policy covering lawful basis',
              uploadedAt: new Date('2024-01-15'),
              uploadedBy: 'John Doe',
              url: '#'
            }
          ],
          gaps: [],
          assignedTo: 'Privacy Officer',
          dueDate: new Date('2024-12-31'),
          lastReviewed: new Date('2024-01-15'),
          framework
        },
        {
          id: '2',
          article: 'Art. 6',
          title: 'Lawfulness of processing',
          description: 'Processing shall be lawful only if and to the extent that at least one of the conditions applies.',
          category: 'consent_management',
          priority: 'high',
          status: 'compliant',
          evidence: [
            {
              id: 'e2',
              type: 'document',
              name: 'Lawful Basis Assessment',
              description: 'Comprehensive assessment of lawful basis for all processing activities',
              uploadedAt: new Date('2024-02-01'),
              uploadedBy: 'Legal Team',
              url: '#'
            },
            {
              id: 'e3',
              type: 'procedure',
              name: 'Consent Management Procedure',
              description: 'Step-by-step procedure for managing consent',
              uploadedAt: new Date('2024-02-10'),
              uploadedBy: 'Compliance Team',
              url: '#'
            }
          ],
          gaps: [],
          assignedTo: 'Legal Counsel',
          dueDate: new Date('2024-06-30'),
          lastReviewed: new Date('2024-02-01'),
          framework
        },
        {
          id: '3',
          article: 'Art. 7',
          title: 'Conditions for consent',
          description: 'Where processing is based on consent, the controller shall be able to demonstrate that the data subject has consented.',
          category: 'consent_management',
          priority: 'medium',
          status: 'non_compliant',
          evidence: [],
          gaps: [],
          assignedTo: 'IT Team',
          dueDate: new Date('2024-09-30'),
          lastReviewed: new Date('2024-01-01'),
          framework
        },
        {
          id: '4',
          article: 'Art. 12',
          title: 'Transparent information, communication and modalities',
          description: 'The controller shall take appropriate measures to provide any information and any communication relating to processing to the data subject.',
          category: 'data_subject_rights',
          priority: 'medium',
          status: 'partial',
          evidence: [
            {
              id: 'e4',
              type: 'document',
              name: 'Privacy Notice Template',
              description: 'Standard privacy notice template for data subjects',
              uploadedAt: new Date('2024-01-20'),
              uploadedBy: 'Marketing Team',
              url: '#'
            }
          ],
          gaps: [],
          assignedTo: 'Communications Team',
          dueDate: new Date('2024-08-15'),
          lastReviewed: new Date('2024-01-20'),
          framework
        },
        {
          id: '5',
          article: 'Art. 25',
          title: 'Data protection by design and by default',
          description: 'The controller shall implement appropriate technical and organisational measures.',
          category: 'security_measures',
          priority: 'high',
          status: 'non_compliant',
          evidence: [],
          gaps: [],
          assignedTo: 'Security Team',
          dueDate: new Date('2024-11-30'),
          lastReviewed: new Date('2023-12-01'),
          framework
        }
      ];

      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setRequirements(sampleRequirements);
      setLoading(false);
    };

    loadRequirements();
  }, [framework]);

  const handleStatusUpdate = (requirementId: string, status: ComplianceRequirement['status']) => {
    setRequirements(prev => prev.map(req => 
      req.id === requirementId 
        ? { ...req, status, lastReviewed: new Date() }
        : req
    ));
  };

  const handleEvidenceUpload = (requirementId: string, evidence: Evidence) => {
    setRequirements(prev => prev.map(req => 
      req.id === requirementId 
        ? { ...req, evidence: [...req.evidence, evidence], lastReviewed: new Date() }
        : req
    ));
  };

  const handleGapUpdate = (requirementId: string, gaps: GapAnalysisType[]) => {
    // Handle gap updates - this would typically update the requirement's gaps
    console.log('Gap update for requirement:', requirementId, gaps);
  };

  const handleRequirementUpdate = (requirementId: string, updates: Partial<ComplianceRequirement>) => {
    setRequirements(prev => prev.map(req => 
      req.id === requirementId 
        ? { ...req, ...updates, lastReviewed: new Date() }
        : req
    ));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-3 text-gray-600">Loading {framework} requirements...</span>
      </div>
    );
  }

  return (
    <ComplianceMatrix
      framework={framework}
      requirements={requirements}
      onStatusUpdate={handleStatusUpdate}
      onEvidenceUpload={handleEvidenceUpload}
      onGapUpdate={handleGapUpdate}
      onRequirementUpdate={handleRequirementUpdate}
    />
  );
};

export default ComplianceMatrixContainer;