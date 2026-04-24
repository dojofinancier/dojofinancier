/**
 * Provider-agnostic transactional email dispatcher.
 *
 * Select the active provider with `EMAIL_PROVIDER` (defaults to `sender` for
 * backward compatibility). The active provider's From address is resolved from
 * its own env vars so each provider can send from the domain it has verified:
 *
 *   EMAIL_PROVIDER=sender
 *     SENDER_API_TOKEN=...
 *     SENDER_CHECKIN_FROM_EMAIL=checkin@dojofinancier.com
 *     SENDER_CHECKIN_FROM_NAME="Dojo Financier — Suivi"
 *
 *   EMAIL_PROVIDER=mailersend
 *     MAILERSEND_API_TOKEN=...
 *     MAILERSEND_CHECKIN_FROM_EMAIL=checkin@tx.dojofinancier.com
 *     MAILERSEND_CHECKIN_FROM_NAME="Dojo Financier — Suivi"
 *
 * The unified `sendTransactionalEmail` return shape is:
 *   { ok: true, providerMessageId: string | null, provider: "sender" | "mailersend" }
 *   { ok: false, error: string, provider: "sender" | "mailersend" }
 */

import { sendSenderTransactionalEmail } from "@/lib/sender/transactional";
import { sendMailerSendTransactionalEmail } from "@/lib/mailersend/transactional";

export type EmailProvider = "sender" | "mailersend";

export interface TransactionalEmailInput {
  to: { email: string; name?: string };
  subject: string;
  html: string;
  text: string;
  /** Optional override. If omitted, provider-specific From env vars are used. */
  from?: { email: string; name: string };
  replyTo?: { email: string; name?: string };
}

export type TransactionalEmailResult =
  | {
      ok: true;
      provider: EmailProvider;
      providerMessageId: string | null;
    }
  | {
      ok: false;
      provider: EmailProvider;
      error: string;
    };

export function getActiveEmailProvider(): EmailProvider {
  const raw = (process.env.EMAIL_PROVIDER || "sender").trim().toLowerCase();
  if (raw === "mailersend") return "mailersend";
  if (raw === "sender") return "sender";
  throw new Error(
    `Unsupported EMAIL_PROVIDER "${raw}". Use "sender" or "mailersend".`
  );
}

/**
 * Returns the default From address for the given provider, falling back to the
 * legacy SENDER_* vars so existing deployments keep working.
 */
export function getDefaultFromAddress(provider: EmailProvider): {
  email: string;
  name: string;
} {
  const name =
    (provider === "mailersend"
      ? process.env.MAILERSEND_CHECKIN_FROM_NAME
      : process.env.SENDER_CHECKIN_FROM_NAME) ||
    process.env.SENDER_CHECKIN_FROM_NAME ||
    "Dojo Financier — Suivi";

  const email =
    (provider === "mailersend"
      ? process.env.MAILERSEND_CHECKIN_FROM_EMAIL
      : process.env.SENDER_CHECKIN_FROM_EMAIL) ||
    (provider === "mailersend"
      ? "checkin@tx.dojofinancier.com"
      : "checkin@dojofinancier.com");

  return { email: email.trim(), name: name.trim() };
}

export async function sendTransactionalEmail(
  input: TransactionalEmailInput
): Promise<TransactionalEmailResult> {
  const provider = getActiveEmailProvider();
  const from = input.from ?? getDefaultFromAddress(provider);

  if (provider === "mailersend") {
    const result = await sendMailerSendTransactionalEmail({
      from,
      to: input.to,
      subject: input.subject,
      html: input.html,
      text: input.text,
      replyTo: input.replyTo,
    });
    if (!result.ok) {
      return { ok: false, provider, error: result.error };
    }
    return {
      ok: true,
      provider,
      providerMessageId: result.messageId,
    };
  }

  const result = await sendSenderTransactionalEmail({
    from,
    to: input.to,
    subject: input.subject,
    html: input.html,
    text: input.text,
  });
  if (!result.ok) {
    return { ok: false, provider, error: result.error };
  }
  return {
    ok: true,
    provider,
    providerMessageId: result.emailId,
  };
}
