import { isDeloadWeek } from './schedule';
import {
  type Anchor,
  BW_RATIO,
  CALIBRATION_NEW_MODIFIER,
  epley1RM,
  type Experience,
  incrementFor,
  LIFTS,
  type LoadKind,
  parseSetsReps,
  pctOfMax,
  roundLoad,
  DELOAD_LOAD_FACTOR,
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

/** The most recent logged attempt for an exercise, summarized for progression. */
export interface LastAttempt {
  workingWeight: number; // added-load lifts: the ADDED weight (0 = bodyweight)
  hitAll: boolean; // every prescribed set reached its rep target
  fractionReps: number; // total reps done / total prescribed (0..1)
}

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
  return prev.workingWeight; // partial miss (incl. two in a row) → hold
}

function labelFor(weight: number, load: LoadKind): string {
  if (load === 'added') return weight === 0 ? 'BW' : `+${weight} lb`;
  if (load === 'db_pair') return `${weight} lb/hand`;
  return `${weight} lb`;
}

/**
 * Suggested working weight for one program exercise, or null if it doesn't get
 * a suggestion (accessory / carry / core, or profile not yet seeded for a
 * needed anchor). `detail` is the builder's "4×5" string; `week` drives the
 * deload cut; `last` (if present) is real logged data and overrides the seed.
 */
export function suggestFor(
  name: string,
  detail: string,
  maxes: AnchorMaxes | null,
  week: number,
  last?: LastAttempt,
): Suggestion | null {
  const meta = LIFTS[name];
  if (!meta) return null;
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

/** UI convenience: resolve the exercise's last attempt from a map, then suggest. */
export function suggestForExercise(
  name: string,
  detail: string,
  maxes: AnchorMaxes | null,
  week: number,
  lastAttempts: Record<string, LastAttempt>,
): Suggestion | null {
  const meta = LIFTS[name];
  const last = meta ? lastAttempts[meta.id] : undefined;
  return suggestFor(name, detail, maxes, week, last);
}
