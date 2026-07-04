import rawBusStops from '../assets/data/tehranBusStops.json';
import type { Strings } from './i18n';

export type BusStop = {
  id: string;
  name: string;
  latinName: string;
  address: string;
  coordinate: [number, number]; // [lng, lat]
  lines: string;
  isBRT: boolean;
  brtLine: string;
  direction: string;
  stationCode: string;
  seat: string;
  shelter: string;
  light: string;
  disabledAccess: string;
  transportMode: string;
};

/** Map raw Persian facility values to localized labels when lang is English. */
export function formatBusFacilityValue(
  value: string,
  lang: 'en' | 'fa',
  t: Pick<Strings, 'facilityYes' | 'facilityNo' | 'facilityNeeded'>
): string {
  const raw = value.trim();
  if (!raw) return '';

  if (lang === 'fa') return raw;

  const yes = new Set(['دارد', 'بله', 'هست', 'yes']);
  const no = new Set(['ندارد', 'خیر', 'نیست', 'no', 'عدم ن']);
  const needed = new Set(['نیاز', 'needed']);

  if (yes.has(raw) || yes.has(raw.toLowerCase())) return t.facilityYes;
  if (no.has(raw) || no.has(raw.toLowerCase())) return t.facilityNo;
  if (needed.has(raw) || needed.has(raw.toLowerCase())) return t.facilityNeeded;

  return raw;
}

function isBRTStop(brt: unknown): boolean {
  if (!brt || brt === '0') return false;
  const s = String(brt);
  return s.startsWith('BRT') || s.startsWith('brt');
}

export const BUS_STOPS: BusStop[] = (
  rawBusStops.features as Array<{
    geometry: { type: string; coordinates: number[] };
    properties: Record<string, unknown>;
  }>
)
  .filter((f) => f.geometry.type === 'Point' && f.properties['XGEO'] && f.properties['YGEO'])
  .map((f) => {
    const p = f.properties;
    const brt = p['BRT'] as string | undefined;
    return {
      id: String(p['OBJECTID']),
      name: String(p['NAME'] ?? ''),
      latinName: String(p['LATINNAME'] ?? ''),
      address: String(p['ADDRESS'] ?? ''),
      coordinate: [Number(p['XGEO']), Number(p['YGEO'])] as [number, number],
      lines: String(p['LINESTATIO'] ?? ''),
      isBRT: isBRTStop(brt),
      brtLine: brt && isBRTStop(brt) ? brt : '',
      direction: String(p['DIRECTION'] ?? ''),
      stationCode: String(p['STATIONCOD'] ?? ''),
      seat: String(p['SEAT'] ?? ''),
      shelter: String(p['SHELTER'] ?? ''),
      light: String(p['LIGHT'] ?? ''),
      disabledAccess: String(p['DISABLED'] ?? ''),
      transportMode: String(p['TRANSPORTM'] ?? ''),
    };
  });

export const BRT_BUS_STOPS = BUS_STOPS.filter((s) => s.isBRT);
export const REGULAR_BUS_STOPS = BUS_STOPS.filter((s) => !s.isBRT);

// O(1) lookup by id — used when a map circle is tapped to resolve the full object.
const BUS_STOPS_BY_ID = new Map(BUS_STOPS.map((s) => [s.id, s]));

export function getBusStopById(id: string): BusStop | undefined {
  return BUS_STOPS_BY_ID.get(id);
}

type BusStopFeature = {
  type: 'Feature';
  properties: {
    id: string;
    name: string;
    latinName: string;
    address: string;
    lines: string;
    brtLine: string;
    kind: 'brt' | 'bus';
  };
  geometry: { type: 'Point'; coordinates: [number, number] };
};

function toGeoJSON(stops: BusStop[], kind: 'brt' | 'bus') {
  return {
    type: 'FeatureCollection' as const,
    features: stops.map(
      (s): BusStopFeature => ({
        type: 'Feature',
        properties: {
          id: s.id,
          name: s.name,
          latinName: s.latinName,
          address: s.address,
          lines: s.lines,
          brtLine: s.brtLine,
          kind,
        },
        geometry: { type: 'Point', coordinates: s.coordinate },
      })
    ),
  };
}

/** Pre-computed GeoJSON — built once at module load, never per render. */
export const BRT_STOPS_GEOJSON = toGeoJSON(BRT_BUS_STOPS, 'brt');
export const REGULAR_BUS_STOPS_GEOJSON = toGeoJSON(REGULAR_BUS_STOPS, 'bus');

const MAX_RESULTS = 8;

export function searchBusStops(query: string): { brt: BusStop[]; bus: BusStop[] } {
  if (query.length < 2) return { brt: [], bus: [] };
  const q = query.trim().toLowerCase();
  const brt: BusStop[] = [];
  const bus: BusStop[] = [];
  for (const stop of BUS_STOPS) {
    const matches =
      stop.name.includes(q) ||
      stop.latinName.toLowerCase().includes(q) ||
      stop.address.includes(q);
    if (!matches) continue;
    if (stop.isBRT) {
      if (brt.length < MAX_RESULTS) brt.push(stop);
    } else {
      if (bus.length < MAX_RESULTS) bus.push(stop);
    }
    if (brt.length >= MAX_RESULTS && bus.length >= MAX_RESULTS) break;
  }
  return { brt, bus };
}

function matchesBusStopQuery(stop: BusStop, query: string): boolean {
  const q = query.trim();
  if (!q) return true;
  const lower = q.toLowerCase();
  return (
    stop.name.includes(q) ||
    stop.latinName.toLowerCase().includes(lower) ||
    stop.address.includes(q) ||
    stop.brtLine.toLowerCase().includes(lower)
  );
}

/** All BRT stops for the sheet list — filtered when the user types a query. */
export function listBrtStops(query: string): BusStop[] {
  const q = query.trim();
  if (!q) return BRT_BUS_STOPS;
  return BRT_BUS_STOPS.filter((stop) => matchesBusStopQuery(stop, q));
}
