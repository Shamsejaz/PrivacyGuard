import React from 'react';
import { Loader2, AlertCircle, Wifi, WifiOff } from 'lucide-react';

// Loading spinner component
export const LoadingSpinner: React.FC<{
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}> = ({ size = 'md', className = '' }) => {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-6 w-6',
    lg: 'h-8 w-8',
  };

  return (
    <Loader2 className={`animate-spin ${sizeClasses[size]} ${className}`} />
  );
};

// Full page loading component
export const PageLoading: React.FC<{
  message?: string;
  showProgress?: boolean;
  progress?: number;
}> = ({ message = 'Loading...', showProgress = false, progress = 0 }) => {
  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 flex items-center justify-center">
      <div className="text-center max-w-md mx-auto px-4">
        <LoadingSpinner size="lg" className="text-primary-600 mx-auto mb-4" />
        <h2 className="text-lg font-medium text-neutral-900 dark:text-neutral-100 mb-2">
          {message}
        </h2>
        {showProgress && (
          <div className="w-full bg-neutral-200 dark:bg-neutral-700 rounded-full h-2 mb-4">
            <div
              className="bg-primary-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
            />
          </div>
        )}
        <p className="text-sm text-neutral-600 dark:text-neutral-400">
          Please wait while we load your data...
        </p>
      </div>
    </div>
  );
};

// Skeleton loading component
export const SkeletonLoader: React.FC<{
  lines?: number;
  className?: string;
  animate?: boolean;
}> = ({ lines = 3, className = '', animate = true }) => {
  return (
    <div className={`space-y-3 ${className}`}>
      {Array.from({ length: lines }).map((_, index) => (
        <div
          key={index}
          className={`h-4 bg-neutral-200 dark:bg-neutral-700 rounded ${
            animate ? 'animate-pulse' : ''
          }`}
          style={{
            width: `${Math.random() * 40 + 60}%`,
          }}
        />
      ))}
    </div>
  );
};

// Card skeleton loader
export const CardSkeleton: React.FC<{
  showHeader?: boolean;
  showFooter?: boolean;
  className?: string;
}> = ({ showHeader = true, showFooter = false, className = '' }) => {
  return (
    <div className={`bg-white dark:bg-neutral-800 rounded-lg shadow-sm p-6 ${className}`}>
      {showHeader && (
        <div className="mb-4">
          <div className="h-6 bg-neutral-200 dark:bg-neutral-700 rounded animate-pulse mb-2" />
          <div className="h-4 bg-neutral-200 dark:bg-neutral-700 rounded animate-pulse w-3/4" />
        </div>
      )}
      <SkeletonLoader lines={4} />
      {showFooter && (
        <div className="mt-4 pt-4 border-t border-neutral-200 dark:border-neutral-700">
          <div className="h-4 bg-neutral-200 dark:bg-neutral-700 rounded animate-pulse w-1/2" />
        </div>
      )}
    </div>
  );
};

// Table skeleton loader
export const TableSkeleton: React.FC<{
  rows?: number;
  columns?: number;
  showHeader?: boolean;
}> = ({ rows = 5, columns = 4, showHeader = true }) => {
  return (
    <div className="bg-white dark:bg-neutral-800 rounded-lg shadow-sm overflow-hidden">
      {showHeader && (
        <div className="px-6 py-3 border-b border-neutral-200 dark:border-neutral-700">
          <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
            {Array.from({ length: columns }).map((_, index) => (
              <div
                key={index}
                className="h-4 bg-neutral-200 dark:bg-neutral-700 rounded animate-pulse"
              />
            ))}
          </div>
        </div>
      )}
      <div className="divide-y divide-neutral-200 dark:divide-neutral-700">
        {Array.from({ length: rows }).map((_, rowIndex) => (
          <div key={rowIndex} className="px-6 py-4">
            <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
              {Array.from({ length: columns }).map((_, colIndex) => (
                <div
                  key={colIndex}
                  className="h-4 bg-neutral-200 dark:bg-neutral-700 rounded animate-pulse"
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// Connection status indicator
export const ConnectionStatus: React.FC<{
  isConnected: boolean;
  isReconnecting?: boolean;
  className?: string;
}> = ({ isConnected, isReconnecting = false, className = '' }) => {
  if (isReconnecting) {
    return (
      <div className={`flex items-center space-x-2 text-yellow-600 ${className}`}>
        <LoadingSpinner size="sm" />
        <span className="text-sm">Reconnecting...</span>
      </div>
    );
  }

  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      {isConnected ? (
        <>
          <Wifi className="h-4 w-4 text-green-600" />
          <span className="text-sm text-green-600">Connected</span>
        </>
      ) : (
        <>
          <WifiOff className="h-4 w-4 text-red-600" />
          <span className="text-sm text-red-600">Disconnected</span>
        </>
      )}
    </div>
  );
};

// Offline indicator
export const OfflineIndicator: React.FC = () => {
  const [isOnline, setIsOnline] = React.useState(navigator.onLine);

  React.useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (isOnline) return null;

  return (
    <div className="fixed top-0 left-0 right-0 bg-red-600 text-white px-4 py-2 text-center text-sm z-50">
      <div className="flex items-center justify-center space-x-2">
        <WifiOff className="h-4 w-4" />
        <span>You are currently offline. Some features may not be available.</span>
      </div>
    </div>
  );
};

// Loading overlay for components
export const LoadingOverlay: React.FC<{
  isLoading: boolean;
  message?: string;
  children: React.ReactNode;
  className?: string;
}> = ({ isLoading, message = 'Loading...', children, className = '' }) => {
  return (
    <div className={`relative ${className}`}>
      {children}
      {isLoading && (
        <div className="absolute inset-0 bg-white/80 dark:bg-neutral-900/80 flex items-center justify-center z-10">
          <div className="text-center">
            <LoadingSpinner size="lg" className="text-primary-600 mb-2" />
            <p className="text-sm text-neutral-600 dark:text-neutral-400">{message}</p>
          </div>
        </div>
      )}
    </div>
  );
};

// Error state component
export const ErrorState: React.FC<{
  title?: string;
  message?: string;
  onRetry?: () => void;
  className?: string;
}> = ({
  title = 'Something went wrong',
  message = 'An error occurred while loading this content.',
  onRetry,
  className = '',
}) => {
  return (
    <div className={`text-center py-8 ${className}`}>
      <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
      <h3 className="text-lg font-medium text-neutral-900 dark:text-neutral-100 mb-2">
        {title}
      </h3>
      <p className="text-neutral-600 dark:text-neutral-400 mb-4">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
        >
          Try Again
        </button>
      )}
    </div>
  );
};

// Empty state component
export const EmptyState: React.FC<{
  title?: string;
  message?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  icon?: React.ReactNode;
  className?: string;
}> = ({
  title = 'No data available',
  message = 'There is no data to display at the moment.',
  action,
  icon,
  className = '',
}) => {
  return (
    <div className={`text-center py-8 ${className}`}>
      {icon && <div className="mb-4">{icon}</div>}
      <h3 className="text-lg font-medium text-neutral-900 dark:text-neutral-100 mb-2">
        {title}
      </h3>
      <p className="text-neutral-600 dark:text-neutral-400 mb-4">{message}</p>
      {action && (
        <button
          onClick={action.onClick}
          className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
        >
          {action.label}
        </button>
      )}
    </div>
  );
};