import * as React from 'react';

export type LayerKey = 'metro' | 'brt' | 'bus';

export const LAYER_KEYS: LayerKey[] = ['metro', 'brt', 'bus'];

type MapLayersContextValue = {
  visibleLayers: Set<LayerKey>;
  isVisible: (key: LayerKey) => boolean;
  toggleLayer: (key: LayerKey) => void;
  setVisibleLayers: (keys: LayerKey[]) => void;
};

const MapLayersContext = React.createContext<MapLayersContextValue | null>(null);

// Bus layer starts off to keep the initial map readable; metro + BRT are on by default.
const DEFAULT_LAYERS: LayerKey[] = ['metro', 'brt'];

export function MapLayersProvider({ children }: { children: React.ReactNode }) {
  const [visibleLayers, setVisible] = React.useState<Set<LayerKey>>(
    () => new Set(DEFAULT_LAYERS)
  );

  const toggleLayer = React.useCallback((key: LayerKey) => {
    setVisible((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  const setVisibleLayers = React.useCallback((keys: LayerKey[]) => {
    setVisible(new Set(keys));
  }, []);

  const isVisible = React.useCallback((key: LayerKey) => visibleLayers.has(key), [visibleLayers]);

  const value = React.useMemo<MapLayersContextValue>(
    () => ({ visibleLayers, isVisible, toggleLayer, setVisibleLayers }),
    [visibleLayers, isVisible, toggleLayer, setVisibleLayers]
  );

  return React.createElement(MapLayersContext.Provider, { value }, children);
}

export function useMapLayers(): MapLayersContextValue {
  const ctx = React.useContext(MapLayersContext);
  if (!ctx) throw new Error('useMapLayers must be used within MapLayersProvider');
  return ctx;
}
