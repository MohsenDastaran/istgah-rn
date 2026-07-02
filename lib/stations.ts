import { stations as rawStations } from '@/assets/data/stations';
import { lineColors, lineNames } from '@/assets/data/metroLines';

export type Station = {
  id: string;
  name: { en: string; fa: string };
  /** Primary line key, e.g. "1", "2", "1,3" for interchange stations */
  lineKey: string;
  /** Human-readable label for the primary line */
  line: string;
  /** Hex colour for the primary line (or first line for interchanges) */
  lineColor: string;
  coordinates: [number, number]; // [longitude, latitude]
  isActive: boolean;
};

/** Derive the primary line key from a "Line(s)" string like "1" or "1,3". */
function primaryLine(lineStr: string): string {
  return lineStr.split(',')[0].trim();
}

export const STATIONS: Station[] = rawStations
  .filter((s) => s['Is Active'] === 'T')
  .map((s) => {
    const lineKey = s['Line(s)'];
    const primary = primaryLine(lineKey);
    return {
      id: s.ID,
      name: { en: s['Name English'], fa: s['Name Persian'] },
      lineKey,
      line: (lineNames as Record<string, string>)[primary] ?? `Line ${primary}`,
      lineColor: (lineColors as Record<string, string>)[primary] ?? '#888888',
      coordinates: [parseFloat(s.Longitude), parseFloat(s.Latitude)],
      isActive: true,
    };
  });

export function toGeoJSON(stations: Station[]) {
  return {
    type: 'FeatureCollection' as const,
    features: stations.map((s) => ({
      type: 'Feature' as const,
      properties: {
        id: s.id,
        nameEn: s.name.en,
        nameFa: s.name.fa,
        line: s.line,
        lineColor: s.lineColor,
      },
      geometry: {
        type: 'Point' as const,
        coordinates: s.coordinates,
      },
    })),
  };
}
