import React from 'react';
import { Clock, Shield, FileText, Users, AlertTriangle, CheckCircle } from 'lucide-react';
import Card from '../ui/Card';
import Badge from '../ui/Badge';

interface Activity {
  id: string;
  type: 'scan' | 'policy' | 'dsar' | 'incident' | 'assessment';
  title: string;
  description: string;
  timestamp: Date;
  status: 'success' | 'warning' | 'error' | 'info';
  user: string;
}

const RecentActivity: React.FC = () => {
  const activities: Activity[] = [
    {
      id: '1',
      type: 'scan',
      title: 'Data Discovery Scan Completed',
      description: 'Automated scan of Customer Database identified 127 new PII records',
      timestamp: new Date('2024-01-15T14:30:00'),
      status: 'success',
      user: 'System'
    },
    {
      id: '2',
      type: 'dsar',
      title: 'New DSAR Request Received',
      description: 'Data access request from john.doe@email.com',
      timestamp: new Date('2024-01-15T13:45:00'),
      status: 'info',
      user: 'Sarah Johnson'
    },
    {
      id: '3',
      type: 'policy',
      title: 'Privacy Policy Updated',
      description: 'Cookie policy updated to comply with GDPR requirements',
      timestamp: new Date('2024-01-15T12:20:00'),
      status: 'success',
      user: 'Mike Chen'
    },
    {
      id: '4',
      type: 'incident',
      title: 'Security Incident Detected',
      description: 'Unusual data access pattern detected in HR database',
      timestamp: new Date('2024-01-15T11:10:00'),
      status: 'warning',
      user: 'System'
    },
    {
      id: '5',
      type: 'assessment',
      title: 'Vendor Risk Assessment Completed',
      description: 'Annual assessment for CloudStorage Inc. completed with medium risk rating',
      timestamp: new Date('2024-01-15T10:00:00'),
      status: 'success',
      user: 'Lisa Rodriguez'
    }
  ];

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'scan': return <Shield className="h-5 w-5 text-blue-600" />;
      case 'policy': return <FileText className="h-5 w-5 text-teal-600" />;
      case 'dsar': return <Users className="h-5 w-5 text-purple-600" />;
      case 'incident': return <AlertTriangle className="h-5 w-5 text-orange-600" />;
      case 'assessment': return <CheckCircle className="h-5 w-5 text-green-600" />;
      default: return <Clock className="h-5 w-5 text-gray-600" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'success': return <Badge variant="success">Success</Badge>;
      case 'warning': return <Badge variant="warning">Warning</Badge>;
      case 'error': return <Badge variant="danger">Error</Badge>;
      case 'info': return <Badge variant="info">Info</Badge>;
      default: return <Badge variant="default">Unknown</Badge>;
    }
  };

  const getRelativeTime = (timestamp: Date) => {
    const now = new Date();
    const diff = now.getTime() - timestamp.getTime();
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    
    if (minutes < 60) {
      return `${minutes} minutes ago`;
    } else if (hours < 24) {
      return `${hours} hours ago`;
    } else {
      return timestamp.toLocaleDateString();
    }
  };

  return (
    <Card>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-gray-900">Recent Activity</h2>
        <button className="text-blue-600 hover:text-blue-800 font-medium">
          View All Activity
        </button>
      </div>
      
      <div className="space-y-4">
        {activities.map((activity) => (
          <div key={activity.id} className="flex items-start space-x-4 p-3 bg-gray-50 rounded-lg">
            <div className="flex-shrink-0 mt-1">
              {getActivityIcon(activity.type)}
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-medium text-gray-900">{activity.title}</h3>
                  <p className="text-sm text-gray-600 mt-1">{activity.description}</p>
                </div>
                {getStatusBadge(activity.status)}
              </div>
              
              <div className="flex items-center justify-between mt-2">
                <span className="text-sm text-gray-500">by {activity.user}</span>
                <span className="text-sm text-gray-500">{getRelativeTime(activity.timestamp)}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
};

export default RecentActivity;