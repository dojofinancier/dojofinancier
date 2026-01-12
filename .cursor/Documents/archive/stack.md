# 🚀 Technology Stack (2025 Edition)
For a brand-new, fully optimized Next.js project

## 1. Core Framework & Runtime
- **Next.js**: `next@^16.0.3`
- **React**: `react@^19.0.0`
- **React DOM**: `react-dom@^19.0.0`
- **TypeScript**: `typescript@^5.9.3`
- **Node.js**: **22 LTS** (recommended runtime)

---

## 2. Styling & UI
- **Tailwind CSS**: `tailwindcss@^4.1.17`
- **shadcn/ui** (CLI-based; no npm version)
- **Radix UI**: via shadcn templates
- **lucide-react**: `lucide-react@^0.554.0`
- **recharts**: `recharts@^3.4.1`

### Class Utilities (consistent + optimized)
- `class-variance-authority@^0.7.1`
- `clsx@^2.1.1`
- `tailwind-merge@^3.4.0`

---

## 3. Database & ORM
- **Prisma CLI**: `prisma@^6.19.0`
- **Prisma Client**: `@prisma/client@^6.19.0`
- **Supabase client**: `@supabase/supabase-js@^2.81.1`
- **Supabase SSR utilities**: `@supabase/ssr@^0.7.0`

### Recommended Architecture
- Prisma = primary ORM in Server Components / Server Actions  
- Supabase = Auth, Storage, Realtime, PG hosting

---

## 4. Authentication
- **Supabase Auth** (email + OAuth)
- Utilize the cookie-based SSR flow via `@supabase/ssr`

---

## 5. Payments
- **Stripe server SDK**: `stripe@^19.3.1`
- **Stripe JS**: `@stripe/stripe-js@^8.5.1`
- **React Stripe bindings**: `@stripe/react-stripe-js@^5.3.0`

---

## 6. Forms & Validation
- `react-hook-form@^7.66.1`
- `@hookform/resolvers@^5.2.2`
- `zod@^4.1.12`

---

## 7. Utilities
- **date handling**:
  - `date-fns@^4.1.0`
  - `@date-fns/tz@^1.4.1`
- **Helper utilities**:
  - Single `cn()` helper combining clsx + tailwind-merge

---

## 8. Deployment (Netlify)
- **Next adapter plugin**: `@netlify/plugin-nextjs@^5.14.3`
- **Netlify Functions SDK**: `@netlify/functions@^5.0.1`
- Supports:
  - Server Actions
  - Scheduled Functions
  - API Routes
  - SSR on the Edge (optional)

---

## 9. Project Defaults
- **Language**: French (Canada)
- **Currency**: CAD
- **Rendering**: RSC default, Server Actions for mutations
