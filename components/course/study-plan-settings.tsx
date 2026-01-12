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
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { CalendarIcon, AlertCircle, Settings } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { initializeCourseSettingsAction, generateStudyPlanAction } from "@/app/actions/study-plan";
import { toast } from "sonner";
import type { SelfRating } from "@prisma/client";
import { useCourseSettings } from "@/lib/hooks/use-course-settings";

interface StudyPlanSettingsProps {
  courseId: string;
  courseTitle: string;
  recommendedStudyHoursMin?: number | null;
  recommendedStudyHoursMax?: number | null;
  onUpdate?: () => void;
}

export function StudyPlanSettings({
  courseId,
  courseTitle,
  recommendedStudyHoursMin = 6,
  recommendedStudyHoursMax = 10,
  onUpdate,
}: StudyPlanSettingsProps) {
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [examDate, setExamDate] = useState<Date | undefined>(undefined);
  const [studyHoursPerWeek, setStudyHoursPerWeek] = useState(6);
  const [selfRating, setSelfRating] = useState<SelfRating>("NOVICE");
  const [preferredStudyDays, setPreferredStudyDays] = useState<number[]>([1, 2, 3, 4, 5]); // Mon-Fri
  const [error, setError] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);

  // Use React Query for course settings - automatic caching and deduplication
  const { data: settings, isLoading: loadingSettings } = useCourseSettings(courseId);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Load settings into local state when dialog opens or settings change
  useEffect(() => {
    if (open && settings) {
      setExamDate(settings.examDate ? new Date(settings.examDate) : undefined);
      setStudyHoursPerWeek(settings.studyHoursPerWeek || 6);
      setSelfRating(settings.selfRating || "NOVICE");
      setPreferredStudyDays((settings.preferredStudyDays as number[]) || [1, 2, 3, 4, 5]);
    }
  }, [open, settings]);

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
        // Regenerate study plan with new settings
        const planResult = await generateStudyPlanAction(courseId);
        
        // Show warnings if any
        if (planResult.warnings && planResult.warnings.length > 0) {
          setWarnings(planResult.warnings);
          toast.success("Paramètres mis à jour avec succès! Le plan d'étude a été régénéré.");
        } else {
          toast.success("Paramètres mis à jour avec succès! Le plan d'étude a été régénéré.");
          setWarnings([]);
        }
        // Close modal and refresh
        setOpen(false);
        onUpdate?.();
      } else {
        setError(result.error || "Erreur lors de la mise à jour des paramètres");
        setWarnings([]);
      }
    } catch (err) {
      console.error("Error updating settings:", err);
      setError("Une erreur est survenue. Veuillez réessayer.");
    } finally {
      setLoading(false);
    }
  };

  const dayLabels = ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"];

  // Prevent hydration mismatch by only rendering Dialog after mount
  if (!mounted) {
    return (
      <Button variant="outline" size="sm" disabled>
        <Settings className="h-4 w-4 mr-2" />
        Paramètres du plan
      </Button>
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Settings className="h-4 w-4 mr-2" />
          Paramètres du plan
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Paramètres du plan d'étude</DialogTitle>
          <DialogDescription>
            Modifiez vos paramètres pour régénérer votre plan d'étude personnalisé
          </DialogDescription>
        </DialogHeader>
        {loadingSettings ? (
          <div className="py-8 text-center">
            <p className="text-muted-foreground">Chargement...</p>
          </div>
        ) : (
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

            <div className="flex gap-4 pt-4">
              <Button type="submit" className="flex-1" disabled={loading}>
                {loading ? "Mise à jour..." : "Mettre à jour et régénérer le plan"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
                disabled={loading}
              >
                Annuler
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}


