import React, { useState, useEffect } from 'react';
import { Calendar, Clock, AlertTriangle, CheckCircle, Plus, Filter, Bell, User, BarChart3 } from 'lucide-react';
import { ComplianceFramework } from '../../types/compliance';
import { cn } from '../../utils/cn';

interface ComplianceDeadline {
  id: string;
  framework: ComplianceFramework;
  requirement: string;
  description: string;
  dueDate: Date;
  status: 'overdue' | 'due_soon' | 'on_track' | 'completed';
  priority: 'high' | 'medium' | 'low';
  assignedTo: string;
  category: string;
  notificationSent: boolean;
  completedDate?: Date;
  notes?: string;
}

interface DeadlineTrackerProps {
  onDeadlineAdd?: (deadline: ComplianceDeadline) => void;
  onNotificationSend?: (deadlineId: string) => void;
}

interface DeadlineAnalytics {
  totalDeadlines: number;
  overdueCount: number;
  dueSoonCount: number;
  completedThisMonth: number;
  averageCompletionTime: number;
  upcomingInNext30Days: number;
}

const DeadlineTracker: React.FC<DeadlineTrackerProps> = ({
  onDeadlineAdd,
  onNotificationSend
}) => {
  const [selectedFramework, setSelectedFramework] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedPriority, setSelectedPriority] = useState<string>('all');
  const [showAddForm, setShowAddForm] = useState(false);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [sortBy, setSortBy] = useState<'dueDate' | 'priority' | 'framework'>('dueDate');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [deadlineForm, setDeadlineForm] = useState({
    framework: 'GDPR' as ComplianceFramework,
    requirement: '',
    description: '',
    dueDate: '',
    priority: 'medium' as ComplianceDeadline['priority'],
    assignedTo: '',
    category: ''
  });
  const [analytics, setAnalytics] = useState<DeadlineAnalytics>({
    totalDeadlines: 0,
    overdueCount: 0,
    dueSoonCount: 0,
    completedThisMonth: 0,
    averageCompletionTime: 0,
    upcomingInNext30Days: 0
  });

  // Mock data for demonstration
  const deadlines: ComplianceDeadline[] = [
    {
      id: '1',
      framework: 'GDPR',
      requirement: 'Article 30 - Records of Processing Review',
      description: 'Annual review and update of processing records',
      dueDate: new Date('2024-02-15'),
      status: 'due_soon',
      priority: 'high',
      assignedTo: 'Sarah Johnson',
      category: 'Documentation',
      notificationSent: true
    },
    {
      id: '2',
      framework: 'PDPL',
      requirement: 'Consent Management Audit',
      description: 'Quarterly audit of consent collection mechanisms',
      dueDate: new Date('2024-02-10'),
      status: 'overdue',
      priority: 'high',
      assignedTo: 'Michael Chen',
      category: 'Audit',
      notificationSent: true
    },
    {
      id: '3',
      framework: 'HIPAA',
      requirement: 'Security Risk Assessment',
      description: 'Annual security risk assessment and documentation',
      dueDate: new Date('2024-02-20'),
      status: 'on_track',
      priority: 'medium',
      assignedTo: 'Security Team',
      category: 'Security',
      notificationSent: false
    },
    {
      id: '4',
      framework: 'CCPA',
      requirement: 'Consumer Rights Documentation',
      description: 'Update consumer rights documentation and procedures',
      dueDate: new Date('2024-02-25'),
      status: 'on_track',
      priority: 'medium',
      assignedTo: 'Legal Team',
      category: 'Documentation',
      notificationSent: false
    },
    {
      id: '5',
      framework: 'GDPR',
      requirement: 'DPIA Review',
      description: 'Review and update Data Protection Impact Assessments',
      dueDate: new Date('2024-01-30'),
      status: 'completed',
      priority: 'high',
      assignedTo: 'Privacy Team',
      category: 'Assessment',
      notificationSent: true,
      completedDate: new Date('2024-01-28')
    }
  ];

  // Calculate analytics
  useEffect(() => {
    const now = new Date();
    const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    
    const newAnalytics: DeadlineAnalytics = {
      totalDeadlines: deadlines.length,
      overdueCount: deadlines.filter(d => d.status === 'overdue').length,
      dueSoonCount: deadlines.filter(d => d.status === 'due_soon').length,
      completedThisMonth: deadlines.filter(d => 
        d.status === 'completed' && 
        d.completedDate && 
        d.completedDate >= startOfMonth
      ).length,
      averageCompletionTime: 5.2, // Mock data - would be calculated from actual completion times
      upcomingInNext30Days: deadlines.filter(d => 
        d.dueDate <= thirtyDaysFromNow && 
        d.dueDate >= now && 
        d.status !== 'completed'
      ).length
    };
    
    setAnalytics(newAnalytics);
  }, [deadlines]);

  const filteredDeadlines = deadlines
    .filter(deadline => {
      const frameworkMatch = selectedFramework === 'all' || deadline.framework === selectedFramework;
      const statusMatch = selectedStatus === 'all' || deadline.status === selectedStatus;
      const priorityMatch = selectedPriority === 'all' || deadline.priority === selectedPriority;
      return frameworkMatch && statusMatch && priorityMatch;
    })
    .sort((a, b) => {
      let comparison = 0;
      
      switch (sortBy) {
        case 'dueDate':
          comparison = a.dueDate.getTime() - b.dueDate.getTime();
          break;
        case 'priority':
          const priorityOrder = { high: 3, medium: 2, low: 1 };
          comparison = priorityOrder[b.priority] - priorityOrder[a.priority];
          break;
        case 'framework':
          comparison = a.framework.localeCompare(b.framework);
          break;
      }
      
      return sortOrder === 'asc' ? comparison : -comparison;
    });

  const getStatusIcon = (status: ComplianceDeadline['status']) => {
    switch (status) {
      case 'overdue':
        return <AlertTriangle className="h-5 w-5 text-red-600" />;
      case 'due_soon':
        return <Clock className="h-5 w-5 text-yellow-600" />;
      case 'on_track':
        return <Calendar className="h-5 w-5 text-blue-600" />;
      case 'completed':
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      default:
        return <Clock className="h-5 w-5 text-gray-600" />;
    }
  };

  const getStatusColor = (status: ComplianceDeadline['status']) => {
    switch (status) {
      case 'overdue':
        return 'bg-red-100 text-red-800';
      case 'due_soon':
        return 'bg-yellow-100 text-yellow-800';
      case 'on_track':
        return 'bg-blue-100 text-blue-800';
      case 'completed':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority: ComplianceDeadline['priority']) => {
    switch (priority) {
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

  const getDaysUntilDue = (dueDate: Date) => {
    const today = new Date();
    const diffTime = dueDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!deadlineForm.requirement || !deadlineForm.dueDate) return;

    const newDeadline: ComplianceDeadline = {
      id: Date.now().toString(),
      framework: deadlineForm.framework,
      requirement: deadlineForm.requirement,
      description: deadlineForm.description,
      dueDate: new Date(deadlineForm.dueDate),
      status: 'on_track',
      priority: deadlineForm.priority,
      assignedTo: deadlineForm.assignedTo,
      category: deadlineForm.category,
      notificationSent: false
    };

    onDeadlineAdd?.(newDeadline);
    setDeadlineForm({
      framework: 'GDPR',
      requirement: '',
      description: '',
      dueDate: '',
      priority: 'medium',
      assignedTo: '',
      category: ''
    });
    setShowAddForm(false);
  };

  const getStatusCounts = () => {
    return {
      overdue: deadlines.filter(d => d.status === 'overdue').length,
      due_soon: deadlines.filter(d => d.status === 'due_soon').length,
      on_track: deadlines.filter(d => d.status === 'on_track').length,
      completed: deadlines.filter(d => d.status === 'completed').length
    };
  };

  const statusCounts = getStatusCounts();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Deadline Tracker</h2>
          <p className="text-gray-600 mt-1">Monitor compliance deadlines and notifications</p>
        </div>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Deadline
        </button>
      </div>

      {/* Status Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="p-2 bg-red-100 rounded-lg">
                <AlertTriangle className="h-6 w-6 text-red-600" />
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-600">Overdue</p>
                <p className="text-2xl font-bold text-red-600">{statusCounts.overdue}</p>
              </div>
            </div>
            {statusCounts.overdue > 0 && (
              <div className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded-full">
                Action Required
              </div>
            )}
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <Clock className="h-6 w-6 text-yellow-600" />
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-600">Due Soon</p>
                <p className="text-2xl font-bold text-yellow-600">{statusCounts.due_soon}</p>
              </div>
            </div>
            {statusCounts.due_soon > 0 && (
              <div className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full">
                Monitor
              </div>
            )}
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Calendar className="h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-600">On Track</p>
              <p className="text-2xl font-bold text-blue-600">{statusCounts.on_track}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <CheckCircle className="h-6 w-6 text-green-600" />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-600">Completed</p>
              <p className="text-2xl font-bold text-green-600">{statusCounts.completed}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Analytics Panel */}
      {showAnalytics && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">Deadline Analytics</h3>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-4">
                <h4 className="font-medium text-gray-900">Performance Metrics</h4>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Completed this month</span>
                    <span className="font-medium">{analytics.completedThisMonth}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Average completion time</span>
                    <span className="font-medium">{analytics.averageCompletionTime} days</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Upcoming (30 days)</span>
                    <span className="font-medium">{analytics.upcomingInNext30Days}</span>
                  </div>
                </div>
              </div>
              
              <div className="space-y-4">
                <h4 className="font-medium text-gray-900">Framework Distribution</h4>
                <div className="space-y-2">
                  {['GDPR', 'PDPL', 'HIPAA', 'CCPA'].map(framework => {
                    const count = deadlines.filter(d => d.framework === framework).length;
                    const percentage = deadlines.length > 0 ? Math.round((count / deadlines.length) * 100) : 0;
                    return (
                      <div key={framework} className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">{framework}</span>
                        <div className="flex items-center space-x-2">
                          <div className="w-16 bg-gray-200 rounded-full h-2">
                            <div 
                              className="bg-blue-500 h-2 rounded-full" 
                              style={{ width: `${percentage}%` }}
                            ></div>
                          </div>
                          <span className="text-sm font-medium w-8">{count}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
              
              <div className="space-y-4">
                <h4 className="font-medium text-gray-900">Priority Breakdown</h4>
                <div className="space-y-2">
                  {['high', 'medium', 'low'].map(priority => {
                    const count = deadlines.filter(d => d.priority === priority).length;
                    const colorClass = priority === 'high' ? 'bg-red-500' : priority === 'medium' ? 'bg-yellow-500' : 'bg-green-500';
                    return (
                      <div key={priority} className="flex items-center justify-between">
                        <span className="text-sm text-gray-600 capitalize">{priority}</span>
                        <div className="flex items-center space-x-2">
                          <div className="w-16 bg-gray-200 rounded-full h-2">
                            <div 
                              className={`${colorClass} h-2 rounded-full`} 
                              style={{ width: `${deadlines.length > 0 ? (count / deadlines.length) * 100 : 0}%` }}
                            ></div>
                          </div>
                          <span className="text-sm font-medium w-8">{count}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Deadline Form */}
      {showAddForm && (
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Add New Deadline</h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Framework</label>
                <select
                  value={deadlineForm.framework}
                  onChange={(e) => setDeadlineForm(prev => ({ ...prev, framework: e.target.value as ComplianceFramework }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="GDPR">GDPR</option>
                  <option value="PDPL">PDPL</option>
                  <option value="HIPAA">HIPAA</option>
                  <option value="CCPA">CCPA</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
                <select
                  value={deadlineForm.priority}
                  onChange={(e) => setDeadlineForm(prev => ({ ...prev, priority: e.target.value as ComplianceDeadline['priority'] }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Requirement</label>
              <input
                type="text"
                value={deadlineForm.requirement}
                onChange={(e) => setDeadlineForm(prev => ({ ...prev, requirement: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter requirement title"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea
                value={deadlineForm.description}
                onChange={(e) => setDeadlineForm(prev => ({ ...prev, description: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={3}
                placeholder="Enter description"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Due Date</label>
                <input
                  type="date"
                  value={deadlineForm.dueDate}
                  onChange={(e) => setDeadlineForm(prev => ({ ...prev, dueDate: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Assigned To</label>
                <input
                  type="text"
                  value={deadlineForm.assignedTo}
                  onChange={(e) => setDeadlineForm(prev => ({ ...prev, assignedTo: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter assignee"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                <input
                  type="text"
                  value={deadlineForm.category}
                  onChange={(e) => setDeadlineForm(prev => ({ ...prev, category: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter category"
                />
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <button
                type="submit"
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Add Deadline
              </button>
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Filters and Controls */}
      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Filter className="h-5 w-5 text-gray-400" />
            <div className="flex items-center space-x-4">
              <select
                value={selectedFramework}
                onChange={(e) => setSelectedFramework(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Frameworks</option>
                <option value="GDPR">GDPR</option>
                <option value="PDPL">PDPL</option>
                <option value="HIPAA">HIPAA</option>
                <option value="CCPA">CCPA</option>
              </select>
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Status</option>
                <option value="overdue">Overdue</option>
                <option value="due_soon">Due Soon</option>
                <option value="on_track">On Track</option>
                <option value="completed">Completed</option>
              </select>
              <select
                value={selectedPriority}
                onChange={(e) => setSelectedPriority(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Priorities</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <div className="flex items-center space-x-2">
              <label className="text-sm text-gray-600">Sort by:</label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as 'dueDate' | 'priority' | 'framework')}
                className="px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="dueDate">Due Date</option>
                <option value="priority">Priority</option>
                <option value="framework">Framework</option>
              </select>
              <button
                onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                className="p-1 text-gray-400 hover:text-gray-600"
                title={`Sort ${sortOrder === 'asc' ? 'Descending' : 'Ascending'}`}
              >
                {sortOrder === 'asc' ? '↑' : '↓'}
              </button>
            </div>
            
            <button
              onClick={() => setShowAnalytics(!showAnalytics)}
              className={cn(
                'inline-flex items-center px-3 py-2 border text-sm font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500',
                showAnalytics 
                  ? 'border-blue-300 text-blue-700 bg-blue-50 hover:bg-blue-100'
                  : 'border-gray-300 text-gray-700 bg-white hover:bg-gray-50'
              )}
            >
              <BarChart3 className="h-4 w-4 mr-2" />
              Analytics
            </button>
          </div>
        </div>
      </div>

      {/* Deadlines List */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">
            Deadlines ({filteredDeadlines.length})
          </h3>
        </div>
        <div className="divide-y divide-gray-200">
          {filteredDeadlines.map((deadline) => {
            const daysUntilDue = getDaysUntilDue(deadline.dueDate);
            
            return (
              <div key={deadline.id} className="p-6 hover:bg-gray-50">
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-3">
                    {getStatusIcon(deadline.status)}
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <span className="text-sm font-medium text-blue-600">{deadline.framework}</span>
                        <span className={cn(
                          'inline-flex px-2 py-1 text-xs font-medium rounded-full',
                          getPriorityColor(deadline.priority)
                        )}>
                          {deadline.priority}
                        </span>
                        <span className="inline-flex px-2 py-1 text-xs bg-gray-100 text-gray-800 rounded-full">
                          {deadline.category}
                        </span>
                      </div>
                      <h4 className="text-sm font-medium text-gray-900 mb-1">{deadline.requirement}</h4>
                      <p className="text-sm text-gray-600 mb-3">{deadline.description}</p>
                      
                      <div className="flex items-center space-x-4 text-sm text-gray-500">
                        <div className="flex items-center space-x-1">
                          <Calendar className="h-4 w-4" />
                          <span>Due: {deadline.dueDate.toLocaleDateString()}</span>
                          {deadline.status !== 'completed' && (
                            <span className={cn(
                              'ml-2',
                              daysUntilDue < 0 ? 'text-red-600' :
                              daysUntilDue <= 7 ? 'text-yellow-600' :
                              'text-gray-600'
                            )}>
                              ({daysUntilDue < 0 ? `${Math.abs(daysUntilDue)} days overdue` :
                                daysUntilDue === 0 ? 'Due today' :
                                `${daysUntilDue} days remaining`})
                            </span>
                          )}
                        </div>
                        <div className="flex items-center space-x-1">
                          <User className="h-4 w-4" />
                          <span>{deadline.assignedTo}</span>
                        </div>
                      </div>
                      
                      {deadline.completedDate && (
                        <div className="mt-2 text-sm text-green-600">
                          Completed on {deadline.completedDate.toLocaleDateString()}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className={cn(
                      'inline-flex px-2 py-1 text-xs font-medium rounded-full',
                      getStatusColor(deadline.status)
                    )}>
                      {deadline.status.replace('_', ' ')}
                    </span>
                    {!deadline.notificationSent && deadline.status !== 'completed' && (
                      <button
                        onClick={() => onNotificationSend?.(deadline.id)}
                        className="p-1 text-gray-400 hover:text-blue-600"
                        title="Send Notification"
                      >
                        <Bell className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default DeadlineTracker;