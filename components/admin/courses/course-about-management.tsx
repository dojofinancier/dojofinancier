"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { RichTextEditor } from "./rich-text-editor";
import { toast } from "sonner";
import { Save } from "lucide-react";
import { updateCourseAboutAction } from "@/app/actions/courses";

interface CourseAboutManagementProps {
  courseId: string;
  initialShortDescription: string;
  initialAboutText: string;
}

export function CourseAboutManagement({ 
  courseId, 
  initialShortDescription,
  initialAboutText 
}: CourseAboutManagementProps) {
  const [shortDescription, setShortDescription] = useState(initialShortDescription || "");
  const [aboutText, setAboutText] = useState(initialAboutText || "");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    try {
      setSaving(true);
      const result = await updateCourseAboutAction(courseId, { shortDescription, aboutText });
      if (result.success) {
        toast.success("Informations mises à jour avec succès");
      } else {
        toast.error(result.error || "Erreur lors de la mise à jour");
      }
    } catch (error) {
      toast.error("Erreur lors de la sauvegarde");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Description courte</CardTitle>
          <CardDescription>
            Cette description apparaîtra dans la section héro de la page du cours (2-3 phrases)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Label htmlFor="shortDescription">Description courte</Label>
            <Input
              id="shortDescription"
              value={shortDescription}
              onChange={(e) => setShortDescription(e.target.value)}
              placeholder="Ex: Préparez-vous efficacement à l'examen CCVM avec notre formation complète..."
              className="w-full"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>À propos de la formation</CardTitle>
          <CardDescription>
            Texte détaillé qui apparaîtra dans la section "À propos" de la page du cours
          </CardDescription>
        </CardHeader>
        <CardContent>
          <RichTextEditor
            content={aboutText}
            onChange={setAboutText}
            placeholder="Décrivez en détail votre formation, ses objectifs, sa méthodologie..."
          />
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving}>
          <Save className="h-4 w-4 mr-2" />
          {saving ? "Enregistrement..." : "Enregistrer"}
        </Button>
      </div>
    </div>
  );
}













