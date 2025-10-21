import React from 'react';
import { TrendingUp, AlertTriangle, CheckCircle, Clock } from 'lucide-react';
import { useCompliance } from '../../contexts/ComplianceContext';
import { ComplianceFramework } from '../../types/compliance';

interface ComplianceOverviewProps {
  onFrameworkSelect: (framework: ComplianceFramework, section: string) => void;
}

const ComplianceOverview: React.FC<ComplianceOverviewProps> = ({ onFrameworkSelect }) => {
  const { modules, progress } = useCompliance();

  const getOverallStats = () => {
    const stats = {
      totalFrameworks: modules.length,
      averageScore: 0,
      totalRequirements: 0,
      compliantRequirements: 0,
      criticalGaps: 0
    };

    let totalScore = 0;
    let frameworkCount = 0;

    Object.values(progress).forEach(p => {
      if (p.totalRequirements > 0) {
        totalScore += p.overallScore;
        frameworkCount++;
        stats.totalRequirements += p.totalRequirements;
        stats.compliantRequirements += p.compliantRequirements;
        stats.criticalGaps += p.nonCompliantRequirements;
      }
    });

    stats.averageScore = frameworkCount > 0 ? Math.round(totalScore / frameworkCount) : 0;

    return stats;
  };

  const stats = getOverallStats();

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getScoreBgColor = (score: number) => {
    if (score >= 80) return 'bg-green-100';
    if (score >= 60) return 'bg-yellow-100';
    return 'bg-red-100';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Compliance Management</h1>
        <p className="text-gray-600 mt-2">
          Matrix-based compliance framework management for GDPR, PDPL, HIPAA, and CCPA
        </p>
      </div>

      {/* Overall Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <TrendingUp className="h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Overall Score</p>
              <p className={`text-2xl font-bold ${getScoreColor(stats.averageScore)}`}>
                {stats.averageScore}%
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <CheckCircle className="h-6 w-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Compliant</p>
              <p className="text-2xl font-bold text-gray-900">
                {stats.compliantRequirements}/{stats.totalRequirements}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="p-2 bg-red-100 rounded-lg">
              <AlertTriangle className="h-6 w-6 text-red-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Critical Gaps</p>
              <p className="text-2xl font-bold text-red-600">{stats.criticalGaps}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Clock className="h-6 w-6 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Frameworks</p>
              <p className="text-2xl font-bold text-gray-900">{stats.totalFrameworks}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Framework Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {modules.map((module) => {
          const moduleProgress = progress[module.id];
          const score = moduleProgress?.overallScore || 0;
          
          return (
            <div
              key={module.id}
              className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => onFrameworkSelect(module.id, 'matrix')}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">{module.name}</h3>
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${getScoreColor(score)} ${getScoreBgColor(score)}`}>
                  {score}%
                </span>
              </div>
              
              <p className="text-gray-600 mb-4">{module.description}</p>
              
              {moduleProgress && (
                <div className="space-y-3">
                  {/* Progress Bar */}
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full ${score >= 80 ? 'bg-green-500' : score >= 60 ? 'bg-yellow-500' : 'bg-red-500'}`}
                      style={{ width: `${score}%` }}
                    ></div>
                  </div>
                  
                  {/* Statistics */}
                  <div className="flex justify-between text-sm text-gray-600">
                    <span>Total: {moduleProgress.totalRequirements}</span>
                    <div className="flex space-x-4">
                      <span className="text-green-600">✓ {moduleProgress.compliantRequirements}</span>
                      <span className="text-yellow-600">⚠ {moduleProgress.partialRequirements}</span>
                      <span className="text-red-600">✗ {moduleProgress.nonCompliantRequirements}</span>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Sections Preview */}
              <div className="mt-4 pt-4 border-t border-gray-100">
                <p className="text-sm text-gray-600 mb-2">Available Sections:</p>
                <div className="flex flex-wrap gap-2">
                  {module.sections.slice(0, 3).map((section) => (
                    <span
                      key={section.id}
                      className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded"
                    >
                      {section.name}
                    </span>
                  ))}
                  {module.sections.length > 3 && (
                    <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded">
                      +{module.sections.length - 3} more
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Quick Actions */}
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button
            onClick={() => onFrameworkSelect('GDPR', 'matrix')}
            className="p-4 text-left border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <h4 className="font-medium text-gray-900">Review GDPR Matrix</h4>
            <p className="text-sm text-gray-600 mt-1">Check compliance status and gaps</p>
          </button>
          
          <button
            onClick={() => onFrameworkSelect('PDPL', 'matrix')}
            className="p-4 text-left border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <h4 className="font-medium text-gray-900">Review PDPL Matrix</h4>
            <p className="text-sm text-gray-600 mt-1">Monitor PDPL compliance progress</p>
          </button>
          
          <button
            onClick={() => onFrameworkSelect('GDPR', 'breach')}
            className="p-4 text-left border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <h4 className="font-medium text-gray-900">Breach Management</h4>
            <p className="text-sm text-gray-600 mt-1">Manage incident notifications</p>
          </button>
        </div>
      </div>
    </div>
  );
};

export default ComplianceOverview;