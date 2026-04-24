/**
 * MailerSend REST API — transactional send (no template).
 * @see https://developers.mailersend.com/api/v1/email.html
 *
 * Endpoint: POST https://api.mailersend.com/v1/email
 * Auth:     Authorization: Bearer <MAILERSEND_API_TOKEN>
 * Success:  HTTP 202 Accepted (empty body). Message id returned in X-Message-Id header.
 * Errors:
 *   - 422 — validation errors: { message, errors: { field: [..] } }
 *   - 400 — bad request with message
 *   - 401 — unauthorized
 *   - 429 — rate-limited
 *   - 5xx — transient
 */

const MAILERSEND_SEND_URL = "https://api.mailersend.com/v1/email";

export interface MailerSendPayload {
  from: { email: string; name: string };
  to: { email: string; name?: string };
  subject: string;
  html: string;
  text: string;
  replyTo?: { email: string; name?: string };
}

export type MailerSendResult =
  | { ok: true; messageId: string | null }
  | { ok: false; error: string };

function getMailerSendToken(): string {
  const token = process.env.MAILERSEND_API_TOKEN;
  if (!token?.trim()) {
    throw new Error(
      "Missing MAILERSEND_API_TOKEN environment variable. Create a token under Integrations → API tokens in MailerSend."
    );
  }
  return token.trim();
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function truncateDetail(s: string, max = 800): string {
  const t = s.replace(/\s+/g, " ").trim();
  return t.length <= max ? t : `${t.slice(0, max)}…`;
}

/**
 * Extract a human-readable error from MailerSend's JSON error shape.
 * MailerSend returns:
 *   { "message": "The given data was invalid.", "errors": { "from.email": ["..."] } }
 */
function formatMailerSendError(
  status: number,
  statusText: string,
  rawText: string
): string {
  let parsed: unknown;
  try {
    parsed = rawText ? JSON.parse(rawText) : null;
  } catch {
    parsed = null;
  }
  const obj =
    parsed && typeof parsed === "object"
      ? (parsed as Record<string, unknown>)
      : null;

  const topMessage =
    (obj?.message != null && String(obj.message)) ||
    (obj?.error != null && String(obj.error)) ||
    "";

  const errors =
    obj && typeof obj.errors === "object" && obj.errors !== null
      ? (obj.errors as Record<string, unknown>)
      : null;

  const fieldDetails: string[] = [];
  if (errors) {
    for (const [field, messages] of Object.entries(errors)) {
      const list = Array.isArray(messages) ? messages : [messages];
      for (const m of list) {
        fieldDetails.push(`${field}: ${String(m)}`);
      }
    }
  }

  const detail = [topMessage, ...fieldDetails].filter(Boolean).join(" | ");
  if (detail) return `${status} ${statusText}: ${detail}`;
  if (rawText) return `${status} ${statusText} — ${truncateDetail(rawText)}`;
  return `${status} ${statusText}`;
}

/**
 * POST https://api.mailersend.com/v1/email
 *
 * Note: MailerSend expects `to` as an **array** of recipients, unlike Sender.
 * Retries 502/503/504/429 with exponential backoff.
 */
export async function sendMailerSendTransactionalEmail(
  payload: MailerSendPayload
): Promise<MailerSendResult> {
  const toEntry: Record<string, string> = { email: payload.to.email };
  if (payload.to.name?.trim()) toEntry.name = payload.to.name.trim();

  const body: Record<string, unknown> = {
    from: payload.from,
    to: [toEntry],
    subject: payload.subject,
    html: payload.html,
    text: payload.text,
  };

  if (payload.replyTo?.email) {
    body.reply_to = payload.replyTo.name?.trim()
      ? { email: payload.replyTo.email, name: payload.replyTo.name.trim() }
      : { email: payload.replyTo.email };
  }

  const maxAttempts = 3;
  let lastError = "Unknown error";

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    let res: Response;
    try {
      res = await fetch(MAILERSEND_SEND_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${getMailerSendToken()}`,
          "Content-Type": "application/json",
          Accept: "application/json",
          "X-Requested-With": "XMLHttpRequest",
        },
        body: JSON.stringify(body),
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      lastError = msg;
      if (attempt < maxAttempts) {
        await sleep(400 * attempt);
        continue;
      }
      return { ok: false, error: msg };
    }

    const rawText = await res.text();

    if (!res.ok) {
      const retryable =
        res.status === 502 ||
        res.status === 503 ||
        res.status === 504 ||
        res.status === 429;
      lastError = formatMailerSendError(res.status, res.statusText, rawText);

      if (retryable && attempt < maxAttempts) {
        await sleep(600 * attempt);
        continue;
      }
      return { ok: false, error: lastError };
    }

    // Success path: 202 Accepted. The message id is returned in a response header.
    const messageId =
      res.headers.get("x-message-id") ||
      res.headers.get("X-Message-Id") ||
      null;
    return { ok: true, messageId };
  }

  return { ok: false, error: lastError };
}
