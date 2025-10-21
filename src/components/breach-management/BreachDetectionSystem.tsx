import React, { useState, useEffect } from 'react';
import { AlertTriangle, Settings, Play, Pause, Plus, Edit, Trash2 } from 'lucide-react';
import { BreachDetectionRule, DetectionCondition } from '../../types/breach-management';
import { breachManagementService } from '../../services/breachManagementService';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';

export const BreachDetectionSystem: React.FC = () => {
  const [rules, setRules] = useState<BreachDetectionRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingRule, setEditingRule] = useState<BreachDetectionRule | null>(null);

  useEffect(() => {
    loadDetectionRules();
  }, []);

  const loadDetectionRules = async () => {
    try {
      setLoading(true);
      const rulesData = await breachManagementService.getDetectionRules();
      setRules(rulesData);
    } catch (error) {
      console.error('Failed to load detection rules:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleRule = async (ruleId: string, enabled: boolean) => {
    try {
      await breachManagementService.toggleDetectionRule(ruleId, enabled);
      setRules(rules.map(rule => 
        rule.id === ruleId ? { ...rule, enabled } : rule
      ));
    } catch (error) {
      console.error('Failed to toggle rule:', error);
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'text-red-600 bg-red-50';
      case 'high': return 'text-orange-600 bg-orange-50';
      case 'medium': return 'text-yellow-600 bg-yellow-50';
      case 'low': return 'text-green-600 bg-green-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'data_access': return '🔍';
      case 'data_export': return '📤';
      case 'system_intrusion': return '🚨';
      case 'data_modification': return '✏️';
      default: return '⚠️';
    }
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
          <h2 className="text-xl font-bold text-gray-900">Breach Detection System</h2>
          <p className="text-gray-600">Configure automated breach detection rules</p>
        </div>
        <Button onClick={() => setShowCreateModal(true)} className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Add Rule
        </Button>
      </div>

      {/* Detection Rules */}
      <div className="grid gap-4">
        {rules.length === 0 ? (
          <Card className="p-8 text-center">
            <AlertTriangle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Detection Rules</h3>
            <p className="text-gray-600 mb-4">Create your first detection rule to start monitoring for breaches</p>
            <Button onClick={() => setShowCreateModal(true)}>
              Create Detection Rule
            </Button>
          </Card>
        ) : (
          rules.map((rule) => (
            <Card key={rule.id} className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-lg">{getCategoryIcon(rule.category)}</span>
                    <h3 className="font-semibold text-gray-900">{rule.name}</h3>
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${getSeverityColor(rule.severity)}`}>
                      {rule.severity.toUpperCase()}
                    </span>
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                      rule.enabled ? 'text-green-600 bg-green-50' : 'text-gray-600 bg-gray-50'
                    }`}>
                      {rule.enabled ? 'ACTIVE' : 'INACTIVE'}
                    </span>
                  </div>
                  
                  <p className="text-sm text-gray-600 mb-3">{rule.description}</p>
                  
                  <div className="space-y-2">
                    <div className="text-xs text-gray-500">
                      <span className="font-medium">Category:</span> {rule.category.replace('_', ' ')}
                    </div>
                    <div className="text-xs text-gray-500">
                      <span className="font-medium">Conditions:</span> {rule.conditions.length} rule(s)
                    </div>
                    <div className="text-xs text-gray-500">
                      <span className="font-medium">Last Triggered:</span> {
                        rule.lastTriggered 
                          ? new Date(rule.lastTriggered).toLocaleDateString()
                          : 'Never'
                      }
                    </div>
                    <div className="text-xs text-gray-500">
                      <span className="font-medium">Trigger Count:</span> {rule.triggerCount}
                    </div>
                  </div>

                  {/* Conditions Preview */}
                  <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                    <div className="text-xs font-medium text-gray-700 mb-2">Detection Conditions:</div>
                    <div className="space-y-1">
                      {rule.conditions.map((condition, index) => (
                        <div key={index} className="text-xs text-gray-600 font-mono">
                          {index > 0 && condition.logicalOperator && (
                            <span className="text-blue-600 font-bold">{condition.logicalOperator} </span>
                          )}
                          <span className="text-green-600">{condition.field}</span>
                          <span className="text-purple-600"> {condition.operator} </span>
                          <span className="text-orange-600">"{condition.value}"</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 ml-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => toggleRule(rule.id, !rule.enabled)}
                    className="flex items-center gap-1"
                  >
                    {rule.enabled ? (
                      <>
                        <Pause className="h-3 w-3" />
                        Disable
                      </>
                    ) : (
                      <>
                        <Play className="h-3 w-3" />
                        Enable
                      </>
                    )}
                  </Button>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setEditingRule(rule)}
                    className="flex items-center gap-1"
                  >
                    <Edit className="h-3 w-3" />
                    Edit
                  </Button>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex items-center gap-1 text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="h-3 w-3" />
                    Delete
                  </Button>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>

      {/* Rule Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Active Rules</p>
              <p className="text-2xl font-bold text-gray-900">
                {rules.filter(rule => rule.enabled).length}
              </p>
            </div>
            <Settings className="h-8 w-8 text-green-500" />
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Triggers</p>
              <p className="text-2xl font-bold text-gray-900">
                {rules.reduce((sum, rule) => sum + rule.triggerCount, 0)}
              </p>
            </div>
            <AlertTriangle className="h-8 w-8 text-orange-500" />
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Critical Rules</p>
              <p className="text-2xl font-bold text-gray-900">
                {rules.filter(rule => rule.severity === 'critical').length}
              </p>
            </div>
            <AlertTriangle className="h-8 w-8 text-red-500" />
          </div>
        </Card>
      </div>

      {/* Create/Edit Rule Modal would go here */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl">
            <h3 className="text-lg font-semibold mb-4">Create Detection Rule</h3>
            <p className="text-gray-600">Rule creation form would be implemented here</p>
            <div className="flex justify-end gap-2 mt-6">
              <Button variant="outline" onClick={() => setShowCreateModal(false)}>
                Cancel
              </Button>
              <Button onClick={() => setShowCreateModal(false)}>
                Create Rule
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};