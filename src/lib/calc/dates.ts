/**
 * Calendar-date helpers.
 *
 * A "date" here is a plain "YYYY-MM-DD" string. We anchor every parse to UTC
 * noon before doing arithmetic, which means daylight-saving transitions can
 * never push a date across a midnight boundary and silently move a bill.
 */

import type { ISODate } from './types';

const MS_PER_DAY = 86_400_000;

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export function isValidISODate(value: string): boolean {
  if (!ISO_DATE.test(value)) return false;
  const [y, m, d] = value.split('-').map(Number);
  if (m < 1 || m > 12 || d < 1 || d > 31) return false;
  const probe = new Date(Date.UTC(y, m - 1, d, 12));
  return probe.getUTCFullYear() === y && probe.getUTCMonth() === m - 1 && probe.getUTCDate() === d;
}

/** Parse "YYYY-MM-DD" to a Date at UTC noon. Throws on garbage, loudly. */
export function parseDate(value: ISODate): Date {
  if (!isValidISODate(value)) {
    throw new Error(`Not a valid calendar date: "${value}". Expected YYYY-MM-DD.`);
  }
  const [y, m, d] = value.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d, 12));
}

export function toISODate(date: Date): ISODate {
  return date.toISOString().slice(0, 10);
}

export function addDays(value: ISODate, days: number): ISODate {
  return toISODate(new Date(parseDate(value).getTime() + days * MS_PER_DAY));
}

/** Whole days from `from` to `to`. Negative when `to` is earlier. */
export function daysBetween(from: ISODate, to: ISODate): number {
  return Math.round((parseDate(to).getTime() - parseDate(from).getTime()) / MS_PER_DAY);
}

export function isBefore(a: ISODate, b: ISODate): boolean {
  return daysBetween(a, b) > 0;
}

export function isSameOrAfter(a: ISODate, b: ISODate): boolean {
  return daysBetween(b, a) >= 0;
}

/** True when `date` falls in [start, end), which is how every window here works. */
export function isInWindow(date: ISODate, start: ISODate, end: ISODate): boolean {
  return daysBetween(start, date) >= 0 && daysBetween(date, end) > 0;
}

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MONTHS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

/** "Fri, Aug 15" — short form for lists and timelines. */
export function formatShortDate(value: ISODate): string {
  const d = parseDate(value);
  return `${WEEKDAYS[d.getUTCDay()].slice(0, 3)}, ${MONTHS[d.getUTCMonth()]} ${d.getUTCDate()}`;
}

/** "Friday, August 15" — long form for the hero cards. */
export function formatLongDate(value: ISODate): string {
  const d = parseDate(value);
  const month = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ][d.getUTCMonth()];
  return `${WEEKDAYS[d.getUTCDay()]}, ${month} ${d.getUTCDate()}`;
}

/** "in 4 days" / "tomorrow" / "today" / "2 days ago" — plain language, no jargon. */
export function relativeDays(from: ISODate, to: ISODate): string {
  const n = daysBetween(from, to);
  if (n === 0) return 'today';
  if (n === 1) return 'tomorrow';
  if (n === -1) return 'yesterday';
  if (n > 1) return `in ${n} days`;
  return `${Math.abs(n)} days ago`;
}
