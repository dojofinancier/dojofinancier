"use server";

import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth/require-auth";
import { logServerError } from "@/lib/utils/error-logging";
import type { PaginatedResult } from "@/lib/utils/pagination";
import { measureServerAction } from "@/lib/utils/performance-monitor";

/**
 * Optimized: Get support tickets with caching
 */
export async function getSupportTicketsActionOptimized(params: {
  cursor?: string;
  limit?: number;
  status?: string;
  priority?: string;
  category?: string;
  assignedAdminId?: string;
  search?: string;
}): Promise<PaginatedResult<any>> {
  return measureServerAction(
    "getSupportTicketsAction",
    async () => {
      try {
        const user = await requireAuth();
        const limit = params.limit || 20;
        const cursor = params.cursor ? { id: params.cursor } : undefined;

        const where: any = {};

        // Students only see their own tickets
        if (user.role === "STUDENT") {
          where.studentId = user.id;
        }

        if (params.status) {
          where.status = params.status;
        }
        if (params.priority) {
          where.priority = params.priority;
        }
        if (params.category) {
          where.category = params.category;
        }
        if (params.assignedAdminId) {
          where.assignedAdminId = params.assignedAdminId;
        }
        if (params.search) {
          where.OR = [
            { subject: { contains: params.search, mode: "insensitive" } },
            { description: { contains: params.search, mode: "insensitive" } },
            { ticketNumber: { contains: params.search, mode: "insensitive" } },
          ];
        }

        // Use select instead of include for better performance
        // Get reply count in a separate optimized query
        const tickets = await prisma.supportTicket.findMany({
          where,
          take: limit + 1,
          cursor,
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            ticketNumber: true,
            studentId: true,
            assignedAdminId: true,
            subject: true,
            description: true,
            status: true,
            priority: true,
            category: true,
            createdAt: true,
            updatedAt: true,
          },
        });

        const hasMore = tickets.length > limit;
        const items = hasMore ? tickets.slice(0, limit) : tickets;
        const nextCursor = hasMore ? items[items.length - 1].id : null;

        // Get reply counts in a single query (batch)
        const ticketIds = items.map((t) => t.id);
        const replyCounts = ticketIds.length > 0
          ? await prisma.supportTicketReply.groupBy({
              by: ["ticketId"],
              where: {
                ticketId: { in: ticketIds },
              },
              _count: {
                id: true,
              },
            })
          : [];

        const replyCountMap = new Map(
          replyCounts.map((rc) => [rc.ticketId, rc._count.id])
        );

        // Add reply counts to tickets
        const ticketsWithCounts = items.map((ticket) => ({
          ...ticket,
          _count: {
            replies: replyCountMap.get(ticket.id) || 0,
          },
        }));

        return {
          items: ticketsWithCounts,
          nextCursor,
          hasMore,
        };
      } catch (error) {
        await logServerError({
          errorMessage: `Failed to get support tickets: ${error instanceof Error ? error.message : "Unknown error"}`,
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

