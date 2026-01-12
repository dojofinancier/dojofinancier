import { Suspense } from "react";
import { ConfirmResetPasswordClient } from "./reset-password-confirm-client";

export default function ConfirmResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center p-4">
          <div className="w-full max-w-md rounded-lg border bg-card p-6 text-center text-muted-foreground">
            Chargement...
          </div>
        </div>
      }
    >
      <ConfirmResetPasswordClient />
    </Suspense>
  );
}

