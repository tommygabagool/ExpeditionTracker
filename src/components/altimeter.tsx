import { useEffect, useRef, useState } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { FontFamily, palette } from '@/constants/theme';
import { ICONS } from '@/program/badges';
import { streakHeat, type Ascent } from '@/program/ascent';

const HEAT_COLOR = { ember: palette.faint, flame: palette.orange, blaze: palette.gold } as const;

export function StreakFlame({ streak, size = 16 }: { streak: number; size?: number }) {
  return (
    <Svg viewBox="0 0 48 48" width={size} height={size}>
      <Path d={ICONS.fire[0]} fill={HEAT_COLOR[streakHeat(streak)]} />
    </Svg>
  );
}

// The climb, front and center: animated altitude, rank progress, streak heat,
// and what today's session banks.
export function Altimeter({ ascent }: { ascent: Ascent }) {
  const anim = useRef(new Animated.Value(0)).current;
  const [shown, setShown] = useState(0);

  useEffect(() => {
    const sub = anim.addListener(({ value }) => setShown(Math.round(value)));
    Animated.timing(anim, {
      toValue: ascent.altitudeFt,
      duration: 900,
      useNativeDriver: false,
    }).start();
    return () => anim.removeListener(sub);
  }, [anim, ascent.altitudeFt]);

  return (
    <View style={styles.card}>
      <View style={styles.topRow}>
        <Text style={styles.label}>ALTITUDE</Text>
        <View style={styles.streak}>
          <StreakFlame streak={ascent.streak} />
          <Text style={[styles.streakText, { color: HEAT_COLOR[streakHeat(ascent.streak)] }]}>
            {ascent.streak} DAY{ascent.streak === 1 ? '' : 'S'}
            {ascent.shielded ? ' ⛨' : ''}
          </Text>
        </View>
      </View>

      <View style={styles.altRow}>
        <Text style={styles.altitude}>{shown.toLocaleString('en-US')}</Text>
        <Text style={styles.altUnit}>FT</Text>
      </View>

      <View style={styles.rankTrack}>
        <View style={[styles.rankFill, { width: `${Math.round(ascent.rankProgress * 100)}%` }]} />
      </View>
      <Text style={styles.rankLine}>
        <Text style={{ color: palette.orange }}>{ascent.rank.title}</Text>
        {ascent.nextRank
          ? ` · ${(ascent.nextRank.atFt - ascent.altitudeFt).toLocaleString('en-US')} FT TO ${ascent.nextRank.title}`
          : ' · THE TOP OF THE WORLD'}
      </Text>

      <Text style={[styles.todayLine, { color: ascent.todayDone ? palette.green : palette.muted }]}>
        {ascent.todayDone
          ? `✓ BANKED +${ascent.todayWorthFt} FT TODAY`
          : `TODAY'S SESSION IS WORTH +${ascent.todayWorthFt} FT`}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: palette.panel,
    borderWidth: 1,
    borderColor: palette.line,
    borderTopWidth: 3,
    borderTopColor: palette.green,
    padding: 14,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  label: {
    fontFamily: FontFamily.display,
    fontSize: 10,
    letterSpacing: 2,
    color: palette.muted,
  },
  streak: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  streakText: {
    fontFamily: FontFamily.monoBold,
    fontSize: 11,
    letterSpacing: 0.5,
  },
  altRow: { flexDirection: 'row', alignItems: 'baseline', gap: 6, marginTop: 2 },
  altitude: {
    fontFamily: FontFamily.displayBold,
    fontSize: 34,
    color: palette.text,
  },
  altUnit: {
    fontFamily: FontFamily.mono,
    fontSize: 13,
    color: palette.muted,
  },
  rankTrack: {
    height: 6,
    backgroundColor: palette.bg,
    borderWidth: 1,
    borderColor: palette.line,
    marginTop: 10,
  },
  rankFill: { height: '100%', backgroundColor: palette.orange },
  rankLine: {
    fontFamily: FontFamily.mono,
    fontSize: 10,
    color: palette.muted,
    marginTop: 6,
    letterSpacing: 0.3,
  },
  todayLine: {
    fontFamily: FontFamily.monoBold,
    fontSize: 11,
    marginTop: 10,
  },
});
