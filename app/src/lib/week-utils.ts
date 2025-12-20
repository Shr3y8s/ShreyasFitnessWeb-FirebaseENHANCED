// Utility functions for week calculations (Sun-Sat weeks)

/**
 * Get the Sunday (week start) for a given date
 */
export function getWeekStartDate(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day; // Subtract days to get to Sunday
  const sunday = new Date(d.setDate(diff));
  sunday.setHours(0, 0, 0, 0);
  return sunday;
}

/**
 * Get the Saturday (week end) for a given date
 */
export function getWeekEndDate(date: Date): Date {
  const sunday = getWeekStartDate(date);
  const saturday = new Date(sunday);
  saturday.setDate(sunday.getDate() + 6);
  saturday.setHours(23, 59, 59, 999);
  return saturday;
}

/**
 * Format date as YYYY-MM-DD (ISO format for storage)
 * Uses local timezone to avoid UTC conversion issues
 */
export function formatDateISO(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Format week range as "Dec 20-26, 2025"
 */
export function formatWeekRange(sundayDate: Date): string {
  const saturday = new Date(sundayDate);
  saturday.setDate(sundayDate.getDate() + 6);
  
  const startMonth = sundayDate.toLocaleDateString('en-US', { month: 'short' });
  const startDay = sundayDate.getDate();
  const endDay = saturday.getDate();
  const year = sundayDate.getFullYear();
  
  return `${startMonth} ${startDay}-${endDay}, ${year}`;
}

/**
 * Get the 4 weeks for display (2 past, current, 1 future)
 * Returns array of Sunday dates as ISO strings
 */
export function get4Weeks(referenceDate: Date = new Date()): string[] {
  const currentWeekStart = getWeekStartDate(referenceDate);
  const weeks: string[] = [];
  
  // 2 weeks ago
  const twoWeeksAgo = new Date(currentWeekStart);
  twoWeeksAgo.setDate(currentWeekStart.getDate() - 14);
  weeks.push(formatDateISO(twoWeeksAgo));
  
  // Last week
  const lastWeek = new Date(currentWeekStart);
  lastWeek.setDate(currentWeekStart.getDate() - 7);
  weeks.push(formatDateISO(lastWeek));
  
  // This week
  weeks.push(formatDateISO(currentWeekStart));
  
  // Next week
  const nextWeek = new Date(currentWeekStart);
  nextWeek.setDate(currentWeekStart.getDate() + 7);
  weeks.push(formatDateISO(nextWeek));
  
  return weeks;
}

/**
 * Get current week's Sunday as ISO string
 */
export function getCurrentWeekISO(referenceDate: Date = new Date()): string {
  return formatDateISO(getWeekStartDate(referenceDate));
}

/**
 * Get week label (e.g., "THIS WEEK", "Last week", "Next week")
 */
export function getWeekLabel(weekStartISO: string, referenceDate: Date = new Date()): string {
  const currentWeekISO = getCurrentWeekISO(referenceDate);
  const weekDate = new Date(weekStartISO);
  const currentDate = new Date(currentWeekISO);
  
  const diffDays = Math.round((weekDate.getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) return 'THIS WEEK';
  if (diffDays === -7) return 'Last week';
  if (diffDays === -14) return '2 weeks ago';
  if (diffDays === 7) return 'Next week';
  if (diffDays < 0) return `${Math.abs(diffDays / 7)} weeks ago`;
  return `${diffDays / 7} weeks ahead`;
}

/**
 * Check if a week is in the past
 */
export function isWeekInPast(weekStartISO: string, referenceDate: Date = new Date()): boolean {
  const currentWeekISO = getCurrentWeekISO(referenceDate);
  return weekStartISO < currentWeekISO;
}

/**
 * Check if a week is the current week
 */
export function isCurrentWeek(weekStartISO: string, referenceDate: Date = new Date()): boolean {
  const currentWeekISO = getCurrentWeekISO(referenceDate);
  return weekStartISO === currentWeekISO;
}

/**
 * Parse a human-readable week range back to ISO date
 * e.g., "Week of Dec 20-26, 2025" -> "2025-12-20"
 */
export function parseWeekRange(weekRange: string): string | null {
  try {
    // Extract the date part after "Week of "
    const cleaned = weekRange.replace(/^Week of /, '').split('-')[0].trim();
    const parsed = new Date(cleaned);
    if (!isNaN(parsed.getTime())) {
      return formatDateISO(getWeekStartDate(parsed));
    }
  } catch (e) {
    console.error('Error parsing week range:', e);
  }
  return null;
}
