// Performance Metrics Collection Service
export interface PerformanceMetric {
  name: string;
  value: number;
  unit: string;
  timestamp: Date;
  tags?: Record<string, string>;
}

export interface OperationMetrics {
  operationName: string;
  duration: number;
  success: boolean;
  timestamp: Date;
  metadata?: any;
}

/**
 * Performance Metrics Collector
 * Tracks operation performance and system metrics
 */
export class PerformanceMetricsCollector {
  private metrics: PerformanceMetric[] = [];
  private operations: OperationMetrics[] = [];
  private activeOperations: Map<string, { startTime: number; metadata?: any }> = new Map();

  /**
   * Record a performance metric
   */
  recordMetric(name: string, value: number, unit: string, tags?: Record<string, string>): void {
    const metric: PerformanceMetric = {
      name,
      value,
      unit,
      timestamp: new Date(),
      tags
    };

    this.metrics.push(metric);
    
    // Keep only last 10000 metrics
    if (this.metrics.length > 10000) {
      this.metrics = this.metrics.slice(-10000);
    }
  }

  /**
   * Start tracking an operation
   */
  startOperation(operationId: string, operationName: string, metadata?: any): void {
    this.activeOperations.set(operationId, {
      startTime: Date.now(),
      metadata: { operationName, ...metadata }
    });
  }

  /**
   * End tracking an operation
   */
  endOperation(operationId: string, success: boolean = true, metadata?: any): void {
    const operation = this.activeOperations.get(operationId);
    if (!operation) {
      console.warn(`Operation ${operationId} not found in active operations`);
      return;
    }

    const duration = Date.now() - operation.startTime;
    const operationMetric: OperationMetrics = {
      operationName: operation.metadata?.operationName || 'unknown',
      duration,
      success,
      timestamp: new Date(),
      metadata: { ...operation.metadata, ...metadata }
    };

    this.operations.push(operationMetric);
    this.activeOperations.delete(operationId);

    // Keep only last 5000 operations
    if (this.operations.length > 5000) {
      this.operations = this.operations.slice(-5000);
    }

    // Record as performance metric
    this.recordMetric(
      `operation.${operationMetric.operationName}.duration`,
      duration,
      'ms',
      { success: success.toString() }
    );
  }

  /**
   * Record compliance scan metrics
   */
  recordComplianceScanMetrics(
    findingsCount: number,
    assessmentsCount: number,
    recommendationsCount: number,
    duration: number
  ): void {
    this.recordMetric('compliance.scan.findings', findingsCount, 'count');
    this.recordMetric('compliance.scan.assessments', assessmentsCount, 'count');
    this.recordMetric('compliance.scan.recommendations', recommendationsCount, 'count');
    this.recordMetric('compliance.scan.duration', duration, 'ms');
  }

  /**
   * Record remediation metrics
   */
  recordRemediationMetrics(
    totalRemediations: number,
    successfulRemediations: number,
    failedRemediations: number,
    averageDuration: number
  ): void {
    this.recordMetric('remediation.total', totalRemediations, 'count');
    this.recordMetric('remediation.successful', successfulRemediations, 'count');
    this.recordMetric('remediation.failed', failedRemediations, 'count');
    this.recordMetric('remediation.success_rate', 
      totalRemediations > 0 ? successfulRemediations / totalRemediations : 0, 
      'percentage'
    );
    this.recordMetric('remediation.average_duration', averageDuration, 'ms');
  }

  /**
   * Record initialization metrics
   */
  recordInitializationMetrics(duration: number, success: boolean): void {
    this.recordMetric('agent.initialization.duration', duration, 'ms');
    this.recordMetric('agent.initialization.success', success ? 1 : 0, 'boolean');
  }

  /**
   * Record workflow metrics
   */
  recordWorkflowMetrics(
    findingsCount: number,
    assessmentsCount: number,
    recommendationsCount: number,
    remediationsCount: number,
    duration: number
  ): void {
    this.recordMetric('workflow.findings', findingsCount, 'count');
    this.recordMetric('workflow.assessments', assessmentsCount, 'count');
    this.recordMetric('workflow.recommendations', recommendationsCount, 'count');
    this.recordMetric('workflow.remediations', remediationsCount, 'count');
    this.recordMetric('workflow.duration', duration, 'ms');
  }

  /**
   * Record AWS service call metrics
   */
  recordAWSServiceMetrics(service: string, operation: string, duration: number, success: boolean): void {
    this.recordMetric(
      `aws.${service}.${operation}.duration`,
      duration,
      'ms',
      { service, operation, success: success.toString() }
    );
  }

  /**
   * Get metrics by name pattern
   */
  getMetrics(namePattern?: string, since?: Date): PerformanceMetric[] {
    let filteredMetrics = this.metrics;

    if (since) {
      filteredMetrics = filteredMetrics.filter(m => m.timestamp >= since);
    }

    if (namePattern) {
      const regex = new RegExp(namePattern);
      filteredMetrics = filteredMetrics.filter(m => regex.test(m.name));
    }

    return filteredMetrics;
  }

  /**
   * Get operation metrics
   */
  getOperationMetrics(operationName?: string, since?: Date): OperationMetrics[] {
    let filteredOperations = this.operations;

    if (since) {
      filteredOperations = filteredOperations.filter(o => o.timestamp >= since);
    }

    if (operationName) {
      filteredOperations = filteredOperations.filter(o => o.operationName === operationName);
    }

    return filteredOperations;
  }

  /**
   * Get performance summary
   */
  getPerformanceSummary(since?: Date): {
    totalOperations: number;
    successfulOperations: number;
    failedOperations: number;
    averageDuration: number;
    operationBreakdown: Record<string, { count: number; avgDuration: number; successRate: number }>;
  } {
    const operations = this.getOperationMetrics(undefined, since);
    
    const totalOperations = operations.length;
    const successfulOperations = operations.filter(o => o.success).length;
    const failedOperations = totalOperations - successfulOperations;
    const averageDuration = totalOperations > 0 
      ? operations.reduce((sum, o) => sum + o.duration, 0) / totalOperations 
      : 0;

    // Group by operation name
    const operationGroups = operations.reduce((acc, op) => {
      if (!acc[op.operationName]) {
        acc[op.operationName] = [];
      }
      acc[op.operationName].push(op);
      return acc;
    }, {} as Record<string, OperationMetrics[]>);

    const operationBreakdown: Record<string, { count: number; avgDuration: number; successRate: number }> = {};
    
    Object.entries(operationGroups).forEach(([name, ops]) => {
      const count = ops.length;
      const avgDuration = ops.reduce((sum, o) => sum + o.duration, 0) / count;
      const successRate = ops.filter(o => o.success).length / count;
      
      operationBreakdown[name] = { count, avgDuration, successRate };
    });

    return {
      totalOperations,
      successfulOperations,
      failedOperations,
      averageDuration,
      operationBreakdown
    };
  }

  /**
   * Clear old metrics
   */
  clearOldMetrics(olderThan: Date): void {
    const initialMetricsCount = this.metrics.length;
    const initialOperationsCount = this.operations.length;

    this.metrics = this.metrics.filter(m => m.timestamp >= olderThan);
    this.operations = this.operations.filter(o => o.timestamp >= olderThan);

    const clearedMetrics = initialMetricsCount - this.metrics.length;
    const clearedOperations = initialOperationsCount - this.operations.length;

    console.log(`Cleared ${clearedMetrics} old metrics and ${clearedOperations} old operations`);
  }

  /**
   * Export metrics to JSON
   */
  exportMetrics(since?: Date): {
    metrics: PerformanceMetric[];
    operations: OperationMetrics[];
    summary: any;
  } {
    return {
      metrics: this.getMetrics(undefined, since),
      operations: this.getOperationMetrics(undefined, since),
      summary: this.getPerformanceSummary(since)
    };
  }
}

/**
 * Global performance metrics collector instance
 */
export const performanceMetrics = new PerformanceMetricsCollector();

/**
 * Decorator for measuring operation performance
 */
export function measurePerformance(operationName: string) {
  return function (target: any, propertyName: string, descriptor?: PropertyDescriptor) {
    // Handle both method decorators and property descriptors
    const originalDescriptor = descriptor || Object.getOwnPropertyDescriptor(target, propertyName);
    if (!originalDescriptor || typeof originalDescriptor.value !== 'function') {
      console.warn(`measurePerformance decorator can only be applied to methods. Skipping ${propertyName}`);
      return descriptor;
    }

    const method = originalDescriptor.value;

    const wrappedMethod = async function (...args: any[]) {
      const operationId = `${operationName}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      
      performanceMetrics.startOperation(operationId, operationName, {
        className: target.constructor.name,
        methodName: propertyName
      });

      try {
        const result = await method.apply(this, args);
        performanceMetrics.endOperation(operationId, true);
        return result;
      } catch (error) {
        performanceMetrics.endOperation(operationId, false, { 
          error: error instanceof Error ? error.message : 'Unknown error' 
        });
        throw error;
      }
    };

    if (descriptor) {
      descriptor.value = wrappedMethod;
      return descriptor;
    } else {
      // For property-based decoration
      Object.defineProperty(target, propertyName, {
        value: wrappedMethod,
        writable: true,
        configurable: true,
        enumerable: false
      });
    }
  };
}