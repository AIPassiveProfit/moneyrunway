/**
 * Money helpers. Everything in, and out, is integer cents.
 *
 * We do not use a money library. Integer cents plus these six functions cover
 * every case in this app, and code you can read in one sitting is worth more
 * than a dependency you have to trust.
 */

import type { Cents } from './types';

/** Round to whole cents, away from zero, so we never leak fractions of a cent. */
export function toCents(value: number): Cents {
  return value < 0 ? -Math.round(-value) : Math.round(value);
}

/** Reserves round UP. Under-reserving is the dangerous direction. */
export function ceilCents(value: number): Cents {
  return value < 0 ? -Math.ceil(-value) : Math.ceil(value);
}

/** Convert dollars (from a form input) to cents, safely. */
export function dollarsToCents(dollars: number): Cents {
  return toCents(dollars * 100);
}

/** The hero number: whole dollars, rounded DOWN. Optimism here costs real money. */
export function floorToDollarCents(cents: Cents): Cents {
  return Math.floor(cents / 100) * 100;
}

/** A percentage stored as basis points. 2500 bps = 25%. */
export function applyBps(cents: Cents, bps: number): Cents {
  return ceilCents((cents * bps) / 10_000);
}

const USD = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const USD_WHOLE = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

/** "$1,450.00" */
export function formatCents(cents: Cents): string {
  return USD.format(cents / 100);
}

/** "$47" — for the Safe to Spend number, where cents are noise. */
export function formatWholeDollars(cents: Cents): string {
  return USD_WHOLE.format(cents / 100);
}

/** "−$415.00" with a real minus sign, for breakdown rows. */
export function formatSignedCents(cents: Cents): string {
  return cents < 0 ? `−${formatCents(Math.abs(cents))}` : formatCents(cents);
}
