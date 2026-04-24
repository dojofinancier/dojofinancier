"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  createAccompagnementProductAction,
  updateAccompagnementProductAction,
  getCoursesForProductCreationAction,
} from "@/app/actions/admin-accompagnement";
import { toast } from "sonner";

interface ProductFormProps {
  product?: {
    id: string;
    courseId: string;
    title: string;
    description: string | null;
    price: number;
    accessDurationDays: number;
    sendTime: string;
    aiModel: string;
    published: boolean;
  } | null;
  onSaved: () => void;
  onCancel: () => void;
}

export function ProductForm({ product, onSaved, onCancel }: ProductFormProps) {
  const isEditing = !!product;
  const [loading, setLoading] = useState(false);
  const [courses, setCourses] = useState<
    Array<{ id: string; title: string; hasProduct: boolean }>
  >([]);

  const [courseId, setCourseId] = useState(product?.courseId || "");
  const [title, setTitle] = useState(product?.title || "");
  const [description, setDescription] = useState(product?.description || "");
  const [price, setPrice] = useState(product?.price?.toString() || "");
  const [accessDurationDays, setAccessDurationDays] = useState(
    product?.accessDurationDays?.toString() || "365"
  );
  const [sendTime, setSendTime] = useState(product?.sendTime || "07:00");
  const [aiModel, setAiModel] = useState(product?.aiModel || "gpt-5.4-mini");
  const [published, setPublished] = useState(product?.published || false);

  useEffect(() => {
    async function loadCourses() {
      const result = await getCoursesForProductCreationAction();
      if (result.success && result.data) {
        setCourses(result.data);
      }
    }
    loadCourses();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    const data = {
      courseId,
      title,
      description: description || null,
      price: parseFloat(price),
      accessDurationDays: parseInt(accessDurationDays),
      sendTime,
      aiModel,
      published,
    };

    const result = isEditing
      ? await updateAccompagnementProductAction(product!.id, data)
      : await createAccompagnementProductAction(data);

    if (result.success) {
      toast.success(isEditing ? "Produit mis à jour" : "Produit créé");
      onSaved();
    } else {
      toast.error(result.error || "Erreur");
    }

    setLoading(false);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{isEditing ? "Modifier le produit" : "Nouveau produit d'accompagnement"}</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {!isEditing && (
            <div>
              <Label>Cours associé</Label>
              <Select value={courseId} onValueChange={setCourseId}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Sélectionnez un cours" />
                </SelectTrigger>
                <SelectContent>
                  {courses
                    .filter((c) => !c.hasProduct)
                    .map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.title}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div>
            <Label htmlFor="title">Titre du produit</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Accompagnement CIRE"
              required
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Suivi personnalisé quotidien..."
              rows={3}
              className="mt-1"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="price">Prix (CAD)</Label>
              <Input
                id="price"
                type="number"
                step="0.01"
                min="0"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                required
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="duration">Durée d'accès (jours)</Label>
              <Input
                id="duration"
                type="number"
                min="1"
                value={accessDurationDays}
                onChange={(e) => setAccessDurationDays(e.target.value)}
                required
                className="mt-1"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="sendTime">Heure d'envoi (Heure de l'Est)</Label>
            <Input
              id="sendTime"
              type="time"
              value={sendTime}
              onChange={(e) => setSendTime(e.target.value)}
              className="mt-1"
            />
            <p className="text-xs text-muted-foreground mt-1">
              La cadence (léger / mi-semaine / quiz / rattrapage) est
              automatique selon le jour de la semaine.
            </p>
          </div>

          <div>
            <Label htmlFor="aiModel">Modèle OpenAI</Label>
            <Input
              id="aiModel"
              value={aiModel}
              onChange={(e) => setAiModel(e.target.value)}
              placeholder="gpt-5.4-mini"
              required
              className="mt-1"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Modèle utilisé pour le routage, la classification et les résumés. Changez-le lorsqu'un nouveau modèle est disponible.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Switch
              id="published"
              checked={published}
              onCheckedChange={setPublished}
            />
            <Label htmlFor="published">Publié (visible par les étudiants)</Label>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={onCancel}>
              Annuler
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Enregistrement..." : isEditing ? "Mettre à jour" : "Créer"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
