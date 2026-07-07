import Svg, { Circle, ClipPath, Defs, G, Path, Polyline } from 'react-native-svg';

import { palette } from '@/constants/theme';

// The SWITCHBACK mark — same geometry as scripts/make-icons.js. Keep the two
// in sync if the mark ever changes.
const MOUNTAIN = 'M82 901 L512 164 L942 901 Z';
const TRAIL = '594,901 205,778 778,635 328,491 594,369 512,225';
const SNOWCAP = 'M512 164 L635 379 L586 337 L512 400 L438 337 L389 379 Z';

export function Logo({ size = 48 }: { size?: number }) {
  return (
    <Svg viewBox="0 0 1024 1024" width={size} height={size}>
      <Defs>
        <ClipPath id="logo-mt">
          <Path d={MOUNTAIN} />
        </ClipPath>
      </Defs>
      <Circle cx={737} cy={266} r={133} fill={palette.gold} stroke={palette.text} strokeWidth={16} />
      <Path d={MOUNTAIN} fill={palette.green} stroke={palette.text} strokeWidth={20} strokeLinejoin="round" />
      <G clipPath="url(#logo-mt)">
        <Polyline
          points={TRAIL}
          fill="none"
          stroke={palette.text}
          strokeWidth={72}
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        <Polyline
          points={TRAIL}
          fill="none"
          stroke={palette.bg}
          strokeWidth={44}
          strokeLinejoin="round"
          strokeLinecap="round"
        />
      </G>
      <Path d={SNOWCAP} fill={palette.bg} stroke={palette.text} strokeWidth={14} strokeLinejoin="round" />
    </Svg>
  );
}
