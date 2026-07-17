import { peaksFor, type PeakProgress } from '@/data/peaks';
import type { AppData } from '@/data/store';
import { isDeloadWeek, keyOf, PROGRAM_START, programWeeks, todayDate, weekOfKey } from './schedule';

// Altitude XP: the program IS the climb. Every completed session earns
// vertical feet toward Everest's 29,032; Saturday rucks weigh 2.5× a weekday
// session. Completing the whole program — stock or trip-shortened — lands
// exactly on the summit (the ladder rescales off programWeeks()).

export const SUMMIT_FT = 29032;

const RUCK_WEIGHT = 2.5;
const WEEK_WEIGHT = 6 + RUCK_WEIGHT; // 6 weekday sessions + the ruck
const totalWeight = () => programWeeks() * WEEK_WEIGHT;

function sessionWeight(dateKey: string): number {
  return new Date(dateKey + 'T00:00:00').getDay() === 6 ? RUCK_WEIGHT : 1;
}

export function feetFor(dateKey: string): number {
  return Math.round((sessionWeight(dateKey) / totalWeight()) * SUMMIT_FT);
}

export interface Rank {
  title: string;
  atFt: number;
}

export const RANKS: Rank[] = [
  { title: 'FLATLANDER', atFt: 0 },
  { title: 'TRAILHEAD TOURIST', atFt: 2000 },
  { title: 'SWITCHBACK PILGRIM', atFt: 5000 },
  { title: 'RIDGELINE RUNNER', atFt: 9000 },
  { title: 'CREVASSE JUMPER', atFt: 13000 },
  { title: 'ICEFALL DOCTOR', atFt: 17600 },
  { title: 'DEATH ZONE DRIFTER', atFt: 26000 },
  { title: 'SUMMITEER', atFt: SUMMIT_FT },
];

export interface Ascent {
  altitudeFt: number;
  rank: Rank;
  nextRank: Rank | null;
  /** 0..1 progress from current rank toward the next. */
  rankProgress: number;
  /** Feet today's session is worth when completed. */
  todayWorthFt: number;
  todayDone: boolean;
  /** Current streak in completed days; deload-week rest days don't break it. */
  streak: number;
  bestStreak: number;
  /** True when the current streak survived a deload-week gap. */
  shielded: boolean;
  /** Milestone world peaks passed at this altitude (see src/data/peaks.ts). */
  peaks: PeakProgress;
}

const DAY_MS = 86_400_000;

function computeStreak(completions: Record<string, boolean>): { streak: number; shielded: boolean } {
  const today = todayDate();
  const start = new Date(PROGRAM_START + 'T00:00:00');
  let cursor = new Date(today);
  // A streak may be "alive" without today logged yet — start from yesterday then.
  if (!completions[keyOf(cursor)]) {
    cursor = new Date(cursor.getTime() - DAY_MS);
  }
  let streak = 0;
  let shielded = false;
  while (cursor.getTime() >= start.getTime()) {
    const key = keyOf(cursor);
    if (completions[key]) {
      streak++;
    } else if (isDeloadWeek(weekOfKey(key))) {
      shielded = true; // deload rest day: streak holds but doesn't grow
    } else {
      break;
    }
    cursor = new Date(cursor.getTime() - DAY_MS);
  }
  return { streak, shielded: shielded && streak > 0 };
}

function computeBestStreak(completions: Record<string, boolean>): number {
  const days = Object.keys(completions)
    .filter((k) => completions[k])
    .map((k) => Math.floor(new Date(k + 'T00:00:00').getTime() / DAY_MS))
    .sort((a, b) => a - b);
  let best = 0;
  let run = 0;
  for (let i = 0; i < days.length; i++) {
    run = i > 0 && days[i] === days[i - 1] + 1 ? run + 1 : 1;
    if (run > best) best = run;
  }
  return best;
}

export function computeAscent(data: AppData): Ascent {
  let doneWeight = 0;
  for (const key of Object.keys(data.completions)) {
    if (data.completions[key]) {
      doneWeight += sessionWeight(key);
    }
  }
  const altitudeFt = Math.min(SUMMIT_FT, Math.round((doneWeight / totalWeight()) * SUMMIT_FT));

  let rank = RANKS[0];
  let nextRank: Rank | null = null;
  for (let i = RANKS.length - 1; i >= 0; i--) {
    if (altitudeFt >= RANKS[i].atFt) {
      rank = RANKS[i];
      nextRank = RANKS[i + 1] ?? null;
      break;
    }
  }
  const rankProgress = nextRank
    ? Math.min(1, (altitudeFt - rank.atFt) / (nextRank.atFt - rank.atFt))
    : 1;

  const todayKey = keyOf(todayDate());
  const { streak, shielded } = computeStreak(data.completions);

  return {
    altitudeFt,
    rank,
    nextRank,
    rankProgress,
    todayWorthFt: feetFor(todayKey),
    todayDone: !!data.completions[todayKey],
    streak,
    bestStreak: computeBestStreak(data.completions),
    shielded,
    peaks: peaksFor(altitudeFt),
  };
}

/** Streak heat tier for the flame visual. */
export function streakHeat(streak: number): 'ember' | 'flame' | 'blaze' {
  if (streak >= 14) return 'blaze';
  if (streak >= 3) return 'flame';
  return 'ember';
}
