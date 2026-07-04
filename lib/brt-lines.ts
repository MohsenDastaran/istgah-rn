import rawBrtLines from '../assets/data/tehranBRTLines.json';

const BRT_COLORS: Record<string, string> = {
  '1': '#ef4444',
  '2': '#a855f7',
  '3': '#2563eb',
  '4': '#22c55e',
  '5': '#ec4899',
  '6': '#eab308',
  '7': '#14b8a6',
  '8': '#f97316',
  '9': '#6366f1',
  '10': '#84cc16',
};

function brtColor(name: string) {
  const line = name.match(/BRT\s*(\d+)/i)?.[1];
  return (line && BRT_COLORS[line]) || '#f97316';
}

export const TEHRAN_BRT_LINES_GEOJSON = {
  type: 'FeatureCollection' as const,
  features: rawBrtLines.features
    .filter((f) => f.geometry.type === 'LineString')
    .map((f) => ({
      ...f,
      properties: {
        ...f.properties,
        color: brtColor(String(f.properties?.Name ?? '')),
      },
      geometry: {
        type: 'LineString' as const,
        coordinates: f.geometry.coordinates.map(([lng, lat]) => [lng, lat]),
      },
    })),
};
