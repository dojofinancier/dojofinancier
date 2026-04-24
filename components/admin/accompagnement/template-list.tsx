"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  getContextLineTemplatesAction,
  deleteContextLineTemplateAction,
} from "@/app/actions/admin-accompagnement";
import { TemplateForm } from "./template-form";
import { toast } from "sonner";
import { Plus, Pencil, Trash2 } from "lucide-react";

type ContextLine = {
  id: string;
  category: string;
  body: string;
  weekdayApplicability: number[];
  locale: string;
  active: boolean;
};

const WEEKDAYS = ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"];

export function TemplateList() {
  const [rows, setRows] = useState<ContextLine[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<ContextLine | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const result = await getContextLineTemplatesAction();
    if (result.success && result.data) {
      setRows(result.data);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function handleDelete(id: string) {
    if (!confirm("Supprimer cette ligne de contexte ?")) return;
    const result = await deleteContextLineTemplateAction(id);
    if (result.success) {
      toast.success("Ligne supprimée");
      load();
    } else {
      toast.error(result.error || "Erreur");
    }
  }

  if (showForm || editing) {
    return (
      <TemplateForm
        template={editing}
        onSaved={() => {
          setShowForm(false);
          setEditing(null);
          load();
        }}
        onCancel={() => {
          setShowForm(false);
          setEditing(null);
        }}
      />
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Lignes de contexte (suivis quotidiens)</CardTitle>
        <Button onClick={() => setShowForm(true)} size="sm" className="gap-2">
          <Plus className="h-4 w-4" />
          Nouvelle ligne
        </Button>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="text-center py-8 text-muted-foreground">
            Chargement...
          </div>
        ) : rows.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            Aucune ligne de contexte. Le moteur utilise alors des lignes
            intégrées par défaut.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Catégorie</TableHead>
                <TableHead className="max-w-md">Texte</TableHead>
                <TableHead>Jours</TableHead>
                <TableHead>Langue</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.id}>
                  <TableCell>
                    <Badge variant="outline">{categoryLabel(r.category)}</Badge>
                  </TableCell>
                  <TableCell className="max-w-md truncate text-sm">
                    {r.body}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {r.weekdayApplicability.length === 7
                      ? "Tous"
                      : r.weekdayApplicability
                          .map((d) => WEEKDAYS[d])
                          .join(", ")}
                  </TableCell>
                  <TableCell className="uppercase text-xs">
                    {r.locale}
                  </TableCell>
                  <TableCell>
                    <Badge variant={r.active ? "default" : "secondary"}>
                      {r.active ? "Actif" : "Inactif"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right space-x-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setEditing(r)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(r.id)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

function categoryLabel(c: string): string {
  switch (c) {
    case "NORMAL":
      return "Normal";
    case "WEAK_AREA":
      return "Zone faible";
    case "MISSED_ACK":
      return "Rattrapage";
    case "PLAN_REMINDER":
      return "Plan";
    case "EXAM_URGENCY":
      return "Examen";
    default:
      return c;
  }
}
