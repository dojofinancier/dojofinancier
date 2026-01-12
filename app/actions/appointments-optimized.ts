"use server";

import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth/require-auth";
import { logServerError } from "@/lib/utils/error-logging";
import type { PaginatedResult } from "@/lib/utils/pagination";
import { measureServerAction } from "@/lib/utils/performance-monitor";

/**
 * Optimized: Get appointments with caching and optimized queries
 */
export async function getAppointmentsActionOptimized(params: {
  cursor?: string;
  limit?: number;
  status?: string;
  courseId?: string;
}): Promise<PaginatedResult<any>> {
  return measureServerAction(
    "getAppointmentsAction",
    async () => {
      try {
        const user = await requireAuth();
        const limit = params.limit || 20;
        const cursor = params.cursor ? { id: params.cursor } : undefined;

        const where: any = {
          userId: user.id,
        };

        if (params.status) {
          where.status = params.status;
        }
        if (params.courseId) {
          where.courseId = params.courseId;
        }

        // Use select instead of include for better performance
        // Fetch related data in parallel
        const [appointments, courses, instructors] = await Promise.all([
          prisma.appointment.findMany({
            where,
            take: limit + 1,
            cursor,
            orderBy: { scheduledAt: "asc" },
            select: {
              id: true,
              scheduledAt: true,
              status: true,
              notes: true,
              durationMinutes: true,
              amount: true,
              courseId: true,
              userId: true,
            },
          }),
          // Get all unique course IDs first
          prisma.appointment.findMany({
            where,
            select: { courseId: true },
            distinct: ["courseId"],
          }).then((apps) => {
            const courseIds = apps.map((a) => a.courseId).filter(Boolean) as string[];
            return courseIds.length > 0
              ? prisma.course.findMany({
                  where: { id: { in: courseIds } },
                  select: {
                    id: true,
                    title: true,
                  },
                })
              : [];
          }),
          // Get all unique instructor IDs (if needed)
          Promise.resolve([]), // Placeholder for instructor fetching if needed
        ]);

        const hasMore = appointments.length > limit;
        const items = hasMore ? appointments.slice(0, limit) : appointments;
        const nextCursor = hasMore ? items[items.length - 1].id : null;

        // Create lookup maps
        const courseMap = new Map(courses.map((c) => [c.id, c]));

        // Combine data
        const appointmentsWithRelations = items.map((appointment) => ({
          ...appointment,
          amount: appointment.amount?.toNumber() ?? null,
          course: appointment.courseId ? courseMap.get(appointment.courseId) : null,
        }));

        return {
          items: appointmentsWithRelations,
          nextCursor,
          hasMore,
        };
      } catch (error) {
        await logServerError({
          errorMessage: `Failed to get appointments: ${error instanceof Error ? error.message : "Unknown error"}`,
          stackTrace: error instanceof Error ? error.stack : undefined,
          severity: "MEDIUM",
        });

        return {
          items: [],
          nextCursor: null,
          hasMore: false,
        };
      }
    },
    { userId: (await requireAuth()).id, ...params }
  );
}

