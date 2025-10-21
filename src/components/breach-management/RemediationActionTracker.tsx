import React, { useState, useEffect } from 'react';
import { Plus, CheckCircle, Clock, AlertTriangle, User, Calendar, DollarSign, TrendingUp } from 'lucide-react';
import { RemediationAction } from '../../types/breach-management';
import { breachManagementService } from '../../services/breachManagementService';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';

interface RemediationActionTrackerProps {
  breachId: string;
}

export const RemediationActionTracker: React.FC<RemediationActionTrackerProps> = ({
  breachId
}) => {
  const [actions, setActions] = useState<RemediationAction[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterCategory, setFilterCategory] = useState<string>('all');

  useEffect(() => {
    loadRemediationActions();
  }, [breachId]);

  const loadRemediationActions = async () => {
    try {
      setLoading(true);
      const breach = await breachManagementService.getBreach(breachId);
      setActions(breach.remediationActions || []);
    } catch (error) {
      console.error('Failed to load remediation actions:', error);
    } finally {
      setLoading(false);
    }
  };

  const addRemediationAction = async (actionData: Partial<RemediationAction>) => {
    try {
      const newAction = await breachManagementService.addRemediationAction(breachId, actionData);
      setActions(prev => [...prev, newAction]);
      setShowAddModal(false);
    } catch (error) {
      console.error('Failed to add remediation action:', error);
    }
  };

  const updateActionStatus = async (actionId: string, status: string) => {
    try {
      const updates: Partial<RemediationAction> = { 
        status: status as any,
        ...(status === 'completed' && { completedAt: new Date() })
      };
      
      await breachManagementService.updateRemediationAction(breachId, actionId, updates);
      setActions(prev => prev.map(action =>
        action.id === actionId ? { ...action, ...updates } : action
      ));
    } catch (error) {
      console.error('Failed to update action status:', error);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'text-red-600 bg-red-50 border-red-200';
      case 'high': return 'text-orange-600 bg-orange-50 border-orange-200';
      case 'medium': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'low': return 'text-green-600 bg-green-50 border-green-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'planned': return 'text-gray-600 bg-gray-50';
      case 'in_progress': return 'text-blue-600 bg-blue-50';
      case 'completed': return 'text-green-600 bg-green-50';
      case 'cancelled': return 'text-red-600 bg-red-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'technical': return '🔧';
      case 'organizational': return '🏢';
      case 'legal': return '⚖️';
      case 'communication': return '📢';
      default: return '📋';
    }
  };

  const getEffectivenessColor = (effectiveness?: string) => {
    if (!effectiveness) return 'text-gray-400';
    switch (effectiveness) {
      case 'high': return 'text-green-600';
      case 'medium': return 'text-yellow-600';
      case 'low': return 'text-red-600';
      default: return 'text-gray-400';
    }
  };

  const filteredActions = actions.filter(action => {
    const matchesStatus = filterStatus === 'all' || action.status === filterStatus;
    const matchesCategory = filterCategory === 'all' || action.category === filterCategory;
    return matchesStatus && matchesCategory;
  });

  const isOverdue = (dueDate: Date, status: string) => {
    return status !== 'completed' && status !== 'cancelled' && new Date() > new Date(dueDate);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Remediation Actions</h3>
          <p className="text-gray-600">Track and manage actions to address the breach</p>
        </div>
        <Button onClick={() => setShowAddModal(true)} className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Add Action
        </Button>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700">Status:</label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Statuses</option>
              <option value="planned">Planned</option>
              <option value="in_progress">In Progress</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700">Category:</label>
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Categories</option>
              <option value="technical">Technical</option>
              <option value="organizational">Organizational</option>
              <option value="legal">Legal</option>
              <option value="communication">Communication</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Actions List */}
      <div className="space-y-4">
        {filteredActions.length === 0 ? (
          <Card className="p-8 text-center">
            <CheckCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Remediation Actions</h3>
            <p className="text-gray-600 mb-4">
              {filterStatus !== 'all' || filterCategory !== 'all' 
                ? 'No actions match your current filters'
                : 'Start planning remediation actions for this breach'
              }
            </p>
            {filterStatus === 'all' && filterCategory === 'all' && (
              <Button onClick={() => setShowAddModal(true)}>
                Add First Action
              </Button>
            )}
          </Card>
        ) : (
          filteredActions.map((action) => (
            <Card 
              key={action.id} 
              className={`p-6 border-l-4 ${getPriorityColor(action.priority)} ${
                isOverdue(action.dueDate, action.status) ? 'bg-red-50' : ''
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-4 flex-1">
                  <span className="text-2xl">{getCategoryIcon(action.category)}</span>
                  
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h4 className="font-semibold text-gray-900">{action.title}</h4>
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getPriorityColor(action.priority)}`}>
                        {action.priority.toUpperCase()}
                      </span>
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(action.status)}`}>
                        {action.status.replace('_', ' ').toUpperCase()}
                      </span>
                      {isOverdue(action.dueDate, action.status) && (
                        <span className="px-2 py-1 text-xs font-medium rounded-full text-red-600 bg-red-100">
                          OVERDUE
                        </span>
                      )}
                    </div>
                    
                    <p className="text-sm text-gray-600 mb-3">{action.description}</p>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-600 mb-3">
                      <div className="flex items-center gap-1">
                        <User className="h-3 w-3" />
                        <span>{action.assignedTo}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        <span>Due: {new Date(action.dueDate).toLocaleDateString()}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="capitalize">{action.category}</span>
                      </div>
                      {action.cost && (
                        <div className="flex items-center gap-1">
                          <DollarSign className="h-3 w-3" />
                          <span>${action.cost.toLocaleString()}</span>
                        </div>
                      )}
                    </div>

                    {action.completedAt && (
                      <div className="text-sm text-gray-600 mb-2">
                        <span className="font-medium">Completed:</span> {new Date(action.completedAt).toLocaleDateString()}
                      </div>
                    )}

                    {action.effectiveness && (
                      <div className="flex items-center gap-2 text-sm">
                        <TrendingUp className="h-3 w-3" />
                        <span className="font-medium">Effectiveness:</span>
                        <span className={`capitalize ${getEffectivenessColor(action.effectiveness)}`}>
                          {action.effectiveness}
                        </span>
                      </div>
                    )}

                    {/* Evidence Files */}
                    {action.evidence && action.evidence.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-gray-100">
                        <div className="text-xs font-medium text-gray-700 mb-2">Evidence:</div>
                        <div className="flex flex-wrap gap-2">
                          {action.evidence.map((evidenceId, idx) => (
                            <span key={idx} className="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded">
                              Evidence #{evidenceId}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 ml-4">
                  {action.status === 'planned' && (
                    <Button
                      size="sm"
                      onClick={() => updateActionStatus(action.id, 'in_progress')}
                      className="flex items-center gap-1"
                    >
                      <Clock className="h-3 w-3" />
                      Start
                    </Button>
                  )}

                  {action.status === 'in_progress' && (
                    <Button
                      size="sm"
                      onClick={() => updateActionStatus(action.id, 'completed')}
                      className="flex items-center gap-1"
                    >
                      <CheckCircle className="h-3 w-3" />
                      Complete
                    </Button>
                  )}

                  {action.status === 'completed' && (
                    <div className="flex items-center gap-1 text-green-600">
                      <CheckCircle className="h-4 w-4" />
                      <span className="text-sm">Completed</span>
                    </div>
                  )}

                  <Button variant="outline" size="sm">
                    Edit
                  </Button>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>

      {/* Add Action Modal */}
      {showAddModal && (
        <AddRemediationActionModal
          onSave={addRemediationAction}
          onCancel={() => setShowAddModal(false)}
        />
      )}

      {/* Summary Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Actions</p>
              <p className="text-2xl font-bold text-gray-900">{actions.length}</p>
            </div>
            <CheckCircle className="h-8 w-8 text-gray-400" />
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">In Progress</p>
              <p className="text-2xl font-bold text-blue-600">
                {actions.filter(a => a.status === 'in_progress').length}
              </p>
            </div>
            <Clock className="h-8 w-8 text-blue-500" />
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Completed</p>
              <p className="text-2xl font-bold text-green-600">
                {actions.filter(a => a.status === 'completed').length}
              </p>
            </div>
            <CheckCircle className="h-8 w-8 text-green-500" />
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Overdue</p>
              <p className="text-2xl font-bold text-red-600">
                {actions.filter(a => isOverdue(a.dueDate, a.status)).length}
              </p>
            </div>
            <AlertTriangle className="h-8 w-8 text-red-500" />
          </div>
        </Card>
      </div>
    </div>
  );
};

interface AddRemediationActionModalProps {
  onSave: (actionData: Partial<RemediationAction>) => void;
  onCancel: () => void;
}

const AddRemediationActionModal: React.FC<AddRemediationActionModalProps> = ({ onSave, onCancel }) => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'technical' as const,
    priority: 'medium' as const,
    assignedTo: '',
    dueDate: new Date().toISOString().split('T')[0],
    cost: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      ...formData,
      dueDate: new Date(formData.dueDate),
      cost: formData.cost ? parseFloat(formData.cost) : undefined,
      status: 'planned'
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-2xl">
        <h3 className="text-lg font-semibold mb-4">Add Remediation Action</h3>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Action Title
            </label>
            <input
              type="text"
              required
              value={formData.title}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Brief title for the remediation action"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description
            </label>
            <textarea
              required
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Detailed description of the action to be taken"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Category
              </label>
              <select
                value={formData.category}
                onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value as any }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="technical">Technical</option>
                <option value="organizational">Organizational</option>
                <option value="legal">Legal</option>
                <option value="communication">Communication</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Priority
              </label>
              <select
                value={formData.priority}
                onChange={(e) => setFormData(prev => ({ ...prev, priority: e.target.value as any }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Assigned To
              </label>
              <input
                type="text"
                required
                value={formData.assignedTo}
                onChange={(e) => setFormData(prev => ({ ...prev, assignedTo: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Person responsible for this action"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Due Date
              </label>
              <input
                type="date"
                required
                value={formData.dueDate}
                onChange={(e) => setFormData(prev => ({ ...prev, dueDate: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Estimated Cost (Optional)
            </label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={formData.cost}
              onChange={(e) => setFormData(prev => ({ ...prev, cost: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Estimated cost in USD"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
            <Button type="submit">
              Add Action
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};