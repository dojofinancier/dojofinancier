import type { MetadataRoute } from "next";
import { getSiteOrigin } from "@/lib/seo/json-ld";

export default function robots(): MetadataRoute.Robots {
  const origin = getSiteOrigin();
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/api/",
        "/dashboard/",
        "/tableau-de-bord/",
        "/login",
        "/reset-password",
        "/learn/",
        "/apprendre/",
        "/auth/",
        "/cohorte/*/apprendre",
        "/panier",
        "/checkout",
        "/paiement",
        "/r/",
      ],
    },
    sitemap: `${origin}/sitemap.xml`,
  };
}
