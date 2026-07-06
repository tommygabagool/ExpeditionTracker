import { palette } from '@/constants/theme';

// Program calendar. Day-by-day prescriptions come from src/program/builder.ts,
// seeded into program_days (scripts/seed-program.ts) with an in-code fallback.

export const PROGRAM_START = '2026-07-05'; // a Sunday; program weeks run Sun-Sat
export const PROGRAM_WEEKS = 26;
export const DELOAD_WEEKS = [5, 9, 14, 18, 23];

export interface PhaseInfo {
  name: 'BASE CAMP' | 'LOAD CAMP' | 'ALPINE PUSH';
  color: string;
  idx: 0 | 1 | 2;
}

export function phaseOf(week: number): PhaseInfo {
  if (week <= 9) return { name: 'BASE CAMP', color: palette.green, idx: 0 };
  if (week <= 18) return { name: 'LOAD CAMP', color: palette.blue, idx: 1 };
  return { name: 'ALPINE PUSH', color: palette.orange, idx: 2 };
}

export function isDeloadWeek(week: number): boolean {
  return DELOAD_WEEKS.includes(week);
}

// Saturday ruck prescription, indexed by phase.
export const PHASE_PACK_LB = [45, 55, 65] as const;
export const PHASE_HOURS = ['2–3 h', '3–5 h', '5–7 h'] as const;
export const PHASE_GAIN_FT = ['1,500', '2,500', '3,500'] as const;

/** Long-day elevation target used to match trail suggestions. */
export function targetGain(week: number): number {
  let g = 500 + ((week - 1) * (3500 - 500)) / 25;
  if (isDeloadWeek(week)) g *= 0.6;
  return g;
}

// ---- calendar helpers (local time, like the design) ------------------------

export function startDate(): Date {
  return new Date(2026, 6, 5);
}

export function todayDate(): Date {
  const t = new Date();
  t.setHours(0, 0, 0, 0);
  return t;
}

/** Date of (week 1-26, dow 0=Sunday). */
export function dateOf(week: number, dow: number): Date {
  const d = new Date(startDate());
  d.setDate(d.getDate() + (week - 1) * 7 + dow);
  return d;
}

/** yyyy-mm-dd key in local time. */
export function keyOf(d: Date): string {
  return (
    d.getFullYear() +
    '-' +
    String(d.getMonth() + 1).padStart(2, '0') +
    '-' +
    String(d.getDate()).padStart(2, '0')
  );
}

const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

export function fmtShort(d: Date): string {
  return MONTHS[d.getMonth()] + ' ' + String(d.getDate()).padStart(2, '0');
}

export const DAY_NAMES = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

/** Current program week, clamped to 1-26 (matches the design). */
export function currentWeek(): number {
  const days = Math.floor((todayDate().getTime() - startDate().getTime()) / 86400000);
  return Math.max(1, Math.min(PROGRAM_WEEKS, Math.floor(days / 7) + 1));
}

export function weekOfKey(key: string): number {
  const d = new Date(key + 'T00:00:00');
  return Math.floor((d.getTime() - startDate().getTime()) / 604800000) + 1;
}

export function nextSaturday(): Date {
  const t = todayDate();
  const d = new Date(t);
  d.setDate(d.getDate() + ((6 - t.getDay() + 7) % 7));
  return d;
}
