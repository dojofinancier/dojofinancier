"use client";

import { useState, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Upload, FileText, Trash2, Loader2, ExternalLink } from "lucide-react";
import {
  uploadCourseConsolidatedNotesPdfAction,
  removeCourseConsolidatedNotesPdfAction,
} from "@/app/actions/course-notes-upload";

interface CourseConsolidatedNotesManagementProps {
  courseId: string;
  initialConsolidatedNotesPdfUrl: string | null;
}

export function CourseConsolidatedNotesManagement({
  courseId,
  initialConsolidatedNotesPdfUrl,
}: CourseConsolidatedNotesManagementProps) {
  const [url, setUrl] = useState<string | null>(initialConsolidatedNotesPdfUrl);
  const [uploading, setUploading] = useState(false);
  const [removing, setRemoving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.type !== "application/pdf") {
      toast.error("Seuls les fichiers PDF sont acceptés");
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const result = await uploadCourseConsolidatedNotesPdfAction(courseId, formData);
      if (result.success && result.url) {
        setUrl(result.url);
        toast.success("Document consolidé mis en ligne avec succès");
      } else {
        toast.error(result.error || "Erreur lors du téléversement");
      }
    } catch {
      toast.error("Erreur lors du téléversement");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const handleRemove = async () => {
    setRemoving(true);
    try {
      const result = await removeCourseConsolidatedNotesPdfAction(courseId);
      if (result.success) {
        setUrl(null);
        toast.success("Document consolidé supprimé");
      } else {
        toast.error(result.error || "Erreur lors de la suppression");
      }
    } catch {
      toast.error("Erreur lors de la suppression");
    } finally {
      setRemoving(false);
    }
  };

  return (
    <Card className="mt-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Notes de chapitre / Notes consolidées (PDF)
        </CardTitle>
        <CardDescription>
          Téléversez ici le PDF des notes de chapitre pour ce cours. Les étudiants pourront le télécharger
          si l&apos;option « Notes consolidées (PDF) » est activée dans la visibilité des composants (onglet Détails).
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {url ? (
          <div className="flex flex-wrap items-center gap-3 p-3 rounded-lg bg-muted">
            <FileText className="h-5 w-5 text-muted-foreground shrink-0" />
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm font-medium text-primary hover:underline truncate max-w-[200px] sm:max-w-none"
            >
              Document consolidé (PDF)
            </a>
            <div className="flex gap-2 ml-auto shrink-0">
              <Button variant="outline" size="sm" asChild>
                <a href={url} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-4 w-4 mr-1" />
                  Ouvrir
                </a>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleRemove}
                disabled={removing}
              >
                {removing ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <Trash2 className="h-4 w-4 mr-1" />
                    Supprimer
                  </>
                )}
              </Button>
            </div>
          </div>
        ) : null}
        <div className="flex items-center gap-3">
          <input
            ref={fileInputRef}
            type="file"
            accept="application/pdf"
            onChange={handleUpload}
            className="hidden"
          />
          <Button
            type="button"
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
          >
            {uploading ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Upload className="h-4 w-4 mr-2" />
            )}
            {url ? "Remplacer le document" : "Téléverser un PDF"}
          </Button>
          <Label className="text-sm text-muted-foreground">
            PDF uniquement, max 32 Mo
          </Label>
        </div>
      </CardContent>
    </Card>
  );
}
