import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ErrorBoundary, withErrorBoundary, useErrorReporting } from '../ErrorBoundary';

// Mock fetch for error reporting
global.fetch = vi.fn();

// Test component that throws an error
const ThrowError: React.FC<{ shouldThrow?: boolean; errorMessage?: string }> = ({ 
  shouldThrow = false, 
  errorMessage = 'Test error' 
}) => {
  if (shouldThrow) {
    throw new Error(errorMessage);
  }
  return <div>No error</div>;
};

// Test component for useErrorReporting hook
const ErrorReportingComponent: React.FC = () => {
  const { reportError } = useErrorReporting();
  
  const handleClick = () => {
    reportError(new Error('Manual error report'));
  };

  return (
    <button onClick={handleClick}>Report Error</button>
  );
};

describe('ErrorBoundary', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Mock console.error to avoid noise in tests
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should render children when there is no error', () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={false} />
      </ErrorBoundary>
    );

    expect(screen.getByText('No error')).toBeInTheDocument();
  });

  it('should render error UI when child component throws', () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} errorMessage="Component crashed" />
      </ErrorBoundary>
    );

    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    expect(screen.getByText(/We're sorry, but something unexpected happened/)).toBeInTheDocument();
  });

  it('should display error details in development mode', () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'development';

    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} errorMessage="Development error" />
      </ErrorBoundary>
    );

    expect(screen.getByText('Error Details (Development Mode)')).toBeInTheDocument();
    expect(screen.getByText(/Development error/)).toBeInTheDocument();

    process.env.NODE_ENV = originalEnv;
  });

  it('should not display error details in production mode', () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';

    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} errorMessage="Production error" />
      </ErrorBoundary>
    );

    expect(screen.queryByText('Error Details (Development Mode)')).not.toBeInTheDocument();

    process.env.NODE_ENV = originalEnv;
  });

  it('should call onError callback when error occurs', () => {
    const onError = vi.fn();

    render(
      <ErrorBoundary onError={onError}>
        <ThrowError shouldThrow={true} errorMessage="Callback test error" />
      </ErrorBoundary>
    );

    expect(onError).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Callback test error' }),
      expect.objectContaining({ componentStack: expect.any(String) })
    );
  });

  it('should render custom fallback when provided', () => {
    const customFallback = <div>Custom error message</div>;

    render(
      <ErrorBoundary fallback={customFallback}>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(screen.getByText('Custom error message')).toBeInTheDocument();
    expect(screen.queryByText('Something went wrong')).not.toBeInTheDocument();
  });

  it('should reset error state when Try Again is clicked', () => {
    const { rerender } = render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(screen.getByText('Something went wrong')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Try Again'));

    // Re-render with no error
    rerender(
      <ErrorBoundary>
        <ThrowError shouldThrow={false} />
      </ErrorBoundary>
    );

    expect(screen.getByText('No error')).toBeInTheDocument();
  });

  it('should reload page when Reload Page is clicked', () => {
    const originalReload = window.location.reload;
    window.location.reload = vi.fn();

    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    fireEvent.click(screen.getByText('Reload Page'));

    expect(window.location.reload).toHaveBeenCalled();

    window.location.reload = originalReload;
  });

  it('should navigate to home when Go to Dashboard is clicked', () => {
    const originalHref = window.location.href;
    Object.defineProperty(window.location, 'href', {
      writable: true,
      value: 'http://localhost:3000/some-page',
    });

    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    fireEvent.click(screen.getByText('Go to Dashboard'));

    expect(window.location.href).toBe('/');

    Object.defineProperty(window.location, 'href', {
      writable: true,
      value: originalHref,
    });
  });

  it('should send error report when Report Error is clicked', async () => {
    const mockFetch = vi.mocked(fetch);
    mockFetch.mockResolvedValueOnce(new Response('{}', { status: 200 }));

    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    fireEvent.click(screen.getByText('Report Error'));

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/v1/monitoring/error-reports',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: expect.stringContaining('User reported error from error boundary'),
        })
      );
    });
  });

  it('should log error to monitoring service', async () => {
    const mockFetch = vi.mocked(fetch);
    mockFetch.mockResolvedValueOnce(new Response('{}', { status: 200 }));

    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} errorMessage="Monitoring test error" />
      </ErrorBoundary>
    );

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/v1/monitoring/errors',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: expect.stringContaining('Monitoring test error'),
        })
      );
    });
  });

  it('should display error ID when available', () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    const errorIdElement = screen.getByText(/Error ID:/);
    expect(errorIdElement).toBeInTheDocument();
    expect(errorIdElement.textContent).toMatch(/Error ID: error_\d+_\w+/);
  });
});

describe('withErrorBoundary HOC', () => {
  it('should wrap component with error boundary', () => {
    const WrappedComponent = withErrorBoundary(ThrowError);

    render(<WrappedComponent shouldThrow={false} />);

    expect(screen.getByText('No error')).toBeInTheDocument();
  });

  it('should handle errors in wrapped component', () => {
    const WrappedComponent = withErrorBoundary(ThrowError);

    render(<WrappedComponent shouldThrow={true} />);

    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
  });

  it('should use custom fallback in HOC', () => {
    const customFallback = <div>HOC custom fallback</div>;
    const WrappedComponent = withErrorBoundary(ThrowError, customFallback);

    render(<WrappedComponent shouldThrow={true} />);

    expect(screen.getByText('HOC custom fallback')).toBeInTheDocument();
  });

  it('should call custom onError in HOC', () => {
    const onError = vi.fn();
    const WrappedComponent = withErrorBoundary(ThrowError, undefined, onError);

    render(<WrappedComponent shouldThrow={true} />);

    expect(onError).toHaveBeenCalled();
  });
});

describe('useErrorReporting hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should report errors to monitoring service', async () => {
    const mockFetch = vi.mocked(fetch);
    mockFetch.mockResolvedValueOnce(new Response('{}', { status: 200 }));

    render(<ErrorReportingComponent />);

    fireEvent.click(screen.getByText('Report Error'));

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/v1/monitoring/errors',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: expect.stringContaining('Manual error report'),
        })
      );
    });
  });

  it('should handle fetch errors gracefully', async () => {
    const mockFetch = vi.mocked(fetch);
    mockFetch.mockRejectedValueOnce(new Error('Network error'));

    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    render(<ErrorReportingComponent />);

    fireEvent.click(screen.getByText('Report Error'));

    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith(
        'Failed to log error to monitoring service:',
        expect.any(Error)
      );
    });
  });

  it('should include user context in error reports', async () => {
    const mockFetch = vi.mocked(fetch);
    mockFetch.mockResolvedValueOnce(new Response('{}', { status: 200 }));

    // Mock localStorage
    const mockGetItem = vi.fn().mockReturnValue('user-123');
    Object.defineProperty(window, 'localStorage', {
      value: { getItem: mockGetItem },
      writable: true,
    });

    render(<ErrorReportingComponent />);

    fireEvent.click(screen.getByText('Report Error'));

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/v1/monitoring/errors',
        expect.objectContaining({
          body: expect.stringContaining('user-123'),
        })
      );
    });
  });
});

describe('Error Boundary Integration', () => {
  it('should handle async errors in components', async () => {
    const AsyncErrorComponent: React.FC = () => {
      const [shouldThrow, setShouldThrow] = React.useState(false);

      React.useEffect(() => {
        if (shouldThrow) {
          throw new Error('Async error');
        }
      }, [shouldThrow]);

      return (
        <button onClick={() => setShouldThrow(true)}>
          Trigger Async Error
        </button>
      );
    };

    render(
      <ErrorBoundary>
        <AsyncErrorComponent />
      </ErrorBoundary>
    );

    fireEvent.click(screen.getByText('Trigger Async Error'));

    // Note: Error boundaries don't catch errors in event handlers or async code
    // This test demonstrates the limitation
    expect(screen.getByText('Trigger Async Error')).toBeInTheDocument();
  });

  it('should handle multiple error boundaries', () => {
    render(
      <ErrorBoundary fallback={<div>Outer boundary</div>}>
        <div>
          <ErrorBoundary fallback={<div>Inner boundary</div>}>
            <ThrowError shouldThrow={true} />
          </ErrorBoundary>
        </div>
      </ErrorBoundary>
    );

    // Inner boundary should catch the error
    expect(screen.getByText('Inner boundary')).toBeInTheDocument();
    expect(screen.queryByText('Outer boundary')).not.toBeInTheDocument();
  });

  it('should propagate errors when inner boundary fails', () => {
    const FailingBoundary: React.FC<{ children: React.ReactNode }> = ({ children }) => {
      // Simulate a boundary that fails to render
      throw new Error('Boundary failure');
    };

    render(
      <ErrorBoundary fallback={<div>Outer boundary</div>}>
        <FailingBoundary>
          <ThrowError shouldThrow={false} />
        </FailingBoundary>
      </ErrorBoundary>
    );

    expect(screen.getByText('Outer boundary')).toBeInTheDocument();
  });
});