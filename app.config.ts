import type { ExpoConfig } from 'expo/config';

import appJson from './app.json';

// Dynamic config so the Mapbox SDK **download** token (secret, sk.…) is read
// from the environment at build time and never committed to app.json.
// Set MAPBOX_DOWNLOAD_TOKEN locally (.env) and as an EAS env var for cloud builds.
const base = appJson.expo as ExpoConfig;

export default (): ExpoConfig => ({
  ...base,
  plugins: [
    ...(base.plugins ?? []),
    [
      '@rnmapbox/maps',
      {
        RNMapboxMapsDownloadToken: process.env.MAPBOX_DOWNLOAD_TOKEN ?? '',
      },
    ],
  ],
});
