import { NativeTabs } from 'expo-router/unstable-native-tabs';

import { Colors } from '@/constants/theme';

const c = Colors.dark;

const TABS = [
  { name: 'index', label: 'Today', sf: 'flag.fill' },
  { name: 'week', label: 'Week', sf: 'calendar' },
  { name: 'fuel', label: 'Fuel', sf: 'fork.knife' },
  { name: 'weight', label: 'Weight', sf: 'scalemass.fill' },
  { name: 'trails', label: 'Trails', sf: 'map.fill' },
  { name: 'summit', label: 'Summit', sf: 'medal.fill' },
] as const;

export default function AppTabs() {
  return (
    <NativeTabs
      backgroundColor={c.background}
      indicatorColor={c.backgroundSelected}
      labelStyle={{ selected: { color: c.gold } }}>
      {TABS.map((tab) => (
        <NativeTabs.Trigger key={tab.name} name={tab.name}>
          <NativeTabs.Trigger.Label>{tab.label}</NativeTabs.Trigger.Label>
          <NativeTabs.Trigger.Icon sf={tab.sf} />
        </NativeTabs.Trigger>
      ))}
    </NativeTabs>
  );
}
