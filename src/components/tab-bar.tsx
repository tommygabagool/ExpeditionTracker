import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { FontFamily, palette } from '@/constants/theme';

export type MainTab = 'today' | 'week' | 'fuel' | 'trails';

const TABS: { key: MainTab; label: string }[] = [
  { key: 'today', label: 'TODAY' },
  { key: 'week', label: 'WEEK' },
  { key: 'fuel', label: 'FUEL' },
  { key: 'trails', label: 'TRAILS' },
];

export function TabBar({ active, onChange }: { active: string; onChange: (t: MainTab) => void }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.bar, { paddingBottom: insets.bottom }]}>
      {TABS.map((t) => {
        const on = active === t.key;
        return (
          <Pressable key={t.key} onPress={() => onChange(t.key)} style={styles.item}>
            <View style={[styles.indicator, { backgroundColor: on ? palette.orange : 'transparent' }]} />
            <Text style={[styles.label, { color: on ? palette.barText : palette.barTextDim }]}>
              {t.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: palette.barBg,
    borderTopWidth: 1,
    borderTopColor: palette.line,
    flexDirection: 'row',
  },
  item: {
    flex: 1,
    paddingTop: 14,
    paddingBottom: 18,
    alignItems: 'center',
    gap: 5,
  },
  indicator: {
    width: 16,
    height: 3,
  },
  label: {
    fontFamily: FontFamily.display,
    fontSize: 13,
    letterSpacing: 2,
  },
});
