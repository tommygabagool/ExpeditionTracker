import { useEffect, useRef, useState } from 'react';
import { Animated, Easing } from 'react-native';
import Svg, { Circle, G, Line, Path, Rect } from 'react-native-svg';

import { palette } from '@/constants/theme';
import {
  EMPHASIS,
  FIGURES,
  type FigureDef,
  type FigureName,
  type Joint,
  type Pose,
  type Pt,
} from '@/data/figures';

// Field-guide demonstration figure: a woodcut-weight skeleton tweened between
// its two poses, like a hand-drawn flipbook plate. Ink on cream; the working
// muscles glow in sunset under the limbs, a faint ghost shows the end
// position, and a dashed arc traces the load's path.

const INK = palette.text;
const LOAD = palette.orange;
const BELT = palette.gold;
const STRUCTURE = palette.border;

const W = 120;
const H = 100;

function lerp(a: Pt, b: Pt, t: number): Pt {
  return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
}

function lerpPose(a: Pose, b: Pose, t: number): Pose {
  const out = {} as Record<Joint, Pt>;
  for (const k of Object.keys(a) as Joint[]) {
    const av = a[k];
    const bv = b[k];
    if (av && bv) out[k] = lerp(av, bv, t);
  }
  return out as unknown as Pose;
}

const line = (pts: (Pt | undefined)[]): string =>
  pts
    .filter((q): q is Pt => !!q)
    .map((q, i) => `${i === 0 ? 'M' : 'L'}${q.x.toFixed(1)} ${q.y.toFixed(1)}`)
    .join(' ');

/** Torso with a subtle forward spine bow (figure faces +x). */
function spinePath(neck: Pt, hip: Pt): string {
  const dx = hip.x - neck.x;
  const dy = hip.y - neck.y;
  const len = Math.hypot(dx, dy) || 1;
  let px = dy / len;
  let py = -dx / len;
  if (px < 0) {
    px = -px;
    py = -py;
  }
  const cx = (neck.x + hip.x) / 2 + px * 1.8;
  const cy = (neck.y + hip.y) / 2 + py * 1.8;
  return `M${neck.x.toFixed(1)} ${neck.y.toFixed(1)} Q${cx.toFixed(1)} ${cy.toFixed(1)} ${hip.x.toFixed(1)} ${hip.y.toFixed(1)}`;
}

/** Foot from a short heel behind the ankle through to the toe. */
function footPath(ankle: Pt, toe: Pt): string {
  const heel = { x: ankle.x - (toe.x - ankle.x) * 0.3, y: ankle.y - (toe.y - ankle.y) * 0.3 };
  return line([heel, toe]);
}

function Limb({ d, faded = false, width = 4 }: { d: string; faded?: boolean; width?: number }) {
  return (
    <Path
      d={d}
      stroke={INK}
      strokeWidth={width}
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
      opacity={faded ? 0.28 : 1}
    />
  );
}

/** Full skeleton at one pose. Ghost mode = faint single-weight outline. */
function Skeleton({ pose, ghost = false }: { pose: Pose; ghost?: boolean }) {
  const shoulder = lerp(pose.neck, pose.hip, 0.14);
  if (ghost) {
    return (
      <G opacity={0.13}>
        <Path d={spinePath(pose.neck, pose.hip)} stroke={INK} strokeWidth={4} strokeLinecap="round" fill="none" />
        <Limb d={line([pose.hip, pose.knee, pose.ankle])} />
        <Limb d={footPath(pose.ankle, pose.toe)} />
        <Limb d={line([shoulder, pose.elbow, pose.wrist])} />
        <Circle cx={pose.head.x} cy={pose.head.y} r={6} fill={INK} />
      </G>
    );
  }
  return (
    <>
      {/* far limbs, faded for depth */}
      {pose.knee2 && (
        <>
          <Limb d={line([pose.hip, pose.knee2, pose.ankle2])} faded />
          {pose.ankle2 && pose.toe2 && <Limb d={footPath(pose.ankle2, pose.toe2)} faded />}
        </>
      )}
      {pose.elbow2 && (
        <>
          <Limb d={line([shoulder, pose.elbow2, pose.wrist2])} faded />
          {pose.wrist2 && <Circle cx={pose.wrist2.x} cy={pose.wrist2.y} r={1.9} fill={INK} opacity={0.28} />}
        </>
      )}

      {/* neck + torso + near limbs + hands + head */}
      <Limb d={line([pose.head, pose.neck])} width={3.5} />
      <Path d={spinePath(pose.neck, pose.hip)} stroke={INK} strokeWidth={4.5} strokeLinecap="round" fill="none" />
      <Limb d={line([pose.hip, pose.knee, pose.ankle])} />
      <Limb d={footPath(pose.ankle, pose.toe)} />
      <Limb d={line([shoulder, pose.elbow, pose.wrist])} />
      <Circle cx={pose.wrist.x} cy={pose.wrist.y} r={1.9} fill={INK} />
      <Circle cx={pose.head.x} cy={pose.head.y} r={6} fill={INK} />
    </>
  );
}

/** Dashed arc tracing the load anchor from pose A to pose B, arrowhead at B. */
function LoadPath({ def }: { def: FigureDef }) {
  const a = def.a.extra ?? def.a.wrist;
  const b = def.b.extra ?? def.b.wrist;
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const dist = Math.hypot(dx, dy);
  if (dist < 10) return null;
  const px = dy / dist;
  const py = -dx / dist;
  const bow = Math.min(8, dist * 0.22);
  const cx = (a.x + b.x) / 2 + px * bow;
  const cy = (a.y + b.y) / 2 + py * bow;
  // Arrowhead along the arc's incoming direction at B.
  const hx = b.x - cx;
  const hy = b.y - cy;
  const hl = Math.hypot(hx, hy) || 1;
  const ux = hx / hl;
  const uy = hy / hl;
  const wing = (sign: number) => ({
    x: b.x - ux * 4 + sign * -uy * 2.6,
    y: b.y - uy * 4 + sign * ux * 2.6,
  });
  const w1 = wing(1);
  const w2 = wing(-1);
  return (
    <G opacity={0.55}>
      <Path
        d={`M${a.x} ${a.y} Q${cx.toFixed(1)} ${cy.toFixed(1)} ${b.x} ${b.y}`}
        stroke={palette.muted}
        strokeWidth={1.4}
        strokeDasharray="3 3"
        fill="none"
      />
      <Path
        d={`M${w1.x.toFixed(1)} ${w1.y.toFixed(1)} L${b.x} ${b.y} L${w2.x.toFixed(1)} ${w2.y.toFixed(1)}`}
        stroke={palette.muted}
        strokeWidth={1.4}
        fill="none"
        strokeLinecap="round"
      />
    </G>
  );
}

function Gear({ def, pose }: { def: FigureDef; pose: Pose }) {
  const at = (j: Joint): Pt | undefined => pose[j];
  return (
    <>
      {(def.gear ?? []).map((g, i) => {
        switch (g.kind) {
          case 'plate': {
            const c = at(g.at);
            if (!c) return null;
            return (
              <G key={i}>
                <Circle cx={c.x} cy={c.y} r={10} fill={palette.bg} stroke={LOAD} strokeWidth={3} />
                <Circle cx={c.x} cy={c.y} r={2} fill={LOAD} />
              </G>
            );
          }
          case 'db':
            return g.at.map((j, k) => {
              const c = at(j);
              return c ? (
                <Circle key={`${i}-${k}`} cx={c.x} cy={c.y + 2} r={4} fill={palette.bg} stroke={LOAD} strokeWidth={2.5} />
              ) : null;
            });
          case 'bell':
            return g.at.map((j, k) => {
              const c = at(j);
              return c ? (
                <G key={`${i}-${k}`}>
                  <Line x1={c.x} y1={c.y} x2={c.x} y2={c.y + 3} stroke={LOAD} strokeWidth={2} />
                  <Circle cx={c.x} cy={c.y + 7} r={4.5} fill={palette.bg} stroke={LOAD} strokeWidth={2.5} />
                </G>
              ) : null;
            });
          case 'beltplate': {
            const c = at(g.at);
            if (!c) return null;
            return (
              <G key={i}>
                <Circle cx={c.x} cy={c.y} r={5} fill={palette.bg} stroke={BELT} strokeWidth={2.5} />
                <Circle cx={c.x} cy={c.y} r={1.4} fill={BELT} />
              </G>
            );
          }
          case 'hbar':
            return (
              <Line key={i} x1={g.x1} y1={g.y} x2={g.x2} y2={g.y} stroke={STRUCTURE} strokeWidth={3} strokeLinecap="round" />
            );
          case 'bench': {
            const mid = lerp(g.from, g.to, 0.45);
            return (
              <G key={i}>
                <Line x1={g.from.x} y1={g.from.y} x2={g.to.x} y2={g.to.y} stroke={STRUCTURE} strokeWidth={3.5} strokeLinecap="round" />
                <Line x1={mid.x} y1={mid.y} x2={mid.x} y2={88} stroke={STRUCTURE} strokeWidth={2.5} />
              </G>
            );
          }
          case 'boxrect':
            return (
              <Rect key={i} x={g.x} y={g.y} width={g.w} height={g.h} fill={palette.panelDeep} stroke={STRUCTURE} strokeWidth={2} />
            );
          case 'cable': {
            const w = at(g.to);
            if (!w) return null;
            return (
              <G key={i}>
                <Line x1={g.from.x} y1={g.from.y} x2={w.x} y2={w.y} stroke={palette.muted} strokeWidth={1.5} />
                <Circle cx={g.from.x} cy={g.from.y} r={2.5} fill={INK} />
              </G>
            );
          }
          case 'pack': {
            const { neck, hip } = pose;
            const mid = lerp(neck, hip, 0.42);
            const dx = hip.x - neck.x;
            const dy = hip.y - neck.y;
            const len = Math.hypot(dx, dy) || 1;
            // Perpendicular pointing behind the (right-facing) figure.
            let px = dy / len;
            let py = -dx / len;
            if (px > 0) {
              px = -px;
              py = -py;
            }
            const cx = mid.x + px * 9;
            const cy = mid.y + py * 9;
            const angle = (Math.atan2(dy, dx) * 180) / Math.PI - 90;
            return (
              <Rect
                key={i}
                x={cx - 5.5}
                y={cy - 10}
                width={11}
                height={20}
                rx={3.5}
                fill={palette.bg}
                stroke={BELT}
                strokeWidth={2.5}
                transform={`rotate(${angle.toFixed(1)} ${cx.toFixed(1)} ${cy.toFixed(1)})`}
              />
            );
          }
        }
      })}
    </>
  );
}

export function ExerciseFigure({ name, size = 200 }: { name: FigureName; size?: number }) {
  const def: FigureDef = FIGURES[name];
  const anim = useRef(new Animated.Value(0)).current;
  const [t, setT] = useState(0);

  useEffect(() => {
    const sub = anim.addListener(({ value }) => setT(value));
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(anim, { toValue: 1, duration: 950, easing: Easing.inOut(Easing.quad), useNativeDriver: false }),
        Animated.delay(420),
        Animated.timing(anim, { toValue: 0, duration: 950, easing: Easing.inOut(Easing.quad), useNativeDriver: false }),
        Animated.delay(420),
      ]),
    );
    loop.start();
    return () => {
      loop.stop();
      anim.removeListener(sub);
    };
  }, [anim]);

  const pose = lerpPose(def.a, def.b, t);
  const ground = def.ground ?? 'floor';
  const emphasis = EMPHASIS[name] ?? [];

  return (
    <Svg viewBox={`0 0 ${W} ${H}`} width={size} height={(size * H) / W}>
      {ground === 'floor' && <Line x1={10} y1={88} x2={110} y2={88} stroke={STRUCTURE} strokeWidth={2} strokeLinecap="round" />}
      {ground === 'slope' && <Line x1={8} y1={88} x2={112} y2={56} stroke={STRUCTURE} strokeWidth={2} strokeLinecap="round" />}

      {/* end position, load path, then environment */}
      <Skeleton pose={def.b} ghost />
      <LoadPath def={def} />
      <Gear def={def} pose={pose} />

      {/* working-muscle glow under the moving skeleton */}
      {emphasis.map(([j1, j2], i) => {
        const a = pose[j1];
        const b = pose[j2];
        return a && b ? (
          <Line key={i} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={LOAD} strokeWidth={9} strokeLinecap="round" opacity={0.24} />
        ) : null;
      })}

      <Skeleton pose={pose} />
    </Svg>
  );
}
