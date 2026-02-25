"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  createFlashcardAction,
  deleteFlashcardAction,
  deleteMultipleFlashcardsAction,
  getFlashcardsAction,
  updateFlashcardAction,
} from "@/app/actions/flashcards";
import { getModulesAction } from "@/app/actions/modules";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Flashcard } from "@prisma/client";
import { Checkbox } from "@/components/ui/checkbox";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { Loader2, Plus, Trash2, Edit } from "lucide-react";
import { CSVUploadDialog } from "./csv-upload-dialog";

interface FlashcardManagerProps {
  courseId: string;
}

export function FlashcardManager({ courseId }: FlashcardManagerProps) {
  const [flashcards, setFlashcards] = useState<Flashcard[]>([]);
  const [modules, setModules] = useState<Array<{ id: string; title: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCard, setEditingCard] = useState<Flashcard | null>(null);
  const [formState, setFormState] = useState({ front: "", back: "", moduleId: "" as string | null });
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [deleting, setDeleting] = useState(false);

  const loadFlashcards = async () => {
    setLoading(true);
    try {
      const result = await getFlashcardsAction(courseId);
      if (result.success && result.data) {
        // Ensure moduleId is properly handled (can be null/undefined)
        const flashcardsWithModule = (result.data as Array<Flashcard & { moduleId?: string | null; module?: { id: string; title: string } | null }>).map((card) => ({
          ...card,
          moduleId: card.moduleId ?? null,
        }));
        setFlashcards(flashcardsWithModule);
      } else {
        console.error("Flashcard loading error:", result.error);
        setFlashcards([]);
        if (result.error) {
          toast.error(result.error);
        } else {
          toast.error("Erreur lors du chargement des flashcards");
        }
      }
    } catch (error) {
      console.error("Flashcard loading exception:", error);
      const errorMessage = error instanceof Error ? error.message : "Erreur inconnue";
      toast.error(`Erreur lors du chargement des flashcards: ${errorMessage}`);
      setFlashcards([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFlashcards();
    loadModules();
  }, [courseId]);

  const loadModules = async () => {
    try {
      const modulesData = await getModulesAction(courseId);
      setModules(modulesData.map((m: any) => ({ id: m.id, title: m.title })));
    } catch (error) {
      console.error("Error loading modules:", error);
    }
  };

  const openCreateDialog = () => {
    setEditingCard(null);
    setFormState({ front: "", back: "", moduleId: null });
    setDialogOpen(true);
  };

  const openEditDialog = (card: Flashcard & { moduleId?: string | null }) => {
    setEditingCard(card);
    setFormState({ front: card.front, back: card.back, moduleId: card.moduleId || null });
    setDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!formState.front.trim() || !formState.back.trim()) {
      toast.error("Le recto et le verso sont requis");
      return;
    }

    if (editingCard) {
      const result = await updateFlashcardAction(editingCard.id, {
        front: formState.front,
        back: formState.back,
        moduleId: formState.moduleId || null,
      });
      if (result.success) {
        toast.success("Flashcard mise à jour");
        setDialogOpen(false);
        loadFlashcards();
      } else {
        toast.error(result.error || "Erreur lors de la mise à jour");
      }
    } else {
      const result = await createFlashcardAction({
        courseId,
        front: formState.front,
        back: formState.back,
        moduleId: formState.moduleId || null,
      });
      if (result.success) {
        toast.success("Flashcard créée");
        setDialogOpen(false);
        loadFlashcards();
      } else {
        toast.error(result.error || "Erreur lors de la création");
      }
    }
  };

  const handleDelete = async (cardId: string) => {
    const result = await deleteFlashcardAction(cardId);
    if (result.success) {
      toast.success("Flashcard supprimée");
      setSelectedIds((prev) => {
        const next = new Set(prev);
        next.delete(cardId);
        return next;
      });
      loadFlashcards();
    } else {
      toast.error(result.error || "Erreur lors de la suppression");
    }
  };

  const toggleSelect = (cardId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(cardId)) {
        next.delete(cardId);
      } else {
        next.add(cardId);
      }
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === flashcards.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(flashcards.map((c) => c.id)));
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    setDeleting(true);
    try {
      const result = await deleteMultipleFlashcardsAction(Array.from(selectedIds));
      if (result.success) {
        toast.success(`${selectedIds.size} flashcard(s) supprimée(s)`);
        setSelectedIds(new Set());
        loadFlashcards();
      } else {
        toast.error(result.error || "Erreur lors de la suppression");
      }
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold">Flashcards du cours</h2>
          <p className="text-sm text-muted-foreground">
            Créez des cartes recto-verso pour renforcer les notions clés du cours.
          </p>
        </div>
        <div className="flex gap-2">
          <CSVUploadDialog
            courseId={courseId}
            type="flashcard"
            onSuccess={() => loadFlashcards()}
          />
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={openCreateDialog}>
                <Plus className="h-4 w-4 mr-2" />
                Nouvelle flashcard
              </Button>
            </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingCard ? "Modifier la flashcard" : "Ajouter une flashcard"}</DialogTitle>
              <DialogDescription>
                Définissez le recto (question) et le verso (réponse / explication).
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label>Module (optionnel)</Label>
                <Select
                  value={formState.moduleId || "none"}
                  onValueChange={(value) => setFormState({ ...formState, moduleId: value === "none" ? null : value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner un module" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Aucun module</SelectItem>
                    {modules.map((module) => (
                      <SelectItem key={module.id} value={module.id}>
                        {module.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Recto</Label>
                <Textarea
                  value={formState.front}
                  onChange={(event) => setFormState({ ...formState, front: event.target.value })}
                  placeholder="Question, terme, notion..."
                />
              </div>
              <div className="space-y-2">
                <Label>Verso</Label>
                <Textarea
                  value={formState.back}
                  onChange={(event) => setFormState({ ...formState, back: event.target.value })}
                  placeholder="Réponse, définition, explication..."
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setDialogOpen(false)}>
                  Annuler
                </Button>
                <Button onClick={handleSubmit}>
                  {editingCard ? "Enregistrer" : "Créer"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
        </div>
      </div>

      {!loading && flashcards.length > 0 && (
        <div className="flex items-center gap-3 rounded-lg border bg-muted/50 px-4 py-2">
          <Checkbox
            checked={selectedIds.size === flashcards.length && flashcards.length > 0}
            onCheckedChange={toggleSelectAll}
            aria-label="Tout sélectionner"
          />
          <button
            type="button"
            onClick={toggleSelectAll}
            className="text-sm font-medium text-foreground hover:underline"
          >
            {selectedIds.size === flashcards.length ? "Tout désélectionner" : "Tout sélectionner"}
          </button>
          {selectedIds.size > 0 && (
            <>
              <span className="text-sm text-muted-foreground">
                {selectedIds.size} sélectionnée(s)
              </span>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" size="sm" disabled={deleting}>
                    {deleting ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <Trash2 className="h-4 w-4 mr-2" />
                    )}
                    Supprimer la sélection
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
                    <AlertDialogDescription>
                      Vous êtes sur le point de supprimer {selectedIds.size} flashcard(s).
                      Cette action est irréversible.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Annuler</AlertDialogCancel>
                    <AlertDialogAction onClick={handleBulkDelete}>
                      Supprimer
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </>
          )}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-12 text-muted-foreground gap-2">
          <Loader2 className="h-5 w-5 animate-spin" />
          Chargement des flashcards...
        </div>
      ) : flashcards.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            Aucune flashcard pour le moment.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {flashcards.map((card: Flashcard & { module?: { id: string; title: string } | null }) => (
            <Card key={card.id} className={selectedIds.has(card.id) ? "ring-2 ring-primary" : ""}>
              <CardHeader className="flex flex-row items-start justify-between space-y-0">
                <div className="flex items-start gap-3 flex-1">
                  <Checkbox
                    checked={selectedIds.has(card.id)}
                    onCheckedChange={() => toggleSelect(card.id)}
                    className="mt-0.5"
                    aria-label={`Sélectionner la flashcard: ${card.front.slice(0, 30)}`}
                  />
                  <div>
                    <CardTitle className="text-base">Recto</CardTitle>
                    {card.module && (
                      <p className="text-xs text-muted-foreground mt-1">Module: {card.module.title}</p>
                    )}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="ghost" size="icon" onClick={() => openEditDialog(card)}>
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => handleDelete(card.id)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-foreground whitespace-pre-wrap">{card.front}</p>
                <div>
                  <p className="text-xs uppercase font-semibold text-muted-foreground mb-2">Verso</p>
                  <p className="text-sm text-foreground whitespace-pre-wrap">{card.back}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

