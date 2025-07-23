import React, { useState, useEffect } from 'react';
import { Shield, AlertTriangle, TrendingUp, Globe, Clock, Eye, Download, RefreshCw, Filter, Search } from 'lucide-react';
import Card from '../ui/Card';
import Badge from '../ui/Badge';
import Button from '../ui/Button';

interface ThreatIntel {
  id: string;
  title: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  category: 'malware' | 'phishing' | 'vulnerability' | 'data_breach' | 'regulatory';
  source: string;
  publishedDate: Date;
  relevanceScore: number;
  affectedIndustries: string[];
  indicators: string[];
  recommendations: string[];
  tags: string[];
  url?: string;
}

interface ThreatTrend {
  category: string;
  count: number;
  change: number;
  trend: 'up' | 'down' | 'stable';
}

const ThreatIntelligence: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedSeverity, setSelectedSeverity] = useState('all');
  const [autoRefresh, setAutoRefresh] = useState(true);

  const [threatIntel, setThreatIntel] = useState<ThreatIntel[]>([
    {
      id: '1',
      title: 'New GDPR Enforcement Actions Target Healthcare Sector',
      description: 'European data protection authorities have increased enforcement activities targeting healthcare organizations with significant fines for data processing violations.',
      severity: 'high',
      category: 'regulatory',
      source: 'EU Data Protection Board',
      publishedDate: new Date('2024-01-15T10:30:00'),
      relevanceScore: 92,
      affectedIndustries: ['Healthcare', 'Technology'],
      indicators: ['GDPR violations', 'Healthcare data', 'Enforcement actions'],
      recommendations: [
        'Review current GDPR compliance measures',
        'Conduct privacy impact assessments',
        'Update data processing agreements'
      ],
      tags: ['GDPR', 'Healthcare', 'Enforcement', 'Privacy'],
      url: 'https://edpb.europa.eu/news'
    },
    {
      id: '2',
      title: 'Critical Vulnerability in Popular Database Software',
      description: 'A critical remote code execution vulnerability has been discovered in widely-used database management software, potentially affecting millions of installations.',
      severity: 'critical',
      category: 'vulnerability',
      source: 'NIST NVD',
      publishedDate: new Date('2024-01-14T16:45:00'),
      relevanceScore: 95,
      affectedIndustries: ['Technology', 'Finance', 'Healthcare', 'Retail'],
      indicators: ['CVE-2024-0001', 'Database vulnerability', 'Remote code execution'],
      recommendations: [
        'Apply security patches immediately',
        'Review database access controls',
        'Monitor for exploitation attempts'
      ],
      tags: ['Vulnerability', 'Database', 'Critical', 'Patch'],
      url: 'https://nvd.nist.gov'
    },
    {
      id: '3',
      title: 'Sophisticated Phishing Campaign Targets Financial Institutions',
      description: 'A new phishing campaign using advanced social engineering techniques is specifically targeting employees of financial institutions to steal credentials.',
      severity: 'high',
      category: 'phishing',
      source: 'Financial Services ISAC',
      publishedDate: new Date('2024-01-13T09:15:00'),
      relevanceScore: 88,
      affectedIndustries: ['Finance', 'Banking'],
      indicators: ['Phishing emails', 'Social engineering', 'Credential theft'],
      recommendations: [
        'Enhance email security filters',
        'Conduct phishing awareness training',
        'Implement multi-factor authentication'
      ],
      tags: ['Phishing', 'Finance', 'Social Engineering', 'Credentials'],
      url: 'https://www.fsisac.com'
    },
    {
      id: '4',
      title: 'Ransomware Group Targets Cloud Infrastructure',
      description: 'A sophisticated ransomware group has been observed targeting cloud infrastructure providers and their customers, using novel encryption techniques.',
      severity: 'critical',
      category: 'malware',
      source: 'Cybersecurity & Infrastructure Security Agency',
      publishedDate: new Date('2024-01-12T14:20:00'),
      relevanceScore: 90,
      affectedIndustries: ['Technology', 'Cloud Services', 'All Industries'],
      indicators: ['Ransomware', 'Cloud infrastructure', 'Encryption'],
      recommendations: [
        'Review cloud security configurations',
        'Implement robust backup strategies',
        'Monitor for unusual network activity'
      ],
      tags: ['Ransomware', 'Cloud', 'Malware', 'Infrastructure'],
      url: 'https://www.cisa.gov'
    },
    {
      id: '5',
      title: 'Major Data Breach Exposes Customer Information',
      description: 'A large retail chain has disclosed a data breach affecting millions of customer records, including payment card information and personal data.',
      severity: 'high',
      category: 'data_breach',
      source: 'Security Incident Database',
      publishedDate: new Date('2024-01-11T11:30:00'),
      relevanceScore: 85,
      affectedIndustries: ['Retail', 'E-commerce'],
      indicators: ['Data breach', 'Customer data', 'Payment cards'],
      recommendations: [
        'Review payment processing security',
        'Assess third-party vendor risks',
        'Enhance data encryption measures'
      ],
      tags: ['Data Breach', 'Retail', 'Customer Data', 'Payment Cards'],
      url: 'https://www.privacyrights.org'
    }
  ]);

  const [threatTrends, setThreatTrends] = useState<ThreatTrend[]>([
    { category: 'Malware', count: 156, change: 12, trend: 'up' },
    { category: 'Phishing', count: 89, change: -5, trend: 'down' },
    { category: 'Vulnerabilities', count: 234, change: 23, trend: 'up' },
    { category: 'Data Breaches', count: 45, change: 3, trend: 'up' },
    { category: 'Regulatory', count: 67, change: 8, trend: 'up' }
  ]);

  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      // Simulate real-time threat intelligence updates
      setThreatTrends(prev => prev.map(trend => ({
        ...trend,
        count: trend.count + Math.floor(Math.random() * 3),
        change: Math.floor(Math.random() * 10) - 5
      })));
    }, 30000); // Update every 30 seconds

    return () => clearInterval(interval);
  }, [autoRefresh]);

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case 'critical': return <Badge variant="danger">Critical</Badge>;
      case 'high': return <Badge variant="danger">High</Badge>;
      case 'medium': return <Badge variant="warning">Medium</Badge>;
      case 'low': return <Badge variant="success">Low</Badge>;
      default: return <Badge variant="default">Unknown</Badge>;
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'malware': return <AlertTriangle className="h-4 w-4 text-red-500" />;
      case 'phishing': return <Shield className="h-4 w-4 text-orange-500" />;
      case 'vulnerability': return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case 'data_breach': return <Shield className="h-4 w-4 text-purple-500" />;
      case 'regulatory': return <Globe className="h-4 w-4 text-blue-500" />;
      default: return <AlertTriangle className="h-4 w-4 text-gray-500" />;
    }
  };

  const getCategoryLabel = (category: string) => {
    switch (category) {
      case 'malware': return 'Malware';
      case 'phishing': return 'Phishing';
      case 'vulnerability': return 'Vulnerability';
      case 'data_breach': return 'Data Breach';
      case 'regulatory': return 'Regulatory';
      default: return category;
    }
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up': return <TrendingUp className="h-4 w-4 text-red-500" />;
      case 'down': return <TrendingUp className="h-4 w-4 text-green-500 transform rotate-180" />;
      default: return <div className="h-4 w-4 bg-gray-400 rounded-full" />;
    }
  };

  const filteredThreats = threatIntel.filter(threat => {
    const matchesSearch = threat.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         threat.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         threat.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesCategory = selectedCategory === 'all' || threat.category === selectedCategory;
    const matchesSeverity = selectedSeverity === 'all' || threat.severity === selectedSeverity;
    return matchesSearch && matchesCategory && matchesSeverity;
  });

  const severityCounts = {
    critical: threatIntel.filter(t => t.severity === 'critical').length,
    high: threatIntel.filter(t => t.severity === 'high').length,
    medium: threatIntel.filter(t => t.severity === 'medium').length,
    low: threatIntel.filter(t => t.severity === 'low').length
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Threat Intelligence</h2>
          <p className="text-gray-600 mt-1">Real-time threat intelligence and security advisories</p>
        </div>
        <div className="flex items-center space-x-2">
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="autoRefresh"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label htmlFor="autoRefresh" className="text-sm text-gray-700">
              Auto-refresh
            </label>
          </div>
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

      {/* Threat Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Critical Threats</p>
              <p className="text-2xl font-bold text-red-600">{severityCounts.critical}</p>
            </div>
            <AlertTriangle className="h-8 w-8 text-red-600" />
          </div>
        </Card>
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">High Priority</p>
              <p className="text-2xl font-bold text-orange-600">{severityCounts.high}</p>
            </div>
            <AlertTriangle className="h-8 w-8 text-orange-600" />
          </div>
        </Card>
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Medium Priority</p>
              <p className="text-2xl font-bold text-yellow-600">{severityCounts.medium}</p>
            </div>
            <AlertTriangle className="h-8 w-8 text-yellow-600" />
          </div>
        </Card>
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Threats</p>
              <p className="text-2xl font-bold text-gray-900">{threatIntel.length}</p>
            </div>
            <Shield className="h-8 w-8 text-gray-600" />
          </div>
        </Card>
      </div>

      {/* Threat Trends */}
      <Card>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Threat Trends (Last 30 Days)</h3>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {threatTrends.map((trend, index) => (
            <div key={index} className="text-center p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center justify-center space-x-1 mb-2">
                {getTrendIcon(trend.trend)}
                <span className="font-medium text-gray-900">{trend.category}</span>
              </div>
              <div className="text-2xl font-bold text-gray-900 mb-1">{trend.count}</div>
              <div className={`text-sm ${
                trend.change > 0 ? 'text-red-600' : trend.change < 0 ? 'text-green-600' : 'text-gray-600'
              }`}>
                {trend.change > 0 ? '+' : ''}{trend.change} this week
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Filters */}
      <div className="flex items-center space-x-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search threats, tags, or indicators..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        <div className="flex items-center space-x-2">
          <Filter className="h-4 w-4 text-gray-400" />
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Categories</option>
            <option value="malware">Malware</option>
            <option value="phishing">Phishing</option>
            <option value="vulnerability">Vulnerabilities</option>
            <option value="data_breach">Data Breaches</option>
            <option value="regulatory">Regulatory</option>
          </select>
        </div>
        <select
          value={selectedSeverity}
          onChange={(e) => setSelectedSeverity(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="all">All Severities</option>
          <option value="critical">Critical</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>
      </div>

      {/* Threat Intelligence Feed */}
      <Card>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Threat Intelligence Feed</h3>
        <div className="space-y-4">
          {filteredThreats.map((threat) => (
            <div key={threat.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-start space-x-3">
                  {getCategoryIcon(threat.category)}
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-1">
                      <h4 className="font-medium text-gray-900">{threat.title}</h4>
                      {getSeverityBadge(threat.severity)}
                    </div>
                    <p className="text-sm text-gray-600 mb-2">{threat.description}</p>
                    <div className="flex items-center space-x-4 text-sm text-gray-500">
                      <span className="flex items-center">
                        <Clock className="h-4 w-4 mr-1" />
                        {threat.publishedDate.toLocaleDateString()}
                      </span>
                      <span>Source: {threat.source}</span>
                      <span>Relevance: {threat.relevanceScore}%</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  {threat.url && (
                    <Button variant="ghost" size="sm" onClick={() => window.open(threat.url, '_blank')}>
                      <Eye className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-2">Affected Industries</p>
                  <div className="flex flex-wrap gap-1">
                    {threat.affectedIndustries.map((industry, index) => (
                      <Badge key={index} variant="info" size="sm">
                        {industry}
                      </Badge>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-2">Indicators</p>
                  <div className="flex flex-wrap gap-1">
                    {threat.indicators.slice(0, 3).map((indicator, index) => (
                      <Badge key={index} variant="warning" size="sm">
                        {indicator}
                      </Badge>
                    ))}
                    {threat.indicators.length > 3 && (
                      <Badge variant="default" size="sm">
                        +{threat.indicators.length - 3} more
                      </Badge>
                    )}
                  </div>
                </div>
              </div>

              <div className="bg-blue-50 p-3 rounded-lg">
                <p className="text-sm font-medium text-blue-800 mb-2">Recommended Actions</p>
                <ul className="space-y-1">
                  {threat.recommendations.map((recommendation, index) => (
                    <li key={index} className="flex items-start space-x-2">
                      <div className="w-1.5 h-1.5 bg-blue-600 rounded-full mt-2 flex-shrink-0"></div>
                      <span className="text-sm text-blue-700">{recommendation}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="mt-3 pt-3 border-t border-gray-200">
                <div className="flex flex-wrap gap-1">
                  {threat.tags.map((tag, index) => (
                    <Badge key={index} variant="default" size="sm">
                      #{tag}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>

        {filteredThreats.length === 0 && (
          <div className="text-center py-8">
            <Shield className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">No threat intelligence matches your search criteria.</p>
          </div>
        )}
      </Card>
    </div>
  );
};

export default ThreatIntelligence;