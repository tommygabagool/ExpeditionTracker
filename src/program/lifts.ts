// Weight-suggestion reference data. All numbers are researched picks — see
// docs/weight-suggestions.md for sources (RPE/RIR chart, ExRx/Strength Level
// standards, StrongLifts/Starting Strength increments). Conservative by
// design: seeds land near "untrained" for New and "novice" for Trained.

export type Anchor = 'squat' | 'deadlift' | 'press' | 'row';
export type Experience = 'new' | 'returning' | 'trained';
export type Equipment = 'full_gym' | 'dumbbells' | 'home_minimal';

export type LoadKind =
  | 'barbell' // one bar, round 5, floor 45
  | 'db_pair' // per-hand load (factor is the two-hand total, we halve it)
  | 'db_single' // one dumbbell
  | 'added'; // bodyweight movement, suggestion is ADDED load (starts at 0)

export interface LiftMeta {
  id: string;
  anchor: Anchor | null; // null = no 1RM anchor (added-load movements)
  factor: number; // × anchor working-max (movement ratio)
  load: LoadKind;
  body: 'upper' | 'lower';
}

// Keyed by the exact exercise name emitted by src/program/builder.ts. Names
// not present here get no weight suggestion (accessories/carries/core stay as
// plain text) — that's intentional, not an omission.
export const LIFTS: Record<string, LiftMeta> = {
  'Back Squat': { id: 'back_squat', anchor: 'squat', factor: 1.0, load: 'barbell', body: 'lower' },
  'Front Squat': { id: 'front_squat', anchor: 'squat', factor: 0.8, load: 'barbell', body: 'lower' },
  Deadlift: { id: 'deadlift', anchor: 'deadlift', factor: 1.0, load: 'barbell', body: 'lower' },
  'Romanian Deadlift': {
    id: 'romanian_deadlift',
    anchor: 'deadlift',
    factor: 0.8,
    load: 'barbell',
    body: 'lower',
  },
  'Overhead Press': { id: 'overhead_press', anchor: 'press', factor: 1.0, load: 'barbell', body: 'upper' },
  'Barbell Row': { id: 'barbell_row', anchor: 'row', factor: 1.0, load: 'barbell', body: 'upper' },
  // Rougher derived DB estimates — flagged for a second look.
  'Incline DB Bench': { id: 'incline_db_bench', anchor: 'press', factor: 1.15, load: 'db_pair', body: 'upper' },
  'Single-Arm DB Row': { id: 'single_arm_db_row', anchor: 'row', factor: 0.55, load: 'db_single', body: 'upper' },
  // Bodyweight + added load: start at bodyweight, earn load through logging.
  'Weighted Pull-Up': { id: 'weighted_pull_up', anchor: null, factor: 0, load: 'added', body: 'upper' },
  'Weighted Dip': { id: 'weighted_dip', anchor: null, factor: 0, load: 'added', body: 'upper' },
};

// Seed working-max as a fraction of bodyweight, used only when a lift is NOT
// calibrated in onboarding. Experience is expressed by the column (so no extra
// modifier is applied on this path). Trimmed for a heavy lifter: New ≈ ExRx
// "untrained", Trained ≈ "novice".
export const BW_RATIO: Record<Anchor, Record<Experience, number>> = {
  squat: { new: 0.5, returning: 0.65, trained: 0.8 },
  deadlift: { new: 0.6, returning: 0.75, trained: 0.9 },
  press: { new: 0.3, returning: 0.38, trained: 0.45 },
  row: { new: 0.4, returning: 0.5, trained: 0.6 },
};

// Extra safety cushion applied ONLY to a New lifter's calibrated estimate
// (form-under-load margin). Returning/Trained calibrations are used as-is; the
// RIR self-report + Epley-on-submaximal already bake in conservatism.
export const CALIBRATION_NEW_MODIFIER = 0.9;

// % of working-max by rep target — the RPE-8 / 2-reps-in-reserve column of the
// standard RPE→%1RM chart, matching the calibration prompt ("2-3 in the tank").
export function pctOfMax(reps: number): number {
  if (reps <= 5) return 0.8;
  if (reps === 6) return 0.775;
  if (reps <= 8) return 0.725;
  if (reps <= 10) return 0.675;
  if (reps <= 12) return 0.625;
  return 0.575;
}

// Deload weeks cut load 15% (conservative end of 10-15%); the program already
// cuts these weeks to 2 sets, so this pairs a load cut with the volume cut.
export const DELOAD_LOAD_FACTOR = 0.85;

/** Per-session progression step (lb): lower +10, upper +5 (StrongLifts/SS). */
export function incrementFor(meta: LiftMeta): number {
  return meta.body === 'lower' ? 10 : 5;
}

/** Epley 1RM from a submaximal set. Reps=8 for calibration. */
export function epley1RM(weight: number, reps: number): number {
  return weight * (1 + reps / 30);
}

export function roundLoad(weightLb: number, load: LoadKind): number {
  const to5 = Math.round(weightLb / 5) * 5;
  switch (load) {
    case 'barbell':
      return Math.max(45, to5); // empty olympic bar floor
    case 'db_pair':
    case 'db_single':
      return Math.max(10, to5);
    case 'added':
      return Math.max(0, to5);
  }
}

/** Parse "4×5" / "3×8" → { sets, reps }. Null for non SxR details (carries, time). */
export function parseSetsReps(detail: string): { sets: number; reps: number } | null {
  const m = detail.match(/^(\d+)\s*[×x]\s*(\d+)\b/);
  if (!m) return null;
  return { sets: parseInt(m[1], 10), reps: parseInt(m[2], 10) };
}
