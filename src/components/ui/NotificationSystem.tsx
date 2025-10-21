import React, { useState, useEffect, useCallback } from 'react';
import { X, AlertCircle, Info, CheckCircle, AlertTriangle, Bell } from 'lucide-react';
import { useSystemNotifications, useComplianceAlerts } from '../../hooks/useWebSocket';
import { EventData } from '../../services/websocketService';

export interface Notification {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message: string;
  timestamp: Date;
  autoClose?: boolean;
  duration?: number;
  actions?: NotificationAction[];
}

export interface NotificationAction {
  label: string;
  onClick: () => void;
  variant?: 'primary' | 'secondary';
}

interface NotificationSystemProps {
  maxNotifications?: number;
  defaultDuration?: number;
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
}

export function NotificationSystem({ 
  maxNotifications = 5, 
  defaultDuration = 5000,
  position = 'top-right'
}: NotificationSystemProps) {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const addNotification = useCallback((notification: Omit<Notification, 'id' | 'timestamp'>) => {
    const newNotification: Notification = {
      ...notification,
      id: `notification_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      autoClose: notification.autoClose ?? true,
      duration: notification.duration ?? defaultDuration
    };

    setNotifications(prev => {
      const updated = [newNotification, ...prev];
      return updated.slice(0, maxNotifications);
    });

    // Auto-remove notification
    if (newNotification.autoClose) {
      setTimeout(() => {
        removeNotification(newNotification.id);
      }, newNotification.duration);
    }
  }, [maxNotifications, defaultDuration]);

  const removeNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  const clearAll = useCallback(() => {
    setNotifications([]);
  }, []);

  // Handle system notifications
  const handleSystemNotification = useCallback((event: EventData) => {
    if (event.type === 'system_notification') {
      const { message, severity } = event.payload;
      
      addNotification({
        type: severity === 'error' ? 'error' : severity === 'warning' ? 'warning' : 'info',
        title: 'System Notification',
        message,
        autoClose: severity !== 'error' // Keep errors visible until manually dismissed
      });
    }
  }, [addNotification]);

  // Handle compliance alerts
  const handleComplianceAlert = useCallback((event: EventData) => {
    if (event.type === 'compliance_alert') {
      const { regulation, severity, message } = event.payload;
      
      addNotification({
        type: severity === 'critical' || severity === 'high' ? 'error' : 
              severity === 'medium' ? 'warning' : 'info',
        title: `${regulation} Compliance Alert`,
        message,
        autoClose: severity === 'low',
        duration: severity === 'critical' ? 0 : defaultDuration // Critical alerts don't auto-close
      });
    }
  }, [addNotification, defaultDuration]);

  // Subscribe to WebSocket events
  useSystemNotifications(handleSystemNotification);
  useComplianceAlerts(handleComplianceAlert);

  const getIcon = (type: Notification['type']) => {
    switch (type) {
      case 'success':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
      case 'error':
        return <AlertCircle className="w-5 h-5 text-red-500" />;
      default:
        return <Info className="w-5 h-5 text-blue-500" />;
    }
  };

  const getNotificationClasses = (type: Notification['type']) => {
    const baseClasses = "mb-3 p-4 rounded-lg shadow-lg border-l-4 bg-white";
    
    switch (type) {
      case 'success':
        return `${baseClasses} border-green-500`;
      case 'warning':
        return `${baseClasses} border-yellow-500`;
      case 'error':
        return `${baseClasses} border-red-500`;
      default:
        return `${baseClasses} border-blue-500`;
    }
  };

  const getPositionClasses = () => {
    switch (position) {
      case 'top-left':
        return 'top-4 left-4';
      case 'bottom-right':
        return 'bottom-4 right-4';
      case 'bottom-left':
        return 'bottom-4 left-4';
      default:
        return 'top-4 right-4';
    }
  };

  if (notifications.length === 0) {
    return null;
  }

  return (
    <div className={`fixed ${getPositionClasses()} z-50 w-96 max-w-sm`}>
      {notifications.length > 1 && (
        <div className="mb-2 flex justify-end">
          <button
            onClick={clearAll}
            className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1"
          >
            <X className="w-4 h-4" />
            Clear all
          </button>
        </div>
      )}
      
      {notifications.map((notification) => (
        <div
          key={notification.id}
          className={getNotificationClasses(notification.type)}
        >
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-3 flex-1">
              {getIcon(notification.type)}
              <div className="flex-1">
                <h4 className="font-medium text-gray-900 mb-1">
                  {notification.title}
                </h4>
                <p className="text-sm text-gray-600 mb-2">
                  {notification.message}
                </p>
                <p className="text-xs text-gray-400">
                  {notification.timestamp.toLocaleTimeString()}
                </p>
                
                {notification.actions && notification.actions.length > 0 && (
                  <div className="flex gap-2 mt-3">
                    {notification.actions.map((action, index) => (
                      <button
                        key={index}
                        onClick={action.onClick}
                        className={`px-3 py-1 text-sm rounded ${
                          action.variant === 'primary'
                            ? 'bg-blue-600 text-white hover:bg-blue-700'
                            : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                        }`}
                      >
                        {action.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
            
            <button
              onClick={() => removeNotification(notification.id)}
              className="text-gray-400 hover:text-gray-600 ml-2"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

// Hook for programmatically adding notifications
export function useNotifications() {
  const [notificationSystem, setNotificationSystem] = useState<{
    addNotification: (notification: Omit<Notification, 'id' | 'timestamp'>) => void;
  } | null>(null);

  const addNotification = useCallback((notification: Omit<Notification, 'id' | 'timestamp'>) => {
    if (notificationSystem) {
      notificationSystem.addNotification(notification);
    }
  }, [notificationSystem]);

  const showSuccess = useCallback((title: string, message: string) => {
    addNotification({ type: 'success', title, message });
  }, [addNotification]);

  const showError = useCallback((title: string, message: string) => {
    addNotification({ type: 'error', title, message, autoClose: false });
  }, [addNotification]);

  const showWarning = useCallback((title: string, message: string) => {
    addNotification({ type: 'warning', title, message });
  }, [addNotification]);

  const showInfo = useCallback((title: string, message: string) => {
    addNotification({ type: 'info', title, message });
  }, [addNotification]);

  return {
    addNotification,
    showSuccess,
    showError,
    showWarning,
    showInfo,
    setNotificationSystem
  };
}

// Connection status indicator component
export function ConnectionStatusIndicator() {
  const [isConnected, setIsConnected] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    // This would be connected to the WebSocket service
    // For now, we'll simulate the connection status
    const interval = setInterval(() => {
      // In a real implementation, this would check websocketService.isConnected()
      setIsConnected(true);
      setIsAuthenticated(true);
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  if (!isConnected) {
    return (
      <div className="flex items-center gap-2 text-red-600 text-sm">
        <div className="w-2 h-2 bg-red-500 rounded-full"></div>
        Disconnected
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="flex items-center gap-2 text-yellow-600 text-sm">
        <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
        Connecting...
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 text-green-600 text-sm">
      <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
      Live
    </div>
  );
}