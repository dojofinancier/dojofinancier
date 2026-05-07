"use client";

import * as Sentry from "@sentry/nextjs";
import NextError from "next/error";
import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="fr-CA">
      <body style={{ fontFamily: "system-ui, sans-serif", padding: "2rem", maxWidth: "40rem" }}>
        <NextError statusCode={0} />
        <p style={{ marginTop: "1rem", opacity: 0.85 }}>
          Vous pouvez rafraîchir la page ou réessayer ci-dessous.
        </p>
        <button
          type="button"
          style={{
            marginTop: "1rem",
            padding: "0.5rem 1rem",
            border: "1px solid #ccc",
            borderRadius: "6px",
            background: "#f5f5f5",
            cursor: "pointer",
          }}
          onClick={() => reset()}
        >
          Réessayer
        </button>
      </body>
    </html>
  );
}
