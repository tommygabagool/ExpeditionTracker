import Svg, { Circle, Path } from 'react-native-svg';

import { palette } from '@/constants/theme';

// Tiny progression line: oldest → newest, latest point picked out in sunset.

interface Props {
  values: number[];
  width?: number;
  height?: number;
}

export function SparkLine({ values, width = 132, height = 30 }: Props) {
  if (values.length < 2) return null;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const padX = 4;
  const padY = 5;
  const pts = values.map((v, i) => ({
    x: padX + (i * (width - padX * 2)) / (values.length - 1),
    y: height - padY - ((v - min) / span) * (height - padY * 2),
  }));
  const d = pts.map((q, i) => `${i === 0 ? 'M' : 'L'}${q.x.toFixed(1)} ${q.y.toFixed(1)}`).join(' ');
  const last = pts[pts.length - 1];
  return (
    <Svg width={width} height={height}>
      <Path d={d} stroke={palette.green} strokeWidth={2} fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <Circle cx={last.x} cy={last.y} r={3} fill={palette.orange} />
    </Svg>
  );
}
