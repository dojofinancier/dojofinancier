"use client";

import { useState, useEffect, lazy, Suspense } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Skeleton } from "@/components/ui/skeleton";
import { CohortSidebar } from "./cohort-sidebar";
import { GroupCoachingSessions } from "./group-coaching-sessions";
import { CohortMessageBoard } from "./cohort-message-board";
import { ModuleDetailPage } from "@/components/course/module-detail-page";
import { Syllabus } from "@/components/course/syllabus";
import { LearningTools } from "@/components/course/learning-tools";
import { VideosTool } from "@/components/course/tools/videos-tool";
import { NotesTool } from "@/components/course/tools/notes-tool";
import { QuizzesTool } from "@/components/course/tools/quizzes-tool";
import { FlashcardsTool } from "@/components/course/tools/flashcards-tool";
import { ActivitiesTool } from "@/components/course/tools/activities-tool";
import { ExamsTool } from "@/components/course/tools/exams-tool";
import { QuestionBankTool } from "@/components/course/tools/question-bank-tool";
import { ExamPlayer } from "@/components/course/exam-player";
import { StudentAnalyticsDashboard } from "@/components/course/student-analytics-dashboard";
import { AskQuestionPage } from "@/components/course/ask-question-page";
import type { Prisma } from "@prisma/client";

// Lazy load phase components
const Phase1Learn = lazy(() => import("@/components/course/phase1-learn").then(m => ({ default: m.Phase1Learn })));
const Phase2Review = lazy(() => import("@/components/course/phase2-review").then(m => ({ default: m.Phase2Review })));
const Phase3Practice = lazy(() => import("@/components/course/phase3-practice").then(m => ({ default: m.Phase3Practice })));

// Skeleton loader for phase components
const PhaseSkeleton = () => (
  <div className="space-y-4">
    <Skeleton className="h-8 w-64" />
    <Skeleton className="h-32 w-full" />
    <Skeleton className="h-32 w-full" />
    <Skeleton className="h-32 w-full" />
  </div>
);

type Cohort = {
  id: string;
  title: string;
  description: string | null;
  courseId?: string | null;
  // Prisma JSON fields can be typed broadly; normalize at runtime.
  componentVisibility?: Prisma.JsonValue | {
    videos?: boolean;
    quizzes?: boolean;
    flashcards?: boolean;
    notes?: boolean;
    messaging?: boolean;
    appointments?: boolean;
    groupCoaching?: boolean;
    messageBoard?: boolean;
    virtualTutor?: boolean;
  } | null;
  recommendedStudyHoursMin?: number | null;
  recommendedStudyHoursMax?: number | null;
  modules: Array<{
    id: string;
    title: string;
    shortTitle?: string | null;
    description: string | null;
    order: number;
    contentItems?: Array<{
      id: string;
      title: string;
      contentType: string;
      order: number;
    }>;
  }>;
};

type NavigationItem = 
  | "coaching" 
  | "messages"
  | "learn" 
  | "review" 
  | "practice" 
  | "syllabus" 
  | "tools" 
  | "progress"
  | "question"
  | `module-${string}`;

interface CohortLearningInterfaceProps {
  cohort: Cohort;
  initialContentItemId?: string;
  currentUserId?: string;
  currentUserRole?: string;
  initialSettings?: any; // Course settings for phase-based learning
}

type CohortComponentVisibility = {
  videos?: boolean;
  quizzes?: boolean;
  flashcards?: boolean;
  notes?: boolean;
  messaging?: boolean;
  appointments?: boolean;
  groupCoaching?: boolean;
  messageBoard?: boolean;
  virtualTutor?: boolean;
};

const DEFAULT_COHORT_VISIBILITY: Required<CohortComponentVisibility> = {
  videos: true,
  quizzes: true,
  flashcards: true,
  notes: true,
  messaging: true,
  appointments: true,
  groupCoaching: true,
  messageBoard: true,
  virtualTutor: false,
};

function normalizeCohortVisibility(value: Prisma.JsonValue | CohortComponentVisibility | null | undefined): CohortComponentVisibility {
  const merge = (obj: unknown) => {
    if (!obj || typeof obj !== "object" || Array.isArray(obj)) return { ...DEFAULT_COHORT_VISIBILITY };
    const maybe = obj as Record<string, unknown>;
    return {
      ...DEFAULT_COHORT_VISIBILITY,
      videos: typeof maybe.videos === "boolean" ? maybe.videos : DEFAULT_COHORT_VISIBILITY.videos,
      quizzes: typeof maybe.quizzes === "boolean" ? maybe.quizzes : DEFAULT_COHORT_VISIBILITY.quizzes,
      flashcards: typeof maybe.flashcards === "boolean" ? maybe.flashcards : DEFAULT_COHORT_VISIBILITY.flashcards,
      notes: typeof maybe.notes === "boolean" ? maybe.notes : DEFAULT_COHORT_VISIBILITY.notes,
      messaging: typeof maybe.messaging === "boolean" ? maybe.messaging : DEFAULT_COHORT_VISIBILITY.messaging,
      appointments: typeof maybe.appointments === "boolean" ? maybe.appointments : DEFAULT_COHORT_VISIBILITY.appointments,
      groupCoaching: typeof maybe.groupCoaching === "boolean" ? maybe.groupCoaching : DEFAULT_COHORT_VISIBILITY.groupCoaching,
      messageBoard: typeof maybe.messageBoard === "boolean" ? maybe.messageBoard : DEFAULT_COHORT_VISIBILITY.messageBoard,
      virtualTutor: typeof maybe.virtualTutor === "boolean" ? maybe.virtualTutor : DEFAULT_COHORT_VISIBILITY.virtualTutor,
    };
  };

  if (typeof value === "string") {
    try {
      return merge(JSON.parse(value));
    } catch {
      return { ...DEFAULT_COHORT_VISIBILITY };
    }
  }

  return merge(value);
}

export function CohortLearningInterface({
  cohort,
  initialContentItemId,
  currentUserId,
  currentUserRole,
  initialSettings,
}: CohortLearningInterfaceProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  
  // Default to coaching sessions (home page)
  const [activeItem, setActiveItem] = useState<NavigationItem>("coaching");
  const [selectedModuleId, setSelectedModuleId] = useState<string | null>(null);
  const [selectedTool, setSelectedTool] = useState<string | null>(null);
  const [selectedExamId, setSelectedExamId] = useState<string | null>(null);

  // Check URL params for navigation
  useEffect(() => {
    const tabParam = searchParams.get("tab");
    if (tabParam === "sessions" || tabParam === "coaching") {
      setActiveItem("coaching");
    } else if (tabParam === "messages") {
      setActiveItem("messages");
    } else if (tabParam === "content" || tabParam === "learn") {
      setActiveItem("learn");
    } else if (tabParam?.startsWith("module-")) {
      const moduleId = tabParam.replace("module-", "");
      setActiveItem(`module-${moduleId}` as NavigationItem);
      setSelectedModuleId(moduleId);
    } else if (tabParam && ["review", "practice", "syllabus", "tools", "progress", "question"].includes(tabParam)) {
      setActiveItem(tabParam as NavigationItem);
    }
    // If no tab param, default stays as "coaching" (home)
  }, [searchParams]);

  // Get visibility settings (default to all visible if not set)
  const visibility = normalizeCohortVisibility(cohort.componentVisibility);

  // Transform cohort to course format
  const courseData = {
    id: cohort.id,
    title: cohort.title,
    recommendedStudyHoursMin: cohort.recommendedStudyHoursMin,
    recommendedStudyHoursMax: cohort.recommendedStudyHoursMax,
    modules: cohort.modules,
  };

  const handleNavigate = (item: NavigationItem) => {
    setActiveItem(item);
    
    // Update URL
    const params = new URLSearchParams();
    if (item === "coaching") {
      params.set("tab", "sessions");
    } else if (item === "messages") {
      params.set("tab", "messages");
    } else if (item === "learn") {
      params.set("tab", "learn");
    } else if (item.startsWith("module-")) {
      const moduleId = item.replace("module-", "");
      params.set("tab", `module-${moduleId}`);
      setSelectedModuleId(moduleId);
    } else {
      params.set("tab", item);
    }
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  };

  const handleModuleBack = () => {
    setSelectedModuleId(null);
    setActiveItem("learn");
    const params = new URLSearchParams();
    params.set("tab", "learn");
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  };

  const handleToolSelect = (tool: string) => {
    setSelectedTool(tool);
  };

  const handleToolBack = () => {
    setSelectedTool(null);
  };

  const handleStartExam = (examId: string) => {
    setSelectedExamId(examId);
  };

  const handleExamExit = () => {
    setSelectedExamId(null);
  };

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Cohort Sidebar */}
      <CohortSidebar
        cohort={{
          id: cohort.id,
          title: cohort.title,
          recommendedStudyHoursMin: cohort.recommendedStudyHoursMin,
          recommendedStudyHoursMax: cohort.recommendedStudyHoursMax,
          modules: cohort.modules,
          componentVisibility: visibility,
        }}
        activeItem={activeItem}
        onNavigate={handleNavigate}
      />

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        <div className="container mx-auto px-4 py-6 max-w-6xl">
          {/* Coaching Sessions (Home/Default) */}
          {activeItem === "coaching" && visibility.groupCoaching && (
            <div className="h-full">
              <GroupCoachingSessions cohortId={cohort.id} />
            </div>
          )}

          {/* Message Board */}
          {activeItem === "messages" && visibility.messageBoard && (
            <div className="h-full">
              <CohortMessageBoard
                cohortId={cohort.id}
                currentUserId={currentUserId}
                currentUserRole={currentUserRole}
              />
            </div>
          )}

          {/* Module Detail (when a specific module is selected) */}
          {(activeItem.startsWith("module-") || (activeItem === "learn" && selectedModuleId)) && selectedModuleId && (
            <ModuleDetailPage
              courseId={cohort.id}
              moduleId={selectedModuleId}
              onBack={handleModuleBack}
            />
          )}

          {/* Phase 1 - Apprendre (when no specific module is selected) */}
          {activeItem === "learn" && !selectedModuleId && (
            <div>
              <h1 className="text-2xl font-bold mb-6">Phase 1 - Apprendre</h1>
              <Suspense fallback={<PhaseSkeleton />}>
                <Phase1Learn
                  courseId={cohort.id}
                  course={courseData}
                  settings={initialSettings}
                  onModuleSelect={(moduleId) => {
                    setSelectedModuleId(moduleId);
                    setActiveItem(`module-${moduleId}` as NavigationItem);
                    const params = new URLSearchParams();
                    params.set("tab", `module-${moduleId}`);
                    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
                  }}
                />
              </Suspense>
            </div>
          )}

          {/* Phase 2 - Réviser */}
          {activeItem === "review" && (
            <div>
              <h1 className="text-2xl font-bold mb-6">Phase 2 - Réviser</h1>
              <Suspense fallback={<PhaseSkeleton />}>
                <Phase2Review courseId={cohort.id} course={courseData} settings={initialSettings} />
              </Suspense>
            </div>
          )}

          {/* Phase 3 - Pratiquer */}
          {activeItem === "practice" && (
            <div>
              <h1 className="text-2xl font-bold mb-6">Phase 3 - Pratiquer</h1>
              <Suspense fallback={<PhaseSkeleton />}>
                <Phase3Practice courseId={cohort.id} course={courseData} settings={initialSettings} />
              </Suspense>
            </div>
          )}

          {/* Syllabus */}
          {activeItem === "syllabus" && (
            <div>
              <h1 className="text-2xl font-bold mb-6">Plan de cours</h1>
              <Suspense fallback={<PhaseSkeleton />}>
                <Syllabus courseId={cohort.id} />
              </Suspense>
            </div>
          )}

          {/* Tools */}
          {activeItem === "tools" && (
            <div>
              {selectedExamId ? (
                <ExamPlayer examId={selectedExamId} onExit={handleExamExit} />
              ) : selectedTool ? (
                <>
                  {selectedTool === "videos" && (
                    <VideosTool courseId={cohort.id} onBack={handleToolBack} />
                  )}
                  {selectedTool === "notes" && (
                    <NotesTool courseId={cohort.id} onBack={handleToolBack} />
                  )}
                  {selectedTool === "quizzes" && (
                    <QuizzesTool courseId={cohort.id} onBack={handleToolBack} />
                  )}
                  {selectedTool === "flashcards" && (
                    <FlashcardsTool courseId={cohort.id} onBack={handleToolBack} />
                  )}
                  {selectedTool === "activities" && (
                    <ActivitiesTool courseId={cohort.id} onBack={handleToolBack} />
                  )}
                  {selectedTool === "exams" && (
                    <ExamsTool
                      courseId={cohort.id}
                      onBack={handleToolBack}
                      onStartExam={handleStartExam}
                    />
                  )}
                  {selectedTool === "question-bank" && (
                    <QuestionBankTool courseId={cohort.id} onBack={handleToolBack} />
                  )}
                </>
              ) : (
                <>
                  <h1 className="text-2xl font-bold mb-6">Outils d'apprentissage</h1>
                  <LearningTools courseId={cohort.id} onToolSelect={handleToolSelect} />
                </>
              )}
            </div>
          )}

          {/* Progress */}
          {activeItem === "progress" && (
            <div>
              <h1 className="text-2xl font-bold mb-6">Progrès et statistiques</h1>
              <StudentAnalyticsDashboard courseId={cohort.id} />
            </div>
          )}

          {/* Ask Question */}
          {activeItem === "question" && (
            <div>
              <AskQuestionPage courseId={cohort.id} courseTitle={cohort.title} />
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

