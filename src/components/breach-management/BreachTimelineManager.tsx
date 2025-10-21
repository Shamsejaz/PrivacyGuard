import React, { useState, useEffect } from 'react';
import { Clock, Plus, FileText, User, Tag, Search, Filter } from 'lucide-react';
import { BreachTimelineEvent } from '../../types/breach-management';
import { breachManagementService } from '../../services/breachManagementService';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';

interface BreachTimelineManagerProps {
  breachId: string;
}

export const BreachTimelineManager: React.FC<BreachTimelineManagerProps> = ({
  breachId
}) => {
  const [timelineEvents, setTimelineEvents] = useState<BreachTimelineEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadTimelineEvents();
  }, [breachId]);

  const loadTimelineEvents = async () => {
    try {
      setLoading(true);
      const breach = await breachManagementService.getBreach(breachId);
      setTimelineEvents(breach.timeline || []);
    } catch (error) {
      console.error('Failed to load timeline events:', error);
    } finally {
      setLoading(false);
    }
  };

  const addTimelineEvent = async (eventData: Partial<BreachTimelineEvent>) => {
    try {
      const newEvent = await breachManagementService.addTimelineEvent(breachId, eventData);
      setTimelineEvents(prev => [newEvent, ...prev].sort((a, b) => 
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      ));
      setShowAddModal(false);
    } catch (error) {
      console.error('Failed to add timeline event:', error);
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'detection': return 'text-red-600 bg-red-50 border-red-200';
      case 'investigation': return 'text-blue-600 bg-blue-50 border-blue-200';
      case 'containment': return 'text-orange-600 bg-orange-50 border-orange-200';
      case 'notification': return 'text-purple-600 bg-purple-50 border-purple-200';
      case 'remediation': return 'text-green-600 bg-green-50 border-green-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'detection': return '🔍';
      case 'investigation': return '🕵️';
      case 'containment': return '🛡️';
      case 'notification': return '📢';
      case 'remediation': return '🔧';
      default: return '📝';
    }
  };

  const filteredEvents = timelineEvents.filter(event => {
    const matchesCategory = filterCategory === 'all' || event.category === filterCategory;
    const matchesSearch = searchTerm === '' || 
      event.event.toLowerCase().includes(searchTerm.toLowerCase()) ||
      event.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      event.performedBy.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCategory && matchesSearch;
  });

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
          <h3 className="text-lg font-semibold text-gray-900">Incident Timeline</h3>
          <p className="text-gray-600">Track all events and activities related to this breach</p>
        </div>
        <Button onClick={() => setShowAddModal(true)} className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Add Event
        </Button>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search events..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-gray-500" />
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Categories</option>
              <option value="detection">Detection</option>
              <option value="investigation">Investigation</option>
              <option value="containment">Containment</option>
              <option value="notification">Notification</option>
              <option value="remediation">Remediation</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Timeline */}
      <div className="space-y-4">
        {filteredEvents.length === 0 ? (
          <Card className="p-8 text-center">
            <Clock className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Timeline Events</h3>
            <p className="text-gray-600 mb-4">
              {searchTerm || filterCategory !== 'all' 
                ? 'No events match your current filters'
                : 'Start documenting the incident timeline'
              }
            </p>
            {(!searchTerm && filterCategory === 'all') && (
              <Button onClick={() => setShowAddModal(true)}>
                Add First Event
              </Button>
            )}
          </Card>
        ) : (
          <div className="relative">
            {/* Timeline Line */}
            <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-gray-200"></div>
            
            {filteredEvents.map((event, index) => (
              <div key={event.id} className="relative flex items-start gap-4 pb-8">
                {/* Timeline Dot */}
                <div className={`relative z-10 flex items-center justify-center w-8 h-8 rounded-full border-2 ${getCategoryColor(event.category)}`}>
                  <span className="text-sm">{getCategoryIcon(event.category)}</span>
                </div>

                {/* Event Card */}
                <Card className="flex-1 p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-1">
                        <h4 className="font-semibold text-gray-900">{event.event}</h4>
                        <span className={`px-2 py-1 text-xs font-medium rounded-full border ${getCategoryColor(event.category)}`}>
                          {event.category}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mb-2">{event.description}</p>
                    </div>
                    <div className="text-right text-sm text-gray-500 ml-4">
                      <div>{new Date(event.timestamp).toLocaleDateString()}</div>
                      <div>{new Date(event.timestamp).toLocaleTimeString()}</div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-sm text-gray-600">
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-1">
                        <User className="h-3 w-3" />
                        <span>{event.performedBy}</span>
                      </div>
                      {event.evidence && event.evidence.length > 0 && (
                        <div className="flex items-center gap-1">
                          <FileText className="h-3 w-3" />
                          <span>{event.evidence.length} evidence file{event.evidence.length !== 1 ? 's' : ''}</span>
                        </div>
                      )}
                    </div>
                    {event.impact && (
                      <div className="flex items-center gap-1">
                        <Tag className="h-3 w-3" />
                        <span className="text-xs bg-gray-100 px-2 py-1 rounded">Impact: {event.impact}</span>
                      </div>
                    )}
                  </div>

                  {/* Evidence Files */}
                  {event.evidence && event.evidence.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-gray-100">
                      <div className="text-xs font-medium text-gray-700 mb-2">Evidence:</div>
                      <div className="flex flex-wrap gap-2">
                        {event.evidence.map((evidenceId, idx) => (
                          <span key={idx} className="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded">
                            Evidence #{evidenceId}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </Card>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Event Modal */}
      {showAddModal && (
        <AddTimelineEventModal
          onSave={addTimelineEvent}
          onCancel={() => setShowAddModal(false)}
        />
      )}

      {/* Timeline Statistics */}
      <Card className="p-6 bg-gray-50">
        <h4 className="font-medium text-gray-900 mb-4">Timeline Statistics</h4>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
          {['detection', 'investigation', 'containment', 'notification', 'remediation'].map(category => (
            <div key={category} className="text-center">
              <div className="text-lg font-semibold text-gray-900">
                {timelineEvents.filter(e => e.category === category).length}
              </div>
              <div className="text-gray-600 capitalize">{category}</div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
};

interface AddTimelineEventModalProps {
  onSave: (eventData: Partial<BreachTimelineEvent>) => void;
  onCancel: () => void;
}

const AddTimelineEventModal: React.FC<AddTimelineEventModalProps> = ({ onSave, onCancel }) => {
  const [formData, setFormData] = useState({
    event: '',
    description: '',
    category: 'investigation' as const,
    timestamp: new Date().toISOString().slice(0, 16),
    performedBy: '',
    impact: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      ...formData,
      timestamp: new Date(formData.timestamp)
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-2xl">
        <h3 className="text-lg font-semibold mb-4">Add Timeline Event</h3>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Event Title
            </label>
            <input
              type="text"
              required
              value={formData.event}
              onChange={(e) => setFormData(prev => ({ ...prev, event: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Brief description of the event"
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
              placeholder="Detailed description of what happened"
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
                <option value="detection">Detection</option>
                <option value="investigation">Investigation</option>
                <option value="containment">Containment</option>
                <option value="notification">Notification</option>
                <option value="remediation">Remediation</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Timestamp
              </label>
              <input
                type="datetime-local"
                required
                value={formData.timestamp}
                onChange={(e) => setFormData(prev => ({ ...prev, timestamp: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Performed By
              </label>
              <input
                type="text"
                required
                value={formData.performedBy}
                onChange={(e) => setFormData(prev => ({ ...prev, performedBy: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Person or system responsible"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Impact (Optional)
              </label>
              <input
                type="text"
                value={formData.impact}
                onChange={(e) => setFormData(prev => ({ ...prev, impact: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Impact or outcome"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
            <Button type="submit">
              Add Event
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};