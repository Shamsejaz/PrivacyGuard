import React from 'react';
import { Clock, AlertTriangle, CheckCircle, User } from 'lucide-react';
import Card from '../ui/Card';
import Badge from '../ui/Badge';
import { ComplianceTask } from '../../types';

const ComplianceTasks: React.FC = () => {
  const tasks: ComplianceTask[] = [
    {
      id: '1',
      title: 'Update Privacy Policy for GDPR Article 13',
      description: 'Review and update privacy policy to ensure compliance with GDPR transparency requirements',
      priority: 'high',
      status: 'in_progress',
      assignedTo: 'Sarah Johnson',
      dueDate: new Date('2024-01-20'),
      regulation: 'GDPR',
      category: 'Policy'
    },
    {
      id: '2',
      title: 'Vendor Risk Assessment - CloudStorage Inc.',
      description: 'Complete annual privacy risk assessment for cloud storage vendor',
      priority: 'medium',
      status: 'pending',
      assignedTo: 'Mike Chen',
      dueDate: new Date('2024-01-25'),
      regulation: 'GDPR',
      category: 'Vendor Management'
    },
    {
      id: '3',
      title: 'HIPAA Security Rule Compliance Audit',
      description: 'Conduct quarterly security controls audit for HIPAA compliance',
      priority: 'critical',
      status: 'overdue',
      assignedTo: 'Lisa Rodriguez',
      dueDate: new Date('2024-01-10'),
      regulation: 'HIPAA',
      category: 'Audit'
    },
    {
      id: '4',
      title: 'Employee Privacy Training Update',
      description: 'Update mandatory privacy training materials for Q1 2024',
      priority: 'low',
      status: 'completed',
      assignedTo: 'James Wilson',
      dueDate: new Date('2024-01-15'),
      regulation: 'General',
      category: 'Training'
    }
  ];

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'critical': return <Badge variant="danger">Critical</Badge>;
      case 'high': return <Badge variant="warning">High</Badge>;
      case 'medium': return <Badge variant="info">Medium</Badge>;
      case 'low': return <Badge variant="default">Low</Badge>;
      default: return <Badge variant="default">Unknown</Badge>;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed': return <Badge variant="success">Completed</Badge>;
      case 'in_progress': return <Badge variant="info">In Progress</Badge>;
      case 'pending': return <Badge variant="warning">Pending</Badge>;
      case 'overdue': return <Badge variant="danger">Overdue</Badge>;
      default: return <Badge variant="default">Unknown</Badge>;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'in_progress': return <Clock className="h-5 w-5 text-blue-500" />;
      case 'overdue': return <AlertTriangle className="h-5 w-5 text-red-500" />;
      default: return <Clock className="h-5 w-5 text-gray-500" />;
    }
  };

  const getDaysUntilDue = (dueDate: Date) => {
    const today = new Date();
    const diffTime = dueDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  return (
    <Card>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-gray-900">Compliance Tasks</h2>
        <button className="text-blue-600 hover:text-blue-800 font-medium">
          View All Tasks
        </button>
      </div>
      
      <div className="space-y-4">
        {tasks.map((task) => {
          const daysUntilDue = getDaysUntilDue(task.dueDate);
          
          return (
            <div key={task.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-start space-x-3">
                  {getStatusIcon(task.status)}
                  <div className="flex-1">
                    <h3 className="font-medium text-gray-900 mb-1">{task.title}</h3>
                    <p className="text-sm text-gray-600 mb-2">{task.description}</p>
                    <div className="flex items-center space-x-4 text-sm text-gray-500">
                      <span className="flex items-center">
                        <User className="h-4 w-4 mr-1" />
                        {task.assignedTo}
                      </span>
                      <span>{task.regulation}</span>
                      <span>{task.category}</span>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  {getPriorityBadge(task.priority)}
                  {getStatusBadge(task.status)}
                </div>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-500">
                  Due: {task.dueDate.toLocaleDateString()}
                </div>
                <div className="text-sm">
                  {daysUntilDue > 0 ? (
                    <span className="text-gray-600">{daysUntilDue} days remaining</span>
                  ) : daysUntilDue === 0 ? (
                    <span className="text-orange-600 font-medium">Due today</span>
                  ) : (
                    <span className="text-red-600 font-medium">{Math.abs(daysUntilDue)} days overdue</span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
};

export default ComplianceTasks;