/**
 * Weekly cadence and send-time helpers for Accompagnement check-ins.
 *
 * Fixed cadence per PRD §6.1:
 *   Mon/Tue/Wed/Fri/Sat → LIGHT
 *   Thu                 → MID_WEEK
 *   Sun                 → WEEKLY (quiz + review + plan)
 *
 * All logic runs against America/Toronto (Eastern Time). Send time is
 * configured per product (AccompagnementProduct.sendTime = "HH:MM").
 */

import { CheckInType } from "@prisma/client";
import { formatInEasternTime, toEasternTime } from "@/lib/utils/timezone";

/**
 * Returns the scheduled check-in type for a given date, evaluating the
 * weekday in America/Toronto.
 */
export function getCheckInTypeForDate(date: Date): CheckInType {
  // day-of-week via Eastern time (0 = Sun ... 6 = Sat)
  const weekdayStr = formatInEasternTime(date, "i"); // ISO: 1=Mon..7=Sun
  const iso = parseInt(weekdayStr, 10);
  switch (iso) {
    case 1: // Monday
    case 2: // Tuesday
    case 3: // Wednesday
    case 5: // Friday
    case 6: // Saturday
      return "LIGHT";
    case 4: // Thursday
      return "MID_WEEK";
    case 7: // Sunday
      return "WEEKLY";
    default:
      return "LIGHT";
  }
}

/**
 * Returns true when `now` in ET is within the minute of `sendTime` (HH:MM).
 * Cron granularity is hourly, so we compare hours only by default and
 * require the minute to be within the same hour window.
 */
export function isSendTimeNow(sendTime: string, now: Date = new Date()): boolean {
  const [targetH] = sendTime.split(":").map((n) => parseInt(n, 10));
  if (Number.isNaN(targetH)) return false;
  const currentH = parseInt(formatInEasternTime(now, "H"), 10);
  return currentH === targetH;
}

/**
 * Returns the current hour in ET (0-23) — used by the cron to match
 * `AccompagnementProduct.sendTime`.
 */
export function getCurrentEasternHour(now: Date = new Date()): number {
  return parseInt(formatInEasternTime(now, "H"), 10);
}

/**
 * Returns the Sunday that starts the week containing `date` (in ET),
 * normalized to 00:00 ET. Used to key WeeklyPlan / WeeklyReview rows.
 */
export function getEasternWeekStart(date: Date): Date {
  const eastern = toEasternTime(date);
  const day = eastern.getDay(); // 0 = Sunday
  const monday = new Date(eastern);
  // We treat Sunday as the start of the week per PRD (weekly quiz on Sunday)
  monday.setDate(eastern.getDate() - day);
  monday.setHours(0, 0, 0, 0);
  return monday;
}
