import Mapbox, { Camera, LineLayer, MapView, MarkerView, ShapeSource } from '@rnmapbox/maps';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { FontFamily, palette } from '@/constants/theme';
import { MAP_STYLE_URL, MAPBOX_READY } from '@/lib/mapbox';

// Live trailhead map for the detail view. One MapView instance only — list
// cards keep the cheap procedural SVG art. Falls back to a message when no
// token is configured so the app still runs. Draws whatever route it's given —
// a curated trail's baked geometry (trail-geo.ts) or a nearby trail's OSM
// geometry from the nearby_trails RPC — and fits the camera to it.
export function TrailMap({
  path,
  center,
}: {
  /** Route as [longitude, latitude] points; null → no line, just the marker. */
  path: [number, number][] | null;
  /** Trailhead marker + fallback camera center. */
  center: [number, number];
}) {
  if (!MAPBOX_READY) {
    return (
      <View style={[styles.map, styles.fallback]}>
        <Text style={styles.fallbackText}>SET EXPO_PUBLIC_MAPBOX_TOKEN TO ENABLE THE MAP</Text>
      </View>
    );
  }

  const bounds =
    path && path.length > 1
      ? {
          ne: [Math.max(...path.map((p) => p[0])), Math.max(...path.map((p) => p[1]))] as [number, number],
          sw: [Math.min(...path.map((p) => p[0])), Math.min(...path.map((p) => p[1]))] as [number, number],
          paddingTop: 28,
          paddingBottom: 28,
          paddingLeft: 28,
          paddingRight: 28,
        }
      : null;

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
          defaultSettings={bounds ? { bounds } : { centerCoordinate: center, zoomLevel: 12.5 }}
          animationMode="none"
        />
        {path && path.length > 1 && (
          <ShapeSource
            id="trail-route"
            shape={{ type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: path } }}>
            <LineLayer
              id="trail-route-line"
              style={{
                lineColor: palette.orange,
                lineWidth: 2.5,
                lineDasharray: [2, 1.5],
                lineCap: 'round',
                lineJoin: 'round',
              }}
            />
          </ShapeSource>
        )}
        <MarkerView coordinate={center} anchor={{ x: 0.5, y: 1 }}>
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
    fontSize: 12,
    color: palette.faint,
    letterSpacing: 1,
    textAlign: 'center',
    paddingHorizontal: 24,
  },
});
