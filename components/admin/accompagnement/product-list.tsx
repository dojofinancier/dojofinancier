"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  getAccompagnementProductsAction,
  deleteAccompagnementProductAction,
} from "@/app/actions/admin-accompagnement";
import { ProductForm } from "./product-form";
import { toast } from "sonner";
import { Plus, Pencil, Trash2 } from "lucide-react";

type Product = {
  id: string;
  courseId: string;
  courseTitle: string;
  title: string;
  description: string | null;
  price: number;
  accessDurationDays: number;
  sendTime: string;
  aiModel: string;
  published: boolean;
  enrollmentCount: number;
  createdAt: Date;
};

export function ProductList() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  const loadProducts = useCallback(async () => {
    setLoading(true);
    const result = await getAccompagnementProductsAction();
    if (result.success && result.data) {
      setProducts(result.data);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  async function handleDelete(id: string) {
    if (
      !confirm(
        "Supprimer ce produit d'accompagnement ? Les inscriptions associées seront aussi supprimées."
      )
    )
      return;
    const result = await deleteAccompagnementProductAction(id);
    if (result.success) {
      toast.success("Produit supprimé");
      loadProducts();
    } else {
      toast.error(result.error || "Erreur");
    }
  }

  if (showForm || editingProduct) {
    return (
      <ProductForm
        product={editingProduct}
        onSaved={() => {
          setShowForm(false);
          setEditingProduct(null);
          loadProducts();
        }}
        onCancel={() => {
          setShowForm(false);
          setEditingProduct(null);
        }}
      />
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Produits d'accompagnement</CardTitle>
        <Button onClick={() => setShowForm(true)} size="sm" className="gap-2">
          <Plus className="h-4 w-4" />
          Nouveau produit
        </Button>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="text-center py-8 text-muted-foreground">
            Chargement...
          </div>
        ) : products.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            Aucun produit d'accompagnement. Créez-en un pour commencer.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Produit</TableHead>
                <TableHead>Cours</TableHead>
                <TableHead>Prix</TableHead>
                <TableHead>Envoi (HE)</TableHead>
                <TableHead>Modèle IA</TableHead>
                <TableHead>Inscrits</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {products.map((product) => (
                <TableRow key={product.id}>
                  <TableCell className="font-medium">{product.title}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {product.courseTitle}
                  </TableCell>
                  <TableCell>{product.price.toFixed(2)} $</TableCell>
                  <TableCell>{product.sendTime}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {product.aiModel}
                  </TableCell>
                  <TableCell>{product.enrollmentCount}</TableCell>
                  <TableCell>
                    <Badge variant={product.published ? "default" : "secondary"}>
                      {product.published ? "Publié" : "Brouillon"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right space-x-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setEditingProduct(product)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(product.id)}
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
