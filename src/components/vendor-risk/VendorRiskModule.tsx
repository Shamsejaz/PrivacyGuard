import React, { useState, useEffect } from 'react';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { VendorRiskDashboard } from './VendorRiskDashboard';
import { VendorOnboardingForm } from './VendorOnboardingForm';
import { VendorRiskAssessmentForm } from './VendorRiskAssessmentForm';
import { DueDiligenceQuestionnaire } from './DueDiligenceQuestionnaire';
import { DPAManagement } from './DPAManagement';
import { ContractLifecycleManager } from './ContractLifecycleManager';
import { VendorComplianceMonitoring } from './VendorComplianceMonitoring';
import { CertificationTracker } from './CertificationTracker';
import { VendorCommunicationPortal } from './VendorCommunicationPortal';
import { 
  Vendor, 
  VendorAssessment, 
  AssessmentQuestionnaire,
  DataProcessingAgreement,
  VendorCertification,
  VendorCommunication
} from '../../types/vendor-risk';
import { vendorRiskService } from '../../services/vendorRiskService';
import { 
  Shield, 
  Building2, 
  FileText, 
  Users, 
  MessageSquare, 
  Award, 
  Calendar, 
  BarChart3,
  Settings,
  Plus,
  Search,
  Filter,
  ArrowLeft
} from 'lucide-react';

type ViewMode = 
  | 'dashboard' 
  | 'vendor-list' 
  | 'vendor-detail' 
  | 'onboarding' 
  | 'assessment' 
  | 'questionnaire' 
  | 'dpa-management' 
  | 'contract-lifecycle' 
  | 'compliance-monitoring' 
  | 'certification-tracker' 
  | 'communication-portal';

export const VendorRiskModule: React.FC = () => {
  const [currentView, setCurrentView] = useState<ViewMode>('dashboard');
  const [selectedVendor, setSelectedVendor] = useState<Vendor | null>(null);
  const [selectedAssessment, setSelectedAssessment] = useState<VendorAssessment | null>(null);
  const [selectedQuestionnaire, setSelectedQuestionnaire] = useState<AssessmentQuestionnaire | null>(null);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [questionnaires, setQuestionnaires] = useState<AssessmentQuestionnaire[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState({
    riskLevel: 'all',
    complianceStatus: 'all',
    industry: 'all'
  });

  useEffect(() => {
    if (currentView === 'vendor-list' || currentView === 'dashboard') {
      loadVendors();
    }
    if (currentView === 'questionnaire') {
      loadQuestionnaires();
    }
  }, [currentView]);

  const loadVendors = async () => {
    try {
      setLoading(true);
      const vendorsData = await vendorRiskService.getVendors();
      setVendors(vendorsData);
    } catch (error) {
      console.error('Failed to load vendors:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadQuestionnaires = async () => {
    try {
      setLoading(true);
      const questionnairesData = await vendorRiskService.getQuestionnaires();
      setQuestionnaires(questionnairesData);
    } catch (error) {
      console.error('Failed to load questionnaires:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleVendorSelected = (vendor: Vendor) => {
    setSelectedVendor(vendor);
    setCurrentView('vendor-detail');
  };

  const handleNavigateToModule = (module: string) => {
    switch (module) {
      case 'vendor-list':
        setCurrentView('vendor-list');
        break;
      case 'assessments':
        setCurrentView('compliance-monitoring');
        break;
      case 'expiring-items':
        setCurrentView('contract-lifecycle');
        break;
      default:
        setCurrentView('dashboard');
    }
  };

  const handleVendorCreated = (vendor: Vendor) => {
    setVendors(prev => [...prev, vendor]);
    setSelectedVendor(vendor);
    setCurrentView('vendor-detail');
  };

  const handleAssessmentUpdated = (assessment: VendorAssessment) => {
    setSelectedAssessment(assessment);
    // Update vendor data if needed
    if (selectedVendor) {
      loadVendors();
    }
  };

  const handleQuestionnaireUpdated = (questionnaire: AssessmentQuestionnaire) => {
    setQuestionnaires(prev => 
      prev.some(q => q.id === questionnaire.id)
        ? prev.map(q => q.id === questionnaire.id ? questionnaire : q)
        : [...prev, questionnaire]
    );
    setSelectedQuestionnaire(questionnaire);
  };

  const handleDPAUpdated = (dpa: DataProcessingAgreement) => {
    // Update vendor data if needed
    if (selectedVendor) {
      loadVendors();
    }
  };

  const handleCertificationUpdated = (certification: VendorCertification) => {
    // Update vendor data if needed
    if (selectedVendor) {
      loadVendors();
    }
  };

  const handleCommunicationSent = (communication: VendorCommunication) => {
    // Handle communication sent
    console.log('Communication sent:', communication);
  };

  const filteredVendors = vendors.filter(vendor => {
    const matchesSearch = vendor.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         vendor.industry.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesRiskLevel = filter.riskLevel === 'all' || vendor.riskLevel === filter.riskLevel;
    const matchesComplianceStatus = filter.complianceStatus === 'all' || vendor.complianceStatus === filter.complianceStatus;
    const matchesIndustry = filter.industry === 'all' || vendor.industry === filter.industry;

    return matchesSearch && matchesRiskLevel && matchesComplianceStatus && matchesIndustry;
  });

  const renderNavigation = () => {
    const navItems = [
      { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
      { id: 'vendor-list', label: 'Vendors', icon: Building2 },
      { id: 'compliance-monitoring', label: 'Compliance', icon: Shield },
      { id: 'contract-lifecycle', label: 'Contracts', icon: FileText },
      { id: 'certification-tracker', label: 'Certifications', icon: Award },
      { id: 'questionnaire', label: 'Questionnaires', icon: Settings }
    ];

    return (
      <div className="flex space-x-1 mb-6 bg-gray-100 p-1 rounded-lg">
        {navItems.map(item => {
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              onClick={() => setCurrentView(item.id as ViewMode)}
              className={`flex items-center space-x-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                currentView === item.id
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>
    );
  };

  const renderVendorList = () => (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Vendor Management</h2>
          <p className="text-gray-600">Manage vendor relationships and risk assessments</p>
        </div>
        <Button onClick={() => setCurrentView('onboarding')}>
          <Plus className="w-4 h-4 mr-2" />
          Add Vendor
        </Button>
      </div>

      {/* Search and Filters */}
      <Card className="p-4">
        <div className="flex items-center space-x-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search vendors..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <select
              value={filter.riskLevel}
              onChange={(e) => setFilter(prev => ({ ...prev, riskLevel: e.target.value }))}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Risk Levels</option>
              <option value="low">Low Risk</option>
              <option value="medium">Medium Risk</option>
              <option value="high">High Risk</option>
              <option value="critical">Critical Risk</option>
            </select>
          </div>

          <div>
            <select
              value={filter.complianceStatus}
              onChange={(e) => setFilter(prev => ({ ...prev, complianceStatus: e.target.value }))}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Compliance Status</option>
              <option value="compliant">Compliant</option>
              <option value="partial">Partially Compliant</option>
              <option value="non_compliant">Non-Compliant</option>
              <option value="pending">Pending Review</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Vendor Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredVendors.map(vendor => (
          <Card 
            key={vendor.id} 
            className="p-6 hover:shadow-lg transition-shadow cursor-pointer"
            onClick={() => handleVendorSelected(vendor)}
          >
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">{vendor.name}</h3>
                <p className="text-sm text-gray-600">{vendor.industry}</p>
              </div>
              <Badge 
                variant={vendor.status === 'active' ? 'default' : 'secondary'}
              >
                {vendor.status.toUpperCase()}
              </Badge>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Risk Level</span>
                <Badge 
                  variant={
                    vendor.riskLevel === 'critical' ? 'destructive' :
                    vendor.riskLevel === 'high' ? 'secondary' : 'default'
                  }
                >
                  {vendor.riskLevel.toUpperCase()}
                </Badge>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Risk Score</span>
                <span className="text-sm font-medium">{vendor.riskScore}/100</span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Compliance</span>
                <Badge 
                  variant={
                    vendor.complianceStatus === 'compliant' ? 'default' :
                    vendor.complianceStatus === 'non_compliant' ? 'destructive' : 'secondary'
                  }
                >
                  {vendor.complianceStatus.replace('_', ' ').toUpperCase()}
                </Badge>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Last Assessment</span>
                <span className="text-sm text-gray-600">
                  {vendor.lastAssessmentDate 
                    ? new Date(vendor.lastAssessmentDate).toLocaleDateString()
                    : 'Never'
                  }
                </span>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {filteredVendors.length === 0 && (
        <Card className="p-8 text-center">
          <Building2 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Vendors Found</h3>
          <p className="text-gray-600 mb-4">
            {vendors.length === 0 
              ? "Get started by adding your first vendor."
              : "No vendors match the current search and filters."
            }
          </p>
          <Button onClick={() => setCurrentView('onboarding')}>
            <Plus className="w-4 h-4 mr-2" />
            Add Vendor
          </Button>
        </Card>
      )}
    </div>
  );

  const renderVendorDetail = () => {
    if (!selectedVendor) return null;

    const detailTabs = [
      { id: 'overview', label: 'Overview', icon: BarChart3 },
      { id: 'assessments', label: 'Assessments', icon: Shield },
      { id: 'dpas', label: 'DPAs', icon: FileText },
      { id: 'certifications', label: 'Certifications', icon: Award },
      { id: 'communications', label: 'Communications', icon: MessageSquare }
    ];

    const [activeTab, setActiveTab] = useState('overview');

    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button 
              variant="outline" 
              onClick={() => setCurrentView('vendor-list')}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Vendors
            </Button>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">{selectedVendor.name}</h2>
              <p className="text-gray-600">{selectedVendor.industry} • {selectedVendor.size} company</p>
            </div>
          </div>
          <div className="flex space-x-2">
            <Button 
              variant="outline"
              onClick={() => setCurrentView('assessment')}
            >
              <Calendar className="w-4 h-4 mr-2" />
              New Assessment
            </Button>
            <Button>
              <MessageSquare className="w-4 h-4 mr-2" />
              Send Message
            </Button>
          </div>
        </div>

        {/* Vendor Summary */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card className="p-4">
            <div className="text-center">
              <p className="text-sm text-gray-600">Risk Score</p>
              <p className="text-2xl font-bold text-gray-900">{selectedVendor.riskScore}</p>
              <Badge 
                variant={
                  selectedVendor.riskLevel === 'critical' ? 'destructive' :
                  selectedVendor.riskLevel === 'high' ? 'secondary' : 'default'
                }
              >
                {selectedVendor.riskLevel.toUpperCase()}
              </Badge>
            </div>
          </Card>

          <Card className="p-4">
            <div className="text-center">
              <p className="text-sm text-gray-600">Compliance Status</p>
              <Badge 
                className="mt-2"
                variant={
                  selectedVendor.complianceStatus === 'compliant' ? 'default' :
                  selectedVendor.complianceStatus === 'non_compliant' ? 'destructive' : 'secondary'
                }
              >
                {selectedVendor.complianceStatus.replace('_', ' ').toUpperCase()}
              </Badge>
            </div>
          </Card>

          <Card className="p-4">
            <div className="text-center">
              <p className="text-sm text-gray-600">Assessments</p>
              <p className="text-2xl font-bold text-gray-900">{selectedVendor.assessments.length}</p>
              <p className="text-xs text-gray-500">
                Last: {selectedVendor.lastAssessmentDate 
                  ? new Date(selectedVendor.lastAssessmentDate).toLocaleDateString()
                  : 'Never'
                }
              </p>
            </div>
          </Card>

          <Card className="p-4">
            <div className="text-center">
              <p className="text-sm text-gray-600">Certifications</p>
              <p className="text-2xl font-bold text-gray-900">{selectedVendor.certifications.length}</p>
              <p className="text-xs text-gray-500">Active certifications</p>
            </div>
          </Card>
        </div>

        {/* Detail Tabs */}
        <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
          {detailTabs.map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center space-x-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  activeTab === tab.id
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Tab Content */}
        <div>
          {activeTab === 'overview' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Contact Information</h3>
                <div className="space-y-3">
                  <div>
                    <span className="text-sm font-medium text-gray-700">Email:</span>
                    <span className="ml-2 text-sm text-gray-600">{selectedVendor.contactEmail}</span>
                  </div>
                  {selectedVendor.contactPhone && (
                    <div>
                      <span className="text-sm font-medium text-gray-700">Phone:</span>
                      <span className="ml-2 text-sm text-gray-600">{selectedVendor.contactPhone}</span>
                    </div>
                  )}
                  {selectedVendor.website && (
                    <div>
                      <span className="text-sm font-medium text-gray-700">Website:</span>
                      <a 
                        href={selectedVendor.website} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="ml-2 text-sm text-blue-600 hover:underline"
                      >
                        {selectedVendor.website}
                      </a>
                    </div>
                  )}
                  {selectedVendor.address && (
                    <div>
                      <span className="text-sm font-medium text-gray-700">Address:</span>
                      <span className="ml-2 text-sm text-gray-600">{selectedVendor.address}</span>
                    </div>
                  )}
                </div>
              </Card>

              <Card className="p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Key Dates</h3>
                <div className="space-y-3">
                  <div>
                    <span className="text-sm font-medium text-gray-700">Onboarded:</span>
                    <span className="ml-2 text-sm text-gray-600">
                      {new Date(selectedVendor.onboardingDate).toLocaleDateString()}
                    </span>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-gray-700">Last Assessment:</span>
                    <span className="ml-2 text-sm text-gray-600">
                      {selectedVendor.lastAssessmentDate 
                        ? new Date(selectedVendor.lastAssessmentDate).toLocaleDateString()
                        : 'Never assessed'
                      }
                    </span>
                  </div>
                  {selectedVendor.nextAssessmentDate && (
                    <div>
                      <span className="text-sm font-medium text-gray-700">Next Assessment:</span>
                      <span className="ml-2 text-sm text-gray-600">
                        {new Date(selectedVendor.nextAssessmentDate).toLocaleDateString()}
                      </span>
                    </div>
                  )}
                </div>
              </Card>
            </div>
          )}

          {activeTab === 'dpas' && (
            <DPAManagement 
              vendor={selectedVendor} 
              onDPAUpdated={handleDPAUpdated}
            />
          )}

          {activeTab === 'certifications' && (
            <CertificationTracker 
              vendor={selectedVendor} 
              onCertificationUpdated={handleCertificationUpdated}
            />
          )}

          {activeTab === 'communications' && (
            <VendorCommunicationPortal 
              vendor={selectedVendor} 
              onCommunicationSent={handleCommunicationSent}
            />
          )}
        </div>
      </div>
    );
  };

  const renderCurrentView = () => {
    switch (currentView) {
      case 'dashboard':
        return (
          <VendorRiskDashboard 
            onVendorSelected={handleVendorSelected}
            onNavigateToModule={handleNavigateToModule}
          />
        );

      case 'vendor-list':
        return renderVendorList();

      case 'vendor-detail':
        return renderVendorDetail();

      case 'onboarding':
        return (
          <VendorOnboardingForm 
            onVendorCreated={handleVendorCreated}
            onCancel={() => setCurrentView('vendor-list')}
          />
        );

      case 'assessment':
        return selectedVendor && selectedQuestionnaire ? (
          <VendorRiskAssessmentForm 
            assessment={selectedAssessment || {
              id: '',
              vendorId: selectedVendor.id,
              assessmentType: 'ad_hoc',
              status: 'draft',
              questionnaire: selectedQuestionnaire,
              responses: [],
              riskScore: 0,
              riskLevel: 'medium',
              findings: [],
              recommendations: [],
              assessorId: 'current-user',
              assessorName: 'Current User',
              startDate: new Date(),
              createdAt: new Date(),
              updatedAt: new Date()
            }}
            questionnaire={selectedQuestionnaire}
            onAssessmentUpdated={handleAssessmentUpdated}
            onCancel={() => setCurrentView('vendor-detail')}
          />
        ) : (
          <div className="text-center py-8">
            <p className="text-gray-600">Please select a questionnaire first</p>
            <Button 
              className="mt-4"
              onClick={() => setCurrentView('questionnaire')}
            >
              Manage Questionnaires
            </Button>
          </div>
        );

      case 'questionnaire':
        return (
          <DueDiligenceQuestionnaire 
            questionnaire={selectedQuestionnaire}
            onQuestionnaireUpdated={handleQuestionnaireUpdated}
            onCancel={() => setCurrentView('dashboard')}
          />
        );

      case 'dpa-management':
        return (
          <DPAManagement 
            onDPAUpdated={handleDPAUpdated}
          />
        );

      case 'contract-lifecycle':
        return (
          <ContractLifecycleManager 
            onContractSelected={(contract) => {
              // Handle contract selection
              console.log('Contract selected:', contract);
            }}
          />
        );

      case 'compliance-monitoring':
        return (
          <VendorComplianceMonitoring 
            onVendorSelected={handleVendorSelected}
          />
        );

      case 'certification-tracker':
        return (
          <CertificationTracker 
            onCertificationUpdated={handleCertificationUpdated}
          />
        );

      case 'communication-portal':
        return selectedVendor ? (
          <VendorCommunicationPortal 
            vendor={selectedVendor}
            onCommunicationSent={handleCommunicationSent}
          />
        ) : (
          <div className="text-center py-8">
            <p className="text-gray-600">Please select a vendor first</p>
            <Button 
              className="mt-4"
              onClick={() => setCurrentView('vendor-list')}
            >
              Select Vendor
            </Button>
          </div>
        );

      default:
        return <VendorRiskDashboard onVendorSelected={handleVendorSelected} />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Main Navigation */}
        {!['onboarding', 'assessment', 'questionnaire', 'vendor-detail'].includes(currentView) && renderNavigation()}
        
        {/* Main Content */}
        {renderCurrentView()}
      </div>
    </div>
  );
};