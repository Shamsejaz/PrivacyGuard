import React, { useState } from 'react';
import { ArrowLeft, ArrowRight, Check, Building2, Users, Settings, CreditCard } from 'lucide-react';
import { useTenant } from '../../../contexts/TenantContext';
import { Tenant, ComplianceFramework, SubscriptionTier } from '../../../types';
import Button from '../../ui/Button';

interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
}

const steps: OnboardingStep[] = [
  {
    id: 'organization',
    title: 'Organization Details',
    description: 'Basic information about the organization',
    icon: <Building2 className="w-5 h-5" />
  },
  {
    id: 'compliance',
    title: 'Compliance Frameworks',
    description: 'Select applicable compliance requirements',
    icon: <Check className="w-5 h-5" />
  },
  {
    id: 'subscription',
    title: 'Subscription Plan',
    description: 'Choose the appropriate service tier',
    icon: <CreditCard className="w-5 h-5" />
  },
  {
    id: 'users',
    title: 'Initial Users',
    description: 'Set up admin users and permissions',
    icon: <Users className="w-5 h-5" />
  },
  {
    id: 'settings',
    title: 'Configuration',
    description: 'Configure security and operational settings',
    icon: <Settings className="w-5 h-5" />
  }
];

const subscriptionTiers: SubscriptionTier[] = [
  {
    id: 'starter',
    name: 'starter',
    features: ['Basic Analytics', 'Standard Support', 'Core Compliance'],
    limits: { users: 5, dataSources: 3, storage: 10, apiCalls: 1000 },
    price: { monthly: 99, annual: 990, currency: 'USD' }
  },
  {
    id: 'professional',
    name: 'professional',
    features: ['Advanced Analytics', 'Priority Support', 'Multi-Framework Compliance', 'API Access'],
    limits: { users: 25, dataSources: 10, storage: 100, apiCalls: 10000 },
    price: { monthly: 299, annual: 2990, currency: 'USD' }
  },
  {
    id: 'enterprise',
    name: 'enterprise',
    features: ['Custom Analytics', '24/7 Support', 'All Compliance Frameworks', 'Unlimited API', 'Custom Integrations'],
    limits: { users: 100, dataSources: 50, storage: 1000, apiCalls: 100000 },
    price: { monthly: 999, annual: 9990, currency: 'USD' }
  }
];

const complianceFrameworks: ComplianceFramework[] = [
  { id: 'gdpr', name: 'GDPR', version: '2018', enabled: false, configuration: {} },
  { id: 'ccpa', name: 'CCPA', version: '2020', enabled: false, configuration: {} },
  { id: 'hipaa', name: 'HIPAA', version: '1996', enabled: false, configuration: {} },
  { id: 'pdpl', name: 'PDPL', version: '2021', enabled: false, configuration: {} },
  { id: 'sox', name: 'SOX', version: '2002', enabled: false, configuration: {} },
  { id: 'pci', name: 'PCI_DSS', version: '4.0', enabled: false, configuration: {} }
];

interface TenantOnboardingWizardProps {
  onComplete: (tenant: Tenant) => void;
  onCancel: () => void;
}

export const TenantOnboardingWizard: React.FC<TenantOnboardingWizardProps> = ({
  onComplete,
  onCancel
}) => {
  const { createTenant } = useTenant();
  const [currentStep, setCurrentStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    organization: {
      name: '',
      domain: '',
      industry: '',
      size: '',
      country: '',
      timezone: 'UTC'
    },
    compliance: complianceFrameworks.map(f => ({ ...f })),
    subscription: subscriptionTiers[0],
    users: [
      {
        email: '',
        name: '',
        role: 'owner' as const
      }
    ],
    settings: {
      mfaRequired: false,
      sessionTimeout: 240,
      dataRetention: 1095,
      autoDelete: false
    }
  });

  const updateFormData = (section: string, data: any) => {
    setFormData(prev => ({
      ...prev,
      [section]: data
    }));
  };

  const nextStep = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = async () => {
    try {
      setIsSubmitting(true);

      const tenantData: Partial<Tenant> = {
        name: formData.organization.name,
        domain: formData.organization.domain,
        subscription: formData.subscription,
        complianceFrameworks: formData.compliance.filter(f => f.enabled),
        dataResidency: {
          id: 'us-east-1',
          name: 'US East',
          code: 'US',
          dataCenter: 'Virginia',
          regulations: []
        },
        customization: {
          branding: {
            primaryColor: '#3B82F6',
            secondaryColor: '#1E40AF'
          },
          theme: 'light',
          language: 'en',
          timezone: formData.organization.timezone,
          dateFormat: 'MM/DD/YYYY'
        },
        settings: {
          security: {
            mfaRequired: formData.settings.mfaRequired,
            sessionTimeout: formData.settings.sessionTimeout,
            passwordPolicy: {
              minLength: 8,
              requireUppercase: true,
              requireLowercase: true,
              requireNumbers: true,
              requireSpecialChars: false,
              expirationDays: 90
            }
          },
          notifications: {
            email: true,
            sms: false,
            inApp: true
          },
          dataRetention: {
            defaultPeriod: formData.settings.dataRetention,
            autoDelete: formData.settings.autoDelete
          },
          integrations: {
            enabled: [],
            configurations: {}
          }
        }
      };

      const newTenant = await createTenant(tenantData);
      onComplete(newTenant);

    } catch (error) {
      console.error('Failed to create tenant:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderStepContent = () => {
    switch (steps[currentStep].id) {
      case 'organization':
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Organization Name *
                </label>
                <input
                  type="text"
                  value={formData.organization.name}
                  onChange={(e) => updateFormData('organization', { ...formData.organization, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Acme Corporation"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Domain *
                </label>
                <input
                  type="text"
                  value={formData.organization.domain}
                  onChange={(e) => updateFormData('organization', { ...formData.organization, domain: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="acme.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Industry
                </label>
                <select
                  value={formData.organization.industry}
                  onChange={(e) => updateFormData('organization', { ...formData.organization, industry: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select Industry</option>
                  <option value="technology">Technology</option>
                  <option value="healthcare">Healthcare</option>
                  <option value="finance">Finance</option>
                  <option value="retail">Retail</option>
                  <option value="manufacturing">Manufacturing</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Company Size
                </label>
                <select
                  value={formData.organization.size}
                  onChange={(e) => updateFormData('organization', { ...formData.organization, size: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select Size</option>
                  <option value="1-10">1-10 employees</option>
                  <option value="11-50">11-50 employees</option>
                  <option value="51-200">51-200 employees</option>
                  <option value="201-1000">201-1000 employees</option>
                  <option value="1000+">1000+ employees</option>
                </select>
              </div>
            </div>
          </div>
        );

      case 'compliance':
        return (
          <div className="space-y-6">
            <p className="text-gray-600">Select the compliance frameworks that apply to your organization:</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {formData.compliance.map((framework, index) => (
                <div key={framework.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      id={framework.id}
                      checked={framework.enabled}
                      onChange={(e) => {
                        const updated = [...formData.compliance];
                        updated[index].enabled = e.target.checked;
                        updateFormData('compliance', updated);
                      }}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <label htmlFor={framework.id} className="flex-1">
                      <div className="font-medium text-gray-900">{framework.name}</div>
                      <div className="text-sm text-gray-500">Version {framework.version}</div>
                    </label>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );

      case 'subscription':
        return (
          <div className="space-y-6">
            <p className="text-gray-600">Choose the subscription plan that best fits your needs:</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {subscriptionTiers.map((tier) => (
                <div
                  key={tier.id}
                  className={`border-2 rounded-lg p-6 cursor-pointer transition-colors ${
                    formData.subscription.id === tier.id
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => updateFormData('subscription', tier)}
                >
                  <div className="text-center">
                    <h3 className="text-lg font-semibold text-gray-900 capitalize">{tier.name}</h3>
                    <div className="mt-2">
                      <span className="text-3xl font-bold text-gray-900">${tier.price.monthly}</span>
                      <span className="text-gray-500">/month</span>
                    </div>
                    <ul className="mt-4 space-y-2 text-sm text-gray-600">
                      {tier.features.map((feature, index) => (
                        <li key={index} className="flex items-center">
                          <Check className="w-4 h-4 text-green-500 mr-2" />
                          {feature}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );

      case 'users':
        return (
          <div className="space-y-6">
            <p className="text-gray-600">Set up the initial admin user for this tenant:</p>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Admin Email *
                </label>
                <input
                  type="email"
                  value={formData.users[0].email}
                  onChange={(e) => {
                    const updated = [...formData.users];
                    updated[0].email = e.target.value;
                    updateFormData('users', updated);
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="admin@acme.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Admin Name *
                </label>
                <input
                  type="text"
                  value={formData.users[0].name}
                  onChange={(e) => {
                    const updated = [...formData.users];
                    updated[0].name = e.target.value;
                    updateFormData('users', updated);
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="John Doe"
                />
              </div>
            </div>
          </div>
        );

      case 'settings':
        return (
          <div className="space-y-6">
            <p className="text-gray-600">Configure security and operational settings:</p>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-medium text-gray-700">Require Multi-Factor Authentication</label>
                  <p className="text-sm text-gray-500">Enforce MFA for all users</p>
                </div>
                <input
                  type="checkbox"
                  checked={formData.settings.mfaRequired}
                  onChange={(e) => updateFormData('settings', { ...formData.settings, mfaRequired: e.target.checked })}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Session Timeout (minutes)
                </label>
                <input
                  type="number"
                  value={formData.settings.sessionTimeout}
                  onChange={(e) => updateFormData('settings', { ...formData.settings, sessionTimeout: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  min="30"
                  max="1440"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Default Data Retention (days)
                </label>
                <input
                  type="number"
                  value={formData.settings.dataRetention}
                  onChange={(e) => updateFormData('settings', { ...formData.settings, dataRetention: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  min="30"
                />
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  const isStepValid = () => {
    switch (steps[currentStep].id) {
      case 'organization':
        return formData.organization.name && formData.organization.domain;
      case 'users':
        return formData.users[0].email && formData.users[0].name;
      default:
        return true;
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      {/* Progress Steps */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          {steps.map((step, index) => (
            <div key={step.id} className="flex items-center">
              <div className={`flex items-center justify-center w-10 h-10 rounded-full border-2 ${
                index <= currentStep
                  ? 'bg-blue-600 border-blue-600 text-white'
                  : 'border-gray-300 text-gray-400'
              }`}>
                {index < currentStep ? (
                  <Check className="w-5 h-5" />
                ) : (
                  step.icon
                )}
              </div>
              {index < steps.length - 1 && (
                <div className={`w-16 h-0.5 mx-2 ${
                  index < currentStep ? 'bg-blue-600' : 'bg-gray-300'
                }`} />
              )}
            </div>
          ))}
        </div>
        <div className="mt-4">
          <h2 className="text-xl font-semibold text-gray-900">{steps[currentStep].title}</h2>
          <p className="text-gray-600">{steps[currentStep].description}</p>
        </div>
      </div>

      {/* Step Content */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
        {renderStepContent()}
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          onClick={currentStep === 0 ? onCancel : prevStep}
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          {currentStep === 0 ? 'Cancel' : 'Previous'}
        </Button>

        <div className="flex space-x-3">
          {currentStep === steps.length - 1 ? (
            <Button
              onClick={handleSubmit}
              disabled={!isStepValid() || isSubmitting}
              loading={isSubmitting}
            >
              Create Tenant
            </Button>
          ) : (
            <Button
              onClick={nextStep}
              disabled={!isStepValid()}
            >
              Next
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};