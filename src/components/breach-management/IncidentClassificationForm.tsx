import React, { useState } from 'react';
import { AlertTriangle, Clock, Users, Database, Shield } from 'lucide-react';
import { DataBreach, BreachSeverity, BreachClassification, DataType, DataSubjectCategory, DetectionMethod } from '../../types/breach-management';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';

interface IncidentClassificationFormProps {
  breach?: DataBreach;
  onSave: (classificationData: any) => void;
  onCancel: () => void;
}

export const IncidentClassificationForm: React.FC<IncidentClassificationFormProps> = ({
  breach,
  onSave,
  onCancel
}) => {
  const [formData, setFormData] = useState({
    severity: (breach?.severity || 'medium') as BreachSeverity,
    classification: (breach?.classification || 'confidentiality') as BreachClassification,
    affectedDataTypes: breach?.affectedDataTypes || [] as DataType[],
    affectedRecords: breach?.affectedRecords || 0,
    affectedDataSubjects: breach?.affectedDataSubjects || [] as DataSubjectCategory[],
    detectionMethod: (breach?.detectionMethod || 'automated_monitoring') as DetectionMethod,
    rootCause: breach?.rootCause || '',
    description: breach?.description || ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  const handleDataTypeChange = (dataType: DataType, checked: boolean) => {
    if (checked) {
      setFormData(prev => ({
        ...prev,
        affectedDataTypes: [...prev.affectedDataTypes, dataType]
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        affectedDataTypes: prev.affectedDataTypes.filter(type => type !== dataType)
      }));
    }
  };

  const handleDataSubjectChange = (category: DataSubjectCategory, checked: boolean) => {
    if (checked) {
      setFormData(prev => ({
        ...prev,
        affectedDataSubjects: [...prev.affectedDataSubjects, category]
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        affectedDataSubjects: prev.affectedDataSubjects.filter(cat => cat !== category)
      }));
    }
  };

  const getSeverityColor = (severity: BreachSeverity) => {
    switch (severity) {
      case 'critical': return 'border-red-500 bg-red-50';
      case 'high': return 'border-orange-500 bg-orange-50';
      case 'medium': return 'border-yellow-500 bg-yellow-50';
      case 'low': return 'border-green-500 bg-green-50';
    }
  };

  const dataTypes: { value: DataType; label: string; icon: string }[] = [
    { value: 'personal_data', label: 'Personal Data', icon: '👤' },
    { value: 'sensitive_personal_data', label: 'Sensitive Personal Data', icon: '🔒' },
    { value: 'financial_data', label: 'Financial Data', icon: '💳' },
    { value: 'health_data', label: 'Health Data', icon: '🏥' },
    { value: 'biometric_data', label: 'Biometric Data', icon: '👆' },
    { value: 'location_data', label: 'Location Data', icon: '📍' },
    { value: 'communication_data', label: 'Communication Data', icon: '💬' },
    { value: 'other', label: 'Other', icon: '📄' }
  ];

  const dataSubjectCategories: { value: DataSubjectCategory; label: string }[] = [
    { value: 'employees', label: 'Employees' },
    { value: 'customers', label: 'Customers' },
    { value: 'prospects', label: 'Prospects' },
    { value: 'suppliers', label: 'Suppliers' },
    { value: 'patients', label: 'Patients' },
    { value: 'students', label: 'Students' },
    { value: 'minors', label: 'Minors' },
    { value: 'other', label: 'Other' }
  ];

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Severity Assessment */}
      <Card className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <AlertTriangle className="h-5 w-5 text-orange-500" />
          <h3 className="text-lg font-semibold text-gray-900">Severity Assessment</h3>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {(['low', 'medium', 'high', 'critical'] as BreachSeverity[]).map((severity) => (
            <label
              key={severity}
              className={`relative flex items-center justify-center p-4 border-2 rounded-lg cursor-pointer transition-all ${
                formData.severity === severity
                  ? getSeverityColor(severity)
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <input
                type="radio"
                name="severity"
                value={severity}
                checked={formData.severity === severity}
                onChange={(e) => setFormData(prev => ({ ...prev, severity: e.target.value as BreachSeverity }))}
                className="sr-only"
              />
              <div className="text-center">
                <div className="text-lg font-semibold capitalize">{severity}</div>
                <div className="text-xs text-gray-600 mt-1">
                  {severity === 'low' && 'Minimal impact'}
                  {severity === 'medium' && 'Moderate impact'}
                  {severity === 'high' && 'Significant impact'}
                  {severity === 'critical' && 'Severe impact'}
                </div>
              </div>
            </label>
          ))}
        </div>
      </Card>

      {/* Breach Classification */}
      <Card className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <Shield className="h-5 w-5 text-blue-500" />
          <h3 className="text-lg font-semibold text-gray-900">Breach Classification</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {(['confidentiality', 'integrity', 'availability'] as BreachClassification[]).map((classification) => (
            <label
              key={classification}
              className={`relative flex items-center p-4 border-2 rounded-lg cursor-pointer transition-all ${
                formData.classification === classification
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <input
                type="radio"
                name="classification"
                value={classification}
                checked={formData.classification === classification}
                onChange={(e) => setFormData(prev => ({ ...prev, classification: e.target.value as BreachClassification }))}
                className="sr-only"
              />
              <div>
                <div className="font-semibold capitalize">{classification}</div>
                <div className="text-sm text-gray-600 mt-1">
                  {classification === 'confidentiality' && 'Unauthorized disclosure'}
                  {classification === 'integrity' && 'Unauthorized modification'}
                  {classification === 'availability' && 'Loss of access'}
                </div>
              </div>
            </label>
          ))}
        </div>
      </Card>

      {/* Affected Data Types */}
      <Card className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <Database className="h-5 w-5 text-green-500" />
          <h3 className="text-lg font-semibold text-gray-900">Affected Data Types</h3>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {dataTypes.map((dataType) => (
            <label
              key={dataType.value}
              className={`relative flex items-center p-3 border rounded-lg cursor-pointer transition-all ${
                formData.affectedDataTypes.includes(dataType.value)
                  ? 'border-green-500 bg-green-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <input
                type="checkbox"
                checked={formData.affectedDataTypes.includes(dataType.value)}
                onChange={(e) => handleDataTypeChange(dataType.value, e.target.checked)}
                className="sr-only"
              />
              <div className="flex items-center gap-2">
                <span className="text-lg">{dataType.icon}</span>
                <span className="text-sm font-medium">{dataType.label}</span>
              </div>
            </label>
          ))}
        </div>
      </Card>

      {/* Affected Records and Data Subjects */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <Users className="h-5 w-5 text-purple-500" />
            <h3 className="text-lg font-semibold text-gray-900">Affected Records</h3>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Number of Records
              </label>
              <input
                type="number"
                min="0"
                value={formData.affectedRecords}
                onChange={(e) => setFormData(prev => ({ ...prev, affectedRecords: parseInt(e.target.value) || 0 }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter number of affected records"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Detection Method
              </label>
              <select
                value={formData.detectionMethod}
                onChange={(e) => setFormData(prev => ({ ...prev, detectionMethod: e.target.value as DetectionMethod }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="automated_monitoring">Automated Monitoring</option>
                <option value="employee_report">Employee Report</option>
                <option value="customer_report">Customer Report</option>
                <option value="third_party_report">Third Party Report</option>
                <option value="audit_discovery">Audit Discovery</option>
                <option value="regulatory_inquiry">Regulatory Inquiry</option>
                <option value="media_report">Media Report</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <Users className="h-5 w-5 text-indigo-500" />
            <h3 className="text-lg font-semibold text-gray-900">Data Subject Categories</h3>
          </div>

          <div className="space-y-2">
            {dataSubjectCategories.map((category) => (
              <label
                key={category.value}
                className="flex items-center p-2 rounded hover:bg-gray-50 cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={formData.affectedDataSubjects.includes(category.value)}
                  onChange={(e) => handleDataSubjectChange(category.value, e.target.checked)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <span className="ml-2 text-sm font-medium text-gray-700">{category.label}</span>
              </label>
            ))}
          </div>
        </Card>
      </div>

      {/* Description and Root Cause */}
      <Card className="p-6">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Incident Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Provide a detailed description of the incident..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Root Cause (if known)
            </label>
            <textarea
              value={formData.rootCause}
              onChange={(e) => setFormData(prev => ({ ...prev, rootCause: e.target.value }))}
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Describe the root cause if identified..."
            />
          </div>
        </div>
      </Card>

      {/* Actions */}
      <div className="flex justify-end gap-3">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit">
          Save Classification
        </Button>
      </div>
    </form>
  );
};