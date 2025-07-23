import React, { useState } from 'react';
import { AlertTriangle, CheckCircle, Clock, Target, TrendingUp, Filter } from 'lucide-react';
import Card from '../ui/Card';
import Badge from '../ui/Badge';
import ProgressBar from '../ui/ProgressBar';

interface ComplianceGap {
  id: string;
  regulation: 'GDPR' | 'CCPA' | 'HIPAA' | 'PDPL';
  article: string;
  requirement: string;
  description: string;
  currentStatus: 'compliant' | 'partial' | 'non_compliant' | 'not_assessed';
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  complianceScore: number;
  targetScore: number;
  dueDate: Date;
  assignedTo: string;
  remediation: {
    actions: string[];
    estimatedEffort: string;
    priority: 'low' | 'medium' | 'high' | 'critical';
  };
  evidence: string[];
  lastAssessed: Date;
}

const ComplianceGapAnalysis: React.FC = () => {
  const [selectedRegulation, setSelectedRegulation] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');

  const complianceGaps: ComplianceGap[] = [
    {
      id: '1',
      regulation: 'GDPR',
      article: 'Article 25',
      requirement: 'Data Protection by Design and by Default',
      description: 'Implement appropriate technical and organizational measures to ensure data protection principles are integrated into processing activities',
      currentStatus: 'partial',
      riskLevel: 'high',
      complianceScore: 65,
      targetScore: 90,
      dueDate: new Date('2024-02-15'),
      assignedTo: 'Sarah Johnson',
      remediation: {
        actions: [
          'Implement privacy impact assessments for new systems',
          'Configure default privacy settings in all applications',
          'Establish data minimization controls'
        ],
        estimatedEffort: '6-8 weeks',
        priority: 'high'
      },
      evidence: ['Privacy policy documentation', 'System configuration audit'],
      lastAssessed: new Date('2024-01-10')
    },
    {
      id: '2',
      regulation: 'GDPR',
      article: 'Article 33',
      requirement: 'Notification of Personal Data Breach to Supervisory Authority',
      description: 'Notify supervisory authority of data breaches within 72 hours unless unlikely to result in risk',
      currentStatus: 'non_compliant',
      riskLevel: 'critical',
      complianceScore: 25,
      targetScore: 95,
      dueDate: new Date('2024-01-30'),
      assignedTo: 'Mike Chen',
      remediation: {
        actions: [
          'Implement automated breach detection system',
          'Create breach notification templates',
          'Establish 72-hour response procedures'
        ],
        estimatedEffort: '4-6 weeks',
        priority: 'critical'
      },
      evidence: ['Incident response plan'],
      lastAssessed: new Date('2024-01-12')
    },
    {
      id: '3',
      regulation: 'CCPA',
      article: 'Section 1798.100',
      requirement: 'Consumer Right to Know',
      description: 'Provide consumers with the right to know what personal information is collected about them',
      currentStatus: 'compliant',
      riskLevel: 'low',
      complianceScore: 92,
      targetScore: 95,
      dueDate: new Date('2024-03-01'),
      assignedTo: 'Lisa Rodriguez',
      remediation: {
        actions: [
          'Update privacy notice with additional details',
          'Implement consumer request portal enhancements'
        ],
        estimatedEffort: '2-3 weeks',
        priority: 'low'
      },
      evidence: ['Privacy notice', 'Consumer request logs', 'Website audit'],
      lastAssessed: new Date('2024-01-14')
    },
    {
      id: '4',
      regulation: 'HIPAA',
      article: 'Security Rule',
      requirement: 'Administrative Safeguards',
      description: 'Implement administrative actions and policies to manage security measures',
      currentStatus: 'partial',
      riskLevel: 'medium',
      complianceScore: 78,
      targetScore: 90,
      dueDate: new Date('2024-02-28'),
      assignedTo: 'James Wilson',
      remediation: {
        actions: [
          'Complete workforce training program',
          'Implement access management procedures',
          'Establish security incident procedures'
        ],
        estimatedEffort: '8-10 weeks',
        priority: 'medium'
      },
      evidence: ['Training records', 'Access control policies'],
      lastAssessed: new Date('2024-01-08')
    },
    {
      id: '5',
      regulation: 'PDPL',
      article: 'Article 6',
      requirement: 'Consent Requirements',
      description: 'Obtain explicit consent for processing personal data',
      currentStatus: 'not_assessed',
      riskLevel: 'medium',
      complianceScore: 0,
      targetScore: 85,
      dueDate: new Date('2024-03-15'),
      assignedTo: 'Sarah Johnson',
      remediation: {
        actions: [
          'Conduct consent mechanism assessment',
          'Implement granular consent controls',
          'Create consent withdrawal procedures'
        ],
        estimatedEffort: '4-6 weeks',
        priority: 'medium'
      },
      evidence: [],
      lastAssessed: new Date('2024-01-01')
    }
  ];

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'compliant': return <Badge variant="success">Compliant</Badge>;
      case 'partial': return <Badge variant="warning">Partial</Badge>;
      case 'non_compliant': return <Badge variant="danger">Non-Compliant</Badge>;
      case 'not_assessed': return <Badge variant="default">Not Assessed</Badge>;
      default: return <Badge variant="default">Unknown</Badge>;
    }
  };

  const getRiskBadge = (level: string) => {
    switch (level) {
      case 'critical': return <Badge variant="danger">Critical</Badge>;
      case 'high': return <Badge variant="danger">High</Badge>;
      case 'medium': return <Badge variant="warning">Medium</Badge>;
      case 'low': return <Badge variant="success">Low</Badge>;
      default: return <Badge variant="default">Unknown</Badge>;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'compliant': return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'partial': return <Clock className="h-5 w-5 text-yellow-500" />;
      case 'non_compliant': return <AlertTriangle className="h-5 w-5 text-red-500" />;
      case 'not_assessed': return <Target className="h-5 w-5 text-gray-500" />;
      default: return <Clock className="h-5 w-5 text-gray-500" />;
    }
  };

  const getProgressVariant = (score: number, target: number) => {
    const percentage = (score / target) * 100;
    if (percentage >= 90) return 'success';
    if (percentage >= 70) return 'warning';
    return 'danger';
  };

  const filteredGaps = complianceGaps.filter(gap => {
    const regulationMatch = selectedRegulation === 'all' || gap.regulation === selectedRegulation;
    const statusMatch = selectedStatus === 'all' || gap.currentStatus === selectedStatus;
    return regulationMatch && statusMatch;
  });

  const statusCounts = {
    compliant: complianceGaps.filter(g => g.currentStatus === 'compliant').length,
    partial: complianceGaps.filter(g => g.currentStatus === 'partial').length,
    non_compliant: complianceGaps.filter(g => g.currentStatus === 'non_compliant').length,
    not_assessed: complianceGaps.filter(g => g.currentStatus === 'not_assessed').length,
  };

  const overallComplianceScore = Math.round(
    complianceGaps.reduce((sum, gap) => sum + gap.complianceScore, 0) / complianceGaps.length
  );

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Overall Score</p>
              <p className="text-2xl font-bold text-blue-600">{overallComplianceScore}%</p>
            </div>
            <TrendingUp className="h-8 w-8 text-blue-600" />
          </div>
        </Card>
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Compliant</p>
              <p className="text-2xl font-bold text-green-600">{statusCounts.compliant}</p>
            </div>
            <CheckCircle className="h-8 w-8 text-green-600" />
          </div>
        </Card>
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Partial</p>
              <p className="text-2xl font-bold text-yellow-600">{statusCounts.partial}</p>
            </div>
            <Clock className="h-8 w-8 text-yellow-600" />
          </div>
        </Card>
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Non-Compliant</p>
              <p className="text-2xl font-bold text-red-600">{statusCounts.non_compliant}</p>
            </div>
            <AlertTriangle className="h-8 w-8 text-red-600" />
          </div>
        </Card>
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Not Assessed</p>
              <p className="text-2xl font-bold text-gray-600">{statusCounts.not_assessed}</p>
            </div>
            <Target className="h-8 w-8 text-gray-600" />
          </div>
        </Card>
      </div>

      <Card>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-900">Compliance Gap Analysis</h2>
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <Filter className="h-4 w-4 text-gray-400" />
              <select
                value={selectedRegulation}
                onChange={(e) => setSelectedRegulation(e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Regulations</option>
                <option value="GDPR">GDPR</option>
                <option value="CCPA">CCPA</option>
                <option value="HIPAA">HIPAA</option>
                <option value="PDPL">PDPL</option>
              </select>
            </div>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Statuses</option>
              <option value="compliant">Compliant</option>
              <option value="partial">Partial</option>
              <option value="non_compliant">Non-Compliant</option>
              <option value="not_assessed">Not Assessed</option>
            </select>
          </div>
        </div>

        <div className="space-y-4">
          {filteredGaps.map((gap) => (
            <div key={gap.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-start space-x-3">
                  {getStatusIcon(gap.currentStatus)}
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-1">
                      <Badge variant="info" size="sm">{gap.regulation}</Badge>
                      <span className="text-sm font-medium text-gray-600">{gap.article}</span>
                    </div>
                    <h3 className="font-medium text-gray-900 mb-1">{gap.requirement}</h3>
                    <p className="text-sm text-gray-600 mb-2">{gap.description}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  {getRiskBadge(gap.riskLevel)}
                  {getStatusBadge(gap.currentStatus)}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium text-gray-700">Compliance Progress</span>
                    <span className="text-sm text-gray-600">{gap.complianceScore}% / {gap.targetScore}%</span>
                  </div>
                  <ProgressBar 
                    value={gap.complianceScore} 
                    max={gap.targetScore}
                    variant={getProgressVariant(gap.complianceScore, gap.targetScore)} 
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Assigned to:</span>
                    <span className="font-medium">{gap.assignedTo}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Due date:</span>
                    <span className="font-medium">{gap.dueDate.toLocaleDateString()}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Effort:</span>
                    <span className="font-medium">{gap.remediation.estimatedEffort}</span>
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 p-3 rounded-lg mb-3">
                <p className="text-sm font-medium text-gray-700 mb-2">Remediation Actions</p>
                <ul className="space-y-1">
                  {gap.remediation.actions.map((action, index) => (
                    <li key={index} className="flex items-start space-x-2">
                      <div className="w-1.5 h-1.5 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                      <span className="text-sm text-gray-600">{action}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {gap.evidence.length > 0 && (
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-2">Supporting Evidence</p>
                  <div className="flex flex-wrap gap-1">
                    {gap.evidence.map((evidence, index) => (
                      <Badge key={index} variant="default" size="sm">
                        {evidence}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {filteredGaps.length === 0 && (
          <div className="text-center py-8">
            <p className="text-gray-500">No compliance gaps match your filter criteria.</p>
          </div>
        )}
      </Card>
    </div>
  );
};

export default ComplianceGapAnalysis;