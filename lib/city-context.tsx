import AsyncStorageModule from '@react-native-async-storage/async-storage';
import * as React from 'react';
import { CITIES, CITY_IDS, DEFAULT_CITY_ID, isCityId, type City, type CityId } from './cities';

const AsyncStorage = AsyncStorageModule ?? null;
const CITY_STORAGE_KEY = '@istgah/city';

type CityContextValue = {
  city: City;
  cityId: CityId;
  setCity: (id: CityId) => void;
};

const CityContext = React.createContext<CityContextValue | null>(null);

export function CityProvider({ children }: { children: React.ReactNode }) {
  const [cityId, setCityId] = React.useState<CityId>(DEFAULT_CITY_ID);

  React.useEffect(() => {
    AsyncStorage?.getItem(CITY_STORAGE_KEY).then((saved) => {
      if (saved && isCityId(saved)) {
        setCityId(saved);
      }
    });
  }, []);

  const setCity = React.useCallback((id: CityId) => {
    setCityId(id);
    AsyncStorage?.setItem(CITY_STORAGE_KEY, id);
  }, []);

  const value = React.useMemo<CityContextValue>(
    () => ({
      city: CITIES[cityId],
      cityId,
      setCity,
    }),
    [cityId, setCity]
  );

  return React.createElement(CityContext.Provider, { value }, children);
}

export function useCity(): CityContextValue {
  const ctx = React.useContext(CityContext);
  if (!ctx) throw new Error('useCity must be used within CityProvider');
  return ctx;
}

export { CITY_IDS, CITIES };
