/**
 * Date and time normalization utilities for agenda and reminders synchronization.
 */

/**
 * Normalizes any date string (ISO, French DD/MM/YYYY, timestamp) to standard YYYY-MM-DD.
 */
export function normalizeDateKey(dateVal?: string | number | Date | null): string {
  if (!dateVal) return '';

  if (dateVal instanceof Date) {
    if (isNaN(dateVal.getTime())) return '';
    return dateVal.toISOString().split('T')[0];
  }

  const str = String(dateVal).trim();
  if (!str) return '';

  // Standard YYYY-MM-DD prefix (matches 2026-09-04, 2026-09-04T12:00:00Z, etc.)
  if (/^\d{4}-\d{2}-\d{2}/.test(str)) {
    return str.slice(0, 10);
  }

  // French / European date: DD/MM/YYYY or DD-MM-YYYY
  const ddmmyyyy = str.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
  if (ddmmyyyy) {
    const day = ddmmyyyy[1].padStart(2, '0');
    const month = ddmmyyyy[2].padStart(2, '0');
    const year = ddmmyyyy[3];
    return `${year}-${month}-${day}`;
  }

  // European short year: DD/MM/YY
  const ddmmyy = str.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2})$/);
  if (ddmmyy) {
    const day = ddmmyy[1].padStart(2, '0');
    const month = ddmmyy[2].padStart(2, '0');
    const year = `20${ddmmyy[3]}`;
    return `${year}-${month}-${day}`;
  }

  // Try Date parsing as fallback
  const parsed = new Date(str);
  if (!isNaN(parsed.getTime())) {
    return parsed.toISOString().split('T')[0];
  }

  return '';
}

/**
 * Ensures a valid date string YYYY-MM-DD is always returned, defaulting to today.
 */
export function ensureValidDate(dateVal?: string | number | Date | null): string {
  const norm = normalizeDateKey(dateVal);
  if (norm) return norm;
  return new Date().toISOString().split('T')[0];
}

/**
 * Ensures a valid time string HH:MM is always returned, defaulting to '09:00'.
 */
export function ensureValidTime(timeVal?: string | null): string {
  if (!timeVal) return '09:00';
  const trimmed = String(timeVal).trim();
  const match = trimmed.match(/^(\d{1,2})[:hH](\d{2})?/);
  if (match) {
    const h = match[1].padStart(2, '0');
    const m = (match[2] || '00').padStart(2, '0');
    return `${h}:${m}`;
  }
  return '09:00';
}

/**
 * Returns an array of YYYY-MM-DD strings spanning between startDate and endDate.
 */
export function getDateRangeDays(startDate: string, endDate?: string, maxDays = 60): string[] {
  const startKey = normalizeDateKey(startDate);
  if (!startKey) return [];

  const endKey = endDate ? normalizeDateKey(endDate) : '';
  if (!endKey || endKey <= startKey) {
    return [startKey];
  }

  const result: string[] = [];
  try {
    const curr = new Date(startKey);
    const end = new Date(endKey);
    let count = 0;
    while (curr <= end && count < maxDays) {
      result.push(curr.toISOString().split('T')[0]);
      curr.setDate(curr.getDate() + 1);
      count++;
    }
  } catch {
    return [startKey];
  }

  return result.length > 0 ? result : [startKey];
}
