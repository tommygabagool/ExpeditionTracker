import type { Workout } from './builder';
import {
  getTrip,
  isTaperWeek,
  PHASE_HOURS,
  PHASE_PACK_LB,
  phaseOf,
  programWeeks,
  type TripConfig,
  type TripStyle,
} from './schedule';

// Trip personalization — a read-time transform over the stock program. The
// seeded program_days rows stay the untouched 26-week base; getWorkout pipes
// every read through personalizeWorkout, so completions (keyed on date) and
// the seed data never move. Node-safe: imports schedule + builder types only.

const round5 = (x: number) => Math.round(x / 5) * 5;
const round100 = (x: number) => Math.round(x / 100) * 100;

const PACK_RAMP = [0.7, 0.85, 1.0] as const;
const GAIN_RAMP = [0.45, 0.7, 1.0] as const;
const STOCK_GAIN_FT = [1500, 2500, 3500] as const;
const Z2_MIN = [60, 75, 90] as const;
const THR_MIN = [40, 50, 60] as const;

export interface RuckRx {
  packLb: number;
  hours: string;
  gainFt: number;
}

/** Saturday-ruck prescription for a phase — pure, so onboarding can preview
 *  a trip before it's saved. Ramps to the trip pack (+10 lb margin over the
 *  stated weight) and biggest-day gain; stock numbers when fields are blank. */
export function ruckRxFor(trip: TripConfig | null, phaseIdx: 0 | 1 | 2): RuckRx {
  const packLb = trip?.packWeightLb
    ? round5(Math.max(20, PACK_RAMP[phaseIdx] * (trip.packWeightLb + 10)))
    : PHASE_PACK_LB[phaseIdx];
  const gainFt = trip?.biggestDayGainFt
    ? round100(GAIN_RAMP[phaseIdx] * trip.biggestDayGainFt)
    : STOCK_GAIN_FT[phaseIdx];
  const hours = trip?.biggestDayGainFt
    ? gainFt < 2000
      ? '2–3 h'
      : gainFt < 3000
        ? '3–5 h'
        : '5–7 h'
    : PHASE_HOURS[phaseIdx];
  return { packLb, hours, gainFt };
}

export function ruckRx(week: number): RuckRx {
  return ruckRxFor(getTrip(), phaseOf(week).idx);
}

// Full exercise swaps by trip style, keyed by the exact builder name. A swap
// without a name keeps the movement and changes only the prescription.
// trail (and no style) = the stock program's movements.
const STYLE_SWAPS: Record<Exclude<TripStyle, 'trail'>, Record<string, { name?: string; detail: string }>> = {
  technical: {
    'Weighted Pull-Up': { detail: '5×5' },
    'Single-Arm DB Row': { name: 'Dead Hang', detail: '3×45 s' },
    'Box Step-Down': { detail: '4×10/leg' },
    'Standing Calf Raise': { name: 'Single-Leg Calf Raise', detail: '3×12/leg' },
    'Weighted Sit-Up': { name: 'Copenhagen Plank', detail: '3×30 s/side' },
  },
  expedition: {
    'Weighted Step-Up': { detail: '4×10/leg' },
    'Farmer Carry': { detail: '6×40 m' },
    'Weighted Plank': { detail: '4×60 s' },
    'Walking Lunge': { name: 'Suitcase Carry', detail: '4×40 m' },
  },
};

/**
 * Apply the trip to one day's workout — identity when no trip is set. Order
 * matters: cardio minutes are renormalized to the DERIVED phase of the week
 * first (seeded rows bake the stock 26-week phasing), then the altitude bump,
 * the Saturday rx rewrite, and the style swaps.
 */
export function personalizeWorkout(week: number, w: Workout): Workout {
  const trip = getTrip();
  if (!trip) return w;

  const idx = phaseOf(week).idx;
  const anchored = isTaperWeek(programWeeks()); // a valid trip date re-anchored the calendar
  const altitude = trip.maxAltitudeFt != null && trip.maxAltitudeFt >= 12000;
  const rx = w.type === 'ruck' ? ruckRx(week) : null;
  const swaps = trip.style && trip.style !== 'trail' ? STYLE_SWAPS[trip.style] : null;

  const exercises = w.exercises.map((ex) => {
    let { name, detail } = ex;
    if (name === 'Incline Treadmill') {
      const base = anchored ? Z2_MIN[idx] : parseInt(detail, 10) || Z2_MIN[idx];
      detail = detail.replace(/^\d+/, String(base + (altitude ? 15 : 0)));
    } else if (name === 'Stairmill' && anchored) {
      detail = detail.replace(/^\d+/, String(THR_MIN[idx]));
    } else if (rx && name === 'Ruck Pack') {
      detail = rx.packLb + ' lb';
    } else if (rx && name === 'Duration') {
      detail = rx.hours;
    } else if (rx && name === 'Elevation Gain') {
      detail = rx.gainFt.toLocaleString('en-US') + ' ft';
    } else if (swaps?.[name]) {
      const swap = swaps[name];
      detail = swap.detail;
      name = swap.name ?? name;
    }
    return name === ex.name && detail === ex.detail ? ex : { name, detail };
  });
  return { ...w, exercises };
}
