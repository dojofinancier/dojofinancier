/**
 * Weekday constants for consistent day naming across the application
 * Uses JavaScript Date.getDay() format (0 = Sunday, 1 = Monday, ..., 6 = Saturday)
 */
export const WEEKDAYS = [
  { id: 0, name: 'Dimanche', short: 'Dim', letter: 'D' },
  { id: 1, name: 'Lundi', short: 'Lun', letter: 'L' },
  { id: 2, name: 'Mardi', short: 'Mar', letter: 'M' },
  { id: 3, name: 'Mercredi', short: 'Mer', letter: 'M' },
  { id: 4, name: 'Jeudi', short: 'Jeu', letter: 'J' },
  { id: 5, name: 'Vendredi', short: 'Ven', letter: 'V' },
  { id: 6, name: 'Samedi', short: 'Sam', letter: 'S' }
] as const

/**
 * Get weekday by ID (0-6)
 */
export function getWeekdayById(id: number) {
  return WEEKDAYS.find(day => day.id === id)
}




