import rawBusStops from '../assets/data/tehranBusStops.json';

export type BusStop = {
  id: string;
  name: string;
  latinName: string;
  address: string;
  coordinate: [number, number]; // [lng, lat]
  lines: string;
  isBRT: boolean;
  brtLine: string;
};

function isBRTStop(brt: unknown): boolean {
  if (!brt || brt === '0') return false;
  const s = String(brt);
  return s.startsWith('BRT') || s.startsWith('brt');
}

export const BUS_STOPS: BusStop[] = (rawBusStops.features as Array<{
  geometry: { type: string; coordinates: number[] };
  properties: Record<string, unknown>;
}>)
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
    };
  });

export const BRT_BUS_STOPS = BUS_STOPS.filter((s) => s.isBRT);
export const REGULAR_BUS_STOPS = BUS_STOPS.filter((s) => !s.isBRT);

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
