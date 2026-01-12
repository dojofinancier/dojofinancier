/**
 * Performance monitoring utility to identify bottlenecks
 */

export interface PerformanceMetric {
  name: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  metadata?: Record<string, any>;
}

class PerformanceMonitor {
  private metrics: Map<string, PerformanceMetric> = new Map();
  private enabled: boolean = process.env.NODE_ENV === 'development' || process.env.ENABLE_PERFORMANCE_MONITORING === 'true';

  /**
   * Start timing a metric
   */
  start(name: string, metadata?: Record<string, any>): void {
    if (!this.enabled) return;

    this.metrics.set(name, {
      name,
      startTime: performance.now(),
      metadata,
    });
  }

  /**
   * End timing a metric
   */
  end(name: string, metadata?: Record<string, any>): PerformanceMetric | null {
    if (!this.enabled) return null;

    const metric = this.metrics.get(name);
    if (!metric) {
      console.warn(`Performance metric "${name}" was not started`);
      return null;
    }

    const endTime = performance.now();
    const duration = endTime - metric.startTime;

    const completedMetric: PerformanceMetric = {
      ...metric,
      endTime,
      duration,
      metadata: { ...metric.metadata, ...metadata },
    };

    this.metrics.set(name, completedMetric);

    // Log slow operations (>100ms)
    if (duration > 100) {
      console.warn(`[Performance] ${name} took ${duration.toFixed(2)}ms`, completedMetric.metadata || '');
    }

    return completedMetric;
  }

  /**
   * Get all metrics
   */
  getMetrics(): PerformanceMetric[] {
    return Array.from(this.metrics.values());
  }

  /**
   * Get a specific metric
   */
  getMetric(name: string): PerformanceMetric | undefined {
    return this.metrics.get(name);
  }

  /**
   * Clear all metrics
   */
  clear(): void {
    this.metrics.clear();
  }

  /**
   * Get summary of all metrics
   */
  getSummary(): {
    total: number;
    slow: PerformanceMetric[];
    byCategory: Record<string, PerformanceMetric[]>;
  } {
    const allMetrics = this.getMetrics();
    const slow = allMetrics.filter((m) => m.duration && m.duration > 100);
    
    const byCategory: Record<string, PerformanceMetric[]> = {};
    allMetrics.forEach((metric) => {
      const category = metric.name.split(':')[0] || 'other';
      if (!byCategory[category]) {
        byCategory[category] = [];
      }
      byCategory[category].push(metric);
    });

    return {
      total: allMetrics.length,
      slow,
      byCategory,
    };
  }

  /**
   * Log summary to console
   */
  logSummary(): void {
    if (!this.enabled) return;

    const summary = this.getSummary();
    console.group('[Performance Summary]');
    console.log(`Total metrics: ${summary.total}`);
    console.log(`Slow operations (>100ms): ${summary.slow.length}`);
    
    if (summary.slow.length > 0) {
      console.group('Slow Operations');
      summary.slow.forEach((metric) => {
        console.log(`${metric.name}: ${metric.duration?.toFixed(2)}ms`, metric.metadata || '');
      });
      console.groupEnd();
    }

    console.group('By Category');
    Object.entries(summary.byCategory).forEach(([category, metrics]) => {
      const total = metrics.reduce((sum, m) => sum + (m.duration || 0), 0);
      const avg = total / metrics.length;
      console.log(`${category}: ${metrics.length} operations, avg ${avg.toFixed(2)}ms, total ${total.toFixed(2)}ms`);
    });
    console.groupEnd();
    console.groupEnd();
  }
}

// Singleton instance
export const performanceMonitor = new PerformanceMonitor();

/**
 * Server-side performance monitoring
 */
export async function measureServerAction<T>(
  actionName: string,
  action: () => Promise<T>,
  metadata?: Record<string, any>
): Promise<T> {
  const start = Date.now();
  try {
    const result = await action();
    const duration = Date.now() - start;
    
    if (duration > 500) {
      console.warn(`[Server Performance] ${actionName} took ${duration}ms`, metadata || '');
    }
    
    return result;
  } catch (error) {
    const duration = Date.now() - start;
    console.error(`[Server Performance] ${actionName} failed after ${duration}ms`, error);
    throw error;
  }
}

/**
 * React hook for measuring component render time
 */
export function usePerformanceMeasure(componentName: string) {
  if (typeof window === 'undefined') return;

  const startTime = performance.now();

  // Use useEffect to measure after render
  if (typeof window !== 'undefined') {
    // This will be called after render
    setTimeout(() => {
      const duration = performance.now() - startTime;
      if (duration > 100) {
        console.warn(`[Render Performance] ${componentName} took ${duration.toFixed(2)}ms to render`);
      }
    }, 0);
  }
}

