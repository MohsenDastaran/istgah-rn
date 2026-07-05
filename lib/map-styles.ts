import type { StyleSpecification } from '@maplibre/maplibre-react-native';

export const CARTO_STYLES = {
  dark: 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json',
  light: 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json',
} as const;

export const ESRI_ATTRIBUTION =
  '© Esri, Maxar, Earthstar Geographics, and the GIS User Community';

/** Esri World Imagery — raster satellite tiles (attribution required). */
export const SATELLITE_STYLE: StyleSpecification = {
  version: 8,
  name: 'Esri World Imagery',
  sources: {
    'esri-world-imagery': {
      type: 'raster',
      tiles: [
        'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      ],
      tileSize: 256,
      maxzoom: 19,
      attribution: ESRI_ATTRIBUTION,
    },
  },
  layers: [
    {
      id: 'esri-world-imagery-layer',
      type: 'raster',
      source: 'esri-world-imagery',
    },
  ],
};

export type MapTheme = 'light' | 'dark';

export function resolveMapStyle(
  basemap: 'street' | 'satellite',
  theme: MapTheme
): string | StyleSpecification {
  if (basemap === 'satellite') return SATELLITE_STYLE;
  return theme === 'dark' ? CARTO_STYLES.dark : CARTO_STYLES.light;
}
