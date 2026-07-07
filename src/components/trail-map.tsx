import Mapbox, { Camera, MapView, MarkerView } from '@rnmapbox/maps';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { FontFamily, palette } from '@/constants/theme';
import { MAP_STYLE_URL, MAPBOX_READY } from '@/lib/mapbox';
import type { Trail } from '@/data/trails';

// Live trailhead map for the detail view. One MapView instance only — list
// cards keep the cheap procedural SVG art. Falls back to a message when no
// token is configured so the app still runs.
export function TrailMap({ trail }: { trail: Trail }) {
  if (!MAPBOX_READY) {
    return (
      <View style={[styles.map, styles.fallback]}>
        <Text style={styles.fallbackText}>SET EXPO_PUBLIC_MAPBOX_TOKEN TO ENABLE THE MAP</Text>
      </View>
    );
  }

  return (
    <View style={styles.map}>
      <MapView
        style={StyleSheet.absoluteFill}
        styleURL={MAP_STYLE_URL}
        logoEnabled={false}
        attributionEnabled
        attributionPosition={{ bottom: 6, right: 6 }}
        scaleBarEnabled={false}
        compassEnabled={false}>
        <Camera
          defaultSettings={{ centerCoordinate: trail.center, zoomLevel: 12.5 }}
          animationMode="none"
        />
        <MarkerView coordinate={trail.center} anchor={{ x: 0.5, y: 1 }}>
          <Svg viewBox="0 0 24 24" width={30} height={30}>
            <Path
              d="M2 20 L9 7 L13 13 L16 9 L22 20 Z"
              fill={palette.bg}
              stroke={palette.gold}
              strokeWidth={1.6}
              strokeLinejoin="round"
            />
          </Svg>
        </MarkerView>
      </MapView>
    </View>
  );
}

// Ensure the native module is retained by bundlers that tree-shake side effects.
void Mapbox;

const styles = StyleSheet.create({
  map: {
    width: '100%',
    aspectRatio: 358 / 210,
    backgroundColor: palette.bg,
  },
  fallback: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: palette.line,
  },
  fallbackText: {
    fontFamily: FontFamily.mono,
    fontSize: 10,
    color: palette.faint,
    letterSpacing: 1,
    textAlign: 'center',
    paddingHorizontal: 24,
  },
});
