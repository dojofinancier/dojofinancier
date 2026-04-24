# Enrollment Instructions

Quick reference for enrolling students from the terminal.

## Prerequisites

- Run commands from the project root.
- Ensure environment variables are set (usually via `.env`):
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `SUPABASE_SERVICE_ROLE_KEY`

---

## 1) Create a new student account (optional enroll)

Script: `scripts/create-client-account.ts`

### Interactive mode

```bash
npx tsx scripts/create-client-account.ts
```

Prompts for:
- Email
- Password
- First name (optional)
- Last name (optional)
- Course identifier (optional)

### One-line command mode

```bash
npx tsx scripts/create-client-account.ts <email> <password> [firstName] [lastName] [courseIdentifier]
```

Example:

```bash
npx tsx scripts/create-client-account.ts john@example.com MyPassword123 John Doe ccvm-1
```

If `courseIdentifier` is provided, the student is enrolled during the same run.

---

## 2) Enroll an existing user in a course

Script: `scripts/enroll-existing-user.ts`

```bash
npx tsx scripts/enroll-existing-user.ts <email> <courseIdentifier> [durationDays]
```

Examples:

```bash
npx tsx scripts/enroll-existing-user.ts user@example.com ccvm-1
npx tsx scripts/enroll-existing-user.ts user@example.com CCVM-2 180
```

Notes:
- User must already exist in the app database.
- `durationDays` is optional.

---

## 3) Bulk enroll users from CSV

Script: `scripts/bulk-enroll-users.ts`

```bash
npx tsx scripts/bulk-enroll-users.ts <path-to-csv-file>
```

Example:

```bash
npx tsx scripts/bulk-enroll-users.ts enrollments.csv
```

CSV columns expected:

```csv
firstName,lastName,email,courseIdentifier,password
```

Course identifier can be:
- Course slug (for example `ccvm-1`)
- Course code (for example `CCVM-2`)
- Course UUID

---

## 4) Grant accompagnement without payment (admin / comp)

Script: `scripts/grant-accompagnement-enrollment.ts`

Gives access to the **accompagnement** product **without Stripe**. The student must already have an **active main-course enrollment** for the course attached to that accompagnement product. They complete **onboarding** themselves in the accompagnement tab.

Uses the same database as the app (Prisma — ensure `.env` includes `DATABASE_URL` and related vars).

### List accompagnement products

```bash
npm run accompagnement:grant-enrollment -- --list
```

Prints: product id, course slug, published flag, title.

### Grant by student email + course slug

```bash
npm run accompagnement:grant-enrollment -- <email> <course-slug>
```

Example:

```bash
npm run accompagnement:grant-enrollment -- student@example.com erci
```

### Grant by student email + accompagnement product UUID

```bash
npm run accompagnement:grant-enrollment -- student@example.com <accompagnement-product-uuid>
```

Student can also be identified by **user UUID** instead of email.

### Options

| Flag | Meaning |
|------|---------|
| `--dry-run` | Validate only; no database write |
| `--allow-unpublished` | Allow granting when the accompagnement product is not published |

Examples:

```bash
npm run accompagnement:grant-enrollment -- student@example.com erci --dry-run
npm run accompagnement:grant-enrollment -- student@example.com erci --allow-unpublished
```

Notes:

- If the user already has an **active** accompagnement enrollment for that product, the script reports it and does nothing.
- `paymentIntentId` is left empty (manual grant).
- Expiry and `orderNumber` follow the same rules as paid enrollments.

---

## Quick Pick

- New student + optional enrollment: `create-client-account.ts`
- Existing student enrollment only: `enroll-existing-user.ts`
- Many students at once: `bulk-enroll-users.ts`
- Accompagnement without payment: `grant-accompagnement-enrollment.ts` (`npm run accompagnement:grant-enrollment`)
