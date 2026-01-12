import { requireAdmin } from "@/lib/auth/require-auth";
import { OrderList } from "@/components/admin/orders/order-list";

export default async function AdminOrdersPage() {
  await requireAdmin();

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Gestion des commandes</h1>
        <p className="text-muted-foreground mt-2">
          Consultez et gérez toutes les transactions et commandes
        </p>
      </div>
      <OrderList />
    </div>
  );
}

