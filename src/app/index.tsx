import { StyleSheet, Text, View } from 'react-native';

import { Colors, FontFamily, Spacing } from '@/constants/theme';
import { isDeloadWeek, PROGRAM_WEEKS, weekFor } from '@/program/schedule';

const c = Colors.dark;

// Placeholder until the Today screen is ported from the design file.
export default function TodayScreen() {
  const week = weekFor(new Date());

  return (
    <View style={styles.container}>
      <Text style={styles.kicker}>EXPEDITION CONDITIONING</Text>
      {week === null ? (
        <Text style={styles.title}>OFF PROGRAM</Text>
      ) : (
        <Text style={styles.title}>
          WEEK {week} / {PROGRAM_WEEKS}
        </Text>
      )}
      {week !== null && isDeloadWeek(week) && <Text style={styles.deload}>DELOAD</Text>}
      <Text style={styles.note}>Today screen lands with the design import</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: c.background,
    gap: Spacing.three,
  },
  kicker: {
    fontFamily: FontFamily.mono,
    fontSize: 12,
    letterSpacing: 3,
    color: c.accent,
  },
  title: {
    fontFamily: FontFamily.displayBold,
    fontSize: 40,
    letterSpacing: 2,
    color: c.text,
  },
  deload: {
    fontFamily: FontFamily.monoBold,
    fontSize: 13,
    letterSpacing: 2,
    color: c.gold,
  },
  note: {
    fontFamily: FontFamily.mono,
    fontSize: 12,
    color: c.textSecondary,
  },
});
