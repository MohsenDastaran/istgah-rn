import * as React from 'react';
import type { BusStop } from './bus-stops';
import { STATIONS, type Station } from './stations';

export type MapSelection =
  | { kind: 'metro'; station: Station }
  | { kind: 'brt'; stop: BusStop }
  | { kind: 'bus'; stop: BusStop };

function selectionCoordinates(sel: MapSelection): [number, number] {
  return sel.kind === 'metro' ? sel.station.coordinates : sel.stop.coordinate;
}

function selectionLabel(sel: MapSelection, isRTL: boolean): string {
  if (sel.kind === 'metro') {
    return isRTL ? sel.station.name.fa : sel.station.name.en;
  }
  if (isRTL || !sel.stop.latinName) return sel.stop.name;
  return sel.stop.latinName;
}

type StationsContextValue = {
  stations: Station[];
  filteredStations: Station[];
  /** Unified map/sheet selection (metro, BRT, or bus). */
  selected: MapSelection | null;
  /** Convenience alias — non-null only when a metro station is selected. */
  selectedStation: Station | null;
  searchQuery: string;
  route: [number, number][] | null;
  routeDistance: number | null;
  routeDuration: number | null;
  routeLoading: boolean;
  userLocation: [number, number] | null;
  setSearchQuery: (q: string) => void;
  selectItem: (item: MapSelection | null, options?: { flyTo?: boolean }) => void;
  /** @deprecated Use selectItem — kept for backward compatibility. */
  selectStation: (station: Station | null, options?: { flyTo?: boolean }) => void;
  pendingFlyTo: [number, number] | null;
  clearPendingFlyTo: () => void;
  setUserLocation: (coords: [number, number] | null) => void;
  fetchRoute: () => Promise<void>;
  clearRoute: () => void;
  locateUser: () => Promise<void>;
  registerLocateUser: (handler: (() => Promise<void>) | null) => void;
  getSelectionLabel: (isRTL: boolean) => string;
};

const StationsContext = React.createContext<StationsContextValue | null>(null);

export function StationsProvider({ children }: { children: React.ReactNode }) {
  const [selected, setSelected] = React.useState<MapSelection | null>(null);
  const [searchQuery, setSearchQueryState] = React.useState('');
  const [route, setRoute] = React.useState<[number, number][] | null>(null);
  const [routeDistance, setRouteDistance] = React.useState<number | null>(null);
  const [routeDuration, setRouteDuration] = React.useState<number | null>(null);
  const [routeLoading, setRouteLoading] = React.useState(false);
  const [userLocation, setUserLocation] = React.useState<[number, number] | null>(null);
  const [pendingFlyTo, setPendingFlyTo] = React.useState<[number, number] | null>(null);
  const locateUserRef = React.useRef<(() => Promise<void>) | null>(null);

  const registerLocateUser = React.useCallback((handler: (() => Promise<void>) | null) => {
    locateUserRef.current = handler;
  }, []);

  const locateUser = React.useCallback(async () => {
    await locateUserRef.current?.();
  }, []);

  const filteredStations = React.useMemo(() => {
    if (!searchQuery.trim()) return STATIONS;
    const q = searchQuery.toLowerCase();
    return STATIONS.filter(
      (s) => s.name.en.toLowerCase().includes(q) || s.name.fa.includes(searchQuery)
    );
  }, [searchQuery]);

  const setSearchQuery = React.useCallback((q: string) => {
    setSearchQueryState(q);
  }, []);

  const selectItem = React.useCallback(
    (item: MapSelection | null, options?: { flyTo?: boolean }) => {
      setSelected(item);
      if (options?.flyTo && item) {
        setPendingFlyTo(selectionCoordinates(item));
      }
      if (!item) {
        setRoute(null);
        setRouteDistance(null);
        setRouteDuration(null);
      }
    },
    []
  );

  const selectStation = React.useCallback(
    (station: Station | null, options?: { flyTo?: boolean }) => {
      selectItem(station ? { kind: 'metro', station } : null, options);
    },
    [selectItem]
  );

  const clearPendingFlyTo = React.useCallback(() => {
    setPendingFlyTo(null);
  }, []);

  const clearRoute = React.useCallback(() => {
    setRoute(null);
    setRouteDistance(null);
    setRouteDuration(null);
  }, []);

  const fetchRoute = React.useCallback(async () => {
    if (!userLocation || !selected) return;

    setRouteLoading(true);
    try {
      const [fromLng, fromLat] = userLocation;
      const [toLng, toLat] = selectionCoordinates(selected);
      const url =
        `https://router.project-osrm.org/route/v1/driving/` +
        `${fromLng},${fromLat};${toLng},${toLat}` +
        `?overview=full&geometries=geojson`;

      const res = await fetch(url);
      const data = await res.json();

      if (data.routes?.[0]) {
        const coords: [number, number][] = data.routes[0].geometry.coordinates.map(
          (c: number[]) => [c[0], c[1]] as [number, number]
        );
        setRoute(coords);
        setRouteDistance(data.routes[0].distance / 1000);
        setRouteDuration(data.routes[0].duration / 60);
      }
    } catch (e) {
      console.error('OSRM fetch failed', e);
    } finally {
      setRouteLoading(false);
    }
  }, [userLocation, selected]);

  const getSelectionLabel = React.useCallback(
    (isRTL: boolean) => (selected ? selectionLabel(selected, isRTL) : ''),
    [selected]
  );

  const selectedStation = selected?.kind === 'metro' ? selected.station : null;

  const value = React.useMemo<StationsContextValue>(
    () => ({
      stations: STATIONS,
      filteredStations,
      selected,
      selectedStation,
      searchQuery,
      route,
      routeDistance,
      routeDuration,
      routeLoading,
      userLocation,
      setSearchQuery,
      selectItem,
      selectStation,
      pendingFlyTo,
      clearPendingFlyTo,
      setUserLocation,
      fetchRoute,
      clearRoute,
      locateUser,
      registerLocateUser,
      getSelectionLabel,
    }),
    [
      filteredStations,
      selected,
      selectedStation,
      searchQuery,
      route,
      routeDistance,
      routeDuration,
      routeLoading,
      userLocation,
      setSearchQuery,
      selectItem,
      selectStation,
      pendingFlyTo,
      clearPendingFlyTo,
      fetchRoute,
      clearRoute,
      locateUser,
      registerLocateUser,
      getSelectionLabel,
    ]
  );

  return React.createElement(StationsContext.Provider, { value }, children);
}

export function useStations(): StationsContextValue {
  const ctx = React.useContext(StationsContext);
  if (!ctx) throw new Error('useStations must be used within StationsProvider');
  return ctx;
}
