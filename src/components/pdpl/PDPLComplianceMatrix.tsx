import React, { useState } from 'react';
import { CheckCircle, Clock, AlertTriangle, X, Target, FileText, Download, RefreshCw, Filter } from 'lucide-react';
import Card from '../ui/Card';
import Badge from '../ui/Badge';
import Button from '../ui/Button';
import ProgressBar from '../ui/ProgressBar';

interface PDPLRequirement {
  id: string;
  article: string;
  title: string;
  description: string;
  category: 'data_processing' | 'consent' | 'rights' | 'security' | 'transfer' | 'governance';
  priority: 'high' | 'medium' | 'low';
  implementationStatus: 'not_started' | 'in_progress' | 'completed' | 'needs_review';
  completionPercentage: number;
  assignedTo: string;
  dueDate: Date;
  lastUpdated: Date;
  evidence: string[];
  gaps: string[];
  systemFeatures: string[];
  complianceNotes: string;
}

const PDPLComplianceMatrix: React.FC = () => {
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');

  const pdplRequirements: PDPLRequirement[] = [
    {
      id: '1',
      article: 'Article 5',
      title: 'Principles of Personal Data Processing',
      description: 'Personal data must be processed lawfully, fairly, and transparently',
      category: 'data_processing',
      priority: 'high',
      implementationStatus: 'completed',
      completionPercentage: 95,
      assignedTo: 'Privacy Team',
      dueDate: new Date('2024-03-01'),
      lastUpdated: new Date('2024-01-15'),
      evidence: ['Privacy Policy', 'Data Processing Register', 'Lawful Basis Documentation'],
      gaps: ['Minor updates needed for transparency notices'],
      systemFeatures: ['Data Discovery', 'Classification Engine', 'Processing Records'],
      complianceNotes: 'Implemented comprehensive data processing principles with automated monitoring'
    },
    {
      id: '2',
      article: 'Article 6',
      title: 'Lawful Basis for Processing',
      description: 'Processing must have a valid lawful basis under PDPL',
      category: 'data_processing',
      priority: 'high',
      implementationStatus: 'completed',
      completionPercentage: 90,
      assignedTo: 'Legal Team',
      dueDate: new Date('2024-02-15'),
      lastUpdated: new Date('2024-01-10'),
      evidence: ['Lawful Basis Register', 'Consent Records', 'Legitimate Interest Assessments'],
      gaps: [],
      systemFeatures: ['Consent Management', 'Legal Basis Tracking'],
      complianceNotes: 'All processing activities mapped to lawful basis with documentation'
    },
    {
      id: '3',
      article: 'Article 7',
      title: 'Consent Requirements',
      description: 'Consent must be freely given, specific, informed, and unambiguous',
      category: 'consent',
      priority: 'high',
      implementationStatus: 'in_progress',
      completionPercentage: 75,
      assignedTo: 'Development Team',
      dueDate: new Date('2024-02-28'),
      lastUpdated: new Date('2024-01-12'),
      evidence: ['Consent Collection Interface', 'Consent Proof Logs'],
      gaps: ['Granular consent controls', 'Consent withdrawal automation'],
      systemFeatures: ['Consent Management Portal', 'Proof of Consent Logging'],
      complianceNotes: 'Basic consent mechanism implemented, enhancing granular controls'
    },
    {
      id: '4',
      article: 'Article 11',
      title: 'Data Subject Rights',
      description: 'Individuals have rights to access, rectify, delete, and port their data',
      category: 'rights',
      priority: 'high',
      implementationStatus: 'completed',
      completionPercentage: 88,
      assignedTo: 'Customer Service',
      dueDate: new Date('2024-03-15'),
      lastUpdated: new Date('2024-01-14'),
      evidence: ['DSAR Portal', 'Request Processing Workflows', 'Response Templates'],
      gaps: ['Automated data portability'],
      systemFeatures: ['DSAR Portal', 'Request Tracking', 'Automated Workflows'],
      complianceNotes: 'Comprehensive rights management system with 30-day response tracking'
    },
    {
      id: '5',
      article: 'Article 17',
      title: 'Data Retention and Deletion',
      description: 'Personal data must not be kept longer than necessary',
      category: 'governance',
      priority: 'medium',
      implementationStatus: 'in_progress',
      completionPercentage: 60,
      assignedTo: 'Data Team',
      dueDate: new Date('2024-04-01'),
      lastUpdated: new Date('2024-01-08'),
      evidence: ['Retention Policy Document', 'Deletion Procedures'],
      gaps: ['Automated deletion engine', 'Cross-system retention tracking'],
      systemFeatures: ['Retention Policy Engine', 'Automated Deletion Scheduler'],
      complianceNotes: 'Retention policies defined, implementing automated enforcement'
    },
    {
      id: '6',
      article: 'Article 20',
      title: 'Security of Personal Data',
      description: 'Implement appropriate technical and organizational security measures',
      category: 'security',
      priority: 'high',
      implementationStatus: 'in_progress',
      completionPercentage: 70,
      assignedTo: 'Security Team',
      dueDate: new Date('2024-03-30'),
      lastUpdated: new Date('2024-01-11'),
      evidence: ['Security Policy', 'Encryption Implementation', 'Access Controls'],
      gaps: ['Advanced threat detection', 'Security monitoring dashboard'],
      systemFeatures: ['Security Controls Monitoring', 'Encryption Engine', 'Access Management'],
      complianceNotes: 'Core security measures implemented, enhancing monitoring capabilities'
    },
    {
      id: '7',
      article: 'Article 24',
      title: 'Privacy Impact Assessment',
      description: 'Conduct PIA for high-risk processing activities',
      category: 'governance',
      priority: 'medium',
      implementationStatus: 'completed',
      completionPercentage: 85,
      assignedTo: 'Privacy Team',
      dueDate: new Date('2024-02-20'),
      lastUpdated: new Date('2024-01-09'),
      evidence: ['PIA Templates', 'Risk Assessment Reports', 'Mitigation Plans'],
      gaps: ['Automated risk scoring'],
      systemFeatures: ['PIA Builder', 'Risk Assessment Engine', 'Automated Scoring'],
      complianceNotes: 'PIA process established with automated risk assessment tools'
    },
    {
      id: '8',
      article: 'Article 28',
      title: 'Records of Processing Activities',
      description: 'Maintain comprehensive records of all processing activities',
      category: 'governance',
      priority: 'medium',
      implementationStatus: 'completed',
      completionPercentage: 92,
      assignedTo: 'Compliance Team',
      dueDate: new Date('2024-02-10'),
      lastUpdated: new Date('2024-01-13'),
      evidence: ['RoPA Register', 'Processing Activity Documentation'],
      gaps: [],
      systemFeatures: ['RoPA Generator', 'Processing Activity Tracker'],
      complianceNotes: 'Comprehensive processing records maintained with automated updates'
    },
    {
      id: '9',
      article: 'Article 29',
      title: 'Cross-Border Data Transfers',
      description: 'Ensure adequate protection for international data transfers',
      category: 'transfer',
      priority: 'high',
      implementationStatus: 'needs_review',
      completionPercentage: 45,
      assignedTo: 'Legal Team',
      dueDate: new Date('2024-03-20'),
      lastUpdated: new Date('2024-01-05'),
      evidence: ['Transfer Impact Assessments', 'Adequacy Decisions'],
      gaps: ['Standard Contractual Clauses', 'Transfer monitoring'],
      systemFeatures: ['Transfer Tracker', 'Vendor Registry', 'DPA Management'],
      complianceNotes: 'Transfer mechanisms identified, implementing monitoring and controls'
    },
    {
      id: '10',
      article: 'Article 32',
      title: 'Data Protection by Design and Default',
      description: 'Implement privacy by design principles in all systems',
      category: 'security',
      priority: 'medium',
      implementationStatus: 'in_progress',
      completionPercentage: 55,
      assignedTo: 'Development Team',
      dueDate: new Date('2024-04-15'),
      lastUpdated: new Date('2024-01-07'),
      evidence: ['Privacy by Design Guidelines', 'Default Privacy Settings'],
      gaps: ['Automated privacy controls', 'Design review process'],
      systemFeatures: ['Privacy Controls', 'Default Settings Engine', 'Design Review Tools'],
      complianceNotes: 'Privacy by design principles being integrated into development lifecycle'
    }
  ];

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed': return <Badge variant="success">Completed</Badge>;
      case 'in_progress': return <Badge variant="info">In Progress</Badge>;
      case 'needs_review': return <Badge variant="warning">Needs Review</Badge>;
      case 'not_started': return <Badge variant="danger">Not Started</Badge>;
      default: return <Badge variant="default">Unknown</Badge>;
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'high': return <Badge variant="danger">High</Badge>;
      case 'medium': return <Badge variant="warning">Medium</Badge>;
      case 'low': return <Badge variant="success">Low</Badge>;
      default: return <Badge variant="default">Unknown</Badge>;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'in_progress': return <Clock className="h-5 w-5 text-blue-500" />;
      case 'needs_review': return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
      case 'not_started': return <X className="h-5 w-5 text-red-500" />;
      default: return <Clock className="h-5 w-5 text-gray-500" />;
    }
  };

  const getCategoryLabel = (category: string) => {
    switch (category) {
      case 'data_processing': return 'Data Processing';
      case 'consent': return 'Consent Management';
      case 'rights': return 'Data Subject Rights';
      case 'security': return 'Security & Protection';
      case 'transfer': return 'Cross-Border Transfers';
      case 'governance': return 'Governance & Compliance';
      default: return category;
    }
  };

  const filteredRequirements = pdplRequirements.filter(req => {
    const categoryMatch = selectedCategory === 'all' || req.category === selectedCategory;
    const statusMatch = selectedStatus === 'all' || req.implementationStatus === selectedStatus;
    return categoryMatch && statusMatch;
  });

  const statusCounts = {
    completed: pdplRequirements.filter(r => r.implementationStatus === 'completed').length,
    in_progress: pdplRequirements.filter(r => r.implementationStatus === 'in_progress').length,
    needs_review: pdplRequirements.filter(r => r.implementationStatus === 'needs_review').length,
    not_started: pdplRequirements.filter(r => r.implementationStatus === 'not_started').length,
  };

  const overallProgress = Math.round(
    pdplRequirements.reduce((sum, req) => sum + req.completionPercentage, 0) / pdplRequirements.length
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">PDPL Compliance Matrix</h1>
          <p className="text-gray-600 mt-1">Complete mapping of platform features to PDPL requirements</p>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export Matrix
          </Button>
          <Button>
            <RefreshCw className="h-4 w-4 mr-2" />
            Update Status
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Overall Progress</p>
              <p className="text-2xl font-bold text-blue-600">{overallProgress}%</p>
            </div>
            <Target className="h-8 w-8 text-blue-600" />
          </div>
        </Card>
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Completed</p>
              <p className="text-2xl font-bold text-green-600">{statusCounts.completed}</p>
            </div>
            <CheckCircle className="h-8 w-8 text-green-600" />
          </div>
        </Card>
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">In Progress</p>
              <p className="text-2xl font-bold text-blue-600">{statusCounts.in_progress}</p>
            </div>
            <Clock className="h-8 w-8 text-blue-600" />
          </div>
        </Card>
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Needs Review</p>
              <p className="text-2xl font-bold text-yellow-600">{statusCounts.needs_review}</p>
            </div>
            <AlertTriangle className="h-8 w-8 text-yellow-600" />
          </div>
        </Card>
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Not Started</p>
              <p className="text-2xl font-bold text-red-600">{statusCounts.not_started}</p>
            </div>
            <X className="h-8 w-8 text-red-600" />
          </div>
        </Card>
      </div>

      <Card>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-900">PDPL Requirements</h2>
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <Filter className="h-4 w-4 text-gray-400" />
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Categories</option>
                <option value="data_processing">Data Processing</option>
                <option value="consent">Consent Management</option>
                <option value="rights">Data Subject Rights</option>
                <option value="security">Security & Protection</option>
                <option value="transfer">Cross-Border Transfers</option>
                <option value="governance">Governance & Compliance</option>
              </select>
            </div>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Status</option>
              <option value="completed">Completed</option>
              <option value="in_progress">In Progress</option>
              <option value="needs_review">Needs Review</option>
              <option value="not_started">Not Started</option>
            </select>
          </div>
        </div>

        <div className="space-y-4">
          {filteredRequirements.map((requirement) => (
            <div key={requirement.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-start space-x-3">
                  {getStatusIcon(requirement.implementationStatus)}
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-1">
                      <Badge variant="info" size="sm">{requirement.article}</Badge>
                      <h3 className="font-medium text-gray-900">{requirement.title}</h3>
                      {getPriorityBadge(requirement.priority)}
                    </div>
                    <p className="text-sm text-gray-600 mb-2">{requirement.description}</p>
                    <div className="flex items-center space-x-4 text-sm text-gray-500">
                      <span>Category: {getCategoryLabel(requirement.category)}</span>
                      <span>Assigned: {requirement.assignedTo}</span>
                      <span>Due: {requirement.dueDate.toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  {getStatusBadge(requirement.implementationStatus)}
                </div>
              </div>

              <div className="mb-4">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium text-gray-700">Implementation Progress</span>
                  <span className="text-sm text-gray-600">{requirement.completionPercentage}%</span>
                </div>
                <ProgressBar 
                  value={requirement.completionPercentage} 
                  variant={requirement.completionPercentage >= 80 ? 'success' : requirement.completionPercentage >= 50 ? 'info' : 'warning'} 
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-2">System Features</p>
                  <div className="flex flex-wrap gap-1">
                    {requirement.systemFeatures.map((feature, index) => (
                      <Badge key={index} variant="success" size="sm">
                        {feature}
                      </Badge>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-2">Evidence</p>
                  <div className="flex flex-wrap gap-1">
                    {requirement.evidence.map((evidence, index) => (
                      <Badge key={index} variant="info" size="sm">
                        <FileText className="h-3 w-3 mr-1" />
                        {evidence}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>

              {requirement.gaps.length > 0 && (
                <div className="bg-yellow-50 p-3 rounded-lg mb-4">
                  <p className="text-sm font-medium text-yellow-800 mb-2">Implementation Gaps</p>
                  <ul className="space-y-1">
                    {requirement.gaps.map((gap, index) => (
                      <li key={index} className="flex items-start space-x-2">
                        <div className="w-1.5 h-1.5 bg-yellow-600 rounded-full mt-2 flex-shrink-0"></div>
                        <span className="text-sm text-yellow-700">{gap}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="bg-gray-50 p-3 rounded-lg">
                <p className="text-sm font-medium text-gray-700 mb-1">Compliance Notes</p>
                <p className="text-sm text-gray-600">{requirement.complianceNotes}</p>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
};

export default PDPLComplianceMatrix;