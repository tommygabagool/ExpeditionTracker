import { goalWeightLb, startWeightLb } from '@/program/goals';
import { isDeloadWeek, programWeeks, startDate } from '@/program/schedule';

// Procedural SVG geometry ported verbatim from the design file: the program
// ridgeline (one node per week, however many the calendar holds), seeded topo
// contours + trail art, and the weight chart.

export interface RidgePoint {
  x: number;
  y: number;
  week: number;
}

export function ridge(): RidgePoint[] {
  const weeks = programWeeks();
  const pts: RidgePoint[] = [];
  for (let i = 0; i < weeks; i++) {
    const week = i + 1;
    const x = 15 + i * (360 / (weeks - 1));
    const jag = ((i * 37) % 11) - 5;
    let y = 112 - (i / (weeks - 1)) * 86 + jag;
    if (isDeloadWeek(week)) y += 9;
    pts.push({ x: Math.round(x * 10) / 10, y: Math.round(y * 10) / 10, week });
  }
  return pts;
}

export function segPaths(pts: RidgePoint[], from: number, to: number) {
  // include one point past `to` for continuity
  const seg = pts.slice(from, Math.min(to + 1, pts.length));
  const line = 'M' + seg.map((p) => p.x + ' ' + p.y).join(' L');
  const fill = line + ' L' + seg[seg.length - 1].x + ' 124 L' + seg[0].x + ' 124 Z';
  return { line, fill };
}

export function topo(seed: number, w: number, h: number, rings: number): { d: string }[] {
  const paths: { d: string }[] = [];
  const cx = w * 0.48;
  const cy = h * 0.5;
  for (let k = 1; k <= rings; k++) {
    const r = (k / rings) * Math.min(w, h) * 0.55 + 3;
    let d = '';
    const steps = 26;
    for (let i = 0; i <= steps; i++) {
      const a = ((i % steps) / steps) * Math.PI * 2;
      const wob =
        1 +
        0.16 * Math.sin(a * 3 + seed) +
        0.11 * Math.sin(a * 5 + seed * 2.3) +
        0.07 * Math.sin(a * 8 + seed * 4.1);
      const x = cx + Math.cos(a) * r * wob * (w / h) * 0.62;
      const y = cy + Math.sin(a) * r * wob * 0.78;
      d += (i ? ' L' : 'M') + x.toFixed(1) + ' ' + y.toFixed(1);
    }
    paths.push({ d: d + ' Z' });
  }
  return paths;
}

export function trailRoute(seed: number, w: number, h: number) {
  let d = '',
    ex = 0,
    ey = 0,
    sx = 0,
    sy = 0;
  const n = 12;
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const x = (0.12 + t * 0.38) * w + Math.sin(t * 9 + seed) * w * 0.05;
    const y = (0.8 - t * 0.32) * h + Math.sin(t * 13 + seed * 2) * h * 0.05;
    if (i === 0) {
      sx = x;
      sy = y;
    }
    if (i === n) {
      ex = x;
      ey = y;
    }
    d += (i ? ' L' : 'M') + x.toFixed(1) + ' ' + y.toFixed(1);
  }
  return { d, sx, sy, ex, ey };
}

export function trailProfile(seed: number, w: number, h: number) {
  const pts: string[] = [];
  const n = 32;
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const up = t < 0.55 ? t / 0.55 : (1 - t) / 0.45;
    const e = Math.max(0, Math.min(1, Math.pow(up, 1.15) + 0.05 * Math.sin(t * 21 + seed)));
    pts.push((38 + t * (w - 48)).toFixed(1) + ' ' + (h - 16 - e * (h - 34)).toFixed(1));
  }
  const line = 'M' + pts.join(' L');
  const area = line + ' L' + (w - 10) + ' ' + (h - 16) + ' L38 ' + (h - 16) + ' Z';
  return { line, area };
}

/** Real elevation profile (from the seeded trail-geo data) drawn in the same
 *  chart frame as trailProfile: x 38→w-10, y bottom = min ft, top = max ft. */
export function realTrailProfile(profileFt: number[], w: number, h: number) {
  const minFt = Math.min(...profileFt);
  const maxFt = Math.max(...profileFt);
  const span = Math.max(1, maxFt - minFt);
  const pts = profileFt.map((e, i) => {
    const x = 38 + (i / (profileFt.length - 1)) * (w - 48);
    const y = h - 16 - ((e - minFt) / span) * (h - 34);
    return x.toFixed(1) + ' ' + y.toFixed(1);
  });
  const line = 'M' + pts.join(' L');
  const area = line + ' L' + (w - 10) + ' ' + (h - 16) + ' L38 ' + (h - 16) + ' Z';
  return { line, area, minFt, maxFt };
}

export interface WeightChart {
  points: { x: number; y: number }[];
  linePath: string;
  areaPath: string;
  gridLines: { y: number; labelY: number; label: string }[];
  goalY: number;
  goalLabelY: number;
}

export function weightChart(entries: { date: string; lb: number }[]): WeightChart {
  const goal = goalWeightLb();
  const sorted = [...entries].sort((a, b) => (a.date < b.date ? -1 : 1));
  const start = startDate().getTime();
  const span = programWeeks() * 7 * 86400000;
  const lbs = sorted.map((e) => e.lb);
  const top = Math.max(startWeightLb(), ...lbs) + 3;
  const bot = goal - 5;
  const X = (d: string) =>
    34 + Math.max(0, Math.min(1, (new Date(d + 'T00:00:00').getTime() - start) / span)) * 326;
  const Y = (lb: number) => 14 + ((top - lb) / (top - bot)) * 152;
  const points = sorted.map((e) => ({
    x: Math.round(X(e.date) * 10) / 10,
    y: Math.round(Y(e.lb) * 10) / 10,
  }));
  const linePath = points.length ? 'M' + points.map((p) => p.x + ' ' + p.y).join(' L') : '';
  const areaPath =
    points.length > 1
      ? linePath + ' L' + points[points.length - 1].x + ' 166 L' + points[0].x + ' 166 Z'
      : '';
  const gridLines: WeightChart['gridLines'] = [];
  for (let lb = Math.floor(top / 10) * 10; lb > bot; lb -= 10) {
    const y = Math.round(Y(lb) * 10) / 10;
    gridLines.push({ y, labelY: y + 3, label: String(lb) });
  }
  const goalY = Math.round(Y(goal) * 10) / 10;
  return { points, linePath, areaPath, gridLines, goalY, goalLabelY: goalY - 6 };
}
