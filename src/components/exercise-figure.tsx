import { useEffect, useRef, useState } from 'react';
import { Animated, Easing } from 'react-native';
import Svg, { Circle, G, Line, Path, Rect } from 'react-native-svg';

import { palette } from '@/constants/theme';
import { FIGURES, type FigureDef, type FigureName, type Joint, type Pose, type Pt } from '@/data/figures';

// Field-guide demonstration figure: a woodcut-weight stick skeleton tweened
// between its two poses, like a hand-drawn flipbook plate. Ink on cream, the
// moving load picked out in sunset.

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

export function ExerciseFigure({ name, size = 176 }: { name: FigureName; size?: number }) {
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
  const shoulder = lerp(pose.neck, pose.hip, 0.14);
  const ground = def.ground ?? 'floor';

  return (
    <Svg viewBox={`0 0 ${W} ${H}`} width={size} height={(size * H) / W}>
      {ground === 'floor' && <Line x1={10} y1={88} x2={110} y2={88} stroke={STRUCTURE} strokeWidth={2} strokeLinecap="round" />}
      {ground === 'slope' && <Line x1={8} y1={88} x2={112} y2={56} stroke={STRUCTURE} strokeWidth={2} strokeLinecap="round" />}

      <Gear def={def} pose={pose} />

      {/* far limbs, faded for depth */}
      {pose.knee2 && <Limb d={line([pose.hip, pose.knee2, pose.ankle2, pose.toe2])} faded />}
      {pose.elbow2 && <Limb d={line([shoulder, pose.elbow2, pose.wrist2])} faded />}

      {/* torso + near limbs + head */}
      <Limb d={line([pose.neck, pose.hip])} width={4.5} />
      <Limb d={line([pose.hip, pose.knee, pose.ankle, pose.toe])} />
      <Limb d={line([shoulder, pose.elbow, pose.wrist])} />
      <Circle cx={pose.head.x} cy={pose.head.y} r={6} fill={INK} />
    </Svg>
  );
}
