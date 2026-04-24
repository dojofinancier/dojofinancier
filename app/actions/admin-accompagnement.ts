"use server";

import { requireAdmin } from "@/lib/auth/require-auth";
import { prisma } from "@/lib/prisma";
import { logServerError } from "@/lib/utils/error-logging";
import { z } from "zod";
import type { ContextLineCategory } from "@prisma/client";
import { calculateStreak } from "@/lib/accompagnement/weekly";

// ─── Product CRUD ────────────────────────────────────────────────────────────

const productSchema = z.object({
  courseId: z.string().min(1),
  title: z.string().min(1),
  description: z.string().optional().nullable(),
  price: z.number().positive(),
  accessDurationDays: z.number().int().positive().default(365),
  sendTime: z
    .string()
    .regex(/^\d{2}:\d{2}$/)
    .default("07:00"),
  aiModel: z.string().min(1).default("gpt-5.4-mini"),
  published: z.boolean().default(false),
});

export async function getAccompagnementProductsAction() {
  try {
    await requireAdmin();
    const products = await prisma.accompagnementProduct.findMany({
      include: {
        course: { select: { title: true, slug: true } },
        _count: { select: { enrollments: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return {
      success: true,
      data: products.map((p) => ({
        id: p.id,
        courseId: p.courseId,
        courseTitle: p.course.title,
        courseSlug: p.course.slug,
        title: p.title,
        description: p.description,
        price: Number(p.price),
        accessDurationDays: p.accessDurationDays,
        sendTime: p.sendTime,
        aiModel: p.aiModel,
        published: p.published,
        enrollmentCount: p._count.enrollments,
        createdAt: p.createdAt,
      })),
    };
  } catch (error) {
    await logServerError({
      errorMessage: `Failed to get accompagnement products: ${error instanceof Error ? error.message : "Unknown"}`,
      severity: "MEDIUM",
    });
    return { success: false, error: "Erreur lors du chargement" };
  }
}

export async function createAccompagnementProductAction(
  data: z.infer<typeof productSchema>
) {
  try {
    await requireAdmin();
    const validated = productSchema.parse(data);

    const product = await prisma.accompagnementProduct.create({
      data: {
        courseId: validated.courseId,
        title: validated.title,
        description: validated.description || null,
        price: validated.price,
        accessDurationDays: validated.accessDurationDays,
        sendTime: validated.sendTime,
        aiModel: validated.aiModel,
        published: validated.published,
      },
    });

    return { success: true, data: product };
  } catch (error: unknown) {
    if ((error as { code?: string })?.code === "P2002") {
      return {
        success: false,
        error: "Un produit d'accompagnement existe déjà pour ce cours",
      };
    }
    await logServerError({
      errorMessage: `Failed to create accompagnement product: ${error instanceof Error ? error.message : "Unknown"}`,
      severity: "HIGH",
    });
    return { success: false, error: "Erreur lors de la création" };
  }
}

export async function updateAccompagnementProductAction(
  id: string,
  data: Partial<z.infer<typeof productSchema>>
) {
  try {
    await requireAdmin();

    const product = await prisma.accompagnementProduct.update({
      where: { id },
      data: {
        ...(data.title !== undefined && { title: data.title }),
        ...(data.description !== undefined && {
          description: data.description || null,
        }),
        ...(data.price !== undefined && { price: data.price }),
        ...(data.accessDurationDays !== undefined && {
          accessDurationDays: data.accessDurationDays,
        }),
        ...(data.sendTime !== undefined && { sendTime: data.sendTime }),
        ...(data.aiModel !== undefined && { aiModel: data.aiModel }),
        ...(data.published !== undefined && { published: data.published }),
      },
    });

    return { success: true, data: product };
  } catch (error) {
    await logServerError({
      errorMessage: `Failed to update accompagnement product: ${error instanceof Error ? error.message : "Unknown"}`,
      severity: "HIGH",
    });
    return { success: false, error: "Erreur lors de la mise à jour" };
  }
}

export async function deleteAccompagnementProductAction(id: string) {
  try {
    await requireAdmin();
    await prisma.accompagnementProduct.delete({ where: { id } });
    return { success: true };
  } catch (error) {
    await logServerError({
      errorMessage: `Failed to delete accompagnement product: ${error instanceof Error ? error.message : "Unknown"}`,
      severity: "HIGH",
    });
    return { success: false, error: "Erreur lors de la suppression" };
  }
}

// ─── Context Line Templates ─────────────────────────────────────────────────

const contextLineSchema = z.object({
  category: z.enum([
    "NORMAL",
    "WEAK_AREA",
    "MISSED_ACK",
    "PLAN_REMINDER",
    "EXAM_URGENCY",
  ]),
  body: z.string().min(1).max(500),
  weekdayApplicability: z
    .array(z.number().int().min(0).max(6))
    .default([0, 1, 2, 3, 4, 5, 6]),
  locale: z.string().default("fr"),
  active: z.boolean().default(true),
});

export async function getContextLineTemplatesAction() {
  try {
    await requireAdmin();
    const rows = await prisma.contextLineTemplate.findMany({
      orderBy: [{ category: "asc" }, { createdAt: "desc" }],
    });
    return {
      success: true,
      data: rows.map((r) => ({
        id: r.id,
        category: r.category,
        body: r.body,
        weekdayApplicability: (r.weekdayApplicability as number[]) ?? [
          0, 1, 2, 3, 4, 5, 6,
        ],
        locale: r.locale,
        active: r.active,
        createdAt: r.createdAt,
      })),
    };
  } catch (error) {
    await logServerError({
      errorMessage: `Failed to get context lines: ${error instanceof Error ? error.message : "Unknown"}`,
      severity: "MEDIUM",
    });
    return { success: false, error: "Erreur lors du chargement" };
  }
}

export async function createContextLineTemplateAction(
  data: z.infer<typeof contextLineSchema>
) {
  try {
    await requireAdmin();
    const v = contextLineSchema.parse(data);
    const row = await prisma.contextLineTemplate.create({
      data: {
        category: v.category as ContextLineCategory,
        body: v.body,
        weekdayApplicability: v.weekdayApplicability,
        locale: v.locale,
        active: v.active,
      },
    });
    return { success: true, data: row };
  } catch (error) {
    await logServerError({
      errorMessage: `Failed to create context line: ${error instanceof Error ? error.message : "Unknown"}`,
      severity: "HIGH",
    });
    return { success: false, error: "Erreur lors de la création" };
  }
}

export async function updateContextLineTemplateAction(
  id: string,
  data: Partial<z.infer<typeof contextLineSchema>>
) {
  try {
    await requireAdmin();
    const row = await prisma.contextLineTemplate.update({
      where: { id },
      data: {
        ...(data.category !== undefined && {
          category: data.category as ContextLineCategory,
        }),
        ...(data.body !== undefined && { body: data.body }),
        ...(data.weekdayApplicability !== undefined && {
          weekdayApplicability: data.weekdayApplicability,
        }),
        ...(data.locale !== undefined && { locale: data.locale }),
        ...(data.active !== undefined && { active: data.active }),
      },
    });
    return { success: true, data: row };
  } catch (error) {
    await logServerError({
      errorMessage: `Failed to update context line: ${error instanceof Error ? error.message : "Unknown"}`,
      severity: "HIGH",
    });
    return { success: false, error: "Erreur lors de la mise à jour" };
  }
}

export async function deleteContextLineTemplateAction(id: string) {
  try {
    await requireAdmin();
    await prisma.contextLineTemplate.delete({ where: { id } });
    return { success: true };
  } catch (error) {
    return { success: false, error: "Erreur lors de la suppression" };
  }
}

// ─── Student Progress (Admin) ──────────────────────────────────────────────

export async function getAccompagnementStudentsAction(
  productId?: string,
  page = 1,
  limit = 20
) {
  try {
    await requireAdmin();

    const where = productId ? { accompagnementProductId: productId } : {};

    const [enrollments, total] = await Promise.all([
      prisma.accompagnementEnrollment.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
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
          product: { select: { title: true, courseId: true } },
          onboarding: { select: { examDate: true } },
          _count: { select: { checkIns: true } },
        },
      }),
      prisma.accompagnementEnrollment.count({ where }),
    ]);

    const data = await Promise.all(
      enrollments.map(async (e) => {
        const [responded, missed, lastCheckIn, streak, weakCount] =
          await Promise.all([
            prisma.dailyCheckIn.count({
              where: { enrollmentId: e.id, status: "RESPONDED" },
            }),
            prisma.dailyCheckIn.count({
              where: { enrollmentId: e.id, status: "MISSED" },
            }),
            prisma.dailyCheckIn.findFirst({
              where: { enrollmentId: e.id, status: "RESPONDED" },
              orderBy: { scheduledFor: "desc" },
              select: { scheduledFor: true },
            }),
            calculateStreak(e.id),
            prisma.weakAreaSignal.count({
              where: {
                enrollmentId: e.id,
                createdAt: {
                  gte: new Date(Date.now() - 30 * 24 * 3600 * 1000),
                },
              },
            }),
          ]);

        const evaluated = responded + missed;
        const responseRate =
          evaluated > 0 ? Math.round((responded / evaluated) * 100) : 0;

        return {
          id: e.id,
          userId: e.user.id,
          userEmail: e.user.email,
          userName:
            `${e.user.firstName || ""} ${e.user.lastName || ""}`.trim() ||
            e.user.email,
          productTitle: e.product.title,
          channel: e.channel,
          phoneE164: e.phoneE164,
          isActive: e.isActive,
          onboardingCompleted: e.onboardingCompleted,
          examDate: e.onboarding?.examDate || null,
          totalCheckIns: e._count.checkIns,
          responseRate,
          streak,
          weakAreaCount: weakCount,
          lastResponseDate: lastCheckIn?.scheduledFor || null,
          expiresAt: e.expiresAt,
          createdAt: e.createdAt,
        };
      })
    );

    return { success: true, data, total };
  } catch (error) {
    await logServerError({
      errorMessage: `Failed to get students: ${error instanceof Error ? error.message : "Unknown"}`,
      severity: "MEDIUM",
    });
    return { success: false, error: "Erreur lors du chargement" };
  }
}

export async function getStudentAccompagnementDetailAction(
  enrollmentId: string
) {
  try {
    await requireAdmin();

    const enrollment = await prisma.accompagnementEnrollment.findUnique({
      where: { id: enrollmentId },
      include: {
        user: { select: { email: true, firstName: true, lastName: true } },
        product: { select: { title: true } },
        onboarding: { include: { chapterAssessments: true } },
        checkIns: {
          orderBy: { scheduledFor: "desc" },
          take: 50,
          include: {
            answers: { orderBy: { orderIndex: "asc" } },
            response: true,
          },
        },
        weeklyReviews: {
          orderBy: { weekStartDate: "desc" },
          take: 8,
        },
        weeklyPlans: {
          orderBy: { weekStartDate: "desc" },
          take: 4,
        },
      },
    });

    if (!enrollment) {
      return { success: false, error: "Inscription introuvable" };
    }

    const weakAreas = await prisma.weakAreaSignal.findMany({
      where: {
        enrollmentId,
        createdAt: { gte: new Date(Date.now() - 30 * 24 * 3600 * 1000) },
      },
      orderBy: { createdAt: "desc" },
    });

    const streak = await calculateStreak(enrollmentId);

    return {
      success: true,
      data: {
        ...enrollment,
        weakAreas,
        streak,
      },
    };
  } catch (error) {
    await logServerError({
      errorMessage: `Failed to get student detail: ${error instanceof Error ? error.message : "Unknown"}`,
      severity: "MEDIUM",
    });
    return { success: false, error: "Erreur lors du chargement" };
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

export async function getCoursesForProductCreationAction() {
  try {
    await requireAdmin();

    const existingProductCourseIds =
      await prisma.accompagnementProduct.findMany({
        select: { courseId: true },
      });
    const usedCourseIds = new Set(
      existingProductCourseIds.map((p) => p.courseId)
    );

    const courses = await prisma.course.findMany({
      where: { published: true },
      select: { id: true, title: true, slug: true },
      orderBy: { title: "asc" },
    });

    return {
      success: true,
      data: courses.map((c) => ({
        ...c,
        hasProduct: usedCourseIds.has(c.id),
      })),
    };
  } catch (error) {
    await logServerError({
      errorMessage: `Failed to get courses: ${error instanceof Error ? error.message : "Unknown"}`,
      severity: "LOW",
    });
    return { success: false, error: "Erreur lors du chargement" };
  }
}
