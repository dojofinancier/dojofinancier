"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { cloneCourseAction, getCourseCategoriesAction } from "@/app/actions/courses";
import { toast } from "sonner";
import { Copy, Loader2 } from "lucide-react";
import type { CourseCategory } from "@prisma/client";

interface CloneCourseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sourceCourseId: string;
  sourceCourseTitle: string;
  sourceCourseCode?: string | null;
  sourceCategoryId: string;
}

export function CloneCourseDialog({
  open,
  onOpenChange,
  sourceCourseId,
  sourceCourseTitle,
  sourceCourseCode,
  sourceCategoryId,
}: CloneCourseDialogProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState<CourseCategory[]>([]);
  const [formData, setFormData] = useState({
    title: `${sourceCourseTitle} (Copie)`,
    code: sourceCourseCode ? `${sourceCourseCode}-copy` : "",
    categoryId: sourceCategoryId,
    published: false,
  });

  useEffect(() => {
    if (open) {
      loadCategories();
      // Reset form when dialog opens
      setFormData({
        title: `${sourceCourseTitle} (Copie)`,
        code: sourceCourseCode ? `${sourceCourseCode}-copy` : "",
        categoryId: sourceCategoryId,
        published: false,
      });
    }
  }, [open, sourceCourseTitle, sourceCourseCode, sourceCategoryId]);

  const loadCategories = async () => {
    try {
      const cats = await getCourseCategoriesAction();
      setCategories(cats);
    } catch (error) {
      toast.error("Erreur lors du chargement des catégories");
    }
  };

  const handleClone = async () => {
    if (!formData.title.trim()) {
      toast.error("Le titre est requis");
      return;
    }

    try {
      setLoading(true);
      const result = await cloneCourseAction(sourceCourseId, {
        title: formData.title.trim(),
        code: formData.code.trim() || undefined,
        categoryId: formData.categoryId,
        published: formData.published,
      });

      if (result.success && result.data) {
        toast.success("Cours cloné avec succès");
        onOpenChange(false);
        // Navigate to the cloned course
        router.push(`/tableau-de-bord/admin/courses/${result.data.id}`);
        router.refresh();
      } else {
        toast.error(result.error || "Erreur lors du clonage du cours");
      }
    } catch (error) {
      console.error("Clone course error:", error);
      toast.error("Erreur lors du clonage du cours");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Copy className="h-5 w-5" />
            Cloner le cours
          </DialogTitle>
          <DialogDescription>
            Créez une copie complète de ce cours, incluant tous les modules, questions, flashcards, et autres contenus.
            Le cours cloné sera créé en tant que brouillon par défaut.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="clone-title">Titre du cours cloné *</Label>
            <Input
              id="clone-title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="Titre du cours"
              disabled={loading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="clone-code">Code du cours</Label>
            <Input
              id="clone-code"
              value={formData.code}
              onChange={(e) => setFormData({ ...formData, code: e.target.value })}
              placeholder="Code unique (optionnel)"
              disabled={loading}
            />
            <p className="text-xs text-muted-foreground">
              Si vide, un code sera généré automatiquement à partir du titre
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="clone-category">Catégorie *</Label>
            <Select
              value={formData.categoryId}
              onValueChange={(value) => setFormData({ ...formData, categoryId: value })}
              disabled={loading}
            >
              <SelectTrigger id="clone-category">
                <SelectValue placeholder="Sélectionner une catégorie" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id}>
                    {cat.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between rounded-lg border p-4">
            <div className="space-y-0.5">
              <Label htmlFor="clone-published">Publier immédiatement</Label>
              <p className="text-xs text-muted-foreground">
                Le cours sera visible publiquement après le clonage
              </p>
            </div>
            <Switch
              id="clone-published"
              checked={formData.published}
              onCheckedChange={(checked) => setFormData({ ...formData, published: checked })}
              disabled={loading}
            />
          </div>

          <div className="rounded-lg bg-muted p-3 text-sm text-muted-foreground">
            <p className="font-medium mb-1">Ce qui sera cloné :</p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>Tous les modules et leur contenu</li>
              <li>Toutes les vidéos, quiz et questions</li>
              <li>Toutes les flashcards</li>
              <li>Toutes les activités d'apprentissage</li>
              <li>Toutes les banques de questions</li>
              <li>Toutes les études de cas</li>
              <li>Toutes les FAQ</li>
              <li>Les règles de disponibilité</li>
            </ul>
            <p className="font-medium mt-2 mb-1">Ce qui ne sera PAS cloné :</p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>Les inscriptions et données utilisateurs</li>
              <li>Les tentatives et résultats</li>
              <li>Les identifiants d'abonnement Stripe</li>
            </ul>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Annuler
          </Button>
          <Button onClick={handleClone} disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Clonage en cours...
              </>
            ) : (
              <>
                <Copy className="h-4 w-4 mr-2" />
                Cloner le cours
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
