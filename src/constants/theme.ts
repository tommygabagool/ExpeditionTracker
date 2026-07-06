// Exact palette from design/extracted/template.html (Expedition Conditioning.dc.html).
export const palette = {
  bg: '#10161C',
  barBg: '#0C1116',
  panel: '#1A2430',
  panelDeep: '#141C25',
  line: '#232F3B',
  border: '#33465A',
  text: '#E8E4DC',
  textDim: '#A8B4BF',
  muted: '#7A8794',
  faint: '#4A5866',
  lock: '#3A4653',
  green: '#5B8C5A',
  blue: '#4E7A96',
  orange: '#C1652E',
  gold: '#E3B341',
} as const;

// Loaded in src/app/_layout.tsx via @expo-google-fonts packages.
export const FontFamily = {
  display: 'Oswald_400Regular',
  displayMedium: 'Oswald_500Medium',
  displaySemiBold: 'Oswald_600SemiBold',
  displayBold: 'Oswald_700Bold',
  mono: 'JetBrainsMono_400Regular',
  monoMedium: 'JetBrainsMono_500Medium',
  monoBold: 'JetBrainsMono_700Bold',
  body: 'Inter_400Regular',
  bodyMedium: 'Inter_500Medium',
  bodySemiBold: 'Inter_600SemiBold',
} as const;
