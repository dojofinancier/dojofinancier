import { requireAdmin } from "@/lib/auth/require-auth";
import { CouponTabs } from "@/components/admin/coupons/coupon-tabs";

export default async function AdminCouponsPage() {
  await requireAdmin();

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Gestion des coupons</h1>
        <p className="text-muted-foreground mt-2">
          Créez et gérez les codes promotionnels
        </p>
      </div>
      <CouponTabs />
    </div>
  );
}

