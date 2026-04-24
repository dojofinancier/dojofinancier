"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  createContextLineTemplateAction,
  updateContextLineTemplateAction,
} from "@/app/actions/admin-accompagnement";
import { toast } from "sonner";

type Category =
  | "NORMAL"
  | "WEAK_AREA"
  | "MISSED_ACK"
  | "PLAN_REMINDER"
  | "EXAM_URGENCY";

interface TemplateFormProps {
  template?: {
    id: string;
    category: string;
    body: string;
    weekdayApplicability: number[];
    locale: string;
    active: boolean;
  } | null;
  onSaved: () => void;
  onCancel: () => void;
}

const WEEKDAYS = [
  { value: 0, label: "Dim" },
  { value: 1, label: "Lun" },
  { value: 2, label: "Mar" },
  { value: 3, label: "Mer" },
  { value: 4, label: "Jeu" },
  { value: 5, label: "Ven" },
  { value: 6, label: "Sam" },
];

export function TemplateForm({ template, onSaved, onCancel }: TemplateFormProps) {
  const isEditing = !!template;
  const [loading, setLoading] = useState(false);

  const [category, setCategory] = useState<Category>(
    (template?.category as Category) || "NORMAL"
  );
  const [body, setBody] = useState(template?.body || "");
  const [weekdays, setWeekdays] = useState<number[]>(
    template?.weekdayApplicability ?? [0, 1, 2, 3, 4, 5, 6]
  );
  const [locale, setLocale] = useState(template?.locale || "fr");
  const [active, setActive] = useState(template?.active ?? true);

  function toggleWeekday(day: number) {
    setWeekdays((prev) =>
      prev.includes(day)
        ? prev.filter((d) => d !== day)
        : [...prev, day].sort((a, b) => a - b)
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!body.trim()) {
      toast.error("Le contenu est requis.");
      return;
    }
    if (weekdays.length === 0) {
      toast.error("Sélectionnez au moins un jour de la semaine.");
      return;
    }

    setLoading(true);
    const data = {
      category,
      body,
      weekdayApplicability: weekdays,
      locale,
      active,
    };

    const result = isEditing
      ? await updateContextLineTemplateAction(template!.id, data)
      : await createContextLineTemplateAction(data);

    if (result.success) {
      toast.success(isEditing ? "Ligne mise à jour" : "Ligne créée");
      onSaved();
    } else {
      toast.error(result.error || "Erreur");
    }
    setLoading(false);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {isEditing
            ? "Modifier la ligne de contexte"
            : "Nouvelle ligne de contexte"}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Catégorie</Label>
            <Select
              value={category}
              onValueChange={(v) => setCategory(v as Category)}
            >
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="NORMAL">
                  Normal (journée régulière)
                </SelectItem>
                <SelectItem value="WEAK_AREA">
                  Zone à renforcer détectée
                </SelectItem>
                <SelectItem value="MISSED_ACK">
                  Rattrapage après un oubli
                </SelectItem>
                <SelectItem value="PLAN_REMINDER">
                  Rappel du plan de la semaine
                </SelectItem>
                <SelectItem value="EXAM_URGENCY">
                  Urgence — examen imminent
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="body">Texte affiché dans le suivi quotidien</Label>
            <Textarea
              id="body"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Ex. Rappelle-toi : les petits efforts quotidiens comptent."
              rows={3}
              required
              maxLength={500}
              className="mt-1"
            />
            <p className="text-xs text-muted-foreground mt-1">
              {body.length}/500 caractères. Tutoyer. Pas d'emojis dans les SMS
              (ils sont tronqués à ~140 caractères).
            </p>
          </div>

          <div>
            <Label>Jours applicables</Label>
            <div className="mt-2 flex flex-wrap gap-3">
              {WEEKDAYS.map((d) => (
                <label
                  key={d.value}
                  className="flex cursor-pointer items-center gap-1.5 rounded border px-2 py-1 text-sm"
                >
                  <Checkbox
                    checked={weekdays.includes(d.value)}
                    onCheckedChange={() => toggleWeekday(d.value)}
                  />
                  {d.label}
                </label>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="locale">Langue</Label>
              <Select value={locale} onValueChange={setLocale}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="fr">Français</SelectItem>
                  <SelectItem value="en">English</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end gap-3">
              <Switch
                id="active"
                checked={active}
                onCheckedChange={setActive}
              />
              <Label htmlFor="active">Actif</Label>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={onCancel}>
              Annuler
            </Button>
            <Button type="submit" disabled={loading}>
              {loading
                ? "Enregistrement..."
                : isEditing
                  ? "Mettre à jour"
                  : "Créer"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
