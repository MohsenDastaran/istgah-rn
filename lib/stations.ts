import { stations as rawStations } from '@/assets/data/stations';
import type { Station as RawStation } from '~/types/station';
import { lineColors as LINE_COLORS, lineNames as LINE_NAMES } from '@/assets/data/metroLines';

export type Station = {
  id: string;
  name: { en: string; fa: string };
  /** Primary line key, e.g. "1", "2", "1,3" for interchange stations */
  lineKey: string;
  /** Human-readable label for the primary line */
  line: string;
  /** Hex colour for the primary line (or first line for interchanges) */
  lineColor: string;
  /** All line colours for this station — >1 element means interchange */
  lineColors: string[];
  coordinates: [number, number]; // [longitude, latitude]
  isActive: boolean;
};

/** Map a raw data record to the app `Station` type. */
function mapRawStation(s: RawStation): Station {
  const lineKey = s['Line(s)'];
  const keys = lineKey.split(',').map((k) => k.trim());
  const primary = keys[0];
  return {
    id: s.ID,
    name: { en: s['Name English'], fa: s['Name Persian'] },
    lineKey,
    line: (LINE_NAMES as Record<string, string>)[primary] ?? `Line ${primary}`,
    lineColor: (LINE_COLORS as Record<string, string>)[primary] ?? '#888888',
    lineColors: keys.map((k) => (LINE_COLORS as Record<string, string>)[k] ?? '#888888'),
    coordinates: [parseFloat(s.Longitude), parseFloat(s.Latitude)],
    isActive: s['Is Active'] === 'T',
  };
}

export const STATIONS: Station[] = rawStations.map(mapRawStation);

/** Stations that sit on two or more lines — rendered with split-colour markers. */
export const INTERCHANGE_STATIONS: Station[] = STATIONS.filter((s) =>
  s.lineKey.includes(',')
);

// ─── Metro line polylines ─────────────────────────────────────────────────────

export type LinePolyline = {
  lineKey: string;
  name: string;
  color: string;
  coordinates: [number, number][];
};

/**
 * Builds one ordered polyline per metro line by following Previous/Next links.
 * Interchange stations carry parallel comma-separated IDs (one per line they
 * belong to), so we resolve neighbours only within each line's station set.
 */
export function buildLinePolylines(raw: RawStation[]): LinePolyline[] {
  const byId = new Map(raw.map((s) => [s.ID, s]));

  // Collect all unique line keys (e.g. "1", "2", "BRT")
  const lineKeys = new Set<string>();
  raw.forEach((s) => s['Line(s)'].split(',').forEach((l) => lineKeys.add(l.trim())));

  const result: LinePolyline[] = [];

  for (const line of lineKeys) {
    // All raw stations on this line
    const lineSet = new Set(
      raw
        .filter((s) =>
          s['Line(s)']
            .split(',')
            .map((l) => l.trim())
            .includes(line)
        )
        .map((s) => s.ID)
    );

    // Terminal: the station where none of its Previous IDs belong to this line
    // (i.e. Previous = "-1" or all Previous IDs are outside the line)
    const terminal = raw.find((s) => {
      if (!lineSet.has(s.ID)) return false;
      const prevIds = s.Previous.split(',').map((p) => p.trim());
      return !prevIds.some((p) => lineSet.has(p));
    });

    if (!terminal) continue;

    const coords: [number, number][] = [];
    const visited = new Set<string>();
    let current: RawStation | undefined = terminal;

    while (current && !visited.has(current.ID)) {
      visited.add(current.ID);
      coords.push([parseFloat(current.Longitude), parseFloat(current.Latitude)]);

      // Resolve next: find the Next ID that belongs to this line and isn't visited
      const nextIds: string[] = current.Next.split(',').map((n: string) => n.trim());
      const nextId: string | undefined = nextIds.find(
        (n: string) => lineSet.has(n) && !visited.has(n)
      );
      current = nextId ? byId.get(nextId) : undefined;
    }

    if (coords.length >= 2) {
      result.push({
        lineKey: line,
        name: (LINE_NAMES as Record<string, string>)[line] ?? `Line ${line}`,
        color: (LINE_COLORS as Record<string, string>)[line] ?? '#888888',
        coordinates: coords,
      });
    }
  }

  return result;
}

/** Pre-computed metro line polylines — same data, computed once at module load. */
export const LINE_POLYLINES: LinePolyline[] = buildLinePolylines(rawStations);

// ─── Segment-based GeoJSON (handles all branches & interchange stations) ──────

/**
 * Builds a GeoJSON FeatureCollection where every edge (A→B) between adjacent
 * active stations is a LineString feature.  Because we iterate each station's
 * `Next` list and create one feature per connection, this correctly handles:
 *  - Interchange stations whose `Next` field is comma-separated (e.g. "116,137")
 *  - True branching lines (Y-junction)
 *  - Inactive stations in the middle of a chain (skipped automatically)
 */
export function buildMetroNetworkGeoJSON(active: RawStation[]) {
  const byId = new Map(active.map((s) => [s.ID, s]));
  const seen = new Set<string>();

  const features: {
    type: 'Feature';
    properties: { lineKey: string; color: string };
    geometry: { type: 'LineString'; coordinates: [number, number][] };
  }[] = [];

  for (const station of active) {
    const nextIds = station.Next.split(',')
      .map((n) => n.trim())
      .filter((n) => n !== '-1' && n !== '');

    for (const nextId of nextIds) {
      const next = byId.get(nextId);
      if (!next) continue;

      // Deduplicate A↔B (avoid drawing the same segment twice)
      const edgeKey = [station.ID, nextId].sort().join('|');
      if (seen.has(edgeKey)) continue;
      seen.add(edgeKey);

      // Determine which line this edge belongs to (first shared line)
      const aLines = station['Line(s)'].split(',').map((l) => l.trim());
      const bLines = next['Line(s)'].split(',').map((l) => l.trim());
      const sharedLine = aLines.find((l) => bLines.includes(l)) ?? aLines[0];

      features.push({
        type: 'Feature',
        properties: {
          lineKey: sharedLine,
          color: (LINE_COLORS as Record<string, string>)[sharedLine] ?? '#888888',
        },
        geometry: {
          type: 'LineString',
          coordinates: [
            [parseFloat(station.Longitude), parseFloat(station.Latitude)],
            [parseFloat(next.Longitude), parseFloat(next.Latitude)],
          ],
        },
      });
    }
  }

  return { type: 'FeatureCollection' as const, features };
}

/** Pre-computed metro network GeoJSON — segment per connection, computed once. */
export const METRO_NETWORK_GEOJSON = buildMetroNetworkGeoJSON(rawStations);

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
        isActive: s.isActive,
      },
      geometry: {
        type: 'Point' as const,
        coordinates: s.coordinates,
      },
    })),
  };
}

/**
 * Pre-computed station points GeoJSON — single-line stations only.
 * Interchange stations are rendered separately as native split-colour markers.
 */
export const STATIONS_GEOJSON = toGeoJSON(
  STATIONS.filter((s) => !s.lineKey.includes(','))
);
