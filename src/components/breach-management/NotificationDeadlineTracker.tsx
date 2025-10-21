import React, { useState, useEffect } from 'react';
import { Clock, AlertTriangle, CheckCircle, Calendar, Bell } from 'lucide-react';
import { breachManagementService } from '../../services/breachManagementService';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';

interface NotificationDeadline {
  id: string;
  breachId: string;
  breachTitle: string;
  type: 'regulatory' | 'data_subject';
  authority?: string;
  jurisdiction: string;
  deadline: Date;
  status: 'pending' | 'sent' | 'overdue';
  hoursRemaining: number;
  urgencyLevel: 'low' | 'medium' | 'high' | 'critical';
}

export const NotificationDeadlineTracker: React.FC = () => {
  const [deadlines, setDeadlines] = useState<NotificationDeadline[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'overdue'>('all');

  useEffect(() => {
    loadDeadlines();
    const interval = setInterval(loadDeadlines, 60000); // Update every minute
    return () => clearInterval(interval);
  }, []);

  const loadDeadlines = async () => {
    try {
      setLoading(true);
      const deadlinesData = await breachManagementService.checkNotificationDeadlines();
      setDeadlines(deadlinesData);
    } catch (error) {
      console.error('Failed to load deadlines:', error);
    } finally {
      setLoading(false);
    }
  };

  const getUrgencyColor = (urgencyLevel: string) => {
    switch (urgencyLevel) {
      case 'critical': return 'text-red-600 bg-red-50 border-red-200';
      case 'high': return 'text-orange-600 bg-orange-50 border-orange-200';
      case 'medium': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'low': return 'text-green-600 bg-green-50 border-green-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'text-yellow-600 bg-yellow-50';
      case 'sent': return 'text-green-600 bg-green-50';
      case 'overdue': return 'text-red-600 bg-red-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const formatTimeRemaining = (hoursRemaining: number) => {
    if (hoursRemaining < 0) {
      const hoursOverdue = Math.abs(hoursRemaining);
      if (hoursOverdue < 24) {
        return `${Math.round(hoursOverdue)}h overdue`;
      }
      return `${Math.round(hoursOverdue / 24)}d overdue`;
    }
    
    if (hoursRemaining < 24) {
      return `${Math.round(hoursRemaining)}h remaining`;
    }
    
    return `${Math.round(hoursRemaining / 24)}d remaining`;
  };

  const getUrgencyIcon = (urgencyLevel: string) => {
    switch (urgencyLevel) {
      case 'critical': return <AlertTriangle className="h-5 w-5 text-red-600" />;
      case 'high': return <Clock className="h-5 w-5 text-orange-600" />;
      case 'medium': return <Bell className="h-5 w-5 text-yellow-600" />;
      case 'low': return <CheckCircle className="h-5 w-5 text-green-600" />;
      default: return <Clock className="h-5 w-5 text-gray-600" />;
    }
  };

  const filteredDeadlines = deadlines.filter(deadline => {
    if (filter === 'pending') return deadline.status === 'pending';
    if (filter === 'overdue') return deadline.status === 'overdue';
    return true;
  });

  const criticalDeadlines = deadlines.filter(d => d.urgencyLevel === 'critical' && d.status === 'pending');
  const overdueDeadlines = deadlines.filter(d => d.status === 'overdue');

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
          <h3 className="text-lg font-semibold text-gray-900">Notification Deadlines</h3>
          <p className="text-gray-600">Track regulatory and data subject notification deadlines</p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as any)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Deadlines</option>
            <option value="pending">Pending Only</option>
            <option value="overdue">Overdue Only</option>
          </select>
        </div>
      </div>

      {/* Alert Cards */}
      {(criticalDeadlines.length > 0 || overdueDeadlines.length > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {criticalDeadlines.length > 0 && (
            <Card className="p-4 border-red-200 bg-red-50">
              <div className="flex items-center gap-3">
                <AlertTriangle className="h-6 w-6 text-red-600" />
                <div>
                  <h4 className="font-medium text-red-900">Critical Deadlines</h4>
                  <p className="text-sm text-red-700">
                    {criticalDeadlines.length} notification{criticalDeadlines.length !== 1 ? 's' : ''} require immediate attention
                  </p>
                </div>
              </div>
            </Card>
          )}

          {overdueDeadlines.length > 0 && (
            <Card className="p-4 border-red-200 bg-red-50">
              <div className="flex items-center gap-3">
                <Clock className="h-6 w-6 text-red-600" />
                <div>
                  <h4 className="font-medium text-red-900">Overdue Notifications</h4>
                  <p className="text-sm text-red-700">
                    {overdueDeadlines.length} notification{overdueDeadlines.length !== 1 ? 's' : ''} past deadline
                  </p>
                </div>
              </div>
            </Card>
          )}
        </div>
      )}

      {/* Deadlines List */}
      <div className="space-y-3">
        {filteredDeadlines.length === 0 ? (
          <Card className="p-8 text-center">
            <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Deadlines</h3>
            <p className="text-gray-600">
              {filter === 'all' && 'No notification deadlines to track'}
              {filter === 'pending' && 'No pending notification deadlines'}
              {filter === 'overdue' && 'No overdue notification deadlines'}
            </p>
          </Card>
        ) : (
          filteredDeadlines.map((deadline) => (
            <Card 
              key={deadline.id} 
              className={`p-4 border-l-4 ${getUrgencyColor(deadline.urgencyLevel)}`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4 flex-1">
                  {getUrgencyIcon(deadline.urgencyLevel)}
                  
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-1">
                      <h4 className="font-medium text-gray-900">{deadline.breachTitle}</h4>
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(deadline.status)}`}>
                        {deadline.status.toUpperCase()}
                      </span>
                    </div>
                    
                    <div className="flex items-center gap-6 text-sm text-gray-600">
                      <div>
                        <span className="font-medium">Type:</span> {deadline.type.replace('_', ' ')}
                      </div>
                      {deadline.authority && (
                        <div>
                          <span className="font-medium">Authority:</span> {deadline.authority}
                        </div>
                      )}
                      <div>
                        <span className="font-medium">Jurisdiction:</span> {deadline.jurisdiction}
                      </div>
                      <div>
                        <span className="font-medium">Deadline:</span> {new Date(deadline.deadline).toLocaleString()}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <div className={`text-sm font-medium ${
                      deadline.hoursRemaining < 0 ? 'text-red-600' : 
                      deadline.hoursRemaining < 24 ? 'text-orange-600' : 'text-gray-900'
                    }`}>
                      {formatTimeRemaining(deadline.hoursRemaining)}
                    </div>
                    <div className="text-xs text-gray-500">
                      {deadline.urgencyLevel} priority
                    </div>
                  </div>

                  <Button 
                    variant="outline" 
                    size="sm"
                    className="whitespace-nowrap"
                  >
                    View Breach
                  </Button>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>

      {/* Summary Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Deadlines</p>
              <p className="text-2xl font-bold text-gray-900">{deadlines.length}</p>
            </div>
            <Calendar className="h-8 w-8 text-gray-400" />
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Pending</p>
              <p className="text-2xl font-bold text-yellow-600">
                {deadlines.filter(d => d.status === 'pending').length}
              </p>
            </div>
            <Clock className="h-8 w-8 text-yellow-500" />
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Overdue</p>
              <p className="text-2xl font-bold text-red-600">
                {overdueDeadlines.length}
              </p>
            </div>
            <AlertTriangle className="h-8 w-8 text-red-500" />
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Completed</p>
              <p className="text-2xl font-bold text-green-600">
                {deadlines.filter(d => d.status === 'sent').length}
              </p>
            </div>
            <CheckCircle className="h-8 w-8 text-green-500" />
          </div>
        </Card>
      </div>
    </div>
  );
};