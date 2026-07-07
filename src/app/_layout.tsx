import { AlfaSlabOne_400Regular } from '@expo-google-fonts/alfa-slab-one';
import {
  SourceSans3_400Regular,
  SourceSans3_600SemiBold,
  SourceSans3_700Bold,
  useFonts,
} from '@expo-google-fonts/source-sans-3';
import { SpaceMono_400Regular, SpaceMono_700Bold } from '@expo-google-fonts/space-mono';
import { DefaultTheme, ThemeProvider } from 'expo-router';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';

import { palette } from '@/constants/theme';
import { ensureDefaultProfile } from '@/data/repos';
import { initMapbox } from '@/lib/mapbox';
import { startSyncEngine } from '@/sync/engine';

SplashScreen.preventAutoHideAsync();

const navTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: palette.orange,
    background: palette.bg,
    card: palette.bg,
    text: palette.text,
    border: palette.border,
  },
};

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    AlfaSlabOne_400Regular,
    SourceSans3_400Regular,
    SourceSans3_600SemiBold,
    SourceSans3_700Bold,
    SpaceMono_400Regular,
    SpaceMono_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  useEffect(() => {
    initMapbox();
    ensureDefaultProfile();
    return startSyncEngine();
  }, []);

  if (!fontsLoaded) {
    return null;
  }

  return (
    <ThemeProvider value={navTheme}>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: palette.bg },
        }}
      />
    </ThemeProvider>
  );
}
