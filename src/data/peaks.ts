// Milestone peaks for the summit log — a hardcoded, offline table (no API).
// Cumulative altitude XP from ascent.ts is mapped onto these ascending
// real-world elevations: pass a peak's height and you've "bagged" it. The
// ladder tops out exactly at Everest (29,032) so finishing the program bags
// the whole list. Everest CAMPS stay in badges.ts (CAMP_DEFS) — this list is
// world summits, a separate flavor track on the same climb.

export interface Peak {
  id: string;
  name: string;
  region: string;
  elevationFt: number;
}

export const PEAKS: Peak[] = [
  { id: 'ben-nevis', name: 'BEN NEVIS', region: 'SCOTLAND', elevationFt: 4413 },
  { id: 'washington', name: 'MT WASHINGTON', region: 'NEW HAMPSHIRE', elevationFt: 6288 },
  { id: 'olympus', name: 'MT OLYMPUS', region: 'GREECE', elevationFt: 9573 },
  { id: 'fuji', name: 'MT FUJI', region: 'JAPAN', elevationFt: 12389 },
  { id: 'pikes', name: 'PIKES PEAK', region: 'COLORADO', elevationFt: 14115 },
  { id: 'matterhorn', name: 'MATTERHORN', region: 'ALPS', elevationFt: 14692 },
  { id: 'mont-blanc', name: 'MONT BLANC', region: 'ALPS', elevationFt: 15774 },
  { id: 'ebc', name: 'EVEREST BASE CAMP', region: 'NEPAL', elevationFt: 17598 },
  { id: 'kilimanjaro', name: 'KILIMANJARO', region: 'TANZANIA', elevationFt: 19341 },
  { id: 'denali', name: 'DENALI', region: 'ALASKA', elevationFt: 20310 },
  { id: 'aconcagua', name: 'ACONCAGUA', region: 'ANDES', elevationFt: 22838 },
  { id: 'k2', name: 'K2', region: 'KARAKORAM', elevationFt: 28251 },
  { id: 'everest', name: 'EVEREST', region: 'HIMALAYA', elevationFt: 29032 },
];

export interface PeakProgress {
  bagged: Peak[];
  /** The next unbagged peak, or null once Everest falls. */
  next: Peak | null;
  /** Feet still to climb to the next peak (0 when done). */
  toNextFt: number;
}

export function peaksFor(altitudeFt: number): PeakProgress {
  const bagged = PEAKS.filter((p) => altitudeFt >= p.elevationFt);
  const next = PEAKS.find((p) => altitudeFt < p.elevationFt) ?? null;
  return { bagged, next, toNextFt: next ? next.elevationFt - altitudeFt : 0 };
}
