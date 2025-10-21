import React, { useState, useEffect } from 'react';
import Button from '../ui/Button';
import Card from '../ui/Card';
import { Clock, AlertTriangle, RefreshCw, LogOut } from 'lucide-react';

interface SessionTimeoutWarningProps {
  show: boolean;
  remainingMinutes: number;
  onExtend: () => void;
  onLogout: () => void;
}

const SessionTimeoutWarning: React.FC<SessionTimeoutWarningProps> = ({
  show,
  remainingMinutes: initialMinutes,
  onExtend,
  onLogout
}) => {
  const [remainingSeconds, setRemainingSeconds] = useState(initialMinutes * 60);
  const [extending, setExtending] = useState(false);

  useEffect(() => {
    if (show) {
      setRemainingSeconds(initialMinutes * 60);
    }
  }, [show, initialMinutes]);

  useEffect(() => {
    if (!show || remainingSeconds <= 0) return;

    const timer = setInterval(() => {
      setRemainingSeconds(prev => {
        if (prev <= 1) {
          onLogout();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [show, remainingSeconds, onLogout]);

  const handleExtend = async () => {
    setExtending(true);
    try {
      await onExtend();
    } finally {
      setExtending(false);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (!show) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <Card className="max-w-md w-full mx-4 p-6">
        <div className="text-center">
          <div className="flex justify-center mb-4">
            <div className="relative">
              <Clock className="h-12 w-12 text-orange-500" />
              <AlertTriangle className="h-6 w-6 text-red-500 absolute -top-1 -right-1" />
            </div>
          </div>
          
          <h2 className="text-xl font-bold text-gray-900 mb-2">
            Session Expiring Soon
          </h2>
          
          <p className="text-gray-600 mb-4">
            Your session will expire in:
          </p>
          
          <div className="text-3xl font-mono font-bold text-red-600 mb-6">
            {formatTime(remainingSeconds)}
          </div>
          
          <p className="text-sm text-gray-600 mb-6">
            You will be automatically logged out when the timer reaches zero.
            Click "Stay Logged In" to extend your session.
          </p>
          
          <div className="flex space-x-3">
            <Button
              variant="outline"
              onClick={onLogout}
              className="flex-1 flex items-center justify-center space-x-2"
            >
              <LogOut className="h-4 w-4" />
              <span>Logout Now</span>
            </Button>
            
            <Button
              onClick={handleExtend}
              disabled={extending}
              className="flex-1 flex items-center justify-center space-x-2"
            >
              {extending ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  <span>Extending...</span>
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4" />
                  <span>Stay Logged In</span>
                </>
              )}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default SessionTimeoutWarning;