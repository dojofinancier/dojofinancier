# Netlify Deployment Checklist

This checklist helps ensure a smooth deployment to Netlify.

## ✅ Pre-Deployment Checks

### 1. Build Configuration
- [x] `netlify.toml` build command uses correct script name (`db:generate` not `prisma:generate`)
- [x] Node.js version specified (20)
- [x] Next.js plugin configured (`@netlify/plugin-nextjs`)

### 2. Environment Variables
Ensure all required environment variables are set in Netlify:

**Database:**
- `DATABASE_URL` - Supabase PostgreSQL connection string
- `DIRECT_URL` - Direct database connection (for migrations)

**Supabase:**
- `NEXT_PUBLIC_SUPABASE_URL` - Your Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase anonymous key
- `SUPABASE_SERVICE_ROLE_KEY` - Supabase service role key (server-side only)

**Stripe:**
- `STRIPE_SECRET_KEY` - Stripe secret key (starts with `sk_`)
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` - Stripe publishable key (starts with `pk_`)
- `STRIPE_WEBHOOK_SECRET` - Stripe webhook signing secret (starts with `whsec_`)

**App:**
- `NEXT_PUBLIC_APP_URL` - Your production URL (e.g., `https://your-site.netlify.app`)
- `NEXT_PUBLIC_SITE_URL` - Alternative site URL variable

**Observability & incidents (recommended):**
- `NEXT_PUBLIC_SENTRY_DSN` - Sentry browser DSN (public)
- `SENTRY_DSN` - Optional server DSN (if different from public)
- `SENTRY_ENVIRONMENT` / `NEXT_PUBLIC_SENTRY_ENVIRONMENT` - e.g. `production`
- `SENTRY_TRACES_SAMPLE_RATE` / `NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE` - e.g. `0.1`
- `SENTRY_ORG` / `SENTRY_PROJECT` - Organization and project **slugs** (used by `withSentryConfig` for releases/source maps)
- `SENTRY_AUTH_TOKEN` - **Build-only** secret. Prefer an **[Organization auth token](https://docs.sentry.io/account/auth-tokens/)** (Developer Settings → Organization Tokens) for source maps; or a personal token with CI/release permissions. Set in Netlify (and optionally local `.env.sentry-build-plugin`). Never commit; `.gitignore` includes `.env.sentry-build-plugin`
- The app uses Sentry’s **tunnel** at `/monitoring` (ad-blocker bypass). `middleware.ts` skips Supabase session work for that path
- `HEALTH_CHECK_SECRET` - Shared secret for `GET /api/health?full=1` (DB + env + asset checks)
- `INCIDENT_TRIAGE_SECRET` - Bearer token for `POST /api/incident-triage` (Make.com / monitors)
- `MAKE_WEBHOOK_ERRORS_URL` - Make.com **Scenario A (hub)** custom webhook URL (app sends `error.occurred` here; see [Make.com incident routing](#makecom-incident-routing-3-scenarios) below)
- `MAKE_WEBHOOK_ERROR_SENTRY_URL` - **Optional.** Make.com **Scenario B (Sentry ingress)** custom webhook URL—**only if** you send Sentry alerts to Make (e.g. webhook or forwarded automation). Many teams use **Sentry’s built-in email or Slack** instead; in that case you do **not** need this URL or Scenario B. If you use it, keep the same URL in Netlify / `.env` for ops reference (the Next.js app never reads this variable)
- `MAKE_WEBHOOK_INCIDENT_TRIAGE_URL` - Optional Make.com scenario URL to receive AI triage payloads (`incident.triage.completed`)
- `OPENAI_INCIDENT_MODEL` - Optional; default `gpt-5.4`

### 3. Database Setup
- [ ] Run migrations on production database
- [ ] Verify Prisma client generation works (`npm run db:generate`)
- [ ] Check RLS policies are applied (`prisma/rls-policies.sql`)

### 4. Code Quality & production hardening
- [ ] Run `npm run lint` - no errors
- [ ] Run `npm run build` locally - successful build
- [ ] Check for TypeScript errors
- [ ] Verify all imports are correct
- [ ] Check for missing dependencies
- Production responses include **CSP** (existing integrations) plus **X-Content-Type-Options**, **X-Frame-Options**, **Referrer-Policy**, and **Permissions-Policy** via `next.config.ts` (see `headers()`).

### 5. File Structure
- [x] Documentation files moved to `docs/` folder
- [x] `.gitignore` updated to exclude development artifacts
- [x] README.md created with project documentation

## 🚨 Common Build Errors & Solutions

### Error: "Command 'prisma:generate' not found"
**Solution:** Fixed in `netlify.toml` - now uses `db:generate`

### Error: "Prisma Client not generated"
**Solution:** Ensure `npm run db:generate` runs before build in Netlify

### Error: "Missing environment variables"
**Solution:** Add all required variables in Netlify dashboard → Site settings → Environment variables

### Error: "Module not found" or import errors
**Solution:** 
- Check all imports use correct paths
- Verify `@/*` path alias is working
- Ensure all dependencies are in `package.json`

### Error: "Type errors"
**Solution:**
- Run `npm run lint` locally
- Check TypeScript strict mode settings
- Verify all types are properly defined

### Error: "Database connection failed"
**Solution:**
- Verify `DATABASE_URL` and `DIRECT_URL` are correct
- Check Supabase connection pooling settings
- Ensure database is accessible from Netlify's IP ranges

### Upload notes PDF fails (Bucket not found / RLS)
**Solution:**
1. In Supabase Dashboard → **Storage** → **New bucket** → create a bucket named exactly **`course-notes`** (e.g. Public if you want open PDF links).
2. Add Storage RLS policies so reads and uploads are allowed:
   - In Supabase Dashboard → **SQL Editor**, run the script **`prisma/storage-course-notes-policies.sql`** (copy/paste its contents and Run).
   - That script adds: public read (SELECT) on `course-notes`, and authenticated INSERT/UPDATE/DELETE so admins and students can upload/remove.
3. If "download" or opening the PDF link still fails with "Accès refusé", the missing RLS policy is usually **SELECT** on `storage.objects` for `bucket_id = 'course-notes'`; the script above adds it.

## 📋 Post-Deployment Verification

After deployment, verify:

1. **Homepage loads** - Check main route (`/`)
2. **Liveness** - `GET /api/health` returns `200` and JSON `status: ok`
3. **Deep health** (optional) - `GET /api/health?full=1` with `Authorization: Bearer <HEALTH_CHECK_SECRET>` — all `checks` should be `ok`
4. **Authentication works** - Test login/logout
5. **Database queries** - Verify data loads correctly
6. **Payments** - Test Stripe integration (use test mode)
7. **Webhooks** - Verify Stripe webhooks are configured
8. **Admin panel** - Test admin routes
9. **Student dashboard** - Test student routes
10. **API routes** - Test API endpoints

### External monitoring (configure outside the repo)

- Point an uptime checker at `/api/health` every 1–5 minutes.
- Add checks for DNS/SSL and critical paths (`/login`, `/formations`, `/logo_dark.png`).
- Optionally route alerts to Make.com → `POST /api/incident-triage` with your incident payload and `Authorization: Bearer <INCIDENT_TRIAGE_SECRET>` for a plain-language summary and forwarding to `MAKE_WEBHOOK_INCIDENT_TRIAGE_URL`.
- GitHub Actions: `.github/workflows/production-smoke.yml` runs basic URL checks on pushes to `main` (set `PRODUCTION_SITE_URL` secret to override the default host).

## Make.com incident routing (3 scenarios)

Use **three Make scenarios** and **three custom webhook URLs** when you want app errors, Sentry, and uptime all normalized through Make. Only **Scenario A** is required for app-originated `error.occurred` events. **Scenario B (Sentry)** is optional—skip it if Sentry notifies you by email/Slack only. **Scenario C (uptime)** maps uptime monitors into the same hub.

Why: Sentry and uptime fire when your app may be partly or fully down; thin scenarios B/C still run on Make’s infrastructure. The hub always receives a **uniform** shape for AI and alerting.

### Flow

```text
App (HIGH/CRITICAL error) ──POST──► Scenario A webhook (MAKE_WEBHOOK_ERRORS_URL)
                                         │
Sentry alert ──POST──► Scenario B ──normalize──HTTP POST──►─┤
                                                              ├──► Scenario A: normalize (app only) → OpenAI → Email/Slack/…
Uptime alert ──POST──► Scenario C ──normalize──HTTP POST──►─┘
```

### Scenario A – “Incident hub”

1. **Trigger:** Custom webhook → copy URL into Netlify as **`MAKE_WEBHOOK_ERRORS_URL`** (this is what `sendErrorOccurredWebhook` / `error.occurred` targets).
2. **Router (recommended):**  
   - **Branch 1 – App:** body has `type === "error.occurred"` and `payload` (see `lib/webhooks/make.ts`). Map to **canonical** (below).  
   - **Branch 2 – Pre-normalized:** body has top-level `source` and `incident` (what B/C send). Pass through or merge.
3. **OpenAI:** One module (HTTP or OpenAI) that always reads the **canonical** object (stringify JSON). Prompt: explain in **French**, severity, likely causes, ordered actions, rollback yes/no; assume Netlify / Next / Supabase / Prisma / Stripe.
4. **Output:** Email, Slack, Telegram, ticket tool, etc.

**Optional security:** On Scenario A webhook, require a query token or header (e.g. `X-Make-Secret`); store the same secret in Netlify only if you extend `sendMakeWebhook` to send it (today the app does not add this—you can add it later). For B/C → A, always send that secret so random POSTs cannot spam your hub.

### Scenario B – “Sentry ingress” (optional)

Use this path only if Sentry should send payloads **into Make** (not needed if Sentry notifies you by **email, Slack**, etc.).

1. **Trigger:** Custom webhook whose URL is **`MAKE_WEBHOOK_ERROR_SENTRY_URL`** (copy from Make → store in env for documentation).
2. **Sentry configuration:** Create an **Issue alert** and add a notification action your plan supports (**Webhook** if available; otherwise use email/Slack and optionally forward into Make outside this repo). Ensure a **Project** exists and production uses **`NEXT_PUBLIC_SENTRY_DSN`** so events flow in.
3. **Transform:** Map Sentry fields into the **canonical** `incident` object (title, URL to issue, `error_message`, stack excerpt, `release`, environment, frequency if available). **Strip secrets**; truncate `stack_trace` (e.g. first 8k chars).
4. **HTTP module:** `POST` to **Scenario A webhook** with body like:

```json
{
  "source": "sentry",
  "forwarded_at": "2026-05-06T16:00:00.000Z",
  "incident": {
    "incident_id": "{{sentry_event_id_or_make_internal_id}}",
    "detected_at": "{{sentry_timestamp}}",
    "source": "sentry",
    "severity": "high",
    "title": "{{issue_title}}",
    "summary": "{{short_description}}",
    "user_impact": "degraded",
    "environment": "production",
    "urls_checked": null,
    "http_status": null,
    "error_message": "{{primary_message}}",
    "stack_trace": "{{truncated_stack}}",
    "release": "{{release}}",
    "sentry_issue_url": "{{issue_link}}",
    "sentry_event_id": "{{event_id}}",
    "monitor_name": null,
    "region": null,
    "raw_excerpt": "{{small_safe_subset_of_raw_webhook}}"
  }
}
```

Field names in `{{}}` are placeholders—bind to your Sentry JSON if you use a webhook, or omit this scenario if Sentry emails you directly.

### Scenario C – “Uptime ingress”

1. **Trigger:** Custom webhook → URL given by your **uptime** product (Better Stack, Checkly, UptimeRobot, etc.) when a check fails (and optionally when it recovers).
2. **Transform:** Map monitor name, target URL, status code, response time, region, body snippet into **canonical** `incident` (`user_impact`: `down` when failed).
3. **HTTP module:** `POST` to **Scenario A webhook** with the same envelope shape as B, but `source: "uptime"` and `monitor_name`, `urls_checked`, `http_status` filled.

### Canonical `incident` object (for OpenAI in Scenario A)

Use one stable shape so the OpenAI step never branches on provider:

| Field | Purpose |
|-------|---------|
| `incident_id` | Stable id (Sentry id, monitor id+time, or app `error_id`) |
| `detected_at` | ISO 8601 |
| `source` | `app` \| `sentry` \| `uptime` \| `health` \| `netlify` \| `manual` |
| `severity` | `low` \| `medium` \| `high` \| `critical` |
| `title` | One-line title |
| `summary` | Short description |
| `user_impact` | `unknown` \| `none` \| `degraded` \| `down` |
| `environment` | e.g. `production` |
| `urls_checked` | URL the monitor hit, if any |
| `http_status` | If HTTP-related |
| `error_message` | Main error text |
| `stack_trace` | Optional; truncated |
| `release` / `commit` | If known |
| `sentry_issue_url` | If Sentry |
| `sentry_event_id` | If Sentry |
| `monitor_name` | If uptime |
| `region` | If uptime provides it |
| `raw_excerpt` | Small, **non-secret** debug slice only |

**App-native payload:** The app sends `type: "error.occurred"` and `payload` with `error_id`, `error_type`, `error_message`, `severity`, `url`, `stack_trace`, etc. Scenario A’s first branch maps those fields into the same `incident` rows (e.g. `source: "app"`, `incident_id: payload.error_id`).

### App vs hub when the site is broken

- **App → Scenario A** only runs while Netlify can execute your function and `MAKE_WEBHOOK_ERRORS_URL` is reachable.  
- **Sentry / uptime → B/C → Scenario A** still run if your site is down, as long as Make and the providers deliver webhooks. Rely on **B and C** for “site down” class incidents; keep **A** as the single place for OpenAI + notifications.

## 🔧 Netlify-Specific Configuration

### Deploy failed: `uploadDeployFunction` / `request body too large`

Netlify rejects a **single serverless function ZIP** that is too large for their upload API. Common causes after adding Sentry, Prisma, or PDF tooling: traced `node_modules` (multiple Prisma engines, `@react-pdf`, etc.).

**This repo mitigates that by:**

- `next.config.ts` → `serverExternalPackages` (Prisma, Stripe, OpenAI, Twilio, `@react-pdf/renderer`) so those deps are not duplicated inside every traced bundle.
- `prisma/schema.prisma` → `binaryTargets = ["native", "rhel-openssl-3.0.x"]` so Linux deploys use one known Lambda-compatible engine alongside your local `native` binary.
- Sentry `widenClientFileUpload: false` to avoid pulling extra client sources into the build output (source maps still upload when `SENTRY_AUTH_TOKEN` is set).

If deploys still fail: check **very large files under `public/`** (e.g. huge PDFs), remove them from git or serve from storage; then run a clean build locally and inspect `.next` size.

### Build Settings
- **Build command:** `export NEXT_PUBLIC_GIT_SHA="${COMMIT_REF:-unknown}" && npm run db:generate && npm run build` (see `netlify.toml`)
- **Publish directory:** Automatically handled by Next.js plugin
- **Node version:** 20 (set in `netlify.toml`)

### Redirects
Next.js App Router handles routing automatically. No manual redirects needed unless you have specific requirements.

### Functions
API routes in `app/api/` are automatically converted to Netlify Functions by the Next.js plugin.

## 📝 Notes

- The `.cursor/` and `chats/` folders are gitignored and won't be deployed
- Development scripts in `scripts/` are not needed for production
- Ensure `node_modules` is not committed (already in `.gitignore`)

## 🆘 Troubleshooting

If deployment fails:

1. Check Netlify build logs for specific errors
2. Compare local build with Netlify build
3. Verify all environment variables are set
4. Check Node.js version compatibility
5. Review recent code changes that might affect build

For more help, see the main [README.md](../README.md).
