import Svg, { Circle, G, Path } from 'react-native-svg';

import { palette } from '@/constants/theme';

interface Props {
  iconPaths: string[];
  ring: string;
  icon: string;
  size: number;
  bg?: string;
  innerStroke?: string;
  innerOpacity?: number;
  star?: boolean;
}

export function BadgeMedal({
  iconPaths,
  ring,
  icon,
  size,
  bg = 'transparent',
  innerStroke,
  innerOpacity = 0.4,
  star = false,
}: Props) {
  return (
    <Svg viewBox="0 0 72 72" width={size} height={size}>
      <Circle cx={36} cy={36} r={34} fill={bg} stroke={ring} strokeWidth={2} />
      <Circle
        cx={36}
        cy={36}
        r={28}
        fill="none"
        stroke={innerStroke ?? ring}
        strokeWidth={1}
        opacity={innerOpacity}
      />
      <G transform="translate(12,12)">
        {iconPaths.map((d, i) => (
          <Path
            key={i}
            d={d}
            fill="none"
            stroke={icon}
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ))}
      </G>
      {star && <Circle cx={36} cy={65} r={3} fill={palette.orange} stroke={palette.bg} strokeWidth={1} />}
    </Svg>
  );
}
