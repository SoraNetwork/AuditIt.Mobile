import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';

// Extend dayjs with plugins
dayjs.extend(utc);
dayjs.extend(timezone);

/**
 * Formats a UTC date string into the user's local time.
 * @param date The date string or Date object (assumed to be in UTC).
 * @param format The desired output format.
 * @returns The formatted date string in local time, or an empty string if the date is invalid.
 */
export const formatDateTime = (date: string | Date | null | undefined, format = 'YYYY-MM-DD HH:mm:ss'): string => {
  if (!date) {
    return '';
  }
  // Interpret the input as UTC and convert to local time for display
  const localTime = dayjs.utc(date).local();
  return localTime.isValid() ? localTime.format(format) : '';
};
