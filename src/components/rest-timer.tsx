import { Pressable, StyleSheet, Text, View } from 'react-native';

import { FontFamily, palette } from '@/constants/theme';

// Between-set countdown, styled as a dark instrument band. Parent owns the
// clock; this renders remaining time with a draining track.

interface Props {
  remainingSec: number;
  totalSec: number;
  onExtend: () => void; // +30 s
  onSkip: () => void;
}

export function RestTimer({ remainingSec, totalSec, onExtend, onSkip }: Props) {
  const m = Math.floor(remainingSec / 60);
  const s = remainingSec % 60;
  const frac = totalSec > 0 ? remainingSec / totalSec : 0;
  return (
    <View style={styles.band}>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={styles.label}>REST</Text>
        <Text style={styles.clock}>
          {m}:{String(s).padStart(2, '0')}
        </Text>
        <View style={styles.track}>
          <View style={{ height: '100%', width: `${Math.round(frac * 100)}%`, backgroundColor: palette.orange }} />
        </View>
      </View>
      <Pressable onPress={onExtend} style={styles.btn} hitSlop={4}>
        <Text style={styles.btnText}>+30 s</Text>
      </Pressable>
      <Pressable onPress={onSkip} style={styles.btn} hitSlop={4}>
        <Text style={styles.btnText}>SKIP</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  band: {
    backgroundColor: palette.barBg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  label: {
    fontFamily: FontFamily.display,
    fontSize: 11,
    letterSpacing: 2,
    color: palette.gold,
  },
  clock: {
    fontFamily: FontFamily.monoBold,
    fontSize: 30,
    lineHeight: 36,
    color: palette.barText,
  },
  track: {
    height: 4,
    marginTop: 4,
    backgroundColor: 'rgba(242, 236, 220, 0.18)',
  },
  btn: {
    minWidth: 64,
    height: 44,
    borderWidth: 1,
    borderColor: palette.barTextDim,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
  },
  btnText: {
    fontFamily: FontFamily.display,
    fontSize: 13,
    letterSpacing: 1,
    color: palette.barText,
  },
});
