"use client";

import { useState, useTransition } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Clock, BookOpen, Brain, Target, Play } from "lucide-react";
import { updatePlanEntryStatusAction } from "@/app/actions/study-plan";
import { TaskType, PlanEntryStatus } from "@prisma/client";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { useTodaysPlan } from "@/lib/hooks/use-todays-plan";
import { useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface TodaysPlanProps {
  courseId: string;
  orientationVideoUrl?: string | null;
}

export function TodaysPlan({ courseId, orientationVideoUrl }: TodaysPlanProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [isPending, startTransition] = useTransition();
  const { data: planData, isLoading: loading, refetch } = useTodaysPlan(courseId);
  const [orientationOpen, setOrientationOpen] = useState(false);

  // Helper function to extract Vimeo embed URL (kept local to avoid coupling)
  const getVimeoEmbedUrl = (vimeoUrl: string): string => {
    if (vimeoUrl.includes("player.vimeo.com")) {
      const srcMatch = vimeoUrl.match(/src="([^"]+)"/);
      if (srcMatch) return srcMatch[1].replace(/&amp;/g, "&");
      return vimeoUrl.replace(/&amp;/g, "&");
    }
    const vimeoIdMatch = vimeoUrl.match(/vimeo\.com\/(\d+)/);
    if (vimeoIdMatch) {
      return `https://player.vimeo.com/video/${vimeoIdMatch[1]}?autoplay=0&title=0&byline=0&portrait=0`;
    }
    return vimeoUrl;
  };

  const orientationEmbedUrl = orientationVideoUrl ? getVimeoEmbedUrl(orientationVideoUrl) : null;

  const handleStartTask = (entryId: string, taskType: TaskType) => {
    // Navigate immediately (non-blocking)
    if (taskType === TaskType.LEARN) {
      router.push(`/apprendre/${courseId}?phase=learn`);
    } else if (taskType === TaskType.REVIEW) {
      router.push(`/apprendre/${courseId}?phase=review`);
    } else if (taskType === TaskType.PRACTICE) {
      router.push(`/apprendre/${courseId}?phase=practice`);
    }

    // Update status in background (non-blocking)
    startTransition(async () => {
      await updatePlanEntryStatusAction(entryId, PlanEntryStatus.IN_PROGRESS);
      
      // Invalidate cache to refetch updated plan
      const today = new Date().toISOString().split('T')[0];
      queryClient.invalidateQueries({ queryKey: ["todays-plan", courseId, today] });
    });
  };

  const handleCompleteTask = (entryId: string) => {
    // Show toast immediately
    toast.success("Tâche complétée!");

    // Update in background (non-blocking)
    startTransition(async () => {
      const result = await updatePlanEntryStatusAction(entryId, PlanEntryStatus.COMPLETED);
      if (result.success) {
        // Invalidate cache to refetch updated plan
        const today = new Date().toISOString().split('T')[0];
        queryClient.invalidateQueries({ queryKey: ["todays-plan", courseId, today] });
      }
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
        return <Clock className="h-4 w-4" />;
    }
  };

  const getTaskLabel = (taskType: TaskType, entry: any, phase1Module: any) => {
    switch (taskType) {
      case TaskType.LEARN:
        // Show module title for Phase 1
        return phase1Module ? `Phase 1 - Étude ${phase1Module.title}` : "Phase 1 - Étude";
      case TaskType.REVIEW:
        return "Phase 2 - Révision intelligente";
      case TaskType.PRACTICE:
        return "Phase 3 - Pratique";
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
      <>
        <Dialog open={orientationOpen} onOpenChange={setOrientationOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Vidéo d’orientation</DialogTitle>
              <DialogDescription>
                Conseils d’étude + rappel du format de l’examen (toujours accessible).
              </DialogDescription>
            </DialogHeader>

            {orientationEmbedUrl ? (
              <div className="space-y-4 mt-4">
                <div className="border rounded-lg overflow-hidden bg-black">
                  <div style={{ padding: "56.25% 0 0 0", position: "relative" }}>
                    <iframe
                      src={orientationEmbedUrl}
                      frameBorder="0"
                      allow="autoplay; fullscreen; picture-in-picture; clipboard-write; encrypted-media; web-share"
                      referrerPolicy="strict-origin-when-cross-origin"
                      style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%" }}
                      title="Vidéo d’orientation"
                    />
                  </div>
                </div>
              </div>
            ) : (
              <div className="mt-4 text-sm text-muted-foreground">
                Aucune vidéo d’orientation n’est configurée pour ce cours.
              </div>
            )}
          </DialogContent>
        </Dialog>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-3">
              <CardTitle>Plan du jour</CardTitle>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => setOrientationOpen(true)}
                disabled={!orientationEmbedUrl}
              >
                Vidéo d’orientation
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">Chargement...</p>
          </CardContent>
        </Card>
      </>
    );
  }

  if (!planData || planData.totalBlocks === 0) {
    return (
      <>
        <Dialog open={orientationOpen} onOpenChange={setOrientationOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Vidéo d’orientation</DialogTitle>
              <DialogDescription>
                Conseils d’étude + rappel du format de l’examen (toujours accessible).
              </DialogDescription>
            </DialogHeader>

            {orientationEmbedUrl ? (
              <div className="space-y-4 mt-4">
                <div className="border rounded-lg overflow-hidden bg-black">
                  <div style={{ padding: "56.25% 0 0 0", position: "relative" }}>
                    <iframe
                      src={orientationEmbedUrl}
                      frameBorder="0"
                      allow="autoplay; fullscreen; picture-in-picture; clipboard-write; encrypted-media; web-share"
                      referrerPolicy="strict-origin-when-cross-origin"
                      style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%" }}
                      title="Vidéo d’orientation"
                    />
                  </div>
                </div>
              </div>
            ) : (
              <div className="mt-4 text-sm text-muted-foreground">
                Aucune vidéo d’orientation n’est configurée pour ce cours.
              </div>
            )}
          </DialogContent>
        </Dialog>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-3">
              <div>
                <CardTitle>Plan du jour</CardTitle>
                <CardDescription>Aucune tâche planifiée pour aujourd'hui</CardDescription>
              </div>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => setOrientationOpen(true)}
                disabled={!orientationEmbedUrl}
              >
                Vidéo d’orientation
              </Button>
            </div>
          </CardHeader>
        </Card>
      </>
    );
  }

  const { sections, phase1Module } = planData;

  const renderSection = (
    title: string,
    tasks: any[],
    blockCount: number
  ) => {
    if (tasks.length === 0) return null;

    const task = tasks[0]; // Each section has one task
    const completed = task.status === PlanEntryStatus.COMPLETED;
    const inProgress = task.status === PlanEntryStatus.IN_PROGRESS;

    return (
      <div className="p-4 border rounded-lg space-y-2">
        <div className="flex items-center justify-between">
          <div className="font-semibold">{title}</div>
          <div className="text-sm text-muted-foreground">
            {blockCount} bloc{blockCount > 1 ? "s" : ""} (~{blockCount * 25} min)
          </div>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 flex-1">
            <div className="text-muted-foreground">{getTaskIcon(task.taskType)}</div>
            <div className="text-sm">
              {getTaskLabel(task.taskType, task, phase1Module)}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {getStatusBadge(task.status)}
            {task.status === PlanEntryStatus.PENDING && (
              <Button
                size="sm"
                onClick={() => handleStartTask(task.id, task.taskType)}
              >
                <Play className="h-4 w-4 mr-1" />
                Commencer
              </Button>
            )}
            {task.status === PlanEntryStatus.IN_PROGRESS && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleCompleteTask(task.id)}
              >
                <CheckCircle2 className="h-4 w-4 mr-1" />
                Terminer
              </Button>
            )}
            {task.status === PlanEntryStatus.COMPLETED && (
              <CheckCircle2 className="h-5 w-5 text-green-500" />
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <>
      <Dialog open={orientationOpen} onOpenChange={setOrientationOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Vidéo d’orientation</DialogTitle>
            <DialogDescription>
              Conseils d’étude + rappel du format de l’examen (toujours accessible).
            </DialogDescription>
          </DialogHeader>

          {orientationEmbedUrl ? (
            <div className="space-y-4 mt-4">
              <div className="border rounded-lg overflow-hidden bg-black">
                <div style={{ padding: "56.25% 0 0 0", position: "relative" }}>
                  <iframe
                    src={orientationEmbedUrl}
                    frameBorder="0"
                    allow="autoplay; fullscreen; picture-in-picture; clipboard-write; encrypted-media; web-share"
                    referrerPolicy="strict-origin-when-cross-origin"
                    style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%" }}
                    title="Vidéo d’orientation"
                  />
                </div>
              </div>
              <div className="text-sm text-muted-foreground space-y-2">
                <p>Cette vidéo couvre notamment :</p>
                <ul className="list-disc list-inside space-y-1 ml-2">
                  <li>Le format de l’examen</li>
                  <li>La stratégie d’étude recommandée</li>
                  <li>Comment utiliser la plateforme efficacement</li>
                </ul>
              </div>
            </div>
          ) : (
            <div className="mt-4 text-sm text-muted-foreground">
              Aucune vidéo d’orientation n’est configurée pour ce cours.
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-3">
            <div>
              <CardTitle>Plan du jour</CardTitle>
              <CardDescription>
                {planData.totalBlocks} blocs (~{planData.totalBlocks * 25} minutes)
              </CardDescription>
            </div>

            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => setOrientationOpen(true)}
              disabled={!orientationEmbedUrl}
              title={
                orientationEmbedUrl
                  ? "Voir la vidéo d’orientation"
                  : "Aucune vidéo d’orientation configurée pour ce cours"
              }
            >
              Vidéo d’orientation
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {renderSection(
              "Session courte",
              sections.sessionCourte,
              sections.sessionCourte.reduce((sum, t) => sum + t.estimatedBlocks, 0)
            )}
            {renderSection(
              "Session longue",
              sections.sessionLongue,
              sections.sessionLongue.reduce((sum, t) => sum + t.estimatedBlocks, 0)
            )}
            {renderSection(
              "Session courte supplémentaire",
              sections.sessionCourteSupplementaire,
              sections.sessionCourteSupplementaire.reduce((sum, t) => sum + t.estimatedBlocks, 0)
            )}
            {renderSection(
              "Session longue supplémentaire",
              sections.sessionLongueSupplementaire,
              sections.sessionLongueSupplementaire.reduce((sum, t) => sum + t.estimatedBlocks, 0)
            )}
          </div>
        </CardContent>
      </Card>
    </>
  );
}

