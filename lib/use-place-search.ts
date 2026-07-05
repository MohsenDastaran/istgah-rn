import * as React from 'react';
import { searchPlaces, type PlaceResult } from './geocoding';
import type { CityId } from './cities';
import type { Lang } from './i18n';
import { useDebouncedValue } from './use-debounced-value';

const DEBOUNCE_MS = 300;

type UsePlaceSearchResult = {
  places: PlaceResult[];
  /** True while debounce or network fetch is in progress for the current input. */
  isSearching: boolean;
  placeError: string | null;
};

export function usePlaceSearch(query: string, cityId: CityId, lang: Lang): UsePlaceSearchResult {
  const trimmed = query.trim();
  const debouncedQuery = useDebouncedValue(trimmed, DEBOUNCE_MS);

  const [places, setPlaces] = React.useState<PlaceResult[]>([]);
  const [resolvedQuery, setResolvedQuery] = React.useState('');
  const [isLoading, setIsLoading] = React.useState(false);
  const [placeError, setPlaceError] = React.useState<string | null>(null);

  const abortRef = React.useRef<AbortController | null>(null);

  const isDebouncing = trimmed.length >= 2 && debouncedQuery !== trimmed;
  const isStale = debouncedQuery.length >= 2 && resolvedQuery !== debouncedQuery;
  const isSearching = isDebouncing || isLoading || isStale;

  const visiblePlaces =
    !isSearching && debouncedQuery.length >= 2 && resolvedQuery === debouncedQuery ? places : [];

  React.useEffect(() => {
    abortRef.current?.abort();

    if (debouncedQuery.length < 2) {
      setPlaces([]);
      setResolvedQuery('');
      setIsLoading(false);
      setPlaceError(null);
      return;
    }

    const controller = new AbortController();
    abortRef.current = controller;
    setIsLoading(true);

    void (async () => {
      try {
        const results = await searchPlaces(debouncedQuery, {
          cityId,
          lang,
          signal: controller.signal,
        });
        if (controller.signal.aborted) return;
        setPlaces(results);
        setResolvedQuery(debouncedQuery);
        setPlaceError(null);
      } catch (e) {
        if ((e as Error).name === 'AbortError') return;
        setPlaceError((e as Error).message ?? 'Search failed');
        setPlaces([]);
        setResolvedQuery(debouncedQuery);
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      }
    })();

    return () => {
      controller.abort();
    };
  }, [debouncedQuery, cityId, lang]);

  React.useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, []);

  return { places: visiblePlaces, isSearching, placeError };
}
