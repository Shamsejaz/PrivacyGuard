import React, { useState } from 'react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Vendor } from '../../types/vendor-risk';
import { vendorRiskService } from '../../services/vendorRiskService';
import { Building2, Mail, Phone, Globe, MapPin, Users, Calendar, AlertCircle } from 'lucide-react';

interface VendorOnboardingFormProps {
  onVendorCreated: (vendor: Vendor) => void;
  onCancel: () => void;
}

export const VendorOnboardingForm: React.FC<VendorOnboardingFormProps> = ({
  onVendorCreated,
  onCancel
}) => {
  const [formData, setFormData] = useState({
    name: '',
    contactEmail: '',
    contactPhone: '',
    website: '',
    address: '',
    industry: '',
    size: 'medium' as const,
    dataCategories: [] as string[],
    processingPurposes: [] as string[],
    dataLocation: [] as string[],
    expectedGoLiveDate: ''
  });

  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const industries = [
    'Technology', 'Healthcare', 'Financial Services', 'Retail', 'Manufacturing',
    'Education', 'Government', 'Non-profit', 'Consulting', 'Other'
  ];

  const dataCategoryOptions = [
    'Personal Identifiers', 'Contact Information', 'Financial Data', 'Health Data',
    'Biometric Data', 'Location Data', 'Behavioral Data', 'Technical Data'
  ];

  const processingPurposeOptions = [
    'Service Delivery', 'Customer Support', 'Marketing', 'Analytics',
    'Security', 'Compliance', 'Research', 'Quality Assurance'
  ];

  const dataLocationOptions = [
    'United States', 'European Union', 'United Kingdom', 'Canada',
    'Australia', 'Singapore', 'Japan', 'Other'
  ];

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Vendor name is required';
    }

    if (!formData.contactEmail.trim()) {
      newErrors.contactEmail = 'Contact email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.contactEmail)) {
      newErrors.contactEmail = 'Please enter a valid email address';
    }

    if (!formData.industry) {
      newErrors.industry = 'Industry is required';
    }

    if (formData.dataCategories.length === 0) {
      newErrors.dataCategories = 'At least one data category must be selected';
    }

    if (formData.processingPurposes.length === 0) {
      newErrors.processingPurposes = 'At least one processing purpose must be selected';
    }

    if (formData.dataLocation.length === 0) {
      newErrors.dataLocation = 'At least one data location must be selected';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    try {
      const vendorData = {
        ...formData,
        status: 'pending' as const,
        onboardingDate: new Date(),
        riskScore: 0,
        riskLevel: 'medium' as const,
        complianceStatus: 'pending' as const,
        certifications: [],
        dataProcessingAgreements: [],
        assessments: []
      };

      const vendor = await vendorRiskService.createVendor(vendorData);
      onVendorCreated(vendor);
    } catch (error) {
      console.error('Failed to create vendor:', error);
      setErrors({ submit: 'Failed to create vendor. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleMultiSelect = (field: string, option: string) => {
    const currentValues = formData[field as keyof typeof formData] as string[];
    const newValues = currentValues.includes(option)
      ? currentValues.filter(v => v !== option)
      : [...currentValues, option];
    
    handleInputChange(field, newValues);
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <Card className="p-8">
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Vendor Onboarding</h2>
          <p className="text-gray-600">
            Complete this form to onboard a new vendor and initiate the risk assessment process.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Basic Information */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <Building2 className="w-5 h-5 mr-2" />
              Basic Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Vendor Name *
                </label>
                <Input
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  placeholder="Enter vendor name"
                  error={errors.name}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Industry *
                </label>
                <select
                  value={formData.industry}
                  onChange={(e) => handleInputChange('industry', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select industry</option>
                  {industries.map(industry => (
                    <option key={industry} value={industry}>{industry}</option>
                  ))}
                </select>
                {errors.industry && (
                  <p className="mt-1 text-sm text-red-600">{errors.industry}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Company Size
                </label>
                <select
                  value={formData.size}
                  onChange={(e) => handleInputChange('size', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="small">Small (1-50 employees)</option>
                  <option value="medium">Medium (51-500 employees)</option>
                  <option value="large">Large (501-5000 employees)</option>
                  <option value="enterprise">Enterprise (5000+ employees)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Expected Go-Live Date
                </label>
                <Input
                  type="date"
                  value={formData.expectedGoLiveDate}
                  onChange={(e) => handleInputChange('expectedGoLiveDate', e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Contact Information */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <Mail className="w-5 h-5 mr-2" />
              Contact Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Contact Email *
                </label>
                <Input
                  type="email"
                  value={formData.contactEmail}
                  onChange={(e) => handleInputChange('contactEmail', e.target.value)}
                  placeholder="contact@vendor.com"
                  error={errors.contactEmail}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Contact Phone
                </label>
                <Input
                  type="tel"
                  value={formData.contactPhone}
                  onChange={(e) => handleInputChange('contactPhone', e.target.value)}
                  placeholder="+1 (555) 123-4567"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Website
                </label>
                <Input
                  type="url"
                  value={formData.website}
                  onChange={(e) => handleInputChange('website', e.target.value)}
                  placeholder="https://vendor.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Address
                </label>
                <Input
                  value={formData.address}
                  onChange={(e) => handleInputChange('address', e.target.value)}
                  placeholder="123 Main St, City, State, Country"
                />
              </div>
            </div>
          </div>

          {/* Data Processing Information */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Data Processing Information
            </h3>
            
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Data Categories *
                </label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {dataCategoryOptions.map(category => (
                    <label key={category} className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.dataCategories.includes(category)}
                        onChange={() => handleMultiSelect('dataCategories', category)}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-700">{category}</span>
                    </label>
                  ))}
                </div>
                {errors.dataCategories && (
                  <p className="mt-1 text-sm text-red-600">{errors.dataCategories}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Processing Purposes *
                </label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {processingPurposeOptions.map(purpose => (
                    <label key={purpose} className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.processingPurposes.includes(purpose)}
                        onChange={() => handleMultiSelect('processingPurposes', purpose)}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-700">{purpose}</span>
                    </label>
                  ))}
                </div>
                {errors.processingPurposes && (
                  <p className="mt-1 text-sm text-red-600">{errors.processingPurposes}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Data Processing Locations *
                </label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {dataLocationOptions.map(location => (
                    <label key={location} className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.dataLocation.includes(location)}
                        onChange={() => handleMultiSelect('dataLocation', location)}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-700">{location}</span>
                    </label>
                  ))}
                </div>
                {errors.dataLocation && (
                  <p className="mt-1 text-sm text-red-600">{errors.dataLocation}</p>
                )}
              </div>
            </div>
          </div>

          {errors.submit && (
            <div className="bg-red-50 border border-red-200 rounded-md p-4">
              <div className="flex">
                <AlertCircle className="w-5 h-5 text-red-400 mr-2" />
                <p className="text-sm text-red-600">{errors.submit}</p>
              </div>
            </div>
          )}

          <div className="flex justify-end space-x-4 pt-6 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              loading={loading}
              disabled={loading}
            >
              Create Vendor & Start Assessment
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
};