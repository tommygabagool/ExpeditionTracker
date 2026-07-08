// Two-frame pose data for the field-guide exercise figures. Each figure is a
// side-view stick skeleton (facing right) on a 120×100 canvas, floor at y=88.
// Session Mode tweens frame A → B and back, like a hand-drawn flipbook.
//
// Skeleton: head circle; torso neck→hip; legs hip→knee→ankle→toe; arms hang
// from a shoulder point interpolated just below the neck. `2`-suffixed joints
// are the far-side limb (drawn faded, behind). `extra` is a free anchor for
// gear that moves with the pose (barbell plate, belt plate).

export interface Pt {
  x: number;
  y: number;
}

export interface Pose {
  head: Pt;
  neck: Pt;
  hip: Pt;
  knee: Pt;
  ankle: Pt;
  toe: Pt;
  elbow: Pt;
  wrist: Pt;
  knee2?: Pt;
  ankle2?: Pt;
  toe2?: Pt;
  elbow2?: Pt;
  wrist2?: Pt;
  extra?: Pt;
}

export type Joint = keyof Pose;

export type GearItem =
  | { kind: 'plate'; at: Joint } // barbell seen end-on (plate face)
  | { kind: 'db'; at: Joint[] } // dumbbell head at each joint
  | { kind: 'bell'; at: Joint[] } // kettlebell hanging from each joint
  | { kind: 'beltplate'; at: Joint } // gold belt/back plate
  | { kind: 'hbar'; y: number; x1: number; x2: number } // pull-up / dip bar
  | { kind: 'bench'; from: Pt; to: Pt } // incline bench line + strut
  | { kind: 'boxrect'; x: number; y: number; w: number; h: number }
  | { kind: 'cable'; from: Pt; to: Joint } // cable/band from anchor to hand
  | { kind: 'pack' }; // ruck pack behind the torso

export interface FigureDef {
  a: Pose;
  b: Pose;
  gear?: GearItem[];
  ground?: 'floor' | 'slope' | 'none'; // default 'floor'
}

const p = (x: number, y: number): Pt => ({ x, y });

export const FIGURES = {
  back_squat: {
    a: {
      head: p(57, 15), neck: p(57, 26), hip: p(55, 54),
      knee: p(57, 69), ankle: p(57, 84), toe: p(66, 87),
      knee2: p(53, 69), ankle2: p(53, 84), toe2: p(62, 87),
      elbow: p(65, 34), wrist: p(68, 26), elbow2: p(61, 35), wrist2: p(64, 27),
      extra: p(54, 26),
    },
    b: {
      head: p(60, 35), neck: p(60, 46), hip: p(48, 70),
      knee: p(63, 71), ankle: p(57, 84), toe: p(66, 87),
      knee2: p(59, 72), ankle2: p(53, 84), toe2: p(62, 87),
      elbow: p(68, 52), wrist: p(70, 44), elbow2: p(64, 53), wrist2: p(66, 45),
      extra: p(57, 45),
    },
    gear: [{ kind: 'plate', at: 'extra' }],
  },
  front_squat: {
    a: {
      head: p(56, 15), neck: p(56, 26), hip: p(55, 54),
      knee: p(57, 69), ankle: p(57, 84), toe: p(66, 87),
      knee2: p(53, 69), ankle2: p(53, 84), toe2: p(62, 87),
      elbow: p(66, 35), wrist: p(64, 27), elbow2: p(62, 36), wrist2: p(60, 28),
      extra: p(63, 27),
    },
    b: {
      head: p(59, 36), neck: p(59, 47), hip: p(50, 70),
      knee: p(64, 71), ankle: p(58, 84), toe: p(67, 87),
      knee2: p(60, 72), ankle2: p(54, 84), toe2: p(63, 87),
      elbow: p(68, 56), wrist: p(66, 48), elbow2: p(64, 57), wrist2: p(62, 49),
      extra: p(65, 48),
    },
    gear: [{ kind: 'plate', at: 'extra' }],
  },
  deadlift: {
    a: {
      head: p(59, 33), neck: p(60, 43), hip: p(45, 55),
      knee: p(58, 68), ankle: p(57, 84), toe: p(66, 87),
      knee2: p(54, 69), ankle2: p(53, 84), toe2: p(62, 87),
      elbow: p(64, 59), wrist: p(69, 75), elbow2: p(60, 60), wrist2: p(66, 75),
      extra: p(69, 78),
    },
    b: {
      head: p(56, 15), neck: p(56, 26), hip: p(54, 54),
      knee: p(56, 69), ankle: p(56, 84), toe: p(65, 87),
      knee2: p(52, 69), ankle2: p(52, 84), toe2: p(61, 87),
      elbow: p(60, 44), wrist: p(62, 60), elbow2: p(58, 44), wrist2: p(60, 61),
      extra: p(62, 61),
    },
    gear: [{ kind: 'plate', at: 'extra' }],
  },
  romanian_deadlift: {
    a: {
      head: p(58, 15), neck: p(58, 26), hip: p(56, 54),
      knee: p(58, 69), ankle: p(58, 84), toe: p(67, 87),
      knee2: p(54, 69), ankle2: p(54, 84), toe2: p(63, 87),
      elbow: p(62, 44), wrist: p(64, 60), elbow2: p(60, 44), wrist2: p(62, 61),
      extra: p(64, 61),
    },
    b: {
      head: p(70, 32), neck: p(69, 42), hip: p(46, 52),
      knee: p(52, 68), ankle: p(56, 84), toe: p(65, 87),
      knee2: p(48, 68), ankle2: p(52, 84), toe2: p(61, 87),
      elbow: p(66, 57), wrist: p(67, 70), elbow2: p(64, 58), wrist2: p(65, 71),
      extra: p(67, 71),
    },
    gear: [{ kind: 'plate', at: 'extra' }],
  },
  overhead_press: {
    a: {
      head: p(56, 15), neck: p(57, 26), hip: p(55, 54),
      knee: p(57, 69), ankle: p(57, 84), toe: p(66, 87),
      knee2: p(53, 69), ankle2: p(53, 84), toe2: p(62, 87),
      elbow: p(64, 36), wrist: p(62, 28), elbow2: p(60, 37), wrist2: p(58, 29),
      extra: p(62, 27),
    },
    b: {
      head: p(58, 15), neck: p(57, 26), hip: p(55, 54),
      knee: p(57, 69), ankle: p(57, 84), toe: p(66, 87),
      knee2: p(53, 69), ankle2: p(53, 84), toe2: p(62, 87),
      elbow: p(62, 17), wrist: p(59, 11), elbow2: p(58, 18), wrist2: p(56, 12),
      extra: p(58, 10),
    },
    gear: [{ kind: 'plate', at: 'extra' }],
  },
  barbell_row: {
    a: {
      head: p(64, 31), neck: p(64, 41), hip: p(45, 52),
      knee: p(56, 67), ankle: p(55, 84), toe: p(64, 87),
      knee2: p(52, 68), ankle2: p(51, 84), toe2: p(60, 87),
      elbow: p(63, 54), wrist: p(64, 66), elbow2: p(61, 55), wrist2: p(62, 67),
      extra: p(64, 67),
    },
    b: {
      head: p(64, 31), neck: p(64, 41), hip: p(45, 52),
      knee: p(56, 67), ankle: p(55, 84), toe: p(64, 87),
      knee2: p(52, 68), ankle2: p(51, 84), toe2: p(60, 87),
      elbow: p(54, 50), wrist: p(61, 49), elbow2: p(52, 51), wrist2: p(59, 50),
      extra: p(61, 50),
    },
    gear: [{ kind: 'plate', at: 'extra' }],
  },
  incline_bench: {
    a: {
      head: p(74, 45), neck: p(66, 53), hip: p(46, 68),
      knee: p(54, 74), ankle: p(52, 85), toe: p(60, 87),
      knee2: p(48, 76), ankle2: p(46, 85), toe2: p(54, 87),
      elbow: p(68, 64), wrist: p(70, 57), elbow2: p(64, 66), wrist2: p(66, 58),
    },
    b: {
      head: p(74, 45), neck: p(66, 53), hip: p(46, 68),
      knee: p(54, 74), ankle: p(52, 85), toe: p(60, 87),
      knee2: p(48, 76), ankle2: p(46, 85), toe2: p(54, 87),
      elbow: p(72, 44), wrist: p(78, 34), elbow2: p(70, 45), wrist2: p(76, 35),
    },
    gear: [
      { kind: 'bench', from: p(28, 82), to: p(80, 44) },
      { kind: 'db', at: ['wrist', 'wrist2'] },
    ],
  },
  db_row: {
    a: {
      head: p(74, 39), neck: p(66, 42), hip: p(44, 50),
      knee: p(48, 67), ankle: p(50, 84), toe: p(59, 87),
      knee2: p(44, 68), ankle2: p(46, 84), toe2: p(55, 87),
      elbow: p(60, 52), wrist: p(59, 64), elbow2: p(74, 52), wrist2: p(84, 63),
    },
    b: {
      head: p(74, 39), neck: p(66, 42), hip: p(44, 50),
      knee: p(48, 67), ankle: p(50, 84), toe: p(59, 87),
      knee2: p(44, 68), ankle2: p(46, 84), toe2: p(55, 87),
      elbow: p(50, 47), wrist: p(55, 49), elbow2: p(74, 52), wrist2: p(84, 63),
    },
    gear: [
      { kind: 'boxrect', x: 74, y: 64, w: 26, h: 24 },
      { kind: 'db', at: ['wrist'] },
    ],
  },
  pull_up: {
    a: {
      head: p(57, 20), neck: p(56, 30), hip: p(54, 56),
      knee: p(58, 68), ankle: p(55, 79), toe: p(60, 82),
      knee2: p(55, 69), ankle2: p(52, 80), toe2: p(57, 83),
      elbow: p(62, 20), wrist: p(64, 8), elbow2: p(50, 20), wrist2: p(50, 8),
      extra: p(53, 63),
    },
    b: {
      head: p(58, 7), neck: p(58, 16), hip: p(55, 42),
      knee: p(60, 55), ankle: p(56, 66), toe: p(61, 69),
      knee2: p(57, 56), ankle2: p(53, 67), toe2: p(58, 70),
      elbow: p(65, 18), wrist: p(64, 8), elbow2: p(51, 18), wrist2: p(50, 8),
      extra: p(54, 49),
    },
    gear: [
      { kind: 'hbar', y: 8, x1: 30, x2: 86 },
      { kind: 'beltplate', at: 'extra' },
    ],
  },
  dip: {
    a: {
      head: p(58, 12), neck: p(58, 22), hip: p(56, 46),
      knee: p(52, 58), ankle: p(56, 68), toe: p(61, 70),
      knee2: p(49, 59), ankle2: p(53, 69), toe2: p(58, 71),
      elbow: p(64, 31), wrist: p(65, 38), elbow2: p(54, 31), wrist2: p(51, 38),
      extra: p(54, 54),
    },
    b: {
      head: p(58, 24), neck: p(58, 34), hip: p(55, 57),
      knee: p(51, 68), ankle: p(55, 78), toe: p(60, 80),
      knee2: p(48, 69), ankle2: p(52, 79), toe2: p(57, 81),
      elbow: p(67, 34), wrist: p(65, 38), elbow2: p(49, 34), wrist2: p(51, 38),
      extra: p(53, 65),
    },
    gear: [
      { kind: 'hbar', y: 38, x1: 40, x2: 84 },
      { kind: 'beltplate', at: 'extra' },
    ],
  },
  step_up: {
    a: {
      head: p(46, 17), neck: p(46, 28), hip: p(46, 56),
      knee: p(56, 64), ankle: p(64, 76), toe: p(73, 77),
      knee2: p(46, 71), ankle2: p(46, 85), toe2: p(55, 87),
      elbow: p(42, 42), wrist: p(41, 55), elbow2: p(50, 42), wrist2: p(51, 55),
    },
    b: {
      head: p(68, 11), neck: p(68, 22), hip: p(68, 48),
      knee: p(70, 62), ankle: p(70, 76), toe: p(79, 77),
      knee2: p(76, 54), ankle2: p(74, 66), toe2: p(79, 68),
      elbow: p(64, 36), wrist: p(63, 49), elbow2: p(72, 36), wrist2: p(73, 49),
    },
    gear: [
      { kind: 'boxrect', x: 58, y: 78, w: 34, h: 10 },
      { kind: 'db', at: ['wrist', 'wrist2'] },
    ],
  },
  calf_raise: {
    a: {
      head: p(57, 15), neck: p(57, 26), hip: p(55, 54),
      knee: p(57, 69), ankle: p(57, 84), toe: p(66, 87),
      knee2: p(53, 69), ankle2: p(53, 84), toe2: p(62, 87),
      elbow: p(61, 41), wrist: p(61, 54), elbow2: p(53, 41), wrist2: p(53, 54),
    },
    b: {
      head: p(57, 8), neck: p(57, 19), hip: p(55, 47),
      knee: p(57, 62), ankle: p(58, 77), toe: p(66, 87),
      knee2: p(53, 62), ankle2: p(54, 77), toe2: p(62, 87),
      elbow: p(61, 34), wrist: p(61, 47), elbow2: p(53, 34), wrist2: p(53, 47),
    },
    gear: [{ kind: 'db', at: ['wrist', 'wrist2'] }],
  },
  knee_raise: {
    a: {
      head: p(57, 20), neck: p(57, 30), hip: p(55, 56),
      knee: p(56, 70), ankle: p(56, 82), toe: p(61, 84),
      knee2: p(53, 71), ankle2: p(53, 83), toe2: p(58, 85),
      elbow: p(62, 19), wrist: p(63, 8), elbow2: p(51, 19), wrist2: p(50, 8),
    },
    b: {
      head: p(57, 20), neck: p(57, 30), hip: p(53, 54),
      knee: p(66, 46), ankle: p(63, 58), toe: p(68, 60),
      knee2: p(63, 47), ankle2: p(60, 59), toe2: p(65, 61),
      elbow: p(62, 19), wrist: p(63, 8), elbow2: p(51, 19), wrist2: p(50, 8),
    },
    gear: [{ kind: 'hbar', y: 8, x1: 30, x2: 86 }],
  },
  face_pull: {
    a: {
      head: p(53, 16), neck: p(53, 27), hip: p(51, 55),
      knee: p(56, 69), ankle: p(58, 84), toe: p(67, 87),
      knee2: p(46, 69), ankle2: p(44, 84), toe2: p(53, 87),
      elbow: p(62, 31), wrist: p(72, 28), elbow2: p(58, 33), wrist2: p(68, 30),
    },
    b: {
      head: p(53, 16), neck: p(53, 27), hip: p(51, 55),
      knee: p(56, 69), ankle: p(58, 84), toe: p(67, 87),
      knee2: p(46, 69), ankle2: p(44, 84), toe2: p(53, 87),
      elbow: p(50, 25), wrist: p(60, 22), elbow2: p(46, 27), wrist2: p(56, 24),
    },
    gear: [{ kind: 'cable', from: p(110, 24), to: 'wrist' }],
  },
  farmer_carry: {
    a: {
      head: p(56, 14), neck: p(56, 25), hip: p(55, 53),
      knee: p(64, 67), ankle: p(68, 84), toe: p(77, 86),
      knee2: p(47, 68), ankle2: p(42, 84), toe2: p(51, 86),
      elbow: p(60, 40), wrist: p(60, 54), elbow2: p(52, 40), wrist2: p(52, 54),
    },
    b: {
      head: p(56, 14), neck: p(56, 25), hip: p(55, 53),
      knee: p(47, 68), ankle: p(42, 84), toe: p(51, 86),
      knee2: p(64, 67), ankle2: p(68, 84), toe2: p(77, 86),
      elbow: p(59, 40), wrist: p(58, 54), elbow2: p(53, 40), wrist2: p(54, 54),
    },
    gear: [{ kind: 'bell', at: ['wrist', 'wrist2'] }],
  },
  lunge: {
    a: {
      head: p(56, 15), neck: p(56, 26), hip: p(54, 54),
      knee: p(56, 69), ankle: p(56, 84), toe: p(65, 87),
      knee2: p(52, 69), ankle2: p(52, 84), toe2: p(61, 87),
      elbow: p(60, 41), wrist: p(60, 54), elbow2: p(52, 41), wrist2: p(52, 54),
    },
    b: {
      head: p(56, 26), neck: p(56, 37), hip: p(54, 62),
      knee: p(67, 70), ankle: p(67, 84), toe: p(76, 87),
      knee2: p(47, 76), ankle2: p(40, 81), toe2: p(32, 86),
      elbow: p(60, 50), wrist: p(60, 63), elbow2: p(52, 50), wrist2: p(52, 63),
    },
    gear: [{ kind: 'db', at: ['wrist', 'wrist2'] }],
  },
  step_down: {
    a: {
      head: p(42, 11), neck: p(42, 22), hip: p(40, 48),
      knee: p(42, 62), ankle: p(42, 76), toe: p(50, 77),
      knee2: p(50, 58), ankle2: p(50, 70), toe2: p(55, 72),
      elbow: p(50, 32), wrist: p(56, 36), elbow2: p(34, 32), wrist2: p(28, 36),
    },
    b: {
      head: p(40, 21), neck: p(40, 32), hip: p(36, 56),
      knee: p(48, 64), ankle: p(42, 76), toe: p(50, 77),
      knee2: p(54, 68), ankle2: p(58, 83), toe2: p(66, 86),
      elbow: p(50, 42), wrist: p(57, 44), elbow2: p(34, 42), wrist2: p(28, 46),
    },
    gear: [{ kind: 'boxrect', x: 26, y: 78, w: 32, h: 10 }],
  },
  plank: {
    a: {
      head: p(79, 55), neck: p(70, 60), hip: p(52, 69),
      knee: p(38, 77), ankle: p(24, 84), toe: p(20, 86),
      knee2: p(36, 78), ankle2: p(22, 85), toe2: p(18, 87),
      elbow: p(70, 84), wrist: p(82, 84), elbow2: p(66, 84), wrist2: p(78, 84),
      extra: p(58, 60),
    },
    b: {
      head: p(79, 57), neck: p(70, 62), hip: p(52, 71),
      knee: p(38, 78), ankle: p(24, 84), toe: p(20, 86),
      knee2: p(36, 79), ankle2: p(22, 85), toe2: p(18, 87),
      elbow: p(70, 84), wrist: p(82, 84), elbow2: p(66, 84), wrist2: p(78, 84),
      extra: p(58, 62),
    },
    gear: [{ kind: 'beltplate', at: 'extra' }],
  },
  pallof: {
    a: {
      head: p(52, 17), neck: p(52, 28), hip: p(50, 56),
      knee: p(55, 70), ankle: p(53, 84), toe: p(62, 87),
      knee2: p(47, 70), ankle2: p(45, 84), toe2: p(54, 87),
      elbow: p(58, 38), wrist: p(60, 34), elbow2: p(54, 39), wrist2: p(57, 35),
    },
    b: {
      head: p(52, 17), neck: p(52, 28), hip: p(50, 56),
      knee: p(55, 70), ankle: p(53, 84), toe: p(62, 87),
      knee2: p(47, 70), ankle2: p(45, 84), toe2: p(54, 87),
      elbow: p(64, 34), wrist: p(74, 33), elbow2: p(60, 35), wrist2: p(70, 34),
    },
    gear: [{ kind: 'cable', from: p(6, 34), to: 'wrist' }],
  },
  sit_up: {
    a: {
      head: p(24, 76), neck: p(32, 79), hip: p(56, 82),
      knee: p(66, 66), ankle: p(72, 83), toe: p(80, 86),
      knee2: p(63, 67), ankle2: p(69, 84), toe2: p(77, 87),
      elbow: p(38, 72), wrist: p(42, 70), elbow2: p(36, 74), wrist2: p(40, 72),
      extra: p(43, 68),
    },
    b: {
      head: p(47, 46), neck: p(48, 56), hip: p(56, 82),
      knee: p(66, 66), ankle: p(72, 83), toe: p(80, 86),
      knee2: p(63, 67), ankle2: p(69, 84), toe2: p(77, 87),
      elbow: p(56, 64), wrist: p(60, 60), elbow2: p(54, 66), wrist2: p(58, 62),
      extra: p(60, 58),
    },
    gear: [{ kind: 'beltplate', at: 'extra' }],
  },
  hiker: {
    a: {
      head: p(58, 10), neck: p(56, 20), hip: p(52, 44),
      knee: p(60, 57), ankle: p(66, 68), toe: p(74, 67),
      knee2: p(46, 61), ankle2: p(41, 76), toe2: p(49, 75),
      elbow: p(60, 30), wrist: p(65, 38), elbow2: p(50, 31), wrist2: p(46, 40),
    },
    b: {
      head: p(58, 11), neck: p(56, 21), hip: p(52, 45),
      knee: p(47, 61), ankle: p(42, 76), toe: p(50, 74),
      knee2: p(61, 56), ankle2: p(66, 68), toe2: p(74, 67),
      elbow: p(52, 31), wrist: p(47, 40), elbow2: p(59, 30), wrist2: p(64, 38),
    },
    gear: [{ kind: 'pack' }],
    ground: 'slope',
  },
  stretch: {
    a: {
      head: p(52, 25), neck: p(52, 36), hip: p(52, 64),
      knee: p(66, 68), ankle: p(66, 84), toe: p(75, 87),
      knee2: p(42, 84), ankle2: p(30, 86), toe2: p(22, 87),
      elbow: p(56, 26), wrist: p(58, 14), elbow2: p(48, 27), wrist2: p(46, 15),
    },
    b: {
      head: p(60, 27), neck: p(59, 38), hip: p(56, 66),
      knee: p(68, 70), ankle: p(66, 84), toe: p(75, 87),
      knee2: p(42, 84), ankle2: p(30, 86), toe2: p(22, 87),
      elbow: p(60, 27), wrist: p(64, 16), elbow2: p(52, 28), wrist2: p(52, 17),
    },
  },
} satisfies Record<string, FigureDef>;

export type FigureName = keyof typeof FIGURES;

// Skeleton segments highlighted as the working muscles (drawn as a wide
// sunset underlay beneath the ink limbs). Joint pairs, near side only.
export const EMPHASIS: Record<FigureName, [Joint, Joint][]> = {
  back_squat: [['hip', 'knee'], ['neck', 'hip']],
  front_squat: [['hip', 'knee'], ['neck', 'hip']],
  deadlift: [['neck', 'hip'], ['hip', 'knee']],
  romanian_deadlift: [['neck', 'hip'], ['hip', 'knee']],
  overhead_press: [['neck', 'elbow'], ['elbow', 'wrist']],
  barbell_row: [['neck', 'hip'], ['neck', 'elbow']],
  incline_bench: [['neck', 'elbow'], ['elbow', 'wrist']],
  db_row: [['neck', 'hip'], ['neck', 'elbow']],
  pull_up: [['neck', 'elbow'], ['elbow', 'wrist']],
  dip: [['neck', 'elbow'], ['elbow', 'wrist']],
  step_up: [['hip', 'knee'], ['knee', 'ankle']],
  calf_raise: [['knee', 'ankle']],
  knee_raise: [['neck', 'hip'], ['hip', 'knee']],
  face_pull: [['neck', 'elbow']],
  farmer_carry: [['neck', 'hip'], ['elbow', 'wrist']],
  lunge: [['hip', 'knee'], ['knee', 'ankle']],
  step_down: [['hip', 'knee'], ['knee', 'ankle']],
  plank: [['neck', 'hip']],
  pallof: [['neck', 'hip']],
  sit_up: [['neck', 'hip']],
  hiker: [['hip', 'knee'], ['knee', 'ankle']],
  stretch: [['hip', 'knee']],
};
