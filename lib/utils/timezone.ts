/**
 * Timezone utilities for consistent Eastern Time handling
 * All dates should be stored in UTC in the database but displayed/compared in Eastern Time
 */

import { toZonedTime, fromZonedTime, formatInTimeZone } from "date-fns-tz";
import { fr } from "date-fns/locale";

export const EASTERN_TIMEZONE = "America/Toronto"; // Eastern Time (handles EST/EDT automatically)

function appointmentInstant(date: Date | string): Date {
  return date instanceof Date ? date : new Date(date);
}

/** Long French date + time for 1:1 appointments (always America/Toronto). */
export function formatAppointmentDateTimeFr(date: Date | string): string {
  return formatInEasternTime(appointmentInstant(date), "d MMMM yyyy, HH:mm", { locale: fr });
}

/** Short French date for appointment lists. */
export function formatAppointmentDateShortFr(date: Date | string): string {
  return formatInEasternTime(appointmentInstant(date), "d MMM yyyy", { locale: fr });
}

/** Time only (French locale) in Eastern. */
export function formatAppointmentTimeFr(date: Date | string): string {
  return formatInEasternTime(appointmentInstant(date), "HH:mm", { locale: fr });
}

/** Weekday + calendar date in Eastern (booking summaries). */
export function formatAppointmentWeekdayDateFr(date: Date | string): string {
  return formatInEasternTime(appointmentInstant(date), "EEEE d MMMM yyyy", { locale: fr });
}

/** Month and year label in Eastern (booking calendars). */
export function formatAppointmentMonthYearFr(date: Date | string): string {
  return formatInEasternTime(appointmentInstant(date), "MMMM yyyy", { locale: fr });
}

/**
 * Get current date/time in Eastern Time zone
 * Use this instead of new Date() for date comparisons
 */
export function getEasternNow(): Date {
  const now = new Date();
  // Get the current time in Eastern, then convert back to UTC for comparison
  // This ensures we're comparing dates in Eastern time context
  const easternNow = toZonedTime(now, EASTERN_TIMEZONE);
  return fromZonedTime(easternNow, EASTERN_TIMEZONE);
}

/**
 * Convert a UTC date to Eastern Time for display/comparison
 */
export function toEasternTime(date: Date): Date {
  return toZonedTime(date, EASTERN_TIMEZONE);
}

/**
 * Convert an Eastern Time date to UTC for storage
 */
export function fromEasternTime(date: Date): Date {
  return fromZonedTime(date, EASTERN_TIMEZONE);
}

/**
 * Format a date in Eastern Time zone
 */
export function formatInEasternTime(
  date: Date,
  formatStr: string,
  options?: { locale?: any }
): string {
  return formatInTimeZone(date, EASTERN_TIMEZONE, formatStr, options);
}

/**
 * Get start of day in Eastern Time
 */
export function getEasternStartOfDay(date: Date): Date {
  const easternDate = toZonedTime(date, EASTERN_TIMEZONE);
  easternDate.setHours(0, 0, 0, 0);
  return fromZonedTime(easternDate, EASTERN_TIMEZONE);
}

/**
 * Get end of day in Eastern Time
 */
export function getEasternEndOfDay(date: Date): Date {
  const easternDate = toZonedTime(date, EASTERN_TIMEZONE);
  easternDate.setHours(23, 59, 59, 999);
  return fromZonedTime(easternDate, EASTERN_TIMEZONE);
}

/**
 * Check if a date is in the past (using Eastern Time)
 */
export function isPastInEastern(date: Date): boolean {
  const easternNow = getEasternNow();
  const easternDate = toZonedTime(date, EASTERN_TIMEZONE);
  const easternNowZoned = toZonedTime(easternNow, EASTERN_TIMEZONE);
  return easternDate < easternNowZoned;
}

/**
 * Check if a date is in the future (using Eastern Time)
 */
export function isFutureInEastern(date: Date): boolean {
  const easternNow = getEasternNow();
  const easternDate = toZonedTime(date, EASTERN_TIMEZONE);
  const easternNowZoned = toZonedTime(easternNow, EASTERN_TIMEZONE);
  return easternDate > easternNowZoned;
}




