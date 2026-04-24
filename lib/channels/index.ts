import type { CheckInChannel } from "@prisma/client";
import type { ChannelDispatchParams, ChannelDispatchResult } from "./types";
import { sendCheckInEmail } from "./email";
import { sendCheckInSms } from "./sms";

export type { ChannelDispatchParams, ChannelDispatchResult } from "./types";

/**
 * Dispatches a check-in message over the enrollment's selected channel.
 */
export async function sendCheckInMessage(
  params: ChannelDispatchParams
): Promise<ChannelDispatchResult> {
  switch (params.channel as CheckInChannel) {
    case "EMAIL":
      return sendCheckInEmail(params);
    case "SMS":
      return sendCheckInSms(params);
    default:
      return {
        success: false,
        providerMessageId: null,
        error: `Unsupported channel: ${params.channel}`,
      };
  }
}

/**
 * Builds the public no-login check-in URL for a token.
 */
export function buildCheckInUrl(token: string): string {
  const base =
    process.env.APP_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    "http://localhost:3000";
  return `${base.replace(/\/$/, "")}/checkin/${token}`;
}

/**
 * Builds the short alias URL used for SMS (302 -> /checkin/:token).
 */
export function buildShortCheckInUrl(token: string): string {
  const base =
    process.env.APP_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    "http://localhost:3000";
  return `${base.replace(/\/$/, "")}/c/${token}`;
}
