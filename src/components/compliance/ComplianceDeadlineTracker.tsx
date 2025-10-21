import React, { useState, useEffect } from 'react';
import { 
  Calendar, 
  Clock, 
  AlertTriangle, 
  CheckCircle, 
  XCircle,
  Filter,
  Search,
  Bell
} from 'lucide-react';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { ComplianceDeadline, ComplianceFramework } from '../../types/compliance';
import { complianceDashboardService } from '../../services/complianceDashboardService';
import { useAuditLogger } from '../../hooks/useAuditLogger';

interface ComplianceDeadlineTrackerProps {
  deadlines?: ComplianceDeadline[];
  framework?: ComplianceFramework;
  compact?: boolean;
  onDeadlineUpdate?: () => void;
}

const ComplianceDeadlineTracker: React.FC<ComplianceDeadlineTrackerProps> = ({
  deadlines: propDeadlines,
  framework,
  compact = false,
  onDeadlineUpdate
}) => {
  const [deadlines, setDeadlines] = useState<ComplianceDeadline[]>(propDeadlines || []);
  const [loading, setLoading] = useState(!propDeadlines);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'upcoming' | 'overdue' | 'completed'>('upcoming');
  const [searchTerm, setSearchTerm] = useState('');

  const { logButtonClick, logSearch } = useAuditLogger({
    component: 'ComplianceDeadlineTracker'
  });

  useEffect(() => {
    if (!propDeadlines) {
      loadDeadlines();
    }
  }, [framework, propDeadlines]);

  const loadDeadlines = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await complianceDashboardService.getDeadlines(framework);
      setDeadlines(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load deadlines');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async (term: string) => {
    setSearchTerm(term);
    if (term) {
      await logSearch('compliance_deadlines', term, filteredDeadlines.length);
    }
  };

  const handleMarkComplete = async (deadlineId: string) => {
    try {
      await complianceDashboardService.updateDeadlineStatus(deadlineId, 'completed');
      await logButtonClick('mark_deadline_complete', { deadlineId });
      
      setDeadlines(prev => 
        prev.map(d => 
          d.id === deadlineId 
            ? { ...d, status: 'completed', completedAt: new Date() }
            : d
        )
      );
      
      if (onDeadlineUpdate) {
        onDeadlineUpdate();
      }
    } catch (error) {
      console.error('Failed to mark deadline as complete:', error);
    }
  };

  const handleSetReminder = async (deadlineId: string) => {
    try {
      await complianceDashboardService.setDeadlineReminder(deadlineId);
      await logButtonClick('set_deadline_reminder', { deadlineId });
      
      setDeadlines(prev => 
        prev.map(d => 
          d.id === deadlineId 
            ? { ...d, reminderSet: true }
            : d
        )
      );
    } catch (error) {
      console.error('Failed to set reminder:', error);
    }
  };

  const getDaysUntilDeadline = (deadline: Date) => {
    const now = new Date();
    const diffTime = deadline.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const getDeadlineStatus = (deadline: ComplianceDeadline) => {
    if (deadline.status === 'completed') return 'completed';
    
    const daysUntil = getDaysUntilDeadline(deadline.dueDate);
    if (daysUntil < 0) return 'overdue';
    if (daysUntil <= 7) return 'urgent';
    if (daysUntil <= 30) return 'upcoming';
    return 'future';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'text-green-600 bg-green-100';
      case 'overdue':
        return 'text-red-600 bg-red-100';
      case 'urgent':
        return 'text-orange-600 bg-orange-100';
      case 'upcoming':
        return 'text-yellow-600 bg-yellow-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-4 h-4" />;
      case 'overdue':
        return <XCircle className="w-4 h-4" />;
      case 'urgent':
        return <AlertTriangle className="w-4 h-4" />;
      default:
        return <Clock className="w-4 h-4" />;
    }
  };

  const filteredDeadlines = deadlines.filter(deadline => {
    const status = getDeadlineStatus(deadline);
    
    // Filter by status
    if (filter === 'upcoming' && !['upcoming', 'urgent'].includes(status)) return false;
    if (filter === 'overdue' && status !== 'overdue') return false;
    if (filter === 'completed' && status !== 'completed') return false;
    
    // Filter by search term
    if (searchTerm && !deadline.title.toLowerCase().includes(searchTerm.toLowerCase()) &&
        !deadline.description?.toLowerCase().includes(searchTerm.toLowerCase()) &&
        !deadline.framework.toLowerCase().includes(searchTerm.toLowerCase())) {
      return false;
    }
    
    return true;
  });

  const sortedDeadlines = filteredDeadlines.sort((a, b) => {
    // Sort by urgency first, then by due date
    const statusA = getDeadlineStatus(a);
    const statusB = getDeadlineStatus(b);
    
    const statusPriority = { overdue: 0, urgent: 1, upcoming: 2, future: 3, completed: 4 };
    const priorityA = statusPriority[statusA as keyof typeof statusPriority] || 5;
    const priorityB = statusPriority[statusB as keyof typeof statusPriority] || 5;
    
    if (priorityA !== priorityB) {
      return priorityA - priorityB;
    }
    
    return a.dueDate.getTime() - b.dueDate.getTime();
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-32">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-md p-4">
        <p className="text-red-700">{error}</p>
      </div>
    );
  }

  if (compact) {
    return (
      <div className="space-y-3">
        {sortedDeadlines.slice(0, 5).map(deadline => {
          const status = getDeadlineStatus(deadline);
          const daysUntil = getDaysUntilDeadline(deadline.dueDate);
          
          return (
            <div key={deadline.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-md">
              <div className="flex items-center space-x-3">
                <div className={`p-1 rounded-full ${getStatusColor(status)}`}>
                  {getStatusIcon(status)}
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">{deadline.title}</p>
                  <p className="text-xs text-gray-500">
                    {deadline.framework} • {deadline.dueDate.toLocaleDateString()}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className={`text-xs font-medium ${
                  status === 'overdue' ? 'text-red-600' :
                  status === 'urgent' ? 'text-orange-600' :
                  'text-gray-600'
                }`}>
                  {status === 'overdue' ? `${Math.abs(daysUntil)} days overdue` :
                   status === 'completed' ? 'Completed' :
                   `${daysUntil} days left`}
                </p>
              </div>
            </div>
          );
        })}
        
        {sortedDeadlines.length === 0 && (
          <div className="text-center py-8">
            <Calendar className="w-8 h-8 text-gray-400 mx-auto mb-2" />
            <p className="text-sm text-gray-500">No deadlines found</p>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header and Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Compliance Deadlines</h2>
          <p className="text-sm text-gray-600">Track and manage compliance deadlines</p>
        </div>
        
        <div className="flex items-center space-x-3">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search deadlines..."
              value={searchTerm}
              onChange={(e) => handleSearch(e.target.value)}
              className="pl-10 pr-3 py-2 border border-gray-300 rounded-md text-sm w-64"
            />
          </div>
          
          {/* Filter */}
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as any)}
            className="border border-gray-300 rounded-md px-3 py-2 text-sm"
          >
            <option value="all">All Deadlines</option>
            <option value="upcoming">Upcoming</option>
            <option value="overdue">Overdue</option>
            <option value="completed">Completed</option>
          </select>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total', count: deadlines.length, color: 'bg-gray-100 text-gray-800' },
          { 
            label: 'Overdue', 
            count: deadlines.filter(d => getDeadlineStatus(d) === 'overdue').length,
            color: 'bg-red-100 text-red-800'
          },
          { 
            label: 'Urgent', 
            count: deadlines.filter(d => getDeadlineStatus(d) === 'urgent').length,
            color: 'bg-orange-100 text-orange-800'
          },
          { 
            label: 'Completed', 
            count: deadlines.filter(d => getDeadlineStatus(d) === 'completed').length,
            color: 'bg-green-100 text-green-800'
          }
        ].map((stat, index) => (
          <div key={index} className="text-center">
            <div className={`inline-flex items-center justify-center w-12 h-12 rounded-full ${stat.color}`}>
              <span className="text-lg font-bold">{stat.count}</span>
            </div>
            <p className="text-sm font-medium text-gray-900 mt-2">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Deadlines List */}
      <div className="space-y-3">
        {sortedDeadlines.map(deadline => {
          const status = getDeadlineStatus(deadline);
          const daysUntil = getDaysUntilDeadline(deadline.dueDate);
          
          return (
            <Card key={deadline.id} className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className={`p-2 rounded-full ${getStatusColor(status)}`}>
                    {getStatusIcon(status)}
                  </div>
                  
                  <div className="flex-1">
                    <h3 className="text-lg font-medium text-gray-900">{deadline.title}</h3>
                    {deadline.description && (
                      <p className="text-sm text-gray-600 mt-1">{deadline.description}</p>
                    )}
                    <div className="flex items-center space-x-4 mt-2 text-sm text-gray-500">
                      <span>{deadline.framework}</span>
                      <span>•</span>
                      <span>Due: {deadline.dueDate.toLocaleDateString()}</span>
                      <span>•</span>
                      <span>Priority: {deadline.priority}</span>
                      {deadline.assignedTo && (
                        <>
                          <span>•</span>
                          <span>Assigned to: {deadline.assignedTo}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center space-x-3">
                  <div className="text-right">
                    <p className={`text-sm font-medium ${
                      status === 'overdue' ? 'text-red-600' :
                      status === 'urgent' ? 'text-orange-600' :
                      status === 'completed' ? 'text-green-600' :
                      'text-gray-600'
                    }`}>
                      {status === 'overdue' ? `${Math.abs(daysUntil)} days overdue` :
                       status === 'completed' ? 'Completed' :
                       `${daysUntil} days left`}
                    </p>
                    {deadline.completedAt && (
                      <p className="text-xs text-gray-500">
                        Completed: {deadline.completedAt.toLocaleDateString()}
                      </p>
                    )}
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    {status !== 'completed' && (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleSetReminder(deadline.id)}
                          disabled={deadline.reminderSet}
                          className="flex items-center space-x-1"
                        >
                          <Bell className="w-3 h-3" />
                          <span>{deadline.reminderSet ? 'Reminder Set' : 'Set Reminder'}</span>
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => handleMarkComplete(deadline.id)}
                          className="flex items-center space-x-1"
                        >
                          <CheckCircle className="w-3 h-3" />
                          <span>Complete</span>
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </Card>
          );
        })}
        
        {sortedDeadlines.length === 0 && (
          <Card className="p-12 text-center">
            <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No deadlines found</h3>
            <p className="text-gray-500">
              {deadlines.length === 0 
                ? "No compliance deadlines are currently tracked."
                : "No deadlines match your current filters."
              }
            </p>
          </Card>
        )}
      </div>
    </div>
  );
};

export default ComplianceDeadlineTracker;