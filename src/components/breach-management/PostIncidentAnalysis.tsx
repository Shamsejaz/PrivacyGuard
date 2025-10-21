import React, { useState, useEffect } from 'react';
import { FileText, CheckCircle, AlertTriangle, Lightbulb, TrendingUp, Users, BookOpen, Settings } from 'lucide-react';
import { PostIncidentAnalysis, RootCauseAnalysis, LessonLearned, PreventionRecommendation } from '../../types/breach-management';
import { breachManagementService } from '../../services/breachManagementService';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';

interface PostIncidentAnalysisProps {
  breachId: string;
}

export const PostIncidentAnalysisComponent: React.FC<PostIncidentAnalysisProps> = ({
  breachId
}) => {
  const [analysis, setAnalysis] = useState<PostIncidentAnalysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'root_cause' | 'lessons' | 'recommendations' | 'improvements'>('overview');
  const [editMode, setEditMode] = useState(false);

  useEffect(() => {
    loadPostIncidentAnalysis();
  }, [breachId]);

  const loadPostIncidentAnalysis = async () => {
    try {
      setLoading(true);
      const breach = await breachManagementService.getBreach(breachId);
      setAnalysis(breach.postIncidentAnalysis || null);
    } catch (error) {
      console.error('Failed to load post-incident analysis:', error);
    } finally {
      setLoading(false);
    }
  };

  const createAnalysis = async () => {
    try {
      const newAnalysis = await breachManagementService.createPostIncidentAnalysis(breachId, {
        rootCauseAnalysis: {
          primaryCause: '',
          contributingFactors: [],
          methodology: '5_whys',
          analysis: '',
          evidence: [],
          preventability: 'preventable'
        },
        lessonsLearned: [],
        preventionRecommendations: [],
        processImprovements: [],
        trainingNeeds: [],
        policyUpdates: [],
        completedBy: 'Current User', // This would come from auth context
        completedAt: new Date(),
        approved: false
      });
      setAnalysis(newAnalysis);
      setEditMode(true);
    } catch (error) {
      console.error('Failed to create post-incident analysis:', error);
    }
  };

  const approveAnalysis = async () => {
    if (!analysis) return;
    
    try {
      const approvedAnalysis = await breachManagementService.approvePostIncidentAnalysis(breachId);
      setAnalysis(approvedAnalysis);
    } catch (error) {
      console.error('Failed to approve analysis:', error);
    }
  };

  const getPreventabilityColor = (preventability: string) => {
    switch (preventability) {
      case 'preventable': return 'text-red-600 bg-red-50';
      case 'partially_preventable': return 'text-yellow-600 bg-yellow-50';
      case 'not_preventable': return 'text-green-600 bg-green-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'text-red-600 bg-red-50';
      case 'high': return 'text-orange-600 bg-orange-50';
      case 'medium': return 'text-yellow-600 bg-yellow-50';
      case 'low': return 'text-green-600 bg-green-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'proposed': return 'text-gray-600 bg-gray-50';
      case 'approved': return 'text-blue-600 bg-blue-50';
      case 'in_progress': return 'text-yellow-600 bg-yellow-50';
      case 'completed': return 'text-green-600 bg-green-50';
      case 'rejected': return 'text-red-600 bg-red-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!analysis) {
    return (
      <Card className="p-8 text-center">
        <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">No Post-Incident Analysis</h3>
        <p className="text-gray-600 mb-4">
          Create a comprehensive analysis to learn from this incident and prevent future occurrences
        </p>
        <Button onClick={createAnalysis}>
          Start Post-Incident Analysis
        </Button>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Post-Incident Analysis</h3>
          <p className="text-gray-600">Comprehensive analysis and lessons learned from the breach</p>
        </div>
        <div className="flex items-center gap-2">
          {!analysis.approved && (
            <>
              <Button variant="outline" onClick={() => setEditMode(!editMode)}>
                {editMode ? 'View Mode' : 'Edit Mode'}
              </Button>
              <Button onClick={approveAnalysis} className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4" />
                Approve Analysis
              </Button>
            </>
          )}
          {analysis.approved && (
            <div className="flex items-center gap-2 text-green-600">
              <CheckCircle className="h-5 w-5" />
              <span className="font-medium">Approved</span>
            </div>
          )}
        </div>
      </div>

      {/* Status Card */}
      <Card className={`p-4 ${analysis.approved ? 'border-green-200 bg-green-50' : 'border-yellow-200 bg-yellow-50'}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {analysis.approved ? (
              <CheckCircle className="h-6 w-6 text-green-600" />
            ) : (
              <AlertTriangle className="h-6 w-6 text-yellow-600" />
            )}
            <div>
              <h4 className="font-medium text-gray-900">
                Analysis Status: {analysis.approved ? 'Approved' : 'Pending Approval'}
              </h4>
              <p className="text-sm text-gray-600">
                Completed by {analysis.completedBy} on {new Date(analysis.completedAt).toLocaleDateString()}
                {analysis.approvedBy && (
                  <span> • Approved by {analysis.approvedBy} on {new Date(analysis.approvedAt!).toLocaleDateString()}</span>
                )}
              </p>
            </div>
          </div>
        </div>
      </Card>

      {/* Navigation Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {[
            { id: 'overview', label: 'Overview', icon: FileText },
            { id: 'root_cause', label: 'Root Cause', icon: AlertTriangle },
            { id: 'lessons', label: 'Lessons Learned', icon: Lightbulb },
            { id: 'recommendations', label: 'Recommendations', icon: TrendingUp },
            { id: 'improvements', label: 'Improvements', icon: Settings }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <tab.icon className="h-4 w-4" />
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="p-6">
            <h4 className="font-semibold text-gray-900 mb-4">Analysis Summary</h4>
            <div className="space-y-3 text-sm">
              <div>
                <span className="font-medium text-gray-700">Primary Cause:</span>
                <p className="text-gray-600 mt-1">{analysis.rootCauseAnalysis.primaryCause || 'Not specified'}</p>
              </div>
              <div>
                <span className="font-medium text-gray-700">Methodology:</span>
                <span className="ml-2 text-gray-600 capitalize">{analysis.rootCauseAnalysis.methodology.replace('_', ' ')}</span>
              </div>
              <div>
                <span className="font-medium text-gray-700">Preventability:</span>
                <span className={`ml-2 px-2 py-1 text-xs font-medium rounded-full ${getPreventabilityColor(analysis.rootCauseAnalysis.preventability)}`}>
                  {analysis.rootCauseAnalysis.preventability.replace('_', ' ').toUpperCase()}
                </span>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <h4 className="font-semibold text-gray-900 mb-4">Key Metrics</h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{analysis.lessonsLearned.length}</div>
                <div className="text-sm text-gray-600">Lessons Learned</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{analysis.preventionRecommendations.length}</div>
                <div className="text-sm text-gray-600">Recommendations</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">{analysis.processImprovements.length}</div>
                <div className="text-sm text-gray-600">Process Improvements</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600">{analysis.trainingNeeds.length}</div>
                <div className="text-sm text-gray-600">Training Needs</div>
              </div>
            </div>
          </Card>
        </div>
      )}

      {activeTab === 'root_cause' && (
        <Card className="p-6">
          <h4 className="font-semibold text-gray-900 mb-4">Root Cause Analysis</h4>
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Primary Cause</label>
              <p className="text-gray-900 bg-gray-50 p-3 rounded-md">
                {analysis.rootCauseAnalysis.primaryCause || 'Not specified'}
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Contributing Factors</label>
              <div className="space-y-2">
                {analysis.rootCauseAnalysis.contributingFactors.length === 0 ? (
                  <p className="text-gray-500 italic">No contributing factors identified</p>
                ) : (
                  analysis.rootCauseAnalysis.contributingFactors.map((factor, index) => (
                    <div key={index} className="flex items-center gap-2 p-2 bg-gray-50 rounded">
                      <span className="text-sm text-gray-600">•</span>
                      <span className="text-sm text-gray-900">{factor}</span>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Analysis</label>
              <p className="text-gray-900 bg-gray-50 p-3 rounded-md whitespace-pre-wrap">
                {analysis.rootCauseAnalysis.analysis || 'No detailed analysis provided'}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Methodology</label>
                <span className="inline-block px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-sm capitalize">
                  {analysis.rootCauseAnalysis.methodology.replace('_', ' ')}
                </span>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Preventability</label>
                <span className={`inline-block px-3 py-1 rounded-full text-sm ${getPreventabilityColor(analysis.rootCauseAnalysis.preventability)}`}>
                  {analysis.rootCauseAnalysis.preventability.replace('_', ' ').toUpperCase()}
                </span>
              </div>
            </div>
          </div>
        </Card>
      )}

      {activeTab === 'lessons' && (
        <div className="space-y-4">
          {analysis.lessonsLearned.length === 0 ? (
            <Card className="p-8 text-center">
              <Lightbulb className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Lessons Learned</h3>
              <p className="text-gray-600">Document key lessons learned from this incident</p>
            </Card>
          ) : (
            analysis.lessonsLearned.map((lesson) => (
              <Card key={lesson.id} className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h4 className="font-semibold text-gray-900">{lesson.lesson}</h4>
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getPriorityColor(lesson.priority)}`}>
                        {lesson.priority.toUpperCase()}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mb-3">{lesson.description}</p>
                    <div className="flex items-center gap-4 text-xs text-gray-500">
                      <span>Category: {lesson.category.replace('_', ' ')}</span>
                      <span>Applicability: {lesson.applicability.replace('_', ' ')}</span>
                    </div>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      )}

      {activeTab === 'recommendations' && (
        <div className="space-y-4">
          {analysis.preventionRecommendations.length === 0 ? (
            <Card className="p-8 text-center">
              <TrendingUp className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Prevention Recommendations</h3>
              <p className="text-gray-600">Add recommendations to prevent similar incidents</p>
            </Card>
          ) : (
            analysis.preventionRecommendations.map((recommendation) => (
              <Card key={recommendation.id} className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h4 className="font-semibold text-gray-900">{recommendation.title}</h4>
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getPriorityColor(recommendation.priority)}`}>
                        {recommendation.priority.toUpperCase()}
                      </span>
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(recommendation.status)}`}>
                        {recommendation.status.replace('_', ' ').toUpperCase()}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mb-3">{recommendation.description}</p>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs text-gray-500">
                      <span>Category: {recommendation.category.replace('_', ' ')}</span>
                      <span>Cost: ${recommendation.estimatedCost.toLocaleString()}</span>
                      <span>Effort: {recommendation.estimatedEffort}</span>
                      <span>Timeline: {recommendation.timeline}</span>
                    </div>
                    {recommendation.assignedTo && (
                      <div className="mt-2 text-xs text-gray-500">
                        Assigned to: {recommendation.assignedTo}
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      )}

      {activeTab === 'improvements' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Process Improvements */}
          <Card className="p-6">
            <h4 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Process Improvements
            </h4>
            <div className="space-y-3">
              {analysis.processImprovements.length === 0 ? (
                <p className="text-gray-500 italic">No process improvements identified</p>
              ) : (
                analysis.processImprovements.map((improvement) => (
                  <div key={improvement.id} className="p-3 border border-gray-200 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <h5 className="font-medium text-gray-900">{improvement.process}</h5>
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(improvement.status)}`}>
                        {improvement.status.replace('_', ' ').toUpperCase()}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mb-2">{improvement.proposedState}</p>
                    <div className="text-xs text-gray-500">
                      Priority: {improvement.priority} • Effort: {improvement.effort} • Owner: {improvement.owner}
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card>

          {/* Training Needs */}
          <Card className="p-6">
            <h4 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Users className="h-5 w-5" />
              Training Needs
            </h4>
            <div className="space-y-3">
              {analysis.trainingNeeds.length === 0 ? (
                <p className="text-gray-500 italic">No training needs identified</p>
              ) : (
                analysis.trainingNeeds.map((training) => (
                  <div key={training.id} className="p-3 border border-gray-200 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <h5 className="font-medium text-gray-900">{training.topic}</h5>
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(training.status)}`}>
                        {training.status.replace('_', ' ').toUpperCase()}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mb-2">{training.description}</p>
                    <div className="text-xs text-gray-500">
                      Audience: {training.audience} • Method: {training.deliveryMethod} • Urgency: {training.urgency}
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card>

          {/* Policy Updates */}
          <Card className="p-6 lg:col-span-2">
            <h4 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <BookOpen className="h-5 w-5" />
              Policy Updates
            </h4>
            <div className="space-y-3">
              {analysis.policyUpdates.length === 0 ? (
                <p className="text-gray-500 italic">No policy updates required</p>
              ) : (
                analysis.policyUpdates.map((policy) => (
                  <div key={policy.id} className="p-4 border border-gray-200 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <h5 className="font-medium text-gray-900">{policy.policy}</h5>
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(policy.status)}`}>
                        {policy.status.replace('_', ' ').toUpperCase()}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mb-2">{policy.proposedChanges}</p>
                    <p className="text-sm text-gray-500 mb-2">Rationale: {policy.rationale}</p>
                    <div className="text-xs text-gray-500">
                      Impact: {policy.impact} • Urgency: {policy.urgency} • Owner: {policy.owner}
                      {policy.targetDate && (
                        <span> • Target: {new Date(policy.targetDate).toLocaleDateString()}</span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};