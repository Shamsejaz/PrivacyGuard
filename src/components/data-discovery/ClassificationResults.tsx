import React, { useState } from 'react';
import { Search, Filter, Download, Eye, AlertTriangle, CheckCircle, Clock } from 'lucide-react';
import Card from '../ui/Card';
import Badge from '../ui/Badge';
import Button from '../ui/Button';

interface ClassificationResult {
  id: string;
  fieldName: string;
  dataType: string;
  classification: 'PII' | 'PHI' | 'Financial' | 'Sensitive' | 'Public';
  confidence: number;
  source: string;
  sampleData: string;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  regulatoryImpact: string[];
  lastUpdated: Date;
}

const ClassificationResults: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFilter, setSelectedFilter] = useState('all');

  const results: ClassificationResult[] = [
    {
      id: '1',
      fieldName: 'customer_email',
      dataType: 'Email Address',
      classification: 'PII',
      confidence: 98.5,
      source: 'Customer Database',
      sampleData: 'john.doe@*****.com',
      riskLevel: 'high',
      regulatoryImpact: ['GDPR', 'CCPA'],
      lastUpdated: new Date('2024-01-15T10:30:00')
    },
    {
      id: '2',
      fieldName: 'ssn',
      dataType: 'Social Security Number',
      classification: 'PII',
      confidence: 99.8,
      source: 'HR Database',
      sampleData: '***-**-1234',
      riskLevel: 'critical',
      regulatoryImpact: ['GDPR', 'CCPA', 'HIPAA'],
      lastUpdated: new Date('2024-01-15T09:15:00')
    },
    {
      id: '3',
      fieldName: 'credit_card_number',
      dataType: 'Credit Card',
      classification: 'Financial',
      confidence: 97.2,
      source: 'Payment System',
      sampleData: '****-****-****-5678',
      riskLevel: 'critical',
      regulatoryImpact: ['PCI DSS', 'GDPR'],
      lastUpdated: new Date('2024-01-15T08:45:00')
    },
    {
      id: '4',
      fieldName: 'patient_diagnosis',
      dataType: 'Medical Information',
      classification: 'PHI',
      confidence: 94.7,
      source: 'Medical Records',
      sampleData: 'Diabetes Type 2',
      riskLevel: 'high',
      regulatoryImpact: ['HIPAA', 'GDPR'],
      lastUpdated: new Date('2024-01-15T07:20:00')
    },
    {
      id: '5',
      fieldName: 'phone_number',
      dataType: 'Phone Number',
      classification: 'PII',
      confidence: 96.1,
      source: 'Customer Database',
      sampleData: '+1-555-***-****',
      riskLevel: 'medium',
      regulatoryImpact: ['GDPR', 'CCPA'],
      lastUpdated: new Date('2024-01-15T06:10:00')
    },
    {
      id: '6',
      fieldName: 'company_name',
      dataType: 'Business Information',
      classification: 'Public',
      confidence: 89.3,
      source: 'CRM System',
      sampleData: 'Acme Corporation',
      riskLevel: 'low',
      regulatoryImpact: [],
      lastUpdated: new Date('2024-01-15T05:30:00')
    }
  ];

  const getClassificationBadge = (classification: string) => {
    switch (classification) {
      case 'PII': return <Badge variant="warning">PII</Badge>;
      case 'PHI': return <Badge variant="danger">PHI</Badge>;
      case 'Financial': return <Badge variant="danger">Financial</Badge>;
      case 'Sensitive': return <Badge variant="warning">Sensitive</Badge>;
      case 'Public': return <Badge variant="success">Public</Badge>;
      default: return <Badge variant="default">{classification}</Badge>;
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

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 95) return 'text-green-600';
    if (confidence >= 85) return 'text-yellow-600';
    return 'text-red-600';
  };

  const filteredResults = results.filter(result => {
    const matchesSearch = result.fieldName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         result.dataType.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         result.source.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesFilter = selectedFilter === 'all' || 
                         result.classification.toLowerCase() === selectedFilter.toLowerCase() ||
                         result.riskLevel === selectedFilter;
    
    return matchesSearch && matchesFilter;
  });

  return (
    <Card>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-gray-900">AI Classification Results</h2>
        <div className="flex items-center space-x-3">
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button size="sm">
            <Eye className="h-4 w-4 mr-2" />
            View Report
          </Button>
        </div>
      </div>

      <div className="flex items-center space-x-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search fields, data types, or sources..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        <div className="flex items-center space-x-2">
          <Filter className="h-4 w-4 text-gray-400" />
          <select
            value={selectedFilter}
            onChange={(e) => setSelectedFilter(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Classifications</option>
            <option value="PII">PII</option>
            <option value="PHI">PHI</option>
            <option value="Financial">Financial</option>
            <option value="critical">Critical Risk</option>
            <option value="high">High Risk</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-red-50 p-4 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Critical Risk</p>
              <p className="text-2xl font-bold text-red-600">
                {results.filter(r => r.riskLevel === 'critical').length}
              </p>
            </div>
            <AlertTriangle className="h-8 w-8 text-red-600" />
          </div>
        </div>
        <div className="bg-yellow-50 p-4 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">High Risk</p>
              <p className="text-2xl font-bold text-yellow-600">
                {results.filter(r => r.riskLevel === 'high').length}
              </p>
            </div>
            <AlertTriangle className="h-8 w-8 text-yellow-600" />
          </div>
        </div>
        <div className="bg-blue-50 p-4 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Medium Risk</p>
              <p className="text-2xl font-bold text-blue-600">
                {results.filter(r => r.riskLevel === 'medium').length}
              </p>
            </div>
            <Clock className="h-8 w-8 text-blue-600" />
          </div>
        </div>
        <div className="bg-green-50 p-4 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Low Risk</p>
              <p className="text-2xl font-bold text-green-600">
                {results.filter(r => r.riskLevel === 'low').length}
              </p>
            </div>
            <CheckCircle className="h-8 w-8 text-green-600" />
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="text-left py-3 px-4 font-medium text-gray-900">Field Name</th>
              <th className="text-left py-3 px-4 font-medium text-gray-900">Data Type</th>
              <th className="text-left py-3 px-4 font-medium text-gray-900">Classification</th>
              <th className="text-left py-3 px-4 font-medium text-gray-900">Confidence</th>
              <th className="text-left py-3 px-4 font-medium text-gray-900">Source</th>
              <th className="text-left py-3 px-4 font-medium text-gray-900">Risk Level</th>
              <th className="text-left py-3 px-4 font-medium text-gray-900">Regulatory Impact</th>
              <th className="text-left py-3 px-4 font-medium text-gray-900">Sample Data</th>
            </tr>
          </thead>
          <tbody>
            {filteredResults.map((result) => (
              <tr key={result.id} className="border-b border-gray-100 hover:bg-gray-50">
                <td className="py-3 px-4">
                  <span className="font-medium text-gray-900">{result.fieldName}</span>
                </td>
                <td className="py-3 px-4 text-gray-600">{result.dataType}</td>
                <td className="py-3 px-4">
                  {getClassificationBadge(result.classification)}
                </td>
                <td className="py-3 px-4">
                  <span className={`font-medium ${getConfidenceColor(result.confidence)}`}>
                    {result.confidence.toFixed(1)}%
                  </span>
                </td>
                <td className="py-3 px-4 text-gray-600">{result.source}</td>
                <td className="py-3 px-4">
                  {getRiskBadge(result.riskLevel)}
                </td>
                <td className="py-3 px-4">
                  <div className="flex flex-wrap gap-1">
                    {result.regulatoryImpact.map((regulation) => (
                      <Badge key={regulation} variant="info" size="sm">
                        {regulation}
                      </Badge>
                    ))}
                  </div>
                </td>
                <td className="py-3 px-4">
                  <code className="text-sm bg-gray-100 px-2 py-1 rounded">
                    {result.sampleData}
                  </code>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {filteredResults.length === 0 && (
        <div className="text-center py-8">
          <p className="text-gray-500">No classification results match your search criteria.</p>
        </div>
      )}
    </Card>
  );
};

export default ClassificationResults;