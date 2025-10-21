import React, { useState } from 'react';
import { AlertTriangle, Plus, Edit, Trash2, Calendar, User, Target } from 'lucide-react';
import { GapAnalysis as GapAnalysisType } from '../../types/compliance';
import { cn } from '../../utils/cn';

interface GapAnalysisProps {
  requirementId: string;
  gaps: GapAnalysisType[];
  onGapAdd: (gap: GapAnalysisType) => void;
  onGapUpdate: (gapId: string, gap: Partial<GapAnalysisType>) => void;
  onGapRemove: (gapId: string) => void;
}

const GapAnalysis: React.FC<GapAnalysisProps> = ({
  requirementId,
  gaps,
  onGapAdd,
  onGapUpdate,
  onGapRemove
}) => {
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingGap, setEditingGap] = useState<string | null>(null);
  const [gapForm, setGapForm] = useState({
    gap: '',
    impact: 'medium' as GapAnalysisType['impact'],
    remediationPlan: '',
    targetDate: '',
    assignedTo: '',
    status: 'open' as GapAnalysisType['status']
  });

  const resetForm = () => {
    setGapForm({
      gap: '',
      impact: 'medium',
      remediationPlan: '',
      targetDate: '',
      assignedTo: '',
      status: 'open'
    });
    setShowAddForm(false);
    setEditingGap(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!gapForm.gap || !gapForm.remediationPlan) return;

    const gapData: GapAnalysisType = {
      requirementId,
      gap: gapForm.gap,
      impact: gapForm.impact,
      remediationPlan: gapForm.remediationPlan,
      targetDate: new Date(gapForm.targetDate),
      assignedTo: gapForm.assignedTo,
      status: gapForm.status
    };

    if (editingGap) {
      onGapUpdate(editingGap, gapData);
    } else {
      onGapAdd(gapData);
    }

    resetForm();
  };

  const handleEdit = (gap: GapAnalysisType) => {
    setGapForm({
      gap: gap.gap,
      impact: gap.impact,
      remediationPlan: gap.remediationPlan,
      targetDate: gap.targetDate.toISOString().split('T')[0],
      assignedTo: gap.assignedTo,
      status: gap.status
    });
    setEditingGap(gap.requirementId);
    setShowAddForm(true);
  };

  const getImpactColor = (impact: GapAnalysisType['impact']) => {
    switch (impact) {
      case 'high':
        return 'bg-red-100 text-red-800';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800';
      case 'low':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusColor = (status: GapAnalysisType['status']) => {
    switch (status) {
      case 'open':
        return 'bg-red-100 text-red-800';
      case 'in_progress':
        return 'bg-yellow-100 text-yellow-800';
      case 'resolved':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getImpactIcon = (impact: GapAnalysisType['impact']) => {
    switch (impact) {
      case 'high':
        return <AlertTriangle className="h-4 w-4 text-red-600" />;
      case 'medium':
        return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
      case 'low':
        return <AlertTriangle className="h-4 w-4 text-green-600" />;
      default:
        return <AlertTriangle className="h-4 w-4 text-gray-600" />;
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium text-gray-900">Gap Analysis & Remediation</h3>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Gap
        </button>
      </div>

      {/* Add/Edit Form */}
      {showAddForm && (
        <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Gap Description
              </label>
              <textarea
                value={gapForm.gap}
                onChange={(e) => setGapForm(prev => ({ ...prev, gap: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={3}
                placeholder="Describe the compliance gap"
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Impact Level
                </label>
                <select
                  value={gapForm.impact}
                  onChange={(e) => setGapForm(prev => ({ ...prev, impact: e.target.value as GapAnalysisType['impact'] }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Status
                </label>
                <select
                  value={gapForm.status}
                  onChange={(e) => setGapForm(prev => ({ ...prev, status: e.target.value as GapAnalysisType['status'] }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="open">Open</option>
                  <option value="in_progress">In Progress</option>
                  <option value="resolved">Resolved</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Remediation Plan
              </label>
              <textarea
                value={gapForm.remediationPlan}
                onChange={(e) => setGapForm(prev => ({ ...prev, remediationPlan: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={3}
                placeholder="Describe the remediation plan"
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Target Date
                </label>
                <input
                  type="date"
                  value={gapForm.targetDate}
                  onChange={(e) => setGapForm(prev => ({ ...prev, targetDate: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Assigned To
                </label>
                <input
                  type="text"
                  value={gapForm.assignedTo}
                  onChange={(e) => setGapForm(prev => ({ ...prev, assignedTo: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter assignee name"
                  required
                />
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <button
                type="submit"
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                {editingGap ? 'Update Gap' : 'Add Gap'}
              </button>
              <button
                type="button"
                onClick={resetForm}
                className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Gaps List */}
      <div className="space-y-3">
        {gaps.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Target className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <p>No gaps identified</p>
            <p className="text-sm">Add gaps to track compliance issues and remediation plans</p>
          </div>
        ) : (
          gaps.map((gap, index) => (
            <div key={index} className="bg-white p-4 rounded-lg border border-gray-200 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-start space-x-3">
                  {getImpactIcon(gap.impact)}
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      <span className={cn(
                        'inline-flex px-2 py-1 text-xs font-medium rounded-full',
                        getImpactColor(gap.impact)
                      )}>
                        {gap.impact} impact
                      </span>
                      <span className={cn(
                        'inline-flex px-2 py-1 text-xs font-medium rounded-full',
                        getStatusColor(gap.status)
                      )}>
                        {gap.status.replace('_', ' ')}
                      </span>
                    </div>
                    <h4 className="text-sm font-medium text-gray-900 mb-2">Gap Description</h4>
                    <p className="text-sm text-gray-600 mb-3">{gap.gap}</p>
                    
                    <h4 className="text-sm font-medium text-gray-900 mb-2">Remediation Plan</h4>
                    <p className="text-sm text-gray-600 mb-3">{gap.remediationPlan}</p>
                    
                    <div className="flex items-center space-x-4 text-xs text-gray-500">
                      <div className="flex items-center space-x-1">
                        <User className="h-3 w-3" />
                        <span>{gap.assignedTo}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Calendar className="h-3 w-3" />
                        <span>Due: {gap.targetDate.toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => handleEdit(gap)}
                    className="p-1 text-gray-400 hover:text-blue-600"
                    title="Edit Gap"
                  >
                    <Edit className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => onGapRemove(gap.requirementId)}
                    className="p-1 text-gray-400 hover:text-red-600"
                    title="Remove Gap"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default GapAnalysis;