import * as React from 'react';
import { searchPlaces, type PlaceResult } from './geocoding';
import type { CityId } from './cities';
import type { Lang } from './i18n';

const DEBOUNCE_MS = 300;

type UsePlaceSearchResult = {
  places: PlaceResult[];
  isPlaceLoading: boolean;
  placeError: string | null;
};

export function usePlaceSearch(query: string, cityId: CityId, lang: Lang): UsePlaceSearchResult {
  const [places, setPlaces] = React.useState<PlaceResult[]>([]);
  const [isPlaceLoading, setIsPlaceLoading] = React.useState(false);
  const [placeError, setPlaceError] = React.useState<string | null>(null);

  const abortRef = React.useRef<AbortController | null>(null);
  const debounceRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  React.useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (query.trim().length < 2) {
      abortRef.current?.abort();
      setPlaces([]);
      setIsPlaceLoading(false);
      setPlaceError(null);
      return;
    }

    setIsPlaceLoading(true);

    debounceRef.current = setTimeout(async () => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      try {
        const results = await searchPlaces(query, { cityId, lang, signal: controller.signal });
        setPlaces(results);
        setPlaceError(null);
      } catch (e) {
        if ((e as Error).name === 'AbortError') return;
        setPlaceError((e as Error).message ?? 'Search failed');
        setPlaces([]);
      } finally {
        setIsPlaceLoading(false);
      }
    }, DEBOUNCE_MS);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, cityId, lang]);

  // Abort and cleanup on unmount
  React.useEffect(() => {
    return () => {
      abortRef.current?.abort();
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  return { places, isPlaceLoading, placeError };
}
