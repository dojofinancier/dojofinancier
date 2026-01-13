/**
 * Query Key Factory
 * 
 * Centralized query key management for React Query.
 * Using consistent query keys enables:
 * - Predictable cache invalidation
 * - Better cache hit rates
 * - Easier debugging
 * 
 * Usage:
 * ```ts
 * useQuery({
 *   queryKey: queryKeys.courses.detail(courseId),
 *   queryFn: () => getCourseAction(courseId),
 * })
 * 
 * // Invalidate all courses
 * queryClient.invalidateQueries({ queryKey: queryKeys.courses.all })
 * 
 * // Invalidate specific course
 * queryClient.invalidateQueries({ queryKey: queryKeys.courses.detail(courseId) })
 * ```
 */

export const queryKeys = {
  // Courses
  courses: {
    all: ["courses"] as const,
    list: (filters?: { search?: string; category?: string }) => 
      ["courses", "list", filters] as const,
    detail: (id: string) => ["courses", "detail", id] as const,
    content: (id: string) => ["courses", "content", id] as const,
    modules: (courseId: string) => ["courses", courseId, "modules"] as const,
  },

  // Cohorts
  cohorts: {
    all: ["cohorts"] as const,
    list: (filters?: { search?: string }) => 
      ["cohorts", "list", filters] as const,
    detail: (id: string) => ["cohorts", "detail", id] as const,
  },

  // Enrollments
  enrollments: {
    all: ["enrollments"] as const,
    byUser: (userId: string) => ["enrollments", "user", userId] as const,
    byCourse: (courseId: string) => ["enrollments", "course", courseId] as const,
  },

  // Students
  students: {
    all: ["students"] as const,
    list: (filters?: { search?: string; suspended?: boolean }) => 
      ["students", "list", filters] as const,
    detail: (id: string) => ["students", "detail", id] as const,
    progress: (id: string) => ["students", id, "progress"] as const,
  },

  // Progress
  progress: {
    all: ["progress"] as const,
    byCourse: (userId: string, courseId: string) => 
      ["progress", userId, courseId] as const,
    byUser: (userId: string) => ["progress", "user", userId] as const,
  },

  // Quizzes
  quizzes: {
    all: ["quizzes"] as const,
    byCourse: (courseId: string) => ["quizzes", "course", courseId] as const,
    detail: (id: string) => ["quizzes", "detail", id] as const,
    attempts: (userId: string, quizId: string) => 
      ["quizzes", quizId, "attempts", userId] as const,
  },

  // Flashcards
  flashcards: {
    all: ["flashcards"] as const,
    byCourse: (courseId: string) => ["flashcards", "course", courseId] as const,
    byModule: (moduleId: string) => ["flashcards", "module", moduleId] as const,
    review: (userId: string, courseId: string) => 
      ["flashcards", "review", userId, courseId] as const,
  },

  // Learning Activities
  activities: {
    all: ["activities"] as const,
    byCourse: (courseId: string) => ["activities", "course", courseId] as const,
    byModule: (moduleId: string) => ["activities", "module", moduleId] as const,
  },

  // Exams
  exams: {
    all: ["exams"] as const,
    byCourse: (courseId: string) => ["exams", "course", courseId] as const,
    detail: (id: string) => ["exams", "detail", id] as const,
    attempts: (userId: string) => ["exams", "attempts", userId] as const,
  },

  // Case Studies
  caseStudies: {
    all: ["caseStudies"] as const,
    byCourse: (courseId: string) => ["caseStudies", "course", courseId] as const,
    detail: (id: string) => ["caseStudies", "detail", id] as const,
  },

  // Messages
  messages: {
    all: ["messages"] as const,
    threads: (userId: string) => ["messages", "threads", userId] as const,
    thread: (threadId: string) => ["messages", "thread", threadId] as const,
  },

  // Appointments
  appointments: {
    all: ["appointments"] as const,
    byUser: (userId: string) => ["appointments", "user", userId] as const,
    availability: (courseId: string) => ["appointments", "availability", courseId] as const,
  },

  // Analytics
  analytics: {
    all: ["analytics"] as const,
    dashboard: (courseId?: string) => ["analytics", "dashboard", courseId] as const,
    student: (userId: string, courseId?: string) => 
      ["analytics", "student", userId, courseId] as const,
  },

  // Support Tickets
  tickets: {
    all: ["tickets"] as const,
    list: (filters?: { status?: string; priority?: string }) => 
      ["tickets", "list", filters] as const,
    detail: (id: string) => ["tickets", "detail", id] as const,
  },

  // Orders & Payments
  orders: {
    all: ["orders"] as const,
    byUser: (userId: string) => ["orders", "user", userId] as const,
    detail: (id: string) => ["orders", "detail", id] as const,
  },

  // Study Plan
  studyPlan: {
    settings: (userId: string, courseId: string) => 
      ["studyPlan", "settings", userId, courseId] as const,
    daily: (userId: string, courseId: string, date?: string) => 
      ["studyPlan", "daily", userId, courseId, date] as const,
  },
} as const;

// Type helpers for extracting query key types
export type QueryKeys = typeof queryKeys;
