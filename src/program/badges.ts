import type { AppData } from '@/data/store';
import { GOAL_WEIGHT_LB, START_WEIGHT_LB } from './goals';
import { deloadWeeks, phaseLen, phaseOf, programWeeks, weekOfKey } from './schedule';

// Achievement system ported verbatim from the design file. Badges are derived
// from logged data; earn dates persist in earned_badges (see app root).
// Phase and deload goals track the live calendar — the BADGE_DEFS literals
// document the stock 26-week program and are overridden in computeBadges.

export const ICONS: Record<string, string[]> = {
  mountain: ['M4 40 L18 14 L26 26 L32 18 L44 40 Z', 'M18 14 L22 20', 'M32 18 L29 23'],
  pack: [
    'M16 18 Q16 9 24 9 Q32 9 32 18',
    'M13 18 L35 18 L35 42 L13 42 Z',
    'M19 27 L29 27',
    'M21 18 L21 12',
    'M27 18 L27 12',
  ],
  dumbbell: ['M8 24 L40 24', 'M8 18 L8 30', 'M13 20 L13 28', 'M35 20 L35 28', 'M40 18 L40 30'],
  fire: ['M24 8 Q33 20 27 30 Q32 28 31 22 Q39 32 30 42 Q17 46 15 33 Q14 24 22 22 Q18 15 24 8 Z'],
  calendar: ['M12 14 L36 14 L36 40 L12 40 Z', 'M12 22 L36 22', 'M18 10 L18 18', 'M30 10 L30 18'],
  check: ['M10 26 L20 36 L38 12'],
  scale: [
    'M24 10 L24 40',
    'M14 40 L34 40',
    'M16 20 L32 20',
    'M16 20 L11 30 L21 30 Z',
    'M32 20 L27 30 L37 30 Z',
  ],
  trophy: [
    'M16 12 L32 12 L31 24 Q24 30 17 24 Z',
    'M16 14 L10 14 Q10 22 17 22',
    'M32 14 L38 14 Q38 22 31 22',
    'M24 30 L24 36',
    'M18 40 L30 40 L30 36 L18 36 Z',
  ],
  clock: ['M24 24 m-15 0 a15 15 0 1 0 30 0 a15 15 0 1 0 -30 0', 'M24 24 L24 13', 'M24 24 L32 29'],
  shield: ['M24 8 L38 14 L38 26 Q38 38 24 44 Q10 38 10 26 L10 14 Z', 'M18 25 L23 31 L32 18'],
  utensils: [
    'M15 9 L15 41',
    'M11 9 L11 19 Q11 23 15 23',
    'M19 9 L19 19 Q19 23 15 23',
    'M32 9 Q26 12 26 23 L32 23 L32 41',
  ],
  flag: ['M16 42 L16 9', 'M16 11 L33 15 L16 21'],
};

type BadgeKind =
  | 'ruck'
  | 'ruck3h'
  | 'sessions'
  | 'streak'
  | 'perfect'
  | 'lb'
  | 'goal'
  | 'phase'
  | 'deload'
  | 'calstreak';

export interface BadgeDef {
  id: string;
  camp: number;
  icon: keyof typeof ICONS & string;
  title: string;
  goal: number;
  kind: BadgeKind;
  phase?: number;
}

export const BADGE_DEFS: BadgeDef[] = [
  { id: 'first_ruck', camp: 0, icon: 'pack', title: 'First Ruck', goal: 1, kind: 'ruck' },
  { id: 'lb_5', camp: 0, icon: 'scale', title: '5 lb Down', goal: 5, kind: 'lb' },
  { id: 'streak_7', camp: 0, icon: 'calendar', title: '7-Day Streak', goal: 7, kind: 'streak' },
  { id: 'rucks_10', camp: 1, icon: 'pack', title: '10 Rucks', goal: 10, kind: 'ruck' },
  { id: 'ruck_3h', camp: 1, icon: 'clock', title: 'First 3-Hr Ruck', goal: 1, kind: 'ruck3h' },
  { id: 'lb_10', camp: 1, icon: 'scale', title: '10 lb Down', goal: 10, kind: 'lb' },
  { id: 'streak_30', camp: 2, icon: 'fire', title: '30-Day Streak', goal: 30, kind: 'streak' },
  { id: 'workouts_50', camp: 2, icon: 'dumbbell', title: '50 Sessions', goal: 50, kind: 'sessions' },
  { id: 'perfect_week', camp: 2, icon: 'check', title: 'Perfect Week', goal: 1, kind: 'perfect' },
  { id: 'lb_20', camp: 3, icon: 'scale', title: '20 lb Down', goal: 20, kind: 'lb' },
  { id: 'base_survived', camp: 3, icon: 'mountain', title: 'Base Camp Survived', goal: 63, kind: 'phase', phase: 0 },
  { id: 'cal_30', camp: 3, icon: 'utensils', title: '30-Day Fuel Log', goal: 30, kind: 'calstreak' },
  { id: 'workouts_100', camp: 4, icon: 'dumbbell', title: '100 Sessions', goal: 100, kind: 'sessions' },
  { id: 'load_complete', camp: 4, icon: 'mountain', title: 'Load Camp Complete', goal: 63, kind: 'phase', phase: 1 },
  { id: 'deloads_all', camp: 4, icon: 'shield', title: 'All Deloads Respected', goal: 5, kind: 'deload' },
  { id: 'alpine_finished', camp: 5, icon: 'flag', title: 'Alpine Push Finished', goal: 56, kind: 'phase', phase: 2 },
  { id: 'goal_230', camp: 5, icon: 'trophy', title: 'Summit Weight', goal: 1, kind: 'goal' },
];

export const CAMP_DEFS = [
  { name: 'TRAILHEAD', alt: '0', altFt: 0 },
  { name: 'CAMP 1', alt: '17,600', altFt: 17600 },
  { name: 'CAMP 2', alt: '19,900', altFt: 19900 },
  { name: 'CAMP 3', alt: '21,300', altFt: 21300 },
  { name: 'HIGH CAMP', alt: '26,000', altFt: 26000 },
  { name: 'SUMMIT', alt: '29,032', altFt: 29032 },
] as const;

function longestRun(keys: string[]): number {
  if (!keys.length) return 0;
  const days = [
    ...new Set(keys.map((k) => Math.floor(new Date(k + 'T00:00:00').getTime() / 86400000))),
  ].sort((a, b) => a - b);
  let best = 1,
    run = 1;
  for (let i = 1; i < days.length; i++) {
    run = days[i] === days[i - 1] + 1 ? run + 1 : 1;
    if (run > best) best = run;
  }
  return best;
}

function metrics(data: AppData) {
  const doneKeys = Object.keys(data.completions).filter((k) => data.completions[k]);
  const sessions = doneKeys.length;
  const ruckKeys = doneKeys.filter((k) => new Date(k + 'T00:00:00').getDay() === 6);
  const streak = longestRun(doneKeys);
  const byWeek: Record<number, number> = {};
  doneKeys.forEach((k) => {
    const w = weekOfKey(k);
    byWeek[w] = (byWeek[w] || 0) + 1;
  });
  const perfect = Object.values(byWeek).some((c) => c >= 7);
  const phaseDone = [0, 0, 0];
  doneKeys.forEach((k) => {
    const w = weekOfKey(k);
    if (w >= 1 && w <= programWeeks()) phaseDone[phaseOf(w).idx]++;
  });
  const sorted = [...data.weights].sort((a, b) => (a.date < b.date ? -1 : 1));
  let maxLost = 0,
    lb5: string | null = null,
    lb10: string | null = null,
    lb20: string | null = null,
    goalWhen: string | null = null;
  sorted.forEach((e) => {
    const lost = START_WEIGHT_LB - e.lb;
    if (lost > maxLost) maxLost = lost;
    if (lb5 == null && lost >= 5) lb5 = e.date;
    if (lb10 == null && lost >= 10) lb10 = e.date;
    if (lb20 == null && lost >= 20) lb20 = e.date;
    if (goalWhen == null && e.lb <= GOAL_WEIGHT_LB) goalWhen = e.date;
  });
  const deloadRespected = deloadWeeks().filter((w) => (byWeek[w] || 0) >= 5).length;
  // A 3-hour ruck = any ruck from LOAD CAMP on (prescriptions reach 3-5 h).
  const isLoadRuck = (k: string) => phaseOf(weekOfKey(k)).idx >= 1;
  const ruck3h = ruckKeys.some(isLoadRuck);
  const ruck3hWhen = ruck3h ? ([...ruckKeys].sort().find(isLoadRuck) ?? null) : null;
  const calStreak = longestRun(Object.keys(data.calories));
  return {
    sessions,
    ruckCount: ruckKeys.length,
    firstRuckWhen: [...ruckKeys].sort()[0] || null,
    streak,
    perfect,
    phaseDone,
    maxLost,
    lb5,
    lb10,
    lb20,
    goalReached: goalWhen != null,
    goalWhen,
    deloadRespected,
    ruck3h,
    ruck3hWhen,
    calStreak,
  };
}

export interface BadgeComputed extends BadgeDef {
  iconPaths: string[];
  cur: number;
  earned: boolean;
  when: string | null;
}

export function computeBadges(data: AppData): BadgeComputed[] {
  const m = metrics(data);
  return BADGE_DEFS.map((def) => {
    // Rescale calendar-shaped goals to the live (possibly trip-anchored)
    // calendar; every other goal is fixed.
    const goal =
      def.kind === 'phase'
        ? phaseLen(def.phase!) * 7
        : def.kind === 'deload'
          ? deloadWeeks().length
          : def.goal;
    let cur = 0;
    let when: string | null = null;
    switch (def.kind) {
      case 'ruck':
        cur = m.ruckCount;
        when = m.firstRuckWhen;
        break;
      case 'ruck3h':
        cur = m.ruck3h ? 1 : 0;
        when = m.ruck3hWhen;
        break;
      case 'sessions':
        cur = m.sessions;
        break;
      case 'streak':
        cur = m.streak;
        break;
      case 'perfect':
        cur = m.perfect ? 1 : 0;
        break;
      case 'lb':
        cur = Math.floor(m.maxLost);
        when = def.goal === 5 ? m.lb5 : def.goal === 10 ? m.lb10 : m.lb20;
        break;
      case 'goal':
        cur = m.goalReached ? 1 : 0;
        when = m.goalWhen;
        break;
      case 'phase':
        cur = m.phaseDone[def.phase!];
        break;
      case 'deload':
        cur = m.deloadRespected;
        break;
      case 'calstreak':
        cur = m.calStreak;
        break;
    }
    const earned = cur >= goal;
    return {
      ...def,
      goal,
      iconPaths: ICONS[def.icon],
      cur: Math.min(cur, goal),
      earned,
      when: earned ? when : null,
    };
  });
}
