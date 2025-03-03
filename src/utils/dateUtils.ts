/**
 * Add months to a given date
 * @param date The starting date
 * @param months Number of months to add
 * @returns A new Date object with months added
 */
export function addMonths(date: Date, months: number): Date {
  const newDate = new Date(date);
  newDate.setMonth(newDate.getMonth() + months);
  return newDate;
}

/**
 * Check if the first date is after the second date
 * @param date1 The first date to compare
 * @param date2 The second date to compare (defaults to current date)
 * @returns Boolean indicating if date1 is after date2
 */
export function isAfter(date1: Date, date2: Date = new Date()): boolean {
  return date1.getTime() > date2.getTime();
}

/**
 * Get the difference in months between two dates
 * @param date1 The first date
 * @param date2 The second date (defaults to current date)
 * @returns Number of months between the dates
 */
export function monthsDifference(date1: Date, date2: Date = new Date()): number {
  const yearDiff = date2.getFullYear() - date1.getFullYear();
  const monthDiff = date2.getMonth() - date1.getMonth();
  return yearDiff * 12 + monthDiff;
}

/**
 * Format a date to a readable string
 * @param date The date to format
 * @param locale Optional locale (defaults to 'en-US')
 * @returns Formatted date string
 */
export function formatDate(date: Date, locale: string = 'en-US'): string {
  return date.toLocaleDateString(locale, {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}
