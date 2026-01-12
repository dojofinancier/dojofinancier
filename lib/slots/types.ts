export type Duration = 60 | 90 | 120

export interface TimeSlot {
  courseId: string
  startDatetime: Date
  availableDurations: Array<{
    minutes: Duration
    price: number
  }>
}

export interface AvailabilityWindow {
  startDatetime: Date
  endDatetime: Date
}

export interface CourseAvailability {
  courseId: string
  windows: AvailabilityWindow[]
}

export interface BookedSlot {
  courseId: string | null
  startDatetime: Date
  endDatetime: Date
}

export const SLOT_GRID_MINUTES = 30
export const LEAD_TIME_HOURS = 12 // Minimum hours in advance to book
export const MAX_ADVANCE_DAYS = 120 // Maximum days in advance (4 months)
export const CANCELLATION_CUTOFF_HOURS = 2

export const VALID_DURATIONS: Duration[] = [60, 90, 120]




