import { palette } from '@/constants/theme';

// Program calendar. Day-by-day prescriptions come from src/program/builder.ts,
// seeded into program_days (scripts/seed-program.ts) with an in-code fallback.
// The calendar is the stock 26 weeks until a trip (THE OBJECTIVE) re-anchors
// the end date — the start never moves, the trip date defines the END and the
// final week becomes a taper. Must stay Node-safe: theme is the only import
// (the seed scripts run this under tsx).

/** The stock calendar length — what the seeded program_days rows always hold. */
export const STOCK_PROGRAM_WEEKS = 26;
const STOCK_START = '2026-07-05'; // a Sunday; program weeks run Sun-Sat
/** Default program start for the Node seed script; the app anchors per-user
 *  off the enrollment start_date instead (see EnrollmentConfig). */
export const PROGRAM_START = STOCK_START;

// ---- enrollment (per-user program anchor) -----------------------------------
// Week number, phase colors, deloads and goals used to be global module
// constants. They now come from the signed-in user's enrollment, threaded in
// via configureSchedule(); the STOCK_* values are the fallback before one is
// loaded (and for the seed script).

/** Tunable program shape — sourced from a programs row's `params` jsonb (the
 *  versioned template), falling back to STOCK_PARAMS field by field. */
export interface ProgramParams {
  lengthWeeks: number;
  baseEnd: number; // last BASE CAMP week
  loadEnd: number; // last LOAD CAMP week
  deloads: number[];
  /** Multiplies the per-lift progression increment (1 = stock). */
  progressionScale: number;
}

/** Per-user weight targets — replaces the START/GOAL_WEIGHT_LB constants. */
export interface GoalParams {
  startWeightLb: number;
  goalWeightLb: number;
}

export interface EnrollmentConfig {
  /** yyyy-mm-dd, the week-1 anchor. Replaces the global PROGRAM_START. */
  startDate: string;
  /** The pinned program version (programs.id), or null → in-code fallback. */
  programId: string | null;
  params: ProgramParams;
  goals: GoalParams;
}

const STOCK_DELOADS = [5, 9, 14, 18, 23];
export const STOCK_PARAMS: ProgramParams = {
  lengthWeeks: STOCK_PROGRAM_WEEKS,
  baseEnd: 9,
  loadEnd: 18,
  deloads: STOCK_DELOADS,
  progressionScale: 1,
};
const STOCK_GOALS: GoalParams = { startWeightLb: 260, goalWeightLb: 230 };
const STOCK_ENROLLMENT: EnrollmentConfig = {
  startDate: STOCK_START,
  programId: null,
  params: STOCK_PARAMS,
  goals: STOCK_GOALS,
};

/** Merge a programs.params jsonb value onto the stock defaults, field by field
 *  (a template may set only some knobs). */
export function parseProgramParams(raw: unknown): ProgramParams {
  const p = raw && typeof raw === 'object' ? (raw as Partial<ProgramParams>) : {};
  return {
    lengthWeeks: typeof p.lengthWeeks === 'number' ? p.lengthWeeks : STOCK_PARAMS.lengthWeeks,
    baseEnd: typeof p.baseEnd === 'number' ? p.baseEnd : STOCK_PARAMS.baseEnd,
    loadEnd: typeof p.loadEnd === 'number' ? p.loadEnd : STOCK_PARAMS.loadEnd,
    deloads: Array.isArray(p.deloads) ? p.deloads : STOCK_PARAMS.deloads,
    progressionScale:
      typeof p.progressionScale === 'number' ? p.progressionScale : STOCK_PARAMS.progressionScale,
  };
}

// ---- trip objective ---------------------------------------------------------

export type TripStyle = 'trail' | 'technical' | 'expedition';

export interface TripConfig {
  name: string | null;
  /** yyyy-mm-dd. Defines the program END; null keeps the stock length. */
  date: string | null;
  style: TripStyle | null;
  biggestDayGainFt: number | null;
  packWeightLb: number | null;
  maxAltitudeFt: number | null;
}

export interface DerivedCalendar {
  weeks: number;
  baseEnd: number; // last BASE CAMP week
  loadEnd: number; // last LOAD CAMP week
  deloads: number[];
  /** Final week when trip-anchored (deload treatment, taper label); else null. */
  taperWeek: number | null;
}

let enrollment: EnrollmentConfig = STOCK_ENROLLMENT;
let currentTrip: TripConfig | null = null;

/** Pure over module state — exported so onboarding can preview a trip. No/
 *  invalid trip date → the enrollment's base calendar; otherwise the calendar
 *  is re-anchored to end at the trip date. */
export function deriveCalendar(trip: TripConfig | null): DerivedCalendar {
  const p = enrollment.params;
  const end = trip?.date ? new Date(trip.date + 'T00:00:00') : null;
  if (!end || isNaN(end.getTime())) {
    return { weeks: p.lengthWeeks, baseEnd: p.baseEnd, loadEnd: p.loadEnd, deloads: p.deloads, taperWeek: null };
  }
  // Last FULL week (Sun-Sat) that ends at or before the trip date — not the
  // week merely containing it, or the taper week's tail (including the
  // Saturday ruck) would fall after the user has already left. Clamped to
  // [8, 52] (52 = program_days check).
  const daysUntilTrip = Math.floor((end.getTime() - startDate().getTime()) / 86_400_000);
  const raw = Math.floor((daysUntilTrip - 6) / 7) + 1;
  const weeks = Math.max(8, Math.min(52, raw));
  // Proportional phases — reproduces the base 9/18 split at full length.
  const baseEnd = Math.round((weeks * p.baseEnd) / p.lengthWeeks);
  const loadEnd = Math.round((weeks * p.loadEnd) / p.lengthWeeks);
  // Week 5, then alternating +4/+5 gaps, never in the final two weeks —
  // reproduces [5, 9, 14, 18, 23] at 26.
  const deloads: number[] = [];
  for (let w = 5, gap = 4; w <= weeks - 2; w += gap, gap = gap === 4 ? 5 : 4) {
    deloads.push(w);
  }
  return { weeks, baseEnd, loadEnd, deloads, taperWeek: weeks };
}

let calendar: DerivedCalendar = deriveCalendar(null);

/** Point the calendar at a user's enrollment (start + params + goals) and
 *  trip, or back to stock. store.readProfile calls this on every profile read
 *  so the app and boot code see the signed-in user's program. */
export function configureSchedule(enr: EnrollmentConfig | null, trip: TripConfig | null): void {
  enrollment = enr ?? STOCK_ENROLLMENT;
  currentTrip = trip;
  calendar = deriveCalendar(trip);
}

export function getTrip(): TripConfig | null {
  return currentTrip;
}

/** Active weight targets — read by goals.ts's accessors. */
export function activeGoals(): GoalParams {
  return enrollment.goals;
}

/** The pinned program version to read day content from (null → in-code
 *  fallback / latest). Keeps a mid-program user on the version they started. */
export function enrolledProgramId(): string | null {
  return enrollment.programId;
}

/** Progression-increment multiplier for the active template (1 = stock). */
export function progressionScale(): number {
  return enrollment.params.progressionScale;
}

/** The week-1 anchor as a yyyy-mm-dd key (replaces the PROGRAM_START constant
 *  at call sites that need the string form). */
export function startDateKey(): string {
  return enrollment.startDate;
}

export function programWeeks(): number {
  return calendar.weeks;
}

export function deloadWeeks(): number[] {
  return calendar.deloads;
}

/** [baseEnd, loadEnd, weeks] — the last week of each phase. */
export function phaseEnds(): [number, number, number] {
  return [calendar.baseEnd, calendar.loadEnd, calendar.weeks];
}

export function phaseLen(idx: number): number {
  const [baseEnd, loadEnd, weeks] = phaseEnds();
  return idx === 0 ? baseEnd : idx === 1 ? loadEnd - baseEnd : weeks - loadEnd;
}

export interface PhaseInfo {
  name: 'BASE CAMP' | 'LOAD CAMP' | 'ALPINE PUSH';
  color: string;
  idx: 0 | 1 | 2;
}

export function phaseOf(week: number): PhaseInfo {
  if (week <= calendar.baseEnd) return { name: 'BASE CAMP', color: palette.green, idx: 0 };
  if (week <= calendar.loadEnd) return { name: 'LOAD CAMP', color: palette.blue, idx: 1 };
  return { name: 'ALPINE PUSH', color: palette.orange, idx: 2 };
}

/** Deload treatment: the listed deload weeks plus the trip taper week — the
 *  taper gets the 2-set cut, light loads and streak shield for free, but is
 *  NOT in deloadWeeks() (badge math counts only true deloads). */
export function isDeloadWeek(week: number): boolean {
  return calendar.deloads.includes(week) || week === calendar.taperWeek;
}

export function isTaperWeek(week: number): boolean {
  return week === calendar.taperWeek;
}

// Saturday ruck prescription, indexed by phase — the STOCK numbers. The
// trip-personalized prescription lives in src/program/trip.ts (ruckRx).
export const PHASE_PACK_LB = [45, 55, 65] as const;
export const PHASE_HOURS = ['2–3 h', '3–5 h', '5–7 h'] as const;
export const PHASE_GAIN_FT = ['1,500', '2,500', '3,500'] as const;

/** Long-day elevation target used to match trail suggestions. */
export function targetGain(week: number): number {
  const peak = currentTrip?.biggestDayGainFt ?? 3500;
  let g = 500 + ((week - 1) * (peak - 500)) / (programWeeks() - 1);
  if (isDeloadWeek(week)) g *= 0.6;
  return g;
}

// ---- calendar helpers (local time, like the design) ------------------------

export function startDate(): Date {
  const [y, m, d] = enrollment.startDate.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function todayDate(): Date {
  const t = new Date();
  t.setHours(0, 0, 0, 0);
  return t;
}

/** Date of (week 1-programWeeks, dow 0=Sunday). */
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

/** Program week containing a date, clamped to 1-programWeeks(). */
export function clampedWeekOf(d: Date): number {
  const raw = Math.floor((d.getTime() - startDate().getTime()) / 604800000) + 1;
  return Math.max(1, Math.min(programWeeks(), raw));
}

/** Current program week, clamped (matches the design). */
export function currentWeek(): number {
  return clampedWeekOf(todayDate());
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
