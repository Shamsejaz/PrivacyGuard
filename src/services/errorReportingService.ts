interface ErrorReport {
  errorId: string;
  message: string;
  stack?: string;
  componentStack?: string;
  timestamp: string;
  url: string;
  userAgent: string;
  userId?: string;
  context?: any;
  severity: 'low' | 'medium' | 'high' | 'critical';
  category: 'javascript' | 'network' | 'authentication' | 'validation' | 'unknown';
}

interface UserFeedback {
  errorId: string;
  userDescription: string;
  reproductionSteps?: string;
  userEmail?: string;
  severity?: 'low' | 'medium' | 'high' | 'critical';
}

class ErrorReportingService {
  private baseUrl = '/api/v1/monitoring';
  private errorQueue: ErrorReport[] = [];
  private isOnline = navigator.onLine;
  private maxQueueSize = 50;

  constructor() {
    this.setupEventListeners();
    this.setupGlobalErrorHandlers();
  }

  private setupEventListeners(): void {
    // Monitor online/offline status
    window.addEventListener('online', () => {
      this.isOnline = true;
      this.flushErrorQueue();
    });

    window.addEventListener('offline', () => {
      this.isOnline = false;
    });

    // Monitor unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      this.reportError(new Error(event.reason), {
        category: 'javascript',
        severity: 'high',
        context: {
          type: 'unhandledRejection',
          reason: event.reason,
        },
      });
    });
  }

  private setupGlobalErrorHandlers(): void {
    // Global error handler for uncaught JavaScript errors
    window.addEventListener('error', (event) => {
      this.reportError(event.error || new Error(event.message), {
        category: 'javascript',
        severity: 'high',
        context: {
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno,
        },
      });
    });

    // Resource loading errors
    window.addEventListener('error', (event) => {
      if (event.target && event.target !== window) {
        const target = event.target as HTMLElement;
        this.reportError(new Error(`Resource loading failed: ${target.tagName}`), {
          category: 'network',
          severity: 'medium',
          context: {
            tagName: target.tagName,
            src: (target as any).src || (target as any).href,
          },
        });
      }
    }, true);
  }

  public async reportError(
    error: Error,
    options: {
      category?: ErrorReport['category'];
      severity?: ErrorReport['severity'];
      context?: any;
      userId?: string;
    } = {}
  ): Promise<void> {
    const errorReport: ErrorReport = {
      errorId: this.generateErrorId(),
      message: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString(),
      url: window.location.href,
      userAgent: navigator.userAgent,
      userId: options.userId || this.getUserId(),
      context: options.context,
      severity: options.severity || this.determineSeverity(error),
      category: options.category || this.categorizeError(error),
    };

    if (this.isOnline) {
      try {
        await this.sendErrorReport(errorReport);
      } catch (sendError) {
        console.error('Failed to send error report:', sendError);
        this.queueError(errorReport);
      }
    } else {
      this.queueError(errorReport);
    }
  }

  public async reportNetworkError(
    url: string,
    status: number,
    statusText: string,
    context?: any
  ): Promise<void> {
    const error = new Error(`Network error: ${status} ${statusText} for ${url}`);
    await this.reportError(error, {
      category: 'network',
      severity: status >= 500 ? 'high' : 'medium',
      context: {
        url,
        status,
        statusText,
        ...context,
      },
    });
  }

  public async reportAuthenticationError(
    message: string,
    context?: any
  ): Promise<void> {
    const error = new Error(`Authentication error: ${message}`);
    await this.reportError(error, {
      category: 'authentication',
      severity: 'high',
      context,
    });
  }

  public async reportValidationError(
    field: string,
    message: string,
    value?: any
  ): Promise<void> {
    const error = new Error(`Validation error: ${field} - ${message}`);
    await this.reportError(error, {
      category: 'validation',
      severity: 'low',
      context: {
        field,
        value,
      },
    });
  }

  public async submitUserFeedback(feedback: UserFeedback): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/error-reports`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(feedback),
      });

      if (!response.ok) {
        throw new Error(`Failed to submit feedback: ${response.statusText}`);
      }
    } catch (error) {
      console.error('Failed to submit user feedback:', error);
      throw error;
    }
  }

  private async sendErrorReport(errorReport: ErrorReport): Promise<void> {
    const response = await fetch(`${this.baseUrl}/errors`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(errorReport),
    });

    if (!response.ok) {
      throw new Error(`Failed to send error report: ${response.statusText}`);
    }
  }

  private queueError(errorReport: ErrorReport): void {
    if (this.errorQueue.length >= this.maxQueueSize) {
      // Remove oldest error to make room
      this.errorQueue.shift();
    }
    this.errorQueue.push(errorReport);
  }

  private async flushErrorQueue(): Promise<void> {
    if (this.errorQueue.length === 0) return;

    const errors = [...this.errorQueue];
    this.errorQueue = [];

    for (const error of errors) {
      try {
        await this.sendErrorReport(error);
      } catch (sendError) {
        console.error('Failed to send queued error:', sendError);
        // Re-queue the error if it failed to send
        this.queueError(error);
      }
    }
  }

  private generateErrorId(): string {
    return `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private getUserId(): string | undefined {
    try {
      return localStorage.getItem('userId') || undefined;
    } catch {
      return undefined;
    }
  }

  private determineSeverity(error: Error): ErrorReport['severity'] {
    const message = error.message.toLowerCase();
    
    if (message.includes('network') || message.includes('fetch')) {
      return 'medium';
    }
    
    if (message.includes('authentication') || message.includes('authorization')) {
      return 'high';
    }
    
    if (message.includes('validation') || message.includes('required')) {
      return 'low';
    }
    
    if (message.includes('critical') || message.includes('fatal')) {
      return 'critical';
    }
    
    return 'medium';
  }

  private categorizeError(error: Error): ErrorReport['category'] {
    const message = error.message.toLowerCase();
    const stack = error.stack?.toLowerCase() || '';
    
    if (message.includes('network') || message.includes('fetch') || message.includes('xhr')) {
      return 'network';
    }
    
    if (message.includes('auth') || message.includes('token') || message.includes('login')) {
      return 'authentication';
    }
    
    if (message.includes('validation') || message.includes('required') || message.includes('invalid')) {
      return 'validation';
    }
    
    if (stack.includes('react') || stack.includes('component')) {
      return 'javascript';
    }
    
    return 'unknown';
  }

  public getQueuedErrorsCount(): number {
    return this.errorQueue.length;
  }

  public clearErrorQueue(): void {
    this.errorQueue = [];
  }
}

// Create singleton instance
export const errorReportingService = new ErrorReportingService();

// React hook for error reporting
export function useErrorReporting() {
  const reportError = (error: Error, context?: any) => {
    errorReportingService.reportError(error, { context });
  };

  const reportNetworkError = (url: string, status: number, statusText: string, context?: any) => {
    errorReportingService.reportNetworkError(url, status, statusText, context);
  };

  const reportAuthError = (message: string, context?: any) => {
    errorReportingService.reportAuthenticationError(message, context);
  };

  const reportValidationError = (field: string, message: string, value?: any) => {
    errorReportingService.reportValidationError(field, message, value);
  };

  const submitFeedback = (feedback: UserFeedback) => {
    return errorReportingService.submitUserFeedback(feedback);
  };

  return {
    reportError,
    reportNetworkError,
    reportAuthError,
    reportValidationError,
    submitFeedback,
    queuedErrorsCount: errorReportingService.getQueuedErrorsCount(),
  };
}

// Axios interceptor for automatic network error reporting
export function setupAxiosErrorReporting(axiosInstance: any) {
  axiosInstance.interceptors.response.use(
    (response: any) => response,
    (error: any) => {
      if (error.response) {
        // Server responded with error status
        errorReportingService.reportNetworkError(
          error.config?.url || 'unknown',
          error.response.status,
          error.response.statusText,
          {
            method: error.config?.method,
            data: error.config?.data,
            headers: error.config?.headers,
          }
        );
      } else if (error.request) {
        // Request was made but no response received
        errorReportingService.reportNetworkError(
          error.config?.url || 'unknown',
          0,
          'No response received',
          {
            method: error.config?.method,
            timeout: error.code === 'ECONNABORTED',
          }
        );
      } else {
        // Something else happened
        errorReportingService.reportError(error, {
          category: 'network',
          context: {
            config: error.config,
          },
        });
      }
      
      return Promise.reject(error);
    }
  );
}