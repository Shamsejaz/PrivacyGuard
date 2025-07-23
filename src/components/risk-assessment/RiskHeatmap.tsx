import React, { useState } from 'react';
import { BarChart3, Filter, Download, RefreshCw, AlertTriangle, Shield, Database, Cloud } from 'lucide-react';
import Card from '../ui/Card';
import Badge from '../ui/Badge';
import Button from '../ui/Button';

interface HeatmapData {
  id: string;
  name: string;
  category: 'data_source' | 'system' | 'process' | 'vendor';
  riskScore: number;
  impact: 'low' | 'medium' | 'high' | 'critical';
  likelihood: 'low' | 'medium' | 'high' | 'critical';
  lastAssessed: Date;
  mitigations: string[];
  owner: string;
}

const RiskHeatmap: React.FC = () => {
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedRiskLevel, setSelectedRiskLevel] = useState('all');

  const heatmapData: HeatmapData[] = [
    {
      id: '1',
      name: 'Customer Database',
      category: 'data_source',
      riskScore: 85,
      impact: 'critical',
      likelihood: 'medium',
      lastAssessed: new Date('2024-01-15'),
      mitigations: ['Encryption at rest', 'Access controls', 'Regular backups'],
      owner: 'Data Team'
    },
    {
      id: '2',
      name: 'Payment Processing System',
      category: 'system',
      riskScore: 92,
      impact: 'critical',
      likelihood: 'high',
      lastAssessed: new Date('2024-01-14'),
      mitigations: ['PCI DSS compliance', 'Tokenization', 'Network segmentation'],
      owner: 'Security Team'
    },
    {
      id: '3',
      name: 'Cloud Storage Provider',
      category: 'vendor',
      riskScore: 67,
      impact: 'medium',
      likelihood: 'medium',
      lastAssessed: new Date('2024-01-13'),
      mitigations: ['SLA monitoring', 'Data encryption', 'Regular audits'],
      owner: 'Vendor Management'
    },
    {
      id: '4',
      name: 'Employee Onboarding',
      category: 'process',
      riskScore: 45,
      impact: 'medium',
      likelihood: 'low',
      lastAssessed: new Date('2024-01-12'),
      mitigations: ['Background checks', 'Training programs', 'Access reviews'],
      owner: 'HR Team'
    },
    {
      id: '5',
      name: 'Analytics Platform',
      category: 'system',
      riskScore: 73,
      impact: 'high',
      likelihood: 'medium',
      lastAssessed: new Date('2024-01-11'),
      mitigations: ['Data anonymization', 'Access logging', 'Regular updates'],
      owner: 'Analytics Team'
    },
    {
      id: '6',
      name: 'Third-party API',
      category: 'vendor',
      riskScore: 58,
      impact: 'medium',
      likelihood: 'medium',
      lastAssessed: new Date('2024-01-10'),
      mitigations: ['API rate limiting', 'Data validation', 'Monitoring'],
      owner: 'Development Team'
    }
  ];

  const getRiskColor = (score: number) => {
    if (score >= 80) return 'bg-red-500';
    if (score >= 60) return 'bg-orange-500';
    if (score >= 40) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const getRiskLevel = (score: number) => {
    if (score >= 80) return 'Critical';
    if (score >= 60) return 'High';
    if (score >= 40) return 'Medium';
    return 'Low';
  };

  const getRiskBadge = (score: number) => {
    if (score >= 80) return <Badge variant="danger">Critical</Badge>;
    if (score >= 60) return <Badge variant="danger">High</Badge>;
    if (score >= 40) return <Badge variant="warning">Medium</Badge>;
    return <Badge variant="success">Low</Badge>;
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'data_source': return <Database className="h-4 w-4" />;
      case 'system': return <Shield className="h-4 w-4" />;
      case 'process': return <BarChart3 className="h-4 w-4" />;
      case 'vendor': return <Cloud className="h-4 w-4" />;
      default: return <AlertTriangle className="h-4 w-4" />;
    }
  };

  const getCategoryLabel = (category: string) => {
    switch (category) {
      case 'data_source': return 'Data Source';
      case 'system': return 'System';
      case 'process': return 'Process';
      case 'vendor': return 'Vendor';
      default: return category;
    }
  };

  const filteredData = heatmapData.filter(item => {
    const categoryMatch = selectedCategory === 'all' || item.category === selectedCategory;
    const riskMatch = selectedRiskLevel === 'all' || getRiskLevel(item.riskScore).toLowerCase() === selectedRiskLevel;
    return categoryMatch && riskMatch;
  });

  const riskMatrix = [
    { impact: 'Critical', likelihood: ['Low', 'Medium', 'High', 'Critical'] },
    { impact: 'High', likelihood: ['Low', 'Medium', 'High', 'Critical'] },
    { impact: 'Medium', likelihood: ['Low', 'Medium', 'High', 'Critical'] },
    { impact: 'Low', likelihood: ['Low', 'Medium', 'High', 'Critical'] }
  ];

  const getMatrixCellColor = (impact: string, likelihood: string) => {
    const impactScore = { 'Low': 1, 'Medium': 2, 'High': 3, 'Critical': 4 }[impact] || 1;
    const likelihoodScore = { 'Low': 1, 'Medium': 2, 'High': 3, 'Critical': 4 }[likelihood] || 1;
    const totalScore = impactScore * likelihoodScore;
    
    if (totalScore >= 12) return 'bg-red-500';
    if (totalScore >= 8) return 'bg-orange-500';
    if (totalScore >= 4) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const getItemsInCell = (impact: string, likelihood: string) => {
    return filteredData.filter(item => 
      item.impact.toLowerCase() === impact.toLowerCase() && 
      item.likelihood.toLowerCase() === likelihood.toLowerCase()
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Risk Heatmap</h2>
          <p className="text-gray-600 mt-1">Visual representation of risk distribution across your organization</p>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      <div className="flex items-center space-x-4">
        <div className="flex items-center space-x-2">
          <Filter className="h-4 w-4 text-gray-400" />
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Categories</option>
            <option value="data_source">Data Sources</option>
            <option value="system">Systems</option>
            <option value="process">Processes</option>
            <option value="vendor">Vendors</option>
          </select>
        </div>
        <select
          value={selectedRiskLevel}
          onChange={(e) => setSelectedRiskLevel(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="all">All Risk Levels</option>
          <option value="critical">Critical</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Risk Matrix */}
        <Card>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Risk Matrix</h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr>
                  <th className="p-2 text-left text-sm font-medium text-gray-700">Impact / Likelihood</th>
                  <th className="p-2 text-center text-sm font-medium text-gray-700">Low</th>
                  <th className="p-2 text-center text-sm font-medium text-gray-700">Medium</th>
                  <th className="p-2 text-center text-sm font-medium text-gray-700">High</th>
                  <th className="p-2 text-center text-sm font-medium text-gray-700">Critical</th>
                </tr>
              </thead>
              <tbody>
                {riskMatrix.map((row, rowIndex) => (
                  <tr key={rowIndex}>
                    <td className="p-2 text-sm font-medium text-gray-700">{row.impact}</td>
                    {row.likelihood.map((likelihood, colIndex) => {
                      const itemsInCell = getItemsInCell(row.impact, likelihood);
                      return (
                        <td key={colIndex} className="p-1">
                          <div 
                            className={`h-16 w-full rounded ${getMatrixCellColor(row.impact, likelihood)} flex items-center justify-center text-white font-bold text-lg relative group cursor-pointer`}
                            title={`${row.impact} Impact, ${likelihood} Likelihood (${itemsInCell.length} items)`}
                          >
                            {itemsInCell.length}
                            {itemsInCell.length > 0 && (
                              <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 hidden group-hover:block bg-black text-white text-xs rounded py-1 px-2 whitespace-nowrap z-10">
                                {itemsInCell.map(item => item.name).join(', ')}
                              </div>
                            )}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-4 flex items-center justify-between text-sm text-gray-600">
            <span>Risk Level:</span>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-1">
                <div className="w-3 h-3 bg-green-500 rounded"></div>
                <span>Low</span>
              </div>
              <div className="flex items-center space-x-1">
                <div className="w-3 h-3 bg-yellow-500 rounded"></div>
                <span>Medium</span>
              </div>
              <div className="flex items-center space-x-1">
                <div className="w-3 h-3 bg-orange-500 rounded"></div>
                <span>High</span>
              </div>
              <div className="flex items-center space-x-1">
                <div className="w-3 h-3 bg-red-500 rounded"></div>
                <span>Critical</span>
              </div>
            </div>
          </div>
        </Card>

        {/* Risk Distribution */}
        <Card>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Risk Distribution</h3>
          <div className="space-y-4">
            {['Critical', 'High', 'Medium', 'Low'].map((level) => {
              const count = filteredData.filter(item => getRiskLevel(item.riskScore) === level).length;
              const percentage = filteredData.length > 0 ? (count / filteredData.length) * 100 : 0;
              
              return (
                <div key={level} className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="font-medium text-gray-700">{level} Risk</span>
                    <span className="text-gray-600">{count} items ({percentage.toFixed(1)}%)</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full ${
                        level === 'Critical' ? 'bg-red-500' :
                        level === 'High' ? 'bg-orange-500' :
                        level === 'Medium' ? 'bg-yellow-500' : 'bg-green-500'
                      }`}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      </div>

      {/* Risk Items List */}
      <Card>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Risk Items</h3>
        <div className="space-y-4">
          {filteredData.map((item) => (
            <div key={item.id} className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-start space-x-3">
                  {getCategoryIcon(item.category)}
                  <div>
                    <h4 className="font-medium text-gray-900">{item.name}</h4>
                    <p className="text-sm text-gray-600">{getCategoryLabel(item.category)} • Owner: {item.owner}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="text-right">
                    <div className="text-lg font-bold text-gray-900">{item.riskScore}</div>
                    <div className="text-xs text-gray-500">Risk Score</div>
                  </div>
                  {getRiskBadge(item.riskScore)}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-3">
                <div>
                  <p className="text-sm font-medium text-gray-700">Impact</p>
                  <Badge variant={
                    item.impact === 'critical' ? 'danger' :
                    item.impact === 'high' ? 'danger' :
                    item.impact === 'medium' ? 'warning' : 'success'
                  } size="sm">
                    {item.impact.toUpperCase()}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-700">Likelihood</p>
                  <Badge variant={
                    item.likelihood === 'critical' ? 'danger' :
                    item.likelihood === 'high' ? 'danger' :
                    item.likelihood === 'medium' ? 'warning' : 'success'
                  } size="sm">
                    {item.likelihood.toUpperCase()}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-700">Last Assessed</p>
                  <p className="text-sm text-gray-600">{item.lastAssessed.toLocaleDateString()}</p>
                </div>
              </div>

              <div>
                <p className="text-sm font-medium text-gray-700 mb-2">Risk Mitigations</p>
                <div className="flex flex-wrap gap-1">
                  {item.mitigations.map((mitigation, index) => (
                    <Badge key={index} variant="info" size="sm">
                      {mitigation}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>

        {filteredData.length === 0 && (
          <div className="text-center py-8">
            <p className="text-gray-500">No risk items match your filter criteria.</p>
          </div>
        )}
      </Card>
    </div>
  );
};

export default RiskHeatmap;