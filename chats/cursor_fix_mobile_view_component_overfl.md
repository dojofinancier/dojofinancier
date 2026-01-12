# Fix mobile view component overflow
_Exported on 12/4/2025 at 22:19:58 EST from Cursor (2.1.46)_

---

**User**

in mobile view, some of the plan d'étude component spills beyond the viewport <_c variant="ghost" className="w-full justify-between p-4 h-auto hover:bg-transparent" children="[Object]" type="button" aria-controls="radix-_r_26_" aria-expanded={false} data-state="closed" onClick="[Function]" ref={null}>0 / 1 complété</_c>
<div class="text-sm font-medium">0 / 1 complété</div> Please fix

---

**Cursor**


Searching for the "plan d'étude" component and the "0 / 1 complété" element to fix the mobile viewport overflow.



Reading the study plan component file:



Fixing the mobile viewport overflow. The button's flex layout is causing content to spill. Making it responsive:


```typescriptreact
"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Calendar, BookOpen, Brain, Target, ChevronDown, ChevronRight } from "lucide-react";
import { getWeeklyStudyPlanAction } from "@/app/actions/study-plan";
import { TaskType, PlanEntryStatus } from "@prisma/client";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface StudyPlanProps {
  courseId: string;
  refreshKey?: number; // Add refresh key to force reload
}

interface WeekData {
  weekNumber: number;
  weekStart: Date;
  weekEnd: Date;
  entries: any[];
}

export function StudyPlan({ courseId, refreshKey }: StudyPlanProps) {
  const [weeks, setWeeks] = useState<WeekData[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedWeeks, setExpandedWeeks] = useState<Set<number>>(new Set([1])); // Expand first week by default
  const [week1StartDate, setWeek1StartDate] = useState<Date | null>(null);
  const [examDate, setExamDate] = useState<Date | null>(null);

  useEffect(() => {
    loadStudyPlan();
  }, [courseId, refreshKey]); // Reload when refreshKey changes

  const loadStudyPlan = async () => {
    try {
      const result = await getWeeklyStudyPlanAction(courseId);
      if (result.success && result.data) {
        setWeeks(result.data);
        setWeek1StartDate(result.week1StartDate ? new Date(result.week1StartDate) : null);
        setExamDate(result.examDate ? new Date(result.examDate) : null);
        
        // Expand current week
        const today = new Date();
        const currentWeek = result.data.find((week: WeekData) => {
          const start = new Date(week.weekStart);
          const end = new Date(week.weekEnd);
          return today >= start && today <= end;
        });
        if (currentWeek) {
          setExpandedWeeks(new Set([currentWeek.weekNumber]));
        }
      }
    } catch (error) {
      console.error("Error loading study plan:", error);
    } finally {
      setLoading(false);
    }
  };

  const toggleWeek = (weekNumber: number) => {
    setExpandedWeeks((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(weekNumber)) {
        newSet.delete(weekNumber);
      } else {
        newSet.add(weekNumber);
      }
      return newSet;
    });
  };

  const getTaskIcon = (taskType: TaskType) => {
    switch (taskType) {
      case TaskType.LEARN:
        return <BookOpen className="h-4 w-4" />;
      case TaskType.REVIEW:
        return <Brain className="h-4 w-4" />;
      case TaskType.PRACTICE:
        return <Target className="h-4 w-4" />;
      default:
        return null;
    }
  };

  const getTaskLabel = (taskType: TaskType, entry: any) => {
    switch (taskType) {
      case TaskType.LEARN:
        return entry.module ? `Apprendre - ${entry.module.title}` : "Apprendre - Nouveau module";
      case TaskType.REVIEW:
        return entry.module ? `Réviser - ${entry.module.title}` : "Révision";
      case TaskType.PRACTICE:
        return entry.targetQuizId ? "Examen simulé" : "Pratique - Questions";
      default:
        return "Tâche";
    }
  };

  const getStatusBadge = (status: PlanEntryStatus) => {
    switch (status) {
      case PlanEntryStatus.COMPLETED:
        return <Badge variant="default" className="bg-green-500 text-xs">Complété</Badge>;
      case PlanEntryStatus.IN_PROGRESS:
        return <Badge variant="default" className="bg-blue-500 text-xs">En cours</Badge>;
      case PlanEntryStatus.PENDING:
        return <Badge variant="outline" className="text-xs">En attente</Badge>;
      case PlanEntryStatus.SKIPPED:
        return <Badge variant="secondary" className="text-xs">Ignoré</Badge>;
      default:
        return null;
    }
  };

  // Group entries by task type and module for cleaner display
  // For LEARN tasks, group by module (one entry per module per week)
  const groupEntriesByType = (entries: any[]) => {
    const grouped: Record<TaskType, any[]> = {
      LEARN: [],
      REVIEW: [],
      PRACTICE: [],
      ORIENTATION: [],
    };

    // For LEARN tasks, group by module (show one per module)
    const learnByModule = new Map<string, any>();
    
    entries.forEach((entry) => {
      if (entry.taskType === TaskType.LEARN && entry.targetModuleId) {
        // Group LEARN tasks by module - keep the first one and aggregate blocks
        if (!learnByModule.has(entry.targetModuleId)) {
          learnByModule.set(entry.targetModuleId, {
            ...entry,
            // Sum up estimated blocks from all entries for this module
            estimatedBlocks: 0,
          });
        }
        const moduleEntry = learnByModule.get(entry.targetModuleId)!;
        moduleEntry.estimatedBlocks += entry.estimatedBlocks || 1;
      } else {
        // For other task types, add directly
        grouped[entry.taskType].push(entry);
      }
    });

    // Add grouped LEARN entries
    grouped.LEARN = Array.from(learnByModule.values());

    return grouped;
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Plan d'étude</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Chargement...</p>
        </CardContent>
      </Card>
    );
  }

  if (weeks.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Plan d'étude
          </CardTitle>
          <CardDescription>Aucun plan d'étude disponible</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Plan d'étude
          </CardTitle>
          <CardDescription>
            {week1StartDate && examDate && (
              <>
                Du {format(week1StartDate, "d MMMM yyyy", { locale: fr })} au{" "}
                {format(examDate, "d MMMM yyyy", { locale: fr })}
              </>
            )}
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {weeks.map((week) => {
            const weekStart = new Date(week.weekStart);
            const weekEnd = new Date(week.weekEnd);
            weekStart.setHours(0, 0, 0, 0);
            weekEnd.setHours(0, 0, 0, 0);
            
            const isCurrentWeek = today >= weekStart && today <= weekEnd;
            const isPast = weekEnd < today;
            const isExpanded = expandedWeeks.has(week.weekNumber);

            const groupedEntries = groupEntriesByType(week.entries);
            const totalEntries = week.entries.length;
            const completedEntries = week.entries.filter(
              (e) => e.status === PlanEntryStatus.COMPLETED
            ).length;
            const completionPercentage = totalEntries > 0 
              ? Math.round((completedEntries / totalEntries) * 100) 
              : 0;

            return (
              <Collapsible
                key={week.weekNumber}
                open={isExpanded}
                onOpenChange={() => toggleWeek(week.weekNumber)}
              >
                <div
                  className={`border rounded-lg ${
                    isCurrentWeek ? "bg-primary/5 border-primary" : ""
                  } ${isPast ? "opacity-75" : ""}`}
                >
                  <CollapsibleTrigger asChild>
                    <Button
                      variant="ghost"
                      className="w-full justify-between p-4 h-auto hover:bg-transparent"
                    >
                      <div className="flex items-center gap-2 sm:gap-3 flex-1 text-left min-w-0">
                        <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
                          {isExpanded ? (
                            <ChevronDown className="h-4 w-4" />
                          ) : (
                            <ChevronRight className="h-4 w-4" />
                          )}
                          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary text-sm sm:text-base">
                            {week.weekNumber}
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1 sm:gap-2 flex-wrap">
                            <h3 className="font-semibold text-base sm:text-lg truncate">
                              Semaine {week.weekNumber}
                            </h3>
                            {isCurrentWeek && (
                              <Badge variant="secondary" className="text-xs flex-shrink-0">
                                Cette semaine
                              </Badge>
                            )}
                            {week.weekNumber === weeks.length && (
                              <Badge variant="outline" className="text-xs flex-shrink-0">
                                Semaine d'examen
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs sm:text-sm text-muted-foreground truncate">
                            {format(weekStart, "d MMM", { locale: fr })} -{" "}
                            {format(weekEnd, "d MMM yyyy", { locale: fr })}
                          </p>
                        </div>
                        <div className="text-right flex-shrink-0 ml-2">
                          <div className="text-xs sm:text-sm font-medium whitespace-nowrap">
                            {completedEntries} / {totalEntries} complété
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {completionPercentage}%
                          </div>
                        </div>
                      </div>
                    </Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="px-4 pb-4 space-y-4">
                      {/* Learn Tasks */}
                      {groupedEntries.LEARN.length > 0 && (
                        <div>
                          <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                            <BookOpen className="h-4 w-4" />
                            Phase 1 - Apprendre ({groupedEntries.LEARN.length} tâche
                            {groupedEntries.LEARN.length > 1 ? "s" : ""})
                          </h4>
                          <div className="space-y-2 ml-6">
                            {groupedEntries.LEARN.map((entry) => (
                              <div
                                key={entry.id}
                                className="flex items-center justify-between p-2 border rounded bg-background"
                              >
                                <div className="flex items-center gap-2 flex-1">
                                  <div className="text-muted-foreground">
                                    {getTaskIcon(entry.taskType)}
                                  </div>
                                  <div className="flex-1">
                                    <div className="text-sm font-medium">
                                      {getTaskLabel(entry.taskType, entry)}
                                    </div>
                                    <div className="text-xs text-muted-foreground">
                                      ~{entry.estimatedBlocks * 25} minutes
                                    </div>
                                  </div>
                                  {getStatusBadge(entry.status)}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Review Tasks */}
                      {groupedEntries.REVIEW.length > 0 && (
                        <div>
                          <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                            <Brain className="h-4 w-4" />
                            Phase 2 - Réviser ({groupedEntries.REVIEW.length} session
                            {groupedEntries.REVIEW.length > 1 ? "s" : ""})
                          </h4>
                          <div className="space-y-2 ml-6">
                            {groupedEntries.REVIEW.map((entry) => (
                              <div
                                key={entry.id}
                                className="flex items-center justify-between p-2 border rounded bg-background"
                              >
                                <div className="flex items-center gap-2 flex-1">
                                  <div className="text-muted-foreground">
                                    {getTaskIcon(entry.taskType)}
                                  </div>
                                  <div className="flex-1">
                                    <div className="text-sm font-medium">
                                      {getTaskLabel(entry.taskType, entry)}
                                    </div>
                                    <div className="text-xs text-muted-foreground">
                                      ~{entry.estimatedBlocks * 25} minutes
                                    </div>
                                  </div>
                                  {getStatusBadge(entry.status)}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Practice Tasks */}
                      {groupedEntries.PRACTICE.length > 0 && (
                        <div>
                          <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                            <Target className="h-4 w-4" />
                            Phase 3 - Pratiquer ({groupedEntries.PRACTICE.length} tâche
                            {groupedEntries.PRACTICE.length > 1 ? "s" : ""})
                          </h4>
                          <div className="space-y-2 ml-6">
                            {groupedEntries.PRACTICE.map((entry) => (
                              <div
                                key={entry.id}
                                className="flex items-center justify-between p-2 border rounded bg-background"
                              >
                                <div className="flex items-center gap-2 flex-1">
                                  <div className="text-muted-foreground">
                                    {getTaskIcon(entry.taskType)}
                                  </div>
                                  <div className="flex-1">
                                    <div className="text-sm font-medium">
                                      {getTaskLabel(entry.taskType, entry)}
                                    </div>
                                    <div className="text-xs text-muted-foreground">
                                      ~{entry.estimatedBlocks * 25} minutes
                                    </div>
                                  </div>
                                  {getStatusBadge(entry.status)}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {totalEntries === 0 && (
                        <p className="text-sm text-muted-foreground text-center py-4">
                          Aucune tâche planifiée pour cette semaine
                        </p>
                      )}
                    </div>
                  </CollapsibleContent>
                </div>
              </Collapsible>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

```


Checking for linting errors:



Fixed the mobile viewport overflow in the study plan component. Changes:

1. **Added `min-w-0`** to the flex container to allow proper shrinking
2. **Made spacing responsive** — smaller gaps on mobile (`gap-2 sm:gap-3`)
3. **Reduced week number circle size** on mobile (`w-10 h-10` on mobile, `w-12 h-12` on larger screens)
4. **Added `truncate`** to the title and date to prevent text overflow
5. **Made text sizes responsive** — smaller on mobile, larger on desktop
6. **Added `whitespace-nowrap`** to the completion text ("0 / 1 complété") to keep it on one line
7. **Added `flex-shrink-0`** to badges to prevent them from being compressed
8. **Added `ml-2`** margin to the completion section for proper spacing

The component should now fit within the mobile viewport without spilling. The layout adapts to smaller screens while maintaining readability.

---

**User**

on the localhost,how do i hide the tanstack overlay icon?

---

**Cursor**


Searching for TanStack Query configuration to hide the devtools overlay on localhost.



Reading the query provider file to see how the devtools are configured:



Hiding the TanStack React Query DevTools overlay on localhost. Updating the query provider to conditionally render it:


```typescriptreact
"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { useState } from "react";

export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // With SSR, we usually want to set some default staleTime
            // above 0 to avoid refetching immediately on the client
            staleTime: 60 * 1000, // 1 minute
            gcTime: 5 * 60 * 1000, // 5 minutes (formerly cacheTime)
            refetchOnWindowFocus: false,
            retry: 1,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {process.env.NODE_ENV === "production" && (
        <ReactQueryDevtools initialIsOpen={false} />
      )}
    </QueryClientProvider>
  );
}


```


Fixing the condition: on localhost, `NODE_ENV` is "development", so we should hide it in development:


```typescriptreact
"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { useState } from "react";

export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // With SSR, we usually want to set some default staleTime
            // above 0 to avoid refetching immediately on the client
            staleTime: 60 * 1000, // 1 minute
            gcTime: 5 * 60 * 1000, // 5 minutes (formerly cacheTime)
            refetchOnWindowFocus: false,
            retry: 1,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {/* DevTools hidden on localhost - uncomment to enable */}
      {/* <ReactQueryDevtools initialIsOpen={false} /> */}
    </QueryClientProvider>
  );
}


```


Checking for linting errors and removing the unused import:



Removing the unused import:


```typescriptreact
"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
// import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { useState } from "react";

export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // With SSR, we usually want to set some default staleTime
            // above 0 to avoid refetching immediately on the client
            staleTime: 60 * 1000, // 1 minute
            gcTime: 5 * 60 * 1000, // 5 minutes (formerly cacheTime)
            refetchOnWindowFocus: false,
            retry: 1,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {/* DevTools hidden on localhost - uncomment to enable */}
      {/* <ReactQueryDevtools initialIsOpen={false} /> */}
    </QueryClientProvider>
  );
}


```


Keeping the import for easy re-enabling. Verifying everything works:



Hidden the TanStack React Query DevTools overlay on localhost. The component is commented out in the query provider.

**What I did:**
- Commented out the `<ReactQueryDevtools />` component
- Commented out the import (you can uncomment both later if needed)

The overlay icon will no longer appear on localhost.

**If you want to re-enable it later**, uncomment these lines:
- Line 4: `import { ReactQueryDevtools } from "@tanstack/react-query-devtools";`
- Line 28: `<ReactQueryDevtools initialIsOpen={false} />`

**Alternative option:** If you want to control it via an environment variable (e.g., only show in development), I can set that up. The current solution keeps it hidden on localhost.

---

**User**

Still on mobile, the phase 1 module window <ModuleDetailPage courseId="448ea458-42b0-4938-9640-08013a9266de" moduleId="e7a832ec-dc1e-4192-aaf9-e65cbf0981fb" onBack="[Function]">Retour Chapitre 1: Le secteur des valeurs mobilières au Canada Dans le présent chapitre, nous décrivons le lien entre les différents participants au secteur des valeurs mobilières au Canada. Nous abo</ModuleDetailPage>
<div>Retour Chapitre 1: Le secteur des valeurs mobilières au Canada Dans le présent chapitre, nous décrivons le lien entre les différents participants au secteur des valeurs mobilières au Canada. Nous abo</div> and the mark as complete button are side by side, they should be stacked

---

**Cursor**


Searching for the ModuleDetailPage component to fix the mobile layout:



Reading the module detail page component:



Fixing the mobile layout: the header uses `flex justify-between`, causing side-by-side overflow. Making it stack vertically on mobile:


```typescriptreact
"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Loader2, Play, FileText, CheckCircle2, ArrowLeft, Video as VideoIcon } from "lucide-react";
import { toast } from "sonner";
import { getModuleContentAction } from "@/app/actions/module-content";
import { markModuleAsLearnedAction } from "@/app/actions/study-plan";
import { submitQuizAttemptAction } from "@/app/actions/quizzes";
import { getStudentModuleNoteAction, saveStudentModuleNoteAction } from "@/app/actions/student-notes";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { ChevronLeft, ChevronRight, StickyNote, Save } from "lucide-react";

interface ModuleDetailPageProps {
  courseId: string;
  moduleId: string;
  onBack: () => void;
}

type Video = {
  id: string;
  order: number;
  video: {
    id: string;
    vimeoUrl: string;
    duration: number | null;
    transcript: string | null;
  };
};

type Note = {
  id: string;
  order: number;
  note: {
    id: string;
    content: string;
  };
};

type Quiz = {
  id: string;
  order: number;
  quiz: {
    id: string;
    title: string;
    passingScore: number;
    timeLimit: number | null;
    questions: Array<{
      id: string;
      order: number;
      question: string;
      options: Record<string, string>;
      correctAnswer: string;
    }>;
  };
};

export function ModuleDetailPage({ courseId, moduleId, onBack }: ModuleDetailPageProps) {
  const [loading, setLoading] = useState(true);
  const [module, setModule] = useState<any>(null);
  const [videos, setVideos] = useState<Video[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [progress, setProgress] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<"videos" | "notes" | "quiz">("videos");
  const [quizAnswers, setQuizAnswers] = useState<Record<string, Record<string, string>>>({});
  const [quizSubmitted, setQuizSubmitted] = useState<Record<string, boolean>>({});
  const [submittingQuiz, setSubmittingQuiz] = useState<string | null>(null);
  const [markingComplete, setMarkingComplete] = useState(false);
  const [currentQuizIndex, setCurrentQuizIndex] = useState<Record<string, number>>({});
  const [studentNote, setStudentNote] = useState<string>("");
  const [savingNote, setSavingNote] = useState(false);
  const [noteSaved, setNoteSaved] = useState(false);

  useEffect(() => {
    loadModuleContent();
    loadStudentNote();
    
    // Check URL parameters for tab
    const params = new URLSearchParams(window.location.search);
    const tab = params.get('tab');
    if (tab === 'videos' || tab === 'notes' || tab === 'quiz') {
      setActiveTab(tab);
    }
  }, [moduleId]);

  const loadStudentNote = async () => {
    try {
      const result = await getStudentModuleNoteAction(moduleId);
      if (result.success && result.data) {
        setStudentNote(result.data.content || "");
        setNoteSaved(result.data.exists);
      }
    } catch (error) {
      console.error("Error loading student note:", error);
    }
  };

  const handleSaveNote = async () => {
    setSavingNote(true);
    try {
      const result = await saveStudentModuleNoteAction(moduleId, studentNote);
      if (result.success) {
        setNoteSaved(true);
        toast.success("Note sauvegardée");
        // Reset the saved indicator after 2 seconds
        setTimeout(() => setNoteSaved(false), 2000);
      } else {
        toast.error(result.error || "Erreur lors de la sauvegarde");
      }
    } catch (error) {
      console.error("Error saving note:", error);
      toast.error("Erreur lors de la sauvegarde");
    } finally {
      setSavingNote(false);
    }
  };

  const loadModuleContent = async () => {
    setLoading(true);
    try {
      const result = await getModuleContentAction(moduleId);
      if (result.success && result.data) {
        setModule(result.data.module);
        setVideos(result.data.videos);
        setNotes(result.data.notes);
        setQuizzes(result.data.quizzes);
        setProgress(result.data.progress);
      } else {
        toast.error(result.error || "Erreur lors du chargement du module");
      }
    } catch (error) {
      console.error("Error loading module content:", error);
      toast.error("Erreur lors du chargement du module");
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsComplete = async () => {
    if (!confirm("Voulez-vous marquer ce module comme complété ?")) {
      return;
    }

    setMarkingComplete(true);
    try {
      const result = await markModuleAsLearnedAction(courseId, moduleId);
      if (result.success) {
        toast.success("Module marqué comme complété !");
        await loadModuleContent(); // Reload to update progress
      } else {
        toast.error(result.error || "Erreur lors de la mise à jour");
      }
    } catch (error) {
      console.error("Error marking module as complete:", error);
      toast.error("Erreur lors de la mise à jour");
    } finally {
      setMarkingComplete(false);
    }
  };

  const handleQuizAnswerChange = (quizId: string, questionId: string, answer: string) => {
    setQuizAnswers((prev) => ({
      ...prev,
      [quizId]: {
        ...prev[quizId],
        [questionId]: answer,
      },
    }));
  };

  const handleSubmitQuiz = async (quiz: Quiz) => {
    if (!quizAnswers[quiz.quiz.id] || Object.keys(quizAnswers[quiz.quiz.id]).length === 0) {
      toast.error("Veuillez répondre à toutes les questions");
      return;
    }

    // Check if all questions are answered
    const allAnswered = quiz.quiz.questions.every(
      (q) => quizAnswers[quiz.quiz.id]?.[q.id]
    );
    if (!allAnswered) {
      toast.error("Veuillez répondre à toutes les questions");
      return;
    }

    setSubmittingQuiz(quiz.quiz.id);
    try {
      const result = await submitQuizAttemptAction({
        quizId: quiz.quiz.id,
        answers: quizAnswers[quiz.quiz.id],
        timeSpent: 0, // Phase 1 quizzes don't track time
      });

      if (result.success && result.data) {
        setQuizSubmitted((prev) => ({ ...prev, [quiz.quiz.id]: true }));
        if (result.data.passed) {
          toast.success(`Quiz réussi ! Score: ${result.data.score}%`);
        } else {
          toast.warning(`Score: ${result.data.score}%. Note de passage: ${quiz.quiz.passingScore}%`);
        }
      } else {
        toast.error(result.error || "Erreur lors de la soumission");
      }
    } catch (error) {
      console.error("Error submitting quiz:", error);
      toast.error("Erreur lors de la soumission");
    } finally {
      setSubmittingQuiz(null);
    }
  };


  // Helper function to extract Vimeo embed URL (from FIN3500-platform)
  const getVimeoEmbedUrl = (vimeoUrl: string): string => {
    // If it's already a full embed URL with parameters, extract the src
    if (vimeoUrl.includes('player.vimeo.com')) {
      // Extract the src URL from iframe tag if it's wrapped in HTML
      const srcMatch = vimeoUrl.match(/src="([^"]+)"/);
      if (srcMatch) {
        return srcMatch[1].replace(/&amp;/g, '&');
      }
      // If it's just the URL, return it
      return vimeoUrl.replace(/&amp;/g, '&');
    }
    
    // Otherwise, extract the video ID and create a basic embed URL
    const vimeoIdMatch = vimeoUrl.match(/vimeo\.com\/(\d+)/);
    if (vimeoIdMatch) {
      return `https://player.vimeo.com/video/${vimeoIdMatch[1]}?autoplay=0&title=0&byline=0&portrait=0`;
    }
    
    return vimeoUrl;
  };

  // Helper function to map option keys to letters
  const getOptionLetter = (key: string, index: number): string => {
    if (/^[A-Z]$/i.test(key)) {
      return key.toUpperCase();
    }
    return String.fromCharCode(65 + index);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!module) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-muted-foreground">Module introuvable</p>
        </CardContent>
      </Card>
    );
  }

  const isCompleted = progress?.learnStatus === "LEARNED";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div className="flex-1 min-w-0">
          <Button variant="ghost" onClick={onBack} className="mb-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Retour
          </Button>
          <h1 className="text-xl sm:text-2xl font-bold break-words">{module.title}</h1>
          {module.description && (
            <p className="text-muted-foreground mt-2 break-words">{module.description}</p>
          )}
        </div>
        <div className="flex-shrink-0 w-full sm:w-auto">
          {isCompleted ? (
            <Badge variant="default" className="h-8 w-full sm:w-auto justify-center">
              <CheckCircle2 className="h-4 w-4 mr-2" />
              Complété
            </Badge>
          ) : (
            <Button 
              onClick={handleMarkAsComplete} 
              disabled={markingComplete}
              className="w-full sm:w-auto"
            >
              {markingComplete ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Enregistrement...
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Marquer comme complété
                </>
              )}
            </Button>
          )}
        </div>
      </div>

      {/* Content Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="videos">
            <VideoIcon className="h-4 w-4 mr-2" />
            Vidéos ({videos.length})
          </TabsTrigger>
          <TabsTrigger value="notes">
            <FileText className="h-4 w-4 mr-2" />
            Notes du cours ({notes.length})
          </TabsTrigger>
          <TabsTrigger value="quiz">
            <Play className="h-4 w-4 mr-2" />
            Quiz ({quizzes.length})
          </TabsTrigger>
        </TabsList>

        {/* Videos Tab */}
        <TabsContent value="videos" className="mt-6">
          {videos.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-muted-foreground">Aucune vidéo disponible pour ce module.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {videos.map((videoItem) => {
                const embedUrl = getVimeoEmbedUrl(videoItem.video.vimeoUrl);
                return (
                  <Card key={videoItem.id}>
                    <CardContent className="pt-6">
                      <div style={{ padding: '56.25% 0 0 0', position: 'relative' }}>
                        <iframe
                          src={embedUrl}
                          frameBorder="0"
                          allow="autoplay; fullscreen; picture-in-picture; clipboard-write; encrypted-media; web-share"
                          referrerPolicy="strict-origin-when-cross-origin"
                          style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}
                          title={`Vidéo ${videoItem.order}`}
                        />
                      </div>
                      {videoItem.video.transcript && (
                        <div className="mt-4 p-4 bg-muted rounded-lg">
                          <div className="text-sm font-semibold mb-2">Transcription:</div>
                          <div className="text-sm whitespace-pre-wrap">{videoItem.video.transcript}</div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* Notes Tab */}
        <TabsContent value="notes" className="mt-6">
          {notes.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-muted-foreground">Aucune note disponible pour ce module.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {notes.map((noteItem) => (
                <Card key={noteItem.id}>
                  <CardHeader>
                    <CardTitle></CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div 
                      className="note-content [&>p]:mb-4 [&>p:last-child]:mb-0 [&>ul]:my-4 [&>ol]:my-4 [&>li]:mb-2 [&>h1]:text-2xl [&>h1]:font-bold [&>h1]:mt-6 [&>h1]:mb-4 [&>h2]:text-xl [&>h2]:font-bold [&>h2]:mt-6 [&>h2]:mb-4 [&>h3]:text-lg [&>h3]:font-semibold [&>h3]:mt-4 [&>h3]:mb-3 [&>strong]:font-semibold [&>em]:italic [&>a]:text-primary [&>a]:underline [&>a:hover]:no-underline [&>ul]:list-disc [&>ul]:pl-6 [&>ol]:list-decimal [&>ol]:pl-6 [&>li]:ml-4"
                      style={{
                        lineHeight: '1.75',
                      }}
                      dangerouslySetInnerHTML={{ __html: noteItem.note.content }} 
                    />
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Quiz Tab */}
        <TabsContent value="quiz" className="mt-6">
          {quizzes.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-muted-foreground">Aucun quiz disponible pour ce module.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-6">
              {quizzes.map((quizItem) => {
                const quiz = quizItem.quiz;
                const isSubmitted = quizSubmitted[quiz.id];
                const isSubmitting = submittingQuiz === quiz.id;
                const answers = quizAnswers[quiz.id] || {};
                const currentIndex = currentQuizIndex[quiz.id] || 0;
                const currentQuestion = quiz.questions[currentIndex];
                const totalQuestions = quiz.questions.length;

                const handlePrevious = () => {
                  if (currentIndex > 0) {
                    setCurrentQuizIndex((prev) => ({
                      ...prev,
                      [quiz.id]: currentIndex - 1,
                    }));
                  }
                };

                const handleNext = () => {
                  if (currentIndex < totalQuestions - 1) {
                    setCurrentQuizIndex((prev) => ({
                      ...prev,
                      [quiz.id]: currentIndex + 1,
                    }));
                  }
                };

                if (!currentQuestion) return null;

                const optionKeys = currentQuestion.options
                  ? Object.keys(currentQuestion.options).sort()
                  : [];
                const userAnswer = answers[currentQuestion.id];

                return (
                  <Card key={quizItem.id}>
                    <CardHeader>
                      <CardTitle>{quiz.title}</CardTitle>
                      <CardDescription>
                        Question {currentIndex + 1} / {totalQuestions} • Note de passage: {quiz.passingScore}%
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <div className="space-y-3">
                        <div className="font-semibold text-lg">
                          {currentQuestion.question}
                        </div>
                        <RadioGroup
                          value={userAnswer || ""}
                          onValueChange={(value) =>
                            handleQuizAnswerChange(quiz.id, currentQuestion.id, value)
                          }
                          disabled={isSubmitted}
                        >
                          {optionKeys.map((key, keyIndex) => {
                            const optionValue = currentQuestion.options[key];
                            const optionLetter = getOptionLetter(key, keyIndex);
                            return (
                              <div key={key} className="flex items-start space-x-3">
                                <RadioGroupItem value={key} id={`${currentQuestion.id}-${key}`} />
                                <Label
                                  htmlFor={`${currentQuestion.id}-${key}`}
                                  className="flex-1 cursor-pointer"
                                >
                                  <span className="font-medium">{optionLetter}:</span> {optionValue}
                                </Label>
                              </div>
                            );
                          })}
                        </RadioGroup>
                      </div>

                      <div className="flex items-center justify-between pt-4 border-t">
                        <Button
                          variant="outline"
                          onClick={handlePrevious}
                          disabled={currentIndex === 0 || isSubmitted}
                        >
                          <ChevronLeft className="h-4 w-4 mr-2" />
                          Précédent
                        </Button>
                        <div className="text-sm text-muted-foreground">
                          {Object.keys(answers).length} / {totalQuestions} répondues
                        </div>
                        {currentIndex < totalQuestions - 1 ? (
                          <Button
                            variant="outline"
                            onClick={handleNext}
                            disabled={isSubmitted}
                          >
                            Suivant
                            <ChevronRight className="h-4 w-4 ml-2" />
                          </Button>
                        ) : (
                          <Button
                            onClick={() => handleSubmitQuiz(quizItem)}
                            disabled={isSubmitting || Object.keys(answers).length < totalQuestions}
                          >
                            {isSubmitting ? (
                              <>
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                Soumission...
                              </>
                            ) : (
                              "Soumettre le quiz"
                            )}
                          </Button>
                        )}
                      </div>

                      {isSubmitted && (
                        <div className="p-4 bg-muted rounded-lg text-center">
                          <p className="text-sm text-muted-foreground">Quiz soumis</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Student Notes Panel - At the bottom */}
      <Card className="border-primary/20 bg-primary/5">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <StickyNote className="h-4 w-4" />
              Mes notes
            </CardTitle>
            <div className="flex items-center gap-2">
              {noteSaved && (
                <span className="text-xs text-muted-foreground">Sauvegardé</span>
              )}
              <Button
                size="sm"
                onClick={handleSaveNote}
                disabled={savingNote}
                variant={noteSaved ? "outline" : "default"}
              >
                {savingNote ? (
                  <>
                    <Loader2 className="h-3 w-3 mr-2 animate-spin" />
                    Sauvegarde...
                  </>
                ) : (
                  <>
                    <Save className="h-3 w-3 mr-2" />
                    Sauvegarder
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Textarea
            value={studentNote}
            onChange={(e) => setStudentNote(e.target.value)}
            placeholder="Prenez vos notes ici pendant que vous étudiez ce module..."
            className="min-h-[120px] resize-y"
            rows={5}
          />
          <div className="flex items-center justify-between mt-2">
            <p className="text-xs text-muted-foreground">
              Vos notes sont sauvegardées lorsque vous cliquez sur "Sauvegarder"
            </p>
            {studentNote.length > 0 && (
              <p className="text-xs text-muted-foreground">
                {studentNote.length} caractère{studentNote.length > 1 ? 's' : ''}
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}


```


Checking for linting errors:



Fixed the mobile layout for the ModuleDetailPage component. Changes:

1. **Stacked layout on mobile**: Changed from `flex justify-between` to `flex flex-col sm:flex-row` so elements stack vertically on mobile and remain side-by-side on larger screens.

2. **Responsive title**: Made the title smaller on mobile (`text-xl sm:text-2xl`) and added `break-words` to prevent overflow.

3. **Full-width button on mobile**: The "Marquer comme complété" button is full width on mobile (`w-full sm:w-auto`) and stacks below the title.

4. **Badge styling**: The "Complété" badge is also full width on mobile with centered content.

5. **Proper spacing**: Added `gap-4` for spacing between stacked elements.

On mobile, the layout now stacks:
- Back button
- Module title
- Description (if present)
- "Marquer comme complété" button (or "Complété" badge)

On larger screens, it remains side-by-side. The layout should no longer overflow on mobile.

---

**User**

in phase 1, the video, notes, and quiz tabs should not have a counter (1) 

---

**Cursor**


Removing the counters from the video, notes, and quiz tabs in the module detail page:



Removing the counters from the tabs:


```typescriptreact
"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Loader2, Play, FileText, CheckCircle2, ArrowLeft, Video as VideoIcon } from "lucide-react";
import { toast } from "sonner";
import { getModuleContentAction } from "@/app/actions/module-content";
import { markModuleAsLearnedAction } from "@/app/actions/study-plan";
import { submitQuizAttemptAction } from "@/app/actions/quizzes";
import { getStudentModuleNoteAction, saveStudentModuleNoteAction } from "@/app/actions/student-notes";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { ChevronLeft, ChevronRight, StickyNote, Save } from "lucide-react";

interface ModuleDetailPageProps {
  courseId: string;
  moduleId: string;
  onBack: () => void;
}

type Video = {
  id: string;
  order: number;
  video: {
    id: string;
    vimeoUrl: string;
    duration: number | null;
    transcript: string | null;
  };
};

type Note = {
  id: string;
  order: number;
  note: {
    id: string;
    content: string;
  };
};

type Quiz = {
  id: string;
  order: number;
  quiz: {
    id: string;
    title: string;
    passingScore: number;
    timeLimit: number | null;
    questions: Array<{
      id: string;
      order: number;
      question: string;
      options: Record<string, string>;
      correctAnswer: string;
    }>;
  };
};

export function ModuleDetailPage({ courseId, moduleId, onBack }: ModuleDetailPageProps) {
  const [loading, setLoading] = useState(true);
  const [module, setModule] = useState<any>(null);
  const [videos, setVideos] = useState<Video[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [progress, setProgress] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<"videos" | "notes" | "quiz">("videos");
  const [quizAnswers, setQuizAnswers] = useState<Record<string, Record<string, string>>>({});
  const [quizSubmitted, setQuizSubmitted] = useState<Record<string, boolean>>({});
  const [submittingQuiz, setSubmittingQuiz] = useState<string | null>(null);
  const [markingComplete, setMarkingComplete] = useState(false);
  const [currentQuizIndex, setCurrentQuizIndex] = useState<Record<string, number>>({});
  const [studentNote, setStudentNote] = useState<string>("");
  const [savingNote, setSavingNote] = useState(false);
  const [noteSaved, setNoteSaved] = useState(false);

  useEffect(() => {
    loadModuleContent();
    loadStudentNote();
    
    // Check URL parameters for tab
    const params = new URLSearchParams(window.location.search);
    const tab = params.get('tab');
    if (tab === 'videos' || tab === 'notes' || tab === 'quiz') {
      setActiveTab(tab);
    }
  }, [moduleId]);

  const loadStudentNote = async () => {
    try {
      const result = await getStudentModuleNoteAction(moduleId);
      if (result.success && result.data) {
        setStudentNote(result.data.content || "");
        setNoteSaved(result.data.exists);
      }
    } catch (error) {
      console.error("Error loading student note:", error);
    }
  };

  const handleSaveNote = async () => {
    setSavingNote(true);
    try {
      const result = await saveStudentModuleNoteAction(moduleId, studentNote);
      if (result.success) {
        setNoteSaved(true);
        toast.success("Note sauvegardée");
        // Reset the saved indicator after 2 seconds
        setTimeout(() => setNoteSaved(false), 2000);
      } else {
        toast.error(result.error || "Erreur lors de la sauvegarde");
      }
    } catch (error) {
      console.error("Error saving note:", error);
      toast.error("Erreur lors de la sauvegarde");
    } finally {
      setSavingNote(false);
    }
  };

  const loadModuleContent = async () => {
    setLoading(true);
    try {
      const result = await getModuleContentAction(moduleId);
      if (result.success && result.data) {
        setModule(result.data.module);
        setVideos(result.data.videos);
        setNotes(result.data.notes);
        setQuizzes(result.data.quizzes);
        setProgress(result.data.progress);
      } else {
        toast.error(result.error || "Erreur lors du chargement du module");
      }
    } catch (error) {
      console.error("Error loading module content:", error);
      toast.error("Erreur lors du chargement du module");
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsComplete = async () => {
    if (!confirm("Voulez-vous marquer ce module comme complété ?")) {
      return;
    }

    setMarkingComplete(true);
    try {
      const result = await markModuleAsLearnedAction(courseId, moduleId);
      if (result.success) {
        toast.success("Module marqué comme complété !");
        await loadModuleContent(); // Reload to update progress
      } else {
        toast.error(result.error || "Erreur lors de la mise à jour");
      }
    } catch (error) {
      console.error("Error marking module as complete:", error);
      toast.error("Erreur lors de la mise à jour");
    } finally {
      setMarkingComplete(false);
    }
  };

  const handleQuizAnswerChange = (quizId: string, questionId: string, answer: string) => {
    setQuizAnswers((prev) => ({
      ...prev,
      [quizId]: {
        ...prev[quizId],
        [questionId]: answer,
      },
    }));
  };

  const handleSubmitQuiz = async (quiz: Quiz) => {
    if (!quizAnswers[quiz.quiz.id] || Object.keys(quizAnswers[quiz.quiz.id]).length === 0) {
      toast.error("Veuillez répondre à toutes les questions");
      return;
    }

    // Check if all questions are answered
    const allAnswered = quiz.quiz.questions.every(
      (q) => quizAnswers[quiz.quiz.id]?.[q.id]
    );
    if (!allAnswered) {
      toast.error("Veuillez répondre à toutes les questions");
      return;
    }

    setSubmittingQuiz(quiz.quiz.id);
    try {
      const result = await submitQuizAttemptAction({
        quizId: quiz.quiz.id,
        answers: quizAnswers[quiz.quiz.id],
        timeSpent: 0, // Phase 1 quizzes don't track time
      });

      if (result.success && result.data) {
        setQuizSubmitted((prev) => ({ ...prev, [quiz.quiz.id]: true }));
        if (result.data.passed) {
          toast.success(`Quiz réussi ! Score: ${result.data.score}%`);
        } else {
          toast.warning(`Score: ${result.data.score}%. Note de passage: ${quiz.quiz.passingScore}%`);
        }
      } else {
        toast.error(result.error || "Erreur lors de la soumission");
      }
    } catch (error) {
      console.error("Error submitting quiz:", error);
      toast.error("Erreur lors de la soumission");
    } finally {
      setSubmittingQuiz(null);
    }
  };


  // Helper function to extract Vimeo embed URL (from FIN3500-platform)
  const getVimeoEmbedUrl = (vimeoUrl: string): string => {
    // If it's already a full embed URL with parameters, extract the src
    if (vimeoUrl.includes('player.vimeo.com')) {
      // Extract the src URL from iframe tag if it's wrapped in HTML
      const srcMatch = vimeoUrl.match(/src="([^"]+)"/);
      if (srcMatch) {
        return srcMatch[1].replace(/&amp;/g, '&');
      }
      // If it's just the URL, return it
      return vimeoUrl.replace(/&amp;/g, '&');
    }
    
    // Otherwise, extract the video ID and create a basic embed URL
    const vimeoIdMatch = vimeoUrl.match(/vimeo\.com\/(\d+)/);
    if (vimeoIdMatch) {
      return `https://player.vimeo.com/video/${vimeoIdMatch[1]}?autoplay=0&title=0&byline=0&portrait=0`;
    }
    
    return vimeoUrl;
  };

  // Helper function to map option keys to letters
  const getOptionLetter = (key: string, index: number): string => {
    if (/^[A-Z]$/i.test(key)) {
      return key.toUpperCase();
    }
    return String.fromCharCode(65 + index);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!module) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-muted-foreground">Module introuvable</p>
        </CardContent>
      </Card>
    );
  }

  const isCompleted = progress?.learnStatus === "LEARNED";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div className="flex-1 min-w-0">
          <Button variant="ghost" onClick={onBack} className="mb-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Retour
          </Button>
          <h1 className="text-xl sm:text-2xl font-bold break-words">{module.title}</h1>
          {module.description && (
            <p className="text-muted-foreground mt-2 break-words">{module.description}</p>
          )}
        </div>
        <div className="flex-shrink-0 w-full sm:w-auto">
          {isCompleted ? (
            <Badge variant="default" className="h-8 w-full sm:w-auto justify-center">
              <CheckCircle2 className="h-4 w-4 mr-2" />
              Complété
            </Badge>
          ) : (
            <Button 
              onClick={handleMarkAsComplete} 
              disabled={markingComplete}
              className="w-full sm:w-auto"
            >
              {markingComplete ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Enregistrement...
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Marquer comme complété
                </>
              )}
            </Button>
          )}
        </div>
      </div>

      {/* Content Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="videos">
            <VideoIcon className="h-4 w-4 mr-2" />
            Vidéos
          </TabsTrigger>
          <TabsTrigger value="notes">
            <FileText className="h-4 w-4 mr-2" />
            Notes du cours
          </TabsTrigger>
          <TabsTrigger value="quiz">
            <Play className="h-4 w-4 mr-2" />
            Quiz
          </TabsTrigger>
        </TabsList>

        {/* Videos Tab */}
        <TabsContent value="videos" className="mt-6">
          {videos.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-muted-foreground">Aucune vidéo disponible pour ce module.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {videos.map((videoItem) => {
                const embedUrl = getVimeoEmbedUrl(videoItem.video.vimeoUrl);
                return (
                  <Card key={videoItem.id}>
                    <CardContent className="pt-6">
                      <div style={{ padding: '56.25% 0 0 0', position: 'relative' }}>
                        <iframe
                          src={embedUrl}
                          frameBorder="0"
                          allow="autoplay; fullscreen; picture-in-picture; clipboard-write; encrypted-media; web-share"
                          referrerPolicy="strict-origin-when-cross-origin"
                          style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}
                          title={`Vidéo ${videoItem.order}`}
                        />
                      </div>
                      {videoItem.video.transcript && (
                        <div className="mt-4 p-4 bg-muted rounded-lg">
                          <div className="text-sm font-semibold mb-2">Transcription:</div>
                          <div className="text-sm whitespace-pre-wrap">{videoItem.video.transcript}</div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* Notes Tab */}
        <TabsContent value="notes" className="mt-6">
          {notes.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-muted-foreground">Aucune note disponible pour ce module.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {notes.map((noteItem) => (
                <Card key={noteItem.id}>
                  <CardHeader>
                    <CardTitle></CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div 
                      className="note-content [&>p]:mb-4 [&>p:last-child]:mb-0 [&>ul]:my-4 [&>ol]:my-4 [&>li]:mb-2 [&>h1]:text-2xl [&>h1]:font-bold [&>h1]:mt-6 [&>h1]:mb-4 [&>h2]:text-xl [&>h2]:font-bold [&>h2]:mt-6 [&>h2]:mb-4 [&>h3]:text-lg [&>h3]:font-semibold [&>h3]:mt-4 [&>h3]:mb-3 [&>strong]:font-semibold [&>em]:italic [&>a]:text-primary [&>a]:underline [&>a:hover]:no-underline [&>ul]:list-disc [&>ul]:pl-6 [&>ol]:list-decimal [&>ol]:pl-6 [&>li]:ml-4"
                      style={{
                        lineHeight: '1.75',
                      }}
                      dangerouslySetInnerHTML={{ __html: noteItem.note.content }} 
                    />
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Quiz Tab */}
        <TabsContent value="quiz" className="mt-6">
          {quizzes.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-muted-foreground">Aucun quiz disponible pour ce module.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-6">
              {quizzes.map((quizItem) => {
                const quiz = quizItem.quiz;
                const isSubmitted = quizSubmitted[quiz.id];
                const isSubmitting = submittingQuiz === quiz.id;
                const answers = quizAnswers[quiz.id] || {};
                const currentIndex = currentQuizIndex[quiz.id] || 0;
                const currentQuestion = quiz.questions[currentIndex];
                const totalQuestions = quiz.questions.length;

                const handlePrevious = () => {
                  if (currentIndex > 0) {
                    setCurrentQuizIndex((prev) => ({
                      ...prev,
                      [quiz.id]: currentIndex - 1,
                    }));
                  }
                };

                const handleNext = () => {
                  if (currentIndex < totalQuestions - 1) {
                    setCurrentQuizIndex((prev) => ({
                      ...prev,
                      [quiz.id]: currentIndex + 1,
                    }));
                  }
                };

                if (!currentQuestion) return null;

                const optionKeys = currentQuestion.options
                  ? Object.keys(currentQuestion.options).sort()
                  : [];
                const userAnswer = answers[currentQuestion.id];

                return (
                  <Card key={quizItem.id}>
                    <CardHeader>
                      <CardTitle>{quiz.title}</CardTitle>
                      <CardDescription>
                        Question {currentIndex + 1} / {totalQuestions} • Note de passage: {quiz.passingScore}%
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <div className="space-y-3">
                        <div className="font-semibold text-lg">
                          {currentQuestion.question}
                        </div>
                        <RadioGroup
                          value={userAnswer || ""}
                          onValueChange={(value) =>
                            handleQuizAnswerChange(quiz.id, currentQuestion.id, value)
                          }
                          disabled={isSubmitted}
                        >
                          {optionKeys.map((key, keyIndex) => {
                            const optionValue = currentQuestion.options[key];
                            const optionLetter = getOptionLetter(key, keyIndex);
                            return (
                              <div key={key} className="flex items-start space-x-3">
                                <RadioGroupItem value={key} id={`${currentQuestion.id}-${key}`} />
                                <Label
                                  htmlFor={`${currentQuestion.id}-${key}`}
                                  className="flex-1 cursor-pointer"
                                >
                                  <span className="font-medium">{optionLetter}:</span> {optionValue}
                                </Label>
                              </div>
                            );
                          })}
                        </RadioGroup>
                      </div>

                      <div className="flex items-center justify-between pt-4 border-t">
                        <Button
                          variant="outline"
                          onClick={handlePrevious}
                          disabled={currentIndex === 0 || isSubmitted}
                        >
                          <ChevronLeft className="h-4 w-4 mr-2" />
                          Précédent
                        </Button>
                        <div className="text-sm text-muted-foreground">
                          {Object.keys(answers).length} / {totalQuestions} répondues
                        </div>
                        {currentIndex < totalQuestions - 1 ? (
                          <Button
                            variant="outline"
                            onClick={handleNext}
                            disabled={isSubmitted}
                          >
                            Suivant
                            <ChevronRight className="h-4 w-4 ml-2" />
                          </Button>
                        ) : (
                          <Button
                            onClick={() => handleSubmitQuiz(quizItem)}
                            disabled={isSubmitting || Object.keys(answers).length < totalQuestions}
                          >
                            {isSubmitting ? (
                              <>
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                Soumission...
                              </>
                            ) : (
                              "Soumettre le quiz"
                            )}
                          </Button>
                        )}
                      </div>

                      {isSubmitted && (
                        <div className="p-4 bg-muted rounded-lg text-center">
                          <p className="text-sm text-muted-foreground">Quiz soumis</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Student Notes Panel - At the bottom */}
      <Card className="border-primary/20 bg-primary/5">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <StickyNote className="h-4 w-4" />
              Mes notes
            </CardTitle>
            <div className="flex items-center gap-2">
              {noteSaved && (
                <span className="text-xs text-muted-foreground">Sauvegardé</span>
              )}
              <Button
                size="sm"
                onClick={handleSaveNote}
                disabled={savingNote}
                variant={noteSaved ? "outline" : "default"}
              >
                {savingNote ? (
                  <>
                    <Loader2 className="h-3 w-3 mr-2 animate-spin" />
                    Sauvegarde...
                  </>
                ) : (
                  <>
                    <Save className="h-3 w-3 mr-2" />
                    Sauvegarder
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Textarea
            value={studentNote}
            onChange={(e) => setStudentNote(e.target.value)}
            placeholder="Prenez vos notes ici pendant que vous étudiez ce module..."
            className="min-h-[120px] resize-y"
            rows={5}
          />
          <div className="flex items-center justify-between mt-2">
            <p className="text-xs text-muted-foreground">
              Vos notes sont sauvegardées lorsque vous cliquez sur "Sauvegarder"
            </p>
            {studentNote.length > 0 && (
              <p className="text-xs text-muted-foreground">
                {studentNote.length} caractère{studentNote.length > 1 ? 's' : ''}
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}


```


Removed the counters from the video, notes, and quiz tabs in Phase 1. The tabs now display:
- **Vidéos** (without count)
- **Notes du cours** (without count)
- **Quiz** (without count)

The counters `({videos.length})`, `({notes.length})`, and `({quizzes.length})` have been removed.

---

**User**

still in mobile for the phase 1 quiz section, the 0/10 répondues should be on a separate row instead of squeezed between the previous and next buttons. Also increase the line height of the multiple choices, they are too squeezed together

---

**Cursor**


Fixing the mobile quiz layout: moving the "répondues" counter to its own row and increasing the line height of the multiple choice options.



Fixing both issues:


```typescriptreact
"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Loader2, Play, FileText, CheckCircle2, ArrowLeft, Video as VideoIcon } from "lucide-react";
import { toast } from "sonner";
import { getModuleContentAction } from "@/app/actions/module-content";
import { markModuleAsLearnedAction } from "@/app/actions/study-plan";
import { submitQuizAttemptAction } from "@/app/actions/quizzes";
import { getStudentModuleNoteAction, saveStudentModuleNoteAction } from "@/app/actions/student-notes";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { ChevronLeft, ChevronRight, StickyNote, Save } from "lucide-react";

interface ModuleDetailPageProps {
  courseId: string;
  moduleId: string;
  onBack: () => void;
}

type Video = {
  id: string;
  order: number;
  video: {
    id: string;
    vimeoUrl: string;
    duration: number | null;
    transcript: string | null;
  };
};

type Note = {
  id: string;
  order: number;
  note: {
    id: string;
    content: string;
  };
};

type Quiz = {
  id: string;
  order: number;
  quiz: {
    id: string;
    title: string;
    passingScore: number;
    timeLimit: number | null;
    questions: Array<{
      id: string;
      order: number;
      question: string;
      options: Record<string, string>;
      correctAnswer: string;
    }>;
  };
};

export function ModuleDetailPage({ courseId, moduleId, onBack }: ModuleDetailPageProps) {
  const [loading, setLoading] = useState(true);
  const [module, setModule] = useState<any>(null);
  const [videos, setVideos] = useState<Video[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [progress, setProgress] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<"videos" | "notes" | "quiz">("videos");
  const [quizAnswers, setQuizAnswers] = useState<Record<string, Record<string, string>>>({});
  const [quizSubmitted, setQuizSubmitted] = useState<Record<string, boolean>>({});
  const [submittingQuiz, setSubmittingQuiz] = useState<string | null>(null);
  const [markingComplete, setMarkingComplete] = useState(false);
  const [currentQuizIndex, setCurrentQuizIndex] = useState<Record<string, number>>({});
  const [studentNote, setStudentNote] = useState<string>("");
  const [savingNote, setSavingNote] = useState(false);
  const [noteSaved, setNoteSaved] = useState(false);

  useEffect(() => {
    loadModuleContent();
    loadStudentNote();
    
    // Check URL parameters for tab
    const params = new URLSearchParams(window.location.search);
    const tab = params.get('tab');
    if (tab === 'videos' || tab === 'notes' || tab === 'quiz') {
      setActiveTab(tab);
    }
  }, [moduleId]);

  const loadStudentNote = async () => {
    try {
      const result = await getStudentModuleNoteAction(moduleId);
      if (result.success && result.data) {
        setStudentNote(result.data.content || "");
        setNoteSaved(result.data.exists);
      }
    } catch (error) {
      console.error("Error loading student note:", error);
    }
  };

  const handleSaveNote = async () => {
    setSavingNote(true);
    try {
      const result = await saveStudentModuleNoteAction(moduleId, studentNote);
      if (result.success) {
        setNoteSaved(true);
        toast.success("Note sauvegardée");
        // Reset the saved indicator after 2 seconds
        setTimeout(() => setNoteSaved(false), 2000);
      } else {
        toast.error(result.error || "Erreur lors de la sauvegarde");
      }
    } catch (error) {
      console.error("Error saving note:", error);
      toast.error("Erreur lors de la sauvegarde");
    } finally {
      setSavingNote(false);
    }
  };

  const loadModuleContent = async () => {
    setLoading(true);
    try {
      const result = await getModuleContentAction(moduleId);
      if (result.success && result.data) {
        setModule(result.data.module);
        setVideos(result.data.videos);
        setNotes(result.data.notes);
        setQuizzes(result.data.quizzes);
        setProgress(result.data.progress);
      } else {
        toast.error(result.error || "Erreur lors du chargement du module");
      }
    } catch (error) {
      console.error("Error loading module content:", error);
      toast.error("Erreur lors du chargement du module");
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsComplete = async () => {
    if (!confirm("Voulez-vous marquer ce module comme complété ?")) {
      return;
    }

    setMarkingComplete(true);
    try {
      const result = await markModuleAsLearnedAction(courseId, moduleId);
      if (result.success) {
        toast.success("Module marqué comme complété !");
        await loadModuleContent(); // Reload to update progress
      } else {
        toast.error(result.error || "Erreur lors de la mise à jour");
      }
    } catch (error) {
      console.error("Error marking module as complete:", error);
      toast.error("Erreur lors de la mise à jour");
    } finally {
      setMarkingComplete(false);
    }
  };

  const handleQuizAnswerChange = (quizId: string, questionId: string, answer: string) => {
    setQuizAnswers((prev) => ({
      ...prev,
      [quizId]: {
        ...prev[quizId],
        [questionId]: answer,
      },
    }));
  };

  const handleSubmitQuiz = async (quiz: Quiz) => {
    if (!quizAnswers[quiz.quiz.id] || Object.keys(quizAnswers[quiz.quiz.id]).length === 0) {
      toast.error("Veuillez répondre à toutes les questions");
      return;
    }

    // Check if all questions are answered
    const allAnswered = quiz.quiz.questions.every(
      (q) => quizAnswers[quiz.quiz.id]?.[q.id]
    );
    if (!allAnswered) {
      toast.error("Veuillez répondre à toutes les questions");
      return;
    }

    setSubmittingQuiz(quiz.quiz.id);
    try {
      const result = await submitQuizAttemptAction({
        quizId: quiz.quiz.id,
        answers: quizAnswers[quiz.quiz.id],
        timeSpent: 0, // Phase 1 quizzes don't track time
      });

      if (result.success && result.data) {
        setQuizSubmitted((prev) => ({ ...prev, [quiz.quiz.id]: true }));
        if (result.data.passed) {
          toast.success(`Quiz réussi ! Score: ${result.data.score}%`);
        } else {
          toast.warning(`Score: ${result.data.score}%. Note de passage: ${quiz.quiz.passingScore}%`);
        }
      } else {
        toast.error(result.error || "Erreur lors de la soumission");
      }
    } catch (error) {
      console.error("Error submitting quiz:", error);
      toast.error("Erreur lors de la soumission");
    } finally {
      setSubmittingQuiz(null);
    }
  };


  // Helper function to extract Vimeo embed URL (from FIN3500-platform)
  const getVimeoEmbedUrl = (vimeoUrl: string): string => {
    // If it's already a full embed URL with parameters, extract the src
    if (vimeoUrl.includes('player.vimeo.com')) {
      // Extract the src URL from iframe tag if it's wrapped in HTML
      const srcMatch = vimeoUrl.match(/src="([^"]+)"/);
      if (srcMatch) {
        return srcMatch[1].replace(/&amp;/g, '&');
      }
      // If it's just the URL, return it
      return vimeoUrl.replace(/&amp;/g, '&');
    }
    
    // Otherwise, extract the video ID and create a basic embed URL
    const vimeoIdMatch = vimeoUrl.match(/vimeo\.com\/(\d+)/);
    if (vimeoIdMatch) {
      return `https://player.vimeo.com/video/${vimeoIdMatch[1]}?autoplay=0&title=0&byline=0&portrait=0`;
    }
    
    return vimeoUrl;
  };

  // Helper function to map option keys to letters
  const getOptionLetter = (key: string, index: number): string => {
    if (/^[A-Z]$/i.test(key)) {
      return key.toUpperCase();
    }
    return String.fromCharCode(65 + index);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!module) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-muted-foreground">Module introuvable</p>
        </CardContent>
      </Card>
    );
  }

  const isCompleted = progress?.learnStatus === "LEARNED";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div className="flex-1 min-w-0">
          <Button variant="ghost" onClick={onBack} className="mb-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Retour
          </Button>
          <h1 className="text-xl sm:text-2xl font-bold break-words">{module.title}</h1>
          {module.description && (
            <p className="text-muted-foreground mt-2 break-words">{module.description}</p>
          )}
        </div>
        <div className="flex-shrink-0 w-full sm:w-auto">
          {isCompleted ? (
            <Badge variant="default" className="h-8 w-full sm:w-auto justify-center">
              <CheckCircle2 className="h-4 w-4 mr-2" />
              Complété
            </Badge>
          ) : (
            <Button 
              onClick={handleMarkAsComplete} 
              disabled={markingComplete}
              className="w-full sm:w-auto"
            >
              {markingComplete ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Enregistrement...
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Marquer comme complété
                </>
              )}
            </Button>
          )}
        </div>
      </div>

      {/* Content Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="videos">
            <VideoIcon className="h-4 w-4 mr-2" />
            Vidéos
          </TabsTrigger>
          <TabsTrigger value="notes">
            <FileText className="h-4 w-4 mr-2" />
            Notes du cours
          </TabsTrigger>
          <TabsTrigger value="quiz">
            <Play className="h-4 w-4 mr-2" />
            Quiz
          </TabsTrigger>
        </TabsList>

        {/* Videos Tab */}
        <TabsContent value="videos" className="mt-6">
          {videos.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-muted-foreground">Aucune vidéo disponible pour ce module.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {videos.map((videoItem) => {
                const embedUrl = getVimeoEmbedUrl(videoItem.video.vimeoUrl);
                return (
                  <Card key={videoItem.id}>
                    <CardContent className="pt-6">
                      <div style={{ padding: '56.25% 0 0 0', position: 'relative' }}>
                        <iframe
                          src={embedUrl}
                          frameBorder="0"
                          allow="autoplay; fullscreen; picture-in-picture; clipboard-write; encrypted-media; web-share"
                          referrerPolicy="strict-origin-when-cross-origin"
                          style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}
                          title={`Vidéo ${videoItem.order}`}
                        />
                      </div>
                      {videoItem.video.transcript && (
                        <div className="mt-4 p-4 bg-muted rounded-lg">
                          <div className="text-sm font-semibold mb-2">Transcription:</div>
                          <div className="text-sm whitespace-pre-wrap">{videoItem.video.transcript}</div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* Notes Tab */}
        <TabsContent value="notes" className="mt-6">
          {notes.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-muted-foreground">Aucune note disponible pour ce module.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {notes.map((noteItem) => (
                <Card key={noteItem.id}>
                  <CardHeader>
                    <CardTitle></CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div 
                      className="note-content [&>p]:mb-4 [&>p:last-child]:mb-0 [&>ul]:my-4 [&>ol]:my-4 [&>li]:mb-2 [&>h1]:text-2xl [&>h1]:font-bold [&>h1]:mt-6 [&>h1]:mb-4 [&>h2]:text-xl [&>h2]:font-bold [&>h2]:mt-6 [&>h2]:mb-4 [&>h3]:text-lg [&>h3]:font-semibold [&>h3]:mt-4 [&>h3]:mb-3 [&>strong]:font-semibold [&>em]:italic [&>a]:text-primary [&>a]:underline [&>a:hover]:no-underline [&>ul]:list-disc [&>ul]:pl-6 [&>ol]:list-decimal [&>ol]:pl-6 [&>li]:ml-4"
                      style={{
                        lineHeight: '1.75',
                      }}
                      dangerouslySetInnerHTML={{ __html: noteItem.note.content }} 
                    />
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Quiz Tab */}
        <TabsContent value="quiz" className="mt-6">
          {quizzes.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-muted-foreground">Aucun quiz disponible pour ce module.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-6">
              {quizzes.map((quizItem) => {
                const quiz = quizItem.quiz;
                const isSubmitted = quizSubmitted[quiz.id];
                const isSubmitting = submittingQuiz === quiz.id;
                const answers = quizAnswers[quiz.id] || {};
                const currentIndex = currentQuizIndex[quiz.id] || 0;
                const currentQuestion = quiz.questions[currentIndex];
                const totalQuestions = quiz.questions.length;

                const handlePrevious = () => {
                  if (currentIndex > 0) {
                    setCurrentQuizIndex((prev) => ({
                      ...prev,
                      [quiz.id]: currentIndex - 1,
                    }));
                  }
                };

                const handleNext = () => {
                  if (currentIndex < totalQuestions - 1) {
                    setCurrentQuizIndex((prev) => ({
                      ...prev,
                      [quiz.id]: currentIndex + 1,
                    }));
                  }
                };

                if (!currentQuestion) return null;

                const optionKeys = currentQuestion.options
                  ? Object.keys(currentQuestion.options).sort()
                  : [];
                const userAnswer = answers[currentQuestion.id];

                return (
                  <Card key={quizItem.id}>
                    <CardHeader>
                      <CardTitle>{quiz.title}</CardTitle>
                      <CardDescription>
                        Question {currentIndex + 1} / {totalQuestions} • Note de passage: {quiz.passingScore}%
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <div className="space-y-3">
                        <div className="font-semibold text-lg">
                          {currentQuestion.question}
                        </div>
                        <RadioGroup
                          value={userAnswer || ""}
                          onValueChange={(value) =>
                            handleQuizAnswerChange(quiz.id, currentQuestion.id, value)
                          }
                          disabled={isSubmitted}
                        >
                          {optionKeys.map((key, keyIndex) => {
                            const optionValue = currentQuestion.options[key];
                            const optionLetter = getOptionLetter(key, keyIndex);
                            return (
                              <div key={key} className="flex items-start space-x-3">
                                <RadioGroupItem value={key} id={`${currentQuestion.id}-${key}`} />
                                <Label
                                  htmlFor={`${currentQuestion.id}-${key}`}
                                  className="flex-1 cursor-pointer leading-relaxed"
                                >
                                  <span className="font-medium">{optionLetter}:</span> {optionValue}
                                </Label>
                              </div>
                            );
                          })}
                        </RadioGroup>
                      </div>

                      <div className="flex items-center justify-between pt-4 border-t">
                        <Button
                          variant="outline"
                          onClick={handlePrevious}
                          disabled={currentIndex === 0 || isSubmitted}
                        >
                          <ChevronLeft className="h-4 w-4 mr-2" />
                          Précédent
                        </Button>
                        <div className="text-sm text-muted-foreground">
                          {Object.keys(answers).length} / {totalQuestions} répondues
                        </div>
                        {currentIndex < totalQuestions - 1 ? (
                          <Button
                            variant="outline"
                            onClick={handleNext}
                            disabled={isSubmitted}
                          >
                            Suivant
                            <ChevronRight className="h-4 w-4 ml-2" />
                          </Button>
                        ) : (
                          <Button
                            onClick={() => handleSubmitQuiz(quizItem)}
                            disabled={isSubmitting || Object.keys(answers).length < totalQuestions}
                          >
                            {isSubmitting ? (
                              <>
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                Soumission...
                              </>
                            ) : (
                              "Soumettre le quiz"
                            )}
                          </Button>
                        )}
                      </div>

                      {isSubmitted && (
                        <div className="p-4 bg-muted rounded-lg text-center">
                          <p className="text-sm text-muted-foreground">Quiz soumis</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Student Notes Panel - At the bottom */}
      <Card className="border-primary/20 bg-primary/5">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <StickyNote className="h-4 w-4" />
              Mes notes
            </CardTitle>
            <div className="flex items-center gap-2">
              {noteSaved && (
                <span className="text-xs text-muted-foreground">Sauvegardé</span>
              )}
              <Button
                size="sm"
                onClick={handleSaveNote}
                disabled={savingNote}
                variant={noteSaved ? "outline" : "default"}
              >
                {savingNote ? (
                  <>
                    <Loader2 className="h-3 w-3 mr-2 animate-spin" />
                    Sauvegarde...
                  </>
                ) : (
                  <>
                    <Save className="h-3 w-3 mr-2" />
                    Sauvegarder
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Textarea
            value={studentNote}
            onChange={(e) => setStudentNote(e.target.value)}
            placeholder="Prenez vos notes ici pendant que vous étudiez ce module..."
            className="min-h-[120px] resize-y"
            rows={5}
          />
          <div className="flex items-center justify-between mt-2">
            <p className="text-xs text-muted-foreground">
              Vos notes sont sauvegardées lorsque vous cliquez sur "Sauvegarder"
            </p>
            {studentNote.length > 0 && (
              <p className="text-xs text-muted-foreground">
                {studentNote.length} caractère{studentNote.length > 1 ? 's' : ''}
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}


```

```typescriptreact
"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Loader2, Play, FileText, CheckCircle2, ArrowLeft, Video as VideoIcon } from "lucide-react";
import { toast } from "sonner";
import { getModuleContentAction } from "@/app/actions/module-content";
import { markModuleAsLearnedAction } from "@/app/actions/study-plan";
import { submitQuizAttemptAction } from "@/app/actions/quizzes";
import { getStudentModuleNoteAction, saveStudentModuleNoteAction } from "@/app/actions/student-notes";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { ChevronLeft, ChevronRight, StickyNote, Save } from "lucide-react";

interface ModuleDetailPageProps {
  courseId: string;
  moduleId: string;
  onBack: () => void;
}

type Video = {
  id: string;
  order: number;
  video: {
    id: string;
    vimeoUrl: string;
    duration: number | null;
    transcript: string | null;
  };
};

type Note = {
  id: string;
  order: number;
  note: {
    id: string;
    content: string;
  };
};

type Quiz = {
  id: string;
  order: number;
  quiz: {
    id: string;
    title: string;
    passingScore: number;
    timeLimit: number | null;
    questions: Array<{
      id: string;
      order: number;
      question: string;
      options: Record<string, string>;
      correctAnswer: string;
    }>;
  };
};

export function ModuleDetailPage({ courseId, moduleId, onBack }: ModuleDetailPageProps) {
  const [loading, setLoading] = useState(true);
  const [module, setModule] = useState<any>(null);
  const [videos, setVideos] = useState<Video[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [progress, setProgress] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<"videos" | "notes" | "quiz">("videos");
  const [quizAnswers, setQuizAnswers] = useState<Record<string, Record<string, string>>>({});
  const [quizSubmitted, setQuizSubmitted] = useState<Record<string, boolean>>({});
  const [submittingQuiz, setSubmittingQuiz] = useState<string | null>(null);
  const [markingComplete, setMarkingComplete] = useState(false);
  const [currentQuizIndex, setCurrentQuizIndex] = useState<Record<string, number>>({});
  const [studentNote, setStudentNote] = useState<string>("");
  const [savingNote, setSavingNote] = useState(false);
  const [noteSaved, setNoteSaved] = useState(false);

  useEffect(() => {
    loadModuleContent();
    loadStudentNote();
    
    // Check URL parameters for tab
    const params = new URLSearchParams(window.location.search);
    const tab = params.get('tab');
    if (tab === 'videos' || tab === 'notes' || tab === 'quiz') {
      setActiveTab(tab);
    }
  }, [moduleId]);

  const loadStudentNote = async () => {
    try {
      const result = await getStudentModuleNoteAction(moduleId);
      if (result.success && result.data) {
        setStudentNote(result.data.content || "");
        setNoteSaved(result.data.exists);
      }
    } catch (error) {
      console.error("Error loading student note:", error);
    }
  };

  const handleSaveNote = async () => {
    setSavingNote(true);
    try {
      const result = await saveStudentModuleNoteAction(moduleId, studentNote);
      if (result.success) {
        setNoteSaved(true);
        toast.success("Note sauvegardée");
        // Reset the saved indicator after 2 seconds
        setTimeout(() => setNoteSaved(false), 2000);
      } else {
        toast.error(result.error || "Erreur lors de la sauvegarde");
      }
    } catch (error) {
      console.error("Error saving note:", error);
      toast.error("Erreur lors de la sauvegarde");
    } finally {
      setSavingNote(false);
    }
  };

  const loadModuleContent = async () => {
    setLoading(true);
    try {
      const result = await getModuleContentAction(moduleId);
      if (result.success && result.data) {
        setModule(result.data.module);
        setVideos(result.data.videos);
        setNotes(result.data.notes);
        setQuizzes(result.data.quizzes);
        setProgress(result.data.progress);
      } else {
        toast.error(result.error || "Erreur lors du chargement du module");
      }
    } catch (error) {
      console.error("Error loading module content:", error);
      toast.error("Erreur lors du chargement du module");
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsComplete = async () => {
    if (!confirm("Voulez-vous marquer ce module comme complété ?")) {
      return;
    }

    setMarkingComplete(true);
    try {
      const result = await markModuleAsLearnedAction(courseId, moduleId);
      if (result.success) {
        toast.success("Module marqué comme complété !");
        await loadModuleContent(); // Reload to update progress
      } else {
        toast.error(result.error || "Erreur lors de la mise à jour");
      }
    } catch (error) {
      console.error("Error marking module as complete:", error);
      toast.error("Erreur lors de la mise à jour");
    } finally {
      setMarkingComplete(false);
    }
  };

  const handleQuizAnswerChange = (quizId: string, questionId: string, answer: string) => {
    setQuizAnswers((prev) => ({
      ...prev,
      [quizId]: {
        ...prev[quizId],
        [questionId]: answer,
      },
    }));
  };

  const handleSubmitQuiz = async (quiz: Quiz) => {
    if (!quizAnswers[quiz.quiz.id] || Object.keys(quizAnswers[quiz.quiz.id]).length === 0) {
      toast.error("Veuillez répondre à toutes les questions");
      return;
    }

    // Check if all questions are answered
    const allAnswered = quiz.quiz.questions.every(
      (q) => quizAnswers[quiz.quiz.id]?.[q.id]
    );
    if (!allAnswered) {
      toast.error("Veuillez répondre à toutes les questions");
      return;
    }

    setSubmittingQuiz(quiz.quiz.id);
    try {
      const result = await submitQuizAttemptAction({
        quizId: quiz.quiz.id,
        answers: quizAnswers[quiz.quiz.id],
        timeSpent: 0, // Phase 1 quizzes don't track time
      });

      if (result.success && result.data) {
        setQuizSubmitted((prev) => ({ ...prev, [quiz.quiz.id]: true }));
        if (result.data.passed) {
          toast.success(`Quiz réussi ! Score: ${result.data.score}%`);
        } else {
          toast.warning(`Score: ${result.data.score}%. Note de passage: ${quiz.quiz.passingScore}%`);
        }
      } else {
        toast.error(result.error || "Erreur lors de la soumission");
      }
    } catch (error) {
      console.error("Error submitting quiz:", error);
      toast.error("Erreur lors de la soumission");
    } finally {
      setSubmittingQuiz(null);
    }
  };


  // Helper function to extract Vimeo embed URL (from FIN3500-platform)
  const getVimeoEmbedUrl = (vimeoUrl: string): string => {
    // If it's already a full embed URL with parameters, extract the src
    if (vimeoUrl.includes('player.vimeo.com')) {
      // Extract the src URL from iframe tag if it's wrapped in HTML
      const srcMatch = vimeoUrl.match(/src="([^"]+)"/);
      if (srcMatch) {
        return srcMatch[1].replace(/&amp;/g, '&');
      }
      // If it's just the URL, return it
      return vimeoUrl.replace(/&amp;/g, '&');
    }
    
    // Otherwise, extract the video ID and create a basic embed URL
    const vimeoIdMatch = vimeoUrl.match(/vimeo\.com\/(\d+)/);
    if (vimeoIdMatch) {
      return `https://player.vimeo.com/video/${vimeoIdMatch[1]}?autoplay=0&title=0&byline=0&portrait=0`;
    }
    
    return vimeoUrl;
  };

  // Helper function to map option keys to letters
  const getOptionLetter = (key: string, index: number): string => {
    if (/^[A-Z]$/i.test(key)) {
      return key.toUpperCase();
    }
    return String.fromCharCode(65 + index);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!module) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-muted-foreground">Module introuvable</p>
        </CardContent>
      </Card>
    );
  }

  const isCompleted = progress?.learnStatus === "LEARNED";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div className="flex-1 min-w-0">
          <Button variant="ghost" onClick={onBack} className="mb-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Retour
          </Button>
          <h1 className="text-xl sm:text-2xl font-bold break-words">{module.title}</h1>
          {module.description && (
            <p className="text-muted-foreground mt-2 break-words">{module.description}</p>
          )}
        </div>
        <div className="flex-shrink-0 w-full sm:w-auto">
          {isCompleted ? (
            <Badge variant="default" className="h-8 w-full sm:w-auto justify-center">
              <CheckCircle2 className="h-4 w-4 mr-2" />
              Complété
            </Badge>
          ) : (
            <Button 
              onClick={handleMarkAsComplete} 
              disabled={markingComplete}
              className="w-full sm:w-auto"
            >
              {markingComplete ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Enregistrement...
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Marquer comme complété
                </>
              )}
            </Button>
          )}
        </div>
      </div>

      {/* Content Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="videos">
            <VideoIcon className="h-4 w-4 mr-2" />
            Vidéos
          </TabsTrigger>
          <TabsTrigger value="notes">
            <FileText className="h-4 w-4 mr-2" />
            Notes du cours
          </TabsTrigger>
          <TabsTrigger value="quiz">
            <Play className="h-4 w-4 mr-2" />
            Quiz
          </TabsTrigger>
        </TabsList>

        {/* Videos Tab */}
        <TabsContent value="videos" className="mt-6">
          {videos.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-muted-foreground">Aucune vidéo disponible pour ce module.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {videos.map((videoItem) => {
                const embedUrl = getVimeoEmbedUrl(videoItem.video.vimeoUrl);
                return (
                  <Card key={videoItem.id}>
                    <CardContent className="pt-6">
                      <div style={{ padding: '56.25% 0 0 0', position: 'relative' }}>
                        <iframe
                          src={embedUrl}
                          frameBorder="0"
                          allow="autoplay; fullscreen; picture-in-picture; clipboard-write; encrypted-media; web-share"
                          referrerPolicy="strict-origin-when-cross-origin"
                          style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}
                          title={`Vidéo ${videoItem.order}`}
                        />
                      </div>
                      {videoItem.video.transcript && (
                        <div className="mt-4 p-4 bg-muted rounded-lg">
                          <div className="text-sm font-semibold mb-2">Transcription:</div>
                          <div className="text-sm whitespace-pre-wrap">{videoItem.video.transcript}</div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* Notes Tab */}
        <TabsContent value="notes" className="mt-6">
          {notes.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-muted-foreground">Aucune note disponible pour ce module.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {notes.map((noteItem) => (
                <Card key={noteItem.id}>
                  <CardHeader>
                    <CardTitle></CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div 
                      className="note-content [&>p]:mb-4 [&>p:last-child]:mb-0 [&>ul]:my-4 [&>ol]:my-4 [&>li]:mb-2 [&>h1]:text-2xl [&>h1]:font-bold [&>h1]:mt-6 [&>h1]:mb-4 [&>h2]:text-xl [&>h2]:font-bold [&>h2]:mt-6 [&>h2]:mb-4 [&>h3]:text-lg [&>h3]:font-semibold [&>h3]:mt-4 [&>h3]:mb-3 [&>strong]:font-semibold [&>em]:italic [&>a]:text-primary [&>a]:underline [&>a:hover]:no-underline [&>ul]:list-disc [&>ul]:pl-6 [&>ol]:list-decimal [&>ol]:pl-6 [&>li]:ml-4"
                      style={{
                        lineHeight: '1.75',
                      }}
                      dangerouslySetInnerHTML={{ __html: noteItem.note.content }} 
                    />
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Quiz Tab */}
        <TabsContent value="quiz" className="mt-6">
          {quizzes.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-muted-foreground">Aucun quiz disponible pour ce module.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-6">
              {quizzes.map((quizItem) => {
                const quiz = quizItem.quiz;
                const isSubmitted = quizSubmitted[quiz.id];
                const isSubmitting = submittingQuiz === quiz.id;
                const answers = quizAnswers[quiz.id] || {};
                const currentIndex = currentQuizIndex[quiz.id] || 0;
                const currentQuestion = quiz.questions[currentIndex];
                const totalQuestions = quiz.questions.length;

                const handlePrevious = () => {
                  if (currentIndex > 0) {
                    setCurrentQuizIndex((prev) => ({
                      ...prev,
                      [quiz.id]: currentIndex - 1,
                    }));
                  }
                };

                const handleNext = () => {
                  if (currentIndex < totalQuestions - 1) {
                    setCurrentQuizIndex((prev) => ({
                      ...prev,
                      [quiz.id]: currentIndex + 1,
                    }));
                  }
                };

                if (!currentQuestion) return null;

                const optionKeys = currentQuestion.options
                  ? Object.keys(currentQuestion.options).sort()
                  : [];
                const userAnswer = answers[currentQuestion.id];

                return (
                  <Card key={quizItem.id}>
                    <CardHeader>
                      <CardTitle>{quiz.title}</CardTitle>
                      <CardDescription>
                        Question {currentIndex + 1} / {totalQuestions} • Note de passage: {quiz.passingScore}%
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <div className="space-y-3">
                        <div className="font-semibold text-lg">
                          {currentQuestion.question}
                        </div>
                        <RadioGroup
                          value={userAnswer || ""}
                          onValueChange={(value) =>
                            handleQuizAnswerChange(quiz.id, currentQuestion.id, value)
                          }
                          disabled={isSubmitted}
                        >
                          {optionKeys.map((key, keyIndex) => {
                            const optionValue = currentQuestion.options[key];
                            const optionLetter = getOptionLetter(key, keyIndex);
                            return (
                              <div key={key} className="flex items-start space-x-3">
                                <RadioGroupItem value={key} id={`${currentQuestion.id}-${key}`} />
                                <Label
                                  htmlFor={`${currentQuestion.id}-${key}`}
                                  className="flex-1 cursor-pointer leading-relaxed"
                                >
                                  <span className="font-medium">{optionLetter}:</span> {optionValue}
                                </Label>
                              </div>
                            );
                          })}
                        </RadioGroup>
                      </div>

                      <div className="pt-4 border-t space-y-3">
                        <div className="text-sm text-muted-foreground text-center">
                          {Object.keys(answers).length} / {totalQuestions} répondues
                        </div>
                        <div className="flex items-center justify-between gap-2">
                          <Button
                            variant="outline"
                            onClick={handlePrevious}
                            disabled={currentIndex === 0 || isSubmitted}
                            className="flex-1 sm:flex-initial"
                          >
                            <ChevronLeft className="h-4 w-4 mr-2" />
                            Précédent
                          </Button>
                          {currentIndex < totalQuestions - 1 ? (
                            <Button
                              variant="outline"
                              onClick={handleNext}
                              disabled={isSubmitted}
                              className="flex-1 sm:flex-initial"
                            >
                              Suivant
                              <ChevronRight className="h-4 w-4 ml-2" />
                            </Button>
                          ) : (
                            <Button
                              onClick={() => handleSubmitQuiz(quizItem)}
                              disabled={isSubmitting || Object.keys(answers).length < totalQuestions}
                              className="flex-1 sm:flex-initial"
                            >
                              {isSubmitting ? (
                                <>
                                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                  Soumission...
                                </>
                              ) : (
                                "Soumettre le quiz"
                              )}
                            </Button>
                          )}
                        </div>
                      </div>

                      {isSubmitted && (
                        <div className="p-4 bg-muted rounded-lg text-center">
                          <p className="text-sm text-muted-foreground">Quiz soumis</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Student Notes Panel - At the bottom */}
      <Card className="border-primary/20 bg-primary/5">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <StickyNote className="h-4 w-4" />
              Mes notes
            </CardTitle>
            <div className="flex items-center gap-2">
              {noteSaved && (
                <span className="text-xs text-muted-foreground">Sauvegardé</span>
              )}
              <Button
                size="sm"
                onClick={handleSaveNote}
                disabled={savingNote}
                variant={noteSaved ? "outline" : "default"}
              >
                {savingNote ? (
                  <>
                    <Loader2 className="h-3 w-3 mr-2 animate-spin" />
                    Sauvegarde...
                  </>
                ) : (
                  <>
                    <Save className="h-3 w-3 mr-2" />
                    Sauvegarder
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Textarea
            value={studentNote}
            onChange={(e) => setStudentNote(e.target.value)}
            placeholder="Prenez vos notes ici pendant que vous étudiez ce module..."
            className="min-h-[120px] resize-y"
            rows={5}
          />
          <div className="flex items-center justify-between mt-2">
            <p className="text-xs text-muted-foreground">
              Vos notes sont sauvegardées lorsque vous cliquez sur "Sauvegarder"
            </p>
            {studentNote.length > 0 && (
              <p className="text-xs text-muted-foreground">
                {studentNote.length} caractère{studentNote.length > 1 ? 's' : ''}
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}


```


Fixed both issues in the Phase 1 quiz section:

1. **"Répondues" counter on separate row**: Moved the counter above the navigation buttons. It now appears on its own centered row instead of being squeezed between the buttons.

2. **Increased line height for multiple choice options**: Added `leading-relaxed` to the Label elements so the options have more vertical spacing and aren't squeezed together.

3. **Responsive buttons**: The Previous/Next buttons are full width on mobile (`flex-1 sm:flex-initial`) for better touch targets, and auto-width on larger screens.

The layout now stacks properly on mobile:
- Question text
- Multiple choice options (with better spacing)
- "X / Y répondues" counter (centered, on its own row)
- Navigation buttons (Previous/Next or Submit)

---

**User**

Can you view the browser? 

---

**Cursor**


I can't view your browser or access your screen. I can help in other ways:

1. **Review code** — I can read and analyze your code files
2. **Debug issues** — Describe what you see and I can help identify and fix problems
3. **Suggest changes** — I can propose code modifications based on your description
4. **Answer questions** — I can explain how components work or why something behaves a certain way

If you want me to make code changes, switch to agent mode (or I can provide the code for you to apply).

What would you like help with? Are you seeing a specific issue in the browser that you'd like me to investigate?

---

**User**

please fix the tab in phase 2 so they appear clearly on mobile

---

**Cursor**


Searching for the Phase 2 component to fix the mobile tab styling:



Reading the Phase 2 review component:



Fixing mobile tab styling: text is too long and gets squeezed. Making the tabs more mobile-friendly:


```typescriptreact
"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Brain, Play, Layers, BookOpen } from "lucide-react";
import { FlashcardComponent } from "./flashcard-component";
import { LearningActivitiesList } from "./learning-activities-list";
import { SmartReviewDashboard } from "./smart-review-dashboard";

interface Phase2ReviewProps {
  courseId: string;
  course: any;
  settings: any;
}

export function Phase2Review({ courseId, course, settings }: Phase2ReviewProps) {
  const [activeTab, setActiveTab] = useState<"smart-review" | "flashcards" | "activities">("smart-review");

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            Phase 2 - Révision et rappel actif
          </CardTitle>
          <CardDescription>
            Consolidation des connaissances via rappel actif et répétition espacée.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
            <TabsList className="grid w-full grid-cols-3 h-auto">
              <TabsTrigger value="smart-review" className="flex-col sm:flex-row gap-1 sm:gap-2 py-2 sm:py-1.5 text-xs sm:text-sm">
                <Play className="h-3.5 w-3.5 sm:h-4 sm:w-4 sm:mr-2" />
                <span className="hidden sm:inline">Révision intelligente</span>
                <span className="sm:hidden">Révision</span>
              </TabsTrigger>
              <TabsTrigger value="flashcards" className="flex-col sm:flex-row gap-1 sm:gap-2 py-2 sm:py-1.5 text-xs sm:text-sm">
                <Layers className="h-3.5 w-3.5 sm:h-4 sm:w-4 sm:mr-2" />
                Flashcards
              </TabsTrigger>
              <TabsTrigger value="activities" className="flex-col sm:flex-row gap-1 sm:gap-2 py-2 sm:py-1.5 text-xs sm:text-sm">
                <BookOpen className="h-3.5 w-3.5 sm:h-4 sm:w-4 sm:mr-2" />
                Activités
              </TabsTrigger>
            </TabsList>
            <TabsContent value="smart-review" className="mt-6">
              <SmartReviewDashboard courseId={courseId} course={course} settings={settings} />
            </TabsContent>
            <TabsContent value="flashcards" className="mt-6">
              <FlashcardComponent courseId={courseId} contentItemId="flashcards" />
            </TabsContent>
            <TabsContent value="activities" className="mt-6">
              <LearningActivitiesList courseId={courseId} />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}


```


Revising the approach: keeping tabs horizontal on mobile with better styling for readability:


```typescriptreact
"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Brain, Play, Layers, BookOpen } from "lucide-react";
import { FlashcardComponent } from "./flashcard-component";
import { LearningActivitiesList } from "./learning-activities-list";
import { SmartReviewDashboard } from "./smart-review-dashboard";

interface Phase2ReviewProps {
  courseId: string;
  course: any;
  settings: any;
}

export function Phase2Review({ courseId, course, settings }: Phase2ReviewProps) {
  const [activeTab, setActiveTab] = useState<"smart-review" | "flashcards" | "activities">("smart-review");

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            Phase 2 - Révision et rappel actif
          </CardTitle>
          <CardDescription>
            Consolidation des connaissances via rappel actif et répétition espacée.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
            <TabsList className="grid w-full grid-cols-3 h-auto gap-1">
              <TabsTrigger value="smart-review" className="flex items-center justify-center gap-1 sm:gap-2 py-2.5 sm:py-1.5 text-xs sm:text-sm px-1 sm:px-3 min-w-0">
                <Play className="h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0" />
                <span className="hidden sm:inline truncate">Révision intelligente</span>
                <span className="sm:hidden truncate">Révision</span>
              </TabsTrigger>
              <TabsTrigger value="flashcards" className="flex items-center justify-center gap-1 sm:gap-2 py-2.5 sm:py-1.5 text-xs sm:text-sm px-1 sm:px-3 min-w-0">
                <Layers className="h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0" />
                <span className="truncate">Flashcards</span>
              </TabsTrigger>
              <TabsTrigger value="activities" className="flex items-center justify-center gap-1 sm:gap-2 py-2.5 sm:py-1.5 text-xs sm:text-sm px-1 sm:px-3 min-w-0">
                <BookOpen className="h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0" />
                <span className="truncate">Activités</span>
              </TabsTrigger>
            </TabsList>
            <TabsContent value="smart-review" className="mt-6">
              <SmartReviewDashboard courseId={courseId} course={course} settings={settings} />
            </TabsContent>
            <TabsContent value="flashcards" className="mt-6">
              <FlashcardComponent courseId={courseId} contentItemId="flashcards" />
            </TabsContent>
            <TabsContent value="activities" className="mt-6">
              <LearningActivitiesList courseId={courseId} />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}


```


Updated the Phase 2 tabs for mobile. Changes:

1. **Smaller text on mobile**: `text-xs` on mobile, `text-sm` on larger screens
2. **Shorter label on mobile**: "Révision intelligente" becomes "Révision" on mobile
3. **Smaller icons on mobile**: Icons are `h-3.5 w-3.5` on mobile, `h-4 w-4` on larger screens
4. **Better spacing**: Added `gap-1` between tabs and adjusted padding
5. **Text truncation**: Added `truncate` and `min-w-0` to prevent overflow
6. **Icon protection**: Icons use `flex-shrink-0` so they don't shrink
7. **Touch-friendly padding**: `py-2.5` on mobile for better touch targets

The tabs should now be clearer and more readable on mobile while maintaining the full labels on larger screens.

---

**User**

remove the icon from phas 2 - Révision et rappel actif (see previous screenshot)

---

**Cursor**


Removing the icon from the "Phase 2 - Révision et rappel actif" title:


```typescriptreact
"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Brain, Play, Layers, BookOpen } from "lucide-react";
import { FlashcardComponent } from "./flashcard-component";
import { LearningActivitiesList } from "./learning-activities-list";
import { SmartReviewDashboard } from "./smart-review-dashboard";

interface Phase2ReviewProps {
  courseId: string;
  course: any;
  settings: any;
}

export function Phase2Review({ courseId, course, settings }: Phase2ReviewProps) {
  const [activeTab, setActiveTab] = useState<"smart-review" | "flashcards" | "activities">("smart-review");

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>
            Phase 2 - Révision et rappel actif
          </CardTitle>
          <CardDescription>
            Consolidation des connaissances via rappel actif et répétition espacée.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
            <TabsList className="grid w-full grid-cols-3 h-auto gap-1">
              <TabsTrigger value="smart-review" className="flex items-center justify-center gap-1 sm:gap-2 py-2.5 sm:py-1.5 text-xs sm:text-sm px-1 sm:px-3 min-w-0">
                <Play className="h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0" />
                <span className="hidden sm:inline truncate">Révision intelligente</span>
                <span className="sm:hidden truncate">Révision</span>
              </TabsTrigger>
              <TabsTrigger value="flashcards" className="flex items-center justify-center gap-1 sm:gap-2 py-2.5 sm:py-1.5 text-xs sm:text-sm px-1 sm:px-3 min-w-0">
                <Layers className="h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0" />
                <span className="truncate">Flashcards</span>
              </TabsTrigger>
              <TabsTrigger value="activities" className="flex items-center justify-center gap-1 sm:gap-2 py-2.5 sm:py-1.5 text-xs sm:text-sm px-1 sm:px-3 min-w-0">
                <BookOpen className="h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0" />
                <span className="truncate">Activités</span>
              </TabsTrigger>
            </TabsList>
            <TabsContent value="smart-review" className="mt-6">
              <SmartReviewDashboard courseId={courseId} course={course} settings={settings} />
            </TabsContent>
            <TabsContent value="flashcards" className="mt-6">
              <FlashcardComponent courseId={courseId} contentItemId="flashcards" />
            </TabsContent>
            <TabsContent value="activities" className="mt-6">
              <LearningActivitiesList courseId={courseId} />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}


```


Checking if the Brain icon is used elsewhere and removing the unused import:



Removing the unused Brain import:


```typescriptreact
"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Play, Layers, BookOpen } from "lucide-react";
import { FlashcardComponent } from "./flashcard-component";
import { LearningActivitiesList } from "./learning-activities-list";
import { SmartReviewDashboard } from "./smart-review-dashboard";

interface Phase2ReviewProps {
  courseId: string;
  course: any;
  settings: any;
}

export function Phase2Review({ courseId, course, settings }: Phase2ReviewProps) {
  const [activeTab, setActiveTab] = useState<"smart-review" | "flashcards" | "activities">("smart-review");

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>
            Phase 2 - Révision et rappel actif
          </CardTitle>
          <CardDescription>
            Consolidation des connaissances via rappel actif et répétition espacée.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
            <TabsList className="grid w-full grid-cols-3 h-auto gap-1">
              <TabsTrigger value="smart-review" className="flex items-center justify-center gap-1 sm:gap-2 py-2.5 sm:py-1.5 text-xs sm:text-sm px-1 sm:px-3 min-w-0">
                <Play className="h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0" />
                <span className="hidden sm:inline truncate">Révision intelligente</span>
                <span className="sm:hidden truncate">Révision</span>
              </TabsTrigger>
              <TabsTrigger value="flashcards" className="flex items-center justify-center gap-1 sm:gap-2 py-2.5 sm:py-1.5 text-xs sm:text-sm px-1 sm:px-3 min-w-0">
                <Layers className="h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0" />
                <span className="truncate">Flashcards</span>
              </TabsTrigger>
              <TabsTrigger value="activities" className="flex items-center justify-center gap-1 sm:gap-2 py-2.5 sm:py-1.5 text-xs sm:text-sm px-1 sm:px-3 min-w-0">
                <BookOpen className="h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0" />
                <span className="truncate">Activités</span>
              </TabsTrigger>
            </TabsList>
            <TabsContent value="smart-review" className="mt-6">
              <SmartReviewDashboard courseId={courseId} course={course} settings={settings} />
            </TabsContent>
            <TabsContent value="flashcards" className="mt-6">
              <FlashcardComponent courseId={courseId} contentItemId="flashcards" />
            </TabsContent>
            <TabsContent value="activities" className="mt-6">
              <LearningActivitiesList courseId={courseId} />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}


```


Removed the Brain icon from the "Phase 2 - Révision et rappel actif" title and cleaned up the unused import. The title now displays without an icon.

---

**User**

Also remove the icon from commencer une session de révision intelligente. Also increase the line height for the types d'items 

---

**Cursor**


Finding and updating the component that contains "Commencer une session de révision intelligente":



Removing the icon from the title and increasing line height for the item type checkboxes:


```typescriptreact
"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Play, Brain, Clock, TrendingUp, Filter } from "lucide-react";
import {
  startReviewSessionAction,
  getReviewStatisticsAction,
  type ReviewQueueItemWithRelations,
} from "@/app/actions/smart-review";
import { toast } from "sonner";
import { SmartReviewSession, type ReviewSessionStats } from "./smart-review-session";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { LearningActivityType } from "@prisma/client";

interface SmartReviewDashboardProps {
  courseId: string;
  course: any;
  settings: any;
}

export function SmartReviewDashboard({ courseId, course, settings }: SmartReviewDashboardProps) {
  const [statistics, setStatistics] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isStartingSession, setIsStartingSession] = useState(false);
  const [sessionData, setSessionData] = useState<{
    sessionId: string;
    items: ReviewQueueItemWithRelations[];
  } | null>(null);
  const [filters, setFilters] = useState({
    moduleId: undefined as string | undefined,
    activityType: undefined as LearningActivityType | undefined,
    includeFlashcards: true,
    includeActivities: true,
    includeQuizzes: false,
    limit: 20,
  });

  useEffect(() => {
    loadStatistics();
  }, [courseId]);

  const loadStatistics = async () => {
    try {
      const result = await getReviewStatisticsAction(courseId);
      if (result.success && result.data) {
        setStatistics(result.data);
      }
    } catch (error) {
      console.error("Error loading statistics:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleStartSession = async () => {
    setIsStartingSession(true);
    try {
      const result = await startReviewSessionAction(courseId, {
        moduleId: filters.moduleId,
        activityType: filters.activityType,
        includeFlashcards: filters.includeFlashcards,
        includeActivities: filters.includeActivities,
        includeQuizzes: filters.includeQuizzes,
        limit: filters.limit,
      });

      if (!result.success || !result.data) {
        toast.error(result.error || "Erreur lors du démarrage de la session");
        return;
      }

      if (result.data.items.length === 0) {
        toast.info("Aucun item de révision disponible pour le moment.");
        return;
      }

      setSessionData(result.data);
    } catch (error) {
      console.error("Error starting session:", error);
      toast.error("Une erreur est survenue");
    } finally {
      setIsStartingSession(false);
    }
  };

  const handleSessionComplete = (stats: ReviewSessionStats) => {
    toast.success(
      `Session terminée ! ${stats.itemsCompleted} items révisés en ${Math.floor(stats.timeSpent / 60)} minutes.`
    );
    setSessionData(null);
    loadStatistics(); // Refresh statistics
  };

  const handleSessionExit = () => {
    setSessionData(null);
  };

  // If session is active, show session component
  if (sessionData) {
    return (
      <SmartReviewSession
        courseId={courseId}
        initialItems={sessionData.items}
        sessionId={sessionData.sessionId}
        onComplete={handleSessionComplete}
        onExit={handleSessionExit}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Statistics Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Items à réviser</CardTitle>
            <Brain className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {isLoading ? "..." : statistics?.dueCount || 0}
            </div>
            {statistics && statistics.overdueCount > 0 && (
              <p className="text-xs text-destructive mt-1">
                {statistics.overdueCount} en retard
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">À venir</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {isLoading ? "..." : statistics?.upcomingCount || 0}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Items programmés</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Force mémoire</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {isLoading
                ? "..."
                : statistics
                ? `${Math.round(statistics.averageMemoryStrength * 100)}%`
                : "0%"}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Moyenne globale</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Modules</CardTitle>
            <Filter className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {isLoading ? "..." : statistics?.itemsByModule?.length || 0}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Modules avec items</p>
          </CardContent>
        </Card>
      </div>

      {/* Start Review Section */}
      <Card>
        <CardHeader>
          <CardTitle>
            Commencer une session de révision intelligente
          </CardTitle>
          <CardDescription>
            Les items seront présentés selon votre calendrier de répétition espacée.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Filters */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Filtres</span>
            </div>

            {/* Module Filter */}
            {course.modules && course.modules.length > 0 && (
              <div className="space-y-2">
                <Label>Module</Label>
                <Select
                  value={filters.moduleId || "all"}
                  onValueChange={(value) =>
                    setFilters({ ...filters, moduleId: value === "all" ? undefined : value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Tous les modules" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous les modules</SelectItem>
                    {course.modules.map((module: any) => (
                      <SelectItem key={module.id} value={module.id}>
                        {module.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Item Type Filters */}
            <div className="space-y-2">
              <Label>Types d'items</Label>
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="flashcards"
                    checked={filters.includeFlashcards}
                    onCheckedChange={(checked) =>
                      setFilters({ ...filters, includeFlashcards: checked as boolean })
                    }
                  />
                  <Label htmlFor="flashcards" className="font-normal cursor-pointer">
                    Flashcards
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="activities"
                    checked={filters.includeActivities}
                    onCheckedChange={(checked) =>
                      setFilters({ ...filters, includeActivities: checked as boolean })
                    }
                  />
                  <Label htmlFor="activities" className="font-normal cursor-pointer">
                    Activités d'apprentissage
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="quizzes"
                    checked={filters.includeQuizzes}
                    onCheckedChange={(checked) =>
                      setFilters({ ...filters, includeQuizzes: checked as boolean })
                    }
                  />
                  <Label htmlFor="quizzes" className="font-normal cursor-pointer">
                    Quiz
                  </Label>
                </div>
              </div>
            </div>
          </div>

          {/* Start Button */}
          <Button
            size="lg"
            className="w-full"
            onClick={handleStartSession}
            disabled={isStartingSession || isLoading}
          >
            <Play className="h-4 w-4 mr-2" />
            {isStartingSession ? "Démarrage..." : "Commencer la révision"}
          </Button>

          {statistics && statistics.dueCount === 0 && (
            <p className="text-sm text-muted-foreground text-center">
              Aucun item de révision disponible pour le moment. Continuez à apprendre pour débloquer
              des items de révision !
            </p>
          )}
        </CardContent>
      </Card>

      {/* Items by Module */}
      {statistics && statistics.itemsByModule && statistics.itemsByModule.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Items par module</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {statistics.itemsByModule.map((item: any) => (
                <div key={item.moduleId} className="flex items-center justify-between">
                  <span className="text-sm">{item.moduleTitle}</span>
                  <Badge variant="secondary">{item.count} items</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}


```

```typescriptreact
"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Play, Brain, Clock, TrendingUp, Filter } from "lucide-react";
import {
  startReviewSessionAction,
  getReviewStatisticsAction,
  type ReviewQueueItemWithRelations,
} from "@/app/actions/smart-review";
import { toast } from "sonner";
import { SmartReviewSession, type ReviewSessionStats } from "./smart-review-session";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { LearningActivityType } from "@prisma/client";

interface SmartReviewDashboardProps {
  courseId: string;
  course: any;
  settings: any;
}

export function SmartReviewDashboard({ courseId, course, settings }: SmartReviewDashboardProps) {
  const [statistics, setStatistics] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isStartingSession, setIsStartingSession] = useState(false);
  const [sessionData, setSessionData] = useState<{
    sessionId: string;
    items: ReviewQueueItemWithRelations[];
  } | null>(null);
  const [filters, setFilters] = useState({
    moduleId: undefined as string | undefined,
    activityType: undefined as LearningActivityType | undefined,
    includeFlashcards: true,
    includeActivities: true,
    includeQuizzes: false,
    limit: 20,
  });

  useEffect(() => {
    loadStatistics();
  }, [courseId]);

  const loadStatistics = async () => {
    try {
      const result = await getReviewStatisticsAction(courseId);
      if (result.success && result.data) {
        setStatistics(result.data);
      }
    } catch (error) {
      console.error("Error loading statistics:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleStartSession = async () => {
    setIsStartingSession(true);
    try {
      const result = await startReviewSessionAction(courseId, {
        moduleId: filters.moduleId,
        activityType: filters.activityType,
        includeFlashcards: filters.includeFlashcards,
        includeActivities: filters.includeActivities,
        includeQuizzes: filters.includeQuizzes,
        limit: filters.limit,
      });

      if (!result.success || !result.data) {
        toast.error(result.error || "Erreur lors du démarrage de la session");
        return;
      }

      if (result.data.items.length === 0) {
        toast.info("Aucun item de révision disponible pour le moment.");
        return;
      }

      setSessionData(result.data);
    } catch (error) {
      console.error("Error starting session:", error);
      toast.error("Une erreur est survenue");
    } finally {
      setIsStartingSession(false);
    }
  };

  const handleSessionComplete = (stats: ReviewSessionStats) => {
    toast.success(
      `Session terminée ! ${stats.itemsCompleted} items révisés en ${Math.floor(stats.timeSpent / 60)} minutes.`
    );
    setSessionData(null);
    loadStatistics(); // Refresh statistics
  };

  const handleSessionExit = () => {
    setSessionData(null);
  };

  // If session is active, show session component
  if (sessionData) {
    return (
      <SmartReviewSession
        courseId={courseId}
        initialItems={sessionData.items}
        sessionId={sessionData.sessionId}
        onComplete={handleSessionComplete}
        onExit={handleSessionExit}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Statistics Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Items à réviser</CardTitle>
            <Brain className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {isLoading ? "..." : statistics?.dueCount || 0}
            </div>
            {statistics && statistics.overdueCount > 0 && (
              <p className="text-xs text-destructive mt-1">
                {statistics.overdueCount} en retard
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">À venir</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {isLoading ? "..." : statistics?.upcomingCount || 0}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Items programmés</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Force mémoire</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {isLoading
                ? "..."
                : statistics
                ? `${Math.round(statistics.averageMemoryStrength * 100)}%`
                : "0%"}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Moyenne globale</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Modules</CardTitle>
            <Filter className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {isLoading ? "..." : statistics?.itemsByModule?.length || 0}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Modules avec items</p>
          </CardContent>
        </Card>
      </div>

      {/* Start Review Section */}
      <Card>
        <CardHeader>
          <CardTitle>
            Commencer une session de révision intelligente
          </CardTitle>
          <CardDescription>
            Les items seront présentés selon votre calendrier de répétition espacée.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Filters */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Filtres</span>
            </div>

            {/* Module Filter */}
            {course.modules && course.modules.length > 0 && (
              <div className="space-y-2">
                <Label>Module</Label>
                <Select
                  value={filters.moduleId || "all"}
                  onValueChange={(value) =>
                    setFilters({ ...filters, moduleId: value === "all" ? undefined : value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Tous les modules" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous les modules</SelectItem>
                    {course.modules.map((module: any) => (
                      <SelectItem key={module.id} value={module.id}>
                        {module.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Item Type Filters */}
            <div className="space-y-2">
              <Label>Types d'items</Label>
              <div className="space-y-2">
                <div className="flex items-center space-x-2 leading-relaxed">
                  <Checkbox
                    id="flashcards"
                    checked={filters.includeFlashcards}
                    onCheckedChange={(checked) =>
                      setFilters({ ...filters, includeFlashcards: checked as boolean })
                    }
                  />
                  <Label htmlFor="flashcards" className="font-normal cursor-pointer leading-relaxed">
                    Flashcards
                  </Label>
                </div>
                <div className="flex items-center space-x-2 leading-relaxed">
                  <Checkbox
                    id="activities"
                    checked={filters.includeActivities}
                    onCheckedChange={(checked) =>
                      setFilters({ ...filters, includeActivities: checked as boolean })
                    }
                  />
                  <Label htmlFor="activities" className="font-normal cursor-pointer leading-relaxed">
                    Activités d'apprentissage
                  </Label>
                </div>
                <div className="flex items-center space-x-2 leading-relaxed">
                  <Checkbox
                    id="quizzes"
                    checked={filters.includeQuizzes}
                    onCheckedChange={(checked) =>
                      setFilters({ ...filters, includeQuizzes: checked as boolean })
                    }
                  />
                  <Label htmlFor="quizzes" className="font-normal cursor-pointer leading-relaxed">
                    Quiz
                  </Label>
                </div>
              </div>
            </div>
          </div>

          {/* Start Button */}
          <Button
            size="lg"
            className="w-full"
            onClick={handleStartSession}
            disabled={isStartingSession || isLoading}
          >
            <Play className="h-4 w-4 mr-2" />
            {isStartingSession ? "Démarrage..." : "Commencer la révision"}
          </Button>

          {statistics && statistics.dueCount === 0 && (
            <p className="text-sm text-muted-foreground text-center">
              Aucun item de révision disponible pour le moment. Continuez à apprendre pour débloquer
              des items de révision !
            </p>
          )}
        </CardContent>
      </Card>

      {/* Items by Module */}
      {statistics && statistics.itemsByModule && statistics.itemsByModule.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Items par module</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {statistics.itemsByModule.map((item: any) => (
                <div key={item.moduleId} className="flex items-center justify-between">
                  <span className="text-sm">{item.moduleTitle}</span>
                  <Badge variant="secondary">{item.count} items</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}


```


Checking if the Play icon is still used elsewhere in the file:



The Play icon is still used in the button, so we'll keep the import. Checking for linting errors:



Made both changes:

1. **Removed the icon** from "Commencer une session de révision intelligente" — the Play icon is no longer shown in the title.

2. **Increased line height** for the "Types d'items" checkboxes — added `leading-relaxed` to the checkbox container divs and labels for better spacing.

The checkboxes (Flashcards, Activités d'apprentissage, Quiz) now have more vertical spacing and are easier to read on mobile.

---

**User**

Can you make the next, previous, réinitialiser buttons responsive on mobile

---

**Cursor**


Searching for the component with the Previous, Reset, and Next buttons:



Reading the flashcard component file:



Making the navigation buttons responsive on mobile:


```typescriptreact
"use client";

import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createFlashcardStudySessionAction } from "@/app/actions/flashcards";
import { toast } from "sonner";
import { RotateCcw, ThumbsUp, ThumbsDown, Loader2, Shuffle } from "lucide-react";
import { useFlashcards } from "@/lib/hooks/use-flashcards";
import { useCourseModules } from "@/lib/hooks/use-learning-activities";

interface FlashcardComponentProps {
  courseId: string;
  contentItemId: string;
  reviewMode?: boolean;
}

export function FlashcardComponent({ courseId, contentItemId }: FlashcardComponentProps) {
  const [flashcards, setFlashcards] = useState<any[]>([]);
  const [selectedModuleId, setSelectedModuleId] = useState<string | null>(null);
  const [randomMode, setRandomMode] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [studied, setStudied] = useState<Set<string>>(new Set());

  // Use React Query for flashcards and modules
  const { data: flashcardsResult, isLoading: flashcardsLoading } = useFlashcards(courseId);
  const { data: modulesData, isLoading: modulesLoading } = useCourseModules(courseId);

  const allFlashcards = useMemo(() => {
    if (!flashcardsResult?.success || !flashcardsResult.data) return [];
    return flashcardsResult.data.map((card: any) => ({
      ...card,
      moduleId: card.moduleId ?? null,
    }));
  }, [flashcardsResult]);

  const modules = (modulesData || []) as Array<{ id: string; title: string }>;
  const loading = flashcardsLoading || modulesLoading;

  useEffect(() => {
    filterFlashcards();
  }, [selectedModuleId, randomMode, allFlashcards]);


  const filterFlashcards = () => {
    let filtered = [...allFlashcards];

    if (selectedModuleId) {
      filtered = filtered.filter((card) => {
        // Handle both null and undefined moduleId
        const cardModuleId = card.moduleId ?? null;
        return cardModuleId === selectedModuleId;
      });
    }

    if (randomMode) {
      // Shuffle array
      filtered = filtered.sort(() => Math.random() - 0.5);
    }

    setFlashcards(filtered);
    setCurrentIndex(0);
    setIsFlipped(false);
  };

  const handleFlip = () => {
    setIsFlipped(!isFlipped);
  };

  const handleDifficulty = async (difficulty: "EASY" | "DIFFICULT") => {
    const currentCard = flashcards[currentIndex];
    if (!currentCard) return;

    try {
      await createFlashcardStudySessionAction({
        flashcardId: currentCard.id,
        difficulty,
      });

      setStudied((prev) => new Set(prev).add(currentCard.id));

      if (currentIndex < flashcards.length - 1) {
        setCurrentIndex(currentIndex + 1);
        setIsFlipped(false);
      } else {
        toast.success("Toutes les flashcards ont été étudiées!");
      }
    } catch (error) {
      toast.error("Erreur lors de l'enregistrement");
    }
  };

  const handleNext = () => {
    if (currentIndex < flashcards.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setIsFlipped(false);
    }
  };

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
      setIsFlipped(false);
    }
  };

  const handleReset = () => {
    setCurrentIndex(0);
    setIsFlipped(false);
    setStudied(new Set());
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (flashcards.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-muted-foreground">Aucune flashcard disponible</p>
        </CardContent>
      </Card>
    );
  }

  const currentCard = flashcards[currentIndex];
  const progress = ((currentIndex + 1) / flashcards.length) * 100;

  return (
    <>
      <style jsx>{`
        .perspective-1000 {
          perspective: 1000px;
        }
        .transform-style-preserve-3d {
          transform-style: preserve-3d;
        }
        .backface-hidden {
          backface-visibility: hidden;
        }
        .rotate-y-180 {
          transform: rotateY(180deg);
        }
      `}</style>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between mb-4">
            <CardTitle>Flashcards</CardTitle>
            <Badge variant="outline">
              {currentIndex + 1} / {flashcards.length}
            </Badge>
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <Select
              value={selectedModuleId || "all"}
              onValueChange={(value) => {
                setSelectedModuleId(value === "all" ? null : value);
                setRandomMode(false);
              }}
            >
              <SelectTrigger className="flex-1">
                <SelectValue placeholder="Tous les modules" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les modules</SelectItem>
                {modules.map((module) => (
                  <SelectItem key={module.id} value={module.id}>
                    {module.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              variant={randomMode ? "default" : "outline"}
              onClick={() => {
                setRandomMode(!randomMode);
                if (!randomMode) {
                  setSelectedModuleId(null);
                }
              }}
              className="flex items-center gap-2"
            >
              <Shuffle className="h-4 w-4" />
              Aléatoire
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Progress */}
          <div className="w-full bg-muted rounded-full h-2">
            <div
              className="bg-primary h-2 rounded-full transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>

          {/* Flashcard */}
          <div
            className="relative h-64 cursor-pointer perspective-1000"
            onClick={handleFlip}
          >
            <div
              className={`relative w-full h-full transition-transform duration-500 transform-style-preserve-3d ${
                isFlipped ? "rotate-y-180" : ""
              }`}
            >
              {/* Front */}
              <div
                className={`absolute inset-0 backface-hidden ${
                  isFlipped ? "opacity-0 pointer-events-none" : "opacity-100"
                }`}
              >
                <Card className="h-full flex items-center justify-center">
                  <CardContent className="text-center p-6">
                    <p className="text-lg font-medium">{currentCard.front}</p>
                    <p className="text-sm text-muted-foreground mt-4">
                      Cliquez pour retourner
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Back */}
              <div
                className={`absolute inset-0 backface-hidden rotate-y-180 ${
                  isFlipped ? "opacity-100" : "opacity-0 pointer-events-none"
                }`}
              >
                <Card className="h-full flex items-center justify-center bg-primary text-primary-foreground">
                  <CardContent className="text-center p-6">
                    <p className="text-lg font-medium">{currentCard.back}</p>
                    <p className="text-sm opacity-80 mt-4">
                      Cliquez pour retourner
                    </p>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>

        {/* Controls */}
        {isFlipped && (
          <div className="flex gap-2 justify-center">
            <Button
              variant="outline"
              onClick={() => handleDifficulty("EASY")}
              className="flex-1"
            >
              <ThumbsUp className="h-4 w-4 mr-2" />
              Facile
            </Button>
            <Button
              variant="outline"
              onClick={() => handleDifficulty("DIFFICULT")}
              className="flex-1"
            >
              <ThumbsDown className="h-4 w-4 mr-2" />
              Difficile
            </Button>
          </div>
        )}

        {/* Navigation */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 sm:gap-0 pt-4 border-t">
          <Button
            variant="outline"
            onClick={handlePrevious}
            disabled={currentIndex === 0}
            className="flex-1 sm:flex-initial"
          >
            ← Précédent
          </Button>
          <Button 
            variant="outline" 
            onClick={handleReset} 
            size="sm"
            className="flex-1 sm:flex-initial"
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            Réinitialiser
          </Button>
          <Button
            variant="outline"
            onClick={handleNext}
            disabled={currentIndex === flashcards.length - 1}
            className="flex-1 sm:flex-initial"
          >
            Suivant →
          </Button>
        </div>
      </CardContent>
    </Card>
    </>
  );
}


```


Made the navigation buttons responsive on mobile. Changes:

1. **Stacked layout on mobile**: Changed from `flex-row` to `flex-col sm:flex-row` so buttons stack vertically on mobile and remain horizontal on larger screens.

2. **Equal width on mobile**: Added `flex-1` to all buttons on mobile so they take equal width when stacked, and `sm:flex-initial` to restore natural width on larger screens.

3. **Better spacing**: Added `gap-2` for spacing between stacked buttons on mobile.

4. **Touch-friendly**: Buttons are full-width on mobile for easier tapping.

On mobile, the buttons stack vertically:
- ← Précédent (full width)
- Réinitialiser (full width)
- Suivant → (full width)

On larger screens, they remain in a horizontal row with natural widths.

---

**User**

Please make the plan d'étude elements cleaner. Its too messy. remove the book icon next to the task and stack the layout instead of using a column layout

---

**Cursor**


Updating the study plan component to remove the book icon and stack the layout:



Reading more of the file to see the full structure:



Updating the study plan to remove icons and use a stacked layout:


```typescriptreact
"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Calendar, BookOpen, Brain, Target, ChevronDown, ChevronRight } from "lucide-react";
import { getWeeklyStudyPlanAction } from "@/app/actions/study-plan";
import { TaskType, PlanEntryStatus } from "@prisma/client";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface StudyPlanProps {
  courseId: string;
  refreshKey?: number; // Add refresh key to force reload
}

interface WeekData {
  weekNumber: number;
  weekStart: Date;
  weekEnd: Date;
  entries: any[];
}

export function StudyPlan({ courseId, refreshKey }: StudyPlanProps) {
  const [weeks, setWeeks] = useState<WeekData[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedWeeks, setExpandedWeeks] = useState<Set<number>>(new Set([1])); // Expand first week by default
  const [week1StartDate, setWeek1StartDate] = useState<Date | null>(null);
  const [examDate, setExamDate] = useState<Date | null>(null);

  useEffect(() => {
    loadStudyPlan();
  }, [courseId, refreshKey]); // Reload when refreshKey changes

  const loadStudyPlan = async () => {
    try {
      const result = await getWeeklyStudyPlanAction(courseId);
      if (result.success && result.data) {
        setWeeks(result.data);
        setWeek1StartDate(result.week1StartDate ? new Date(result.week1StartDate) : null);
        setExamDate(result.examDate ? new Date(result.examDate) : null);
        
        // Expand current week
        const today = new Date();
        const currentWeek = result.data.find((week: WeekData) => {
          const start = new Date(week.weekStart);
          const end = new Date(week.weekEnd);
          return today >= start && today <= end;
        });
        if (currentWeek) {
          setExpandedWeeks(new Set([currentWeek.weekNumber]));
        }
      }
    } catch (error) {
      console.error("Error loading study plan:", error);
    } finally {
      setLoading(false);
    }
  };

  const toggleWeek = (weekNumber: number) => {
    setExpandedWeeks((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(weekNumber)) {
        newSet.delete(weekNumber);
      } else {
        newSet.add(weekNumber);
      }
      return newSet;
    });
  };

  const getTaskIcon = (taskType: TaskType) => {
    switch (taskType) {
      case TaskType.LEARN:
        return <BookOpen className="h-4 w-4" />;
      case TaskType.REVIEW:
        return <Brain className="h-4 w-4" />;
      case TaskType.PRACTICE:
        return <Target className="h-4 w-4" />;
      default:
        return null;
    }
  };

  const getTaskLabel = (taskType: TaskType, entry: any) => {
    switch (taskType) {
      case TaskType.LEARN:
        return entry.module ? `Apprendre - ${entry.module.title}` : "Apprendre - Nouveau module";
      case TaskType.REVIEW:
        return entry.module ? `Réviser - ${entry.module.title}` : "Révision";
      case TaskType.PRACTICE:
        return entry.targetQuizId ? "Examen simulé" : "Pratique - Questions";
      default:
        return "Tâche";
    }
  };

  const getStatusBadge = (status: PlanEntryStatus) => {
    switch (status) {
      case PlanEntryStatus.COMPLETED:
        return <Badge variant="default" className="bg-green-500 text-xs">Complété</Badge>;
      case PlanEntryStatus.IN_PROGRESS:
        return <Badge variant="default" className="bg-blue-500 text-xs">En cours</Badge>;
      case PlanEntryStatus.PENDING:
        return <Badge variant="outline" className="text-xs">En attente</Badge>;
      case PlanEntryStatus.SKIPPED:
        return <Badge variant="secondary" className="text-xs">Ignoré</Badge>;
      default:
        return null;
    }
  };

  // Group entries by task type and module for cleaner display
  // For LEARN tasks, group by module (one entry per module per week)
  const groupEntriesByType = (entries: any[]) => {
    const grouped: Record<TaskType, any[]> = {
      LEARN: [],
      REVIEW: [],
      PRACTICE: [],
      ORIENTATION: [],
    };

    // For LEARN tasks, group by module (show one per module)
    const learnByModule = new Map<string, any>();
    
    entries.forEach((entry) => {
      if (entry.taskType === TaskType.LEARN && entry.targetModuleId) {
        // Group LEARN tasks by module - keep the first one and aggregate blocks
        if (!learnByModule.has(entry.targetModuleId)) {
          learnByModule.set(entry.targetModuleId, {
            ...entry,
            // Sum up estimated blocks from all entries for this module
            estimatedBlocks: 0,
          });
        }
        const moduleEntry = learnByModule.get(entry.targetModuleId)!;
        moduleEntry.estimatedBlocks += entry.estimatedBlocks || 1;
      } else {
        // For other task types, add directly
        grouped[entry.taskType].push(entry);
      }
    });

    // Add grouped LEARN entries
    grouped.LEARN = Array.from(learnByModule.values());

    return grouped;
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Plan d'étude</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Chargement...</p>
        </CardContent>
      </Card>
    );
  }

  if (weeks.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Plan d'étude
          </CardTitle>
          <CardDescription>Aucun plan d'étude disponible</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Plan d'étude
          </CardTitle>
          <CardDescription>
            {week1StartDate && examDate && (
              <>
                Du {format(week1StartDate, "d MMMM yyyy", { locale: fr })} au{" "}
                {format(examDate, "d MMMM yyyy", { locale: fr })}
              </>
            )}
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {weeks.map((week) => {
            const weekStart = new Date(week.weekStart);
            const weekEnd = new Date(week.weekEnd);
            weekStart.setHours(0, 0, 0, 0);
            weekEnd.setHours(0, 0, 0, 0);
            
            const isCurrentWeek = today >= weekStart && today <= weekEnd;
            const isPast = weekEnd < today;
            const isExpanded = expandedWeeks.has(week.weekNumber);

            const groupedEntries = groupEntriesByType(week.entries);
            const totalEntries = week.entries.length;
            const completedEntries = week.entries.filter(
              (e) => e.status === PlanEntryStatus.COMPLETED
            ).length;
            const completionPercentage = totalEntries > 0 
              ? Math.round((completedEntries / totalEntries) * 100) 
              : 0;

            return (
              <Collapsible
                key={week.weekNumber}
                open={isExpanded}
                onOpenChange={() => toggleWeek(week.weekNumber)}
              >
                <div
                  className={`border rounded-lg ${
                    isCurrentWeek ? "bg-primary/5 border-primary" : ""
                  } ${isPast ? "opacity-75" : ""}`}
                >
                  <CollapsibleTrigger asChild>
                    <Button
                      variant="ghost"
                      className="w-full justify-between p-4 h-auto hover:bg-transparent"
                    >
                      <div className="flex items-center gap-2 sm:gap-3 flex-1 text-left min-w-0">
                        <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
                          {isExpanded ? (
                            <ChevronDown className="h-4 w-4" />
                          ) : (
                            <ChevronRight className="h-4 w-4" />
                          )}
                          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary text-sm sm:text-base">
                            {week.weekNumber}
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1 sm:gap-2 flex-wrap">
                            <h3 className="font-semibold text-base sm:text-lg truncate">
                              Semaine {week.weekNumber}
                            </h3>
                            {isCurrentWeek && (
                              <Badge variant="secondary" className="text-xs flex-shrink-0">
                                Cette semaine
                              </Badge>
                            )}
                            {week.weekNumber === weeks.length && (
                              <Badge variant="outline" className="text-xs flex-shrink-0">
                                Semaine d'examen
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs sm:text-sm text-muted-foreground truncate">
                            {format(weekStart, "d MMM", { locale: fr })} -{" "}
                            {format(weekEnd, "d MMM yyyy", { locale: fr })}
                          </p>
                        </div>
                        <div className="text-right flex-shrink-0 ml-2">
                          <div className="text-xs sm:text-sm font-medium whitespace-nowrap">
                            {completedEntries} / {totalEntries} complété
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {completionPercentage}%
                          </div>
                        </div>
                      </div>
                    </Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="px-4 pb-4 space-y-4">
                      {/* Learn Tasks */}
                      {groupedEntries.LEARN.length > 0 && (
                        <div>
                          <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                            <BookOpen className="h-4 w-4" />
                            Phase 1 - Apprendre ({groupedEntries.LEARN.length} tâche
                            {groupedEntries.LEARN.length > 1 ? "s" : ""})
                          </h4>
                          <div className="space-y-2 ml-6">
                            {groupedEntries.LEARN.map((entry) => (
                              <div
                                key={entry.id}
                                className="p-3 border rounded bg-background space-y-2"
                              >
                                <div className="flex items-start justify-between gap-2">
                                  <div className="text-sm font-medium flex-1">
                                    {getTaskLabel(entry.taskType, entry)}
                                  </div>
                                  {getStatusBadge(entry.status)}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  ~{entry.estimatedBlocks * 25} minutes
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Review Tasks */}
                      {groupedEntries.REVIEW.length > 0 && (
                        <div>
                          <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                            <Brain className="h-4 w-4" />
                            Phase 2 - Réviser ({groupedEntries.REVIEW.length} session
                            {groupedEntries.REVIEW.length > 1 ? "s" : ""})
                          </h4>
                          <div className="space-y-2 ml-6">
                            {groupedEntries.REVIEW.map((entry) => (
                              <div
                                key={entry.id}
                                className="flex items-center justify-between p-2 border rounded bg-background"
                              >
                                <div className="flex items-center gap-2 flex-1">
                                  <div className="text-muted-foreground">
                                    {getTaskIcon(entry.taskType)}
                                  </div>
                                  <div className="flex-1">
                                    <div className="text-sm font-medium">
                                      {getTaskLabel(entry.taskType, entry)}
                                    </div>
                                    <div className="text-xs text-muted-foreground">
                                      ~{entry.estimatedBlocks * 25} minutes
                                    </div>
                                  </div>
                                  {getStatusBadge(entry.status)}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Practice Tasks */}
                      {groupedEntries.PRACTICE.length > 0 && (
                        <div>
                          <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                            <Target className="h-4 w-4" />
                            Phase 3 - Pratiquer ({groupedEntries.PRACTICE.length} tâche
                            {groupedEntries.PRACTICE.length > 1 ? "s" : ""})
                          </h4>
                          <div className="space-y-2 ml-6">
                            {groupedEntries.PRACTICE.map((entry) => (
                              <div
                                key={entry.id}
                                className="flex items-center justify-between p-2 border rounded bg-background"
                              >
                                <div className="flex items-center gap-2 flex-1">
                                  <div className="text-muted-foreground">
                                    {getTaskIcon(entry.taskType)}
                                  </div>
                                  <div className="flex-1">
                                    <div className="text-sm font-medium">
                                      {getTaskLabel(entry.taskType, entry)}
                                    </div>
                                    <div className="text-xs text-muted-foreground">
                                      ~{entry.estimatedBlocks * 25} minutes
                                    </div>
                                  </div>
                                  {getStatusBadge(entry.status)}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {totalEntries === 0 && (
                        <p className="text-sm text-muted-foreground text-center py-4">
                          Aucune tâche planifiée pour cette semaine
                        </p>
                      )}
                    </div>
                  </CollapsibleContent>
                </div>
              </Collapsible>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

```

```typescriptreact
"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Calendar, BookOpen, Brain, Target, ChevronDown, ChevronRight } from "lucide-react";
import { getWeeklyStudyPlanAction } from "@/app/actions/study-plan";
import { TaskType, PlanEntryStatus } from "@prisma/client";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface StudyPlanProps {
  courseId: string;
  refreshKey?: number; // Add refresh key to force reload
}

interface WeekData {
  weekNumber: number;
  weekStart: Date;
  weekEnd: Date;
  entries: any[];
}

export function StudyPlan({ courseId, refreshKey }: StudyPlanProps) {
  const [weeks, setWeeks] = useState<WeekData[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedWeeks, setExpandedWeeks] = useState<Set<number>>(new Set([1])); // Expand first week by default
  const [week1StartDate, setWeek1StartDate] = useState<Date | null>(null);
  const [examDate, setExamDate] = useState<Date | null>(null);

  useEffect(() => {
    loadStudyPlan();
  }, [courseId, refreshKey]); // Reload when refreshKey changes

  const loadStudyPlan = async () => {
    try {
      const result = await getWeeklyStudyPlanAction(courseId);
      if (result.success && result.data) {
        setWeeks(result.data);
        setWeek1StartDate(result.week1StartDate ? new Date(result.week1StartDate) : null);
        setExamDate(result.examDate ? new Date(result.examDate) : null);
        
        // Expand current week
        const today = new Date();
        const currentWeek = result.data.find((week: WeekData) => {
          const start = new Date(week.weekStart);
          const end = new Date(week.weekEnd);
          return today >= start && today <= end;
        });
        if (currentWeek) {
          setExpandedWeeks(new Set([currentWeek.weekNumber]));
        }
      }
    } catch (error) {
      console.error("Error loading study plan:", error);
    } finally {
      setLoading(false);
    }
  };

  const toggleWeek = (weekNumber: number) => {
    setExpandedWeeks((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(weekNumber)) {
        newSet.delete(weekNumber);
      } else {
        newSet.add(weekNumber);
      }
      return newSet;
    });
  };

  const getTaskIcon = (taskType: TaskType) => {
    switch (taskType) {
      case TaskType.LEARN:
        return <BookOpen className="h-4 w-4" />;
      case TaskType.REVIEW:
        return <Brain className="h-4 w-4" />;
      case TaskType.PRACTICE:
        return <Target className="h-4 w-4" />;
      default:
        return null;
    }
  };

  const getTaskLabel = (taskType: TaskType, entry: any) => {
    switch (taskType) {
      case TaskType.LEARN:
        return entry.module ? `Apprendre - ${entry.module.title}` : "Apprendre - Nouveau module";
      case TaskType.REVIEW:
        return entry.module ? `Réviser - ${entry.module.title}` : "Révision";
      case TaskType.PRACTICE:
        return entry.targetQuizId ? "Examen simulé" : "Pratique - Questions";
      default:
        return "Tâche";
    }
  };

  const getStatusBadge = (status: PlanEntryStatus) => {
    switch (status) {
      case PlanEntryStatus.COMPLETED:
        return <Badge variant="default" className="bg-green-500 text-xs">Complété</Badge>;
      case PlanEntryStatus.IN_PROGRESS:
        return <Badge variant="default" className="bg-blue-500 text-xs">En cours</Badge>;
      case PlanEntryStatus.PENDING:
        return <Badge variant="outline" className="text-xs">En attente</Badge>;
      case PlanEntryStatus.SKIPPED:
        return <Badge variant="secondary" className="text-xs">Ignoré</Badge>;
      default:
        return null;
    }
  };

  // Group entries by task type and module for cleaner display
  // For LEARN tasks, group by module (one entry per module per week)
  const groupEntriesByType = (entries: any[]) => {
    const grouped: Record<TaskType, any[]> = {
      LEARN: [],
      REVIEW: [],
      PRACTICE: [],
      ORIENTATION: [],
    };

    // For LEARN tasks, group by module (show one per module)
    const learnByModule = new Map<string, any>();
    
    entries.forEach((entry) => {
      if (entry.taskType === TaskType.LEARN && entry.targetModuleId) {
        // Group LEARN tasks by module - keep the first one and aggregate blocks
        if (!learnByModule.has(entry.targetModuleId)) {
          learnByModule.set(entry.targetModuleId, {
            ...entry,
            // Sum up estimated blocks from all entries for this module
            estimatedBlocks: 0,
          });
        }
        const moduleEntry = learnByModule.get(entry.targetModuleId)!;
        moduleEntry.estimatedBlocks += entry.estimatedBlocks || 1;
      } else {
        // For other task types, add directly
        grouped[entry.taskType].push(entry);
      }
    });

    // Add grouped LEARN entries
    grouped.LEARN = Array.from(learnByModule.values());

    return grouped;
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Plan d'étude</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Chargement...</p>
        </CardContent>
      </Card>
    );
  }

  if (weeks.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Plan d'étude
          </CardTitle>
          <CardDescription>Aucun plan d'étude disponible</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Plan d'étude
          </CardTitle>
          <CardDescription>
            {week1StartDate && examDate && (
              <>
                Du {format(week1StartDate, "d MMMM yyyy", { locale: fr })} au{" "}
                {format(examDate, "d MMMM yyyy", { locale: fr })}
              </>
            )}
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {weeks.map((week) => {
            const weekStart = new Date(week.weekStart);
            const weekEnd = new Date(week.weekEnd);
            weekStart.setHours(0, 0, 0, 0);
            weekEnd.setHours(0, 0, 0, 0);
            
            const isCurrentWeek = today >= weekStart && today <= weekEnd;
            const isPast = weekEnd < today;
            const isExpanded = expandedWeeks.has(week.weekNumber);

            const groupedEntries = groupEntriesByType(week.entries);
            const totalEntries = week.entries.length;
            const completedEntries = week.entries.filter(
              (e) => e.status === PlanEntryStatus.COMPLETED
            ).length;
            const completionPercentage = totalEntries > 0 
              ? Math.round((completedEntries / totalEntries) * 100) 
              : 0;

            return (
              <Collapsible
                key={week.weekNumber}
                open={isExpanded}
                onOpenChange={() => toggleWeek(week.weekNumber)}
              >
                <div
                  className={`border rounded-lg ${
                    isCurrentWeek ? "bg-primary/5 border-primary" : ""
                  } ${isPast ? "opacity-75" : ""}`}
                >
                  <CollapsibleTrigger asChild>
                    <Button
                      variant="ghost"
                      className="w-full justify-between p-4 h-auto hover:bg-transparent"
                    >
                      <div className="flex items-center gap-2 sm:gap-3 flex-1 text-left min-w-0">
                        <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
                          {isExpanded ? (
                            <ChevronDown className="h-4 w-4" />
                          ) : (
                            <ChevronRight className="h-4 w-4" />
                          )}
                          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary text-sm sm:text-base">
                            {week.weekNumber}
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1 sm:gap-2 flex-wrap">
                            <h3 className="font-semibold text-base sm:text-lg truncate">
                              Semaine {week.weekNumber}
                            </h3>
                            {isCurrentWeek && (
                              <Badge variant="secondary" className="text-xs flex-shrink-0">
                                Cette semaine
                              </Badge>
                            )}
                            {week.weekNumber === weeks.length && (
                              <Badge variant="outline" className="text-xs flex-shrink-0">
                                Semaine d'examen
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs sm:text-sm text-muted-foreground truncate">
                            {format(weekStart, "d MMM", { locale: fr })} -{" "}
                            {format(weekEnd, "d MMM yyyy", { locale: fr })}
                          </p>
                        </div>
                        <div className="text-right flex-shrink-0 ml-2">
                          <div className="text-xs sm:text-sm font-medium whitespace-nowrap">
                            {completedEntries} / {totalEntries} complété
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {completionPercentage}%
                          </div>
                        </div>
                      </div>
                    </Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="px-4 pb-4 space-y-4">
                      {/* Learn Tasks */}
                      {groupedEntries.LEARN.length > 0 && (
                        <div>
                          <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                            <BookOpen className="h-4 w-4" />
                            Phase 1 - Apprendre ({groupedEntries.LEARN.length} tâche
                            {groupedEntries.LEARN.length > 1 ? "s" : ""})
                          </h4>
                          <div className="space-y-2 ml-6">
                            {groupedEntries.LEARN.map((entry) => (
                              <div
                                key={entry.id}
                                className="p-3 border rounded bg-background space-y-2"
                              >
                                <div className="flex items-start justify-between gap-2">
                                  <div className="text-sm font-medium flex-1">
                                    {getTaskLabel(entry.taskType, entry)}
                                  </div>
                                  {getStatusBadge(entry.status)}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  ~{entry.estimatedBlocks * 25} minutes
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Review Tasks */}
                      {groupedEntries.REVIEW.length > 0 && (
                        <div>
                          <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                            <Brain className="h-4 w-4" />
                            Phase 2 - Réviser ({groupedEntries.REVIEW.length} session
                            {groupedEntries.REVIEW.length > 1 ? "s" : ""})
                          </h4>
                          <div className="space-y-2 ml-6">
                            {groupedEntries.REVIEW.map((entry) => (
                              <div
                                key={entry.id}
                                className="p-3 border rounded bg-background space-y-2"
                              >
                                <div className="flex items-start justify-between gap-2">
                                  <div className="text-sm font-medium flex-1">
                                    {getTaskLabel(entry.taskType, entry)}
                                  </div>
                                  {getStatusBadge(entry.status)}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  ~{entry.estimatedBlocks * 25} minutes
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Practice Tasks */}
                      {groupedEntries.PRACTICE.length > 0 && (
                        <div>
                          <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                            <Target className="h-4 w-4" />
                            Phase 3 - Pratiquer ({groupedEntries.PRACTICE.length} tâche
                            {groupedEntries.PRACTICE.length > 1 ? "s" : ""})
                          </h4>
                          <div className="space-y-2 ml-6">
                            {groupedEntries.PRACTICE.map((entry) => (
                              <div
                                key={entry.id}
                                className="flex items-center justify-between p-2 border rounded bg-background"
                              >
                                <div className="flex items-center gap-2 flex-1">
                                  <div className="text-muted-foreground">
                                    {getTaskIcon(entry.taskType)}
                                  </div>
                                  <div className="flex-1">
                                    <div className="text-sm font-medium">
                                      {getTaskLabel(entry.taskType, entry)}
                                    </div>
                                    <div className="text-xs text-muted-foreground">
                                      ~{entry.estimatedBlocks * 25} minutes
                                    </div>
                                  </div>
                                  {getStatusBadge(entry.status)}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {totalEntries === 0 && (
                        <p className="text-sm text-muted-foreground text-center py-4">
                          Aucune tâche planifiée pour cette semaine
                        </p>
                      )}
                    </div>
                  </CollapsibleContent>
                </div>
              </Collapsible>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

```

```typescriptreact
"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Calendar, BookOpen, Brain, Target, ChevronDown, ChevronRight } from "lucide-react";
import { getWeeklyStudyPlanAction } from "@/app/actions/study-plan";
import { TaskType, PlanEntryStatus } from "@prisma/client";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface StudyPlanProps {
  courseId: string;
  refreshKey?: number; // Add refresh key to force reload
}

interface WeekData {
  weekNumber: number;
  weekStart: Date;
  weekEnd: Date;
  entries: any[];
}

export function StudyPlan({ courseId, refreshKey }: StudyPlanProps) {
  const [weeks, setWeeks] = useState<WeekData[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedWeeks, setExpandedWeeks] = useState<Set<number>>(new Set([1])); // Expand first week by default
  const [week1StartDate, setWeek1StartDate] = useState<Date | null>(null);
  const [examDate, setExamDate] = useState<Date | null>(null);

  useEffect(() => {
    loadStudyPlan();
  }, [courseId, refreshKey]); // Reload when refreshKey changes

  const loadStudyPlan = async () => {
    try {
      const result = await getWeeklyStudyPlanAction(courseId);
      if (result.success && result.data) {
        setWeeks(result.data);
        setWeek1StartDate(result.week1StartDate ? new Date(result.week1StartDate) : null);
        setExamDate(result.examDate ? new Date(result.examDate) : null);
        
        // Expand current week
        const today = new Date();
        const currentWeek = result.data.find((week: WeekData) => {
          const start = new Date(week.weekStart);
          const end = new Date(week.weekEnd);
          return today >= start && today <= end;
        });
        if (currentWeek) {
          setExpandedWeeks(new Set([currentWeek.weekNumber]));
        }
      }
    } catch (error) {
      console.error("Error loading study plan:", error);
    } finally {
      setLoading(false);
    }
  };

  const toggleWeek = (weekNumber: number) => {
    setExpandedWeeks((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(weekNumber)) {
        newSet.delete(weekNumber);
      } else {
        newSet.add(weekNumber);
      }
      return newSet;
    });
  };

  const getTaskIcon = (taskType: TaskType) => {
    switch (taskType) {
      case TaskType.LEARN:
        return <BookOpen className="h-4 w-4" />;
      case TaskType.REVIEW:
        return <Brain className="h-4 w-4" />;
      case TaskType.PRACTICE:
        return <Target className="h-4 w-4" />;
      default:
        return null;
    }
  };

  const getTaskLabel = (taskType: TaskType, entry: any) => {
    switch (taskType) {
      case TaskType.LEARN:
        return entry.module ? `Apprendre - ${entry.module.title}` : "Apprendre - Nouveau module";
      case TaskType.REVIEW:
        return entry.module ? `Réviser - ${entry.module.title}` : "Révision";
      case TaskType.PRACTICE:
        return entry.targetQuizId ? "Examen simulé" : "Pratique - Questions";
      default:
        return "Tâche";
    }
  };

  const getStatusBadge = (status: PlanEntryStatus) => {
    switch (status) {
      case PlanEntryStatus.COMPLETED:
        return <Badge variant="default" className="bg-green-500 text-xs">Complété</Badge>;
      case PlanEntryStatus.IN_PROGRESS:
        return <Badge variant="default" className="bg-blue-500 text-xs">En cours</Badge>;
      case PlanEntryStatus.PENDING:
        return <Badge variant="outline" className="text-xs">En attente</Badge>;
      case PlanEntryStatus.SKIPPED:
        return <Badge variant="secondary" className="text-xs">Ignoré</Badge>;
      default:
        return null;
    }
  };

  // Group entries by task type and module for cleaner display
  // For LEARN tasks, group by module (one entry per module per week)
  const groupEntriesByType = (entries: any[]) => {
    const grouped: Record<TaskType, any[]> = {
      LEARN: [],
      REVIEW: [],
      PRACTICE: [],
      ORIENTATION: [],
    };

    // For LEARN tasks, group by module (show one per module)
    const learnByModule = new Map<string, any>();
    
    entries.forEach((entry) => {
      if (entry.taskType === TaskType.LEARN && entry.targetModuleId) {
        // Group LEARN tasks by module - keep the first one and aggregate blocks
        if (!learnByModule.has(entry.targetModuleId)) {
          learnByModule.set(entry.targetModuleId, {
            ...entry,
            // Sum up estimated blocks from all entries for this module
            estimatedBlocks: 0,
          });
        }
        const moduleEntry = learnByModule.get(entry.targetModuleId)!;
        moduleEntry.estimatedBlocks += entry.estimatedBlocks || 1;
      } else {
        // For other task types, add directly
        grouped[entry.taskType].push(entry);
      }
    });

    // Add grouped LEARN entries
    grouped.LEARN = Array.from(learnByModule.values());

    return grouped;
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Plan d'étude</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Chargement...</p>
        </CardContent>
      </Card>
    );
  }

  if (weeks.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Plan d'étude
          </CardTitle>
          <CardDescription>Aucun plan d'étude disponible</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Plan d'étude
          </CardTitle>
          <CardDescription>
            {week1StartDate && examDate && (
              <>
                Du {format(week1StartDate, "d MMMM yyyy", { locale: fr })} au{" "}
                {format(examDate, "d MMMM yyyy", { locale: fr })}
              </>
            )}
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {weeks.map((week) => {
            const weekStart = new Date(week.weekStart);
            const weekEnd = new Date(week.weekEnd);
            weekStart.setHours(0, 0, 0, 0);
            weekEnd.setHours(0, 0, 0, 0);
            
            const isCurrentWeek = today >= weekStart && today <= weekEnd;
            const isPast = weekEnd < today;
            const isExpanded = expandedWeeks.has(week.weekNumber);

            const groupedEntries = groupEntriesByType(week.entries);
            const totalEntries = week.entries.length;
            const completedEntries = week.entries.filter(
              (e) => e.status === PlanEntryStatus.COMPLETED
            ).length;
            const completionPercentage = totalEntries > 0 
              ? Math.round((completedEntries / totalEntries) * 100) 
              : 0;

            return (
              <Collapsible
                key={week.weekNumber}
                open={isExpanded}
                onOpenChange={() => toggleWeek(week.weekNumber)}
              >
                <div
                  className={`border rounded-lg ${
                    isCurrentWeek ? "bg-primary/5 border-primary" : ""
                  } ${isPast ? "opacity-75" : ""}`}
                >
                  <CollapsibleTrigger asChild>
                    <Button
                      variant="ghost"
                      className="w-full justify-between p-4 h-auto hover:bg-transparent"
                    >
                      <div className="flex items-center gap-2 sm:gap-3 flex-1 text-left min-w-0">
                        <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
                          {isExpanded ? (
                            <ChevronDown className="h-4 w-4" />
                          ) : (
                            <ChevronRight className="h-4 w-4" />
                          )}
                          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary text-sm sm:text-base">
                            {week.weekNumber}
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1 sm:gap-2 flex-wrap">
                            <h3 className="font-semibold text-base sm:text-lg truncate">
                              Semaine {week.weekNumber}
                            </h3>
                            {isCurrentWeek && (
                              <Badge variant="secondary" className="text-xs flex-shrink-0">
                                Cette semaine
                              </Badge>
                            )}
                            {week.weekNumber === weeks.length && (
                              <Badge variant="outline" className="text-xs flex-shrink-0">
                                Semaine d'examen
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs sm:text-sm text-muted-foreground truncate">
                            {format(weekStart, "d MMM", { locale: fr })} -{" "}
                            {format(weekEnd, "d MMM yyyy", { locale: fr })}
                          </p>
                        </div>
                        <div className="text-right flex-shrink-0 ml-2">
                          <div className="text-xs sm:text-sm font-medium whitespace-nowrap">
                            {completedEntries} / {totalEntries} complété
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {completionPercentage}%
                          </div>
                        </div>
                      </div>
                    </Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="px-4 pb-4 space-y-4">
                      {/* Learn Tasks */}
                      {groupedEntries.LEARN.length > 0 && (
                        <div>
                          <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                            <BookOpen className="h-4 w-4" />
                            Phase 1 - Apprendre ({groupedEntries.LEARN.length} tâche
                            {groupedEntries.LEARN.length > 1 ? "s" : ""})
                          </h4>
                          <div className="space-y-2 ml-6">
                            {groupedEntries.LEARN.map((entry) => (
                              <div
                                key={entry.id}
                                className="p-3 border rounded bg-background space-y-2"
                              >
                                <div className="flex items-start justify-between gap-2">
                                  <div className="text-sm font-medium flex-1">
                                    {getTaskLabel(entry.taskType, entry)}
                                  </div>
                                  {getStatusBadge(entry.status)}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  ~{entry.estimatedBlocks * 25} minutes
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Review Tasks */}
                      {groupedEntries.REVIEW.length > 0 && (
                        <div>
                          <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                            <Brain className="h-4 w-4" />
                            Phase 2 - Réviser ({groupedEntries.REVIEW.length} session
                            {groupedEntries.REVIEW.length > 1 ? "s" : ""})
                          </h4>
                          <div className="space-y-2 ml-6">
                            {groupedEntries.REVIEW.map((entry) => (
                              <div
                                key={entry.id}
                                className="p-3 border rounded bg-background space-y-2"
                              >
                                <div className="flex items-start justify-between gap-2">
                                  <div className="text-sm font-medium flex-1">
                                    {getTaskLabel(entry.taskType, entry)}
                                  </div>
                                  {getStatusBadge(entry.status)}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  ~{entry.estimatedBlocks * 25} minutes
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Practice Tasks */}
                      {groupedEntries.PRACTICE.length > 0 && (
                        <div>
                          <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                            <Target className="h-4 w-4" />
                            Phase 3 - Pratiquer ({groupedEntries.PRACTICE.length} tâche
                            {groupedEntries.PRACTICE.length > 1 ? "s" : ""})
                          </h4>
                          <div className="space-y-2 ml-6">
                            {groupedEntries.PRACTICE.map((entry) => (
                              <div
                                key={entry.id}
                                className="p-3 border rounded bg-background space-y-2"
                              >
                                <div className="flex items-start justify-between gap-2">
                                  <div className="text-sm font-medium flex-1">
                                    {getTaskLabel(entry.taskType, entry)}
                                  </div>
                                  {getStatusBadge(entry.status)}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  ~{entry.estimatedBlocks * 25} minutes
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {totalEntries === 0 && (
                        <p className="text-sm text-muted-foreground text-center py-4">
                          Aucune tâche planifiée pour cette semaine
                        </p>
                      )}
                    </div>
                  </CollapsibleContent>
                </div>
              </Collapsible>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

```


Removing icons from the section headers for a cleaner look:


```typescriptreact
"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Calendar, BookOpen, Brain, Target, ChevronDown, ChevronRight } from "lucide-react";
import { getWeeklyStudyPlanAction } from "@/app/actions/study-plan";
import { TaskType, PlanEntryStatus } from "@prisma/client";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface StudyPlanProps {
  courseId: string;
  refreshKey?: number; // Add refresh key to force reload
}

interface WeekData {
  weekNumber: number;
  weekStart: Date;
  weekEnd: Date;
  entries: any[];
}

export function StudyPlan({ courseId, refreshKey }: StudyPlanProps) {
  const [weeks, setWeeks] = useState<WeekData[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedWeeks, setExpandedWeeks] = useState<Set<number>>(new Set([1])); // Expand first week by default
  const [week1StartDate, setWeek1StartDate] = useState<Date | null>(null);
  const [examDate, setExamDate] = useState<Date | null>(null);

  useEffect(() => {
    loadStudyPlan();
  }, [courseId, refreshKey]); // Reload when refreshKey changes

  const loadStudyPlan = async () => {
    try {
      const result = await getWeeklyStudyPlanAction(courseId);
      if (result.success && result.data) {
        setWeeks(result.data);
        setWeek1StartDate(result.week1StartDate ? new Date(result.week1StartDate) : null);
        setExamDate(result.examDate ? new Date(result.examDate) : null);
        
        // Expand current week
        const today = new Date();
        const currentWeek = result.data.find((week: WeekData) => {
          const start = new Date(week.weekStart);
          const end = new Date(week.weekEnd);
          return today >= start && today <= end;
        });
        if (currentWeek) {
          setExpandedWeeks(new Set([currentWeek.weekNumber]));
        }
      }
    } catch (error) {
      console.error("Error loading study plan:", error);
    } finally {
      setLoading(false);
    }
  };

  const toggleWeek = (weekNumber: number) => {
    setExpandedWeeks((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(weekNumber)) {
        newSet.delete(weekNumber);
      } else {
        newSet.add(weekNumber);
      }
      return newSet;
    });
  };

  const getTaskIcon = (taskType: TaskType) => {
    switch (taskType) {
      case TaskType.LEARN:
        return <BookOpen className="h-4 w-4" />;
      case TaskType.REVIEW:
        return <Brain className="h-4 w-4" />;
      case TaskType.PRACTICE:
        return <Target className="h-4 w-4" />;
      default:
        return null;
    }
  };

  const getTaskLabel = (taskType: TaskType, entry: any) => {
    switch (taskType) {
      case TaskType.LEARN:
        return entry.module ? `Apprendre - ${entry.module.title}` : "Apprendre - Nouveau module";
      case TaskType.REVIEW:
        return entry.module ? `Réviser - ${entry.module.title}` : "Révision";
      case TaskType.PRACTICE:
        return entry.targetQuizId ? "Examen simulé" : "Pratique - Questions";
      default:
        return "Tâche";
    }
  };

  const getStatusBadge = (status: PlanEntryStatus) => {
    switch (status) {
      case PlanEntryStatus.COMPLETED:
        return <Badge variant="default" className="bg-green-500 text-xs">Complété</Badge>;
      case PlanEntryStatus.IN_PROGRESS:
        return <Badge variant="default" className="bg-blue-500 text-xs">En cours</Badge>;
      case PlanEntryStatus.PENDING:
        return <Badge variant="outline" className="text-xs">En attente</Badge>;
      case PlanEntryStatus.SKIPPED:
        return <Badge variant="secondary" className="text-xs">Ignoré</Badge>;
      default:
        return null;
    }
  };

  // Group entries by task type and module for cleaner display
  // For LEARN tasks, group by module (one entry per module per week)
  const groupEntriesByType = (entries: any[]) => {
    const grouped: Record<TaskType, any[]> = {
      LEARN: [],
      REVIEW: [],
      PRACTICE: [],
      ORIENTATION: [],
    };

    // For LEARN tasks, group by module (show one per module)
    const learnByModule = new Map<string, any>();
    
    entries.forEach((entry) => {
      if (entry.taskType === TaskType.LEARN && entry.targetModuleId) {
        // Group LEARN tasks by module - keep the first one and aggregate blocks
        if (!learnByModule.has(entry.targetModuleId)) {
          learnByModule.set(entry.targetModuleId, {
            ...entry,
            // Sum up estimated blocks from all entries for this module
            estimatedBlocks: 0,
          });
        }
        const moduleEntry = learnByModule.get(entry.targetModuleId)!;
        moduleEntry.estimatedBlocks += entry.estimatedBlocks || 1;
      } else {
        // For other task types, add directly
        grouped[entry.taskType].push(entry);
      }
    });

    // Add grouped LEARN entries
    grouped.LEARN = Array.from(learnByModule.values());

    return grouped;
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Plan d'étude</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Chargement...</p>
        </CardContent>
      </Card>
    );
  }

  if (weeks.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Plan d'étude
          </CardTitle>
          <CardDescription>Aucun plan d'étude disponible</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Plan d'étude
          </CardTitle>
          <CardDescription>
            {week1StartDate && examDate && (
              <>
                Du {format(week1StartDate, "d MMMM yyyy", { locale: fr })} au{" "}
                {format(examDate, "d MMMM yyyy", { locale: fr })}
              </>
            )}
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {weeks.map((week) => {
            const weekStart = new Date(week.weekStart);
            const weekEnd = new Date(week.weekEnd);
            weekStart.setHours(0, 0, 0, 0);
            weekEnd.setHours(0, 0, 0, 0);
            
            const isCurrentWeek = today >= weekStart && today <= weekEnd;
            const isPast = weekEnd < today;
            const isExpanded = expandedWeeks.has(week.weekNumber);

            const groupedEntries = groupEntriesByType(week.entries);
            const totalEntries = week.entries.length;
            const completedEntries = week.entries.filter(
              (e) => e.status === PlanEntryStatus.COMPLETED
            ).length;
            const completionPercentage = totalEntries > 0 
              ? Math.round((completedEntries / totalEntries) * 100) 
              : 0;

            return (
              <Collapsible
                key={week.weekNumber}
                open={isExpanded}
                onOpenChange={() => toggleWeek(week.weekNumber)}
              >
                <div
                  className={`border rounded-lg ${
                    isCurrentWeek ? "bg-primary/5 border-primary" : ""
                  } ${isPast ? "opacity-75" : ""}`}
                >
                  <CollapsibleTrigger asChild>
                    <Button
                      variant="ghost"
                      className="w-full justify-between p-4 h-auto hover:bg-transparent"
                    >
                      <div className="flex items-center gap-2 sm:gap-3 flex-1 text-left min-w-0">
                        <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
                          {isExpanded ? (
                            <ChevronDown className="h-4 w-4" />
                          ) : (
                            <ChevronRight className="h-4 w-4" />
                          )}
                          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary text-sm sm:text-base">
                            {week.weekNumber}
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1 sm:gap-2 flex-wrap">
                            <h3 className="font-semibold text-base sm:text-lg truncate">
                              Semaine {week.weekNumber}
                            </h3>
                            {isCurrentWeek && (
                              <Badge variant="secondary" className="text-xs flex-shrink-0">
                                Cette semaine
                              </Badge>
                            )}
                            {week.weekNumber === weeks.length && (
                              <Badge variant="outline" className="text-xs flex-shrink-0">
                                Semaine d'examen
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs sm:text-sm text-muted-foreground truncate">
                            {format(weekStart, "d MMM", { locale: fr })} -{" "}
                            {format(weekEnd, "d MMM yyyy", { locale: fr })}
                          </p>
                        </div>
                        <div className="text-right flex-shrink-0 ml-2">
                          <div className="text-xs sm:text-sm font-medium whitespace-nowrap">
                            {completedEntries} / {totalEntries} complété
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {completionPercentage}%
                          </div>
                        </div>
                      </div>
                    </Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="px-4 pb-4 space-y-4">
                      {/* Learn Tasks */}
                      {groupedEntries.LEARN.length > 0 && (
                        <div>
                          <h4 className="text-sm font-semibold mb-2">
                            Phase 1 - Apprendre ({groupedEntries.LEARN.length} tâche
                            {groupedEntries.LEARN.length > 1 ? "s" : ""})
                          </h4>
                          <div className="space-y-2 ml-6">
                            {groupedEntries.LEARN.map((entry) => (
                              <div
                                key={entry.id}
                                className="p-3 border rounded bg-background space-y-2"
                              >
                                <div className="flex items-start justify-between gap-2">
                                  <div className="text-sm font-medium flex-1">
                                    {getTaskLabel(entry.taskType, entry)}
                                  </div>
                                  {getStatusBadge(entry.status)}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  ~{entry.estimatedBlocks * 25} minutes
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Review Tasks */}
                      {groupedEntries.REVIEW.length > 0 && (
                        <div>
                          <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                            <Brain className="h-4 w-4" />
                            Phase 2 - Réviser ({groupedEntries.REVIEW.length} session
                            {groupedEntries.REVIEW.length > 1 ? "s" : ""})
                          </h4>
                          <div className="space-y-2 ml-6">
                            {groupedEntries.REVIEW.map((entry) => (
                              <div
                                key={entry.id}
                                className="p-3 border rounded bg-background space-y-2"
                              >
                                <div className="flex items-start justify-between gap-2">
                                  <div className="text-sm font-medium flex-1">
                                    {getTaskLabel(entry.taskType, entry)}
                                  </div>
                                  {getStatusBadge(entry.status)}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  ~{entry.estimatedBlocks * 25} minutes
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Practice Tasks */}
                      {groupedEntries.PRACTICE.length > 0 && (
                        <div>
                          <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                            <Target className="h-4 w-4" />
                            Phase 3 - Pratiquer ({groupedEntries.PRACTICE.length} tâche
                            {groupedEntries.PRACTICE.length > 1 ? "s" : ""})
                          </h4>
                          <div className="space-y-2 ml-6">
                            {groupedEntries.PRACTICE.map((entry) => (
                              <div
                                key={entry.id}
                                className="p-3 border rounded bg-background space-y-2"
                              >
                                <div className="flex items-start justify-between gap-2">
                                  <div className="text-sm font-medium flex-1">
                                    {getTaskLabel(entry.taskType, entry)}
                                  </div>
                                  {getStatusBadge(entry.status)}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  ~{entry.estimatedBlocks * 25} minutes
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {totalEntries === 0 && (
                        <p className="text-sm text-muted-foreground text-center py-4">
                          Aucune tâche planifiée pour cette semaine
                        </p>
                      )}
                    </div>
                  </CollapsibleContent>
                </div>
              </Collapsible>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

```

```typescriptreact
"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Calendar, BookOpen, Brain, Target, ChevronDown, ChevronRight } from "lucide-react";
import { getWeeklyStudyPlanAction } from "@/app/actions/study-plan";
import { TaskType, PlanEntryStatus } from "@prisma/client";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface StudyPlanProps {
  courseId: string;
  refreshKey?: number; // Add refresh key to force reload
}

interface WeekData {
  weekNumber: number;
  weekStart: Date;
  weekEnd: Date;
  entries: any[];
}

export function StudyPlan({ courseId, refreshKey }: StudyPlanProps) {
  const [weeks, setWeeks] = useState<WeekData[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedWeeks, setExpandedWeeks] = useState<Set<number>>(new Set([1])); // Expand first week by default
  const [week1StartDate, setWeek1StartDate] = useState<Date | null>(null);
  const [examDate, setExamDate] = useState<Date | null>(null);

  useEffect(() => {
    loadStudyPlan();
  }, [courseId, refreshKey]); // Reload when refreshKey changes

  const loadStudyPlan = async () => {
    try {
      const result = await getWeeklyStudyPlanAction(courseId);
      if (result.success && result.data) {
        setWeeks(result.data);
        setWeek1StartDate(result.week1StartDate ? new Date(result.week1StartDate) : null);
        setExamDate(result.examDate ? new Date(result.examDate) : null);
        
        // Expand current week
        const today = new Date();
        const currentWeek = result.data.find((week: WeekData) => {
          const start = new Date(week.weekStart);
          const end = new Date(week.weekEnd);
          return today >= start && today <= end;
        });
        if (currentWeek) {
          setExpandedWeeks(new Set([currentWeek.weekNumber]));
        }
      }
    } catch (error) {
      console.error("Error loading study plan:", error);
    } finally {
      setLoading(false);
    }
  };

  const toggleWeek = (weekNumber: number) => {
    setExpandedWeeks((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(weekNumber)) {
        newSet.delete(weekNumber);
      } else {
        newSet.add(weekNumber);
      }
      return newSet;
    });
  };

  const getTaskIcon = (taskType: TaskType) => {
    switch (taskType) {
      case TaskType.LEARN:
        return <BookOpen className="h-4 w-4" />;
      case TaskType.REVIEW:
        return <Brain className="h-4 w-4" />;
      case TaskType.PRACTICE:
        return <Target className="h-4 w-4" />;
      default:
        return null;
    }
  };

  const getTaskLabel = (taskType: TaskType, entry: any) => {
    switch (taskType) {
      case TaskType.LEARN:
        return entry.module ? `Apprendre - ${entry.module.title}` : "Apprendre - Nouveau module";
      case TaskType.REVIEW:
        return entry.module ? `Réviser - ${entry.module.title}` : "Révision";
      case TaskType.PRACTICE:
        return entry.targetQuizId ? "Examen simulé" : "Pratique - Questions";
      default:
        return "Tâche";
    }
  };

  const getStatusBadge = (status: PlanEntryStatus) => {
    switch (status) {
      case PlanEntryStatus.COMPLETED:
        return <Badge variant="default" className="bg-green-500 text-xs">Complété</Badge>;
      case PlanEntryStatus.IN_PROGRESS:
        return <Badge variant="default" className="bg-blue-500 text-xs">En cours</Badge>;
      case PlanEntryStatus.PENDING:
        return <Badge variant="outline" className="text-xs">En attente</Badge>;
      case PlanEntryStatus.SKIPPED:
        return <Badge variant="secondary" className="text-xs">Ignoré</Badge>;
      default:
        return null;
    }
  };

  // Group entries by task type and module for cleaner display
  // For LEARN tasks, group by module (one entry per module per week)
  const groupEntriesByType = (entries: any[]) => {
    const grouped: Record<TaskType, any[]> = {
      LEARN: [],
      REVIEW: [],
      PRACTICE: [],
      ORIENTATION: [],
    };

    // For LEARN tasks, group by module (show one per module)
    const learnByModule = new Map<string, any>();
    
    entries.forEach((entry) => {
      if (entry.taskType === TaskType.LEARN && entry.targetModuleId) {
        // Group LEARN tasks by module - keep the first one and aggregate blocks
        if (!learnByModule.has(entry.targetModuleId)) {
          learnByModule.set(entry.targetModuleId, {
            ...entry,
            // Sum up estimated blocks from all entries for this module
            estimatedBlocks: 0,
          });
        }
        const moduleEntry = learnByModule.get(entry.targetModuleId)!;
        moduleEntry.estimatedBlocks += entry.estimatedBlocks || 1;
      } else {
        // For other task types, add directly
        grouped[entry.taskType].push(entry);
      }
    });

    // Add grouped LEARN entries
    grouped.LEARN = Array.from(learnByModule.values());

    return grouped;
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Plan d'étude</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Chargement...</p>
        </CardContent>
      </Card>
    );
  }

  if (weeks.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Plan d'étude
          </CardTitle>
          <CardDescription>Aucun plan d'étude disponible</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Plan d'étude
          </CardTitle>
          <CardDescription>
            {week1StartDate && examDate && (
              <>
                Du {format(week1StartDate, "d MMMM yyyy", { locale: fr })} au{" "}
                {format(examDate, "d MMMM yyyy", { locale: fr })}
              </>
            )}
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {weeks.map((week) => {
            const weekStart = new Date(week.weekStart);
            const weekEnd = new Date(week.weekEnd);
            weekStart.setHours(0, 0, 0, 0);
            weekEnd.setHours(0, 0, 0, 0);
            
            const isCurrentWeek = today >= weekStart && today <= weekEnd;
            const isPast = weekEnd < today;
            const isExpanded = expandedWeeks.has(week.weekNumber);

            const groupedEntries = groupEntriesByType(week.entries);
            const totalEntries = week.entries.length;
            const completedEntries = week.entries.filter(
              (e) => e.status === PlanEntryStatus.COMPLETED
            ).length;
            const completionPercentage = totalEntries > 0 
              ? Math.round((completedEntries / totalEntries) * 100) 
              : 0;

            return (
              <Collapsible
                key={week.weekNumber}
                open={isExpanded}
                onOpenChange={() => toggleWeek(week.weekNumber)}
              >
                <div
                  className={`border rounded-lg ${
                    isCurrentWeek ? "bg-primary/5 border-primary" : ""
                  } ${isPast ? "opacity-75" : ""}`}
                >
                  <CollapsibleTrigger asChild>
                    <Button
                      variant="ghost"
                      className="w-full justify-between p-4 h-auto hover:bg-transparent"
                    >
                      <div className="flex items-center gap-2 sm:gap-3 flex-1 text-left min-w-0">
                        <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
                          {isExpanded ? (
                            <ChevronDown className="h-4 w-4" />
                          ) : (
                            <ChevronRight className="h-4 w-4" />
                          )}
                          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary text-sm sm:text-base">
                            {week.weekNumber}
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1 sm:gap-2 flex-wrap">
                            <h3 className="font-semibold text-base sm:text-lg truncate">
                              Semaine {week.weekNumber}
                            </h3>
                            {isCurrentWeek && (
                              <Badge variant="secondary" className="text-xs flex-shrink-0">
                                Cette semaine
                              </Badge>
                            )}
                            {week.weekNumber === weeks.length && (
                              <Badge variant="outline" className="text-xs flex-shrink-0">
                                Semaine d'examen
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs sm:text-sm text-muted-foreground truncate">
                            {format(weekStart, "d MMM", { locale: fr })} -{" "}
                            {format(weekEnd, "d MMM yyyy", { locale: fr })}
                          </p>
                        </div>
                        <div className="text-right flex-shrink-0 ml-2">
                          <div className="text-xs sm:text-sm font-medium whitespace-nowrap">
                            {completedEntries} / {totalEntries} complété
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {completionPercentage}%
                          </div>
                        </div>
                      </div>
                    </Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="px-4 pb-4 space-y-4">
                      {/* Learn Tasks */}
                      {groupedEntries.LEARN.length > 0 && (
                        <div>
                          <h4 className="text-sm font-semibold mb-2">
                            Phase 1 - Apprendre ({groupedEntries.LEARN.length} tâche
                            {groupedEntries.LEARN.length > 1 ? "s" : ""})
                          </h4>
                          <div className="space-y-2 ml-6">
                            {groupedEntries.LEARN.map((entry) => (
                              <div
                                key={entry.id}
                                className="p-3 border rounded bg-background space-y-2"
                              >
                                <div className="flex items-start justify-between gap-2">
                                  <div className="text-sm font-medium flex-1">
                                    {getTaskLabel(entry.taskType, entry)}
                                  </div>
                                  {getStatusBadge(entry.status)}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  ~{entry.estimatedBlocks * 25} minutes
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Review Tasks */}
                      {groupedEntries.REVIEW.length > 0 && (
                        <div>
                          <h4 className="text-sm font-semibold mb-2">
                            Phase 2 - Réviser ({groupedEntries.REVIEW.length} session
                            {groupedEntries.REVIEW.length > 1 ? "s" : ""})
                          </h4>
                          <div className="space-y-2 ml-6">
                            {groupedEntries.REVIEW.map((entry) => (
                              <div
                                key={entry.id}
                                className="p-3 border rounded bg-background space-y-2"
                              >
                                <div className="flex items-start justify-between gap-2">
                                  <div className="text-sm font-medium flex-1">
                                    {getTaskLabel(entry.taskType, entry)}
                                  </div>
                                  {getStatusBadge(entry.status)}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  ~{entry.estimatedBlocks * 25} minutes
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Practice Tasks */}
                      {groupedEntries.PRACTICE.length > 0 && (
                        <div>
                          <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                            <Target className="h-4 w-4" />
                            Phase 3 - Pratiquer ({groupedEntries.PRACTICE.length} tâche
                            {groupedEntries.PRACTICE.length > 1 ? "s" : ""})
                          </h4>
                          <div className="space-y-2 ml-6">
                            {groupedEntries.PRACTICE.map((entry) => (
                              <div
                                key={entry.id}
                                className="p-3 border rounded bg-background space-y-2"
                              >
                                <div className="flex items-start justify-between gap-2">
                                  <div className="text-sm font-medium flex-1">
                                    {getTaskLabel(entry.taskType, entry)}
                                  </div>
                                  {getStatusBadge(entry.status)}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  ~{entry.estimatedBlocks * 25} minutes
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {totalEntries === 0 && (
                        <p className="text-sm text-muted-foreground text-center py-4">
                          Aucune tâche planifiée pour cette semaine
                        </p>
                      )}
                    </div>
                  </CollapsibleContent>
                </div>
              </Collapsible>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

```

```typescriptreact
"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Calendar, BookOpen, Brain, Target, ChevronDown, ChevronRight } from "lucide-react";
import { getWeeklyStudyPlanAction } from "@/app/actions/study-plan";
import { TaskType, PlanEntryStatus } from "@prisma/client";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface StudyPlanProps {
  courseId: string;
  refreshKey?: number; // Add refresh key to force reload
}

interface WeekData {
  weekNumber: number;
  weekStart: Date;
  weekEnd: Date;
  entries: any[];
}

export function StudyPlan({ courseId, refreshKey }: StudyPlanProps) {
  const [weeks, setWeeks] = useState<WeekData[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedWeeks, setExpandedWeeks] = useState<Set<number>>(new Set([1])); // Expand first week by default
  const [week1StartDate, setWeek1StartDate] = useState<Date | null>(null);
  const [examDate, setExamDate] = useState<Date | null>(null);

  useEffect(() => {
    loadStudyPlan();
  }, [courseId, refreshKey]); // Reload when refreshKey changes

  const loadStudyPlan = async () => {
    try {
      const result = await getWeeklyStudyPlanAction(courseId);
      if (result.success && result.data) {
        setWeeks(result.data);
        setWeek1StartDate(result.week1StartDate ? new Date(result.week1StartDate) : null);
        setExamDate(result.examDate ? new Date(result.examDate) : null);
        
        // Expand current week
        const today = new Date();
        const currentWeek = result.data.find((week: WeekData) => {
          const start = new Date(week.weekStart);
          const end = new Date(week.weekEnd);
          return today >= start && today <= end;
        });
        if (currentWeek) {
          setExpandedWeeks(new Set([currentWeek.weekNumber]));
        }
      }
    } catch (error) {
      console.error("Error loading study plan:", error);
    } finally {
      setLoading(false);
    }
  };

  const toggleWeek = (weekNumber: number) => {
    setExpandedWeeks((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(weekNumber)) {
        newSet.delete(weekNumber);
      } else {
        newSet.add(weekNumber);
      }
      return newSet;
    });
  };

  const getTaskIcon = (taskType: TaskType) => {
    switch (taskType) {
      case TaskType.LEARN:
        return <BookOpen className="h-4 w-4" />;
      case TaskType.REVIEW:
        return <Brain className="h-4 w-4" />;
      case TaskType.PRACTICE:
        return <Target className="h-4 w-4" />;
      default:
        return null;
    }
  };

  const getTaskLabel = (taskType: TaskType, entry: any) => {
    switch (taskType) {
      case TaskType.LEARN:
        return entry.module ? `Apprendre - ${entry.module.title}` : "Apprendre - Nouveau module";
      case TaskType.REVIEW:
        return entry.module ? `Réviser - ${entry.module.title}` : "Révision";
      case TaskType.PRACTICE:
        return entry.targetQuizId ? "Examen simulé" : "Pratique - Questions";
      default:
        return "Tâche";
    }
  };

  const getStatusBadge = (status: PlanEntryStatus) => {
    switch (status) {
      case PlanEntryStatus.COMPLETED:
        return <Badge variant="default" className="bg-green-500 text-xs">Complété</Badge>;
      case PlanEntryStatus.IN_PROGRESS:
        return <Badge variant="default" className="bg-blue-500 text-xs">En cours</Badge>;
      case PlanEntryStatus.PENDING:
        return <Badge variant="outline" className="text-xs">En attente</Badge>;
      case PlanEntryStatus.SKIPPED:
        return <Badge variant="secondary" className="text-xs">Ignoré</Badge>;
      default:
        return null;
    }
  };

  // Group entries by task type and module for cleaner display
  // For LEARN tasks, group by module (one entry per module per week)
  const groupEntriesByType = (entries: any[]) => {
    const grouped: Record<TaskType, any[]> = {
      LEARN: [],
      REVIEW: [],
      PRACTICE: [],
      ORIENTATION: [],
    };

    // For LEARN tasks, group by module (show one per module)
    const learnByModule = new Map<string, any>();
    
    entries.forEach((entry) => {
      if (entry.taskType === TaskType.LEARN && entry.targetModuleId) {
        // Group LEARN tasks by module - keep the first one and aggregate blocks
        if (!learnByModule.has(entry.targetModuleId)) {
          learnByModule.set(entry.targetModuleId, {
            ...entry,
            // Sum up estimated blocks from all entries for this module
            estimatedBlocks: 0,
          });
        }
        const moduleEntry = learnByModule.get(entry.targetModuleId)!;
        moduleEntry.estimatedBlocks += entry.estimatedBlocks || 1;
      } else {
        // For other task types, add directly
        grouped[entry.taskType].push(entry);
      }
    });

    // Add grouped LEARN entries
    grouped.LEARN = Array.from(learnByModule.values());

    return grouped;
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Plan d'étude</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Chargement...</p>
        </CardContent>
      </Card>
    );
  }

  if (weeks.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Plan d'étude
          </CardTitle>
          <CardDescription>Aucun plan d'étude disponible</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Plan d'étude
          </CardTitle>
          <CardDescription>
            {week1StartDate && examDate && (
              <>
                Du {format(week1StartDate, "d MMMM yyyy", { locale: fr })} au{" "}
                {format(examDate, "d MMMM yyyy", { locale: fr })}
              </>
            )}
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {weeks.map((week) => {
            const weekStart = new Date(week.weekStart);
            const weekEnd = new Date(week.weekEnd);
            weekStart.setHours(0, 0, 0, 0);
            weekEnd.setHours(0, 0, 0, 0);
            
            const isCurrentWeek = today >= weekStart && today <= weekEnd;
            const isPast = weekEnd < today;
            const isExpanded = expandedWeeks.has(week.weekNumber);

            const groupedEntries = groupEntriesByType(week.entries);
            const totalEntries = week.entries.length;
            const completedEntries = week.entries.filter(
              (e) => e.status === PlanEntryStatus.COMPLETED
            ).length;
            const completionPercentage = totalEntries > 0 
              ? Math.round((completedEntries / totalEntries) * 100) 
              : 0;

            return (
              <Collapsible
                key={week.weekNumber}
                open={isExpanded}
                onOpenChange={() => toggleWeek(week.weekNumber)}
              >
                <div
                  className={`border rounded-lg ${
                    isCurrentWeek ? "bg-primary/5 border-primary" : ""
                  } ${isPast ? "opacity-75" : ""}`}
                >
                  <CollapsibleTrigger asChild>
                    <Button
                      variant="ghost"
                      className="w-full justify-between p-4 h-auto hover:bg-transparent"
                    >
                      <div className="flex items-center gap-2 sm:gap-3 flex-1 text-left min-w-0">
                        <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
                          {isExpanded ? (
                            <ChevronDown className="h-4 w-4" />
                          ) : (
                            <ChevronRight className="h-4 w-4" />
                          )}
                          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary text-sm sm:text-base">
                            {week.weekNumber}
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1 sm:gap-2 flex-wrap">
                            <h3 className="font-semibold text-base sm:text-lg truncate">
                              Semaine {week.weekNumber}
                            </h3>
                            {isCurrentWeek && (
                              <Badge variant="secondary" className="text-xs flex-shrink-0">
                                Cette semaine
                              </Badge>
                            )}
                            {week.weekNumber === weeks.length && (
                              <Badge variant="outline" className="text-xs flex-shrink-0">
                                Semaine d'examen
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs sm:text-sm text-muted-foreground truncate">
                            {format(weekStart, "d MMM", { locale: fr })} -{" "}
                            {format(weekEnd, "d MMM yyyy", { locale: fr })}
                          </p>
                        </div>
                        <div className="text-right flex-shrink-0 ml-2">
                          <div className="text-xs sm:text-sm font-medium whitespace-nowrap">
                            {completedEntries} / {totalEntries} complété
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {completionPercentage}%
                          </div>
                        </div>
                      </div>
                    </Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="px-4 pb-4 space-y-4">
                      {/* Learn Tasks */}
                      {groupedEntries.LEARN.length > 0 && (
                        <div>
                          <h4 className="text-sm font-semibold mb-2">
                            Phase 1 - Apprendre ({groupedEntries.LEARN.length} tâche
                            {groupedEntries.LEARN.length > 1 ? "s" : ""})
                          </h4>
                          <div className="space-y-2 ml-6">
                            {groupedEntries.LEARN.map((entry) => (
                              <div
                                key={entry.id}
                                className="p-3 border rounded bg-background space-y-2"
                              >
                                <div className="flex items-start justify-between gap-2">
                                  <div className="text-sm font-medium flex-1">
                                    {getTaskLabel(entry.taskType, entry)}
                                  </div>
                                  {getStatusBadge(entry.status)}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  ~{entry.estimatedBlocks * 25} minutes
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Review Tasks */}
                      {groupedEntries.REVIEW.length > 0 && (
                        <div>
                          <h4 className="text-sm font-semibold mb-2">
                            Phase 2 - Réviser ({groupedEntries.REVIEW.length} session
                            {groupedEntries.REVIEW.length > 1 ? "s" : ""})
                          </h4>
                          <div className="space-y-2 ml-6">
                            {groupedEntries.REVIEW.map((entry) => (
                              <div
                                key={entry.id}
                                className="p-3 border rounded bg-background space-y-2"
                              >
                                <div className="flex items-start justify-between gap-2">
                                  <div className="text-sm font-medium flex-1">
                                    {getTaskLabel(entry.taskType, entry)}
                                  </div>
                                  {getStatusBadge(entry.status)}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  ~{entry.estimatedBlocks * 25} minutes
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Practice Tasks */}
                      {groupedEntries.PRACTICE.length > 0 && (
                        <div>
                          <h4 className="text-sm font-semibold mb-2">
                            Phase 3 - Pratiquer ({groupedEntries.PRACTICE.length} tâche
                            {groupedEntries.PRACTICE.length > 1 ? "s" : ""})
                          </h4>
                          <div className="space-y-2 ml-6">
                            {groupedEntries.PRACTICE.map((entry) => (
                              <div
                                key={entry.id}
                                className="p-3 border rounded bg-background space-y-2"
                              >
                                <div className="flex items-start justify-between gap-2">
                                  <div className="text-sm font-medium flex-1">
                                    {getTaskLabel(entry.taskType, entry)}
                                  </div>
                                  {getStatusBadge(entry.status)}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  ~{entry.estimatedBlocks * 25} minutes
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {totalEntries === 0 && (
                        <p className="text-sm text-muted-foreground text-center py-4">
                          Aucune tâche planifiée pour cette semaine
                        </p>
                      )}
                    </div>
                  </CollapsibleContent>
                </div>
              </Collapsible>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

```


Checking for linting errors and verifying if the icon imports are still needed:



Removing the unused `getTaskIcon` function and cleaning up unused imports:



Removing the unused function and cleaning up imports:


```typescriptreact
"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Calendar, ChevronDown, ChevronRight } from "lucide-react";
import { getWeeklyStudyPlanAction } from "@/app/actions/study-plan";
import { TaskType, PlanEntryStatus } from "@prisma/client";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface StudyPlanProps {
  courseId: string;
  refreshKey?: number; // Add refresh key to force reload
}

interface WeekData {
  weekNumber: number;
  weekStart: Date;
  weekEnd: Date;
  entries: any[];
}

export function StudyPlan({ courseId, refreshKey }: StudyPlanProps) {
  const [weeks, setWeeks] = useState<WeekData[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedWeeks, setExpandedWeeks] = useState<Set<number>>(new Set([1])); // Expand first week by default
  const [week1StartDate, setWeek1StartDate] = useState<Date | null>(null);
  const [examDate, setExamDate] = useState<Date | null>(null);

  useEffect(() => {
    loadStudyPlan();
  }, [courseId, refreshKey]); // Reload when refreshKey changes

  const loadStudyPlan = async () => {
    try {
      const result = await getWeeklyStudyPlanAction(courseId);
      if (result.success && result.data) {
        setWeeks(result.data);
        setWeek1StartDate(result.week1StartDate ? new Date(result.week1StartDate) : null);
        setExamDate(result.examDate ? new Date(result.examDate) : null);
        
        // Expand current week
        const today = new Date();
        const currentWeek = result.data.find((week: WeekData) => {
          const start = new Date(week.weekStart);
          const end = new Date(week.weekEnd);
          return today >= start && today <= end;
        });
        if (currentWeek) {
          setExpandedWeeks(new Set([currentWeek.weekNumber]));
        }
      }
    } catch (error) {
      console.error("Error loading study plan:", error);
    } finally {
      setLoading(false);
    }
  };

  const toggleWeek = (weekNumber: number) => {
    setExpandedWeeks((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(weekNumber)) {
        newSet.delete(weekNumber);
      } else {
        newSet.add(weekNumber);
      }
      return newSet;
    });
  };

  const getTaskIcon = (taskType: TaskType) => {
    switch (taskType) {
      case TaskType.LEARN:
        return <BookOpen className="h-4 w-4" />;
      case TaskType.REVIEW:
        return <Brain className="h-4 w-4" />;
      case TaskType.PRACTICE:
        return <Target className="h-4 w-4" />;
      default:
        return null;
    }
  };

  const getTaskLabel = (taskType: TaskType, entry: any) => {
    switch (taskType) {
      case TaskType.LEARN:
        return entry.module ? `Apprendre - ${entry.module.title}` : "Apprendre - Nouveau module";
      case TaskType.REVIEW:
        return entry.module ? `Réviser - ${entry.module.title}` : "Révision";
      case TaskType.PRACTICE:
        return entry.targetQuizId ? "Examen simulé" : "Pratique - Questions";
      default:
        return "Tâche";
    }
  };

  const getStatusBadge = (status: PlanEntryStatus) => {
    switch (status) {
      case PlanEntryStatus.COMPLETED:
        return <Badge variant="default" className="bg-green-500 text-xs">Complété</Badge>;
      case PlanEntryStatus.IN_PROGRESS:
        return <Badge variant="default" className="bg-blue-500 text-xs">En cours</Badge>;
      case PlanEntryStatus.PENDING:
        return <Badge variant="outline" className="text-xs">En attente</Badge>;
      case PlanEntryStatus.SKIPPED:
        return <Badge variant="secondary" className="text-xs">Ignoré</Badge>;
      default:
        return null;
    }
  };

  // Group entries by task type and module for cleaner display
  // For LEARN tasks, group by module (one entry per module per week)
  const groupEntriesByType = (entries: any[]) => {
    const grouped: Record<TaskType, any[]> = {
      LEARN: [],
      REVIEW: [],
      PRACTICE: [],
      ORIENTATION: [],
    };

    // For LEARN tasks, group by module (show one per module)
    const learnByModule = new Map<string, any>();
    
    entries.forEach((entry) => {
      if (entry.taskType === TaskType.LEARN && entry.targetModuleId) {
        // Group LEARN tasks by module - keep the first one and aggregate blocks
        if (!learnByModule.has(entry.targetModuleId)) {
          learnByModule.set(entry.targetModuleId, {
            ...entry,
            // Sum up estimated blocks from all entries for this module
            estimatedBlocks: 0,
          });
        }
        const moduleEntry = learnByModule.get(entry.targetModuleId)!;
        moduleEntry.estimatedBlocks += entry.estimatedBlocks || 1;
      } else {
        // For other task types, add directly
        grouped[entry.taskType].push(entry);
      }
    });

    // Add grouped LEARN entries
    grouped.LEARN = Array.from(learnByModule.values());

    return grouped;
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Plan d'étude</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Chargement...</p>
        </CardContent>
      </Card>
    );
  }

  if (weeks.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Plan d'étude
          </CardTitle>
          <CardDescription>Aucun plan d'étude disponible</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Plan d'étude
          </CardTitle>
          <CardDescription>
            {week1StartDate && examDate && (
              <>
                Du {format(week1StartDate, "d MMMM yyyy", { locale: fr })} au{" "}
                {format(examDate, "d MMMM yyyy", { locale: fr })}
              </>
            )}
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {weeks.map((week) => {
            const weekStart = new Date(week.weekStart);
            const weekEnd = new Date(week.weekEnd);
            weekStart.setHours(0, 0, 0, 0);
            weekEnd.setHours(0, 0, 0, 0);
            
            const isCurrentWeek = today >= weekStart && today <= weekEnd;
            const isPast = weekEnd < today;
            const isExpanded = expandedWeeks.has(week.weekNumber);

            const groupedEntries = groupEntriesByType(week.entries);
            const totalEntries = week.entries.length;
            const completedEntries = week.entries.filter(
              (e) => e.status === PlanEntryStatus.COMPLETED
            ).length;
            const completionPercentage = totalEntries > 0 
              ? Math.round((completedEntries / totalEntries) * 100) 
              : 0;

            return (
              <Collapsible
                key={week.weekNumber}
                open={isExpanded}
                onOpenChange={() => toggleWeek(week.weekNumber)}
              >
                <div
                  className={`border rounded-lg ${
                    isCurrentWeek ? "bg-primary/5 border-primary" : ""
                  } ${isPast ? "opacity-75" : ""}`}
                >
                  <CollapsibleTrigger asChild>
                    <Button
                      variant="ghost"
                      className="w-full justify-between p-4 h-auto hover:bg-transparent"
                    >
                      <div className="flex items-center gap-2 sm:gap-3 flex-1 text-left min-w-0">
                        <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
                          {isExpanded ? (
                            <ChevronDown className="h-4 w-4" />
                          ) : (
                            <ChevronRight className="h-4 w-4" />
                          )}
                          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary text-sm sm:text-base">
                            {week.weekNumber}
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1 sm:gap-2 flex-wrap">
                            <h3 className="font-semibold text-base sm:text-lg truncate">
                              Semaine {week.weekNumber}
                            </h3>
                            {isCurrentWeek && (
                              <Badge variant="secondary" className="text-xs flex-shrink-0">
                                Cette semaine
                              </Badge>
                            )}
                            {week.weekNumber === weeks.length && (
                              <Badge variant="outline" className="text-xs flex-shrink-0">
                                Semaine d'examen
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs sm:text-sm text-muted-foreground truncate">
                            {format(weekStart, "d MMM", { locale: fr })} -{" "}
                            {format(weekEnd, "d MMM yyyy", { locale: fr })}
                          </p>
                        </div>
                        <div className="text-right flex-shrink-0 ml-2">
                          <div className="text-xs sm:text-sm font-medium whitespace-nowrap">
                            {completedEntries} / {totalEntries} complété
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {completionPercentage}%
                          </div>
                        </div>
                      </div>
                    </Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="px-4 pb-4 space-y-4">
                      {/* Learn Tasks */}
                      {groupedEntries.LEARN.length > 0 && (
                        <div>
                          <h4 className="text-sm font-semibold mb-2">
                            Phase 1 - Apprendre ({groupedEntries.LEARN.length} tâche
                            {groupedEntries.LEARN.length > 1 ? "s" : ""})
                          </h4>
                          <div className="space-y-2 ml-6">
                            {groupedEntries.LEARN.map((entry) => (
                              <div
                                key={entry.id}
                                className="p-3 border rounded bg-background space-y-2"
                              >
                                <div className="flex items-start justify-between gap-2">
                                  <div className="text-sm font-medium flex-1">
                                    {getTaskLabel(entry.taskType, entry)}
                                  </div>
                                  {getStatusBadge(entry.status)}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  ~{entry.estimatedBlocks * 25} minutes
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Review Tasks */}
                      {groupedEntries.REVIEW.length > 0 && (
                        <div>
                          <h4 className="text-sm font-semibold mb-2">
                            Phase 2 - Réviser ({groupedEntries.REVIEW.length} session
                            {groupedEntries.REVIEW.length > 1 ? "s" : ""})
                          </h4>
                          <div className="space-y-2 ml-6">
                            {groupedEntries.REVIEW.map((entry) => (
                              <div
                                key={entry.id}
                                className="p-3 border rounded bg-background space-y-2"
                              >
                                <div className="flex items-start justify-between gap-2">
                                  <div className="text-sm font-medium flex-1">
                                    {getTaskLabel(entry.taskType, entry)}
                                  </div>
                                  {getStatusBadge(entry.status)}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  ~{entry.estimatedBlocks * 25} minutes
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Practice Tasks */}
                      {groupedEntries.PRACTICE.length > 0 && (
                        <div>
                          <h4 className="text-sm font-semibold mb-2">
                            Phase 3 - Pratiquer ({groupedEntries.PRACTICE.length} tâche
                            {groupedEntries.PRACTICE.length > 1 ? "s" : ""})
                          </h4>
                          <div className="space-y-2 ml-6">
                            {groupedEntries.PRACTICE.map((entry) => (
                              <div
                                key={entry.id}
                                className="p-3 border rounded bg-background space-y-2"
                              >
                                <div className="flex items-start justify-between gap-2">
                                  <div className="text-sm font-medium flex-1">
                                    {getTaskLabel(entry.taskType, entry)}
                                  </div>
                                  {getStatusBadge(entry.status)}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  ~{entry.estimatedBlocks * 25} minutes
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {totalEntries === 0 && (
                        <p className="text-sm text-muted-foreground text-center py-4">
                          Aucune tâche planifiée pour cette semaine
                        </p>
                      )}
                    </div>
                  </CollapsibleContent>
                </div>
              </Collapsible>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

```

```typescriptreact
"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Calendar, ChevronDown, ChevronRight } from "lucide-react";
import { getWeeklyStudyPlanAction } from "@/app/actions/study-plan";
import { TaskType, PlanEntryStatus } from "@prisma/client";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface StudyPlanProps {
  courseId: string;
  refreshKey?: number; // Add refresh key to force reload
}

interface WeekData {
  weekNumber: number;
  weekStart: Date;
  weekEnd: Date;
  entries: any[];
}

export function StudyPlan({ courseId, refreshKey }: StudyPlanProps) {
  const [weeks, setWeeks] = useState<WeekData[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedWeeks, setExpandedWeeks] = useState<Set<number>>(new Set([1])); // Expand first week by default
  const [week1StartDate, setWeek1StartDate] = useState<Date | null>(null);
  const [examDate, setExamDate] = useState<Date | null>(null);

  useEffect(() => {
    loadStudyPlan();
  }, [courseId, refreshKey]); // Reload when refreshKey changes

  const loadStudyPlan = async () => {
    try {
      const result = await getWeeklyStudyPlanAction(courseId);
      if (result.success && result.data) {
        setWeeks(result.data);
        setWeek1StartDate(result.week1StartDate ? new Date(result.week1StartDate) : null);
        setExamDate(result.examDate ? new Date(result.examDate) : null);
        
        // Expand current week
        const today = new Date();
        const currentWeek = result.data.find((week: WeekData) => {
          const start = new Date(week.weekStart);
          const end = new Date(week.weekEnd);
          return today >= start && today <= end;
        });
        if (currentWeek) {
          setExpandedWeeks(new Set([currentWeek.weekNumber]));
        }
      }
    } catch (error) {
      console.error("Error loading study plan:", error);
    } finally {
      setLoading(false);
    }
  };

  const toggleWeek = (weekNumber: number) => {
    setExpandedWeeks((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(weekNumber)) {
        newSet.delete(weekNumber);
      } else {
        newSet.add(weekNumber);
      }
      return newSet;
    });
  };

  const getTaskLabel = (taskType: TaskType, entry: any) => {
    switch (taskType) {
      case TaskType.LEARN:
        return entry.module ? `Apprendre - ${entry.module.title}` : "Apprendre - Nouveau module";
      case TaskType.REVIEW:
        return entry.module ? `Réviser - ${entry.module.title}` : "Révision";
      case TaskType.PRACTICE:
        return entry.targetQuizId ? "Examen simulé" : "Pratique - Questions";
      default:
        return "Tâche";
    }
  };

  const getStatusBadge = (status: PlanEntryStatus) => {
    switch (status) {
      case PlanEntryStatus.COMPLETED:
        return <Badge variant="default" className="bg-green-500 text-xs">Complété</Badge>;
      case PlanEntryStatus.IN_PROGRESS:
        return <Badge variant="default" className="bg-blue-500 text-xs">En cours</Badge>;
      case PlanEntryStatus.PENDING:
        return <Badge variant="outline" className="text-xs">En attente</Badge>;
      case PlanEntryStatus.SKIPPED:
        return <Badge variant="secondary" className="text-xs">Ignoré</Badge>;
      default:
        return null;
    }
  };

  // Group entries by task type and module for cleaner display
  // For LEARN tasks, group by module (one entry per module per week)
  const groupEntriesByType = (entries: any[]) => {
    const grouped: Record<TaskType, any[]> = {
      LEARN: [],
      REVIEW: [],
      PRACTICE: [],
      ORIENTATION: [],
    };

    // For LEARN tasks, group by module (show one per module)
    const learnByModule = new Map<string, any>();
    
    entries.forEach((entry) => {
      if (entry.taskType === TaskType.LEARN && entry.targetModuleId) {
        // Group LEARN tasks by module - keep the first one and aggregate blocks
        if (!learnByModule.has(entry.targetModuleId)) {
          learnByModule.set(entry.targetModuleId, {
            ...entry,
            // Sum up estimated blocks from all entries for this module
            estimatedBlocks: 0,
          });
        }
        const moduleEntry = learnByModule.get(entry.targetModuleId)!;
        moduleEntry.estimatedBlocks += entry.estimatedBlocks || 1;
      } else {
        // For other task types, add directly
        grouped[entry.taskType].push(entry);
      }
    });

    // Add grouped LEARN entries
    grouped.LEARN = Array.from(learnByModule.values());

    return grouped;
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Plan d'étude</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Chargement...</p>
        </CardContent>
      </Card>
    );
  }

  if (weeks.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Plan d'étude
          </CardTitle>
          <CardDescription>Aucun plan d'étude disponible</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Plan d'étude
          </CardTitle>
          <CardDescription>
            {week1StartDate && examDate && (
              <>
                Du {format(week1StartDate, "d MMMM yyyy", { locale: fr })} au{" "}
                {format(examDate, "d MMMM yyyy", { locale: fr })}
              </>
            )}
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {weeks.map((week) => {
            const weekStart = new Date(week.weekStart);
            const weekEnd = new Date(week.weekEnd);
            weekStart.setHours(0, 0, 0, 0);
            weekEnd.setHours(0, 0, 0, 0);
            
            const isCurrentWeek = today >= weekStart && today <= weekEnd;
            const isPast = weekEnd < today;
            const isExpanded = expandedWeeks.has(week.weekNumber);

            const groupedEntries = groupEntriesByType(week.entries);
            const totalEntries = week.entries.length;
            const completedEntries = week.entries.filter(
              (e) => e.status === PlanEntryStatus.COMPLETED
            ).length;
            const completionPercentage = totalEntries > 0 
              ? Math.round((completedEntries / totalEntries) * 100) 
              : 0;

            return (
              <Collapsible
                key={week.weekNumber}
                open={isExpanded}
                onOpenChange={() => toggleWeek(week.weekNumber)}
              >
                <div
                  className={`border rounded-lg ${
                    isCurrentWeek ? "bg-primary/5 border-primary" : ""
                  } ${isPast ? "opacity-75" : ""}`}
                >
                  <CollapsibleTrigger asChild>
                    <Button
                      variant="ghost"
                      className="w-full justify-between p-4 h-auto hover:bg-transparent"
                    >
                      <div className="flex items-center gap-2 sm:gap-3 flex-1 text-left min-w-0">
                        <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
                          {isExpanded ? (
                            <ChevronDown className="h-4 w-4" />
                          ) : (
                            <ChevronRight className="h-4 w-4" />
                          )}
                          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary text-sm sm:text-base">
                            {week.weekNumber}
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1 sm:gap-2 flex-wrap">
                            <h3 className="font-semibold text-base sm:text-lg truncate">
                              Semaine {week.weekNumber}
                            </h3>
                            {isCurrentWeek && (
                              <Badge variant="secondary" className="text-xs flex-shrink-0">
                                Cette semaine
                              </Badge>
                            )}
                            {week.weekNumber === weeks.length && (
                              <Badge variant="outline" className="text-xs flex-shrink-0">
                                Semaine d'examen
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs sm:text-sm text-muted-foreground truncate">
                            {format(weekStart, "d MMM", { locale: fr })} -{" "}
                            {format(weekEnd, "d MMM yyyy", { locale: fr })}
                          </p>
                        </div>
                        <div className="text-right flex-shrink-0 ml-2">
                          <div className="text-xs sm:text-sm font-medium whitespace-nowrap">
                            {completedEntries} / {totalEntries} complété
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {completionPercentage}%
                          </div>
                        </div>
                      </div>
                    </Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="px-4 pb-4 space-y-4">
                      {/* Learn Tasks */}
                      {groupedEntries.LEARN.length > 0 && (
                        <div>
                          <h4 className="text-sm font-semibold mb-2">
                            Phase 1 - Apprendre ({groupedEntries.LEARN.length} tâche
                            {groupedEntries.LEARN.length > 1 ? "s" : ""})
                          </h4>
                          <div className="space-y-2 ml-6">
                            {groupedEntries.LEARN.map((entry) => (
                              <div
                                key={entry.id}
                                className="p-3 border rounded bg-background space-y-2"
                              >
                                <div className="flex items-start justify-between gap-2">
                                  <div className="text-sm font-medium flex-1">
                                    {getTaskLabel(entry.taskType, entry)}
                                  </div>
                                  {getStatusBadge(entry.status)}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  ~{entry.estimatedBlocks * 25} minutes
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Review Tasks */}
                      {groupedEntries.REVIEW.length > 0 && (
                        <div>
                          <h4 className="text-sm font-semibold mb-2">
                            Phase 2 - Réviser ({groupedEntries.REVIEW.length} session
                            {groupedEntries.REVIEW.length > 1 ? "s" : ""})
                          </h4>
                          <div className="space-y-2 ml-6">
                            {groupedEntries.REVIEW.map((entry) => (
                              <div
                                key={entry.id}
                                className="p-3 border rounded bg-background space-y-2"
                              >
                                <div className="flex items-start justify-between gap-2">
                                  <div className="text-sm font-medium flex-1">
                                    {getTaskLabel(entry.taskType, entry)}
                                  </div>
                                  {getStatusBadge(entry.status)}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  ~{entry.estimatedBlocks * 25} minutes
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Practice Tasks */}
                      {groupedEntries.PRACTICE.length > 0 && (
                        <div>
                          <h4 className="text-sm font-semibold mb-2">
                            Phase 3 - Pratiquer ({groupedEntries.PRACTICE.length} tâche
                            {groupedEntries.PRACTICE.length > 1 ? "s" : ""})
                          </h4>
                          <div className="space-y-2 ml-6">
                            {groupedEntries.PRACTICE.map((entry) => (
                              <div
                                key={entry.id}
                                className="p-3 border rounded bg-background space-y-2"
                              >
                                <div className="flex items-start justify-between gap-2">
                                  <div className="text-sm font-medium flex-1">
                                    {getTaskLabel(entry.taskType, entry)}
                                  </div>
                                  {getStatusBadge(entry.status)}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  ~{entry.estimatedBlocks * 25} minutes
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {totalEntries === 0 && (
                        <p className="text-sm text-muted-foreground text-center py-4">
                          Aucune tâche planifiée pour cette semaine
                        </p>
                      )}
                    </div>
                  </CollapsibleContent>
                </div>
              </Collapsible>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

```


Updated the study plan component for a cleaner layout:

1. **Removed all icons**: Removed book, brain, and target icons from task items and section headers.

2. **Stacked layout**: Switched from horizontal flex to a vertical stacked layout:
   - Task title and status badge on the first row
   - Duration on a separate row below

3. **Improved spacing**: Increased padding (`p-3` instead of `p-2`) and added `space-y-2` for vertical spacing.

4. **Code cleanup**: Removed the unused `getTaskIcon` function and unused icon imports.

The study plan now has a cleaner, more organized appearance with a stacked layout that's easier to read on mobile.

---

**User**

Can we make the syllabus responsive so we dont have to scrollhorizontally

---

**Cursor**


Searching for the syllabus/course plan component to make it responsive and remove horizontal scrolling:



Reading the syllabus component:



Making the syllabus responsive: converting the table to a card-based layout on mobile to prevent horizontal scrolling:


```typescriptreact
"use client";

import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Video, FileText, Play } from "lucide-react";
import { useCourseModules } from "@/lib/hooks/use-learning-activities";
import { useBatchModuleContent } from "@/lib/hooks/use-module-content";

interface Module {
  id: string;
  title: string;
  order: number;
  examWeight: number | null;
}

interface ModuleContent {
  videos: Array<{ id: string; order: number }>;
  notes: Array<{ id: string; order: number }>;
  quizzes: Array<{ id: string; order: number }>;
}

interface SyllabusProps {
  courseId: string;
}

export function Syllabus({ courseId }: SyllabusProps) {
  // Use React Query for modules
  const { data: modulesData, isLoading: modulesLoading } = useCourseModules(courseId);
  const modules = (modulesData || []) as Module[];

  // Get module IDs for batch content loading
  const moduleIds = useMemo(() => modules.map((m) => m.id), [modules]);

  // Use React Query for batch module content
  const { data: batchResult, isLoading: contentLoading } = useBatchModuleContent(moduleIds);

  const loading = modulesLoading || contentLoading;

  // Process module contents
  const moduleContents = useMemo(() => {
    if (!batchResult?.success || !batchResult.data) {
      return {} as Record<string, ModuleContent>;
    }
    return batchResult.data as Record<string, ModuleContent>;
  }, [batchResult]);


  if (loading) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-muted-foreground">Chargement du plan de cours...</p>
        </CardContent>
      </Card>
    );
  }

  if (modules.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-muted-foreground">Aucun module disponible pour ce cours.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Plan de cours</CardTitle>
        </CardHeader>
        <CardContent>
          {/* Mobile Card Layout */}
          <div className="block md:hidden space-y-4">
            {modules.map((module) => {
              const content = moduleContents[module.id] || { videos: [], notes: [], quizzes: [] };
              const hasVideos = content.videos.length > 0;
              const hasNotes = content.notes.length > 0;
              const hasQuizzes = content.quizzes.length > 0;

              return (
                <div key={module.id} className="border rounded-lg p-4 space-y-3">
                  <div className="font-medium text-sm">
                    Module {module.order + 1}: {module.title}
                  </div>
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">Vidéos:</span>
                      {hasVideos ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0"
                          onClick={() => {
                            window.location.href = `/apprendre/${courseId}?module=${module.id}&tab=videos`;
                          }}
                          title={`${content.videos.length} vidéo${content.videos.length > 1 ? 's' : ''}`}
                        >
                          <Video className="h-4 w-4 text-primary" />
                        </Button>
                      ) : (
                        <span className="text-muted-foreground text-xs">-</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">Notes:</span>
                      {hasNotes ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0"
                          onClick={() => {
                            window.location.href = `/apprendre/${courseId}?module=${module.id}&tab=notes`;
                          }}
                          title={`${content.notes.length} note${content.notes.length > 1 ? 's' : ''}`}
                        >
                          <FileText className="h-4 w-4 text-primary" />
                        </Button>
                      ) : (
                        <span className="text-muted-foreground text-xs">-</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">Quiz:</span>
                      {hasQuizzes ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0"
                          onClick={() => {
                            window.location.href = `/apprendre/${courseId}?module=${module.id}&tab=quiz`;
                          }}
                          title={`${content.quizzes.length} quiz${content.quizzes.length > 1 ? 's' : ''}`}
                        >
                          <Play className="h-4 w-4 text-primary" />
                        </Button>
                      ) : (
                        <span className="text-muted-foreground text-xs">-</span>
                      )}
                    </div>
                    {module.examWeight !== null && (
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">Pondération:</span>
                        <Badge variant="outline" className="text-xs">
                          {(module.examWeight * 100).toFixed(1)}%
                        </Badge>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Desktop Table Layout */}
          <div className="hidden md:block overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Module</TableHead>
                  <TableHead className="text-center">Vidéos</TableHead>
                  <TableHead className="text-center">Notes</TableHead>
                  <TableHead className="text-center">Quiz</TableHead>
                  <TableHead className="text-center">Pondération</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {modules.map((module) => {
                  const content = moduleContents[module.id] || { videos: [], notes: [], quizzes: [] };
                  const hasVideos = content.videos.length > 0;
                  const hasNotes = content.notes.length > 0;
                  const hasQuizzes = content.quizzes.length > 0;

                  return (
                    <TableRow key={module.id}>
                      <TableCell className="font-medium">
                        Module {module.order + 1}: {module.title}
                      </TableCell>
                      <TableCell className="text-center">
                        {hasVideos ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0"
                            onClick={() => {
                              window.location.href = `/apprendre/${courseId}?module=${module.id}&tab=videos`;
                            }}
                            title={`${content.videos.length} vidéo${content.videos.length > 1 ? 's' : ''}`}
                          >
                            <Video className="h-4 w-4 text-primary" />
                          </Button>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        {hasNotes ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0"
                            onClick={() => {
                              window.location.href = `/apprendre/${courseId}?module=${module.id}&tab=notes`;
                            }}
                            title={`${content.notes.length} note${content.notes.length > 1 ? 's' : ''}`}
                          >
                            <FileText className="h-4 w-4 text-primary" />
                          </Button>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        {hasQuizzes ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0"
                            onClick={() => {
                              window.location.href = `/apprendre/${courseId}?module=${module.id}&tab=quiz`;
                            }}
                            title={`${content.quizzes.length} quiz${content.quizzes.length > 1 ? 's' : ''}`}
                          >
                            <Play className="h-4 w-4 text-primary" />
                          </Button>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        {module.examWeight !== null ? (
                          <Badge variant="outline">
                            {(module.examWeight * 100).toFixed(1)}%
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}


```


Refining the mobile layout for better organization:


```typescriptreact
"use client";

import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Video, FileText, Play } from "lucide-react";
import { useCourseModules } from "@/lib/hooks/use-learning-activities";
import { useBatchModuleContent } from "@/lib/hooks/use-module-content";

interface Module {
  id: string;
  title: string;
  order: number;
  examWeight: number | null;
}

interface ModuleContent {
  videos: Array<{ id: string; order: number }>;
  notes: Array<{ id: string; order: number }>;
  quizzes: Array<{ id: string; order: number }>;
}

interface SyllabusProps {
  courseId: string;
}

export function Syllabus({ courseId }: SyllabusProps) {
  // Use React Query for modules
  const { data: modulesData, isLoading: modulesLoading } = useCourseModules(courseId);
  const modules = (modulesData || []) as Module[];

  // Get module IDs for batch content loading
  const moduleIds = useMemo(() => modules.map((m) => m.id), [modules]);

  // Use React Query for batch module content
  const { data: batchResult, isLoading: contentLoading } = useBatchModuleContent(moduleIds);

  const loading = modulesLoading || contentLoading;

  // Process module contents
  const moduleContents = useMemo(() => {
    if (!batchResult?.success || !batchResult.data) {
      return {} as Record<string, ModuleContent>;
    }
    return batchResult.data as Record<string, ModuleContent>;
  }, [batchResult]);


  if (loading) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-muted-foreground">Chargement du plan de cours...</p>
        </CardContent>
      </Card>
    );
  }

  if (modules.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-muted-foreground">Aucun module disponible pour ce cours.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Plan de cours</CardTitle>
        </CardHeader>
        <CardContent>
          {/* Mobile Card Layout */}
          <div className="block md:hidden space-y-3">
            {modules.map((module) => {
              const content = moduleContents[module.id] || { videos: [], notes: [], quizzes: [] };
              const hasVideos = content.videos.length > 0;
              const hasNotes = content.notes.length > 0;
              const hasQuizzes = content.quizzes.length > 0;

              return (
                <div key={module.id} className="border rounded-lg p-4 space-y-3">
                  <div className="font-medium text-sm leading-tight">
                    Module {module.order + 1}: {module.title}
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground min-w-[50px]">Vidéos</span>
                      {hasVideos ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0"
                          onClick={() => {
                            window.location.href = `/apprendre/${courseId}?module=${module.id}&tab=videos`;
                          }}
                          title={`${content.videos.length} vidéo${content.videos.length > 1 ? 's' : ''}`}
                        >
                          <Video className="h-4 w-4 text-primary" />
                        </Button>
                      ) : (
                        <span className="text-muted-foreground text-xs">-</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground min-w-[50px]">Notes</span>
                      {hasNotes ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0"
                          onClick={() => {
                            window.location.href = `/apprendre/${courseId}?module=${module.id}&tab=notes`;
                          }}
                          title={`${content.notes.length} note${content.notes.length > 1 ? 's' : ''}`}
                        >
                          <FileText className="h-4 w-4 text-primary" />
                        </Button>
                      ) : (
                        <span className="text-muted-foreground text-xs">-</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground min-w-[50px]">Quiz</span>
                      {hasQuizzes ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0"
                          onClick={() => {
                            window.location.href = `/apprendre/${courseId}?module=${module.id}&tab=quiz`;
                          }}
                          title={`${content.quizzes.length} quiz${content.quizzes.length > 1 ? 's' : ''}`}
                        >
                          <Play className="h-4 w-4 text-primary" />
                        </Button>
                      ) : (
                        <span className="text-muted-foreground text-xs">-</span>
                      )}
                    </div>
                    {module.examWeight !== null && (
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground min-w-[50px]">Pondération</span>
                        <Badge variant="outline" className="text-xs">
                          {(module.examWeight * 100).toFixed(1)}%
                        </Badge>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Desktop Table Layout */}
          <div className="hidden md:block overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Module</TableHead>
                  <TableHead className="text-center">Vidéos</TableHead>
                  <TableHead className="text-center">Notes</TableHead>
                  <TableHead className="text-center">Quiz</TableHead>
                  <TableHead className="text-center">Pondération</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {modules.map((module) => {
                  const content = moduleContents[module.id] || { videos: [], notes: [], quizzes: [] };
                  const hasVideos = content.videos.length > 0;
                  const hasNotes = content.notes.length > 0;
                  const hasQuizzes = content.quizzes.length > 0;

                  return (
                    <TableRow key={module.id}>
                      <TableCell className="font-medium">
                        Module {module.order + 1}: {module.title}
                      </TableCell>
                      <TableCell className="text-center">
                        {hasVideos ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0"
                            onClick={() => {
                              window.location.href = `/apprendre/${courseId}?module=${module.id}&tab=videos`;
                            }}
                            title={`${content.videos.length} vidéo${content.videos.length > 1 ? 's' : ''}`}
                          >
                            <Video className="h-4 w-4 text-primary" />
                          </Button>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        {hasNotes ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0"
                            onClick={() => {
                              window.location.href = `/apprendre/${courseId}?module=${module.id}&tab=notes`;
                            }}
                            title={`${content.notes.length} note${content.notes.length > 1 ? 's' : ''}`}
                          >
                            <FileText className="h-4 w-4 text-primary" />
                          </Button>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        {hasQuizzes ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0"
                            onClick={() => {
                              window.location.href = `/apprendre/${courseId}?module=${module.id}&tab=quiz`;
                            }}
                            title={`${content.quizzes.length} quiz${content.quizzes.length > 1 ? 's' : ''}`}
                          >
                            <Play className="h-4 w-4 text-primary" />
                          </Button>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        {module.examWeight !== null ? (
                          <Badge variant="outline">
                            {(module.examWeight * 100).toFixed(1)}%
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}


```


Made the syllabus responsive to remove horizontal scrolling on mobile. Changes:

1. **Mobile card layout** (screens < md): Each module is a card with:
   - Module title at the top
   - 2-column grid for content types (Vidéos, Notes, Quiz, Pondération)
   - Icons/buttons aligned
   - No horizontal scrolling

2. **Desktop table layout** (screens ≥ md): Keeps the original table for better data density.

3. **Responsive breakpoint**: Uses `block md:hidden` for mobile cards and `hidden md:block` for the desktop table.

On mobile, modules stack vertically in cards, and all content fits without horizontal scrolling. On desktop, the table layout remains.

---

**User**

Please remove the redundant page titles on plan du jour, syllabus, outils d'apprentissage and all the phase page. The title appears twice on all these pages

---

**Cursor**


Searching for components with duplicate titles:



Reading the main interface file to understand the structure:



Checking the phase components for duplicate titles:



Checking other components for duplicate titles:



Reading the learning tools component and checking phase 3:



Removing duplicate titles from the components. The main interface already has h1 titles, so removing the CardTitle from each component:


```typescriptreact
"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Clock, BookOpen, Brain, Target, Play } from "lucide-react";
import { getTodaysPlanAction, updatePlanEntryStatusAction } from "@/app/actions/study-plan";
import { TaskType, PlanEntryStatus } from "@prisma/client";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

interface TodaysPlanProps {
  courseId: string;
}

export function TodaysPlan({ courseId }: TodaysPlanProps) {
  const router = useRouter();
  const [planEntries, setPlanEntries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTodaysPlan();
  }, [courseId]);

  const loadTodaysPlan = async () => {
    try {
      const result = await getTodaysPlanAction(courseId);
      if (result.success && result.data) {
        setPlanEntries(result.data);
      }
    } catch (error) {
      console.error("Error loading today's plan:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleStartTask = async (entryId: string, taskType: TaskType) => {
    // Update status to in progress
    await updatePlanEntryStatusAction(entryId, PlanEntryStatus.IN_PROGRESS);
    loadTodaysPlan();

    // Navigate to appropriate phase/content
    if (taskType === TaskType.LEARN) {
      router.push(`/apprendre/${courseId}?phase=learn`);
    } else if (taskType === TaskType.REVIEW) {
      router.push(`/apprendre/${courseId}?phase=review`);
    } else if (taskType === TaskType.PRACTICE) {
      router.push(`/apprendre/${courseId}?phase=practice`);
    }
  };

  const handleCompleteTask = async (entryId: string) => {
    const result = await updatePlanEntryStatusAction(entryId, PlanEntryStatus.COMPLETED);
    if (result.success) {
      toast.success("Tâche complétée!");
      loadTodaysPlan();
      router.refresh();
    }
  };

  const getTaskIcon = (taskType: TaskType) => {
    switch (taskType) {
      case TaskType.LEARN:
        return <BookOpen className="h-4 w-4" />;
      case TaskType.REVIEW:
        return <Brain className="h-4 w-4" />;
      case TaskType.PRACTICE:
        return <Target className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  const getTaskLabel = (taskType: TaskType, entry: any) => {
    switch (taskType) {
      case TaskType.LEARN:
        return entry.module ? `Apprendre - ${entry.module.title}` : "Apprendre - Nouveau module";
      case TaskType.REVIEW:
        return "Révision - Cartes mémoire et quiz";
      case TaskType.PRACTICE:
        return "Pratique - Questions et exercices";
      default:
        return "Tâche";
    }
  };

  const getStatusBadge = (status: PlanEntryStatus) => {
    switch (status) {
      case PlanEntryStatus.COMPLETED:
        return <Badge variant="default" className="bg-green-500">Complété</Badge>;
      case PlanEntryStatus.IN_PROGRESS:
        return <Badge variant="default" className="bg-blue-500">En cours</Badge>;
      case PlanEntryStatus.PENDING:
        return <Badge variant="outline">En attente</Badge>;
      case PlanEntryStatus.SKIPPED:
        return <Badge variant="secondary">Ignoré</Badge>;
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent>
          <p className="text-muted-foreground">Chargement...</p>
        </CardContent>
      </Card>
    );
  }

  if (planEntries.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardDescription>Aucune tâche planifiée pour aujourd'hui</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const completedCount = planEntries.filter((e) => e.status === PlanEntryStatus.COMPLETED).length;
  const totalCount = planEntries.length;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Plan du jour</CardTitle>
            <CardDescription>
              {completedCount} sur {totalCount} tâches complétées
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <div className="text-sm text-muted-foreground">
              {Math.round((completedCount / totalCount) * 100)}%
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {planEntries.map((entry) => (
            <div
              key={entry.id}
              className="flex items-center justify-between p-3 border rounded-lg"
            >
              <div className="flex items-center gap-3 flex-1">
                <div className="text-muted-foreground">{getTaskIcon(entry.taskType)}</div>
                <div className="flex-1">
                  <div className="font-medium">{getTaskLabel(entry.taskType, entry)}</div>
                  <div className="text-sm text-muted-foreground">
                    ~{entry.estimatedBlocks * 25} minutes
                  </div>
                </div>
                {getStatusBadge(entry.status)}
              </div>
              <div className="flex items-center gap-2">
                {entry.status === PlanEntryStatus.PENDING && (
                  <Button
                    size="sm"
                    onClick={() => handleStartTask(entry.id, entry.taskType)}
                  >
                    <Play className="h-4 w-4 mr-1" />
                    Commencer
                  </Button>
                )}
                {entry.status === PlanEntryStatus.IN_PROGRESS && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleCompleteTask(entry.id)}
                  >
                    <CheckCircle2 className="h-4 w-4 mr-1" />
                    Terminer
                  </Button>
                )}
                {entry.status === PlanEntryStatus.COMPLETED && (
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}


```

```typescriptreact
"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Clock, BookOpen, Brain, Target, Play } from "lucide-react";
import { getTodaysPlanAction, updatePlanEntryStatusAction } from "@/app/actions/study-plan";
import { TaskType, PlanEntryStatus } from "@prisma/client";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

interface TodaysPlanProps {
  courseId: string;
}

export function TodaysPlan({ courseId }: TodaysPlanProps) {
  const router = useRouter();
  const [planEntries, setPlanEntries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTodaysPlan();
  }, [courseId]);

  const loadTodaysPlan = async () => {
    try {
      const result = await getTodaysPlanAction(courseId);
      if (result.success && result.data) {
        setPlanEntries(result.data);
      }
    } catch (error) {
      console.error("Error loading today's plan:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleStartTask = async (entryId: string, taskType: TaskType) => {
    // Update status to in progress
    await updatePlanEntryStatusAction(entryId, PlanEntryStatus.IN_PROGRESS);
    loadTodaysPlan();

    // Navigate to appropriate phase/content
    if (taskType === TaskType.LEARN) {
      router.push(`/apprendre/${courseId}?phase=learn`);
    } else if (taskType === TaskType.REVIEW) {
      router.push(`/apprendre/${courseId}?phase=review`);
    } else if (taskType === TaskType.PRACTICE) {
      router.push(`/apprendre/${courseId}?phase=practice`);
    }
  };

  const handleCompleteTask = async (entryId: string) => {
    const result = await updatePlanEntryStatusAction(entryId, PlanEntryStatus.COMPLETED);
    if (result.success) {
      toast.success("Tâche complétée!");
      loadTodaysPlan();
      router.refresh();
    }
  };

  const getTaskIcon = (taskType: TaskType) => {
    switch (taskType) {
      case TaskType.LEARN:
        return <BookOpen className="h-4 w-4" />;
      case TaskType.REVIEW:
        return <Brain className="h-4 w-4" />;
      case TaskType.PRACTICE:
        return <Target className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  const getTaskLabel = (taskType: TaskType, entry: any) => {
    switch (taskType) {
      case TaskType.LEARN:
        return entry.module ? `Apprendre - ${entry.module.title}` : "Apprendre - Nouveau module";
      case TaskType.REVIEW:
        return "Révision - Cartes mémoire et quiz";
      case TaskType.PRACTICE:
        return "Pratique - Questions et exercices";
      default:
        return "Tâche";
    }
  };

  const getStatusBadge = (status: PlanEntryStatus) => {
    switch (status) {
      case PlanEntryStatus.COMPLETED:
        return <Badge variant="default" className="bg-green-500">Complété</Badge>;
      case PlanEntryStatus.IN_PROGRESS:
        return <Badge variant="default" className="bg-blue-500">En cours</Badge>;
      case PlanEntryStatus.PENDING:
        return <Badge variant="outline">En attente</Badge>;
      case PlanEntryStatus.SKIPPED:
        return <Badge variant="secondary">Ignoré</Badge>;
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent>
          <p className="text-muted-foreground">Chargement...</p>
        </CardContent>
      </Card>
    );
  }

  if (planEntries.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardDescription>Aucune tâche planifiée pour aujourd'hui</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const completedCount = planEntries.filter((e) => e.status === PlanEntryStatus.COMPLETED).length;
  const totalCount = planEntries.length;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardDescription>
              {completedCount} sur {totalCount} tâches complétées
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <div className="text-sm text-muted-foreground">
              {Math.round((completedCount / totalCount) * 100)}%
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {planEntries.map((entry) => (
            <div
              key={entry.id}
              className="flex items-center justify-between p-3 border rounded-lg"
            >
              <div className="flex items-center gap-3 flex-1">
                <div className="text-muted-foreground">{getTaskIcon(entry.taskType)}</div>
                <div className="flex-1">
                  <div className="font-medium">{getTaskLabel(entry.taskType, entry)}</div>
                  <div className="text-sm text-muted-foreground">
                    ~{entry.estimatedBlocks * 25} minutes
                  </div>
                </div>
                {getStatusBadge(entry.status)}
              </div>
              <div className="flex items-center gap-2">
                {entry.status === PlanEntryStatus.PENDING && (
                  <Button
                    size="sm"
                    onClick={() => handleStartTask(entry.id, entry.taskType)}
                  >
                    <Play className="h-4 w-4 mr-1" />
                    Commencer
                  </Button>
                )}
                {entry.status === PlanEntryStatus.IN_PROGRESS && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleCompleteTask(entry.id)}
                  >
                    <CheckCircle2 className="h-4 w-4 mr-1" />
                    Terminer
                  </Button>
                )}
                {entry.status === PlanEntryStatus.COMPLETED && (
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}


```

```typescriptreact
"use client";

import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Video, FileText, Play } from "lucide-react";
import { useCourseModules } from "@/lib/hooks/use-learning-activities";
import { useBatchModuleContent } from "@/lib/hooks/use-module-content";

interface Module {
  id: string;
  title: string;
  order: number;
  examWeight: number | null;
}

interface ModuleContent {
  videos: Array<{ id: string; order: number }>;
  notes: Array<{ id: string; order: number }>;
  quizzes: Array<{ id: string; order: number }>;
}

interface SyllabusProps {
  courseId: string;
}

export function Syllabus({ courseId }: SyllabusProps) {
  // Use React Query for modules
  const { data: modulesData, isLoading: modulesLoading } = useCourseModules(courseId);
  const modules = (modulesData || []) as Module[];

  // Get module IDs for batch content loading
  const moduleIds = useMemo(() => modules.map((m) => m.id), [modules]);

  // Use React Query for batch module content
  const { data: batchResult, isLoading: contentLoading } = useBatchModuleContent(moduleIds);

  const loading = modulesLoading || contentLoading;

  // Process module contents
  const moduleContents = useMemo(() => {
    if (!batchResult?.success || !batchResult.data) {
      return {} as Record<string, ModuleContent>;
    }
    return batchResult.data as Record<string, ModuleContent>;
  }, [batchResult]);


  if (loading) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-muted-foreground">Chargement du plan de cours...</p>
        </CardContent>
      </Card>
    );
  }

  if (modules.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-muted-foreground">Aucun module disponible pour ce cours.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="pt-6">
          {/* Mobile Card Layout */}
          <div className="block md:hidden space-y-3">
            {modules.map((module) => {
              const content = moduleContents[module.id] || { videos: [], notes: [], quizzes: [] };
              const hasVideos = content.videos.length > 0;
              const hasNotes = content.notes.length > 0;
              const hasQuizzes = content.quizzes.length > 0;

              return (
                <div key={module.id} className="border rounded-lg p-4 space-y-3">
                  <div className="font-medium text-sm leading-tight">
                    Module {module.order + 1}: {module.title}
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground min-w-[50px]">Vidéos</span>
                      {hasVideos ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0"
                          onClick={() => {
                            window.location.href = `/apprendre/${courseId}?module=${module.id}&tab=videos`;
                          }}
                          title={`${content.videos.length} vidéo${content.videos.length > 1 ? 's' : ''}`}
                        >
                          <Video className="h-4 w-4 text-primary" />
                        </Button>
                      ) : (
                        <span className="text-muted-foreground text-xs">-</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground min-w-[50px]">Notes</span>
                      {hasNotes ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0"
                          onClick={() => {
                            window.location.href = `/apprendre/${courseId}?module=${module.id}&tab=notes`;
                          }}
                          title={`${content.notes.length} note${content.notes.length > 1 ? 's' : ''}`}
                        >
                          <FileText className="h-4 w-4 text-primary" />
                        </Button>
                      ) : (
                        <span className="text-muted-foreground text-xs">-</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground min-w-[50px]">Quiz</span>
                      {hasQuizzes ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0"
                          onClick={() => {
                            window.location.href = `/apprendre/${courseId}?module=${module.id}&tab=quiz`;
                          }}
                          title={`${content.quizzes.length} quiz${content.quizzes.length > 1 ? 's' : ''}`}
                        >
                          <Play className="h-4 w-4 text-primary" />
                        </Button>
                      ) : (
                        <span className="text-muted-foreground text-xs">-</span>
                      )}
                    </div>
                    {module.examWeight !== null && (
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground min-w-[50px]">Pondération</span>
                        <Badge variant="outline" className="text-xs">
                          {(module.examWeight * 100).toFixed(1)}%
                        </Badge>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Desktop Table Layout */}
          <div className="hidden md:block overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Module</TableHead>
                  <TableHead className="text-center">Vidéos</TableHead>
                  <TableHead className="text-center">Notes</TableHead>
                  <TableHead className="text-center">Quiz</TableHead>
                  <TableHead className="text-center">Pondération</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {modules.map((module) => {
                  const content = moduleContents[module.id] || { videos: [], notes: [], quizzes: [] };
                  const hasVideos = content.videos.length > 0;
                  const hasNotes = content.notes.length > 0;
                  const hasQuizzes = content.quizzes.length > 0;

                  return (
                    <TableRow key={module.id}>
                      <TableCell className="font-medium">
                        Module {module.order + 1}: {module.title}
                      </TableCell>
                      <TableCell className="text-center">
                        {hasVideos ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0"
                            onClick={() => {
                              window.location.href = `/apprendre/${courseId}?module=${module.id}&tab=videos`;
                            }}
                            title={`${content.videos.length} vidéo${content.videos.length > 1 ? 's' : ''}`}
                          >
                            <Video className="h-4 w-4 text-primary" />
                          </Button>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        {hasNotes ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0"
                            onClick={() => {
                              window.location.href = `/apprendre/${courseId}?module=${module.id}&tab=notes`;
                            }}
                            title={`${content.notes.length} note${content.notes.length > 1 ? 's' : ''}`}
                          >
                            <FileText className="h-4 w-4 text-primary" />
                          </Button>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        {hasQuizzes ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0"
                            onClick={() => {
                              window.location.href = `/apprendre/${courseId}?module=${module.id}&tab=quiz`;
                            }}
                            title={`${content.quizzes.length} quiz${content.quizzes.length > 1 ? 's' : ''}`}
                          >
                            <Play className="h-4 w-4 text-primary" />
                          </Button>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        {module.examWeight !== null ? (
                          <Badge variant="outline">
                            {(module.examWeight * 100).toFixed(1)}%
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}


```

```typescriptreact
"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Play, Layers, BookOpen } from "lucide-react";
import { FlashcardComponent } from "./flashcard-component";
import { LearningActivitiesList } from "./learning-activities-list";
import { SmartReviewDashboard } from "./smart-review-dashboard";

interface Phase2ReviewProps {
  courseId: string;
  course: any;
  settings: any;
}

export function Phase2Review({ courseId, course, settings }: Phase2ReviewProps) {
  const [activeTab, setActiveTab] = useState<"smart-review" | "flashcards" | "activities">("smart-review");

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardDescription>
            Consolidation des connaissances via rappel actif et répétition espacée.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
            <TabsList className="grid w-full grid-cols-3 h-auto gap-1">
              <TabsTrigger value="smart-review" className="flex items-center justify-center gap-1 sm:gap-2 py-2.5 sm:py-1.5 text-xs sm:text-sm px-1 sm:px-3 min-w-0">
                <Play className="h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0" />
                <span className="hidden sm:inline truncate">Révision intelligente</span>
                <span className="sm:hidden truncate">Révision</span>
              </TabsTrigger>
              <TabsTrigger value="flashcards" className="flex items-center justify-center gap-1 sm:gap-2 py-2.5 sm:py-1.5 text-xs sm:text-sm px-1 sm:px-3 min-w-0">
                <Layers className="h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0" />
                <span className="truncate">Flashcards</span>
              </TabsTrigger>
              <TabsTrigger value="activities" className="flex items-center justify-center gap-1 sm:gap-2 py-2.5 sm:py-1.5 text-xs sm:text-sm px-1 sm:px-3 min-w-0">
                <BookOpen className="h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0" />
                <span className="truncate">Activités</span>
              </TabsTrigger>
            </TabsList>
            <TabsContent value="smart-review" className="mt-6">
              <SmartReviewDashboard courseId={courseId} course={course} settings={settings} />
            </TabsContent>
            <TabsContent value="flashcards" className="mt-6">
              <FlashcardComponent courseId={courseId} contentItemId="flashcards" />
            </TabsContent>
            <TabsContent value="activities" className="mt-6">
              <LearningActivitiesList courseId={courseId} />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}


```


Checking for other duplicate titles and verifying the changes:



Checking what those CardTitles say:



Removing the CardTitles from Phase 1 and Phase 3:


```typescriptreact
"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { BookOpen, CheckCircle2, Circle, Play } from "lucide-react";
import { getModuleProgressAction } from "@/app/actions/study-plan";
import { LearnStatus } from "@prisma/client";
import { ModuleDetailPage } from "./module-detail-page";

interface Phase1LearnProps {
  courseId: string;
  course: any;
  settings: any;
  onModuleSelect?: (moduleId: string) => void;
}

export function Phase1Learn({ courseId, course, settings, onModuleSelect }: Phase1LearnProps) {
  const [moduleProgress, setModuleProgress] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedModuleId, setSelectedModuleId] = useState<string | null>(null);

  useEffect(() => {
    loadProgress();
  }, [courseId]);

  const loadProgress = async () => {
    try {
      const result = await getModuleProgressAction(courseId);
      if (result.success && result.data) {
        setModuleProgress(result.data);
      }
    } catch (error) {
      console.error("Error loading progress:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleStartModule = (moduleId: string) => {
    if (onModuleSelect) {
      onModuleSelect(moduleId);
    } else {
      setSelectedModuleId(moduleId);
    }
  };

  const handleBack = () => {
    setSelectedModuleId(null);
    loadProgress(); // Reload progress when going back
  };

  const getStatusIcon = (status: LearnStatus) => {
    switch (status) {
      case LearnStatus.LEARNED:
        return <CheckCircle2 className="h-5 w-5 text-green-500" />;
      case LearnStatus.IN_PROGRESS:
        return <Circle className="h-5 w-5 text-blue-500" />;
      default:
        return <Circle className="h-5 w-5 text-muted-foreground" />;
    }
  };

  // If a module is selected, show the module detail page
  if (selectedModuleId) {
    return (
      <ModuleDetailPage
        courseId={courseId}
        moduleId={selectedModuleId}
        onBack={handleBack}
      />
    );
  }

  if (loading) {
    return <div>Chargement...</div>;
  }

  const learnedCount = moduleProgress.filter((p) => p.learnStatus === LearnStatus.LEARNED).length;
  const totalCount = moduleProgress.length;
  const progressPercentage = totalCount > 0 ? (learnedCount / totalCount) * 100 : 0;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardDescription>
            Première passe complète du syllabus. Complétez chaque module et passez les mini-tests.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Progression globale</span>
                <span className="text-sm text-muted-foreground">
                  {learnedCount} / {totalCount} modules appris
                </span>
              </div>
              <Progress value={progressPercentage} />
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4">
        {moduleProgress.map((progress) => (
          <Card key={progress.moduleId}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 flex-1">
                  {getStatusIcon(progress.learnStatus)}
                  <div>
                    <div className="font-medium">
                      Module {progress.module.order}: {progress.module.title}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {progress.learnStatus === LearnStatus.LEARNED
                        ? "Appris"
                        : progress.learnStatus === LearnStatus.IN_PROGRESS
                        ? "En cours"
                        : "Non commencé"}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant={progress.learnStatus === LearnStatus.LEARNED ? "outline" : "default"}
                    onClick={() => handleStartModule(progress.moduleId)}
                  >
                    <Play className="h-4 w-4 mr-1" />
                    {progress.learnStatus === LearnStatus.LEARNED ? "Réviser" : "Commencer"}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}


```

```typescriptreact
"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Target, FileText, BookOpen, AlertCircle, Lock } from "lucide-react";
import { ExamList } from "./exam-list";
import { ExamPlayer } from "./exam-player";
import { QuestionBankPractice } from "./question-bank-practice";
import { checkPhase3AccessAction } from "@/app/actions/study-plan";

interface Phase3PracticeProps {
  courseId: string;
  course: any;
  settings: any;
}

export function Phase3Practice({ courseId, course, settings }: Phase3PracticeProps) {
  const [activeTab, setActiveTab] = useState<"exams" | "questions">("exams");
  const [selectedExamId, setSelectedExamId] = useState<string | null>(null);
  const [canAccess, setCanAccess] = useState<boolean | null>(null);
  const [gateMessage, setGateMessage] = useState<string | null>(null);
  const [unlearnedModules, setUnlearnedModules] = useState<Array<{ id: string; title: string; order: number }>>([]);

  useEffect(() => {
    checkAccess();
  }, [courseId]);

  const checkAccess = async () => {
    const result = await checkPhase3AccessAction(courseId);
    if (result.success && result.data) {
      setCanAccess(result.data.canAccess);
      setGateMessage(result.data.message || null);
      setUnlearnedModules(result.data.unlearnedModules || []);
    }
  };

  if (selectedExamId) {
    return (
      <ExamPlayer
        examId={selectedExamId}
        onExit={() => {
          setSelectedExamId(null);
        }}
      />
    );
  }

  // Show gate message if cannot access
  if (canAccess === false) {
    return (
      <div className="space-y-6">
        <Alert variant="destructive">
          <Lock className="h-4 w-4" />
          <AlertTitle>Accès à la Phase 3 restreint</AlertTitle>
          <AlertDescription className="space-y-3 mt-2">
            <p>{gateMessage}</p>
            {unlearnedModules.length > 0 && (
              <div>
                <p className="font-semibold mb-2">Modules à compléter:</p>
                <ul className="list-disc list-inside space-y-1">
                  {unlearnedModules.map((module) => (
                    <li key={module.id}>
                      Module {module.order}: {module.title}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <Button
              onClick={() => {
                window.location.href = `/apprendre/${courseId}?tab=learn`;
              }}
              className="mt-4"
            >
              <BookOpen className="h-4 w-4 mr-2" />
              Aller à la Phase 1 - Apprendre
            </Button>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  // Show loading state
  if (canAccess === null) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-muted-foreground">Vérification de l'accès...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardDescription>
            Testez votre préparation et calibrez vos performances avec des examens simulés et des
            questions pratiques.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="exams">
                <FileText className="h-4 w-4 mr-2" />
                Examens simulés
              </TabsTrigger>
              <TabsTrigger value="questions">
                <BookOpen className="h-4 w-4 mr-2" />
                Questions pratiques
              </TabsTrigger>
            </TabsList>
            <TabsContent value="exams" className="mt-6">
              <ExamList courseId={courseId} onStartExam={setSelectedExamId} />
            </TabsContent>
            <TabsContent value="questions" className="mt-6">
              <QuestionBankPractice courseId={courseId} />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}

```


Checking for linting errors and verifying all changes:



Checking if the removed icon imports are still used elsewhere in those files:



Checking if these icons are used elsewhere in the components:



Removing unused imports:


```typescriptreact
"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { CheckCircle2, Circle, Play } from "lucide-react";
import { getModuleProgressAction } from "@/app/actions/study-plan";
import { LearnStatus } from "@prisma/client";
import { ModuleDetailPage } from "./module-detail-page";

interface Phase1LearnProps {
  courseId: string;
  course: any;
  settings: any;
  onModuleSelect?: (moduleId: string) => void;
}

export function Phase1Learn({ courseId, course, settings, onModuleSelect }: Phase1LearnProps) {
  const [moduleProgress, setModuleProgress] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedModuleId, setSelectedModuleId] = useState<string | null>(null);

  useEffect(() => {
    loadProgress();
  }, [courseId]);

  const loadProgress = async () => {
    try {
      const result = await getModuleProgressAction(courseId);
      if (result.success && result.data) {
        setModuleProgress(result.data);
      }
    } catch (error) {
      console.error("Error loading progress:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleStartModule = (moduleId: string) => {
    if (onModuleSelect) {
      onModuleSelect(moduleId);
    } else {
      setSelectedModuleId(moduleId);
    }
  };

  const handleBack = () => {
    setSelectedModuleId(null);
    loadProgress(); // Reload progress when going back
  };

  const getStatusIcon = (status: LearnStatus) => {
    switch (status) {
      case LearnStatus.LEARNED:
        return <CheckCircle2 className="h-5 w-5 text-green-500" />;
      case LearnStatus.IN_PROGRESS:
        return <Circle className="h-5 w-5 text-blue-500" />;
      default:
        return <Circle className="h-5 w-5 text-muted-foreground" />;
    }
  };

  // If a module is selected, show the module detail page
  if (selectedModuleId) {
    return (
      <ModuleDetailPage
        courseId={courseId}
        moduleId={selectedModuleId}
        onBack={handleBack}
      />
    );
  }

  if (loading) {
    return <div>Chargement...</div>;
  }

  const learnedCount = moduleProgress.filter((p) => p.learnStatus === LearnStatus.LEARNED).length;
  const totalCount = moduleProgress.length;
  const progressPercentage = totalCount > 0 ? (learnedCount / totalCount) * 100 : 0;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardDescription>
            Première passe complète du syllabus. Complétez chaque module et passez les mini-tests.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Progression globale</span>
                <span className="text-sm text-muted-foreground">
                  {learnedCount} / {totalCount} modules appris
                </span>
              </div>
              <Progress value={progressPercentage} />
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4">
        {moduleProgress.map((progress) => (
          <Card key={progress.moduleId}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 flex-1">
                  {getStatusIcon(progress.learnStatus)}
                  <div>
                    <div className="font-medium">
                      Module {progress.module.order}: {progress.module.title}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {progress.learnStatus === LearnStatus.LEARNED
                        ? "Appris"
                        : progress.learnStatus === LearnStatus.IN_PROGRESS
                        ? "En cours"
                        : "Non commencé"}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant={progress.learnStatus === LearnStatus.LEARNED ? "outline" : "default"}
                    onClick={() => handleStartModule(progress.moduleId)}
                  >
                    <Play className="h-4 w-4 mr-1" />
                    {progress.learnStatus === LearnStatus.LEARNED ? "Réviser" : "Commencer"}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}


```

```typescriptreact
"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { FileText, BookOpen, AlertCircle, Lock } from "lucide-react";
import { ExamList } from "./exam-list";
import { ExamPlayer } from "./exam-player";
import { QuestionBankPractice } from "./question-bank-practice";
import { checkPhase3AccessAction } from "@/app/actions/study-plan";

interface Phase3PracticeProps {
  courseId: string;
  course: any;
  settings: any;
}

export function Phase3Practice({ courseId, course, settings }: Phase3PracticeProps) {
  const [activeTab, setActiveTab] = useState<"exams" | "questions">("exams");
  const [selectedExamId, setSelectedExamId] = useState<string | null>(null);
  const [canAccess, setCanAccess] = useState<boolean | null>(null);
  const [gateMessage, setGateMessage] = useState<string | null>(null);
  const [unlearnedModules, setUnlearnedModules] = useState<Array<{ id: string; title: string; order: number }>>([]);

  useEffect(() => {
    checkAccess();
  }, [courseId]);

  const checkAccess = async () => {
    const result = await checkPhase3AccessAction(courseId);
    if (result.success && result.data) {
      setCanAccess(result.data.canAccess);
      setGateMessage(result.data.message || null);
      setUnlearnedModules(result.data.unlearnedModules || []);
    }
  };

  if (selectedExamId) {
    return (
      <ExamPlayer
        examId={selectedExamId}
        onExit={() => {
          setSelectedExamId(null);
        }}
      />
    );
  }

  // Show gate message if cannot access
  if (canAccess === false) {
    return (
      <div className="space-y-6">
        <Alert variant="destructive">
          <Lock className="h-4 w-4" />
          <AlertTitle>Accès à la Phase 3 restreint</AlertTitle>
          <AlertDescription className="space-y-3 mt-2">
            <p>{gateMessage}</p>
            {unlearnedModules.length > 0 && (
              <div>
                <p className="font-semibold mb-2">Modules à compléter:</p>
                <ul className="list-disc list-inside space-y-1">
                  {unlearnedModules.map((module) => (
                    <li key={module.id}>
                      Module {module.order}: {module.title}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <Button
              onClick={() => {
                window.location.href = `/apprendre/${courseId}?tab=learn`;
              }}
              className="mt-4"
            >
              <BookOpen className="h-4 w-4 mr-2" />
              Aller à la Phase 1 - Apprendre
            </Button>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  // Show loading state
  if (canAccess === null) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-muted-foreground">Vérification de l'accès...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardDescription>
            Testez votre préparation et calibrez vos performances avec des examens simulés et des
            questions pratiques.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="exams">
                <FileText className="h-4 w-4 mr-2" />
                Examens simulés
              </TabsTrigger>
              <TabsTrigger value="questions">
                <BookOpen className="h-4 w-4 mr-2" />
                Questions pratiques
              </TabsTrigger>
            </TabsList>
            <TabsContent value="exams" className="mt-6">
              <ExamList courseId={courseId} onStartExam={setSelectedExamId} />
            </TabsContent>
            <TabsContent value="questions" className="mt-6">
              <QuestionBankPractice courseId={courseId} />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}

```


Removed duplicate titles from all the pages. Summary:

1. **Plan du jour**: Removed `CardTitle` from `todays-plan.tsx` (h1 already in main interface)
2. **Syllabus (Plan de cours)**: Removed `CardTitle` from `syllabus.tsx` (h1 already in main interface)
3. **Phase 1 - Apprendre**: Removed `CardTitle` "Phase 1 - Apprendre le matériel" from `phase1-learn.tsx` (h1 already in main interface)
4. **Phase 2 - Réviser**: Removed `CardTitle` "Phase 2 - Révision et rappel actif" from `phase2-review.tsx` (h1 already in main interface)
5. **Phase 3 - Pratiquer**: Removed `CardTitle` "Phase 3 - Pratique et simulation d'examen" from `phase3-practice.tsx` (h1 already in main interface)
6. **Outils d'apprentissage**: No duplicate (only h1 in main interface)

Also cleaned up unused icon imports. Each page now shows the title once (from the main interface h1), removing the redundancy.

---

**User**

You removed the wrong one. Keep the cardTitle but remove the page title for these pages

---

**Cursor**


Reversing the changes: restoring CardTitles in the components and removing the h1 page titles from the main interface.


```typescriptreact
"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Clock, BookOpen, Brain, Target, Play } from "lucide-react";
import { getTodaysPlanAction, updatePlanEntryStatusAction } from "@/app/actions/study-plan";
import { TaskType, PlanEntryStatus } from "@prisma/client";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

interface TodaysPlanProps {
  courseId: string;
}

export function TodaysPlan({ courseId }: TodaysPlanProps) {
  const router = useRouter();
  const [planEntries, setPlanEntries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTodaysPlan();
  }, [courseId]);

  const loadTodaysPlan = async () => {
    try {
      const result = await getTodaysPlanAction(courseId);
      if (result.success && result.data) {
        setPlanEntries(result.data);
      }
    } catch (error) {
      console.error("Error loading today's plan:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleStartTask = async (entryId: string, taskType: TaskType) => {
    // Update status to in progress
    await updatePlanEntryStatusAction(entryId, PlanEntryStatus.IN_PROGRESS);
    loadTodaysPlan();

    // Navigate to appropriate phase/content
    if (taskType === TaskType.LEARN) {
      router.push(`/apprendre/${courseId}?phase=learn`);
    } else if (taskType === TaskType.REVIEW) {
      router.push(`/apprendre/${courseId}?phase=review`);
    } else if (taskType === TaskType.PRACTICE) {
      router.push(`/apprendre/${courseId}?phase=practice`);
    }
  };

  const handleCompleteTask = async (entryId: string) => {
    const result = await updatePlanEntryStatusAction(entryId, PlanEntryStatus.COMPLETED);
    if (result.success) {
      toast.success("Tâche complétée!");
      loadTodaysPlan();
      router.refresh();
    }
  };

  const getTaskIcon = (taskType: TaskType) => {
    switch (taskType) {
      case TaskType.LEARN:
        return <BookOpen className="h-4 w-4" />;
      case TaskType.REVIEW:
        return <Brain className="h-4 w-4" />;
      case TaskType.PRACTICE:
        return <Target className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  const getTaskLabel = (taskType: TaskType, entry: any) => {
    switch (taskType) {
      case TaskType.LEARN:
        return entry.module ? `Apprendre - ${entry.module.title}` : "Apprendre - Nouveau module";
      case TaskType.REVIEW:
        return "Révision - Cartes mémoire et quiz";
      case TaskType.PRACTICE:
        return "Pratique - Questions et exercices";
      default:
        return "Tâche";
    }
  };

  const getStatusBadge = (status: PlanEntryStatus) => {
    switch (status) {
      case PlanEntryStatus.COMPLETED:
        return <Badge variant="default" className="bg-green-500">Complété</Badge>;
      case PlanEntryStatus.IN_PROGRESS:
        return <Badge variant="default" className="bg-blue-500">En cours</Badge>;
      case PlanEntryStatus.PENDING:
        return <Badge variant="outline">En attente</Badge>;
      case PlanEntryStatus.SKIPPED:
        return <Badge variant="secondary">Ignoré</Badge>;
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Plan du jour</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Chargement...</p>
        </CardContent>
      </Card>
    );
  }

  if (planEntries.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Plan du jour</CardTitle>
          <CardDescription>Aucune tâche planifiée pour aujourd'hui</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const completedCount = planEntries.filter((e) => e.status === PlanEntryStatus.COMPLETED).length;
  const totalCount = planEntries.length;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardDescription>
              {completedCount} sur {totalCount} tâches complétées
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <div className="text-sm text-muted-foreground">
              {Math.round((completedCount / totalCount) * 100)}%
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {planEntries.map((entry) => (
            <div
              key={entry.id}
              className="flex items-center justify-between p-3 border rounded-lg"
            >
              <div className="flex items-center gap-3 flex-1">
                <div className="text-muted-foreground">{getTaskIcon(entry.taskType)}</div>
                <div className="flex-1">
                  <div className="font-medium">{getTaskLabel(entry.taskType, entry)}</div>
                  <div className="text-sm text-muted-foreground">
                    ~{entry.estimatedBlocks * 25} minutes
                  </div>
                </div>
                {getStatusBadge(entry.status)}
              </div>
              <div className="flex items-center gap-2">
                {entry.status === PlanEntryStatus.PENDING && (
                  <Button
                    size="sm"
                    onClick={() => handleStartTask(entry.id, entry.taskType)}
                  >
                    <Play className="h-4 w-4 mr-1" />
                    Commencer
                  </Button>
                )}
                {entry.status === PlanEntryStatus.IN_PROGRESS && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleCompleteTask(entry.id)}
                  >
                    <CheckCircle2 className="h-4 w-4 mr-1" />
                    Terminer
                  </Button>
                )}
                {entry.status === PlanEntryStatus.COMPLETED && (
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}


```

```typescriptreact
"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Clock, BookOpen, Brain, Target, Play } from "lucide-react";
import { getTodaysPlanAction, updatePlanEntryStatusAction } from "@/app/actions/study-plan";
import { TaskType, PlanEntryStatus } from "@prisma/client";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

interface TodaysPlanProps {
  courseId: string;
}

export function TodaysPlan({ courseId }: TodaysPlanProps) {
  const router = useRouter();
  const [planEntries, setPlanEntries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTodaysPlan();
  }, [courseId]);

  const loadTodaysPlan = async () => {
    try {
      const result = await getTodaysPlanAction(courseId);
      if (result.success && result.data) {
        setPlanEntries(result.data);
      }
    } catch (error) {
      console.error("Error loading today's plan:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleStartTask = async (entryId: string, taskType: TaskType) => {
    // Update status to in progress
    await updatePlanEntryStatusAction(entryId, PlanEntryStatus.IN_PROGRESS);
    loadTodaysPlan();

    // Navigate to appropriate phase/content
    if (taskType === TaskType.LEARN) {
      router.push(`/apprendre/${courseId}?phase=learn`);
    } else if (taskType === TaskType.REVIEW) {
      router.push(`/apprendre/${courseId}?phase=review`);
    } else if (taskType === TaskType.PRACTICE) {
      router.push(`/apprendre/${courseId}?phase=practice`);
    }
  };

  const handleCompleteTask = async (entryId: string) => {
    const result = await updatePlanEntryStatusAction(entryId, PlanEntryStatus.COMPLETED);
    if (result.success) {
      toast.success("Tâche complétée!");
      loadTodaysPlan();
      router.refresh();
    }
  };

  const getTaskIcon = (taskType: TaskType) => {
    switch (taskType) {
      case TaskType.LEARN:
        return <BookOpen className="h-4 w-4" />;
      case TaskType.REVIEW:
        return <Brain className="h-4 w-4" />;
      case TaskType.PRACTICE:
        return <Target className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  const getTaskLabel = (taskType: TaskType, entry: any) => {
    switch (taskType) {
      case TaskType.LEARN:
        return entry.module ? `Apprendre - ${entry.module.title}` : "Apprendre - Nouveau module";
      case TaskType.REVIEW:
        return "Révision - Cartes mémoire et quiz";
      case TaskType.PRACTICE:
        return "Pratique - Questions et exercices";
      default:
        return "Tâche";
    }
  };

  const getStatusBadge = (status: PlanEntryStatus) => {
    switch (status) {
      case PlanEntryStatus.COMPLETED:
        return <Badge variant="default" className="bg-green-500">Complété</Badge>;
      case PlanEntryStatus.IN_PROGRESS:
        return <Badge variant="default" className="bg-blue-500">En cours</Badge>;
      case PlanEntryStatus.PENDING:
        return <Badge variant="outline">En attente</Badge>;
      case PlanEntryStatus.SKIPPED:
        return <Badge variant="secondary">Ignoré</Badge>;
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Plan du jour</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Chargement...</p>
        </CardContent>
      </Card>
    );
  }

  if (planEntries.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Plan du jour</CardTitle>
          <CardDescription>Aucune tâche planifiée pour aujourd'hui</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const completedCount = planEntries.filter((e) => e.status === PlanEntryStatus.COMPLETED).length;
  const totalCount = planEntries.length;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Plan du jour</CardTitle>
            <CardDescription>
              {completedCount} sur {totalCount} tâches complétées
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <div className="text-sm text-muted-foreground">
              {Math.round((completedCount / totalCount) * 100)}%
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {planEntries.map((entry) => (
            <div
              key={entry.id}
              className="flex items-center justify-between p-3 border rounded-lg"
            >
              <div className="flex items-center gap-3 flex-1">
                <div className="text-muted-foreground">{getTaskIcon(entry.taskType)}</div>
                <div className="flex-1">
                  <div className="font-medium">{getTaskLabel(entry.taskType, entry)}</div>
                  <div className="text-sm text-muted-foreground">
                    ~{entry.estimatedBlocks * 25} minutes
                  </div>
                </div>
                {getStatusBadge(entry.status)}
              </div>
              <div className="flex items-center gap-2">
                {entry.status === PlanEntryStatus.PENDING && (
                  <Button
                    size="sm"
                    onClick={() => handleStartTask(entry.id, entry.taskType)}
                  >
                    <Play className="h-4 w-4 mr-1" />
                    Commencer
                  </Button>
                )}
                {entry.status === PlanEntryStatus.IN_PROGRESS && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleCompleteTask(entry.id)}
                  >
                    <CheckCircle2 className="h-4 w-4 mr-1" />
                    Terminer
                  </Button>
                )}
                {entry.status === PlanEntryStatus.COMPLETED && (
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}


```

```typescriptreact
"use client";

import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Video, FileText, Play } from "lucide-react";
import { useCourseModules } from "@/lib/hooks/use-learning-activities";
import { useBatchModuleContent } from "@/lib/hooks/use-module-content";

interface Module {
  id: string;
  title: string;
  order: number;
  examWeight: number | null;
}

interface ModuleContent {
  videos: Array<{ id: string; order: number }>;
  notes: Array<{ id: string; order: number }>;
  quizzes: Array<{ id: string; order: number }>;
}

interface SyllabusProps {
  courseId: string;
}

export function Syllabus({ courseId }: SyllabusProps) {
  // Use React Query for modules
  const { data: modulesData, isLoading: modulesLoading } = useCourseModules(courseId);
  const modules = (modulesData || []) as Module[];

  // Get module IDs for batch content loading
  const moduleIds = useMemo(() => modules.map((m) => m.id), [modules]);

  // Use React Query for batch module content
  const { data: batchResult, isLoading: contentLoading } = useBatchModuleContent(moduleIds);

  const loading = modulesLoading || contentLoading;

  // Process module contents
  const moduleContents = useMemo(() => {
    if (!batchResult?.success || !batchResult.data) {
      return {} as Record<string, ModuleContent>;
    }
    return batchResult.data as Record<string, ModuleContent>;
  }, [batchResult]);


  if (loading) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-muted-foreground">Chargement du plan de cours...</p>
        </CardContent>
      </Card>
    );
  }

  if (modules.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-muted-foreground">Aucun module disponible pour ce cours.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Plan de cours</CardTitle>
        </CardHeader>
        <CardContent>
          {/* Mobile Card Layout */}
          <div className="block md:hidden space-y-3">
            {modules.map((module) => {
              const content = moduleContents[module.id] || { videos: [], notes: [], quizzes: [] };
              const hasVideos = content.videos.length > 0;
              const hasNotes = content.notes.length > 0;
              const hasQuizzes = content.quizzes.length > 0;

              return (
                <div key={module.id} className="border rounded-lg p-4 space-y-3">
                  <div className="font-medium text-sm leading-tight">
                    Module {module.order + 1}: {module.title}
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground min-w-[50px]">Vidéos</span>
                      {hasVideos ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0"
                          onClick={() => {
                            window.location.href = `/apprendre/${courseId}?module=${module.id}&tab=videos`;
                          }}
                          title={`${content.videos.length} vidéo${content.videos.length > 1 ? 's' : ''}`}
                        >
                          <Video className="h-4 w-4 text-primary" />
                        </Button>
                      ) : (
                        <span className="text-muted-foreground text-xs">-</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground min-w-[50px]">Notes</span>
                      {hasNotes ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0"
                          onClick={() => {
                            window.location.href = `/apprendre/${courseId}?module=${module.id}&tab=notes`;
                          }}
                          title={`${content.notes.length} note${content.notes.length > 1 ? 's' : ''}`}
                        >
                          <FileText className="h-4 w-4 text-primary" />
                        </Button>
                      ) : (
                        <span className="text-muted-foreground text-xs">-</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground min-w-[50px]">Quiz</span>
                      {hasQuizzes ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0"
                          onClick={() => {
                            window.location.href = `/apprendre/${courseId}?module=${module.id}&tab=quiz`;
                          }}
                          title={`${content.quizzes.length} quiz${content.quizzes.length > 1 ? 's' : ''}`}
                        >
                          <Play className="h-4 w-4 text-primary" />
                        </Button>
                      ) : (
                        <span className="text-muted-foreground text-xs">-</span>
                      )}
                    </div>
                    {module.examWeight !== null && (
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground min-w-[50px]">Pondération</span>
                        <Badge variant="outline" className="text-xs">
                          {(module.examWeight * 100).toFixed(1)}%
                        </Badge>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Desktop Table Layout */}
          <div className="hidden md:block overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Module</TableHead>
                  <TableHead className="text-center">Vidéos</TableHead>
                  <TableHead className="text-center">Notes</TableHead>
                  <TableHead className="text-center">Quiz</TableHead>
                  <TableHead className="text-center">Pondération</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {modules.map((module) => {
                  const content = moduleContents[module.id] || { videos: [], notes: [], quizzes: [] };
                  const hasVideos = content.videos.length > 0;
                  const hasNotes = content.notes.length > 0;
                  const hasQuizzes = content.quizzes.length > 0;

                  return (
                    <TableRow key={module.id}>
                      <TableCell className="font-medium">
                        Module {module.order + 1}: {module.title}
                      </TableCell>
                      <TableCell className="text-center">
                        {hasVideos ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0"
                            onClick={() => {
                              window.location.href = `/apprendre/${courseId}?module=${module.id}&tab=videos`;
                            }}
                            title={`${content.videos.length} vidéo${content.videos.length > 1 ? 's' : ''}`}
                          >
                            <Video className="h-4 w-4 text-primary" />
                          </Button>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        {hasNotes ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0"
                            onClick={() => {
                              window.location.href = `/apprendre/${courseId}?module=${module.id}&tab=notes`;
                            }}
                            title={`${content.notes.length} note${content.notes.length > 1 ? 's' : ''}`}
                          >
                            <FileText className="h-4 w-4 text-primary" />
                          </Button>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        {hasQuizzes ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0"
                            onClick={() => {
                              window.location.href = `/apprendre/${courseId}?module=${module.id}&tab=quiz`;
                            }}
                            title={`${content.quizzes.length} quiz${content.quizzes.length > 1 ? 's' : ''}`}
                          >
                            <Play className="h-4 w-4 text-primary" />
                          </Button>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        {module.examWeight !== null ? (
                          <Badge variant="outline">
                            {(module.examWeight * 100).toFixed(1)}%
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}


```

```typescriptreact
"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Play, Layers, BookOpen } from "lucide-react";
import { FlashcardComponent } from "./flashcard-component";
import { LearningActivitiesList } from "./learning-activities-list";
import { SmartReviewDashboard } from "./smart-review-dashboard";

interface Phase2ReviewProps {
  courseId: string;
  course: any;
  settings: any;
}

export function Phase2Review({ courseId, course, settings }: Phase2ReviewProps) {
  const [activeTab, setActiveTab] = useState<"smart-review" | "flashcards" | "activities">("smart-review");

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>
            Phase 2 - Révision et rappel actif
          </CardTitle>
          <CardDescription>
            Consolidation des connaissances via rappel actif et répétition espacée.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
            <TabsList className="grid w-full grid-cols-3 h-auto gap-1">
              <TabsTrigger value="smart-review" className="flex items-center justify-center gap-1 sm:gap-2 py-2.5 sm:py-1.5 text-xs sm:text-sm px-1 sm:px-3 min-w-0">
                <Play className="h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0" />
                <span className="hidden sm:inline truncate">Révision intelligente</span>
                <span className="sm:hidden truncate">Révision</span>
              </TabsTrigger>
              <TabsTrigger value="flashcards" className="flex items-center justify-center gap-1 sm:gap-2 py-2.5 sm:py-1.5 text-xs sm:text-sm px-1 sm:px-3 min-w-0">
                <Layers className="h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0" />
                <span className="truncate">Flashcards</span>
              </TabsTrigger>
              <TabsTrigger value="activities" className="flex items-center justify-center gap-1 sm:gap-2 py-2.5 sm:py-1.5 text-xs sm:text-sm px-1 sm:px-3 min-w-0">
                <BookOpen className="h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0" />
                <span className="truncate">Activités</span>
              </TabsTrigger>
            </TabsList>
            <TabsContent value="smart-review" className="mt-6">
              <SmartReviewDashboard courseId={courseId} course={course} settings={settings} />
            </TabsContent>
            <TabsContent value="flashcards" className="mt-6">
              <FlashcardComponent courseId={courseId} contentItemId="flashcards" />
            </TabsContent>
            <TabsContent value="activities" className="mt-6">
              <LearningActivitiesList courseId={courseId} />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}


```

```typescriptreact
"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { BookOpen, CheckCircle2, Circle, Play } from "lucide-react";
import { getModuleProgressAction } from "@/app/actions/study-plan";
import { LearnStatus } from "@prisma/client";
import { ModuleDetailPage } from "./module-detail-page";

interface Phase1LearnProps {
  courseId: string;
  course: any;
  settings: any;
  onModuleSelect?: (moduleId: string) => void;
}

export function Phase1Learn({ courseId, course, settings, onModuleSelect }: Phase1LearnProps) {
  const [moduleProgress, setModuleProgress] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedModuleId, setSelectedModuleId] = useState<string | null>(null);

  useEffect(() => {
    loadProgress();
  }, [courseId]);

  const loadProgress = async () => {
    try {
      const result = await getModuleProgressAction(courseId);
      if (result.success && result.data) {
        setModuleProgress(result.data);
      }
    } catch (error) {
      console.error("Error loading progress:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleStartModule = (moduleId: string) => {
    if (onModuleSelect) {
      onModuleSelect(moduleId);
    } else {
      setSelectedModuleId(moduleId);
    }
  };

  const handleBack = () => {
    setSelectedModuleId(null);
    loadProgress(); // Reload progress when going back
  };

  const getStatusIcon = (status: LearnStatus) => {
    switch (status) {
      case LearnStatus.LEARNED:
        return <CheckCircle2 className="h-5 w-5 text-green-500" />;
      case LearnStatus.IN_PROGRESS:
        return <Circle className="h-5 w-5 text-blue-500" />;
      default:
        return <Circle className="h-5 w-5 text-muted-foreground" />;
    }
  };

  // If a module is selected, show the module detail page
  if (selectedModuleId) {
    return (
      <ModuleDetailPage
        courseId={courseId}
        moduleId={selectedModuleId}
        onBack={handleBack}
      />
    );
  }

  if (loading) {
    return <div>Chargement...</div>;
  }

  const learnedCount = moduleProgress.filter((p) => p.learnStatus === LearnStatus.LEARNED).length;
  const totalCount = moduleProgress.length;
  const progressPercentage = totalCount > 0 ? (learnedCount / totalCount) * 100 : 0;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardDescription>
            Première passe complète du syllabus. Complétez chaque module et passez les mini-tests.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Progression globale</span>
                <span className="text-sm text-muted-foreground">
                  {learnedCount} / {totalCount} modules appris
                </span>
              </div>
              <Progress value={progressPercentage} />
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4">
        {moduleProgress.map((progress) => (
          <Card key={progress.moduleId}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 flex-1">
                  {getStatusIcon(progress.learnStatus)}
                  <div>
                    <div className="font-medium">
                      Module {progress.module.order}: {progress.module.title}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {progress.learnStatus === LearnStatus.LEARNED
                        ? "Appris"
                        : progress.learnStatus === LearnStatus.IN_PROGRESS
                        ? "En cours"
                        : "Non commencé"}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant={progress.learnStatus === LearnStatus.LEARNED ? "outline" : "default"}
                    onClick={() => handleStartModule(progress.moduleId)}
                  >
                    <Play className="h-4 w-4 mr-1" />
                    {progress.learnStatus === LearnStatus.LEARNED ? "Réviser" : "Commencer"}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}


```

```typescriptreact
"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { BookOpen, CheckCircle2, Circle, Play } from "lucide-react";
import { getModuleProgressAction } from "@/app/actions/study-plan";
import { LearnStatus } from "@prisma/client";
import { ModuleDetailPage } from "./module-detail-page";

interface Phase1LearnProps {
  courseId: string;
  course: any;
  settings: any;
  onModuleSelect?: (moduleId: string) => void;
}

export function Phase1Learn({ courseId, course, settings, onModuleSelect }: Phase1LearnProps) {
  const [moduleProgress, setModuleProgress] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedModuleId, setSelectedModuleId] = useState<string | null>(null);

  useEffect(() => {
    loadProgress();
  }, [courseId]);

  const loadProgress = async () => {
    try {
      const result = await getModuleProgressAction(courseId);
      if (result.success && result.data) {
        setModuleProgress(result.data);
      }
    } catch (error) {
      console.error("Error loading progress:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleStartModule = (moduleId: string) => {
    if (onModuleSelect) {
      onModuleSelect(moduleId);
    } else {
      setSelectedModuleId(moduleId);
    }
  };

  const handleBack = () => {
    setSelectedModuleId(null);
    loadProgress(); // Reload progress when going back
  };

  const getStatusIcon = (status: LearnStatus) => {
    switch (status) {
      case LearnStatus.LEARNED:
        return <CheckCircle2 className="h-5 w-5 text-green-500" />;
      case LearnStatus.IN_PROGRESS:
        return <Circle className="h-5 w-5 text-blue-500" />;
      default:
        return <Circle className="h-5 w-5 text-muted-foreground" />;
    }
  };

  // If a module is selected, show the module detail page
  if (selectedModuleId) {
    return (
      <ModuleDetailPage
        courseId={courseId}
        moduleId={selectedModuleId}
        onBack={handleBack}
      />
    );
  }

  if (loading) {
    return <div>Chargement...</div>;
  }

  const learnedCount = moduleProgress.filter((p) => p.learnStatus === LearnStatus.LEARNED).length;
  const totalCount = moduleProgress.length;
  const progressPercentage = totalCount > 0 ? (learnedCount / totalCount) * 100 : 0;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            Phase 1 - Apprendre le matériel
          </CardTitle>
          <CardDescription>
            Première passe complète du syllabus. Complétez chaque module et passez les mini-tests.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Progression globale</span>
                <span className="text-sm text-muted-foreground">
                  {learnedCount} / {totalCount} modules appris
                </span>
              </div>
              <Progress value={progressPercentage} />
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4">
        {moduleProgress.map((progress) => (
          <Card key={progress.moduleId}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 flex-1">
                  {getStatusIcon(progress.learnStatus)}
                  <div>
                    <div className="font-medium">
                      Module {progress.module.order}: {progress.module.title}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {progress.learnStatus === LearnStatus.LEARNED
                        ? "Appris"
                        : progress.learnStatus === LearnStatus.IN_PROGRESS
                        ? "En cours"
                        : "Non commencé"}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant={progress.learnStatus === LearnStatus.LEARNED ? "outline" : "default"}
                    onClick={() => handleStartModule(progress.moduleId)}
                  >
                    <Play className="h-4 w-4 mr-1" />
                    {progress.learnStatus === LearnStatus.LEARNED ? "Réviser" : "Commencer"}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}


```

```typescriptreact
"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Target, FileText, BookOpen, AlertCircle, Lock } from "lucide-react";
import { ExamList } from "./exam-list";
import { ExamPlayer } from "./exam-player";
import { QuestionBankPractice } from "./question-bank-practice";
import { checkPhase3AccessAction } from "@/app/actions/study-plan";

interface Phase3PracticeProps {
  courseId: string;
  course: any;
  settings: any;
}

export function Phase3Practice({ courseId, course, settings }: Phase3PracticeProps) {
  const [activeTab, setActiveTab] = useState<"exams" | "questions">("exams");
  const [selectedExamId, setSelectedExamId] = useState<string | null>(null);
  const [canAccess, setCanAccess] = useState<boolean | null>(null);
  const [gateMessage, setGateMessage] = useState<string | null>(null);
  const [unlearnedModules, setUnlearnedModules] = useState<Array<{ id: string; title: string; order: number }>>([]);

  useEffect(() => {
    checkAccess();
  }, [courseId]);

  const checkAccess = async () => {
    const result = await checkPhase3AccessAction(courseId);
    if (result.success && result.data) {
      setCanAccess(result.data.canAccess);
      setGateMessage(result.data.message || null);
      setUnlearnedModules(result.data.unlearnedModules || []);
    }
  };

  if (selectedExamId) {
    return (
      <ExamPlayer
        examId={selectedExamId}
        onExit={() => {
          setSelectedExamId(null);
        }}
      />
    );
  }

  // Show gate message if cannot access
  if (canAccess === false) {
    return (
      <div className="space-y-6">
        <Alert variant="destructive">
          <Lock className="h-4 w-4" />
          <AlertTitle>Accès à la Phase 3 restreint</AlertTitle>
          <AlertDescription className="space-y-3 mt-2">
            <p>{gateMessage}</p>
            {unlearnedModules.length > 0 && (
              <div>
                <p className="font-semibold mb-2">Modules à compléter:</p>
                <ul className="list-disc list-inside space-y-1">
                  {unlearnedModules.map((module) => (
                    <li key={module.id}>
                      Module {module.order}: {module.title}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <Button
              onClick={() => {
                window.location.href = `/apprendre/${courseId}?tab=learn`;
              }}
              className="mt-4"
            >
              <BookOpen className="h-4 w-4 mr-2" />
              Aller à la Phase 1 - Apprendre
            </Button>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  // Show loading state
  if (canAccess === null) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-muted-foreground">Vérification de l'accès...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardDescription>
            Testez votre préparation et calibrez vos performances avec des examens simulés et des
            questions pratiques.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="exams">
                <FileText className="h-4 w-4 mr-2" />
                Examens simulés
              </TabsTrigger>
              <TabsTrigger value="questions">
                <BookOpen className="h-4 w-4 mr-2" />
                Questions pratiques
              </TabsTrigger>
            </TabsList>
            <TabsContent value="exams" className="mt-6">
              <ExamList courseId={courseId} onStartExam={setSelectedExamId} />
            </TabsContent>
            <TabsContent value="questions" className="mt-6">
              <QuestionBankPractice courseId={courseId} />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}

```

```typescriptreact
"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Target, FileText, BookOpen, AlertCircle, Lock } from "lucide-react";
import { ExamList } from "./exam-list";
import { ExamPlayer } from "./exam-player";
import { QuestionBankPractice } from "./question-bank-practice";
import { checkPhase3AccessAction } from "@/app/actions/study-plan";

interface Phase3PracticeProps {
  courseId: string;
  course: any;
  settings: any;
}

export function Phase3Practice({ courseId, course, settings }: Phase3PracticeProps) {
  const [activeTab, setActiveTab] = useState<"exams" | "questions">("exams");
  const [selectedExamId, setSelectedExamId] = useState<string | null>(null);
  const [canAccess, setCanAccess] = useState<boolean | null>(null);
  const [gateMessage, setGateMessage] = useState<string | null>(null);
  const [unlearnedModules, setUnlearnedModules] = useState<Array<{ id: string; title: string; order: number }>>([]);

  useEffect(() => {
    checkAccess();
  }, [courseId]);

  const checkAccess = async () => {
    const result = await checkPhase3AccessAction(courseId);
    if (result.success && result.data) {
      setCanAccess(result.data.canAccess);
      setGateMessage(result.data.message || null);
      setUnlearnedModules(result.data.unlearnedModules || []);
    }
  };

  if (selectedExamId) {
    return (
      <ExamPlayer
        examId={selectedExamId}
        onExit={() => {
          setSelectedExamId(null);
        }}
      />
    );
  }

  // Show gate message if cannot access
  if (canAccess === false) {
    return (
      <div className="space-y-6">
        <Alert variant="destructive">
          <Lock className="h-4 w-4" />
          <AlertTitle>Accès à la Phase 3 restreint</AlertTitle>
          <AlertDescription className="space-y-3 mt-2">
            <p>{gateMessage}</p>
            {unlearnedModules.length > 0 && (
              <div>
                <p className="font-semibold mb-2">Modules à compléter:</p>
                <ul className="list-disc list-inside space-y-1">
                  {unlearnedModules.map((module) => (
                    <li key={module.id}>
                      Module {module.order}: {module.title}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <Button
              onClick={() => {
                window.location.href = `/apprendre/${courseId}?tab=learn`;
              }}
              className="mt-4"
            >
              <BookOpen className="h-4 w-4 mr-2" />
              Aller à la Phase 1 - Apprendre
            </Button>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  // Show loading state
  if (canAccess === null) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-muted-foreground">Vérification de l'accès...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Phase 3 - Pratique et simulation d'examen
          </CardTitle>
          <CardDescription>
            Testez votre préparation et calibrez vos performances avec des examens simulés et des
            questions pratiques.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="exams">
                <FileText className="h-4 w-4 mr-2" />
                Examens simulés
              </TabsTrigger>
              <TabsTrigger value="questions">
                <BookOpen className="h-4 w-4 mr-2" />
                Questions pratiques
              </TabsTrigger>
            </TabsList>
            <TabsContent value="exams" className="mt-6">
              <ExamList courseId={courseId} onStartExam={setSelectedExamId} />
            </TabsContent>
            <TabsContent value="questions" className="mt-6">
              <QuestionBankPractice courseId={courseId} />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}

```


Removing the h1 page titles from the main interface:


```typescriptreact
"use client";

import { useState, useEffect, lazy, Suspense, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BookOpen, RefreshCw, CheckCircle2, Target, Brain, FileText, Menu } from "lucide-react";
import { OrientationForm } from "./orientation-form";
import { OrientationVideo } from "./orientation-video";
import { OrientationHelpBubble } from "./orientation-help-bubble";
import { TodaysPlan } from "./todays-plan";
import { StudyPlan } from "./study-plan";
import { BehindScheduleWarning } from "./behind-schedule-warning";
import { ModuleDetailPage } from "./module-detail-page";
import { CourseSidebar } from "./course-sidebar";
import { Syllabus } from "./syllabus";
import { LearningTools } from "./learning-tools";
import { VideosTool } from "./tools/videos-tool";
import { NotesTool } from "./tools/notes-tool";
import { QuizzesTool } from "./tools/quizzes-tool";
import { FlashcardsTool } from "./tools/flashcards-tool";
import { ActivitiesTool } from "./tools/activities-tool";
import { ExamsTool } from "./tools/exams-tool";
import { QuestionBankTool } from "./tools/question-bank-tool";
import { ExamPlayer } from "./exam-player";
import { StudentAnalyticsDashboard } from "./student-analytics-dashboard";
import { AskQuestionPage } from "./ask-question-page";
import { getUserCourseSettingsAction } from "@/app/actions/study-plan";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";

// Lazy load phase components to reduce initial bundle size
const Phase1Learn = lazy(() => import("./phase1-learn").then(m => ({ default: m.Phase1Learn })));
const Phase2Review = lazy(() => import("./phase2-review").then(m => ({ default: m.Phase2Review })));
const Phase3Practice = lazy(() => import("./phase3-practice").then(m => ({ default: m.Phase3Practice })));

// Skeleton loader for phase components
const PhaseSkeleton = () => (
  <div className="space-y-4">
    <Skeleton className="h-8 w-64" />
    <Skeleton className="h-32 w-full" />
    <Skeleton className="h-32 w-full" />
    <Skeleton className="h-32 w-full" />
  </div>
);

type Course = {
  id: string;
  title: string;
  category?: {
    name: string;
  };
  recommendedStudyHoursMin?: number | null;
  recommendedStudyHoursMax?: number | null;
  orientationVideoUrl?: string | null;
  modules: Array<{
    id: string;
    title: string;
    shortTitle?: string | null;
    order: number;
    contentItems?: Array<{
      id: string;
      title: string;
      contentType: string;
      order: number;
    }>;
  }>;
};

interface PhaseBasedLearningInterfaceProps {
  course: Course;
  initialSettings?: any; // Settings passed from server to avoid client-side fetch
}

type Phase = "orientation" | "home" | "learn" | "review" | "practice" | "syllabus" | "tools" | "progress" | "question";
type NavigationItem = "home" | "learn" | "review" | "practice" | "syllabus" | "tools" | "progress" | "question" | `module-${string}`;

export function PhaseBasedLearningInterface({ course, initialSettings }: PhaseBasedLearningInterfaceProps) {
  const router = useRouter();
  const [activePhase, setActivePhase] = useState<Phase>("orientation");
  const [activeItem, setActiveItem] = useState<NavigationItem>("home");
  const [settings, setSettings] = useState<any>(initialSettings || null);
  const [loading, setLoading] = useState(!initialSettings); // Only load if settings not provided
  // Cache for loaded phase data to prevent redundant requests
  const [loadedPhases, setLoadedPhases] = useState<Set<string>>(new Set());
  const [selectedModuleId, setSelectedModuleId] = useState<string | null>(null);
  const [selectedTool, setSelectedTool] = useState<string | null>(null);
  const [selectedExamId, setSelectedExamId] = useState<string | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Helper function to get URL parameters
  const getUrlParams = () => {
    if (typeof window === 'undefined') return { module: null, tab: null };
    const params = new URLSearchParams(window.location.search);
    return {
      module: params.get('module'),
      tab: params.get('tab'),
    };
  };

  useEffect(() => {
    // Check URL parameters first (takes priority)
    const { module: moduleId } = getUrlParams();
    if (moduleId) {
      setSelectedModuleId(moduleId);
      setActivePhase("learn");
      setActiveItem(`module-${moduleId}` as NavigationItem);
      setLoading(false);
      return;
    }

    // Only load settings if not provided from server
    if (initialSettings) {
      setSettings(initialSettings);
      // Use provided settings for navigation
      if (initialSettings.orientationCompleted) {
        setActivePhase("home");
        setActiveItem("home");
      } else {
        setActivePhase("orientation");
      }
      setLoading(false);
    } else {
      // Load settings from client
      loadSettings();
    }
  }, [initialSettings]); // Only depend on initialSettings

  const loadSettings = async () => {
    // Skip if settings already provided from server
    if (initialSettings) {
      setSettings(initialSettings);
      setLoading(false);
      return;
    }
    
    try {
      const result = await getUserCourseSettingsAction(course.id);
      if (result.success && result.data) {
        setSettings(result.data);
        
        // Check URL parameters for module and tab navigation FIRST
        // This takes priority over default navigation
        const { module: moduleId } = getUrlParams();
        
        if (moduleId) {
          // URL has module parameter - navigate to that module
          setSelectedModuleId(moduleId);
          setActivePhase("learn");
          setActiveItem(`module-${moduleId}` as NavigationItem);
        } else if (result.data.orientationCompleted) {
          // No module parameter - use default navigation
          setActivePhase("home");
          setActiveItem("home");
        } else {
          setActivePhase("orientation");
        }
      } else {
        // No settings found, check for module parameter anyway
        const { module: moduleId } = getUrlParams();
        
        if (moduleId) {
          setSelectedModuleId(moduleId);
          setActivePhase("learn");
          setActiveItem(`module-${moduleId}` as NavigationItem);
        } else {
          setActivePhase("orientation");
        }
      }
    } catch (error) {
      console.error("Error loading settings:", error);
      // Check for module parameter even on error
      const { module: moduleId } = getUrlParams();
      
      if (moduleId) {
        setSelectedModuleId(moduleId);
        setActivePhase("learn");
        setActiveItem(`module-${moduleId}` as NavigationItem);
      } else {
        setActivePhase("orientation");
      }
    } finally {
      setLoading(false);
    }
  };

  const [studyPlanRefreshKey, setStudyPlanRefreshKey] = useState(0);
  
  const handleSettingsUpdated = () => {
    router.refresh();
    loadSettings();
    // Force StudyPlan to refresh
    setStudyPlanRefreshKey(prev => prev + 1);
  };

  const handleNavigate = (item: NavigationItem) => {
    setActiveItem(item);
    if (item === "home") {
      setActivePhase("home");
      setSelectedModuleId(null);
      setSelectedTool(null);
      setSelectedExamId(null);
    } else if (item === "learn") {
      setActivePhase("learn");
      setSelectedModuleId(null);
      setSelectedTool(null);
      setSelectedExamId(null);
      setLoadedPhases(prev => new Set(prev).add("learn"));
    } else if (item.startsWith("module-")) {
      setActivePhase("learn");
      const moduleId = item.replace("module-", "");
      setSelectedModuleId(moduleId);
      setSelectedTool(null);
      setSelectedExamId(null);
      setLoadedPhases(prev => new Set(prev).add("learn"));
    } else if (item === "review") {
      setActivePhase("review");
      setSelectedModuleId(null);
      setSelectedTool(null);
      setSelectedExamId(null);
      setLoadedPhases(prev => new Set(prev).add("review"));
    } else if (item === "practice") {
      setActivePhase("practice");
      setSelectedModuleId(null);
      setSelectedTool(null);
      setSelectedExamId(null);
      setLoadedPhases(prev => new Set(prev).add("practice"));
    } else if (item === "question") {
      setActivePhase("question");
      setSelectedModuleId(null);
      setSelectedTool(null);
      setSelectedExamId(null);
    } else if (item === "syllabus") {
      setActivePhase("syllabus");
      setSelectedModuleId(null);
      setSelectedTool(null);
      setSelectedExamId(null);
      setLoadedPhases(prev => new Set(prev).add("syllabus"));
    } else if (item === "tools") {
      setActivePhase("tools");
      setSelectedModuleId(null);
      setSelectedTool(null);
      setSelectedExamId(null);
      setLoadedPhases(prev => new Set(prev).add("tools"));
    } else if (item === "progress") {
      setActivePhase("progress");
      setSelectedModuleId(null);
      setSelectedTool(null);
      setSelectedExamId(null);
      setLoadedPhases(prev => new Set(prev).add("progress"));
    }
  };

  const handleModuleBack = () => {
    setSelectedModuleId(null);
    setActiveItem("learn");
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Chargement...</p>
        </div>
      </div>
    );
  }

  // Show orientation if not completed
  if (!settings || !settings.orientationCompleted) {
    // Check if settings exist but form not completed (show video)
    // If no settings at all, show form first
    if (!settings) {
      return (
        <div className="min-h-screen bg-background">
          <div className="border-b">
            <div className="container mx-auto px-4 py-4">
              <h1 className="text-2xl font-bold">{course.title}</h1>
              <p className="text-muted-foreground">Phase 0 - Orientation</p>
            </div>
          </div>
          <OrientationForm
            courseId={course.id}
            courseTitle={course.title}
            recommendedStudyHoursMin={course.recommendedStudyHoursMin}
            recommendedStudyHoursMax={course.recommendedStudyHoursMax}
            orientationVideoUrl={course.orientationVideoUrl}
            firstModuleId={course.modules.length > 0 ? course.modules[0].id : null}
            onComplete={(isFirstCreation) => {
              if (!isFirstCreation) {
                // If updating (not first creation), just refresh and go to home
                handleSettingsUpdated();
              }
              // If first creation, the form will show the video component
            }}
          />
        </div>
      );
    }

    // Settings exist but orientation not completed - show video
    return (
      <div className="min-h-screen bg-background">
        <div className="border-b">
          <div className="container mx-auto px-4 py-4">
            <h1 className="text-2xl font-bold">{course.title}</h1>
            <p className="text-muted-foreground">Phase 0 - Orientation</p>
          </div>
        </div>
        <OrientationVideo
          courseId={course.id}
          courseTitle={course.title}
          orientationVideoUrl={course.orientationVideoUrl}
          firstModuleId={course.modules.length > 0 ? course.modules[0].id : null}
          onComplete={handleSettingsUpdated}
        />
      </div>
    );
  }

  const handleMobileNavigate = (item: NavigationItem) => {
    handleNavigate(item);
    setMobileMenuOpen(false); // Close mobile menu after navigation
  };

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Desktop Course Sidebar Navigation */}
      <CourseSidebar
        course={course}
        activeItem={activeItem}
        onNavigate={handleNavigate}
        onSettingsUpdate={handleSettingsUpdated}
        mobileMenuOpen={mobileMenuOpen}
        onMobileMenuChange={setMobileMenuOpen}
      />

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto relative">
        {/* Mobile Header with Hamburger */}
        <div className="lg:hidden sticky top-0 z-40 bg-background border-b flex items-center justify-between px-4 py-3">
          <h1 className="text-lg font-semibold truncate flex-1 mr-2">{course.title}</h1>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setMobileMenuOpen(true)}
            aria-label="Ouvrir le menu"
          >
            <Menu className="h-6 w-6" />
          </Button>
        </div>

        {/* Floating Help Bubble - Only show after orientation is completed */}
        <OrientationHelpBubble
          courseId={course.id}
          courseTitle={course.title}
          orientationVideoUrl={course.orientationVideoUrl}
        />
        <div className="container mx-auto px-4 py-4 sm:py-6 max-w-6xl">
          {/* Content based on active phase */}
          {activePhase === "home" && (
            <div className="space-y-4 sm:space-y-6">
              <BehindScheduleWarning courseId={course.id} />
              <div>
                <TodaysPlan courseId={course.id} />
              </div>
              <div>
                <StudyPlan courseId={course.id} refreshKey={studyPlanRefreshKey} />
              </div>
            </div>
          )}
          {activePhase === "learn" && (
            <div>
              {selectedModuleId ? (
                <ModuleDetailPage
                  courseId={course.id}
                  moduleId={selectedModuleId}
                  onBack={handleModuleBack}
                />
              ) : (
                <>
                  <h1 className="text-xl sm:text-2xl font-bold mb-4 sm:mb-6">Phase 1 - Apprendre</h1>
                  <Suspense fallback={<PhaseSkeleton />}>
                    <Phase1Learn
                      courseId={course.id}
                      course={course}
                      settings={settings}
                      onModuleSelect={(moduleId) => {
                        setSelectedModuleId(moduleId);
                        setActiveItem(`module-${moduleId}` as NavigationItem);
                      }}
                    />
                  </Suspense>
                </>
              )}
            </div>
          )}
          {/* Keep phase components mounted but hidden when not active */}
          <div className={activePhase === "review" ? "" : "hidden"}>
            <h1 className="text-xl sm:text-2xl font-bold mb-4 sm:mb-6">Phase 2 - Réviser</h1>
            <Suspense fallback={<PhaseSkeleton />}>
              <Phase2Review courseId={course.id} course={course} settings={settings} />
            </Suspense>
          </div>
          <div className={activePhase === "practice" ? "" : "hidden"}>
            <h1 className="text-xl sm:text-2xl font-bold mb-4 sm:mb-6">Phase 3 - Pratiquer</h1>
            <Suspense fallback={<PhaseSkeleton />}>
              <Phase3Practice courseId={course.id} course={course} settings={settings} />
            </Suspense>
          </div>
          {/* Keep syllabus mounted but hidden when not active */}
          <div className={activePhase === "syllabus" ? "" : "hidden"}>
            <h1 className="text-xl sm:text-2xl font-bold mb-4 sm:mb-6">Plan de cours</h1>
            <Suspense fallback={<PhaseSkeleton />}>
              <Syllabus courseId={course.id} />
            </Suspense>
          </div>
          {activePhase === "tools" && (
            <div>
              {selectedExamId ? (
                <ExamPlayer examId={selectedExamId} onExit={handleExamExit} />
              ) : selectedTool ? (
                <>
                  {selectedTool === "videos" && (
                    <VideosTool courseId={course.id} onBack={handleToolBack} />
                  )}
                  {selectedTool === "notes" && (
                    <NotesTool courseId={course.id} onBack={handleToolBack} />
                  )}
                  {selectedTool === "quizzes" && (
                    <QuizzesTool courseId={course.id} onBack={handleToolBack} />
                  )}
                  {selectedTool === "flashcards" && (
                    <FlashcardsTool courseId={course.id} onBack={handleToolBack} />
                  )}
                  {selectedTool === "activities" && (
                    <ActivitiesTool courseId={course.id} onBack={handleToolBack} />
                  )}
                  {selectedTool === "exams" && (
                    <ExamsTool
                      courseId={course.id}
                      onBack={handleToolBack}
                      onStartExam={handleStartExam}
                    />
                  )}
                  {selectedTool === "question-bank" && (
                    <QuestionBankTool courseId={course.id} onBack={handleToolBack} />
                  )}
                </>
              ) : (
                <>
                  <h1 className="text-xl sm:text-2xl font-bold mb-4 sm:mb-6">Outils d'apprentissage</h1>
                  <LearningTools courseId={course.id} onToolSelect={handleToolSelect} />
                </>
              )}
            </div>
          )}
          {activePhase === "progress" && (
            <div>
              <h1 className="text-xl sm:text-2xl font-bold mb-4 sm:mb-6">Progrès et statistiques</h1>
              <StudentAnalyticsDashboard courseId={course.id} />
            </div>
          )}
          {activePhase === "question" && (
            <div>
              <AskQuestionPage courseId={course.id} courseTitle={course.title} />
            </div>
          )}
        </div>
      </main>
    </div>
  );
}


```

```typescriptreact
"use client";

import { useState, useEffect, lazy, Suspense, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BookOpen, RefreshCw, CheckCircle2, Target, Brain, FileText, Menu } from "lucide-react";
import { OrientationForm } from "./orientation-form";
import { OrientationVideo } from "./orientation-video";
import { OrientationHelpBubble } from "./orientation-help-bubble";
import { TodaysPlan } from "./todays-plan";
import { StudyPlan } from "./study-plan";
import { BehindScheduleWarning } from "./behind-schedule-warning";
import { ModuleDetailPage } from "./module-detail-page";
import { CourseSidebar } from "./course-sidebar";
import { Syllabus } from "./syllabus";
import { LearningTools } from "./learning-tools";
import { VideosTool } from "./tools/videos-tool";
import { NotesTool } from "./tools/notes-tool";
import { QuizzesTool } from "./tools/quizzes-tool";
import { FlashcardsTool } from "./tools/flashcards-tool";
import { ActivitiesTool } from "./tools/activities-tool";
import { ExamsTool } from "./tools/exams-tool";
import { QuestionBankTool } from "./tools/question-bank-tool";
import { ExamPlayer } from "./exam-player";
import { StudentAnalyticsDashboard } from "./student-analytics-dashboard";
import { AskQuestionPage } from "./ask-question-page";
import { getUserCourseSettingsAction } from "@/app/actions/study-plan";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";

// Lazy load phase components to reduce initial bundle size
const Phase1Learn = lazy(() => import("./phase1-learn").then(m => ({ default: m.Phase1Learn })));
const Phase2Review = lazy(() => import("./phase2-review").then(m => ({ default: m.Phase2Review })));
const Phase3Practice = lazy(() => import("./phase3-practice").then(m => ({ default: m.Phase3Practice })));

// Skeleton loader for phase components
const PhaseSkeleton = () => (
  <div className="space-y-4">
    <Skeleton className="h-8 w-64" />
    <Skeleton className="h-32 w-full" />
    <Skeleton className="h-32 w-full" />
    <Skeleton className="h-32 w-full" />
  </div>
);

type Course = {
  id: string;
  title: string;
  category?: {
    name: string;
  };
  recommendedStudyHoursMin?: number | null;
  recommendedStudyHoursMax?: number | null;
  orientationVideoUrl?: string | null;
  modules: Array<{
    id: string;
    title: string;
    shortTitle?: string | null;
    order: number;
    contentItems?: Array<{
      id: string;
      title: string;
      contentType: string;
      order: number;
    }>;
  }>;
};

interface PhaseBasedLearningInterfaceProps {
  course: Course;
  initialSettings?: any; // Settings passed from server to avoid client-side fetch
}

type Phase = "orientation" | "home" | "learn" | "review" | "practice" | "syllabus" | "tools" | "progress" | "question";
type NavigationItem = "home" | "learn" | "review" | "practice" | "syllabus" | "tools" | "progress" | "question" | `module-${string}`;

export function PhaseBasedLearningInterface({ course, initialSettings }: PhaseBasedLearningInterfaceProps) {
  const router = useRouter();
  const [activePhase, setActivePhase] = useState<Phase>("orientation");
  const [activeItem, setActiveItem] = useState<NavigationItem>("home");
  const [settings, setSettings] = useState<any>(initialSettings || null);
  const [loading, setLoading] = useState(!initialSettings); // Only load if settings not provided
  // Cache for loaded phase data to prevent redundant requests
  const [loadedPhases, setLoadedPhases] = useState<Set<string>>(new Set());
  const [selectedModuleId, setSelectedModuleId] = useState<string | null>(null);
  const [selectedTool, setSelectedTool] = useState<string | null>(null);
  const [selectedExamId, setSelectedExamId] = useState<string | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Helper function to get URL parameters
  const getUrlParams = () => {
    if (typeof window === 'undefined') return { module: null, tab: null };
    const params = new URLSearchParams(window.location.search);
    return {
      module: params.get('module'),
      tab: params.get('tab'),
    };
  };

  useEffect(() => {
    // Check URL parameters first (takes priority)
    const { module: moduleId } = getUrlParams();
    if (moduleId) {
      setSelectedModuleId(moduleId);
      setActivePhase("learn");
      setActiveItem(`module-${moduleId}` as NavigationItem);
      setLoading(false);
      return;
    }

    // Only load settings if not provided from server
    if (initialSettings) {
      setSettings(initialSettings);
      // Use provided settings for navigation
      if (initialSettings.orientationCompleted) {
        setActivePhase("home");
        setActiveItem("home");
      } else {
        setActivePhase("orientation");
      }
      setLoading(false);
    } else {
      // Load settings from client
      loadSettings();
    }
  }, [initialSettings]); // Only depend on initialSettings

  const loadSettings = async () => {
    // Skip if settings already provided from server
    if (initialSettings) {
      setSettings(initialSettings);
      setLoading(false);
      return;
    }
    
    try {
      const result = await getUserCourseSettingsAction(course.id);
      if (result.success && result.data) {
        setSettings(result.data);
        
        // Check URL parameters for module and tab navigation FIRST
        // This takes priority over default navigation
        const { module: moduleId } = getUrlParams();
        
        if (moduleId) {
          // URL has module parameter - navigate to that module
          setSelectedModuleId(moduleId);
          setActivePhase("learn");
          setActiveItem(`module-${moduleId}` as NavigationItem);
        } else if (result.data.orientationCompleted) {
          // No module parameter - use default navigation
          setActivePhase("home");
          setActiveItem("home");
        } else {
          setActivePhase("orientation");
        }
      } else {
        // No settings found, check for module parameter anyway
        const { module: moduleId } = getUrlParams();
        
        if (moduleId) {
          setSelectedModuleId(moduleId);
          setActivePhase("learn");
          setActiveItem(`module-${moduleId}` as NavigationItem);
        } else {
          setActivePhase("orientation");
        }
      }
    } catch (error) {
      console.error("Error loading settings:", error);
      // Check for module parameter even on error
      const { module: moduleId } = getUrlParams();
      
      if (moduleId) {
        setSelectedModuleId(moduleId);
        setActivePhase("learn");
        setActiveItem(`module-${moduleId}` as NavigationItem);
      } else {
        setActivePhase("orientation");
      }
    } finally {
      setLoading(false);
    }
  };

  const [studyPlanRefreshKey, setStudyPlanRefreshKey] = useState(0);
  
  const handleSettingsUpdated = () => {
    router.refresh();
    loadSettings();
    // Force StudyPlan to refresh
    setStudyPlanRefreshKey(prev => prev + 1);
  };

  const handleNavigate = (item: NavigationItem) => {
    setActiveItem(item);
    if (item === "home") {
      setActivePhase("home");
      setSelectedModuleId(null);
      setSelectedTool(null);
      setSelectedExamId(null);
    } else if (item === "learn") {
      setActivePhase("learn");
      setSelectedModuleId(null);
      setSelectedTool(null);
      setSelectedExamId(null);
      setLoadedPhases(prev => new Set(prev).add("learn"));
    } else if (item.startsWith("module-")) {
      setActivePhase("learn");
      const moduleId = item.replace("module-", "");
      setSelectedModuleId(moduleId);
      setSelectedTool(null);
      setSelectedExamId(null);
      setLoadedPhases(prev => new Set(prev).add("learn"));
    } else if (item === "review") {
      setActivePhase("review");
      setSelectedModuleId(null);
      setSelectedTool(null);
      setSelectedExamId(null);
      setLoadedPhases(prev => new Set(prev).add("review"));
    } else if (item === "practice") {
      setActivePhase("practice");
      setSelectedModuleId(null);
      setSelectedTool(null);
      setSelectedExamId(null);
      setLoadedPhases(prev => new Set(prev).add("practice"));
    } else if (item === "question") {
      setActivePhase("question");
      setSelectedModuleId(null);
      setSelectedTool(null);
      setSelectedExamId(null);
    } else if (item === "syllabus") {
      setActivePhase("syllabus");
      setSelectedModuleId(null);
      setSelectedTool(null);
      setSelectedExamId(null);
      setLoadedPhases(prev => new Set(prev).add("syllabus"));
    } else if (item === "tools") {
      setActivePhase("tools");
      setSelectedModuleId(null);
      setSelectedTool(null);
      setSelectedExamId(null);
      setLoadedPhases(prev => new Set(prev).add("tools"));
    } else if (item === "progress") {
      setActivePhase("progress");
      setSelectedModuleId(null);
      setSelectedTool(null);
      setSelectedExamId(null);
      setLoadedPhases(prev => new Set(prev).add("progress"));
    }
  };

  const handleModuleBack = () => {
    setSelectedModuleId(null);
    setActiveItem("learn");
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Chargement...</p>
        </div>
      </div>
    );
  }

  // Show orientation if not completed
  if (!settings || !settings.orientationCompleted) {
    // Check if settings exist but form not completed (show video)
    // If no settings at all, show form first
    if (!settings) {
      return (
        <div className="min-h-screen bg-background">
          <div className="border-b">
            <div className="container mx-auto px-4 py-4">
              <h1 className="text-2xl font-bold">{course.title}</h1>
              <p className="text-muted-foreground">Phase 0 - Orientation</p>
            </div>
          </div>
          <OrientationForm
            courseId={course.id}
            courseTitle={course.title}
            recommendedStudyHoursMin={course.recommendedStudyHoursMin}
            recommendedStudyHoursMax={course.recommendedStudyHoursMax}
            orientationVideoUrl={course.orientationVideoUrl}
            firstModuleId={course.modules.length > 0 ? course.modules[0].id : null}
            onComplete={(isFirstCreation) => {
              if (!isFirstCreation) {
                // If updating (not first creation), just refresh and go to home
                handleSettingsUpdated();
              }
              // If first creation, the form will show the video component
            }}
          />
        </div>
      );
    }

    // Settings exist but orientation not completed - show video
    return (
      <div className="min-h-screen bg-background">
        <div className="border-b">
          <div className="container mx-auto px-4 py-4">
            <h1 className="text-2xl font-bold">{course.title}</h1>
            <p className="text-muted-foreground">Phase 0 - Orientation</p>
          </div>
        </div>
        <OrientationVideo
          courseId={course.id}
          courseTitle={course.title}
          orientationVideoUrl={course.orientationVideoUrl}
          firstModuleId={course.modules.length > 0 ? course.modules[0].id : null}
          onComplete={handleSettingsUpdated}
        />
      </div>
    );
  }

  const handleMobileNavigate = (item: NavigationItem) => {
    handleNavigate(item);
    setMobileMenuOpen(false); // Close mobile menu after navigation
  };

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Desktop Course Sidebar Navigation */}
      <CourseSidebar
        course={course}
        activeItem={activeItem}
        onNavigate={handleNavigate}
        onSettingsUpdate={handleSettingsUpdated}
        mobileMenuOpen={mobileMenuOpen}
        onMobileMenuChange={setMobileMenuOpen}
      />

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto relative">
        {/* Mobile Header with Hamburger */}
        <div className="lg:hidden sticky top-0 z-40 bg-background border-b flex items-center justify-between px-4 py-3">
          <h1 className="text-lg font-semibold truncate flex-1 mr-2">{course.title}</h1>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setMobileMenuOpen(true)}
            aria-label="Ouvrir le menu"
          >
            <Menu className="h-6 w-6" />
          </Button>
        </div>

        {/* Floating Help Bubble - Only show after orientation is completed */}
        <OrientationHelpBubble
          courseId={course.id}
          courseTitle={course.title}
          orientationVideoUrl={course.orientationVideoUrl}
        />
        <div className="container mx-auto px-4 py-4 sm:py-6 max-w-6xl">
          {/* Content based on active phase */}
          {activePhase === "home" && (
            <div className="space-y-4 sm:space-y-6">
              <BehindScheduleWarning courseId={course.id} />
              <div>
                <TodaysPlan courseId={course.id} />
              </div>
              <div>
                <StudyPlan courseId={course.id} refreshKey={studyPlanRefreshKey} />
              </div>
            </div>
          )}
          {activePhase === "learn" && (
            <div>
              {selectedModuleId ? (
                <ModuleDetailPage
                  courseId={course.id}
                  moduleId={selectedModuleId}
                  onBack={handleModuleBack}
                />
              ) : (
                <>
                  <Suspense fallback={<PhaseSkeleton />}>
                    <Phase1Learn
                      courseId={course.id}
                      course={course}
                      settings={settings}
                      onModuleSelect={(moduleId) => {
                        setSelectedModuleId(moduleId);
                        setActiveItem(`module-${moduleId}` as NavigationItem);
                      }}
                    />
                  </Suspense>
                </>
              )}
            </div>
          )}
          {/* Keep phase components mounted but hidden when not active */}
          <div className={activePhase === "review" ? "" : "hidden"}>
            <h1 className="text-xl sm:text-2xl font-bold mb-4 sm:mb-6">Phase 2 - Réviser</h1>
            <Suspense fallback={<PhaseSkeleton />}>
              <Phase2Review courseId={course.id} course={course} settings={settings} />
            </Suspense>
          </div>
          <div className={activePhase === "practice" ? "" : "hidden"}>
            <h1 className="text-xl sm:text-2xl font-bold mb-4 sm:mb-6">Phase 3 - Pratiquer</h1>
            <Suspense fallback={<PhaseSkeleton />}>
              <Phase3Practice courseId={course.id} course={course} settings={settings} />
            </Suspense>
          </div>
          {/* Keep syllabus mounted but hidden when not active */}
          <div className={activePhase === "syllabus" ? "" : "hidden"}>
            <h1 className="text-xl sm:text-2xl font-bold mb-4 sm:mb-6">Plan de cours</h1>
            <Suspense fallback={<PhaseSkeleton />}>
              <Syllabus courseId={course.id} />
            </Suspense>
          </div>
          {activePhase === "tools" && (
            <div>
              {selectedExamId ? (
                <ExamPlayer examId={selectedExamId} onExit={handleExamExit} />
              ) : selectedTool ? (
                <>
                  {selectedTool === "videos" && (
                    <VideosTool courseId={course.id} onBack={handleToolBack} />
                  )}
                  {selectedTool === "notes" && (
                    <NotesTool courseId={course.id} onBack={handleToolBack} />
                  )}
                  {selectedTool === "quizzes" && (
                    <QuizzesTool courseId={course.id} onBack={handleToolBack} />
                  )}
                  {selectedTool === "flashcards" && (
                    <FlashcardsTool courseId={course.id} onBack={handleToolBack} />
                  )}
                  {selectedTool === "activities" && (
                    <ActivitiesTool courseId={course.id} onBack={handleToolBack} />
                  )}
                  {selectedTool === "exams" && (
                    <ExamsTool
                      courseId={course.id}
                      onBack={handleToolBack}
                      onStartExam={handleStartExam}
                    />
                  )}
                  {selectedTool === "question-bank" && (
                    <QuestionBankTool courseId={course.id} onBack={handleToolBack} />
                  )}
                </>
              ) : (
                <>
                  <h1 className="text-xl sm:text-2xl font-bold mb-4 sm:mb-6">Outils d'apprentissage</h1>
                  <LearningTools courseId={course.id} onToolSelect={handleToolSelect} />
                </>
              )}
            </div>
          )}
          {activePhase === "progress" && (
            <div>
              <h1 className="text-xl sm:text-2xl font-bold mb-4 sm:mb-6">Progrès et statistiques</h1>
              <StudentAnalyticsDashboard courseId={course.id} />
            </div>
          )}
          {activePhase === "question" && (
            <div>
              <AskQuestionPage courseId={course.id} courseTitle={course.title} />
            </div>
          )}
        </div>
      </main>
    </div>
  );
}


```

```typescriptreact
"use client";

import { useState, useEffect, lazy, Suspense, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BookOpen, RefreshCw, CheckCircle2, Target, Brain, FileText, Menu } from "lucide-react";
import { OrientationForm } from "./orientation-form";
import { OrientationVideo } from "./orientation-video";
import { OrientationHelpBubble } from "./orientation-help-bubble";
import { TodaysPlan } from "./todays-plan";
import { StudyPlan } from "./study-plan";
import { BehindScheduleWarning } from "./behind-schedule-warning";
import { ModuleDetailPage } from "./module-detail-page";
import { CourseSidebar } from "./course-sidebar";
import { Syllabus } from "./syllabus";
import { LearningTools } from "./learning-tools";
import { VideosTool } from "./tools/videos-tool";
import { NotesTool } from "./tools/notes-tool";
import { QuizzesTool } from "./tools/quizzes-tool";
import { FlashcardsTool } from "./tools/flashcards-tool";
import { ActivitiesTool } from "./tools/activities-tool";
import { ExamsTool } from "./tools/exams-tool";
import { QuestionBankTool } from "./tools/question-bank-tool";
import { ExamPlayer } from "./exam-player";
import { StudentAnalyticsDashboard } from "./student-analytics-dashboard";
import { AskQuestionPage } from "./ask-question-page";
import { getUserCourseSettingsAction } from "@/app/actions/study-plan";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";

// Lazy load phase components to reduce initial bundle size
const Phase1Learn = lazy(() => import("./phase1-learn").then(m => ({ default: m.Phase1Learn })));
const Phase2Review = lazy(() => import("./phase2-review").then(m => ({ default: m.Phase2Review })));
const Phase3Practice = lazy(() => import("./phase3-practice").then(m => ({ default: m.Phase3Practice })));

// Skeleton loader for phase components
const PhaseSkeleton = () => (
  <div className="space-y-4">
    <Skeleton className="h-8 w-64" />
    <Skeleton className="h-32 w-full" />
    <Skeleton className="h-32 w-full" />
    <Skeleton className="h-32 w-full" />
  </div>
);

type Course = {
  id: string;
  title: string;
  category?: {
    name: string;
  };
  recommendedStudyHoursMin?: number | null;
  recommendedStudyHoursMax?: number | null;
  orientationVideoUrl?: string | null;
  modules: Array<{
    id: string;
    title: string;
    shortTitle?: string | null;
    order: number;
    contentItems?: Array<{
      id: string;
      title: string;
      contentType: string;
      order: number;
    }>;
  }>;
};

interface PhaseBasedLearningInterfaceProps {
  course: Course;
  initialSettings?: any; // Settings passed from server to avoid client-side fetch
}

type Phase = "orientation" | "home" | "learn" | "review" | "practice" | "syllabus" | "tools" | "progress" | "question";
type NavigationItem = "home" | "learn" | "review" | "practice" | "syllabus" | "tools" | "progress" | "question" | `module-${string}`;

export function PhaseBasedLearningInterface({ course, initialSettings }: PhaseBasedLearningInterfaceProps) {
  const router = useRouter();
  const [activePhase, setActivePhase] = useState<Phase>("orientation");
  const [activeItem, setActiveItem] = useState<NavigationItem>("home");
  const [settings, setSettings] = useState<any>(initialSettings || null);
  const [loading, setLoading] = useState(!initialSettings); // Only load if settings not provided
  // Cache for loaded phase data to prevent redundant requests
  const [loadedPhases, setLoadedPhases] = useState<Set<string>>(new Set());
  const [selectedModuleId, setSelectedModuleId] = useState<string | null>(null);
  const [selectedTool, setSelectedTool] = useState<string | null>(null);
  const [selectedExamId, setSelectedExamId] = useState<string | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Helper function to get URL parameters
  const getUrlParams = () => {
    if (typeof window === 'undefined') return { module: null, tab: null };
    const params = new URLSearchParams(window.location.search);
    return {
      module: params.get('module'),
      tab: params.get('tab'),
    };
  };

  useEffect(() => {
    // Check URL parameters first (takes priority)
    const { module: moduleId } = getUrlParams();
    if (moduleId) {
      setSelectedModuleId(moduleId);
      setActivePhase("learn");
      setActiveItem(`module-${moduleId}` as NavigationItem);
      setLoading(false);
      return;
    }

    // Only load settings if not provided from server
    if (initialSettings) {
      setSettings(initialSettings);
      // Use provided settings for navigation
      if (initialSettings.orientationCompleted) {
        setActivePhase("home");
        setActiveItem("home");
      } else {
        setActivePhase("orientation");
      }
      setLoading(false);
    } else {
      // Load settings from client
      loadSettings();
    }
  }, [initialSettings]); // Only depend on initialSettings

  const loadSettings = async () => {
    // Skip if settings already provided from server
    if (initialSettings) {
      setSettings(initialSettings);
      setLoading(false);
      return;
    }
    
    try {
      const result = await getUserCourseSettingsAction(course.id);
      if (result.success && result.data) {
        setSettings(result.data);
        
        // Check URL parameters for module and tab navigation FIRST
        // This takes priority over default navigation
        const { module: moduleId } = getUrlParams();
        
        if (moduleId) {
          // URL has module parameter - navigate to that module
          setSelectedModuleId(moduleId);
          setActivePhase("learn");
          setActiveItem(`module-${moduleId}` as NavigationItem);
        } else if (result.data.orientationCompleted) {
          // No module parameter - use default navigation
          setActivePhase("home");
          setActiveItem("home");
        } else {
          setActivePhase("orientation");
        }
      } else {
        // No settings found, check for module parameter anyway
        const { module: moduleId } = getUrlParams();
        
        if (moduleId) {
          setSelectedModuleId(moduleId);
          setActivePhase("learn");
          setActiveItem(`module-${moduleId}` as NavigationItem);
        } else {
          setActivePhase("orientation");
        }
      }
    } catch (error) {
      console.error("Error loading settings:", error);
      // Check for module parameter even on error
      const { module: moduleId } = getUrlParams();
      
      if (moduleId) {
        setSelectedModuleId(moduleId);
        setActivePhase("learn");
        setActiveItem(`module-${moduleId}` as NavigationItem);
      } else {
        setActivePhase("orientation");
      }
    } finally {
      setLoading(false);
    }
  };

  const [studyPlanRefreshKey, setStudyPlanRefreshKey] = useState(0);
  
  const handleSettingsUpdated = () => {
    router.refresh();
    loadSettings();
    // Force StudyPlan to refresh
    setStudyPlanRefreshKey(prev => prev + 1);
  };

  const handleNavigate = (item: NavigationItem) => {
    setActiveItem(item);
    if (item === "home") {
      setActivePhase("home");
      setSelectedModuleId(null);
      setSelectedTool(null);
      setSelectedExamId(null);
    } else if (item === "learn") {
      setActivePhase("learn");
      setSelectedModuleId(null);
      setSelectedTool(null);
      setSelectedExamId(null);
      setLoadedPhases(prev => new Set(prev).add("learn"));
    } else if (item.startsWith("module-")) {
      setActivePhase("learn");
      const moduleId = item.replace("module-", "");
      setSelectedModuleId(moduleId);
      setSelectedTool(null);
      setSelectedExamId(null);
      setLoadedPhases(prev => new Set(prev).add("learn"));
    } else if (item === "review") {
      setActivePhase("review");
      setSelectedModuleId(null);
      setSelectedTool(null);
      setSelectedExamId(null);
      setLoadedPhases(prev => new Set(prev).add("review"));
    } else if (item === "practice") {
      setActivePhase("practice");
      setSelectedModuleId(null);
      setSelectedTool(null);
      setSelectedExamId(null);
      setLoadedPhases(prev => new Set(prev).add("practice"));
    } else if (item === "question") {
      setActivePhase("question");
      setSelectedModuleId(null);
      setSelectedTool(null);
      setSelectedExamId(null);
    } else if (item === "syllabus") {
      setActivePhase("syllabus");
      setSelectedModuleId(null);
      setSelectedTool(null);
      setSelectedExamId(null);
      setLoadedPhases(prev => new Set(prev).add("syllabus"));
    } else if (item === "tools") {
      setActivePhase("tools");
      setSelectedModuleId(null);
      setSelectedTool(null);
      setSelectedExamId(null);
      setLoadedPhases(prev => new Set(prev).add("tools"));
    } else if (item === "progress") {
      setActivePhase("progress");
      setSelectedModuleId(null);
      setSelectedTool(null);
      setSelectedExamId(null);
      setLoadedPhases(prev => new Set(prev).add("progress"));
    }
  };

  const handleModuleBack = () => {
    setSelectedModuleId(null);
    setActiveItem("learn");
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Chargement...</p>
        </div>
      </div>
    );
  }

  // Show orientation if not completed
  if (!settings || !settings.orientationCompleted) {
    // Check if settings exist but form not completed (show video)
    // If no settings at all, show form first
    if (!settings) {
      return (
        <div className="min-h-screen bg-background">
          <div className="border-b">
            <div className="container mx-auto px-4 py-4">
              <h1 className="text-2xl font-bold">{course.title}</h1>
              <p className="text-muted-foreground">Phase 0 - Orientation</p>
            </div>
          </div>
          <OrientationForm
            courseId={course.id}
            courseTitle={course.title}
            recommendedStudyHoursMin={course.recommendedStudyHoursMin}
            recommendedStudyHoursMax={course.recommendedStudyHoursMax}
            orientationVideoUrl={course.orientationVideoUrl}
            firstModuleId={course.modules.length > 0 ? course.modules[0].id : null}
            onComplete={(isFirstCreation) => {
              if (!isFirstCreation) {
                // If updating (not first creation), just refresh and go to home
                handleSettingsUpdated();
              }
              // If first creation, the form will show the video component
            }}
          />
        </div>
      );
    }

    // Settings exist but orientation not completed - show video
    return (
      <div className="min-h-screen bg-background">
        <div className="border-b">
          <div className="container mx-auto px-4 py-4">
            <h1 className="text-2xl font-bold">{course.title}</h1>
            <p className="text-muted-foreground">Phase 0 - Orientation</p>
          </div>
        </div>
        <OrientationVideo
          courseId={course.id}
          courseTitle={course.title}
          orientationVideoUrl={course.orientationVideoUrl}
          firstModuleId={course.modules.length > 0 ? course.modules[0].id : null}
          onComplete={handleSettingsUpdated}
        />
      </div>
    );
  }

  const handleMobileNavigate = (item: NavigationItem) => {
    handleNavigate(item);
    setMobileMenuOpen(false); // Close mobile menu after navigation
  };

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Desktop Course Sidebar Navigation */}
      <CourseSidebar
        course={course}
        activeItem={activeItem}
        onNavigate={handleNavigate}
        onSettingsUpdate={handleSettingsUpdated}
        mobileMenuOpen={mobileMenuOpen}
        onMobileMenuChange={setMobileMenuOpen}
      />

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto relative">
        {/* Mobile Header with Hamburger */}
        <div className="lg:hidden sticky top-0 z-40 bg-background border-b flex items-center justify-between px-4 py-3">
          <h1 className="text-lg font-semibold truncate flex-1 mr-2">{course.title}</h1>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setMobileMenuOpen(true)}
            aria-label="Ouvrir le menu"
          >
            <Menu className="h-6 w-6" />
          </Button>
        </div>

        {/* Floating Help Bubble - Only show after orientation is completed */}
        <OrientationHelpBubble
          courseId={course.id}
          courseTitle={course.title}
          orientationVideoUrl={course.orientationVideoUrl}
        />
        <div className="container mx-auto px-4 py-4 sm:py-6 max-w-6xl">
          {/* Content based on active phase */}
          {activePhase === "home" && (
            <div className="space-y-4 sm:space-y-6">
              <BehindScheduleWarning courseId={course.id} />
              <div>
                <TodaysPlan courseId={course.id} />
              </div>
              <div>
                <StudyPlan courseId={course.id} refreshKey={studyPlanRefreshKey} />
              </div>
            </div>
          )}
          {activePhase === "learn" && (
            <div>
              {selectedModuleId ? (
                <ModuleDetailPage
                  courseId={course.id}
                  moduleId={selectedModuleId}
                  onBack={handleModuleBack}
                />
              ) : (
                <>
                  <Suspense fallback={<PhaseSkeleton />}>
                    <Phase1Learn
                      courseId={course.id}
                      course={course}
                      settings={settings}
                      onModuleSelect={(moduleId) => {
                        setSelectedModuleId(moduleId);
                        setActiveItem(`module-${moduleId}` as NavigationItem);
                      }}
                    />
                  </Suspense>
                </>
              )}
            </div>
          )}
          {/* Keep phase components mounted but hidden when not active */}
          <div className={activePhase === "review" ? "" : "hidden"}>
            <Suspense fallback={<PhaseSkeleton />}>
              <Phase2Review courseId={course.id} course={course} settings={settings} />
            </Suspense>
          </div>
          <div className={activePhase === "practice" ? "" : "hidden"}>
            <Suspense fallback={<PhaseSkeleton />}>
              <Phase3Practice courseId={course.id} course={course} settings={settings} />
            </Suspense>
          </div>
          {/* Keep syllabus mounted but hidden when not active */}
          <div className={activePhase === "syllabus" ? "" : "hidden"}>
            <Suspense fallback={<PhaseSkeleton />}>
              <Syllabus courseId={course.id} />
            </Suspense>
          </div>
          {activePhase === "tools" && (
            <div>
              {selectedExamId ? (
                <ExamPlayer examId={selectedExamId} onExit={handleExamExit} />
              ) : selectedTool ? (
                <>
                  {selectedTool === "videos" && (
                    <VideosTool courseId={course.id} onBack={handleToolBack} />
                  )}
                  {selectedTool === "notes" && (
                    <NotesTool courseId={course.id} onBack={handleToolBack} />
                  )}
                  {selectedTool === "quizzes" && (
                    <QuizzesTool courseId={course.id} onBack={handleToolBack} />
                  )}
                  {selectedTool === "flashcards" && (
                    <FlashcardsTool courseId={course.id} onBack={handleToolBack} />
                  )}
                  {selectedTool === "activities" && (
                    <ActivitiesTool courseId={course.id} onBack={handleToolBack} />
                  )}
                  {selectedTool === "exams" && (
                    <ExamsTool
                      courseId={course.id}
                      onBack={handleToolBack}
                      onStartExam={handleStartExam}
                    />
                  )}
                  {selectedTool === "question-bank" && (
                    <QuestionBankTool courseId={course.id} onBack={handleToolBack} />
                  )}
                </>
              ) : (
                <>
                  <h1 className="text-xl sm:text-2xl font-bold mb-4 sm:mb-6">Outils d'apprentissage</h1>
                  <LearningTools courseId={course.id} onToolSelect={handleToolSelect} />
                </>
              )}
            </div>
          )}
          {activePhase === "progress" && (
            <div>
              <h1 className="text-xl sm:text-2xl font-bold mb-4 sm:mb-6">Progrès et statistiques</h1>
              <StudentAnalyticsDashboard courseId={course.id} />
            </div>
          )}
          {activePhase === "question" && (
            <div>
              <AskQuestionPage courseId={course.id} courseTitle={course.title} />
            </div>
          )}
        </div>
      </main>
    </div>
  );
}


```

```typescriptreact
"use client";

import { useState, useEffect, lazy, Suspense, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BookOpen, RefreshCw, CheckCircle2, Target, Brain, FileText, Menu } from "lucide-react";
import { OrientationForm } from "./orientation-form";
import { OrientationVideo } from "./orientation-video";
import { OrientationHelpBubble } from "./orientation-help-bubble";
import { TodaysPlan } from "./todays-plan";
import { StudyPlan } from "./study-plan";
import { BehindScheduleWarning } from "./behind-schedule-warning";
import { ModuleDetailPage } from "./module-detail-page";
import { CourseSidebar } from "./course-sidebar";
import { Syllabus } from "./syllabus";
import { LearningTools } from "./learning-tools";
import { VideosTool } from "./tools/videos-tool";
import { NotesTool } from "./tools/notes-tool";
import { QuizzesTool } from "./tools/quizzes-tool";
import { FlashcardsTool } from "./tools/flashcards-tool";
import { ActivitiesTool } from "./tools/activities-tool";
import { ExamsTool } from "./tools/exams-tool";
import { QuestionBankTool } from "./tools/question-bank-tool";
import { ExamPlayer } from "./exam-player";
import { StudentAnalyticsDashboard } from "./student-analytics-dashboard";
import { AskQuestionPage } from "./ask-question-page";
import { getUserCourseSettingsAction } from "@/app/actions/study-plan";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";

// Lazy load phase components to reduce initial bundle size
const Phase1Learn = lazy(() => import("./phase1-learn").then(m => ({ default: m.Phase1Learn })));
const Phase2Review = lazy(() => import("./phase2-review").then(m => ({ default: m.Phase2Review })));
const Phase3Practice = lazy(() => import("./phase3-practice").then(m => ({ default: m.Phase3Practice })));

// Skeleton loader for phase components
const PhaseSkeleton = () => (
  <div className="space-y-4">
    <Skeleton className="h-8 w-64" />
    <Skeleton className="h-32 w-full" />
    <Skeleton className="h-32 w-full" />
    <Skeleton className="h-32 w-full" />
  </div>
);

type Course = {
  id: string;
  title: string;
  category?: {
    name: string;
  };
  recommendedStudyHoursMin?: number | null;
  recommendedStudyHoursMax?: number | null;
  orientationVideoUrl?: string | null;
  modules: Array<{
    id: string;
    title: string;
    shortTitle?: string | null;
    order: number;
    contentItems?: Array<{
      id: string;
      title: string;
      contentType: string;
      order: number;
    }>;
  }>;
};

interface PhaseBasedLearningInterfaceProps {
  course: Course;
  initialSettings?: any; // Settings passed from server to avoid client-side fetch
}

type Phase = "orientation" | "home" | "learn" | "review" | "practice" | "syllabus" | "tools" | "progress" | "question";
type NavigationItem = "home" | "learn" | "review" | "practice" | "syllabus" | "tools" | "progress" | "question" | `module-${string}`;

export function PhaseBasedLearningInterface({ course, initialSettings }: PhaseBasedLearningInterfaceProps) {
  const router = useRouter();
  const [activePhase, setActivePhase] = useState<Phase>("orientation");
  const [activeItem, setActiveItem] = useState<NavigationItem>("home");
  const [settings, setSettings] = useState<any>(initialSettings || null);
  const [loading, setLoading] = useState(!initialSettings); // Only load if settings not provided
  // Cache for loaded phase data to prevent redundant requests
  const [loadedPhases, setLoadedPhases] = useState<Set<string>>(new Set());
  const [selectedModuleId, setSelectedModuleId] = useState<string | null>(null);
  const [selectedTool, setSelectedTool] = useState<string | null>(null);
  const [selectedExamId, setSelectedExamId] = useState<string | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Helper function to get URL parameters
  const getUrlParams = () => {
    if (typeof window === 'undefined') return { module: null, tab: null };
    const params = new URLSearchParams(window.location.search);
    return {
      module: params.get('module'),
      tab: params.get('tab'),
    };
  };

  useEffect(() => {
    // Check URL parameters first (takes priority)
    const { module: moduleId } = getUrlParams();
    if (moduleId) {
      setSelectedModuleId(moduleId);
      setActivePhase("learn");
      setActiveItem(`module-${moduleId}` as NavigationItem);
      setLoading(false);
      return;
    }

    // Only load settings if not provided from server
    if (initialSettings) {
      setSettings(initialSettings);
      // Use provided settings for navigation
      if (initialSettings.orientationCompleted) {
        setActivePhase("home");
        setActiveItem("home");
      } else {
        setActivePhase("orientation");
      }
      setLoading(false);
    } else {
      // Load settings from client
      loadSettings();
    }
  }, [initialSettings]); // Only depend on initialSettings

  const loadSettings = async () => {
    // Skip if settings already provided from server
    if (initialSettings) {
      setSettings(initialSettings);
      setLoading(false);
      return;
    }
    
    try {
      const result = await getUserCourseSettingsAction(course.id);
      if (result.success && result.data) {
        setSettings(result.data);
        
        // Check URL parameters for module and tab navigation FIRST
        // This takes priority over default navigation
        const { module: moduleId } = getUrlParams();
        
        if (moduleId) {
          // URL has module parameter - navigate to that module
          setSelectedModuleId(moduleId);
          setActivePhase("learn");
          setActiveItem(`module-${moduleId}` as NavigationItem);
        } else if (result.data.orientationCompleted) {
          // No module parameter - use default navigation
          setActivePhase("home");
          setActiveItem("home");
        } else {
          setActivePhase("orientation");
        }
      } else {
        // No settings found, check for module parameter anyway
        const { module: moduleId } = getUrlParams();
        
        if (moduleId) {
          setSelectedModuleId(moduleId);
          setActivePhase("learn");
          setActiveItem(`module-${moduleId}` as NavigationItem);
        } else {
          setActivePhase("orientation");
        }
      }
    } catch (error) {
      console.error("Error loading settings:", error);
      // Check for module parameter even on error
      const { module: moduleId } = getUrlParams();
      
      if (moduleId) {
        setSelectedModuleId(moduleId);
        setActivePhase("learn");
        setActiveItem(`module-${moduleId}` as NavigationItem);
      } else {
        setActivePhase("orientation");
      }
    } finally {
      setLoading(false);
    }
  };

  const [studyPlanRefreshKey, setStudyPlanRefreshKey] = useState(0);
  
  const handleSettingsUpdated = () => {
    router.refresh();
    loadSettings();
    // Force StudyPlan to refresh
    setStudyPlanRefreshKey(prev => prev + 1);
  };

  const handleNavigate = (item: NavigationItem) => {
    setActiveItem(item);
    if (item === "home") {
      setActivePhase("home");
      setSelectedModuleId(null);
      setSelectedTool(null);
      setSelectedExamId(null);
    } else if (item === "learn") {
      setActivePhase("learn");
      setSelectedModuleId(null);
      setSelectedTool(null);
      setSelectedExamId(null);
      setLoadedPhases(prev => new Set(prev).add("learn"));
    } else if (item.startsWith("module-")) {
      setActivePhase("learn");
      const moduleId = item.replace("module-", "");
      setSelectedModuleId(moduleId);
      setSelectedTool(null);
      setSelectedExamId(null);
      setLoadedPhases(prev => new Set(prev).add("learn"));
    } else if (item === "review") {
      setActivePhase("review");
      setSelectedModuleId(null);
      setSelectedTool(null);
      setSelectedExamId(null);
      setLoadedPhases(prev => new Set(prev).add("review"));
    } else if (item === "practice") {
      setActivePhase("practice");
      setSelectedModuleId(null);
      setSelectedTool(null);
      setSelectedExamId(null);
      setLoadedPhases(prev => new Set(prev).add("practice"));
    } else if (item === "question") {
      setActivePhase("question");
      setSelectedModuleId(null);
      setSelectedTool(null);
      setSelectedExamId(null);
    } else if (item === "syllabus") {
      setActivePhase("syllabus");
      setSelectedModuleId(null);
      setSelectedTool(null);
      setSelectedExamId(null);
      setLoadedPhases(prev => new Set(prev).add("syllabus"));
    } else if (item === "tools") {
      setActivePhase("tools");
      setSelectedModuleId(null);
      setSelectedTool(null);
      setSelectedExamId(null);
      setLoadedPhases(prev => new Set(prev).add("tools"));
    } else if (item === "progress") {
      setActivePhase("progress");
      setSelectedModuleId(null);
      setSelectedTool(null);
      setSelectedExamId(null);
      setLoadedPhases(prev => new Set(prev).add("progress"));
    }
  };

  const handleModuleBack = () => {
    setSelectedModuleId(null);
    setActiveItem("learn");
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Chargement...</p>
        </div>
      </div>
    );
  }

  // Show orientation if not completed
  if (!settings || !settings.orientationCompleted) {
    // Check if settings exist but form not completed (show video)
    // If no settings at all, show form first
    if (!settings) {
      return (
        <div className="min-h-screen bg-background">
          <div className="border-b">
            <div className="container mx-auto px-4 py-4">
              <h1 className="text-2xl font-bold">{course.title}</h1>
              <p className="text-muted-foreground">Phase 0 - Orientation</p>
            </div>
          </div>
          <OrientationForm
            courseId={course.id}
            courseTitle={course.title}
            recommendedStudyHoursMin={course.recommendedStudyHoursMin}
            recommendedStudyHoursMax={course.recommendedStudyHoursMax}
            orientationVideoUrl={course.orientationVideoUrl}
            firstModuleId={course.modules.length > 0 ? course.modules[0].id : null}
            onComplete={(isFirstCreation) => {
              if (!isFirstCreation) {
                // If updating (not first creation), just refresh and go to home
                handleSettingsUpdated();
              }
              // If first creation, the form will show the video component
            }}
          />
        </div>
      );
    }

    // Settings exist but orientation not completed - show video
    return (
      <div className="min-h-screen bg-background">
        <div className="border-b">
          <div className="container mx-auto px-4 py-4">
            <h1 className="text-2xl font-bold">{course.title}</h1>
            <p className="text-muted-foreground">Phase 0 - Orientation</p>
          </div>
        </div>
        <OrientationVideo
          courseId={course.id}
          courseTitle={course.title}
          orientationVideoUrl={course.orientationVideoUrl}
          firstModuleId={course.modules.length > 0 ? course.modules[0].id : null}
          onComplete={handleSettingsUpdated}
        />
      </div>
    );
  }

  const handleMobileNavigate = (item: NavigationItem) => {
    handleNavigate(item);
    setMobileMenuOpen(false); // Close mobile menu after navigation
  };

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Desktop Course Sidebar Navigation */}
      <CourseSidebar
        course={course}
        activeItem={activeItem}
        onNavigate={handleNavigate}
        onSettingsUpdate={handleSettingsUpdated}
        mobileMenuOpen={mobileMenuOpen}
        onMobileMenuChange={setMobileMenuOpen}
      />

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto relative">
        {/* Mobile Header with Hamburger */}
        <div className="lg:hidden sticky top-0 z-40 bg-background border-b flex items-center justify-between px-4 py-3">
          <h1 className="text-lg font-semibold truncate flex-1 mr-2">{course.title}</h1>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setMobileMenuOpen(true)}
            aria-label="Ouvrir le menu"
          >
            <Menu className="h-6 w-6" />
          </Button>
        </div>

        {/* Floating Help Bubble - Only show after orientation is completed */}
        <OrientationHelpBubble
          courseId={course.id}
          courseTitle={course.title}
          orientationVideoUrl={course.orientationVideoUrl}
        />
        <div className="container mx-auto px-4 py-4 sm:py-6 max-w-6xl">
          {/* Content based on active phase */}
          {activePhase === "home" && (
            <div className="space-y-4 sm:space-y-6">
              <BehindScheduleWarning courseId={course.id} />
              <div>
                <TodaysPlan courseId={course.id} />
              </div>
              <div>
                <StudyPlan courseId={course.id} refreshKey={studyPlanRefreshKey} />
              </div>
            </div>
          )}
          {activePhase === "learn" && (
            <div>
              {selectedModuleId ? (
                <ModuleDetailPage
                  courseId={course.id}
                  moduleId={selectedModuleId}
                  onBack={handleModuleBack}
                />
              ) : (
                <>
                  <Suspense fallback={<PhaseSkeleton />}>
                    <Phase1Learn
                      courseId={course.id}
                      course={course}
                      settings={settings}
                      onModuleSelect={(moduleId) => {
                        setSelectedModuleId(moduleId);
                        setActiveItem(`module-${moduleId}` as NavigationItem);
                      }}
                    />
                  </Suspense>
                </>
              )}
            </div>
          )}
          {/* Keep phase components mounted but hidden when not active */}
          <div className={activePhase === "review" ? "" : "hidden"}>
            <Suspense fallback={<PhaseSkeleton />}>
              <Phase2Review courseId={course.id} course={course} settings={settings} />
            </Suspense>
          </div>
          <div className={activePhase === "practice" ? "" : "hidden"}>
            <Suspense fallback={<PhaseSkeleton />}>
              <Phase3Practice courseId={course.id} course={course} settings={settings} />
            </Suspense>
          </div>
          {/* Keep syllabus mounted but hidden when not active */}
          <div className={activePhase === "syllabus" ? "" : "hidden"}>
            <Suspense fallback={<PhaseSkeleton />}>
              <Syllabus courseId={course.id} />
            </Suspense>
          </div>
          {activePhase === "tools" && (
            <div>
              {selectedExamId ? (
                <ExamPlayer examId={selectedExamId} onExit={handleExamExit} />
              ) : selectedTool ? (
                <>
                  {selectedTool === "videos" && (
                    <VideosTool courseId={course.id} onBack={handleToolBack} />
                  )}
                  {selectedTool === "notes" && (
                    <NotesTool courseId={course.id} onBack={handleToolBack} />
                  )}
                  {selectedTool === "quizzes" && (
                    <QuizzesTool courseId={course.id} onBack={handleToolBack} />
                  )}
                  {selectedTool === "flashcards" && (
                    <FlashcardsTool courseId={course.id} onBack={handleToolBack} />
                  )}
                  {selectedTool === "activities" && (
                    <ActivitiesTool courseId={course.id} onBack={handleToolBack} />
                  )}
                  {selectedTool === "exams" && (
                    <ExamsTool
                      courseId={course.id}
                      onBack={handleToolBack}
                      onStartExam={handleStartExam}
                    />
                  )}
                  {selectedTool === "question-bank" && (
                    <QuestionBankTool courseId={course.id} onBack={handleToolBack} />
                  )}
                </>
              ) : (
                <>
                  <LearningTools courseId={course.id} onToolSelect={handleToolSelect} />
                </>
              )}
            </div>
          )}
          {activePhase === "progress" && (
            <div>
              <h1 className="text-xl sm:text-2xl font-bold mb-4 sm:mb-6">Progrès et statistiques</h1>
              <StudentAnalyticsDashboard courseId={course.id} />
            </div>
          )}
          {activePhase === "question" && (
            <div>
              <AskQuestionPage courseId={course.id} courseTitle={course.title} />
            </div>
          )}
        </div>
      </main>
    </div>
  );
}


```


Reversed the changes:

1. **Restored CardTitles** in the components:
   - `todays-plan.tsx` - "Plan du jour"
   - `syllabus.tsx` - "Plan de cours"
   - `phase1-learn.tsx` - "Phase 1 - Apprendre le matériel"
   - `phase2-review.tsx` - "Phase 2 - Révision et rappel actif"
   - `phase3-practice.tsx` - "Phase 3 - Pratique et simulation d'examen"

2. **Removed h1 page titles** from the main interface (`phase-based-learning-interface.tsx`):
   - Removed "Plan du jour" h1
   - Removed "Phase 1 - Apprendre" h1
   - Removed "Phase 2 - Réviser" h1
   - Removed "Phase 3 - Pratiquer" h1
   - Removed "Plan de cours" h1
   - Removed "Outils d'apprentissage" h1

Each page now shows the title once (from the CardTitle in the component), removing the duplicate.

---

**User**

please fix the tabs for the progrès et statistique section on mobile

---

**Cursor**


Searching for the progress and statistics component to fix the mobile tabs:



Reading the student analytics dashboard component:



Making the tabs responsive for mobile: they're using `grid-cols-5`, which squeezes them. Updating to a mobile-friendly layout:


```typescriptreact
"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Loader2, Clock, Target, TrendingUp, BookOpen, Calendar, Award } from "lucide-react";
import {
  getStudentOverviewAction,
  getStudentProgressAction,
  getStudentPerformanceAction,
  getStudentStudyHabitsAction,
  getStudentGoalsAction,
} from "@/app/actions/student-analytics";
import { OverviewSection } from "./analytics/overview-section";
import { ProgressSection } from "./analytics/progress-section";
import { PerformanceSection } from "./analytics/performance-section";
import { StudyHabitsSection } from "./analytics/study-habits-section";
import { GoalsSection } from "./analytics/goals-section";

interface StudentAnalyticsDashboardProps {
  courseId: string;
}

export function StudentAnalyticsDashboard({ courseId }: StudentAnalyticsDashboardProps) {
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");
  const [overviewData, setOverviewData] = useState<any>(null);
  const [progressData, setProgressData] = useState<any>(null);
  const [progressLoading, setProgressLoading] = useState(false);
  const [performanceData, setPerformanceData] = useState<any>(null);
  const [performanceLoading, setPerformanceLoading] = useState(false);
  const [studyHabitsData, setStudyHabitsData] = useState<any>(null);
  const [habitsLoading, setHabitsLoading] = useState(false);
  const [goalsData, setGoalsData] = useState<any>(null);
  const [goalsLoading, setGoalsLoading] = useState(false);

  // Load overview immediately
  useEffect(() => {
    loadOverview();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseId]);

  // Load other tabs when they become active
  useEffect(() => {
    if (activeTab === "progress" && !progressData && !progressLoading) {
      loadProgress();
    } else if (activeTab === "performance" && !performanceData && !performanceLoading) {
      loadPerformance();
    } else if (activeTab === "habits" && !studyHabitsData && !habitsLoading) {
      loadHabits();
    } else if (activeTab === "goals" && !goalsData && !goalsLoading) {
      loadGoals();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, courseId]);

  const loadOverview = async () => {
    setLoading(true);
    try {
      const result = await getStudentOverviewAction(courseId);
      if (result.success) {
        setOverviewData(result.data);
      } else {
        console.error("Overview error:", result.error);
      }
    } catch (error) {
      console.error("Error loading overview:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadProgress = async () => {
    setProgressLoading(true);
    try {
      const result = await getStudentProgressAction(courseId);
      if (result.success) {
        setProgressData(result.data);
      } else {
        console.error("Progress error:", result.error);
      }
    } catch (error) {
      console.error("Error loading progress:", error);
    } finally {
      setProgressLoading(false);
    }
  };

  const loadPerformance = async () => {
    setPerformanceLoading(true);
    try {
      const result = await getStudentPerformanceAction(courseId);
      if (result.success) {
        setPerformanceData(result.data);
      } else {
        console.error("Performance error:", result.error);
      }
    } catch (error) {
      console.error("Error loading performance:", error);
    } finally {
      setPerformanceLoading(false);
    }
  };

  const loadHabits = async () => {
    setHabitsLoading(true);
    try {
      const result = await getStudentStudyHabitsAction(courseId);
      if (result.success) {
        setStudyHabitsData(result.data);
      } else {
        console.error("Habits error:", result.error);
      }
    } catch (error) {
      console.error("Error loading habits:", error);
    } finally {
      setHabitsLoading(false);
    }
  };

  const loadGoals = async () => {
    setGoalsLoading(true);
    try {
      const result = await getStudentGoalsAction(courseId);
      if (result.success) {
        setGoalsData(result.data);
      } else {
        console.error("Goals error:", result.error);
      }
    } catch (error) {
      console.error("Error loading goals:", error);
    } finally {
      setGoalsLoading(false);
    }
  };

  if (loading && !overviewData) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid gap-4 md:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
          <TabsList className="inline-flex w-full sm:grid sm:grid-cols-5 h-auto min-w-max sm:min-w-0">
            <TabsTrigger value="overview" className="flex items-center justify-center gap-1 sm:gap-2 py-2.5 sm:py-1.5 text-xs sm:text-sm px-2 sm:px-3 whitespace-nowrap">
              <BookOpen className="h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0" />
              <span className="truncate">Vue d'ensemble</span>
            </TabsTrigger>
            <TabsTrigger value="progress" className="flex items-center justify-center gap-1 sm:gap-2 py-2.5 sm:py-1.5 text-xs sm:text-sm px-2 sm:px-3 whitespace-nowrap">
              <TrendingUp className="h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0" />
              <span className="truncate">Progression</span>
            </TabsTrigger>
            <TabsTrigger value="performance" className="flex items-center justify-center gap-1 sm:gap-2 py-2.5 sm:py-1.5 text-xs sm:text-sm px-2 sm:px-3 whitespace-nowrap">
              <Target className="h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0" />
              <span className="truncate">Performance</span>
            </TabsTrigger>
            <TabsTrigger value="habits" className="flex items-center justify-center gap-1 sm:gap-2 py-2.5 sm:py-1.5 text-xs sm:text-sm px-2 sm:px-3 whitespace-nowrap">
              <Calendar className="h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0" />
              <span className="truncate">Habitudes</span>
            </TabsTrigger>
            <TabsTrigger value="goals" className="flex items-center justify-center gap-1 sm:gap-2 py-2.5 sm:py-1.5 text-xs sm:text-sm px-2 sm:px-3 whitespace-nowrap">
              <Award className="h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0" />
              <span className="truncate">Objectifs</span>
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="overview" className="mt-6">
          {overviewData ? (
            <OverviewSection data={overviewData} />
          ) : (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          )}
        </TabsContent>

        <TabsContent value="progress" className="mt-6">
          {progressLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : progressData ? (
            <ProgressSection data={progressData} />
          ) : (
            <div className="flex items-center justify-center py-12">
              <p className="text-muted-foreground">Chargement...</p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="performance" className="mt-6">
          {performanceLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : performanceData ? (
            <PerformanceSection data={performanceData} />
          ) : (
            <div className="flex items-center justify-center py-12">
              <p className="text-muted-foreground">Chargement...</p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="habits" className="mt-6">
          {habitsLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : studyHabitsData ? (
            <StudyHabitsSection data={studyHabitsData} />
          ) : (
            <div className="flex items-center justify-center py-12">
              <p className="text-muted-foreground">Chargement...</p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="goals" className="mt-6">
          {goalsLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : goalsData ? (
            <GoalsSection data={goalsData} />
          ) : (
            <div className="flex items-center justify-center py-12">
              <p className="text-muted-foreground">Chargement...</p>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}


```


Refining the approach for better mobile scrolling:


```typescriptreact
"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Loader2, Clock, Target, TrendingUp, BookOpen, Calendar, Award } from "lucide-react";
import {
  getStudentOverviewAction,
  getStudentProgressAction,
  getStudentPerformanceAction,
  getStudentStudyHabitsAction,
  getStudentGoalsAction,
} from "@/app/actions/student-analytics";
import { OverviewSection } from "./analytics/overview-section";
import { ProgressSection } from "./analytics/progress-section";
import { PerformanceSection } from "./analytics/performance-section";
import { StudyHabitsSection } from "./analytics/study-habits-section";
import { GoalsSection } from "./analytics/goals-section";

interface StudentAnalyticsDashboardProps {
  courseId: string;
}

export function StudentAnalyticsDashboard({ courseId }: StudentAnalyticsDashboardProps) {
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");
  const [overviewData, setOverviewData] = useState<any>(null);
  const [progressData, setProgressData] = useState<any>(null);
  const [progressLoading, setProgressLoading] = useState(false);
  const [performanceData, setPerformanceData] = useState<any>(null);
  const [performanceLoading, setPerformanceLoading] = useState(false);
  const [studyHabitsData, setStudyHabitsData] = useState<any>(null);
  const [habitsLoading, setHabitsLoading] = useState(false);
  const [goalsData, setGoalsData] = useState<any>(null);
  const [goalsLoading, setGoalsLoading] = useState(false);

  // Load overview immediately
  useEffect(() => {
    loadOverview();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseId]);

  // Load other tabs when they become active
  useEffect(() => {
    if (activeTab === "progress" && !progressData && !progressLoading) {
      loadProgress();
    } else if (activeTab === "performance" && !performanceData && !performanceLoading) {
      loadPerformance();
    } else if (activeTab === "habits" && !studyHabitsData && !habitsLoading) {
      loadHabits();
    } else if (activeTab === "goals" && !goalsData && !goalsLoading) {
      loadGoals();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, courseId]);

  const loadOverview = async () => {
    setLoading(true);
    try {
      const result = await getStudentOverviewAction(courseId);
      if (result.success) {
        setOverviewData(result.data);
      } else {
        console.error("Overview error:", result.error);
      }
    } catch (error) {
      console.error("Error loading overview:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadProgress = async () => {
    setProgressLoading(true);
    try {
      const result = await getStudentProgressAction(courseId);
      if (result.success) {
        setProgressData(result.data);
      } else {
        console.error("Progress error:", result.error);
      }
    } catch (error) {
      console.error("Error loading progress:", error);
    } finally {
      setProgressLoading(false);
    }
  };

  const loadPerformance = async () => {
    setPerformanceLoading(true);
    try {
      const result = await getStudentPerformanceAction(courseId);
      if (result.success) {
        setPerformanceData(result.data);
      } else {
        console.error("Performance error:", result.error);
      }
    } catch (error) {
      console.error("Error loading performance:", error);
    } finally {
      setPerformanceLoading(false);
    }
  };

  const loadHabits = async () => {
    setHabitsLoading(true);
    try {
      const result = await getStudentStudyHabitsAction(courseId);
      if (result.success) {
        setStudyHabitsData(result.data);
      } else {
        console.error("Habits error:", result.error);
      }
    } catch (error) {
      console.error("Error loading habits:", error);
    } finally {
      setHabitsLoading(false);
    }
  };

  const loadGoals = async () => {
    setGoalsLoading(true);
    try {
      const result = await getStudentGoalsAction(courseId);
      if (result.success) {
        setGoalsData(result.data);
      } else {
        console.error("Goals error:", result.error);
      }
    } catch (error) {
      console.error("Error loading goals:", error);
    } finally {
      setGoalsLoading(false);
    }
  };

  if (loading && !overviewData) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid gap-4 md:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0 scrollbar-hide">
          <TabsList className="inline-flex w-auto sm:grid sm:w-full sm:grid-cols-5 h-auto gap-1 sm:gap-0">
            <TabsTrigger value="overview" className="flex items-center justify-center gap-1 sm:gap-2 py-2.5 sm:py-1.5 text-xs sm:text-sm px-3 sm:px-3 whitespace-nowrap flex-shrink-0">
              <BookOpen className="h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0" />
              <span>Vue d'ensemble</span>
            </TabsTrigger>
            <TabsTrigger value="progress" className="flex items-center justify-center gap-1 sm:gap-2 py-2.5 sm:py-1.5 text-xs sm:text-sm px-3 sm:px-3 whitespace-nowrap flex-shrink-0">
              <TrendingUp className="h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0" />
              <span>Progression</span>
            </TabsTrigger>
            <TabsTrigger value="performance" className="flex items-center justify-center gap-1 sm:gap-2 py-2.5 sm:py-1.5 text-xs sm:text-sm px-3 sm:px-3 whitespace-nowrap flex-shrink-0">
              <Target className="h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0" />
              <span>Performance</span>
            </TabsTrigger>
            <TabsTrigger value="habits" className="flex items-center justify-center gap-1 sm:gap-2 py-2.5 sm:py-1.5 text-xs sm:text-sm px-3 sm:px-3 whitespace-nowrap flex-shrink-0">
              <Calendar className="h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0" />
              <span>Habitudes</span>
            </TabsTrigger>
            <TabsTrigger value="goals" className="flex items-center justify-center gap-1 sm:gap-2 py-2.5 sm:py-1.5 text-xs sm:text-sm px-3 sm:px-3 whitespace-nowrap flex-shrink-0">
              <Award className="h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0" />
              <span>Objectifs</span>
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="overview" className="mt-6">
          {overviewData ? (
            <OverviewSection data={overviewData} />
          ) : (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          )}
        </TabsContent>

        <TabsContent value="progress" className="mt-6">
          {progressLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : progressData ? (
            <ProgressSection data={progressData} />
          ) : (
            <div className="flex items-center justify-center py-12">
              <p className="text-muted-foreground">Chargement...</p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="performance" className="mt-6">
          {performanceLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : performanceData ? (
            <PerformanceSection data={performanceData} />
          ) : (
            <div className="flex items-center justify-center py-12">
              <p className="text-muted-foreground">Chargement...</p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="habits" className="mt-6">
          {habitsLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : studyHabitsData ? (
            <StudyHabitsSection data={studyHabitsData} />
          ) : (
            <div className="flex items-center justify-center py-12">
              <p className="text-muted-foreground">Chargement...</p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="goals" className="mt-6">
          {goalsLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : goalsData ? (
            <GoalsSection data={goalsData} />
          ) : (
            <div className="flex items-center justify-center py-12">
              <p className="text-muted-foreground">Chargement...</p>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}


```


Removing the non-standard class and using a standard approach:


```typescriptreact
"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Loader2, Clock, Target, TrendingUp, BookOpen, Calendar, Award } from "lucide-react";
import {
  getStudentOverviewAction,
  getStudentProgressAction,
  getStudentPerformanceAction,
  getStudentStudyHabitsAction,
  getStudentGoalsAction,
} from "@/app/actions/student-analytics";
import { OverviewSection } from "./analytics/overview-section";
import { ProgressSection } from "./analytics/progress-section";
import { PerformanceSection } from "./analytics/performance-section";
import { StudyHabitsSection } from "./analytics/study-habits-section";
import { GoalsSection } from "./analytics/goals-section";

interface StudentAnalyticsDashboardProps {
  courseId: string;
}

export function StudentAnalyticsDashboard({ courseId }: StudentAnalyticsDashboardProps) {
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");
  const [overviewData, setOverviewData] = useState<any>(null);
  const [progressData, setProgressData] = useState<any>(null);
  const [progressLoading, setProgressLoading] = useState(false);
  const [performanceData, setPerformanceData] = useState<any>(null);
  const [performanceLoading, setPerformanceLoading] = useState(false);
  const [studyHabitsData, setStudyHabitsData] = useState<any>(null);
  const [habitsLoading, setHabitsLoading] = useState(false);
  const [goalsData, setGoalsData] = useState<any>(null);
  const [goalsLoading, setGoalsLoading] = useState(false);

  // Load overview immediately
  useEffect(() => {
    loadOverview();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseId]);

  // Load other tabs when they become active
  useEffect(() => {
    if (activeTab === "progress" && !progressData && !progressLoading) {
      loadProgress();
    } else if (activeTab === "performance" && !performanceData && !performanceLoading) {
      loadPerformance();
    } else if (activeTab === "habits" && !studyHabitsData && !habitsLoading) {
      loadHabits();
    } else if (activeTab === "goals" && !goalsData && !goalsLoading) {
      loadGoals();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, courseId]);

  const loadOverview = async () => {
    setLoading(true);
    try {
      const result = await getStudentOverviewAction(courseId);
      if (result.success) {
        setOverviewData(result.data);
      } else {
        console.error("Overview error:", result.error);
      }
    } catch (error) {
      console.error("Error loading overview:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadProgress = async () => {
    setProgressLoading(true);
    try {
      const result = await getStudentProgressAction(courseId);
      if (result.success) {
        setProgressData(result.data);
      } else {
        console.error("Progress error:", result.error);
      }
    } catch (error) {
      console.error("Error loading progress:", error);
    } finally {
      setProgressLoading(false);
    }
  };

  const loadPerformance = async () => {
    setPerformanceLoading(true);
    try {
      const result = await getStudentPerformanceAction(courseId);
      if (result.success) {
        setPerformanceData(result.data);
      } else {
        console.error("Performance error:", result.error);
      }
    } catch (error) {
      console.error("Error loading performance:", error);
    } finally {
      setPerformanceLoading(false);
    }
  };

  const loadHabits = async () => {
    setHabitsLoading(true);
    try {
      const result = await getStudentStudyHabitsAction(courseId);
      if (result.success) {
        setStudyHabitsData(result.data);
      } else {
        console.error("Habits error:", result.error);
      }
    } catch (error) {
      console.error("Error loading habits:", error);
    } finally {
      setHabitsLoading(false);
    }
  };

  const loadGoals = async () => {
    setGoalsLoading(true);
    try {
      const result = await getStudentGoalsAction(courseId);
      if (result.success) {
        setGoalsData(result.data);
      } else {
        console.error("Goals error:", result.error);
      }
    } catch (error) {
      console.error("Error loading goals:", error);
    } finally {
      setGoalsLoading(false);
    }
  };

  if (loading && !overviewData) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid gap-4 md:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          <TabsList className="inline-flex w-auto sm:grid sm:w-full sm:grid-cols-5 h-auto gap-1 sm:gap-0">
            <TabsTrigger value="overview" className="flex items-center justify-center gap-1 sm:gap-2 py-2.5 sm:py-1.5 text-xs sm:text-sm px-3 sm:px-3 whitespace-nowrap flex-shrink-0">
              <BookOpen className="h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0" />
              <span>Vue d'ensemble</span>
            </TabsTrigger>
            <TabsTrigger value="progress" className="flex items-center justify-center gap-1 sm:gap-2 py-2.5 sm:py-1.5 text-xs sm:text-sm px-3 sm:px-3 whitespace-nowrap flex-shrink-0">
              <TrendingUp className="h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0" />
              <span>Progression</span>
            </TabsTrigger>
            <TabsTrigger value="performance" className="flex items-center justify-center gap-1 sm:gap-2 py-2.5 sm:py-1.5 text-xs sm:text-sm px-3 sm:px-3 whitespace-nowrap flex-shrink-0">
              <Target className="h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0" />
              <span>Performance</span>
            </TabsTrigger>
            <TabsTrigger value="habits" className="flex items-center justify-center gap-1 sm:gap-2 py-2.5 sm:py-1.5 text-xs sm:text-sm px-3 sm:px-3 whitespace-nowrap flex-shrink-0">
              <Calendar className="h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0" />
              <span>Habitudes</span>
            </TabsTrigger>
            <TabsTrigger value="goals" className="flex items-center justify-center gap-1 sm:gap-2 py-2.5 sm:py-1.5 text-xs sm:text-sm px-3 sm:px-3 whitespace-nowrap flex-shrink-0">
              <Award className="h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0" />
              <span>Objectifs</span>
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="overview" className="mt-6">
          {overviewData ? (
            <OverviewSection data={overviewData} />
          ) : (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          )}
        </TabsContent>

        <TabsContent value="progress" className="mt-6">
          {progressLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : progressData ? (
            <ProgressSection data={progressData} />
          ) : (
            <div className="flex items-center justify-center py-12">
              <p className="text-muted-foreground">Chargement...</p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="performance" className="mt-6">
          {performanceLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : performanceData ? (
            <PerformanceSection data={performanceData} />
          ) : (
            <div className="flex items-center justify-center py-12">
              <p className="text-muted-foreground">Chargement...</p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="habits" className="mt-6">
          {habitsLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : studyHabitsData ? (
            <StudyHabitsSection data={studyHabitsData} />
          ) : (
            <div className="flex items-center justify-center py-12">
              <p className="text-muted-foreground">Chargement...</p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="goals" className="mt-6">
          {goalsLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : goalsData ? (
            <GoalsSection data={goalsData} />
          ) : (
            <div className="flex items-center justify-center py-12">
              <p className="text-muted-foreground">Chargement...</p>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}


```


Simplifying to use standard Tailwind classes:


```typescriptreact
"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Loader2, Clock, Target, TrendingUp, BookOpen, Calendar, Award } from "lucide-react";
import {
  getStudentOverviewAction,
  getStudentProgressAction,
  getStudentPerformanceAction,
  getStudentStudyHabitsAction,
  getStudentGoalsAction,
} from "@/app/actions/student-analytics";
import { OverviewSection } from "./analytics/overview-section";
import { ProgressSection } from "./analytics/progress-section";
import { PerformanceSection } from "./analytics/performance-section";
import { StudyHabitsSection } from "./analytics/study-habits-section";
import { GoalsSection } from "./analytics/goals-section";

interface StudentAnalyticsDashboardProps {
  courseId: string;
}

export function StudentAnalyticsDashboard({ courseId }: StudentAnalyticsDashboardProps) {
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");
  const [overviewData, setOverviewData] = useState<any>(null);
  const [progressData, setProgressData] = useState<any>(null);
  const [progressLoading, setProgressLoading] = useState(false);
  const [performanceData, setPerformanceData] = useState<any>(null);
  const [performanceLoading, setPerformanceLoading] = useState(false);
  const [studyHabitsData, setStudyHabitsData] = useState<any>(null);
  const [habitsLoading, setHabitsLoading] = useState(false);
  const [goalsData, setGoalsData] = useState<any>(null);
  const [goalsLoading, setGoalsLoading] = useState(false);

  // Load overview immediately
  useEffect(() => {
    loadOverview();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseId]);

  // Load other tabs when they become active
  useEffect(() => {
    if (activeTab === "progress" && !progressData && !progressLoading) {
      loadProgress();
    } else if (activeTab === "performance" && !performanceData && !performanceLoading) {
      loadPerformance();
    } else if (activeTab === "habits" && !studyHabitsData && !habitsLoading) {
      loadHabits();
    } else if (activeTab === "goals" && !goalsData && !goalsLoading) {
      loadGoals();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, courseId]);

  const loadOverview = async () => {
    setLoading(true);
    try {
      const result = await getStudentOverviewAction(courseId);
      if (result.success) {
        setOverviewData(result.data);
      } else {
        console.error("Overview error:", result.error);
      }
    } catch (error) {
      console.error("Error loading overview:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadProgress = async () => {
    setProgressLoading(true);
    try {
      const result = await getStudentProgressAction(courseId);
      if (result.success) {
        setProgressData(result.data);
      } else {
        console.error("Progress error:", result.error);
      }
    } catch (error) {
      console.error("Error loading progress:", error);
    } finally {
      setProgressLoading(false);
    }
  };

  const loadPerformance = async () => {
    setPerformanceLoading(true);
    try {
      const result = await getStudentPerformanceAction(courseId);
      if (result.success) {
        setPerformanceData(result.data);
      } else {
        console.error("Performance error:", result.error);
      }
    } catch (error) {
      console.error("Error loading performance:", error);
    } finally {
      setPerformanceLoading(false);
    }
  };

  const loadHabits = async () => {
    setHabitsLoading(true);
    try {
      const result = await getStudentStudyHabitsAction(courseId);
      if (result.success) {
        setStudyHabitsData(result.data);
      } else {
        console.error("Habits error:", result.error);
      }
    } catch (error) {
      console.error("Error loading habits:", error);
    } finally {
      setHabitsLoading(false);
    }
  };

  const loadGoals = async () => {
    setGoalsLoading(true);
    try {
      const result = await getStudentGoalsAction(courseId);
      if (result.success) {
        setGoalsData(result.data);
      } else {
        console.error("Goals error:", result.error);
      }
    } catch (error) {
      console.error("Error loading goals:", error);
    } finally {
      setGoalsLoading(false);
    }
  };

  if (loading && !overviewData) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid gap-4 md:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
          <TabsList className="inline-flex w-auto sm:grid sm:w-full sm:grid-cols-5 h-auto gap-1 sm:gap-0">
            <TabsTrigger value="overview" className="flex items-center justify-center gap-1 sm:gap-2 py-2.5 sm:py-1.5 text-xs sm:text-sm px-3 sm:px-3 whitespace-nowrap flex-shrink-0">
              <BookOpen className="h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0" />
              <span>Vue d'ensemble</span>
            </TabsTrigger>
            <TabsTrigger value="progress" className="flex items-center justify-center gap-1 sm:gap-2 py-2.5 sm:py-1.5 text-xs sm:text-sm px-3 sm:px-3 whitespace-nowrap flex-shrink-0">
              <TrendingUp className="h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0" />
              <span>Progression</span>
            </TabsTrigger>
            <TabsTrigger value="performance" className="flex items-center justify-center gap-1 sm:gap-2 py-2.5 sm:py-1.5 text-xs sm:text-sm px-3 sm:px-3 whitespace-nowrap flex-shrink-0">
              <Target className="h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0" />
              <span>Performance</span>
            </TabsTrigger>
            <TabsTrigger value="habits" className="flex items-center justify-center gap-1 sm:gap-2 py-2.5 sm:py-1.5 text-xs sm:text-sm px-3 sm:px-3 whitespace-nowrap flex-shrink-0">
              <Calendar className="h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0" />
              <span>Habitudes</span>
            </TabsTrigger>
            <TabsTrigger value="goals" className="flex items-center justify-center gap-1 sm:gap-2 py-2.5 sm:py-1.5 text-xs sm:text-sm px-3 sm:px-3 whitespace-nowrap flex-shrink-0">
              <Award className="h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0" />
              <span>Objectifs</span>
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="overview" className="mt-6">
          {overviewData ? (
            <OverviewSection data={overviewData} />
          ) : (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          )}
        </TabsContent>

        <TabsContent value="progress" className="mt-6">
          {progressLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : progressData ? (
            <ProgressSection data={progressData} />
          ) : (
            <div className="flex items-center justify-center py-12">
              <p className="text-muted-foreground">Chargement...</p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="performance" className="mt-6">
          {performanceLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : performanceData ? (
            <PerformanceSection data={performanceData} />
          ) : (
            <div className="flex items-center justify-center py-12">
              <p className="text-muted-foreground">Chargement...</p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="habits" className="mt-6">
          {habitsLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : studyHabitsData ? (
            <StudyHabitsSection data={studyHabitsData} />
          ) : (
            <div className="flex items-center justify-center py-12">
              <p className="text-muted-foreground">Chargement...</p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="goals" className="mt-6">
          {goalsLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : goalsData ? (
            <GoalsSection data={goalsData} />
          ) : (
            <div className="flex items-center justify-center py-12">
              <p className="text-muted-foreground">Chargement...</p>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}


```


Fixed the tabs for the Progress and Statistics section on mobile. Changes:

1. **Horizontally scrollable on mobile**: Changed from `grid-cols-5` to `inline-flex` on mobile, allowing horizontal scrolling to see all tabs.

2. **Responsive layout**: On mobile, tabs use `inline-flex` with horizontal scrolling. On larger screens (`sm` and up), they use the `grid-cols-5` layout.

3. **Smaller text and icons on mobile**: 
   - Text: `text-xs` on mobile, `text-sm` on larger screens
   - Icons: `h-3.5 w-3.5` on mobile, `h-4 w-4` on larger screens

4. **Better spacing**: Added `gap-1` on mobile and proper padding for touch targets.

5. **Prevented text wrapping**: Added `whitespace-nowrap` and `flex-shrink-0` to keep tabs readable.

On mobile, users can scroll horizontally to see all tabs (Vue d'ensemble, Progression, Performance, Habitudes, Objectifs) without text being cut off. On desktop, the tabs remain in a grid layout.

---

**User**

i get an error when trying to send a question@Cursor 

---

**Cursor**


The error is that `contentItem` isn't a valid relation on the `Message` model. Searching for where messages are created to fix the include:



Reading the messages action file:



Checking the Prisma schema for the correct relation name:



The `Message` model has `contentItemId` but no `contentItem` relation. Checking if `ContentItem` exists and how to fix this:



The `Message` model has `contentItemId` but no `contentItem` relation. Removing the invalid include and fetching the content item separately if needed:


```typescript
"use server";

import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth/require-auth";
import { z } from "zod";
import { logServerError } from "@/lib/utils/error-logging";
import type { PaginatedResult } from "@/lib/utils/pagination";
import { sendMessageWebhook } from "@/lib/webhooks/make";

const messageSchema = z.object({
  threadId: z.string().optional(),
  contentItemId: z.string().optional().nullable(),
  content: z.string().min(1, "Le message est requis"),
  attachments: z.array(z.string()).optional(), // Array of file URLs
});

export type MessageActionResult = {
  success: boolean;
  error?: string;
  data?: any;
};

/**
 * Create a message thread and send initial message (student only)
 */
export async function sendMessageAction(
  data: z.infer<typeof messageSchema>
): Promise<MessageActionResult> {
  try {
    const user = await requireAuth();

    if (user.role !== "STUDENT") {
      return {
        success: false,
        error: "Seuls les étudiants peuvent envoyer des messages",
      };
    }

    const validatedData = messageSchema.parse(data);

    // Create thread if not provided
    let threadId = validatedData.threadId;
    if (!threadId && validatedData.contentItemId) {
      // Check if there's an existing thread for this content item
      const existingMessage = await prisma.message.findFirst({
        where: {
          userId: user.id,
          contentItemId: validatedData.contentItemId,
        },
        select: {
          threadId: true,
        },
      });
      
      if (existingMessage) {
        threadId = existingMessage.threadId;
      } else {
        const thread = await prisma.messageThread.create({
          data: {
            userId: user.id,
            subject: `Question sur le contenu`,
            status: "OPEN",
          },
        });
        threadId = thread.id;
      }
    } else if (!threadId) {
      const thread = await prisma.messageThread.create({
        data: {
          userId: user.id,
          subject: `Question sur le contenu`,
          status: "OPEN",
        },
      });
      threadId = thread.id;
    }

    // Create message
    const message = await prisma.message.create({
      data: {
        threadId,
        userId: user.id,
        contentItemId: validatedData.contentItemId,
        content: validatedData.content,
        isFromStudent: true,
        attachments: validatedData.attachments || [],
      },
      include: {
        thread: true,
      },
    });

    // Update thread timestamp
    await prisma.messageThread.update({
      where: { id: threadId },
      data: { updatedAt: new Date() },
    });

    // Fetch content item separately if contentItemId is provided
    let courseId: string | null = null;
    let courseTitle: string | null = null;
    let contentItemTitle: string | null = null;

    if (validatedData.contentItemId) {
      const contentItem = await prisma.contentItem.findUnique({
        where: { id: validatedData.contentItemId },
        select: {
          id: true,
          title: true,
          module: {
            select: {
              id: true,
              course: {
                select: {
                  id: true,
                  title: true,
                },
              },
            },
          },
        },
      });

      if (contentItem) {
        courseId = contentItem.module?.course?.id || null;
        courseTitle = contentItem.module?.course?.title || null;
        contentItemTitle = contentItem.title || null;
      }
    }

    // Find an instructor for this course (if any)
    // For now, we'll use a placeholder - make.com can handle routing
    const instructor = await prisma.user.findFirst({
      where: {
        role: "INSTRUCTOR",
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
      },
    });

    if (instructor) {
      sendMessageWebhook({
        messageId: message.id,
        threadId: message.threadId,
        studentId: user.id,
        studentEmail: user.email,
        studentName: `${user.firstName} ${user.lastName}`,
        instructorId: instructor.id,
        instructorEmail: instructor.email,
        instructorName: `${instructor.firstName} ${instructor.lastName}`,
        content: message.content,
        contentItemId: message.contentItemId || null,
        contentItemTitle: contentItemTitle || null,
        courseId: courseId || null,
        courseTitle: courseTitle || null,
        timestamp: new Date().toISOString(),
      }).catch((error) => {
        console.error("Failed to send message webhook:", error);
      });
    }

    return { success: true, data: { message, thread: message.thread } };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: error.errors[0]?.message || "Données invalides",
      };
    }

    await logServerError({
      errorMessage: `Failed to send message: ${error instanceof Error ? error.message : "Unknown error"}`,
      stackTrace: error instanceof Error ? error.stack : undefined,
      severity: "MEDIUM",
    });

    return {
      success: false,
      error: "Erreur lors de l'envoi du message",
    };
  }
}

/**
 * Get message threads for current user
 */
export async function getMessageThreadsAction(params: {
  cursor?: string;
  limit?: number;
  status?: "OPEN" | "CLOSED";
}): Promise<PaginatedResult<any>> {
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

    const threads = await prisma.messageThread.findMany({
      where,
      take: limit + 1,
      cursor,
      orderBy: { updatedAt: "desc" },
      include: {
        messages: {
          orderBy: { createdAt: "desc" },
          take: 1, // Get latest message
        },
        _count: {
          select: {
            messages: true,
          },
        },
      },
    });

    const hasMore = threads.length > limit;
    const items = hasMore ? threads.slice(0, limit) : threads;
    const nextCursor = hasMore ? items[items.length - 1].id : null;

    return {
      items,
      nextCursor,
      hasMore,
    };
  } catch (error) {
    await logServerError({
      errorMessage: `Failed to get message threads: ${error instanceof Error ? error.message : "Unknown error"}`,
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
 * Get thread messages
 */
export async function getThreadMessagesAction(threadId: string) {
  try {
    const user = await requireAuth();

    const thread = await prisma.messageThread.findUnique({
      where: { id: threadId },
    });

    if (!thread || thread.userId !== user.id) {
      return null;
    }

    const messages = await prisma.message.findMany({
      where: { threadId },
      orderBy: { createdAt: "asc" },
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

    return {
      thread,
      messages,
    };
  } catch (error) {
    await logServerError({
      errorMessage: `Failed to get thread messages: ${error instanceof Error ? error.message : "Unknown error"}`,
      stackTrace: error instanceof Error ? error.stack : undefined,
      severity: "MEDIUM",
    });

    return null;
  }
}

/**
 * Reply to a message thread (admin only)
 */
export async function replyToMessageThreadAction(
  threadId: string,
  content: string
): Promise<MessageActionResult> {
  try {
    const user = await requireAuth();

    if (user.role !== "ADMIN") {
      return {
        success: false,
        error: "Seuls les administrateurs peuvent répondre",
      };
    }

    // Verify thread exists
    const thread = await prisma.messageThread.findUnique({
      where: { id: threadId },
    });

    if (!thread) {
      return {
        success: false,
        error: "Fil de discussion introuvable",
      };
    }

    // Create reply message
    const message = await prisma.message.create({
      data: {
        threadId,
        userId: user.id,
        content,
        isFromStudent: false,
      },
    });

    // Update thread status and timestamp
    await prisma.messageThread.update({
      where: { id: threadId },
      data: {
        updatedAt: new Date(),
        status: "OPEN", // Keep open for further discussion
      },
    });

    return { success: true, data: message };
  } catch (error) {
    await logServerError({
      errorMessage: `Failed to reply to message thread: ${error instanceof Error ? error.message : "Unknown error"}`,
      stackTrace: error instanceof Error ? error.stack : undefined,
      severity: "MEDIUM",
    });

    return {
      success: false,
      error: "Erreur lors de l'envoi de la réponse",
    };
  }
}

/**
 * Get all message threads (admin only)
 */
export async function getAllMessageThreadsAction(params: {
  cursor?: string;
  limit?: number;
  status?: "OPEN" | "CLOSED";
  search?: string;
}): Promise<PaginatedResult<any>> {
  try {
    const user = await requireAuth();

    if (user.role !== "ADMIN") {
      return {
        items: [],
        nextCursor: null,
        hasMore: false,
      };
    }

    const limit = params.limit || 20;
    const cursor = params.cursor ? { id: params.cursor } : undefined;

    const where: any = {};

    if (params.status) {
      where.status = params.status;
    }

    if (params.search) {
      where.OR = [
        { subject: { contains: params.search, mode: "insensitive" } },
        { user: { email: { contains: params.search, mode: "insensitive" } } },
      ];
    }

    const threads = await prisma.messageThread.findMany({
      where,
      take: limit + 1,
      cursor,
      orderBy: { updatedAt: "desc" },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
        messages: {
          orderBy: { createdAt: "desc" },
          take: 1, // Get latest message
        },
        _count: {
          select: {
            messages: true,
          },
        },
      },
    });

    const hasMore = threads.length > limit;
    const items = hasMore ? threads.slice(0, limit) : threads;
    const nextCursor = hasMore ? items[items.length - 1].id : null;

    return {
      items,
      nextCursor,
      hasMore,
    };
  } catch (error) {
    await logServerError({
      errorMessage: `Failed to get all message threads: ${error instanceof Error ? error.message : "Unknown error"}`,
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
 * Get thread messages (admin can view any thread)
 */
export async function getThreadMessagesAdminAction(threadId: string) {
  try {
    const user = await requireAuth();

    if (user.role !== "ADMIN") {
      return null;
    }

    const thread = await prisma.messageThread.findUnique({
      where: { id: threadId },
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

    if (!thread) {
      return null;
    }

    const messages = await prisma.message.findMany({
      where: { threadId },
      orderBy: { createdAt: "asc" },
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

    return {
      thread,
      messages,
    };
  } catch (error) {
    await logServerError({
      errorMessage: `Failed to get thread messages: ${error instanceof Error ? error.message : "Unknown error"}`,
      stackTrace: error instanceof Error ? error.stack : undefined,
      severity: "MEDIUM",
    });

    return null;
  }
}

/**
 * Update thread status (admin only)
 */
export async function updateThreadStatusAction(
  threadId: string,
  status: "OPEN" | "CLOSED"
): Promise<MessageActionResult> {
  try {
    const user = await requireAuth();

    if (user.role !== "ADMIN") {
      return {
        success: false,
        error: "Accès non autorisé",
      };
    }

    const thread = await prisma.messageThread.update({
      where: { id: threadId },
      data: { status },
    });

    return { success: true, data: thread };
  } catch (error) {
    await logServerError({
      errorMessage: `Failed to update thread status: ${error instanceof Error ? error.message : "Unknown error"}`,
      stackTrace: error instanceof Error ? error.stack : undefined,
      severity: "MEDIUM",
    });

    return {
      success: false,
      error: "Erreur lors de la mise à jour du statut",
    };
  }
}


```


Checking if ContentItem has a `title` field:



ContentItem doesn't have a `title` field. Updating the code to handle this:


```typescript
"use server";

import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth/require-auth";
import { z } from "zod";
import { logServerError } from "@/lib/utils/error-logging";
import type { PaginatedResult } from "@/lib/utils/pagination";
import { sendMessageWebhook } from "@/lib/webhooks/make";

const messageSchema = z.object({
  threadId: z.string().optional(),
  contentItemId: z.string().optional().nullable(),
  content: z.string().min(1, "Le message est requis"),
  attachments: z.array(z.string()).optional(), // Array of file URLs
});

export type MessageActionResult = {
  success: boolean;
  error?: string;
  data?: any;
};

/**
 * Create a message thread and send initial message (student only)
 */
export async function sendMessageAction(
  data: z.infer<typeof messageSchema>
): Promise<MessageActionResult> {
  try {
    const user = await requireAuth();

    if (user.role !== "STUDENT") {
      return {
        success: false,
        error: "Seuls les étudiants peuvent envoyer des messages",
      };
    }

    const validatedData = messageSchema.parse(data);

    // Create thread if not provided
    let threadId = validatedData.threadId;
    if (!threadId && validatedData.contentItemId) {
      // Check if there's an existing thread for this content item
      const existingMessage = await prisma.message.findFirst({
        where: {
          userId: user.id,
          contentItemId: validatedData.contentItemId,
        },
        select: {
          threadId: true,
        },
      });
      
      if (existingMessage) {
        threadId = existingMessage.threadId;
      } else {
        const thread = await prisma.messageThread.create({
          data: {
            userId: user.id,
            subject: `Question sur le contenu`,
            status: "OPEN",
          },
        });
        threadId = thread.id;
      }
    } else if (!threadId) {
      const thread = await prisma.messageThread.create({
        data: {
          userId: user.id,
          subject: `Question sur le contenu`,
          status: "OPEN",
        },
      });
      threadId = thread.id;
    }

    // Create message
    const message = await prisma.message.create({
      data: {
        threadId,
        userId: user.id,
        contentItemId: validatedData.contentItemId,
        content: validatedData.content,
        isFromStudent: true,
        attachments: validatedData.attachments || [],
      },
      include: {
        thread: true,
      },
    });

    // Update thread timestamp
    await prisma.messageThread.update({
      where: { id: threadId },
      data: { updatedAt: new Date() },
    });

    // Fetch content item separately if contentItemId is provided
    let courseId: string | null = null;
    let courseTitle: string | null = null;
    let contentItemTitle: string | null = null;

    if (validatedData.contentItemId) {
      const contentItem = await prisma.contentItem.findUnique({
        where: { id: validatedData.contentItemId },
        select: {
          id: true,
          contentType: true,
          module: {
            select: {
              id: true,
              title: true,
              course: {
                select: {
                  id: true,
                  title: true,
                },
              },
            },
          },
          video: {
            select: { id: true },
          },
          quiz: {
            select: { id: true, title: true },
          },
          notes: {
            select: { id: true },
            take: 1,
          },
          learningActivity: {
            select: { id: true, title: true },
          },
        },
      });

      if (contentItem) {
        courseId = contentItem.module?.course?.id || null;
        courseTitle = contentItem.module?.course?.title || null;
        // Get title from the appropriate related model
        if (contentItem.quiz?.title) {
          contentItemTitle = contentItem.quiz.title;
        } else if (contentItem.learningActivity?.title) {
          contentItemTitle = contentItem.learningActivity.title;
        } else if (contentItem.module?.title) {
          contentItemTitle = contentItem.module.title;
        }
      }
    }

    // Find an instructor for this course (if any)
    // For now, we'll use a placeholder - make.com can handle routing
    const instructor = await prisma.user.findFirst({
      where: {
        role: "INSTRUCTOR",
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
      },
    });

    if (instructor) {
      sendMessageWebhook({
        messageId: message.id,
        threadId: message.threadId,
        studentId: user.id,
        studentEmail: user.email,
        studentName: `${user.firstName} ${user.lastName}`,
        instructorId: instructor.id,
        instructorEmail: instructor.email,
        instructorName: `${instructor.firstName} ${instructor.lastName}`,
        content: message.content,
        contentItemId: message.contentItemId || null,
        contentItemTitle: contentItemTitle || null,
        courseId: courseId || null,
        courseTitle: courseTitle || null,
        timestamp: new Date().toISOString(),
      }).catch((error) => {
        console.error("Failed to send message webhook:", error);
      });
    }

    return { success: true, data: { message, thread: message.thread } };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: error.errors[0]?.message || "Données invalides",
      };
    }

    await logServerError({
      errorMessage: `Failed to send message: ${error instanceof Error ? error.message : "Unknown error"}`,
      stackTrace: error instanceof Error ? error.stack : undefined,
      severity: "MEDIUM",
    });

    return {
      success: false,
      error: "Erreur lors de l'envoi du message",
    };
  }
}

/**
 * Get message threads for current user
 */
export async function getMessageThreadsAction(params: {
  cursor?: string;
  limit?: number;
  status?: "OPEN" | "CLOSED";
}): Promise<PaginatedResult<any>> {
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

    const threads = await prisma.messageThread.findMany({
      where,
      take: limit + 1,
      cursor,
      orderBy: { updatedAt: "desc" },
      include: {
        messages: {
          orderBy: { createdAt: "desc" },
          take: 1, // Get latest message
        },
        _count: {
          select: {
            messages: true,
          },
        },
      },
    });

    const hasMore = threads.length > limit;
    const items = hasMore ? threads.slice(0, limit) : threads;
    const nextCursor = hasMore ? items[items.length - 1].id : null;

    return {
      items,
      nextCursor,
      hasMore,
    };
  } catch (error) {
    await logServerError({
      errorMessage: `Failed to get message threads: ${error instanceof Error ? error.message : "Unknown error"}`,
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
 * Get thread messages
 */
export async function getThreadMessagesAction(threadId: string) {
  try {
    const user = await requireAuth();

    const thread = await prisma.messageThread.findUnique({
      where: { id: threadId },
    });

    if (!thread || thread.userId !== user.id) {
      return null;
    }

    const messages = await prisma.message.findMany({
      where: { threadId },
      orderBy: { createdAt: "asc" },
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

    return {
      thread,
      messages,
    };
  } catch (error) {
    await logServerError({
      errorMessage: `Failed to get thread messages: ${error instanceof Error ? error.message : "Unknown error"}`,
      stackTrace: error instanceof Error ? error.stack : undefined,
      severity: "MEDIUM",
    });

    return null;
  }
}

/**
 * Reply to a message thread (admin only)
 */
export async function replyToMessageThreadAction(
  threadId: string,
  content: string
): Promise<MessageActionResult> {
  try {
    const user = await requireAuth();

    if (user.role !== "ADMIN") {
      return {
        success: false,
        error: "Seuls les administrateurs peuvent répondre",
      };
    }

    // Verify thread exists
    const thread = await prisma.messageThread.findUnique({
      where: { id: threadId },
    });

    if (!thread) {
      return {
        success: false,
        error: "Fil de discussion introuvable",
      };
    }

    // Create reply message
    const message = await prisma.message.create({
      data: {
        threadId,
        userId: user.id,
        content,
        isFromStudent: false,
      },
    });

    // Update thread status and timestamp
    await prisma.messageThread.update({
      where: { id: threadId },
      data: {
        updatedAt: new Date(),
        status: "OPEN", // Keep open for further discussion
      },
    });

    return { success: true, data: message };
  } catch (error) {
    await logServerError({
      errorMessage: `Failed to reply to message thread: ${error instanceof Error ? error.message : "Unknown error"}`,
      stackTrace: error instanceof Error ? error.stack : undefined,
      severity: "MEDIUM",
    });

    return {
      success: false,
      error: "Erreur lors de l'envoi de la réponse",
    };
  }
}

/**
 * Get all message threads (admin only)
 */
export async function getAllMessageThreadsAction(params: {
  cursor?: string;
  limit?: number;
  status?: "OPEN" | "CLOSED";
  search?: string;
}): Promise<PaginatedResult<any>> {
  try {
    const user = await requireAuth();

    if (user.role !== "ADMIN") {
      return {
        items: [],
        nextCursor: null,
        hasMore: false,
      };
    }

    const limit = params.limit || 20;
    const cursor = params.cursor ? { id: params.cursor } : undefined;

    const where: any = {};

    if (params.status) {
      where.status = params.status;
    }

    if (params.search) {
      where.OR = [
        { subject: { contains: params.search, mode: "insensitive" } },
        { user: { email: { contains: params.search, mode: "insensitive" } } },
      ];
    }

    const threads = await prisma.messageThread.findMany({
      where,
      take: limit + 1,
      cursor,
      orderBy: { updatedAt: "desc" },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
        messages: {
          orderBy: { createdAt: "desc" },
          take: 1, // Get latest message
        },
        _count: {
          select: {
            messages: true,
          },
        },
      },
    });

    const hasMore = threads.length > limit;
    const items = hasMore ? threads.slice(0, limit) : threads;
    const nextCursor = hasMore ? items[items.length - 1].id : null;

    return {
      items,
      nextCursor,
      hasMore,
    };
  } catch (error) {
    await logServerError({
      errorMessage: `Failed to get all message threads: ${error instanceof Error ? error.message : "Unknown error"}`,
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
 * Get thread messages (admin can view any thread)
 */
export async function getThreadMessagesAdminAction(threadId: string) {
  try {
    const user = await requireAuth();

    if (user.role !== "ADMIN") {
      return null;
    }

    const thread = await prisma.messageThread.findUnique({
      where: { id: threadId },
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

    if (!thread) {
      return null;
    }

    const messages = await prisma.message.findMany({
      where: { threadId },
      orderBy: { createdAt: "asc" },
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

    return {
      thread,
      messages,
    };
  } catch (error) {
    await logServerError({
      errorMessage: `Failed to get thread messages: ${error instanceof Error ? error.message : "Unknown error"}`,
      stackTrace: error instanceof Error ? error.stack : undefined,
      severity: "MEDIUM",
    });

    return null;
  }
}

/**
 * Update thread status (admin only)
 */
export async function updateThreadStatusAction(
  threadId: string,
  status: "OPEN" | "CLOSED"
): Promise<MessageActionResult> {
  try {
    const user = await requireAuth();

    if (user.role !== "ADMIN") {
      return {
        success: false,
        error: "Accès non autorisé",
      };
    }

    const thread = await prisma.messageThread.update({
      where: { id: threadId },
      data: { status },
    });

    return { success: true, data: thread };
  } catch (error) {
    await logServerError({
      errorMessage: `Failed to update thread status: ${error instanceof Error ? error.message : "Unknown error"}`,
      stackTrace: error instanceof Error ? error.stack : undefined,
      severity: "MEDIUM",
    });

    return {
      success: false,
      error: "Erreur lors de la mise à jour du statut",
    };
  }
}


```


Fixed the error. The code was trying to include `contentItem` as a relation, but the Prisma schema doesn't define that relation on the `Message` model.

**What I fixed:**

1. **Removed the invalid include**: Removed `contentItem` from the `include` statement when creating the message, since it's not a valid relation.

2. **Added separate query**: Added a separate query to fetch the content item if `contentItemId` is provided, including the related data needed for the webhook.

3. **Fixed title access**: Since `ContentItem` doesn't have a `title` field directly, the code now gets the title from the appropriate related model (quiz, learningActivity, or falls back to the module title).

Sending a question should now work without the Prisma error. The message will be created, and if a `contentItemId` is provided, the related course and content information will be fetched separately for the webhook.

