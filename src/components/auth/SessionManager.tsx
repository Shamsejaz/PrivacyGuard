import React, { useState, useEffect } from 'react';
import { Session } from '../../types';
import { sessionService } from '../../services/sessionService';
import Button from '../ui/Button';
import Card from '../ui/Card';
import { Monitor, Smartphone, Tablet, Globe, Clock, MapPin, Trash2, Shield } from 'lucide-react';

interface SessionManagerProps {
  userId: string;
  currentSessionId: string;
}

const SessionManager: React.FC<SessionManagerProps> = ({ userId, currentSessionId }) => {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    loadSessions();
    
    // Refresh sessions every 30 seconds
    const interval = setInterval(loadSessions, 30000);
    return () => clearInterval(interval);
  }, [userId]);

  const loadSessions = async () => {
    try {
      const sessionsData = await sessionService.getActiveSessions(userId);
      setSessions(sessionsData);
    } catch (error) {
      console.error('Failed to load sessions:', error);
      setError('Failed to load active sessions');
    }
  };

  const handleTerminateSession = async (sessionId: string) => {
    if (!confirm('Are you sure you want to terminate this session?')) return;

    setLoading(true);
    setError('');

    try {
      const result = await sessionService.terminateSession(sessionId);
      if (result.success) {
        await loadSessions();
      } else {
        setError(result.error || 'Failed to terminate session');
      }
    } catch (error) {
      setError('Network error while terminating session');
    } finally {
      setLoading(false);
    }
  };

  const handleLogoutAllSessions = async () => {
    if (!confirm('Are you sure you want to logout from all devices? This will end all active sessions.')) return;

    setLoading(true);
    setError('');

    try {
      const result = await sessionService.logoutAllSessions(userId);
      if (result.success) {
        // This will logout the current session too, so redirect to login
        window.location.href = '/login';
      } else {
        setError(result.error || 'Failed to logout all sessions');
      }
    } catch (error) {
      setError('Network error while logging out all sessions');
    } finally {
      setLoading(false);
    }
  };

  const getDeviceIcon = (userAgent: string) => {
    const ua = userAgent.toLowerCase();
    if (ua.includes('mobile') || ua.includes('android') || ua.includes('iphone')) {
      return Smartphone;
    } else if (ua.includes('tablet') || ua.includes('ipad')) {
      return Tablet;
    } else {
      return Monitor;
    }
  };

  const getDeviceInfo = (userAgent: string) => {
    const ua = userAgent.toLowerCase();
    
    // Browser detection
    let browser = 'Unknown Browser';
    if (ua.includes('chrome')) browser = 'Chrome';
    else if (ua.includes('firefox')) browser = 'Firefox';
    else if (ua.includes('safari')) browser = 'Safari';
    else if (ua.includes('edge')) browser = 'Edge';
    
    // OS detection
    let os = 'Unknown OS';
    if (ua.includes('windows')) os = 'Windows';
    else if (ua.includes('mac')) os = 'macOS';
    else if (ua.includes('linux')) os = 'Linux';
    else if (ua.includes('android')) os = 'Android';
    else if (ua.includes('ios')) os = 'iOS';
    
    return { browser, os };
  };

  const formatLastActivity = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes} minute${minutes !== 1 ? 's' : ''} ago`;
    
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} hour${hours !== 1 ? 's' : ''} ago`;
    
    const days = Math.floor(hours / 24);
    return `${days} day${days !== 1 ? 's' : ''} ago`;
  };

  const activeSessions = sessions.filter(s => s.isActive);
  const currentSession = sessions.find(s => s.id === currentSessionId);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Shield className="h-6 w-6 text-blue-600" />
          <h2 className="text-2xl font-bold text-gray-900">Active Sessions</h2>
        </div>
        <Button
          variant="outline"
          onClick={handleLogoutAllSessions}
          disabled={loading}
          className="text-red-600 hover:text-red-700"
        >
          Logout All Devices
        </Button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">{error}</p>
        </div>
      )}

      {/* Session Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4">
          <div className="flex items-center space-x-3">
            <Monitor className="h-8 w-8 text-blue-600" />
            <div>
              <p className="text-2xl font-bold text-gray-900">{activeSessions.length}</p>
              <p className="text-sm text-gray-600">Active Sessions</p>
            </div>
          </div>
        </Card>
        
        <Card className="p-4">
          <div className="flex items-center space-x-3">
            <Globe className="h-8 w-8 text-green-600" />
            <div>
              <p className="text-2xl font-bold text-gray-900">
                {new Set(activeSessions.map(s => s.ipAddress)).size}
              </p>
              <p className="text-sm text-gray-600">Unique Locations</p>
            </div>
          </div>
        </Card>
        
        <Card className="p-4">
          <div className="flex items-center space-x-3">
            <Clock className="h-8 w-8 text-orange-600" />
            <div>
              <p className="text-2xl font-bold text-gray-900">
                {currentSession ? formatLastActivity(currentSession.lastActivity) : 'Unknown'}
              </p>
              <p className="text-sm text-gray-600">Last Activity</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Active Sessions List */}
      <div className="space-y-4">
        {activeSessions.map((session) => {
          const DeviceIcon = getDeviceIcon(session.userAgent);
          const deviceInfo = getDeviceInfo(session.userAgent);
          const isCurrentSession = session.id === currentSessionId;
          
          return (
            <Card key={session.id} className={`p-4 ${isCurrentSession ? 'ring-2 ring-blue-500 bg-blue-50' : ''}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <DeviceIcon className="h-8 w-8 text-gray-600" />
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <h3 className="font-semibold text-gray-900">
                        {deviceInfo.browser} on {deviceInfo.os}
                      </h3>
                      {isCurrentSession && (
                        <span className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded">
                          Current Session
                        </span>
                      )}
                    </div>
                    <div className="flex items-center space-x-4 text-sm text-gray-600 mt-1">
                      <div className="flex items-center space-x-1">
                        <MapPin className="h-4 w-4" />
                        <span>{session.ipAddress}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Clock className="h-4 w-4" />
                        <span>Last active: {formatLastActivity(session.lastActivity)}</span>
                      </div>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      Started: {new Date(session.createdAt).toLocaleString()}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  <div className="flex items-center space-x-1">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span className="text-sm text-green-600">Active</span>
                  </div>
                  {!isCurrentSession && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleTerminateSession(session.id)}
                      disabled={loading}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {activeSessions.length === 0 && (
        <Card className="p-8 text-center">
          <Monitor className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No Active Sessions</h3>
          <p className="text-gray-600">There are currently no active sessions for this account.</p>
        </Card>
      )}
    </div>
  );
};

export default SessionManager;