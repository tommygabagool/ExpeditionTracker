import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { FontFamily, palette } from '@/constants/theme';

import { BadgeMedal } from './badge-medal';

interface Props {
  title: string;
  iconPaths: string[];
  campName: string;
  onDismiss: () => void;
}

export function CelebrationToast({ title, iconPaths, campName, onDismiss }: Props) {
  const insets = useSafeAreaInsets();
  return (
    <Pressable onPress={onDismiss} style={[styles.toast, { top: insets.top + 14 }]}>
      <BadgeMedal
        iconPaths={iconPaths}
        ring={palette.gold}
        icon={palette.gold}
        bg={palette.bg}
        innerStroke={palette.orange}
        innerOpacity={0.6}
        size={56}
      />
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={styles.kicker}>▲ MILESTONE UNLOCKED</Text>
        <Text style={styles.title}>{title.toUpperCase()}</Text>
        <Text style={styles.sub}>{campName} · TAP TO DISMISS</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  toast: {
    position: 'absolute',
    left: 14,
    right: 14,
    zIndex: 50,
    backgroundColor: palette.panel,
    borderWidth: 1,
    borderColor: palette.orange,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
    shadowColor: '#000',
    shadowOpacity: 0.6,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 12 },
    elevation: 12,
  },
  kicker: {
    fontFamily: FontFamily.display,
    fontSize: 12,
    letterSpacing: 2,
    color: palette.orange,
  },
  title: {
    fontFamily: FontFamily.displaySemiBold,
    fontSize: 18,
    letterSpacing: 0.5,
    marginTop: 3,
    lineHeight: 21,
    color: palette.text,
  },
  sub: {
    fontFamily: FontFamily.mono,
    fontSize: 12,
    color: palette.muted,
    marginTop: 3,
  },
});
