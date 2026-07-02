import * as React from 'react';
import { STATIONS, type Station } from './stations';

type StationsContextValue = {
  stations: Station[];
  filteredStations: Station[];
  selectedStation: Station | null;
  searchQuery: string;
  route: [number, number][] | null;
  routeDistance: number | null;
  routeDuration: number | null;
  routeLoading: boolean;
  userLocation: [number, number] | null;
  setSearchQuery: (q: string) => void;
  selectStation: (station: Station | null, options?: { flyTo?: boolean }) => void;
  pendingFlyTo: [number, number] | null;
  clearPendingFlyTo: () => void;
  setUserLocation: (coords: [number, number] | null) => void;
  fetchRoute: () => Promise<void>;
  clearRoute: () => void;
};

const StationsContext = React.createContext<StationsContextValue | null>(null);

export function StationsProvider({ children }: { children: React.ReactNode }) {
  const [selectedStation, setSelectedStation] = React.useState<Station | null>(null);
  const [searchQuery, setSearchQueryState] = React.useState('');
  const [route, setRoute] = React.useState<[number, number][] | null>(null);
  const [routeDistance, setRouteDistance] = React.useState<number | null>(null);
  const [routeDuration, setRouteDuration] = React.useState<number | null>(null);
  const [routeLoading, setRouteLoading] = React.useState(false);
  const [userLocation, setUserLocation] = React.useState<[number, number] | null>(null);
  const [pendingFlyTo, setPendingFlyTo] = React.useState<[number, number] | null>(null);

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

  const selectStation = React.useCallback(
    (station: Station | null, options?: { flyTo?: boolean }) => {
      setSelectedStation(station);
      if (options?.flyTo && station) {
        setPendingFlyTo(station.coordinates);
      }
      if (!station) {
        setRoute(null);
        setRouteDistance(null);
        setRouteDuration(null);
      }
    },
    []
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
    if (!userLocation || !selectedStation) return;

    setRouteLoading(true);
    try {
      const [fromLng, fromLat] = userLocation;
      const [toLng, toLat] = selectedStation.coordinates;
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
  }, [userLocation, selectedStation]);

  const value = React.useMemo<StationsContextValue>(
    () => ({
      stations: STATIONS,
      filteredStations,
      selectedStation,
      searchQuery,
      route,
      routeDistance,
      routeDuration,
      routeLoading,
      userLocation,
      setSearchQuery,
      selectStation,
      pendingFlyTo,
      clearPendingFlyTo,
      setUserLocation,
      fetchRoute,
      clearRoute,
    }),
    [
      filteredStations,
      selectedStation,
      searchQuery,
      route,
      routeDistance,
      routeDuration,
      routeLoading,
      userLocation,
      setSearchQuery,
      selectStation,
      pendingFlyTo,
      clearPendingFlyTo,
      fetchRoute,
      clearRoute,
    ]
  );

  return React.createElement(StationsContext.Provider, { value }, children);
}

export function useStations(): StationsContextValue {
  const ctx = React.useContext(StationsContext);
  if (!ctx) throw new Error('useStations must be used within StationsProvider');
  return ctx;
}
