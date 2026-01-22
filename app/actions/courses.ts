"use server";

import { prisma } from "@/lib/prisma";
import { requireAdmin, requireAuth } from "@/lib/auth/require-auth";
import { z } from "zod";
import { logServerError } from "@/lib/utils/error-logging";
import type { PaginatedResult } from "@/lib/utils/pagination";
import { generateSlug, generateUniqueSlug } from "@/lib/utils/slug";
import { revalidatePath, unstable_cache } from "next/cache";

const componentVisibilitySchema = z.object({
  videos: z.boolean().default(true),
  quizzes: z.boolean().default(true),
  flashcards: z.boolean().default(true),
  notes: z.boolean().default(true),
  messaging: z.boolean().default(true),
  appointments: z.boolean().default(true),
  virtualTutor: z.boolean().default(false),
});

const courseSchema = z.object({
  code: z.string().optional().nullable(),
  title: z.string().min(1, "Le titre est requis"),
  description: z.string().optional(),
  price: z.number().min(0, "Le prix doit être positif"),
  accessDuration: z.number().int().positive().default(365),
  paymentType: z.enum(["ONE_TIME", "SUBSCRIPTION"]),
  subscriptionId: z.string().optional().nullable(),
  categoryId: z.string().min(1, "La catégorie est requise"),
  published: z.boolean().default(false),
  componentVisibility: componentVisibilitySchema.optional(),
  appointmentHourlyRate: z.number().min(0).optional().nullable(),
  recommendedStudyHoursMin: z.number().int().min(1).max(40).optional().nullable(),
  recommendedStudyHoursMax: z.number().int().min(1).max(40).optional().nullable(),
  displayOrder: z.number().int().min(0).optional().nullable(),
  orientationVideoUrl: z.string().optional().nullable().refine(
    (val) => !val || val === "" || z.string().url().safeParse(val).success,
    { message: "L'URL doit être une URL valide" }
  ).transform((val) => val === "" ? null : val),
  orientationText: z.string().optional().nullable(),
  heroImages: z.array(z.string()).optional().default([]),
  launchDate: z.string().optional().nullable().transform((val) => {
    if (!val || val === "") return null;
    const date = new Date(val);
    return isNaN(date.getTime()) ? null : date;
  }),
  productStats: z.array(z.object({
    value: z.number(),
    label: z.string(),
  })).optional().default([]),
});

export type CourseActionResult = {
  success: boolean;
  error?: string;
  data?: any;
};

/**
 * Create a new course (admin only)
 */
export async function createCourseAction(
  data: z.infer<typeof courseSchema>
): Promise<CourseActionResult> {
  try {
    const admin = await requireAdmin();

    const validatedData = courseSchema.parse(data);

    // Separate categoryId and componentVisibility from other fields
    const { categoryId, componentVisibility, heroImages, ...createData } = validatedData;
    
    const prismaData: any = { ...createData };
    
    // Handle heroImages - explicitly set as JSON array
    if (heroImages !== undefined) {
      prismaData.heroImages = heroImages;
    }
    
    // Generate slug from code if code exists
    if (createData.code) {
      const baseSlug = generateSlug(createData.code);
      // Check for existing slugs
      const existingSlugs = await prisma.course.findMany({
        where: { slug: { not: null } },
        select: { slug: true },
      }).then(courses => courses.map(c => c.slug).filter(Boolean) as string[]);
      prismaData.slug = generateUniqueSlug(baseSlug, existingSlugs);
    }
    
    // Handle categoryId using the relation syntax
    if (categoryId) {
      prismaData.category = {
        connect: { id: categoryId },
      };
    }
    
    // Handle componentVisibility as JSON
    if (componentVisibility !== undefined) {
      prismaData.componentVisibility = componentVisibility;
    }

    const course = await prisma.course.create({
      data: prismaData,
      include: {
        category: true,
      },
    });

    return { success: true, data: course };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: error.issues[0]?.message || "Données invalides",
      };
    }

    await logServerError({
      errorMessage: `Failed to create course: ${error instanceof Error ? error.message : "Unknown error"}`,
      stackTrace: error instanceof Error ? error.stack : undefined,
      userId: (await requireAdmin()).id,
      severity: "HIGH",
    });

    return {
      success: false,
      error: "Erreur lors de la création du cours",
    };
  }
}

/**
 * Update a course (admin only)
 */
export async function updateCourseAction(
  courseId: string,
  data: Partial<z.infer<typeof courseSchema>>
): Promise<CourseActionResult> {
  try {
    const admin = await requireAdmin();

    const validatedData = courseSchema.partial().parse(data);

    console.log("Updating course with data:", { courseId, validatedData });

    // Separate categoryId from other fields and handle it as a relation
    const { categoryId, code, appointmentHourlyRate, orientationVideoUrl, orientationText, heroImages, displayOrder, launchDate, ...updateData } = validatedData;
    
    const prismaData: any = { ...updateData };
    
    // Handle heroImages - explicitly set as JSON array
    if (heroImages !== undefined) {
      prismaData.heroImages = heroImages;
    }
    
    // Regenerate slug if code is being updated
    if (code !== undefined && code !== null) {
      prismaData.code = code; // Include code in the update
      const baseSlug = generateSlug(code);
      // Check for existing slugs (excluding current course)
      const existingSlugs = await prisma.course.findMany({
        where: { 
          slug: { not: null },
          id: { not: courseId }
        },
        select: { slug: true },
      }).then(courses => courses.map(c => c.slug).filter(Boolean) as string[]);
      prismaData.slug = generateUniqueSlug(baseSlug, existingSlugs);
    }
    
    // Handle appointmentHourlyRate - explicitly set null if provided (even if null)
    if (appointmentHourlyRate !== undefined) {
      prismaData.appointmentHourlyRate = appointmentHourlyRate;
    }
    
    // Handle orientationVideoUrl - explicitly set null if provided (even if null)
    if (orientationVideoUrl !== undefined) {
      prismaData.orientationVideoUrl = orientationVideoUrl;
    }
    
    // Handle orientationText - explicitly set null if provided (even if null)
    if (orientationText !== undefined) {
      prismaData.orientationText = orientationText;
    }
    
    // Handle displayOrder - explicitly set null if provided (even if null)
    if (displayOrder !== undefined) {
      prismaData.displayOrder = displayOrder;
    }
    
    // Handle launchDate - explicitly set null if provided (even if null)
    if (launchDate !== undefined) {
      prismaData.launchDate = launchDate;
    }
    
    // Handle categoryId using the relation syntax
    if (categoryId !== undefined) {
      prismaData.category = {
        connect: { id: categoryId },
      };
    }

    const course = await prisma.course.update({
      where: { id: courseId },
      data: prismaData,
      include: {
        category: true,
      },
    });

    // Revalidate relevant paths
    revalidatePath(`/tableau-de-bord/admin/courses/${courseId}`);
    revalidatePath("/tableau-de-bord/admin");
    revalidatePath(`/apprendre/${courseId}`);

    // Convert Decimal fields to numbers for client components
    const serializedCourse = {
      ...course,
      price: course.price.toNumber(),
      appointmentHourlyRate: course.appointmentHourlyRate?.toNumber() ?? null,
      recommendedStudyHoursMin: course.recommendedStudyHoursMin ?? null,
      recommendedStudyHoursMax: course.recommendedStudyHoursMax ?? null,
    };

    return { success: true, data: serializedCourse };
  } catch (error) {
    console.error("Update course error:", error);
    
    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: error.issues[0]?.message || "Données invalides",
      };
    }

    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    const errorStack = error instanceof Error ? error.stack : undefined;

    await logServerError({
      errorMessage: `Failed to update course: ${errorMessage}`,
      stackTrace: errorStack,
      userId: (await requireAdmin()).id,
      severity: "HIGH",
    });

    return {
      success: false,
      error: `Erreur lors de la mise à jour du cours: ${errorMessage}`,
    };
  }
}

/**
 * Delete a course (admin only)
 */
export async function deleteCourseAction(
  courseId: string
): Promise<CourseActionResult> {
  try {
    await requireAdmin();

    await prisma.course.delete({
      where: { id: courseId },
    });

    return { success: true };
  } catch (error) {
    await logServerError({
      errorMessage: `Failed to delete course: ${error instanceof Error ? error.message : "Unknown error"}`,
      stackTrace: error instanceof Error ? error.stack : undefined,
      severity: "HIGH",
    });

    return {
      success: false,
      error: "Erreur lors de la suppression du cours",
    };
  }
}

/**
 * Get all courses with pagination (admin only)
 */
export async function getCoursesAction(params: {
  cursor?: string;
  limit?: number;
  categoryId?: string;
  published?: boolean;
}) {
  try {
    await requireAdmin();

    const limit = params.limit || 20;
    const cursor = params.cursor ? { id: params.cursor } : undefined;

    const where: any = {};
    if (params.categoryId) {
      where.categoryId = params.categoryId;
    }
    if (params.published !== undefined) {
      where.published = params.published;
    }

    const courses = await prisma.course.findMany({
      where,
      take: limit + 1,
      cursor,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        code: true,
        slug: true,
        title: true,
        description: true,
        price: true,
        accessDuration: true,
        paymentType: true,
        subscriptionId: true,
        published: true,
        displayOrder: true,
        categoryId: true,
        componentVisibility: true,
        appointmentHourlyRate: true,
        recommendedStudyHoursMin: true,
        recommendedStudyHoursMax: true,
        orientationVideoUrl: true,
        orientationText: true,
        launchDate: true,
        createdAt: true,
        updatedAt: true,
        category: true,
        _count: {
          select: {
            enrollments: true,
            modules: true,
          },
        },
      },
    });

    const hasMore = courses.length > limit;
    const items = hasMore ? courses.slice(0, limit) : courses;
    const nextCursor = hasMore ? items[items.length - 1].id : null;

    // Convert Decimal fields to numbers for client components
    const serializedItems = items.map((course) => ({
      ...course,
      price: course.price.toNumber(),
      appointmentHourlyRate: course.appointmentHourlyRate?.toNumber() ?? null,
    }));

    return {
      items: serializedItems,
      nextCursor,
      hasMore,
    };
  } catch (error) {
    await logServerError({
      errorMessage: `Failed to get courses: ${error instanceof Error ? error.message : "Unknown error"}`,
      stackTrace: error instanceof Error ? error.stack : undefined,
      severity: "MEDIUM",
    });

    return {
      items: [],
      nextCursor: null,
      hasMore: false,
    };
  }
}

/**
 * Get a single course by slug or ID (supports both for backward compatibility)
 */
export async function getCourseBySlugOrIdAction(slugOrId: string) {
  try {
    // If it's a UUID, look up by ID (backward compatibility)
    // Otherwise, look up by slug
    const whereClause = isUUID(slugOrId)
      ? { id: slugOrId }
      : { slug: slugOrId };

    const course = await prisma.course.findFirst({
      where: whereClause,
      include: {
        category: true,
        modules: {
          orderBy: { order: "asc" },
          include: {
            contentItems: {
              orderBy: { order: "asc" },
            },
          },
        },
        _count: {
          select: {
            enrollments: true,
          },
        },
      },
    });

    if (!course) {
      return null;
    }

    // Convert Decimal fields to numbers for client components
    // Use explicit conversion to avoid passing Decimal objects
    return {
      ...course,
      price: course.price.toNumber(),
      appointmentHourlyRate: course.appointmentHourlyRate?.toNumber() ?? null,
      recommendedStudyHoursMin: course.recommendedStudyHoursMin ?? null,
      recommendedStudyHoursMax: course.recommendedStudyHoursMax ?? null,
    };
  } catch (error) {
    await logServerError({
      errorMessage: `Failed to get course: ${error instanceof Error ? error.message : "Unknown error"}`,
      stackTrace: error instanceof Error ? error.stack : undefined,
      severity: "MEDIUM",
    });

    return null;
  }
}

/**
 * Get a single course by ID
 * @deprecated Use getCourseBySlugOrIdAction instead
 */
export async function getCourseAction(courseId: string) {
  try {
    const course = await prisma.course.findUnique({
      where: { id: courseId },
      include: {
        category: true,
        modules: {
          orderBy: { order: "asc" },
          include: {
            contentItems: {
              orderBy: { order: "asc" },
            },
          },
        },
        _count: {
          select: {
            enrollments: true,
          },
        },
      },
    });

    if (!course) {
      return null;
    }

    // Convert Decimal fields to numbers for client components
    // Use explicit conversion to avoid passing Decimal objects
    return {
      ...course,
      price: course.price.toNumber(),
      appointmentHourlyRate: course.appointmentHourlyRate?.toNumber() ?? null,
      recommendedStudyHoursMin: course.recommendedStudyHoursMin ?? null,
      recommendedStudyHoursMax: course.recommendedStudyHoursMax ?? null,
    };
  } catch (error) {
    await logServerError({
      errorMessage: `Failed to get course: ${error instanceof Error ? error.message : "Unknown error"}`,
      stackTrace: error instanceof Error ? error.stack : undefined,
      severity: "MEDIUM",
    });

    return null;
  }
}

/**
 * Internal function to fetch published courses (used for caching)
 */
async function fetchPublishedCourses(params: {
  search?: string;
  orderBy?: "createdAt" | "title" | "price";
  orderDirection?: "asc" | "desc";
}): Promise<PaginatedResult<any>> {
  const now = new Date();
  const where: any = {
    published: true,
    // Only show courses where launchDate is null or <= now (à venir / coming soon)
    AND: [
      {
        OR: [
          { launchDate: null },
          { launchDate: { lte: now } },
        ],
      },
    ],
  };

  // Search by title, description, or code
  if (params.search) {
    where.AND.push({
      OR: [
        { title: { contains: params.search, mode: "insensitive" } },
        { description: { contains: params.search, mode: "insensitive" } },
        { code: { contains: params.search, mode: "insensitive" } },
      ],
    });
  }

  // Order by displayOrder first (ascending, lower numbers first), then by the specified field
  // If no displayOrder is set, it will be null and those courses will appear after ordered ones
  const orderBy: any[] = [
    { displayOrder: "asc" }, // Primary sort: displayOrder ascending (nulls last by default in PostgreSQL)
    { createdAt: "desc" }, // Secondary sort: newest first for courses without displayOrder
  ];
  
  // If a specific orderBy is requested, use it as secondary sort instead of createdAt
  if (params.orderBy && params.orderBy !== "createdAt") {
    const orderField = params.orderBy;
    const orderDir = params.orderDirection || "desc";
    orderBy[1] = { [orderField]: orderDir };
  }

  const courses = await prisma.course.findMany({
    where,
    orderBy,
    select: {
      id: true,
      code: true,
      slug: true,
      title: true,
      description: true,
      price: true,
      published: true,
      displayOrder: true,
      paymentType: true,
      appointmentHourlyRate: true,
      launchDate: true,
      productStats: true,
      category: true,
      createdAt: true,
      _count: {
        select: {
          enrollments: true,
          modules: true,
        },
      },
    },
  });

  // Convert Decimal fields to numbers for client components
  const serializedCourses = courses.map((course) => ({
    ...course,
    price: course.price.toNumber(),
    appointmentHourlyRate: course.appointmentHourlyRate?.toNumber() ?? null,
  }));

  return {
    items: serializedCourses,
    nextCursor: null,
    hasMore: false,
  };
}

// Cached version for non-search queries (search queries are not cached)
const getCachedPublishedCourses = unstable_cache(
  async (params: {
    orderBy?: "createdAt" | "title" | "price";
    orderDirection?: "asc" | "desc";
  }) => {
    return fetchPublishedCourses(params);
  },
  ["published-courses"],
  {
    revalidate: 300, // 5 minutes - courses don't change frequently
    tags: ["courses"],
  }
);

/**
 * Get published courses for catalog (public, no auth required)
 * Uses caching for non-search queries to improve performance
 */
export async function getPublishedCoursesAction(params: {
  search?: string;
  orderBy?: "createdAt" | "title" | "price";
  orderDirection?: "asc" | "desc";
}): Promise<PaginatedResult<any>> {
  try {
    // Don't cache search queries - they're dynamic
    if (params.search) {
      return fetchPublishedCourses(params);
    }

    // Cache non-search queries
    return getCachedPublishedCourses({
      orderBy: params.orderBy,
      orderDirection: params.orderDirection,
    });
  } catch (error) {
    await logServerError({
      errorMessage: `Failed to get published courses: ${error instanceof Error ? error.message : "Unknown error"}`,
      stackTrace: error instanceof Error ? error.stack : undefined,
      severity: "MEDIUM",
    });

    return {
      items: [],
      nextCursor: null,
      hasMore: false,
    };
  }
}

/**
 * Check if a string is a UUID
 */
function isUUID(str: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
}

/**
 * Get published course by slug or ID (public, no auth required)
 * Supports both slug-based URLs and UUID-based URLs for backward compatibility
 * Cached for 5 minutes to improve server response time
 */
export async function getPublishedCourseBySlugAction(slug: string) {
  try {
    // Use cached version for better performance
    const getCachedCourse = unstable_cache(
      async (courseSlug: string) => {
        // If it's a UUID, look up by ID (backward compatibility)
        // Otherwise, look up by slug
        const whereClause = isUUID(courseSlug)
          ? { id: courseSlug, published: true }
          : { slug: courseSlug, published: true };

        const course = await prisma.course.findFirst({
          where: whereClause,
          include: {
            category: true,
            modules: {
              orderBy: { order: "asc" },
              include: {
                contentItems: {
                  orderBy: { order: "asc" },
                  select: {
                    id: true,
                    contentType: true,
                    order: true,
                  },
                },
              },
            },
            faqs: {
              orderBy: { order: "asc" },
            },
            questionBanks: {
              include: {
                questions: {
                  select: {
                    id: true,
                  },
                },
              },
            },
            flashcards: {
              select: {
                id: true,
              },
            },
            _count: {
              select: {
                enrollments: true,
                modules: true,
              },
            },
          },
        });

        if (!course) {
          return null;
        }

        // Batch queries for better performance - run in parallel
        const [quizzes, learningActivities] = await Promise.all([
          prisma.quiz.findMany({
            where: {
              courseId: course.id,
            },
            include: {
              questions: {
                select: {
                  id: true,
                },
              },
            },
          }),
          prisma.learningActivity.findMany({
            where: {
              courseId: course.id,
            },
            select: {
              id: true,
            },
          }),
        ]);
        
        const totalQuizQuestions = quizzes.reduce((acc, quiz) => acc + quiz.questions.length, 0);
        const totalLearningActivities = learningActivities.length;

        // Calculate total question bank questions
        const totalQuestionBankQuestions = course.questionBanks.reduce(
          (acc, qb) => acc + qb.questions.length,
          0
        );

        // Parse JSON fields properly
        const productStats = Array.isArray(course.productStats) 
          ? course.productStats 
          : (course.productStats && typeof course.productStats === 'string' ? JSON.parse(course.productStats) : null);

        // Convert Decimal fields to numbers for client components
        return {
          ...course,
          price: course.price.toNumber(),
          appointmentHourlyRate: course.appointmentHourlyRate?.toNumber() ?? null,
          productStats: (productStats && Array.isArray(productStats)) ? productStats as Array<{ value: number; label: string }> : undefined,
          _count: {
            ...course._count,
            flashcards: course.flashcards.length,
          },
          totalQuizQuestions,
          totalQuestionBankQuestions,
          totalLearningActivities,
        };
      },
      ["published-course"],
      { revalidate: 300, tags: ["courses"] } // 5 minutes cache
    );

    return await getCachedCourse(slug);
  } catch (error) {
    await logServerError({
      errorMessage: `Failed to get published course by slug: ${error instanceof Error ? error.message : "Unknown error"}`,
      stackTrace: error instanceof Error ? error.stack : undefined,
      severity: "MEDIUM",
    });

    return null;
  }
}

/**
 * Get published course by ID (public, no auth required)
 * @deprecated Use getPublishedCourseBySlugAction instead
 */
export async function getPublishedCourseAction(courseId: string) {
  try {
    const course = await prisma.course.findFirst({
      where: {
        id: courseId,
        published: true,
      },
      include: {
        category: true,
        modules: {
          orderBy: { order: "asc" },
          include: {
            contentItems: {
              orderBy: { order: "asc" },
              select: {
                id: true,
                contentType: true,
                order: true,
              },
            },
          },
        },
        _count: {
          select: {
            enrollments: true,
            modules: true,
          },
        },
      },
    });

    if (!course) {
      return null;
    }

    // Convert Decimal fields to numbers for client components
    return {
      ...course,
      price: course.price.toNumber(),
      appointmentHourlyRate: course.appointmentHourlyRate?.toNumber() ?? null,
    };
  } catch (error) {
    await logServerError({
      errorMessage: `Failed to get published course: ${error instanceof Error ? error.message : "Unknown error"}`,
      stackTrace: error instanceof Error ? error.stack : undefined,
      severity: "MEDIUM",
    });

    return null;
  }
}

/**
 * Get course content for enrolled student (with access check)
 */
export async function getCourseContentAction(courseId: string) {
  try {
    const user = await requireAuth();
    const { validateCourseAccess } = await import("@/lib/utils/access-validation");

    // Validate access
    const accessResult = await validateCourseAccess(user.id, courseId);
    if (!accessResult.hasAccess) {
      return {
        success: false,
        error: accessResult.reason || "Accès refusé",
      };
    }

    // Get course with full content
    const course = await prisma.course.findUnique({
      where: { id: courseId },
      select: {
        id: true,
        slug: true,
        title: true,
        componentVisibility: true,
        category: true,
        recommendedStudyHoursMin: true,
        recommendedStudyHoursMax: true,
        orientationVideoUrl: true,
        orientationText: true,
        modules: {
          orderBy: { order: "asc" },
          select: {
            id: true,
            title: true,
            shortTitle: true,
            description: true,
            order: true,
            contentItems: {
              orderBy: { order: "asc" },
              select: {
                id: true,
                contentType: true,
                order: true,
                video: {
                  select: {
                    id: true,
                    vimeoUrl: true,
                    duration: true,
                  },
                },
                quiz: {
                  select: {
                    id: true,
                    title: true,
                    passingScore: true,
                    timeLimit: true,
                    questions: {
                      orderBy: { order: "asc" },
                      select: {
                        id: true,
                        order: true,
                        type: true,
                        question: true,
                        options: true,
                        correctAnswer: true,
                      },
                    },
                  },
                },
                notes: {
                  where: { type: "ADMIN" },
                  select: {
                    id: true,
                    content: true,
                    type: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!course) {
      return {
        success: false,
        error: "Cours introuvable",
      };
    }

    // Add computed title field to content items based on their type
    const courseWithTitles = {
      ...course,
      recommendedStudyHoursMin: course.recommendedStudyHoursMin ?? 6,
      recommendedStudyHoursMax: course.recommendedStudyHoursMax ?? 10,
      orientationVideoUrl: course.orientationVideoUrl ?? null,
      orientationText: course.orientationText ?? null,
      modules: course.modules.map((module) => ({
        ...module,
        contentItems: module.contentItems.map((item) => ({
          ...item,
          title: item.contentType === "QUIZ" && item.quiz
            ? item.quiz.title
            : item.contentType === "VIDEO"
            ? `Vidéo ${item.order}`
            : item.contentType === "NOTE" && item.notes && item.notes.length > 0
            ? `Note ${item.order}`
            : item.contentType === "FLASHCARD"
            ? `Carte mémoire ${item.order}`
            : `Contenu ${item.order}`,
        })),
      })),
    };

    return {
      success: true,
      data: courseWithTitles,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    const errorStack = error instanceof Error ? error.stack : undefined;
    
    console.error("getCourseContentAction error:", {
      courseId,
      errorMessage,
      errorStack,
    });

    await logServerError({
      errorMessage: `Failed to get course content: ${errorMessage}`,
      stackTrace: errorStack,
      severity: "MEDIUM",
    });

    return {
      success: false,
      error: "Erreur lors du chargement du contenu",
    };
  }
}

/**
 * Get course content for admin preview (bypasses enrollment check)
 */
export async function getCourseContentForAdminPreviewAction(courseId: string) {
  try {
    await requireAdmin();

    // Get course with full content (no enrollment check for admins)
    const course = await prisma.course.findUnique({
      where: { id: courseId },
      include: {
        category: true,
        modules: {
          orderBy: { order: "asc" },
          include: {
            contentItems: {
              orderBy: { order: "asc" },
              include: {
                video: true,
                quiz: {
                  include: {
                    questions: {
                      orderBy: { order: "asc" },
                    },
                  },
                },
                notes: {
                  where: { type: "ADMIN" },
                },
              },
            },
          },
        },
      },
    });

    if (!course) {
      return {
        success: false,
        error: "Cours introuvable",
      };
    }

    // Add computed title field to content items based on their type
    const courseWithTitles = {
      ...course,
      modules: course.modules.map((module) => ({
        ...module,
        contentItems: module.contentItems.map((item) => ({
          ...item,
          title:
            item.contentType === "QUIZ" && item.quiz
              ? item.quiz.title
              : item.contentType === "VIDEO"
              ? `Vidéo ${item.order}`
              : item.contentType === "NOTE" && item.notes && item.notes.length > 0
              ? `Note ${item.order}`
              : item.contentType === "FLASHCARD"
              ? `Carte mémoire ${item.order}`
              : `Contenu ${item.order}`,
        })),
      })),
    };

    return {
      success: true,
      data: courseWithTitles,
    };
  } catch (error) {
    await logServerError({
      errorMessage: `Failed to get course content for admin preview: ${error instanceof Error ? error.message : "Unknown error"}`,
      stackTrace: error instanceof Error ? error.stack : undefined,
      severity: "MEDIUM",
    });

    return {
      success: false,
      error: "Erreur lors du chargement du contenu",
    };
  }
}

/**
 * Get all course categories
 */
export async function getCourseCategoriesAction() {
  try {
    const categories = await prisma.courseCategory.findMany({
      orderBy: { name: "asc" },
    });

    return categories;
  } catch (error) {
    await logServerError({
      errorMessage: `Failed to get course categories: ${error instanceof Error ? error.message : "Unknown error"}`,
      stackTrace: error instanceof Error ? error.stack : undefined,
      severity: "MEDIUM",
    });

    return [];
  }
}

/**
 * Update course features (admin only)
 */
export async function updateCourseFeaturesAction(
  courseId: string,
  features: Array<{ id: string; icon: string; text: string }>
): Promise<CourseActionResult> {
  try {
    await requireAdmin();

    await prisma.course.update({
      where: { id: courseId },
      data: { features },
    });

    revalidatePath(`/formations/${courseId}`);
    revalidatePath(`/tableau-de-bord/admin/courses/${courseId}`);

    return { success: true };
  } catch (error) {
    await logServerError({
      errorMessage: `Failed to update course features: ${error instanceof Error ? error.message : "Unknown error"}`,
      stackTrace: error instanceof Error ? error.stack : undefined,
      severity: "HIGH",
    });

    return {
      success: false,
      error: "Erreur lors de la mise à jour des fonctionnalités",
    };
  }
}

/**
 * Update course testimonials (admin only)
 */
export async function updateCourseTestimonialsAction(
  courseId: string,
  testimonials: Array<{ id: string; name: string; role: string; text: string; avatar?: string }>
): Promise<CourseActionResult> {
  try {
    await requireAdmin();

    await prisma.course.update({
      where: { id: courseId },
      data: { testimonials },
    });

    revalidatePath(`/formations/${courseId}`);
    revalidatePath(`/tableau-de-bord/admin/courses/${courseId}`);

    return { success: true };
  } catch (error) {
    await logServerError({
      errorMessage: `Failed to update course testimonials: ${error instanceof Error ? error.message : "Unknown error"}`,
      stackTrace: error instanceof Error ? error.stack : undefined,
      severity: "HIGH",
    });

    return {
      success: false,
      error: "Erreur lors de la mise à jour des témoignages",
    };
  }
}

/**
 * Update course about section (admin only)
 */
export async function updateCourseAboutAction(
  courseId: string,
  data: { shortDescription: string; aboutText: string }
): Promise<CourseActionResult> {
  try {
    await requireAdmin();

    await prisma.course.update({
      where: { id: courseId },
      data: {
        shortDescription: data.shortDescription,
        aboutText: data.aboutText,
      },
    });

    revalidatePath(`/formations/${courseId}`);
    revalidatePath(`/tableau-de-bord/admin/courses/${courseId}`);

    return { success: true };
  } catch (error) {
    await logServerError({
      errorMessage: `Failed to update course about: ${error instanceof Error ? error.message : "Unknown error"}`,
      stackTrace: error instanceof Error ? error.stack : undefined,
      severity: "HIGH",
    });

    return {
      success: false,
      error: "Erreur lors de la mise à jour de la section À propos",
    };
  }
}

/**
 * Clone a full course including all modules, content, questions, flashcards, etc. (admin only)
 * @param sourceCourseId - ID of the course to clone
 * @param options - Optional overrides for the cloned course (title, code, etc.)
 */
export async function cloneCourseAction(
  sourceCourseId: string,
  options?: {
    title?: string;
    code?: string;
    categoryId?: string;
    published?: boolean;
  }
): Promise<CourseActionResult> {
  try {
    const admin = await requireAdmin();

    // Fetch the source course with all related data
    const sourceCourse = await prisma.course.findUnique({
      where: { id: sourceCourseId },
      include: {
        category: true,
        modules: {
          orderBy: { order: "asc" },
          include: {
            contentItems: {
              orderBy: { order: "asc" },
              include: {
                video: true,
                quiz: {
                  include: {
                    questions: {
                      orderBy: { order: "asc" },
                    },
                  },
                },
                notes: {
                  where: { type: "ADMIN" },
                },
                learningActivity: true,
              },
            },
            flashcards: true,
            learningActivities: true,
            questionBanks: {
              include: {
                questions: {
                  orderBy: { order: "asc" },
                },
              },
            },
          },
        },
        flashcards: {
          where: { moduleId: null }, // Course-level flashcards
        },
        questionBanks: {
          where: { moduleId: null }, // Course-level question banks
          include: {
            questions: {
              orderBy: { order: "asc" },
            },
          },
        },
        caseStudies: {
          include: {
            questions: {
              orderBy: { order: "asc" },
            },
          },
        },
        faqs: {
          orderBy: { order: "asc" },
        },
        availabilityRules: true,
        availabilityExceptions: true,
      },
    });

    if (!sourceCourse) {
      return {
        success: false,
        error: "Cours source introuvable",
      };
    }

    // Use a transaction to ensure all-or-nothing cloning
    // Increase timeout for large courses (60 seconds)
    const clonedCourse = await prisma.$transaction(
      async (tx) => {
      // Prepare new course data
      const newCode = options?.code || (sourceCourse.code ? `${sourceCourse.code}-copy` : null);
      const newTitle = options?.title || `${sourceCourse.title} (Copie)`;
      const newCategoryId = options?.categoryId || sourceCourse.categoryId;
      const newPublished = options?.published !== undefined ? options.published : false;

      // Generate unique slug
      let newSlug: string | null = null;
      if (newCode) {
        const baseSlug = generateSlug(newCode);
        const existingSlugs = await tx.course.findMany({
          where: { slug: { not: null } },
          select: { slug: true },
        }).then(courses => courses.map(c => c.slug).filter(Boolean) as string[]);
        newSlug = generateUniqueSlug(baseSlug, existingSlugs);
      }

      // Create the cloned course
      const clonedCourse = await tx.course.create({
        data: {
          code: newCode,
          slug: newSlug,
          title: newTitle,
          shortDescription: sourceCourse.shortDescription,
          description: sourceCourse.description,
          aboutText: sourceCourse.aboutText,
          features: sourceCourse.features as any,
          testimonials: sourceCourse.testimonials as any,
          heroImages: sourceCourse.heroImages as any,
          price: sourceCourse.price,
          accessDuration: sourceCourse.accessDuration,
          paymentType: sourceCourse.paymentType,
          subscriptionId: null, // Don't clone subscription ID
          published: newPublished,
          displayOrder: sourceCourse.displayOrder,
          categoryId: newCategoryId,
          componentVisibility: sourceCourse.componentVisibility as any,
          appointmentHourlyRate: sourceCourse.appointmentHourlyRate,
          recommendedStudyHoursMin: sourceCourse.recommendedStudyHoursMin,
          recommendedStudyHoursMax: sourceCourse.recommendedStudyHoursMax,
          orientationVideoUrl: sourceCourse.orientationVideoUrl,
          orientationText: sourceCourse.orientationText,
          launchDate: sourceCourse.launchDate,
        },
      });

      // ID mapping dictionaries
      const moduleIdMap: Record<string, string> = {};
      const contentItemIdMap: Record<string, string> = {};
      const quizIdMap: Record<string, string> = {};
      const learningActivityIdMap: Record<string, string> = {};
      const questionBankIdMap: Record<string, string> = {};
      const caseStudyIdMap: Record<string, string> = {};

      // Clone modules
      for (const sourceModule of sourceCourse.modules) {
        const clonedModule = await tx.module.create({
          data: {
            courseId: clonedCourse.id,
            order: sourceModule.order,
            title: sourceModule.title,
            shortTitle: sourceModule.shortTitle,
            description: sourceModule.description,
            examWeight: sourceModule.examWeight,
          },
        });
        moduleIdMap[sourceModule.id] = clonedModule.id;

        // Clone content items for this module
        for (const sourceContentItem of sourceModule.contentItems) {
          const clonedContentItem = await tx.contentItem.create({
            data: {
              moduleId: clonedModule.id,
              order: sourceContentItem.order,
              contentType: sourceContentItem.contentType,
              studyPhase: sourceContentItem.studyPhase,
            },
          });
          contentItemIdMap[sourceContentItem.id] = clonedContentItem.id;

          // Clone video if exists
          if (sourceContentItem.video) {
            await tx.video.create({
              data: {
                contentItemId: clonedContentItem.id,
                vimeoUrl: sourceContentItem.video.vimeoUrl,
                duration: sourceContentItem.video.duration,
                transcript: sourceContentItem.video.transcript,
              },
            });
          }

          // Clone quiz if exists
          if (sourceContentItem.quiz) {
            const clonedQuiz = await tx.quiz.create({
              data: {
                contentItemId: clonedContentItem.id,
                courseId: clonedCourse.id,
                title: sourceContentItem.quiz.title,
                passingScore: sourceContentItem.quiz.passingScore,
                timeLimit: sourceContentItem.quiz.timeLimit,
                isMockExam: sourceContentItem.quiz.isMockExam,
                examFormat: sourceContentItem.quiz.examFormat,
              },
            });
            quizIdMap[sourceContentItem.quiz.id] = clonedQuiz.id;

            // Clone quiz questions (batch operation)
            if (sourceContentItem.quiz.questions.length > 0) {
              await tx.quizQuestion.createMany({
                data: sourceContentItem.quiz.questions.map((sourceQuestion) => ({
                  quizId: clonedQuiz.id,
                  order: sourceQuestion.order,
                  type: sourceQuestion.type,
                  question: sourceQuestion.question,
                  options: sourceQuestion.options as any,
                  correctAnswer: sourceQuestion.correctAnswer,
                  explanation: sourceQuestion.explanation,
                })),
              });
            }
          }

          // Clone admin notes if exist (batch operation)
          if (sourceContentItem.notes && sourceContentItem.notes.length > 0) {
            await tx.note.createMany({
              data: sourceContentItem.notes.map((sourceNote) => ({
                contentItemId: clonedContentItem.id,
                courseId: clonedCourse.id,
                type: sourceNote.type,
                content: sourceNote.content,
              })),
            });
          }

          // Clone learning activity if exists
          if (sourceContentItem.learningActivity) {
            const clonedActivity = await tx.learningActivity.create({
              data: {
                contentItemId: clonedContentItem.id,
                courseId: clonedCourse.id,
                moduleId: clonedModule.id,
                activityType: sourceContentItem.learningActivity.activityType,
                title: sourceContentItem.learningActivity.title,
                instructions: sourceContentItem.learningActivity.instructions,
                content: sourceContentItem.learningActivity.content as any,
                correctAnswers: sourceContentItem.learningActivity.correctAnswers as any,
                tolerance: sourceContentItem.learningActivity.tolerance,
              },
            });
            learningActivityIdMap[sourceContentItem.learningActivity.id] = clonedActivity.id;
          }
        }

        // Clone module-level flashcards (batch operation)
        if (sourceModule.flashcards.length > 0) {
          await tx.flashcard.createMany({
            data: sourceModule.flashcards.map((sourceFlashcard) => ({
              courseId: clonedCourse.id,
              moduleId: clonedModule.id,
              front: sourceFlashcard.front,
              back: sourceFlashcard.back,
            })),
          });
        }

        // Note: Learning activities are already cloned as part of content items above
        // The module.learningActivities relation is just for querying convenience

        // Clone module-level question banks
        for (const sourceQuestionBank of sourceModule.questionBanks) {
          const clonedQuestionBank = await tx.questionBank.create({
            data: {
              courseId: clonedCourse.id,
              moduleId: clonedModule.id,
              title: sourceQuestionBank.title,
              description: sourceQuestionBank.description,
            },
          });
          questionBankIdMap[sourceQuestionBank.id] = clonedQuestionBank.id;

          // Clone question bank questions (batch operation)
          if (sourceQuestionBank.questions.length > 0) {
            await tx.questionBankQuestion.createMany({
              data: sourceQuestionBank.questions.map((sourceQuestion) => ({
                questionBankId: clonedQuestionBank.id,
                order: sourceQuestion.order,
                question: sourceQuestion.question,
                options: sourceQuestion.options as any,
                correctAnswer: sourceQuestion.correctAnswer,
                explanation: sourceQuestion.explanation,
              })),
            });
          }
        }
      }

      // Clone course-level flashcards (batch operation)
      if (sourceCourse.flashcards.length > 0) {
        await tx.flashcard.createMany({
          data: sourceCourse.flashcards.map((sourceFlashcard) => ({
            courseId: clonedCourse.id,
            moduleId: null,
            front: sourceFlashcard.front,
            back: sourceFlashcard.back,
          })),
        });
      }

      // Clone course-level question banks
      for (const sourceQuestionBank of sourceCourse.questionBanks) {
        const clonedQuestionBank = await tx.questionBank.create({
          data: {
            courseId: clonedCourse.id,
            moduleId: null,
            title: sourceQuestionBank.title,
            description: sourceQuestionBank.description,
          },
        });
        questionBankIdMap[sourceQuestionBank.id] = clonedQuestionBank.id;

        // Clone question bank questions (batch operation)
        if (sourceQuestionBank.questions.length > 0) {
          await tx.questionBankQuestion.createMany({
            data: sourceQuestionBank.questions.map((sourceQuestion) => ({
              questionBankId: clonedQuestionBank.id,
              order: sourceQuestion.order,
              question: sourceQuestion.question,
              options: sourceQuestion.options as any,
              correctAnswer: sourceQuestion.correctAnswer,
              explanation: sourceQuestion.explanation,
            })),
          });
        }
      }

      // Clone case studies
      for (const sourceCaseStudy of sourceCourse.caseStudies) {
        const clonedCaseStudy = await tx.caseStudy.create({
          data: {
            courseId: clonedCourse.id,
            caseId: `${sourceCaseStudy.caseId}-copy-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`, // Generate unique caseId
            caseNumber: sourceCaseStudy.caseNumber,
            title: sourceCaseStudy.title,
            theme: sourceCaseStudy.theme,
            narrative: sourceCaseStudy.narrative as any,
            chapters: sourceCaseStudy.chapters as any,
            passingScore: sourceCaseStudy.passingScore,
          },
        });
        caseStudyIdMap[sourceCaseStudy.id] = clonedCaseStudy.id;

        // Clone case study questions (batch operation)
        if (sourceCaseStudy.questions.length > 0) {
          await tx.caseStudyQuestion.createMany({
            data: sourceCaseStudy.questions.map((sourceQuestion) => ({
              caseStudyId: clonedCaseStudy.id,
              questionId: sourceQuestion.questionId,
              order: sourceQuestion.order,
              question: sourceQuestion.question,
              options: sourceQuestion.options as any,
              correctAnswer: sourceQuestion.correctAnswer,
              explanation: sourceQuestion.explanation,
              questionType: sourceQuestion.questionType,
              difficulty: sourceQuestion.difficulty,
              chapterReference: sourceQuestion.chapterReference as any,
              caseReference: sourceQuestion.caseReference,
              calculationSteps: sourceQuestion.calculationSteps as any,
            })),
          });
        }
      }

      // Clone FAQs (batch operation)
      if (sourceCourse.faqs.length > 0) {
        await tx.courseFAQ.createMany({
          data: sourceCourse.faqs.map((sourceFAQ) => ({
            courseId: clonedCourse.id,
            question: sourceFAQ.question,
            answer: sourceFAQ.answer,
            order: sourceFAQ.order,
          })),
        });
      }

      // Clone availability rules (batch operation)
      if (sourceCourse.availabilityRules.length > 0) {
        await tx.availabilityRule.createMany({
          data: sourceCourse.availabilityRules.map((sourceRule) => ({
            courseId: clonedCourse.id,
            weekday: sourceRule.weekday,
            startTime: sourceRule.startTime,
            endTime: sourceRule.endTime,
          })),
        });
      }

      // Clone availability exceptions (batch operation)
      if (sourceCourse.availabilityExceptions.length > 0) {
        await tx.availabilityException.createMany({
          data: sourceCourse.availabilityExceptions.map((sourceException) => ({
            courseId: clonedCourse.id,
            startDate: sourceException.startDate,
            endDate: sourceException.endDate,
            isUnavailable: sourceException.isUnavailable,
          })),
        });
      }

      return clonedCourse;
    },
    {
      maxWait: 60000, // 60 seconds to acquire transaction
      timeout: 300000, // 300 seconds (5 minutes) for the transaction to complete (enough for very large courses)
      isolationLevel: 'ReadCommitted', // Use read committed isolation level for better performance
    }
    );

    // Revalidate paths
    revalidatePath("/tableau-de-bord/admin");
    revalidatePath("/formations");

    return {
      success: true,
      data: {
        ...clonedCourse,
        price: clonedCourse.price.toNumber(),
        appointmentHourlyRate: clonedCourse.appointmentHourlyRate?.toNumber() ?? null,
      },
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    const errorStack = error instanceof Error ? error.stack : undefined;

    await logServerError({
      errorMessage: `Failed to clone course: ${errorMessage}`,
      stackTrace: errorStack,
      userId: (await requireAdmin()).id,
      severity: "HIGH",
    });

    return {
      success: false,
      error: `Erreur lors du clonage du cours: ${errorMessage}`,
    };
  }
}

