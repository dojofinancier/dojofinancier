"use client";

import { useState } from "react";
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Plus, Trash2, GripVertical, X, Save } from "lucide-react";
import * as LucideIcons from "lucide-react";
import { updateCohortFeaturesAction } from "@/app/actions/cohorts";
import { FEATURE_ICONS } from "@/lib/constants/feature-icons";

interface Feature {
  id: string;
  icon: string;
  text: string;
}

interface CohortFeaturesManagementProps {
  cohortId: string;
  initialFeatures: Feature[];
}

export function CohortFeaturesManagement({ cohortId, initialFeatures }: CohortFeaturesManagementProps) {
  const [features, setFeatures] = useState<Feature[]>(initialFeatures || []);
  const [saving, setSaving] = useState(false);
  const [newFeature, setNewFeature] = useState({ icon: "CheckCircle", text: "" });

  const IconComponent = ({ name }: { name: string }) => {
    const Icon = (LucideIcons as any)[name];
    return Icon ? <Icon className="h-5 w-5" /> : null;
  };

  const handleAddFeature = () => {
    if (!newFeature.text.trim()) {
      toast.error("Veuillez entrer un texte pour la fonctionnalité");
      return;
    }

    const feature: Feature = {
      id: crypto.randomUUID(),
      icon: newFeature.icon,
      text: newFeature.text,
    };

    setFeatures([...features, feature]);
    setNewFeature({ icon: "CheckCircle", text: "" });
  };

  const handleRemoveFeature = (id: string) => {
    setFeatures(features.filter((f) => f.id !== id));
  };

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = features.findIndex((f) => f.id === active.id);
    const newIndex = features.findIndex((f) => f.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    setFeatures(arrayMove(features, oldIndex, newIndex));
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const result = await updateCohortFeaturesAction(cohortId, features);
      if (result.success) {
        toast.success("Fonctionnalités mises à jour avec succès");
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
          <CardTitle>Fonctionnalités</CardTitle>
          <CardDescription>
            Liste des fonctionnalités à afficher dans la section héro de la page de la cohorte
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Existing features */}
            {features.length > 0 && (
              <div className="space-y-2">
                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                  <SortableContext items={features.map((f) => f.id)} strategy={verticalListSortingStrategy}>
                    {features.map((feature) => (
                      <SortableFeatureItem
                        key={feature.id}
                        feature={feature}
                        IconComponent={IconComponent}
                        onRemove={() => handleRemoveFeature(feature.id)}
                      />
                    ))}
                  </SortableContext>
                </DndContext>
              </div>
            )}

            {/* Add new feature */}
            <div className="border-t pt-4 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="featureIcon">Icône</Label>
                  <Select
                    value={newFeature.icon}
                    onValueChange={(value) => setNewFeature({ ...newFeature, icon: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="max-h-[320px] overflow-y-auto">
                      {FEATURE_ICONS.map((icon) => (
                        <SelectItem key={icon} value={icon}>
                          <div className="flex items-center gap-2">
                            <IconComponent name={icon} />
                            <span>{icon}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="featureText">Texte</Label>
                  <Input
                    id="featureText"
                    value={newFeature.text}
                    onChange={(e) => setNewFeature({ ...newFeature, text: e.target.value })}
                    placeholder="Ex: Sessions de coaching en groupe"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleAddFeature();
                      }
                    }}
                  />
                </div>
              </div>
              <Button onClick={handleAddFeature} variant="outline" className="w-full">
                <Plus className="h-4 w-4 mr-2" />
                Ajouter une fonctionnalité
              </Button>
            </div>
          </div>
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

function SortableFeatureItem({
  feature,
  IconComponent,
  onRemove,
}: {
  feature: Feature;
  IconComponent: ({ name }: { name: string }) => React.ReactNode;
  onRemove: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: feature.id,
  });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };
  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-3 p-3 border rounded-lg"
    >
      <div
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing touch-none"
      >
        <GripVertical className="h-5 w-5 text-muted-foreground" />
      </div>
      <IconComponent name={feature.icon} />
      <span className="flex-1">{feature.text}</span>
      <Button variant="ghost" size="sm" onClick={onRemove}>
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );
}
