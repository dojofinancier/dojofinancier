"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, AlertCircle } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { initializeCourseSettingsAction } from "@/app/actions/study-plan";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import type { SelfRating } from "@prisma/client";
import { OrientationVideo } from "./orientation-video";
import { useCourseSettings } from "@/lib/hooks/use-course-settings";

interface OrientationFormProps {
  courseId: string;
  courseTitle: string;
  recommendedStudyHoursMin?: number | null;
  recommendedStudyHoursMax?: number | null;
  orientationVideoUrl?: string | null;
  firstModuleId?: string | null;
  onComplete?: (isFirstCreation: boolean) => void;
}

export function OrientationForm({
  courseId,
  courseTitle,
  recommendedStudyHoursMin = 6,
  recommendedStudyHoursMax = 10,
  orientationVideoUrl,
  firstModuleId,
  onComplete,
}: OrientationFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [examDate, setExamDate] = useState<Date | undefined>(undefined);
  const [studyHoursPerWeek, setStudyHoursPerWeek] = useState(6);
  const [selfRating, setSelfRating] = useState<SelfRating>("NOVICE");
  const [preferredStudyDays, setPreferredStudyDays] = useState<number[]>([1, 2, 3, 4, 5]); // Mon-Fri
  const [error, setError] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [showVideo, setShowVideo] = useState(false);

  // Use React Query for course settings - automatic caching and deduplication
  const { data: settings, isLoading: loadingSettings } = useCourseSettings(courseId);

  // Load existing settings when component mounts
  useEffect(() => {
    if (settings) {
      if (settings.examDate) {
        setExamDate(new Date(settings.examDate));
      }
      if (settings.studyHoursPerWeek) {
        setStudyHoursPerWeek(settings.studyHoursPerWeek);
      }
      if (settings.selfRating) {
        setSelfRating(settings.selfRating);
      }
      if (settings.preferredStudyDays) {
        const days = settings.preferredStudyDays as number[];
        if (Array.isArray(days) && days.length > 0) {
          setPreferredStudyDays(days);
        }
      }
    }
  }, [settings]);

  const handleDayToggle = (day: number) => {
    setPreferredStudyDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!examDate) {
      setError("Veuillez sélectionner une date d'examen");
      return;
    }

    if (examDate <= new Date()) {
      setError("La date d'examen doit être dans le futur");
      return;
    }

    if (studyHoursPerWeek < 1 || studyHoursPerWeek > 40) {
      setError("Le nombre d'heures par semaine doit être entre 1 et 40");
      return;
    }

    if (preferredStudyDays.length === 0) {
      setError("Veuillez sélectionner au moins un jour d'étude");
      return;
    }

    setLoading(true);

    try {
      const result = await initializeCourseSettingsAction(courseId, {
        examDate,
        studyHoursPerWeek,
        preferredStudyDays,
        selfRating,
      });

      if (result.success) {
        const isFirstCreation = result.isFirstCreation ?? false;
        
        // Show warnings if any
        if (result.warnings && result.warnings.length > 0) {
          setWarnings(result.warnings);
          // Still show success toast, but warnings will be displayed below
          toast.success("Plan d'étude créé avec succès!");
        } else {
          toast.success("Plan d'étude créé avec succès!");
          setWarnings([]);
        }
        
        router.refresh();
        
        // If first creation, show video on this page
        // If update, just call onComplete to navigate to home
        if (isFirstCreation) {
          setShowVideo(true);
        } else {
          onComplete?.(isFirstCreation);
        }
      } else {
        setError(result.error || "Erreur lors de la création du plan d'étude");
        setWarnings([]);
      }
    } catch (err) {
      console.error("Error submitting orientation form:", err);
      setError("Une erreur est survenue. Veuillez réessayer.");
    } finally {
      setLoading(false);
    }
  };

  const dayLabels = ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"];

  // If video should be shown (first creation completed), show video component
  if (showVideo) {
    return (
      <OrientationVideo
        courseId={courseId}
        courseTitle={courseTitle}
        orientationVideoUrl={orientationVideoUrl}
        firstModuleId={firstModuleId}
        onComplete={() => {
          onComplete?.(true);
        }}
      />
    );
  }

  if (loadingSettings) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-3xl">
        <Card>
          <CardHeader>
            <CardTitle>Phase 0 - Orientation</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">Chargement des paramètres...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl">
      <Card>
        <CardHeader>
          <CardTitle>Phase 0 - Orientation</CardTitle>
          <CardDescription>
            Configurez votre plan d'étude personnalisé pour {courseTitle}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {warnings.length > 0 && (
              <Alert variant="default" className="border-yellow-500 bg-yellow-50 dark:bg-yellow-950">
                <AlertCircle className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
                <AlertDescription className="space-y-2">
                  <p className="font-semibold text-yellow-800 dark:text-yellow-200">Avertissements:</p>
                  <ul className="list-disc list-inside space-y-1 text-yellow-700 dark:text-yellow-300">
                    {warnings.map((warning, index) => (
                      <li key={index}>{warning}</li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            )}

            {/* Exam Date */}
            <div className="space-y-2">
              <Label htmlFor="examDate">Date d'examen *</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !examDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {examDate ? (
                      format(examDate, "PPP", { locale: fr })
                    ) : (
                      <span>Sélectionner une date</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={examDate}
                    onSelect={setExamDate}
                    disabled={(date) => date <= new Date()}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Study Hours Per Week */}
            <div className="space-y-2">
              <Label htmlFor="studyHours">Heures d'étude par semaine *</Label>
              <Input
                id="studyHours"
                type="number"
                min="1"
                max="40"
                value={studyHoursPerWeek}
                onChange={(e) => setStudyHoursPerWeek(parseInt(e.target.value) || 0)}
                required
              />
              <p className="text-sm text-muted-foreground">
                Recommandé: {recommendedStudyHoursMin}-{recommendedStudyHoursMax} heures par semaine pour une préparation optimale
              </p>
            </div>

            {/* Preferred Study Days */}
            <div className="space-y-2">
              <Label>Jours d'étude préférés</Label>
              <div className="flex gap-2 flex-wrap">
                {dayLabels.map((label, index) => (
                  <Button
                    key={index}
                    type="button"
                    variant={preferredStudyDays.includes(index) ? "default" : "outline"}
                    size="sm"
                    onClick={() => handleDayToggle(index)}
                  >
                    {label}
                  </Button>
                ))}
              </div>
              <p className="text-sm text-muted-foreground">
                Sélectionnez les jours où vous prévoyez étudier
              </p>
            </div>

            {/* Self Rating */}
            <div className="space-y-2">
              <Label>Niveau d'expérience *</Label>
              <RadioGroup value={selfRating} onValueChange={(value) => setSelfRating(value as SelfRating)}>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="NOVICE" id="novice" />
                  <Label htmlFor="novice" className="font-normal cursor-pointer">
                    Débutant - Première fois que je prépare cet examen
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="INTERMEDIATE" id="intermediate" />
                  <Label htmlFor="intermediate" className="font-normal cursor-pointer">
                    Intermédiaire - J'ai déjà étudié ce sujet
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="RETAKER" id="retaker" />
                  <Label htmlFor="retaker" className="font-normal cursor-pointer">
                    Reprenant - Je repasse l'examen
                  </Label>
                </div>
              </RadioGroup>
            </div>

            <Button type="submit" className="w-full" size="lg" disabled={loading}>
              {loading ? "Création du plan..." : "Créer mon plan d'étude"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

