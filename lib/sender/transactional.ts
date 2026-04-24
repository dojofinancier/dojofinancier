/**
 * Sender.net REST API — transactional send (no template).
 * @see https://api.sender.net/transactional-campaigns/send-transactional/
 * @see https://api.sender.net/authentication
 */

const SENDER_MESSAGE_SEND_URL = "https://api.sender.net/v2/message/send";

export interface SenderTransactionalPayload {
  from: { email: string; name: string };
  to: { email: string; name?: string };
  subject: string;
  html: string;
  text: string;
}

export type SenderSendResult =
  | { ok: true; emailId: string | null }
  | { ok: false; error: string };

function getSenderToken(): string {
  const token = process.env.SENDER_API_TOKEN;
  if (!token?.trim()) {
    throw new Error(
      "Missing SENDER_API_TOKEN environment variable. Create a token under Settings → API access tokens in Sender.net."
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
 * POST https://api.sender.net/v2/message/send
 *
 * A **502 Bad Gateway** almost always means Sender’s edge/origin (or a proxy)
 * failed — not your JSON shape (that’s usually 4xx). Retries help with brief outages.
 */
export async function sendSenderTransactionalEmail(
  payload: SenderTransactionalPayload
): Promise<SenderSendResult> {
  const body: Record<string, unknown> = {
    from: payload.from,
    to: {
      email: payload.to.email,
      ...(payload.to.name?.trim()
        ? { name: payload.to.name.trim() }
        : {}),
    },
    subject: payload.subject,
    html: payload.html,
    text: payload.text,
  };

  const maxAttempts = 3;
  let lastError = "Unknown error";

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    let res: Response;
    try {
      res = await fetch(SENDER_MESSAGE_SEND_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${getSenderToken()}`,
          "Content-Type": "application/json",
          Accept: "application/json",
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
    let data: unknown;
    try {
      data = rawText ? JSON.parse(rawText) : null;
    } catch {
      data = null;
    }

    const obj =
      data && typeof data === "object"
        ? (data as Record<string, unknown>)
        : null;

    if (!res.ok) {
      const fromJson =
        (obj?.message != null && String(obj.message)) ||
        (obj?.error != null && String(obj.error));
      const detail =
        fromJson ||
        (rawText ? truncateDetail(rawText) : "") ||
        `${res.status} ${res.statusText}`;
      lastError = `${res.status} ${res.statusText}${fromJson ? `: ${fromJson}` : rawText ? ` — ${truncateDetail(rawText)}` : ""}`;

      const retryable = res.status === 502 || res.status === 503 || res.status === 504;
      if (retryable && attempt < maxAttempts) {
        await sleep(600 * attempt);
        continue;
      }

      return { ok: false, error: detail };
    }

    if (obj?.success === false) {
      const message =
        (obj.message != null && String(obj.message)) ||
        "Sender API returned success: false";
      return { ok: false, error: message };
    }

    const emailId = obj?.emailId != null ? String(obj.emailId) : null;
    return { ok: true, emailId };
  }

  return { ok: false, error: lastError };
}
