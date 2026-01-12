import { prisma } from "@/lib/prisma";
import {
  type TimeSlot,
  type AvailabilityWindow,
  type CourseAvailability,
  type BookedSlot,
  SLOT_GRID_MINUTES,
  LEAD_TIME_HOURS,
  MAX_ADVANCE_DAYS,
  VALID_DURATIONS,
} from "./types";
import {
  addDays,
  addMinutes,
  startOfDay,
  endOfDay,
  isBefore,
  isAfter,
  isEqual,
  format,
  set,
} from "date-fns";
import { fromZonedTime, toZonedTime } from "date-fns-tz";
import { EASTERN_TIMEZONE } from "@/lib/utils/timezone";

/**
 * Get available slots for a course within a date range
 */
export async function getAvailableSlots(
  courseId: string,
  fromDate: Date,
  toDate: Date
): Promise<TimeSlot[]> {
  // 1. Get course data
  const course = await prisma.course.findUnique({
    where: { id: courseId },
    select: {
      id: true,
      appointmentHourlyRate: true,
    },
  });

  if (!course) {
    return [];
  }

  if (!course.appointmentHourlyRate || course.appointmentHourlyRate.toNumber() === 0) {
    return [];
  }

  const hourlyRate = course.appointmentHourlyRate.toNumber();

  // 2. Get availability for this course
  const availability = await getCourseAvailability(courseId, fromDate, toDate);

  // 3. Get all booked slots (appointments) for this course
  const bookedSlots = await getBookedSlots(courseId, fromDate, toDate);

  // 4. Generate slots
  const slots = generateSlotsForCourse(
    availability,
    courseId,
    bookedSlots,
    hourlyRate
  );

  // 5. Sort by start time
  return slots.sort((a, b) => a.startDatetime.getTime() - b.startDatetime.getTime());
}

/**
 * Get availability windows for a course
 */
async function getCourseAvailability(
  courseId: string,
  fromDate: Date,
  toDate: Date
): Promise<CourseAvailability> {
  // Get recurring availability rules
  const rules = await prisma.availabilityRule.findMany({
    where: {
      OR: [
        { courseId: courseId },
        { courseId: null }, // Rules for all courses
      ],
    },
    orderBy: [
      { weekday: "asc" },
      { startTime: "asc" },
    ],
  });

  // Get exceptions
  const exceptions = await prisma.availabilityException.findMany({
    where: {
      OR: [
        { courseId: courseId },
        { courseId: null }, // Exceptions for all courses
      ],
      AND: [
        {
          startDate: {
            lt: toDate,
          },
        },
        {
          endDate: {
            gt: fromDate,
          },
        },
      ],
    },
  });

  const windows: AvailabilityWindow[] = [];

  // Generate windows from recurring rules
  let currentDate = startOfDay(fromDate);
  const endDate = endOfDay(toDate);

  while (isBefore(currentDate, endDate)) {
    const weekday = currentDate.getDay();

    // Check for exceptions first
    const dateExceptions = exceptions.filter((ex) => {
      const currentDateStr = format(currentDate, "yyyy-MM-dd");
      const exceptionStartEastern = startOfDay(toZonedTime(ex.startDate, EASTERN_TIMEZONE));
      const exceptionEndEastern = startOfDay(toZonedTime(ex.endDate, EASTERN_TIMEZONE));
      const exceptionStartStr = format(exceptionStartEastern, "yyyy-MM-dd");
      const exceptionEndStr = format(exceptionEndEastern, "yyyy-MM-dd");

      return currentDateStr >= exceptionStartStr && currentDateStr <= exceptionEndStr;
    });

    if (dateExceptions.length > 0) {
      // Check if any exception makes this day unavailable
      const unavailableExceptions = dateExceptions.filter((ex) => ex.isUnavailable);
      if (unavailableExceptions.length > 0) {
        // Skip this day - unavailable
        currentDate = addDays(currentDate, 1);
        continue;
      }
      // If there are available exceptions (overrides), skip regular rules for now
      // (We could implement time-specific exceptions later)
      currentDate = addDays(currentDate, 1);
      continue;
    } else {
      // Use regular rules for this weekday
      const dayRules = rules.filter((rule) => rule.weekday === weekday);
      dayRules.forEach((rule) => {
        const start = parseDateTimeFromParts(currentDate, rule.startTime);
        const end = parseDateTimeFromParts(currentDate, rule.endTime);
        windows.push({ startDatetime: start, endDatetime: end });
      });
    }

    currentDate = addDays(currentDate, 1);
  }

  return {
    courseId,
    windows,
  };
}

/**
 * Get all booked slots (appointments) for a course
 */
async function getBookedSlots(
  courseId: string,
  fromDate: Date,
  toDate: Date
): Promise<BookedSlot[]> {
  // Get appointments that overlap with the date range
  // An appointment overlaps if: start < toDate AND (start + duration) > fromDate
  // We'll fetch a wider range and filter in code to check actual overlap
  const appointments = await prisma.appointment.findMany({
    where: {
      courseId,
      status: {
        in: ["PENDING", "CONFIRMED", "COMPLETED"],
      },
      // Fetch appointments that start before toDate (they might extend into our range)
      scheduledAt: {
        lt: toDate,
      },
    },
    select: {
      courseId: true,
      scheduledAt: true,
      durationMinutes: true,
    },
  });

  // Filter to only include appointments that actually overlap
  return appointments
    .map((apt) => ({
      courseId: apt.courseId || null,
      startDatetime: apt.scheduledAt,
      endDatetime: new Date(apt.scheduledAt.getTime() + apt.durationMinutes * 60 * 1000),
    }))
    .filter((slot) => {
      // Check if slot overlaps with date range
      return isBefore(slot.startDatetime, toDate) && isAfter(slot.endDatetime, fromDate);
    });
}

/**
 * Generate slots for a course
 */
function generateSlotsForCourse(
  availability: CourseAvailability,
  courseId: string,
  bookedSlots: BookedSlot[],
  hourlyRate: number
): TimeSlot[] {
  const slots: TimeSlot[] = [];
  const now = new Date();
  const minStartTime = addMinutes(now, LEAD_TIME_HOURS * 60);
  const maxStartTime = addDays(now, MAX_ADVANCE_DAYS);

  for (const window of availability.windows) {
    let currentSlotStart = window.startDatetime;

    // Snap to grid
    const minutes = currentSlotStart.getMinutes();
    const gridOffset = minutes % SLOT_GRID_MINUTES;
    if (gridOffset !== 0) {
      currentSlotStart = addMinutes(
        currentSlotStart,
        SLOT_GRID_MINUTES - gridOffset
      );
    }

    // Generate slots on the grid
    while (isBefore(currentSlotStart, window.endDatetime)) {
      // Check lead time and max advance constraints
      if (
        isBefore(currentSlotStart, minStartTime) ||
        isAfter(currentSlotStart, maxStartTime)
      ) {
        currentSlotStart = addMinutes(currentSlotStart, SLOT_GRID_MINUTES);
        continue;
      }

      // Calculate which durations fit in the remaining window
      const availableDurations = VALID_DURATIONS.filter((duration) => {
        const slotEnd = addMinutes(currentSlotStart, duration);
        // Check both that slot fits in window AND is not booked
        return (
          (isBefore(slotEnd, window.endDatetime) || isEqual(slotEnd, window.endDatetime)) &&
          !isSlotBooked(currentSlotStart, slotEnd, bookedSlots)
        );
      });

      // If at least one duration is available, create a slot
      if (availableDurations.length > 0) {
        slots.push({
          courseId,
          startDatetime: currentSlotStart,
          availableDurations: availableDurations.map((duration) => ({
            minutes: duration,
            price: calculatePrice(hourlyRate, duration),
          })),
        });
      }

      currentSlotStart = addMinutes(currentSlotStart, SLOT_GRID_MINUTES);
    }
  }

  return slots;
}

/**
 * Calculate price for an appointment duration
 */
function calculatePrice(hourlyRate: number, durationMinutes: number): number {
  return (hourlyRate * durationMinutes) / 60;
}

/**
 * Check if a slot time is already booked
 */
function isSlotBooked(
  slotStart: Date,
  slotEnd: Date,
  bookedSlots: BookedSlot[]
): boolean {
  return bookedSlots.some((booked) =>
    isOverlapping(slotStart, slotEnd, booked.startDatetime, booked.endDatetime)
  );
}

/**
 * Check if two time ranges overlap
 */
function isOverlapping(
  start1: Date,
  end1: Date,
  start2: Date,
  end2: Date
): boolean {
  return isBefore(start1, end2) && isAfter(end1, start2);
}

/**
 * Parse a date-time from date and time string (HH:MM)
 * Times are interpreted as Eastern Time (EST/EDT)
 */
function parseDateTimeFromParts(date: Date, timeStr: string): Date {
  const [hours, minutes] = timeStr.split(":").map(Number);

  // Create date in Eastern Time zone
  const easternDate = toZonedTime(date, EASTERN_TIMEZONE);

  // Set the time in Eastern Time
  const dateWithTime = set(easternDate, {
    hours,
    minutes,
    seconds: 0,
    milliseconds: 0,
  });

  // Convert back to UTC for storage/comparison
  return fromZonedTime(dateWithTime, EASTERN_TIMEZONE);
}

