import { palette } from '@/constants/theme';

// Curated CT trail set from the design. `seed` drives the procedural topo art.
// TODO(trails): grow toward 15-20 trails and add trailhead coords + real
// geometry from the CT DEEP Trails Set (geodata.ct.gov) for the Mapbox view.

export type Difficulty = 'Easy' | 'Moderate' | 'Hard';

export interface Trail {
  id: string;
  name: string;
  dist: number; // miles
  gain: number; // feet
  time: string; // h:mm estimate
  drive: number; // minutes from home
  diff: Difficulty;
  seed: number;
  trailhead: string;
  notes: string;
}

export const TRAILS: Trail[] = [
  {
    id: 'talcott',
    name: 'Talcott Mountain · Heublein Tower',
    dist: 2.5,
    gain: 550,
    time: '1:30',
    drive: 45,
    diff: 'Easy',
    seed: 2,
    trailhead: 'Route 185 lot, Simsbury. Restrooms at the tower (seasonal).',
    notes:
      'Steady climb on wide gravel to the ridgeline, then flat walking to the tower. Ideal early-phase ruck footing.',
  },
  {
    id: 'giant',
    name: 'Sleeping Giant · Tower Trail',
    dist: 3.2,
    gain: 740,
    time: '1:45',
    drive: 15,
    diff: 'Moderate',
    seed: 5,
    trailhead: 'Main lot on Mt Carmel Ave, Hamden — opposite Quinnipiac.',
    notes:
      'Carriage road with a consistent grade to the stone tower. Add the Blue Trail loop for extra vert.',
  },
  {
    id: 'chauncey',
    name: 'Mattabesett · Chauncey Peak Loop',
    dist: 4.8,
    gain: 900,
    time: '2:30',
    drive: 25,
    diff: 'Moderate',
    seed: 8,
    trailhead: 'Giuffrida Park, Meriden. Lot fills by 9 AM on weekends.',
    notes:
      'Cliff-edge walking above Crescent Lake, two summits per lap. Rocky sections — good boot practice.',
  },
  {
    id: 'ragged',
    name: 'Ragged Mountain Loop',
    dist: 5.5,
    gain: 1100,
    time: '3:00',
    drive: 30,
    diff: 'Moderate',
    seed: 11,
    trailhead: 'West Lane lot, Berlin. No facilities.',
    notes:
      'Traprock ridgeline with repeated short climbs — the best mid-phase leg burner in central CT.',
  },
  {
    id: 'bear',
    name: 'Bear Mountain via Undermountain',
    dist: 6.7,
    gain: 1650,
    time: '4:00',
    drive: 75,
    diff: 'Hard',
    seed: 14,
    trailhead: 'Undermountain Trail lot, Route 41, Salisbury.',
    notes:
      'Highest peak in CT. Sustained climb with a steep, scrambly summit block — treat it as a dress rehearsal.',
  },
];

export function diffColor(diff: Difficulty): string {
  return diff === 'Easy' ? palette.green : diff === 'Hard' ? palette.orange : palette.gold;
}
