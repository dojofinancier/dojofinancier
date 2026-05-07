import type { NextConfig } from "next";
import fs from "fs";
import path from "path";
import { withSentryConfig } from "@sentry/nextjs";

const HAS_SENTRY_AUTH_TOKEN = Boolean(process.env.SENTRY_AUTH_TOKEN);

/**
 * Recursively delete every `.js.map` (and `.mjs.map`) under `dir`.
 * Server-side source maps are never needed at runtime; leaving them in `.next/`
 * pushes Netlify serverless function ZIPs over the upload limit.
 */
function pruneServerSourcemaps(dir: string): number {
  if (!fs.existsSync(dir)) return 0;
  let removed = 0;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      removed += pruneServerSourcemaps(full);
    } else if (/\.(m?js)\.map$/.test(entry.name)) {
      try {
        fs.unlinkSync(full);
        removed++;
      } catch {
        // best-effort
      }
    }
  }
  return removed;
}

const nextConfig: NextConfig = {
  /* config options here */
  // Keep native-heavy packages external so file tracing does not inflate each
  // Netlify serverless artifact (avoids upload "request body too large" failures).
  serverExternalPackages: [
    "@prisma/client",
    "@react-pdf/renderer",
    "openai",
    "stripe",
    "twilio",
  ],
  // Suppress webpack warnings from Next.js internals
  webpack: (config, { dev }) => {
    if (dev) {
      config.ignoreWarnings = [
        { module: /node_modules\/next\// },
        { file: /node_modules\/next\// },
      ];
    }
    return config;
  },
  // Add empty turbopack config to allow webpack config to work
  turbopack: {},

  // Security headers - only apply CSP in production to avoid blocking Stripe in dev
  async headers() {
    // Skip CSP in development to allow all connections
    if (process.env.NODE_ENV !== "production") {
      return [];
    }
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              // Google Analytics + Google Ads + Tag Manager + Stripe + Vimeo
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.googletagmanager.com https://www.google-analytics.com https://googleads.g.doubleclick.net https://www.googleadservices.com https://js.stripe.com https://m.stripe.network https://*.stripe.com https://player.vimeo.com",
              // Frames: Stripe + Google Tag Manager + Vimeo
              "frame-src 'self' https://js.stripe.com https://hooks.stripe.com https://*.stripe.com https://www.googletagmanager.com https://td.doubleclick.net https://player.vimeo.com",
              // Connections: GA + Google Ads + Stripe + Supabase
              "connect-src 'self' https://www.google-analytics.com https://region1.google-analytics.com https://www.google.com https://googleads.g.doubleclick.net https://stats.g.doubleclick.net https://*.stripe.com https://*.stripe.network https://*.supabase.co wss://*.supabase.co https://*.ingest.sentry.io https://*.ingest.us.sentry.io",
              // Images: GA tracking pixels + Google Ads + Stripe
              "img-src 'self' data: blob: https://*.stripe.com https://www.google-analytics.com https://www.google.com https://googleads.g.doubleclick.net https://www.googleadservices.com https://www.google.ca https://www.google.fr",
              "style-src 'self' 'unsafe-inline'",
              "font-src 'self' data:",
            ].join("; "),
          },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
        ],
      },
    ];
  },
  
  // Performance optimizations
  // Enable cacheComponents for better performance (moved from experimental)
  cacheComponents: true,
  
  // Enable experimental features for better performance
  experimental: {
    // Allow larger uploads (e.g. PDFs, JSON exams) in Server Actions (default 1 MB)
    serverActions: {
      bodySizeLimit: "15mb",
    },
    // Optimize package imports - tree-shake unused exports
    optimizePackageImports: [
      '@radix-ui/react-accordion',
      '@radix-ui/react-alert-dialog',
      '@radix-ui/react-avatar',
      '@radix-ui/react-checkbox',
      '@radix-ui/react-collapsible',
      '@radix-ui/react-dialog',
      '@radix-ui/react-dropdown-menu',
      '@radix-ui/react-label',
      '@radix-ui/react-popover',
      '@radix-ui/react-progress',
      '@radix-ui/react-radio-group',
      '@radix-ui/react-scroll-area',
      '@radix-ui/react-select',
      '@radix-ui/react-separator',
      '@radix-ui/react-slot',
      '@radix-ui/react-switch',
      '@radix-ui/react-tabs',
      'lucide-react',
      'recharts',
    ],
  },
  
  // Compiler optimizations
  compiler: {
    // Remove console.log in production to reduce bundle size
    removeConsole: process.env.NODE_ENV === 'production' ? {
      exclude: ['error', 'warn'], // Keep error and warn logs
    } : false,
  },
  
  // Image optimization
  images: {
    // Enable image optimization
    formats: ['image/avif', 'image/webp'],
    // Add your image domains if using external images
    // remotePatterns: [],
  },
  
  // Enable compression
  compress: true,
  
  // PoweredBy header removal (security + performance)
  poweredByHeader: false,
  
  // Set output file tracing root to fix lockfile detection warning
  outputFileTracingRoot: path.resolve(__dirname),

  // Defense-in-depth: never let server source maps end up inside the traced
  // function bundles that Netlify uploads.
  outputFileTracingExcludes: {
    "*": [
      ".next/server/**/*.map",
      ".next/static/**/*.map",
      ".next/cache/**",
    ],
  },
};

// Hard backstop: even if Sentry leaves source maps behind (no token, upload
// skipped, or `disable: true`), strip every server-side `.map` before Netlify's
// adapter packages the serverless functions. `runAfterProductionCompile` is a
// top-level Next 15+ config key that fires once after `next build` finishes.
// Safe alongside Sentry source map upload: Sentry uploads during its own build
// step (which runs before this hook), so deleting after is fine.
(nextConfig as NextConfig & {
  runAfterProductionCompile?: (ctx: {
    distDir: string;
    projectDir: string;
  }) => Promise<void> | void;
}).runAfterProductionCompile = ({ distDir }) => {
  const serverDir = path.join(distDir, "server");
  const removed = pruneServerSourcemaps(serverDir);
  if (removed > 0) {
    // eslint-disable-next-line no-console
    console.log(
      `[next.config] Pruned ${removed} server-side .map file(s) from ${serverDir}`
    );
  }
};

export default withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,
  // true uploads many dependency source files to Sentry (better stacks) but
  // bloats build output; false shrinks Netlify server bundles when near upload limits.
  widenClientFileUpload: false,
  tunnelRoute: "/monitoring",
  silent: !process.env.CI,
  sourcemaps: {
    // When no auth token is configured, skip Sentry source map handling entirely
    // so the build doesn't emit/keep maps that we'd then have to strip.
    disable: !HAS_SENTRY_AUTH_TOKEN,
    // When maps ARE produced and uploaded, delete every .map under .next so
    // they never end up inside the Netlify function ZIP.
    filesToDeleteAfterUpload: [".next/**/*.map"],
  },
});

