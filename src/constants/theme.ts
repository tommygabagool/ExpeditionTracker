// "Ranger Poster" design language — WPA national-park print: cream paper,
// ink, pine, sunset, gold. Chosen July 7, 2026; supersedes the original dark
// #10161C design from the Claude Design export.
//
// Semantic keys are unchanged from the dark theme so components didn't churn:
// green = pine (base phase / success), blue = sky (load phase),
// orange = sunset (push phase / primary action), gold = badges.
export const palette = {
  bg: '#F2ECDC', // cream paper
  barBg: '#26241C', // ink band (tab bar)
  barText: '#F2ECDC',
  barTextDim: '#8B8266',
  panel: '#E9E1CC', // aged card
  panelDeep: '#DFD5BB',
  line: '#D3C7A9', // hairline
  border: '#B7A87F',
  text: '#2C2A20', // ink
  textDim: '#4F4A38',
  muted: '#7A7258',
  faint: '#A29878',
  lock: '#B3A98C',
  green: '#2F5233', // pine
  blue: '#7A9FB3', // sky
  orange: '#C75B39', // sunset
  gold: '#C99C3C',
} as const;

/** rgba tint of the gold, for callout backgrounds on cream. */
export const goldTint = 'rgba(201, 156, 60, 0.16)';

// Loaded in src/app/_layout.tsx. Alfa Slab One ships one weight, so both big
// display slots map to it; small caps labels use bold Source Sans instead
// (slab at 9-11px letterspaced reads as mud).
export const FontFamily = {
  display: 'SourceSans3_700Bold', // small caps labels, chips, axis text
  displayMedium: 'SourceSans3_700Bold',
  displaySemiBold: 'AlfaSlabOne_400Regular', // panel + card titles
  displayBold: 'AlfaSlabOne_400Regular', // hero titles
  mono: 'SpaceMono_400Regular',
  monoMedium: 'SpaceMono_400Regular',
  monoBold: 'SpaceMono_700Bold',
  body: 'SourceSans3_400Regular',
  bodyMedium: 'SourceSans3_600SemiBold',
  bodySemiBold: 'SourceSans3_600SemiBold',
} as const;
