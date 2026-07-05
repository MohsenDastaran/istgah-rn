import * as React from 'react';
import { Bus, TrainFront, type LucideIcon } from 'lucide-react-native';
import type { SectionListData } from 'react-native';
import { listBrtStops, searchBusStops, type BusStop } from './bus-stops';
import type { LayerKey } from './map-layers-context';
import type { Strings } from './i18n';
import { filterStationsByQuery, type Station } from './stations';
import { useDebouncedValue } from './use-debounced-value';

export const TRANSIT_SEARCH_DEBOUNCE_MS = 200;

export type TransitListItem =
  | { kind: 'metro'; station: Station }
  | { kind: 'brt'; stop: BusStop }
  | { kind: 'bus'; stop: BusStop };

export type TransitSection = SectionListData<
  TransitListItem,
  { title: string; icon: LucideIcon; color: string }
>;

export function buildTransitSections(
  query: string,
  isSheetVisible: (key: LayerKey) => boolean,
  t: Strings
): TransitSection[] {
  const busResults =
    query.length >= 2 ? searchBusStops(query) : { brt: [] as BusStop[], bus: [] as BusStop[] };

  const metroItems: TransitListItem[] = isSheetVisible('metro')
    ? filterStationsByQuery(query).map((s) => ({ kind: 'metro', station: s }))
    : [];
  const brtItems: TransitListItem[] = isSheetVisible('brt')
    ? listBrtStops(query).map((s) => ({ kind: 'brt', stop: s }))
    : [];
  const busItems: TransitListItem[] = isSheetVisible('bus')
    ? busResults.bus.map((s) => ({ kind: 'bus', stop: s }))
    : [];

  const result: TransitSection[] = [];
  if (metroItems.length > 0)
    result.push({ title: t.metroStations, icon: TrainFront, color: '#60a5fa', data: metroItems });
  if (brtItems.length > 0)
    result.push({ title: t.brtStops, icon: Bus, color: '#fb923c', data: brtItems });
  if (busItems.length > 0)
    result.push({ title: t.busStops, icon: Bus, color: '#94a3b8', data: busItems });
  return result;
}

type UseTransitSearchResult = {
  sections: TransitSection[];
  /** True while the debounced filter has not caught up to the current input. */
  isSearching: boolean;
};

export function useTransitSearch(
  query: string,
  isSheetVisible: (key: LayerKey) => boolean,
  t: Strings
): UseTransitSearchResult {
  const trimmed = query.trim();
  const debouncedQuery = useDebouncedValue(trimmed, TRANSIT_SEARCH_DEBOUNCE_MS);

  const settled = trimmed.length === 0 || debouncedQuery === trimmed;
  const isSearching = trimmed.length > 0 && !settled;

  const sections = React.useMemo(
    () => (settled ? buildTransitSections(debouncedQuery, isSheetVisible, t) : []),
    [settled, debouncedQuery, isSheetVisible, t]
  );

  return { sections, isSearching };
}
