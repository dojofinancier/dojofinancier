"use client";

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Loader2, Target, TrendingUp, BookOpen, Calendar, Award } from "lucide-react";
import {
  useStudentOverview,
  useStudentProgress,
  useStudentPerformance,
  useStudentStudyHabits,
  useStudentGoals,
} from "@/lib/hooks/use-student-analytics";
import { OverviewSection } from "./analytics/overview-section";
import { ProgressSection } from "./analytics/progress-section";
import { PerformanceSection } from "./analytics/performance-section";
import { StudyHabitsSection } from "./analytics/study-habits-section";
import { GoalsSection } from "./analytics/goals-section";

interface StudentAnalyticsDashboardProps {
  courseId: string;
}

export function StudentAnalyticsDashboard({ courseId }: StudentAnalyticsDashboardProps) {
  const [activeTab, setActiveTab] = useState("overview");

  // Use React Query hooks for all data fetching
  // Each hook only fetches when its tab is active (enabled prop)
  // Data is cached for 5 minutes, preventing redundant fetches on tab switches
  const { data: overviewData, isLoading: overviewLoading } = useStudentOverview(courseId, true);
  const { data: progressData, isLoading: progressLoading } = useStudentProgress(
    courseId,
    activeTab === "progress"
  );
  const { data: performanceData, isLoading: performanceLoading } = useStudentPerformance(
    courseId,
    activeTab === "performance"
  );
  const { data: studyHabitsData, isLoading: habitsLoading } = useStudentStudyHabits(
    courseId,
    activeTab === "habits"
  );
  const { data: goalsData, isLoading: goalsLoading } = useStudentGoals(
    courseId,
    activeTab === "goals"
  );

  if (overviewLoading && !overviewData) {
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
          {progressLoading && !progressData ? (
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
          {performanceLoading && !performanceData ? (
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
          {habitsLoading && !studyHabitsData ? (
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
          {goalsLoading && !goalsData ? (
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
