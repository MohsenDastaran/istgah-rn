import AsyncStorageModule from '@react-native-async-storage/async-storage';
import * as React from 'react';

const AsyncStorage = AsyncStorageModule ?? null;
const BASEMAP_STORAGE_KEY = '@istgah/basemap';

export const BASEMAP_IDS = ['street', 'satellite'] as const;
export type BasemapId = (typeof BASEMAP_IDS)[number];

const DEFAULT_BASEMAP: BasemapId = 'street';

function isBasemapId(value: string): value is BasemapId {
  return (BASEMAP_IDS as readonly string[]).includes(value);
}

type BasemapContextValue = {
  basemap: BasemapId;
  setBasemap: (id: BasemapId) => void;
};

const BasemapContext = React.createContext<BasemapContextValue | null>(null);

export function BasemapProvider({ children }: { children: React.ReactNode }) {
  const [basemap, setBasemapState] = React.useState<BasemapId>(DEFAULT_BASEMAP);

  React.useEffect(() => {
    AsyncStorage?.getItem(BASEMAP_STORAGE_KEY).then((saved) => {
      if (saved && isBasemapId(saved)) {
        setBasemapState(saved);
      }
    });
  }, []);

  const setBasemap = React.useCallback((id: BasemapId) => {
    setBasemapState(id);
    AsyncStorage?.setItem(BASEMAP_STORAGE_KEY, id);
  }, []);

  const value = React.useMemo<BasemapContextValue>(
    () => ({ basemap, setBasemap }),
    [basemap, setBasemap]
  );

  return React.createElement(BasemapContext.Provider, { value }, children);
}

export function useBasemap(): BasemapContextValue {
  const ctx = React.useContext(BasemapContext);
  if (!ctx) throw new Error('useBasemap must be used within BasemapProvider');
  return ctx;
}
