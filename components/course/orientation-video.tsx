"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Play, Calendar, BookOpen } from "lucide-react";
import { completeOrientationAction } from "@/app/actions/study-plan";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

interface OrientationVideoProps {
  courseId: string;
  courseTitle: string;
  orientationVideoUrl?: string | null;
  firstModuleId?: string | null;
  onComplete?: () => void;
}

export function OrientationVideo({ courseId, courseTitle, orientationVideoUrl, firstModuleId, onComplete }: OrientationVideoProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [videoWatched, setVideoWatched] = useState(false);

  // Helper function to extract Vimeo embed URL (same as module-detail-page.tsx)
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

  const embedUrl = orientationVideoUrl ? getVimeoEmbedUrl(orientationVideoUrl) : null;

  const handleComplete = async () => {
    setLoading(true);
    try {
      const result = await completeOrientationAction(courseId);
      if (result.success) {
        toast.success("Orientation complétée!");
        router.refresh();
        onComplete?.();
      } else {
        toast.error(result.error || "Erreur lors de la complétion de l'orientation");
      }
    } catch (err) {
      console.error("Error completing orientation:", err);
      toast.error("Une erreur est survenue. Veuillez réessayer.");
    } finally {
      setLoading(false);
    }
  };

  const handleViewPlan = async () => {
    if (!videoWatched) {
      toast.error("Veuillez marquer la vidéo comme regardée d'abord");
      return;
    }

    setLoading(true);
    try {
      // Complete orientation first
      const result = await completeOrientationAction(courseId);
      if (result.success) {
        toast.success("Orientation complétée!");
        // Call onComplete to update parent state
        onComplete?.();
        // Use window.location for a full page reload to ensure fresh data
        // This ensures the server fetches updated settings
        window.location.href = `/apprendre/${courseId}`;
      } else {
        toast.error(result.error || "Erreur lors de la complétion de l'orientation");
        setLoading(false);
      }
    } catch (err) {
      console.error("Error completing orientation:", err);
      toast.error("Une erreur est survenue. Veuillez réessayer.");
      setLoading(false);
    }
  };

  const handleStartPhase1 = async () => {
    if (!videoWatched) {
      toast.error("Veuillez marquer la vidéo comme regardée d'abord");
      return;
    }

    setLoading(true);
    try {
      // Complete orientation first
      const result = await completeOrientationAction(courseId);
      if (result.success) {
        toast.success("Orientation complétée!");
        // Call onComplete to update parent state
        onComplete?.();
        // Use window.location for a full page reload to ensure fresh data
        // Navigate to first module of phase 1
        if (firstModuleId) {
          window.location.href = `/apprendre/${courseId}?module=${firstModuleId}`;
        } else {
          window.location.href = `/apprendre/${courseId}`;
        }
      } else {
        toast.error(result.error || "Erreur lors de la complétion de l'orientation");
        setLoading(false);
      }
    } catch (err) {
      console.error("Error completing orientation:", err);
      toast.error("Une erreur est survenue. Veuillez réessayer.");
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <Card>
        <CardHeader>
          <CardTitle>Phase 0 - Orientation</CardTitle>
          <CardDescription>
            Regardez cette vidéo pour comprendre le format de l'examen et comment utiliser cette plateforme
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Orientation Content */}
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold mb-2">À propos de cet examen</h3>
              <div className="space-y-2 text-sm text-muted-foreground">
                <p>
                  Cette formation vous prépare à l'examen. Le format, la difficulté et les critères de réussite
                  seront expliqués dans la vidéo ci-dessous.
                </p>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-2">Les trois phases d'apprentissage</h3>
              <div className="grid gap-4 md:grid-cols-3">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">Phase 1 - Apprendre</CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm text-muted-foreground">
                    Première passe complète du syllabus avec vidéos, notes et mini-tests
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">Phase 2 - Réviser</CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm text-muted-foreground">
                    Consolidation via rappel actif et répétition espacée avec flashcards et quiz
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">Phase 3 - Pratiquer</CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm text-muted-foreground">
                    Tests de préparation avec exercices et examens simulés
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* Video Player */}
            {embedUrl ? (
              <>
                <div className="border rounded-lg overflow-hidden bg-black">
                  <div style={{ padding: '56.25% 0 0 0', position: 'relative' }}>
                    <iframe
                      src={embedUrl}
                      frameBorder="0"
                      allow="autoplay; fullscreen; picture-in-picture; clipboard-write; encrypted-media; web-share"
                      referrerPolicy="strict-origin-when-cross-origin"
                      style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}
                      title="Vidéo d'orientation"
                    />
                  </div>
                </div>
                <div className="flex items-center justify-center space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setVideoWatched(!videoWatched)}
                    className={videoWatched ? "bg-primary text-primary-foreground" : ""}
                  >
                    {videoWatched ? (
                      <>
                        <CheckCircle2 className="h-4 w-4 mr-2" />
                        Vidéo regardée
                      </>
                    ) : (
                      <>
                        <Play className="h-4 w-4 mr-2" />
                        Marquer comme regardée
                      </>
                    )}
                  </Button>
                </div>
              </>
            ) : (
              <div className="border rounded-lg p-8 bg-muted/50 text-center">
                <p className="text-muted-foreground mb-4">
                  Vidéo d'orientation (5-10 minutes)
                </p>
                <p className="text-sm text-muted-foreground">
                  La vidéo d'orientation sera ajoutée par l'administrateur. Elle expliquera le format de l'examen,
                  la note de passage, et comment utiliser cette plateforme pour maximiser vos chances de réussite.
                </p>
                {/* Allow marking as watched even without video */}
                <div className="mt-4 flex justify-center">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setVideoWatched(!videoWatched)}
                    className={videoWatched ? "bg-primary text-primary-foreground" : ""}
                  >
                    {videoWatched ? (
                      <>
                        <CheckCircle2 className="h-4 w-4 mr-2" />
                        Vidéo regardée
                      </>
                    ) : (
                      <>
                        <Play className="h-4 w-4 mr-2" />
                        Marquer comme regardée
                      </>
                    )}
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="pt-4 border-t space-y-3">
            <div className="grid gap-3 md:grid-cols-2">
              <Button
                onClick={handleViewPlan}
                disabled={loading || !videoWatched}
                variant="outline"
                className="w-full"
                size="lg"
              >
                <Calendar className="h-5 w-5 mr-2" />
                {loading ? "Chargement..." : "Voir mon plan d'étude"}
              </Button>
              <Button
                onClick={handleStartPhase1}
                disabled={loading || !videoWatched}
                className="w-full"
                size="lg"
              >
                <BookOpen className="h-5 w-5 mr-2" />
                {loading ? "Chargement..." : "Commencer la phase 1"}
              </Button>
            </div>
            {!videoWatched && (
              <p className="text-sm text-muted-foreground text-center">
                Veuillez marquer la vidéo comme regardée avant de commencer la phase 1
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}


