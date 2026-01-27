/**
 * Date utility functions to handle timezone-aware date operations
 * All functions work in user's local timezone to avoid UTC conversion issues
 */

/**
 * Get today's date in YYYY-MM-DD format (local timezone)
 * @returns Date string like "2026-01-26"
 */
export function getTodayLocal(): string {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Format date string for display (handles local timezone)
 * @param dateStr - YYYY-MM-DD format
 * @returns Formatted date like "Monday, January 26, 2026"
 */
export function formatDateForDisplay(dateStr: string): string {
  if (!dateStr) return '';
  const [year, month, day] = dateStr.split('-');
  const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  });
}

/**
 * Get day of week from date string
 * @param dateStr - YYYY-MM-DD format
 * @returns Day name like "Monday"
 */
export function getDayOfWeek(dateStr: string): string {
  const [year, month, day] = dateStr.split('-');
  const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
  return date.toLocaleDateString('en-US', { weekday: 'long' });
}

/**
 * Get date N days ago in YYYY-MM-DD format (local timezone)
 * @param days - Number of days to go back
 * @returns Date string like "2026-01-20"
 */
export function getDaysAgo(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() - days);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Convert any date to YYYY-MM-DD format (local timezone)
 * @param date - Date object or timestamp
 * @returns Date string like "2026-01-26"
 */
export function formatDateISO(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Create ISO timestamp at midnight local time from YYYY-MM-DD string
 * Used for sending calendar dates to backend with proper timezone
 * @param dateStr - Date string in YYYY-MM-DD format
 * @returns ISO string with timezone like "2026-01-30T00:00:00-08:00"
 */
export function createMidnightTimestamp(dateStr: string): string {
  const [year, month, day] = dateStr.split('-');
  const date = new Date(
    parseInt(year), 
    parseInt(month) - 1, 
    parseInt(day),
    0, 0, 0, 0  // Midnight in user's local timezone
  );
  return date.toISOString();  // Includes timezone offset
}
