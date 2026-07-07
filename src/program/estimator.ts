import { isDeloadWeek } from './schedule';
import {
  type Anchor,
  BW_RATIO,
  CALIBRATION_NEW_MODIFIER,
  DELOAD_LOAD_FACTOR,
  epley1RM,
  type Equipment,
  type Experience,
  incrementFor,
  LIFTS,
  type LoadKind,
  parseSetsReps,
  pctOfMax,
  roundLoad,
} from './lifts';

export type AnchorMaxes = Record<Anchor, number>;

export interface ProfileSeed {
  bodyweightLb: number;
  experience: Experience;
  /** Per-anchor 8-rep calibration weight (2-3 RIR). Omit to fall back to BW ratio. */
  calibration?: Partial<Record<Anchor, number>>;
}

/**
 * Working-max per anchor — the seed the estimator prescribes from. Calibrated
 * lifts use Epley (with a New-only cushion); uncalibrated lifts use the
 * conservative bodyweight ratio for the given experience.
 */
export function anchorMaxes(p: ProfileSeed): AnchorMaxes {
  const anchors: Anchor[] = ['squat', 'deadlift', 'press', 'row'];
  const out = {} as AnchorMaxes;
  for (const a of anchors) {
    const cal = p.calibration?.[a];
    if (cal && cal > 0) {
      const raw = epley1RM(cal, 8);
      out[a] = p.experience === 'new' ? raw * CALIBRATION_NEW_MODIFIER : raw;
    } else {
      out[a] = p.bodyweightLb * BW_RATIO[a][p.experience];
    }
  }
  return out;
}

// ---- logged history ---------------------------------------------------------

export interface LoggedSet {
  set: number;
  weight: number; // added-load lifts: the ADDED weight (0 = bodyweight)
  reps: number;
  done?: boolean;
}

export interface ExerciseLogEntry {
  date: string; // yyyy-mm-dd
  repTarget: number;
  setTarget: number;
  suggestedWeightLb: number | null;
  sets: LoggedSet[];
}

/** The most recent logged attempt for an exercise, summarized for progression. */
export interface LastAttempt {
  workingWeight: number;
  hitAll: boolean; // every prescribed set reached its rep target
  fractionReps: number; // completed reps / prescribed reps (0..1)
}

/** Summarize one log entry; null when nothing in it was actually done. */
export function attemptFrom(entry: ExerciseLogEntry): LastAttempt | null {
  const done = entry.sets.filter((s) => s.done);
  if (done.length === 0) return null;
  const workingWeight = Math.max(...done.map((s) => s.weight));
  const hitSets = done.filter((s) => s.reps >= entry.repTarget).length;
  const prescribed = entry.repTarget * entry.setTarget;
  const total = done.reduce((acc, s) => acc + s.reps, 0);
  return {
    workingWeight,
    hitAll: hitSets >= entry.setTarget,
    fractionReps: prescribed > 0 ? Math.min(1, total / prescribed) : 0,
  };
}

/**
 * Most recent real attempt strictly BEFORE `dateKey` — today's in-progress log
 * must never feed today's own suggestion. `logs` arrays are date-descending.
 */
export function lastAttemptBefore(
  logs: Record<string, ExerciseLogEntry[]>,
  exerciseId: string,
  dateKey: string,
): LastAttempt | undefined {
  for (const entry of logs[exerciseId] ?? []) {
    if (entry.date >= dateKey) continue;
    const attempt = attemptFrom(entry);
    if (attempt) return attempt;
  }
  return undefined;
}

// ---- suggestion --------------------------------------------------------------

export interface Suggestion {
  exerciseId: string;
  weightLb: number;
  load: LoadKind;
  perHand: boolean;
  label: string; // e.g. "155 lb", "35 lb/hand", "BW", "+25 lb"
}

/** Self-correction: next working weight from the last attempt (overrides seed). */
function progress(prev: LastAttempt, increment: number): number {
  if (prev.hitAll) return prev.workingWeight + increment;
  if (prev.fractionReps < 0.5) return prev.workingWeight * 0.9; // bad miss → small deload
  return prev.workingWeight; // any lesser miss → hold
}

function labelFor(weight: number, load: LoadKind): string {
  if (load === 'added') return weight === 0 ? 'BW' : `+${weight} lb`;
  if (load === 'db_pair') return `${weight} lb/hand`;
  return `${weight} lb`;
}

/**
 * Suggested working weight for one program exercise, or null if it doesn't get
 * one (accessory/carry/core, missing seed, or the movement doesn't match the
 * available equipment). `last`, when present, is real logged data and
 * overrides the seed.
 */
export function suggestFor(
  name: string,
  detail: string,
  maxes: AnchorMaxes | null,
  week: number,
  last?: LastAttempt,
  equipment: Equipment = 'full_gym',
): Suggestion | null {
  const meta = LIFTS[name];
  if (!meta) return null;
  if (meta.load === 'barbell' && equipment !== 'full_gym') return null;
  if ((meta.load === 'db_pair' || meta.load === 'db_single') && equipment === 'home_minimal') {
    return null;
  }
  const sr = parseSetsReps(detail);
  if (!sr) return null;

  let base: number;
  if (meta.load === 'added') {
    base = last ? progress(last, incrementFor(meta)) : 0;
  } else {
    if (!maxes) return null;
    const anchorMax = maxes[meta.anchor!];
    let seed = anchorMax * meta.factor * pctOfMax(sr.reps);
    if (meta.load === 'db_pair') seed /= 2;
    base = last ? progress(last, incrementFor(meta)) : seed;
  }

  if (isDeloadWeek(week)) base *= DELOAD_LOAD_FACTOR;

  const weightLb = roundLoad(base, meta.load);
  return {
    exerciseId: meta.id,
    weightLb,
    load: meta.load,
    perHand: meta.load === 'db_pair',
    label: labelFor(weightLb, meta.load),
  };
}

export interface ProfileForSuggest {
  maxes: AnchorMaxes | null;
  equipment: Equipment;
}

/** UI entry point: resolve history for the viewed date, then suggest. */
export function suggestForExercise(
  name: string,
  detail: string,
  profile: ProfileForSuggest | null,
  week: number,
  logs: Record<string, ExerciseLogEntry[]>,
  dateKey: string,
): Suggestion | null {
  const meta = LIFTS[name];
  if (!meta) return null;
  const last = lastAttemptBefore(logs, meta.id, dateKey);
  return suggestFor(name, detail, profile?.maxes ?? null, week, last, profile?.equipment ?? 'full_gym');
}
