import { Pressable, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';

import { palette } from '@/constants/theme';

// The session's progress rail: exercises as switchback turns climbing the
// left edge of the screen, summit at the top. Tap a turn to jump to it.

const RAIL_W = 40;
const X_LEFT = 13;
const X_RIGHT = 27;

interface Props {
  count: number;
  current: number; // -1 when on the summary
  done: boolean[];
  height: number;
  onSelect: (i: number) => void;
}

export function SwitchbackRail({ count, current, done, height, onSelect }: Props) {
  const top = 30; // room for the summit mark
  const bottom = 12;
  const span = Math.max(1, count - 1);
  const yOf = (i: number) => height - bottom - (i * (height - top - bottom)) / span;
  const xOf = (i: number) => (i % 2 === 0 ? X_LEFT : X_RIGHT);

  const nodes = Array.from({ length: count }, (_, i) => ({ x: xOf(i), y: yOf(i) }));
  const trail = nodes.map((q, i) => `${i === 0 ? 'M' : 'L'}${q.x} ${q.y.toFixed(1)}`).join(' ');
  const summitX = xOf(count - 1);
  const summitY = yOf(count - 1);
  const allDone = done.every(Boolean);

  return (
    <View style={{ width: RAIL_W, height }}>
      <Svg width={RAIL_W} height={height}>
        {/* trail to the summit mark */}
        <Path
          d={`${trail} L${summitX} ${(summitY - 16).toFixed(1)}`}
          stroke={palette.faint}
          strokeWidth={1.5}
          strokeDasharray="4 3"
          fill="none"
        />
        {/* summit peak */}
        <Path
          d={`M${summitX - 8} ${(summitY - 18).toFixed(1)} L${summitX} ${(summitY - 30).toFixed(1)} L${summitX + 8} ${(summitY - 18).toFixed(1)}`}
          stroke={allDone ? palette.gold : palette.lock}
          strokeWidth={2}
          strokeLinejoin="round"
          fill="none"
        />
        {nodes.map((q, i) => {
          const isDone = done[i];
          const isCur = i === current;
          return (
            <Circle
              key={i}
              cx={q.x}
              cy={q.y}
              r={isCur ? 6.5 : 4.5}
              fill={isDone ? palette.green : palette.bg}
              stroke={isCur ? palette.orange : isDone ? palette.green : palette.lock}
              strokeWidth={isCur ? 2.5 : 1.5}
            />
          );
        })}
      </Svg>
      {/* 44pt-tall tap zones over each turn */}
      {nodes.map((q, i) => (
        <Pressable
          key={i}
          onPress={() => onSelect(i)}
          style={{ position: 'absolute', left: 0, top: q.y - 22, width: RAIL_W, height: 44 }}
        />
      ))}
    </View>
  );
}
