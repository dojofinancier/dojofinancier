/**
 * Provider-agnostic transactional deliverability probe.
 *
 * Sends a bare-bones email through whichever provider is currently active
 * (`EMAIL_PROVIDER` env var) so we can isolate whether a bounce is caused by
 * our HTML/content or by the provider's transactional setup for the sending
 * domain.
 *
 * Usage:
 *   npx tsx scripts/email-ping.ts <recipient-email> [--mode=minimal|styled] [--provider=sender|mailersend]
 *
 *   --mode=minimal    (default) 1-line plain HTML, no links, no images
 *   --mode=styled               tiny styled block with one link, no images
 *   --provider=...    override EMAIL_PROVIDER for this single run
 */

import "dotenv/config";
import {
  sendTransactionalEmail,
  getActiveEmailProvider,
  getDefaultFromAddress,
  type EmailProvider,
} from "../lib/email/transactional";

interface ParsedArgs {
  to: string;
  mode: "minimal" | "styled";
  providerOverride: EmailProvider | null;
}

function parseArgs(argv: string[]): ParsedArgs {
  const positional: string[] = [];
  let mode: ParsedArgs["mode"] = "minimal";
  let providerOverride: ParsedArgs["providerOverride"] = null;

  for (const a of argv) {
    if (a.startsWith("--mode=")) {
      const v = a.slice("--mode=".length);
      if (v === "minimal" || v === "styled") mode = v;
      else throw new Error(`Invalid --mode: ${v}`);
    } else if (a.startsWith("--provider=")) {
      const v = a.slice("--provider=".length).toLowerCase();
      if (v === "sender" || v === "mailersend") providerOverride = v;
      else throw new Error(`Invalid --provider: ${v}`);
    } else if (!a.startsWith("--")) {
      positional.push(a);
    }
  }

  const to = positional[0];
  if (!to || !to.includes("@")) {
    throw new Error(
      "Usage: npx tsx scripts/email-ping.ts <recipient-email> [--mode=minimal|styled] [--provider=sender|mailersend]"
    );
  }
  return { to, mode, providerOverride };
}

function buildHtml(mode: ParsedArgs["mode"]): { html: string; text: string } {
  if (mode === "styled") {
    const html = `<!DOCTYPE html><html><body style="font-family:Arial,Helvetica,sans-serif;color:#111">
<p>Bonjour,</p>
<p>Test de délivrabilité transactionnel.</p>
<p><a href="https://dojofinancier.com" style="color:#00a63e">dojofinancier.com</a></p>
<p>— Dojo Financier</p>
</body></html>`;
    const text =
      "Bonjour,\n\nTest de délivrabilité transactionnel.\n— Dojo Financier";
    return { html, text };
  }
  return {
    html: "<p>Transactional ping.</p>",
    text: "Transactional ping.",
  };
}

async function main() {
  const { to, mode, providerOverride } = parseArgs(process.argv.slice(2));

  if (providerOverride) {
    process.env.EMAIL_PROVIDER = providerOverride;
  }

  const provider = getActiveEmailProvider();
  const from = getDefaultFromAddress(provider);
  const { html, text } = buildHtml(mode);

  console.log(`→ provider: ${provider}`);
  console.log(`  from:     ${from.name} <${from.email}>`);
  console.log(`  to:       ${to}`);
  console.log(`  mode:     ${mode}`);

  const result = await sendTransactionalEmail({
    to: { email: to },
    subject: `Email ping (${provider}/${mode}) — ${new Date().toISOString()}`,
    html,
    text,
  });

  if (result.ok) {
    console.log(
      `← OK    providerMessageId=${result.providerMessageId ?? "(none returned)"}`
    );
    console.log(
      "  Check the provider's transactional logs and your inbox (incl. spam)."
    );
  } else {
    console.error(`← ERROR [${result.provider}] ${result.error}`);
    process.exit(1);
  }
}

main().catch((e) => {
  console.error("ERROR:", e instanceof Error ? e.message : e);
  process.exit(1);
});
