"use client";

import { useState, useEffect } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  createCourseFAQAction,
  updateCourseFAQAction,
  deleteCourseFAQAction,
  getCourseFAQsAction,
  reorderCourseFAQsAction,
} from "@/app/actions/course-faqs";
import { toast } from "sonner";
import { Plus, Trash2, Edit2, GripVertical, X } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface FAQ {
  id: string;
  question: string;
  answer: string;
  order: number;
}

interface CourseFAQManagementProps {
  courseId: string;
}

export function CourseFAQManagement({ courseId }: CourseFAQManagementProps) {
  const [faqs, setFaqs] = useState<FAQ[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [formData, setFormData] = useState({ question: "", answer: "" });

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    loadFAQs();
  }, [courseId]);

  const loadFAQs = async () => {
    try {
      setLoading(true);
      const result = await getCourseFAQsAction(courseId);
      if (result.success && result.data) {
        setFaqs(result.data);
      }
    } catch (error) {
      console.error("Error loading FAQs:", error);
      toast.error("Erreur lors du chargement des FAQ");
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!formData.question.trim() || !formData.answer.trim()) {
      toast.error("Veuillez remplir tous les champs");
      return;
    }

    try {
      const result = await createCourseFAQAction(courseId, {
        question: formData.question,
        answer: formData.answer,
        order: faqs.length,
      });

      if (result.success) {
        toast.success("FAQ créée avec succès");
        setFormData({ question: "", answer: "" });
        loadFAQs();
      } else {
        toast.error(result.error || "Erreur lors de la création");
      }
    } catch (error) {
      toast.error("Erreur lors de la création de la FAQ");
    }
  };

  const handleUpdate = async (id: string) => {
    if (!formData.question.trim() || !formData.answer.trim()) {
      toast.error("Veuillez remplir tous les champs");
      return;
    }

    try {
      const result = await updateCourseFAQAction(id, {
        question: formData.question,
        answer: formData.answer,
      });

      if (result.success) {
        toast.success("FAQ mise à jour avec succès");
        setEditingId(null);
        setFormData({ question: "", answer: "" });
        loadFAQs();
      } else {
        toast.error(result.error || "Erreur lors de la mise à jour");
      }
    } catch (error) {
      toast.error("Erreur lors de la mise à jour de la FAQ");
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const result = await deleteCourseFAQAction(id);
      if (result.success) {
        toast.success("FAQ supprimée avec succès");
        loadFAQs();
      } else {
        toast.error(result.error || "Erreur lors de la suppression");
      }
    } catch (error) {
      toast.error("Erreur lors de la suppression de la FAQ");
    } finally {
      setDeleteId(null);
    }
  };

  const startEdit = (faq: FAQ) => {
    setEditingId(faq.id);
    setFormData({ question: faq.question, answer: faq.answer });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setFormData({ question: "", answer: "" });
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = faqs.findIndex((f) => f.id === active.id);
    const newIndex = faqs.findIndex((f) => f.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    const reordered = arrayMove(faqs, oldIndex, newIndex);
    setFaqs(reordered);
    const result = await reorderCourseFAQsAction(reordered.map((f) => f.id));
    if (!result.success) {
      toast.error(result.error || "Erreur lors du réordonnancement");
      loadFAQs();
    }
  };

  if (loading) {
    return <div className="text-muted-foreground">Chargement des FAQ...</div>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Questions fréquentes (FAQ)</CardTitle>
          <CardDescription>
            Ajoutez et gérez les questions fréquentes pour cette formation
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Add New FAQ Form */}
          <div className="border rounded-lg p-4 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="question">Question</Label>
              <Input
                id="question"
                value={formData.question}
                onChange={(e) =>
                  setFormData({ ...formData, question: e.target.value })
                }
                placeholder="Ex: Combien de temps dure la formation ?"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="answer">Réponse</Label>
              <Textarea
                id="answer"
                value={formData.answer}
                onChange={(e) =>
                  setFormData({ ...formData, answer: e.target.value })
                }
                placeholder="Ex: La formation dure 12 semaines avec accès pendant 1 an..."
                rows={3}
              />
            </div>
            <div className="flex gap-2">
              {editingId ? (
                <>
                  <Button
                    onClick={() => handleUpdate(editingId)}
                    size="sm"
                  >
                    <Edit2 className="h-4 w-4 mr-2" />
                    Mettre à jour
                  </Button>
                  <Button
                    onClick={cancelEdit}
                    variant="outline"
                    size="sm"
                  >
                    <X className="h-4 w-4 mr-2" />
                    Annuler
                  </Button>
                </>
              ) : (
                <Button onClick={handleCreate} size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Ajouter une FAQ
                </Button>
              )}
            </div>
          </div>

          {/* FAQs List */}
          <div className="space-y-3">
            {faqs.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                Aucune FAQ pour le moment. Ajoutez-en une ci-dessus.
              </p>
            ) : (
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <SortableContext items={faqs.map((f) => f.id)} strategy={verticalListSortingStrategy}>
                  {faqs.map((faq) => (
                    <SortableFAQCard
                      key={faq.id}
                      faq={faq}
                      onEdit={() => startEdit(faq)}
                      onDelete={() => setDeleteId(faq.id)}
                    />
                  ))}
                </SortableContext>
              </DndContext>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteId !== null} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer la FAQ</AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir supprimer cette FAQ ? Cette action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteId && handleDelete(deleteId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function SortableFAQCard({
  faq,
  onEdit,
  onDelete,
}: {
  faq: FAQ;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: faq.id,
  });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };
  return (
    <Card ref={setNodeRef} style={style}>
      <CardContent className="pt-6">
        <div className="flex items-start gap-4">
          <div
            {...attributes}
            {...listeners}
            className="cursor-grab active:cursor-grabbing touch-none mt-1"
          >
            <GripVertical className="h-5 w-5 text-muted-foreground" />
          </div>
          <div className="flex-1 space-y-2">
            <div>
              <h4 className="font-semibold">{faq.question}</h4>
              <p className="text-sm text-muted-foreground mt-1">
                {faq.answer}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={onEdit}>
              <Edit2 className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={onDelete}>
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}