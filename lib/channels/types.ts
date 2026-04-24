import type { CheckInChannel, CheckInType } from "@prisma/client";

export interface ChannelDispatchParams {
  enrollmentId: string;
  dailyCheckInId: string;
  type: CheckInType;
  channel: CheckInChannel;
  recipientEmail: string;
  recipientName: string;
  recipientPhoneE164: string | null;
  checkInUrl: string;
  shortUrl: string;
  contextLine: string;
  examDate: Date | null;
  weekLabel?: string;
  /** Short course identifier for SMS (e.g. ERCI), uppercase — no "from" field on SMS. */
  courseCodeLabel?: string | null;
}

export interface ChannelDispatchResult {
  success: boolean;
  providerMessageId: string | null;
  error?: string;
}
