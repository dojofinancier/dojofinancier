import { prisma } from "@/lib/prisma";
import type { ErrorSeverity, ErrorType } from "@prisma/client";
import { sendErrorOccurredWebhook } from "@/lib/webhooks/make";

/**
 * Logs an error to the database and optionally sends to make.com webhook
 * @returns The error ID if successful, undefined if logging failed
 */
export async function logError(params: {
  errorType: ErrorType;
  errorMessage: string;
  stackTrace?: string;
  userId?: string;
  url?: string;
  userAgent?: string;
  severity?: ErrorSeverity;
}): Promise<string | undefined> {
  try {
    const errorLog = await prisma.errorLog.create({
      data: {
        errorType: params.errorType,
        errorMessage: params.errorMessage,
        stackTrace: params.stackTrace,
        userId: params.userId,
        url: params.url,
        userAgent: params.userAgent,
        severity: params.severity || "MEDIUM",
      },
    });

    // Send to make.com webhook for admin notifications (non-blocking)
    // Only send HIGH and CRITICAL errors to avoid spam
    // Only send if webhook URL is configured
    // Skip during prerendering/static generation (Next.js doesn't allow fetch during prerendering)
    const isPrerendering = typeof window === 'undefined' && 
                           (process.env.NEXT_PHASE === 'phase-production-build' || 
                            process.env.__NEXT_PRERENDER === '1');
    
    if ((params.severity === "HIGH" || params.severity === "CRITICAL") && 
        process.env.MAKE_WEBHOOK_ERRORS_URL && 
        !isPrerendering) {
      // Get user email if userId is provided
      let userEmail: string | null = null;
      if (params.userId) {
        try {
          const user = await prisma.user.findUnique({
            where: { id: params.userId },
            select: { email: true },
          });
          userEmail = user?.email || null;
        } catch (error) {
          // Don't fail if user lookup fails
        }
      }

      sendErrorOccurredWebhook({
        errorId: errorLog.errorId,
        errorType: params.errorType,
        errorMessage: params.errorMessage,
        severity: params.severity || "MEDIUM",
        userId: params.userId || null,
        userEmail,
        url: params.url || null,
        stackTrace: params.stackTrace || null,
        userAgent: params.userAgent || null,
        timestamp: errorLog.createdAt.toISOString(),
      }).catch((webhookError) => {
        // Don't fail if webhook fails, just log to console
        // Only log in development to avoid console spam
        if (process.env.NODE_ENV === 'development') {
          console.error("Failed to send error to make.com webhook:", webhookError);
        }
      });
    }

    return errorLog.errorId;
  } catch (error) {
    // Fallback: log to console if database logging fails
    console.error("Failed to log error to database:", error);
    console.error("Original error:", params);
    return undefined;
  }
}

/**
 * Logs a client-side error
 * @returns The error ID if successful, undefined if logging failed
 */
export async function logClientError(params: {
  errorMessage: string;
  stackTrace?: string;
  userId?: string;
  url?: string;
  userAgent?: string;
  severity?: ErrorSeverity;
}): Promise<string | undefined> {
  return logError({
    ...params,
    errorType: "CLIENT",
  });
}

/**
 * Logs a server-side error
 */
export async function logServerError(params: {
  errorMessage: string;
  stackTrace?: string;
  userId?: string;
  url?: string;
  userAgent?: string;
  severity?: ErrorSeverity;
}): Promise<void> {
  await logError({
    ...params,
    errorType: "SERVER",
  });
}

/**
 * Marks an error as resolved
 */
export async function markErrorResolved(errorId: string): Promise<void> {
  await prisma.errorLog.update({
    where: { errorId },
    data: { resolved: true },
  });
}

/**
 * Gets error logs with pagination
 */
export async function getErrorLogs(params: {
  cursor?: string;
  limit?: number;
  resolved?: boolean;
  severity?: ErrorSeverity;
}) {
  const limit = params.limit || 20;
  const cursor = params.cursor
    ? { id: params.cursor }
    : undefined;

  const where: any = {};
  if (params.resolved !== undefined) {
    where.resolved = params.resolved;
  }
  if (params.severity) {
    where.severity = params.severity;
  }

  const errorLogs = await prisma.errorLog.findMany({
    where,
    take: limit + 1,
    cursor,
    orderBy: { createdAt: "desc" },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
        },
      },
    },
  });

  const hasMore = errorLogs.length > limit;
  const items = hasMore ? errorLogs.slice(0, limit) : errorLogs;
  const nextCursor = hasMore ? items[items.length - 1].id : null;

  return {
    items,
    nextCursor,
    hasMore,
  };
}

/**
 * Cleanup old error logs (90-day retention)
 * Should be run periodically (e.g., via cron job or scheduled function)
 */
export async function cleanupOldErrorLogs(): Promise<number> {
  const ninetyDaysAgo = new Date();
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

  const result = await prisma.errorLog.deleteMany({
    where: {
      createdAt: {
        lt: ninetyDaysAgo,
      },
    },
  });

  return result.count;
}

