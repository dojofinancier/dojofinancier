import twilio from "twilio";
import type { CheckInType } from "@prisma/client";
import type { ChannelDispatchParams, ChannelDispatchResult } from "./types";

let client: ReturnType<typeof twilio> | null = null;

function getTwilioClient() {
  if (!client) {
    const sid = process.env.TWILIO_ACCOUNT_SID;
    const token = process.env.TWILIO_AUTH_TOKEN;
    if (!sid || !token) {
      throw new Error(
        "Missing TWILIO_ACCOUNT_SID or TWILIO_AUTH_TOKEN environment variable"
      );
    }
    client = twilio(sid, token);
  }
  return client;
}

function getFromNumber(): string {
  const from = process.env.TWILIO_FROM_NUMBER;
  if (!from) {
    throw new Error("Missing TWILIO_FROM_NUMBER environment variable");
  }
  return from;
}

const BODY_INTRO_BY_TYPE: Record<CheckInType, string> = {
  LIGHT: "Suivi quotidien",
  MID_WEEK: "Suivi quotidien mi-semaine",
  WEEKLY: "Bilan hebdomadaire",
  MISSED: "On reprend",
};

/**
 * Sends a tokenized SMS link. We keep the body short to stay within a single
 * SMS segment (160 chars GSM-7).
 */
export async function sendCheckInSms(
  params: ChannelDispatchParams
): Promise<ChannelDispatchResult> {
  if (!params.recipientPhoneE164) {
    return {
      success: false,
      providerMessageId: null,
      error: "Missing recipient phone number",
    };
  }

  const intro = BODY_INTRO_BY_TYPE[params.type];
  const code = params.courseCodeLabel?.trim();
  const head = code ? `${intro} ${code} - ` : `${intro} — `;
  const contextBudget = code ? 68 : 80;
  const body = `${head}${truncate(params.contextLine, contextBudget)}\n${params.shortUrl}`;

  try {
    const message = await getTwilioClient().messages.create({
      from: getFromNumber(),
      to: params.recipientPhoneE164,
      body,
    });
    return { success: true, providerMessageId: message.sid };
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("Failed to send check-in SMS:", msg);
    return { success: false, providerMessageId: null, error: msg };
  }
}

function truncate(s: string, n: number): string {
  if (s.length <= n) return s;
  return s.slice(0, n - 1).trimEnd() + "…";
}
