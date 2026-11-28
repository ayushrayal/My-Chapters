/**
 * Date utilities for date-only strings (YYYY-MM-DD).
 * Guarantees zero timezone offset drift and eliminates UTC midnight boundary bugs.
 */

export function padZero(n) {
  return String(n).padStart(2, '0');
}

/**
 * Returns today's date formatted as YYYY-MM-DD in the user's local timezone.
 * @param {Date} [dateObj=new Date()]
 * @returns {string} YYYY-MM-DD
 */
export function getLocalDateString(dateObj = new Date()) {
  const y = dateObj.getFullYear();
  const m = padZero(dateObj.getMonth() + 1);
  const d = padZero(dateObj.getDate());
  return `${y}-${m}-${d}`;
}

/**
 * Parses YYYY-MM-DD string as a local Date object set to noon (12:00:00).
 * Noon prevents any daylight savings shift or midnight edge from altering the date.
 * @param {string} dateStr - YYYY-MM-DD
 * @returns {Date}
 */
export function parseLocalDate(dateStr) {
  if (!dateStr || typeof dateStr !== 'string') return new Date();
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1, 12, 0, 0);
}

/**
 * Adds or subtracts days from a YYYY-MM-DD string in local time.
 * @param {string} dateStr - YYYY-MM-DD
 * @param {number} offsetDays
 * @returns {string} YYYY-MM-DD
 */
export function addDaysToDateString(dateStr, offsetDays) {
  const dateObj = parseLocalDate(dateStr);
  dateObj.setDate(dateObj.getDate() + offsetDays);
  return getLocalDateString(dateObj);
}

/**
 * Returns an array of YYYY-MM-DD strings from startDate to endDate inclusive.
 * @param {string} startDateStr - YYYY-MM-DD
 * @param {string} endDateStr - YYYY-MM-DD
 * @returns {string[]} Array of YYYY-MM-DD strings
 */
export function getDateRangeArray(startDateStr, endDateStr) {
  if (!startDateStr) return [];
  if (!endDateStr || endDateStr < startDateStr) return [startDateStr];

  const dates = [];
  let curr = parseLocalDate(startDateStr);
  const end = parseLocalDate(endDateStr);

  while (curr <= end) {
    dates.push(getLocalDateString(curr));
    curr.setDate(curr.getDate() + 1);
  }
  return dates;
}

/**
 * Formats YYYY-MM-DD string for display (e.g. "Sat, Nov 28, 2026")
 * @param {string} dateStr - YYYY-MM-DD
 * @param {Intl.DateTimeFormatOptions} [options]
 * @returns {string}
 */
export function formatDisplayDate(
  dateStr,
  options = { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }
) {
  if (!dateStr) return '';
  const dateObj = parseLocalDate(dateStr);
  return dateObj.toLocaleDateString('en-US', options);
}
