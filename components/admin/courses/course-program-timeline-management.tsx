"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Save } from "lucide-react";
import { updateCourseProgramTimelineAction } from "@/app/actions/courses";
import { DEFAULT_PROGRAM_TIMELINE_STEPS } from "@/lib/constants/program-timeline-defaults";
import type { ProgramTimelineStep } from "@/lib/types/program-timeline";

function cloneSteps(steps: ProgramTimelineStep[]): ProgramTimelineStep[] {
  return steps.map((s) => ({
    label: s.label,
    title: s.title,
    description: s.description,
  }));
}

interface CourseProgramTimelineManagementProps {
  courseId: string;
  initialProgramTimelineSteps: unknown;
}

export function CourseProgramTimelineManagement({
  courseId,
  initialProgramTimelineSteps,
}: CourseProgramTimelineManagementProps) {
  const initialUseDefault =
    initialProgramTimelineSteps === null || initialProgramTimelineSteps === undefined;

  const [useDefault, setUseDefault] = useState(initialUseDefault);
  const [steps, setSteps] = useState<ProgramTimelineStep[]>(() => {
    if (Array.isArray(initialProgramTimelineSteps) && initialProgramTimelineSteps.length === 5) {
      return cloneSteps(initialProgramTimelineSteps as ProgramTimelineStep[]);
    }
    return cloneSteps(DEFAULT_PROGRAM_TIMELINE_STEPS);
  });
  const [saving, setSaving] = useState(false);

  const updateStep = (index: number, patch: Partial<ProgramTimelineStep>) => {
    setSteps((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], ...patch };
      return next;
    });
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const result = await updateCourseProgramTimelineAction(courseId, {
        programTimelineSteps: useDefault ? null : steps,
      });
      if (result.success) {
        toast.success("Parcours mis à jour");
      } else {
        toast.error(result.error || "Erreur lors de la sauvegarde");
      }
    } catch {
      toast.error("Erreur lors de la sauvegarde");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Comment ça fonctionne (parcours)</CardTitle>
        <CardDescription>
          Section « COMMENT ÇA FONCTIONNE ? » sur la page produit. Par défaut, tous les cours utilisent le
          modèle du site (5 étapes). Vous pouvez personnaliser ce cours en désactivant le modèle et en
          remplissant les 5 étapes.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex flex-row items-center justify-between rounded-lg border p-4">
          <div className="space-y-0.5">
            <Label htmlFor="use-default-timeline">Utiliser le modèle par défaut du site</Label>
            <p className="text-sm text-muted-foreground">
              Si activé, les textes ci-dessous sont indicatifs ; la page utilisera le modèle central.
            </p>
          </div>
          <Switch
            id="use-default-timeline"
            checked={useDefault}
            onCheckedChange={(checked) => {
              setUseDefault(checked);
              if (checked) {
                setSteps(cloneSteps(DEFAULT_PROGRAM_TIMELINE_STEPS));
              }
            }}
          />
        </div>

        <div className="space-y-6">
          {steps.map((step, index) => (
            <div
              key={index}
              className="space-y-3 rounded-lg border p-4 bg-muted/30"
            >
              <div className="font-mono text-xs text-muted-foreground">Étape {index + 1} / 5</div>
              <div className="grid gap-2">
                <Label htmlFor={`timeline-label-${index}`}>Libellé temporel (optionnel)</Label>
                <Input
                  id={`timeline-label-${index}`}
                  value={step.label ?? ""}
                  disabled={useDefault}
                  placeholder="ex. Semaine 1-2"
                  onChange={(e) => updateStep(index, { label: e.target.value || undefined })}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor={`timeline-title-${index}`}>Titre</Label>
                <Input
                  id={`timeline-title-${index}`}
                  value={step.title}
                  disabled={useDefault}
                  onChange={(e) => updateStep(index, { title: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor={`timeline-desc-${index}`}>Texte court</Label>
                <Textarea
                  id={`timeline-desc-${index}`}
                  value={step.description}
                  disabled={useDefault}
                  rows={3}
                  onChange={(e) => updateStep(index, { description: e.target.value })}
                />
              </div>
            </div>
          ))}
        </div>

        <Button type="button" onClick={handleSave} disabled={saving}>
          <Save className="h-4 w-4 mr-2" />
          {saving ? "Enregistrement…" : "Enregistrer"}
        </Button>
      </CardContent>
    </Card>
  );
}
