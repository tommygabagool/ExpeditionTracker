import { StyleSheet, Text, View } from 'react-native';

import { Colors, FontFamily, Spacing } from '@/constants/theme';

const c = Colors.dark;

export function PlaceholderScreen({ title, note }: { title: string; note?: string }) {
  return (
    <View style={styles.container}>
      <View style={styles.rule} />
      <Text style={styles.title}>{title.toUpperCase()}</Text>
      <Text style={styles.note}>{note ?? 'Screen lands with the design import'}</Text>
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
  rule: {
    width: 40,
    height: 3,
    backgroundColor: c.accent,
  },
  title: {
    fontFamily: FontFamily.display,
    fontSize: 28,
    letterSpacing: 2,
    color: c.text,
  },
  note: {
    fontFamily: FontFamily.mono,
    fontSize: 12,
    color: c.textSecondary,
  },
});
