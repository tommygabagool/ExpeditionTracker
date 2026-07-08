// Bar-loading arithmetic for Session Mode: plate math per side and the
// warm-up ramp shown above the working sets of barbell lifts.

export const BAR_LB = 45;

/** Standard plate denominations, heaviest first. */
const PLATES = [45, 35, 25, 10, 5, 2.5] as const;

/**
 * Greedy per-side plate breakdown for a barbell total. Null when the load is
 * the empty bar or less (nothing to load).
 */
export function platesPerSide(totalLb: number): number[] | null {
  let side = (totalLb - BAR_LB) / 2;
  if (side <= 0) return null;
  const out: number[] = [];
  for (const p of PLATES) {
    while (side >= p - 0.01) {
      out.push(p);
      side -= p;
    }
  }
  return out;
}

export interface RampStep {
  label: string; // "BAR" | "60%" | "80%"
  weight: number;
  reps: number;
}

/**
 * Warm-up ramp for a barbell working weight: empty bar ×10, then 60% ×5 and
 * 80% ×3 where they land meaningfully between the bar and the work weight
 * (each step rounded to 5 lb, duplicates collapsed).
 */
export function warmupRamp(workLb: number): RampStep[] {
  const steps: RampStep[] = [{ label: 'BAR', weight: BAR_LB, reps: 10 }];
  for (const { pct, label, reps } of [
    { pct: 0.6, label: '60%', reps: 5 },
    { pct: 0.8, label: '80%', reps: 3 },
  ]) {
    const w = Math.round((workLb * pct) / 5) * 5;
    const prev = steps[steps.length - 1].weight;
    if (w > prev && w < workLb) steps.push({ label, weight: w, reps });
  }
  return steps;
}
