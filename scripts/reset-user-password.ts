/**
 * Reset a Supabase Auth user's password (service role). Use when recovery email fails.
 *
 * Requires: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (from .env in project root or env).
 *
 * Usage:
 *   npx tsx scripts/reset-user-password.ts <email>
 *   npx tsx scripts/reset-user-password.ts user@example.com
 *   npx tsx scripts/reset-user-password.ts user@example.com "MyExplicitPassword123"
 *
 * If you omit the second argument, a random password is generated and printed once.
 * Share it securely with the user; it is not stored anywhere else.
 */

import { createClient } from "@supabase/supabase-js";
import { randomBytes } from "crypto";
import { readFileSync, existsSync } from "fs";
import { join } from "path";

/** Load .env from cwd so SUPABASE_SERVICE_ROLE_KEY is available when running tsx. */
function loadRootEnv() {
  const envPath = join(process.cwd(), ".env");
  if (!existsSync(envPath)) return;
  const text = readFileSync(envPath, "utf-8");
  for (const line of text.split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const eq = t.indexOf("=");
    if (eq <= 0) continue;
    const key = t.slice(0, eq).trim();
    let val = t.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (process.env[key] === undefined) process.env[key] = val;
  }
}

function generatePassword(length = 20): string {
  const alphabet =
    "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*-_";
  const bytes = randomBytes(length);
  let out = "";
  for (let i = 0; i < length; i++) {
    out += alphabet[bytes[i]! % alphabet.length];
  }
  return out;
}

async function findUserByEmail(
  supabase: ReturnType<typeof createClient>,
  email: string
) {
  const normalized = email.trim().toLowerCase();
  let page = 0;
  const perPage = 1000;

  while (true) {
    const { data, error } = await supabase.auth.admin.listUsers({
      page,
      perPage,
    });
    if (error) throw new Error(error.message);

    const user = data.users.find((u) => u.email?.toLowerCase() === normalized);
    if (user) return user;

    if (data.users.length < perPage) break;
    page++;
  }
  return null;
}

async function main() {
  loadRootEnv();

  const emailArg = process.argv[2];
  const explicitPassword = process.argv[3];

  if (!emailArg || emailArg.startsWith("-")) {
    console.error("Usage: npx tsx scripts/reset-user-password.ts <email> [new-password]");
    console.error("  Omit new-password to generate a random one.");
    process.exit(1);
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const email = emailArg.trim();
  console.log(`Looking up: ${email}`);

  const user = await findUserByEmail(supabase, email);
  if (!user) {
    console.error("No Supabase Auth user found with that email.");
    process.exit(1);
  }

  let newPassword: string;
  if (explicitPassword != null && explicitPassword !== "") {
    if (explicitPassword.length < 6) {
      console.error("Explicit password must be at least 6 characters.");
      process.exit(1);
    }
    newPassword = explicitPassword;
  } else {
    newPassword = generatePassword();
  }

  const { error } = await supabase.auth.admin.updateUserById(user.id, {
    password: newPassword,
  });

  if (error) {
    console.error("Failed to update password:", error.message);
    process.exit(1);
  }

  console.log("\nPassword updated successfully.");
  console.log(`  Email:    ${user.email}`);
  console.log(`  User ID:  ${user.id}`);
  console.log(`  Password: ${newPassword}`);
  console.log("\nShare the password securely with the user. It will not be shown again.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
