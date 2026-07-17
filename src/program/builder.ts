import {
  isDeloadWeek,
  PHASE_GAIN_FT,
  PHASE_HOURS,
  PHASE_PACK_LB,
  phaseOf,
  STOCK_PROGRAM_WEEKS,
} from './schedule';

// Ported verbatim from the design file's `workoutFor` — the program's source
// of truth. The app reads program_days from SQLite when seeded, with this as
// the offline/pre-seed fallback (both produce identical output).

export type SessionType = 'strength' | 'cardio' | 'ruck';

export interface Exercise {
  name: string;
  detail: string;
}

export interface Workout {
  title: string;
  type: SessionType;
  exercises: Exercise[];
}

export function workoutFor(week: number, dow: number): Workout {
  const p = phaseOf(week).idx;
  const z2 = [60, 75, 90][p];
  const thr = [40, 50, 60][p];
  const pack = PHASE_PACK_LB[p];
  const hrs = PHASE_HOURS[p];
  const gain = PHASE_GAIN_FT[p];
  switch (dow) {
    case 0:
      return {
        title: 'Lower A',
        type: 'strength',
        exercises: [
          { name: 'Back Squat', detail: '4×5' },
          { name: 'Romanian Deadlift', detail: '3×8' },
          { name: 'Weighted Step-Up', detail: '3×10/leg' },
          { name: 'Standing Calf Raise', detail: '3×15' },
          { name: 'Hanging Knee Raise', detail: '3×12' },
        ],
      };
    case 1:
      return {
        title: 'Upper Pull B',
        type: 'strength',
        exercises: [
          { name: 'Weighted Pull-Up', detail: '4×5' },
          { name: 'Barbell Row', detail: '4×8' },
          { name: 'Single-Arm DB Row', detail: '3×10' },
          { name: 'Face Pull', detail: '3×15' },
          { name: 'Farmer Carry', detail: '4×40 m' },
        ],
      };
    case 2:
      return {
        title: 'Zone 2 Cardio',
        type: 'cardio',
        exercises: [
          { name: 'Incline Treadmill', detail: z2 + ' min · 10–12%' },
          { name: 'Heart Rate Cap', detail: '130–145 bpm' },
          { name: 'Hip + Ankle Mobility', detail: '15 min' },
        ],
      };
    case 3:
      return {
        title: 'Lower / Full C',
        type: 'strength',
        exercises: [
          { name: 'Deadlift', detail: '4×5' },
          { name: 'Front Squat', detail: '3×6' },
          { name: 'Walking Lunge', detail: '3×12/leg' },
          { name: 'Box Step-Down', detail: '3×10/leg' },
          { name: 'Weighted Plank', detail: '3×60 s' },
        ],
      };
    case 4:
      return {
        title: 'Threshold Cardio',
        type: 'cardio',
        exercises: [
          { name: 'Stairmill', detail: thr + ' min · 145–155 bpm' },
          { name: 'Cooldown Walk', detail: '10 min' },
          { name: 'Calf + Quad Stretch', detail: '10 min' },
        ],
      };
    case 5:
      return {
        title: 'Upper Push + Core D',
        type: 'strength',
        exercises: [
          { name: 'Overhead Press', detail: '4×5' },
          { name: 'Incline DB Bench', detail: '3×8' },
          { name: 'Weighted Dip', detail: '3×10' },
          { name: 'Pallof Press', detail: '3×12/side' },
          { name: 'Weighted Sit-Up', detail: '3×15' },
        ],
      };
    default:
      return {
        title: 'Long Hike / Ruck',
        type: 'ruck',
        exercises: [
          { name: 'Ruck Pack', detail: pack + ' lb' },
          { name: 'Duration', detail: hrs },
          { name: 'Elevation Gain', detail: gain + ' ft' },
          { name: 'Fuel on the Move', detail: '200–300 kcal/h' },
        ],
      };
  }
}

// One generated day, in the shape scripts/seed-program.ts writes to program_days.
export interface ProgramDaySeed {
  week: number; // 1-26
  day: number; // 0 = Sunday … 6 = Saturday
  phase: string;
  isDeload: boolean;
  title: string;
  blocks: { type: SessionType; exercises: Exercise[] };
}

export function buildProgram(): ProgramDaySeed[] {
  const out: ProgramDaySeed[] = [];
  // Always the stock 26 weeks — the seed output must stay byte-stable
  // regardless of any configured trip (personalization is read-time only).
  for (let week = 1; week <= STOCK_PROGRAM_WEEKS; week++) {
    for (let day = 0; day < 7; day++) {
      const w = workoutFor(week, day);
      out.push({
        week,
        day,
        phase: phaseOf(week).name,
        isDeload: isDeloadWeek(week),
        title: w.title,
        blocks: { type: w.type, exercises: w.exercises },
      });
    }
  }
  return out;
}
