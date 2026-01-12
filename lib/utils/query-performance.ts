/**
 * Database query performance monitoring
 */

import { prisma } from "@/lib/prisma";

// Store original query methods
const originalFindMany = prisma.$queryRaw;
const originalFindFirst = prisma.$queryRaw;
const originalFindUnique = prisma.$queryRaw;

// Enable query logging in development
if (process.env.NODE_ENV === 'development') {
  // Prisma already logs queries, but we can add timing
  const originalQuery = prisma.$queryRaw;
  
  // @ts-ignore - Monkey patch for performance monitoring
  prisma.$queryRaw = async function(...args: any[]) {
    const start = Date.now();
    const result = await (originalQuery as any).apply(this, args as any);
    const duration = Date.now() - start;
    
    if (duration > 200) {
      console.warn(`[DB Query] Slow query detected: ${duration}ms`, args[0]?.substring?.(0, 100) || '');
    }
    
    return result;
  };
}

/**
 * Analyze query performance from Prisma logs
 */
export function analyzeQueryPerformance(logs: string[]): {
  totalQueries: number;
  slowQueries: Array<{ query: string; time: number }>;
  averageTime: number;
  totalTime: number;
} {
  const queryTimes: number[] = [];
  const slowQueries: Array<{ query: string; time: number }> = [];

  logs.forEach((log) => {
    // Extract query time from Prisma logs
    // Format: "prisma:query SELECT ..." followed by timing info
    const timeMatch = log.match(/(\d+)ms/);
    if (timeMatch) {
      const time = parseInt(timeMatch[1], 10);
      queryTimes.push(time);
      
      if (time > 200) {
        // Extract query type
        const queryMatch = log.match(/(SELECT|INSERT|UPDATE|DELETE|BEGIN|COMMIT)/);
        slowQueries.push({
          query: queryMatch ? queryMatch[1] : 'unknown',
          time,
        });
      }
    }
  });

  const totalTime = queryTimes.reduce((sum, time) => sum + time, 0);
  const averageTime = queryTimes.length > 0 ? totalTime / queryTimes.length : 0;

  return {
    totalQueries: queryTimes.length,
    slowQueries,
    averageTime,
    totalTime,
  };
}

