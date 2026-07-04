import * as React from 'react';
import { InteractionManager } from 'react-native';

export type LayerKey = 'metro' | 'brt' | 'bus';

export const LAYER_KEYS: LayerKey[] = ['metro', 'brt', 'bus'];

// Bus layer starts off to keep the initial map readable; metro + BRT are on by default.
const DEFAULT_LAYERS: LayerKey[] = ['metro', 'brt'];

function setsEqual(a: Set<LayerKey>, b: Set<LayerKey>): boolean {
  if (a.size !== b.size) return false;
  for (const key of a) {
    if (!b.has(key)) return false;
  }
  return true;
}

function toggleSet(prev: Set<LayerKey>, key: LayerKey): Set<LayerKey> {
  const next = new Set(prev);
  if (next.has(key)) next.delete(key);
  else next.add(key);
  return next;
}

type MapLayersContextValue = {
  /** Layers applied to the map (updates immediately on toggle). */
  mapLayers: Set<LayerKey>;
  /** Layers used by the sheet list (deferred after the map). */
  sheetLayers: Set<LayerKey>;
  /** @deprecated Use mapLayers — kept for toggle UI. */
  visibleLayers: Set<LayerKey>;
  isMapLoading: boolean;
  isSheetLoading: boolean;
  isVisible: (key: LayerKey) => boolean;
  isSheetVisible: (key: LayerKey) => boolean;
  toggleLayer: (key: LayerKey) => void;
  setVisibleLayers: (keys: LayerKey[]) => void;
};

const MapLayersContext = React.createContext<MapLayersContextValue | null>(null);

export function MapLayersProvider({ children }: { children: React.ReactNode }) {
  const [mapLayers, setMapLayers] = React.useState<Set<LayerKey>>(
    () => new Set(DEFAULT_LAYERS)
  );
  const [sheetLayers, setSheetLayers] = React.useState<Set<LayerKey>>(
    () => new Set(DEFAULT_LAYERS)
  );
  const [isMapLoading, setIsMapLoading] = React.useState(false);
  const [isSheetLoading, setIsSheetLoading] = React.useState(false);
  const pendingSheetSync = React.useRef(false);

  const beginLayerTransition = React.useCallback(() => {
    setIsMapLoading(true);
    setIsSheetLoading(true);
    pendingSheetSync.current = true;
  }, []);

  const toggleLayer = React.useCallback(
    (key: LayerKey) => {
      beginLayerTransition();
      setMapLayers((prev) => toggleSet(prev, key));
    },
    [beginLayerTransition]
  );

  const setVisibleLayers = React.useCallback(
    (keys: LayerKey[]) => {
      beginLayerTransition();
      setMapLayers(new Set(keys));
    },
    [beginLayerTransition]
  );

  // Map paints first; sheet list syncs on the next frame at lower priority.
  React.useEffect(() => {
    if (!pendingSheetSync.current) return;

    const frameId = requestAnimationFrame(() => {
      setIsMapLoading(false);
      React.startTransition(() => {
        setSheetLayers(new Set(mapLayers));
        pendingSheetSync.current = false;
      });
    });

    return () => cancelAnimationFrame(frameId);
  }, [mapLayers]);

  // Clear sheet loading after the deferred list has had time to commit.
  React.useEffect(() => {
    if (!isSheetLoading || pendingSheetSync.current) return;
    if (!setsEqual(mapLayers, sheetLayers)) return;

    const task = InteractionManager.runAfterInteractions(() => {
      setIsSheetLoading(false);
    });

    return () => task.cancel();
  }, [mapLayers, sheetLayers, isSheetLoading]);

  const isVisible = React.useCallback((key: LayerKey) => mapLayers.has(key), [mapLayers]);
  const isSheetVisible = React.useCallback(
    (key: LayerKey) => sheetLayers.has(key),
    [sheetLayers]
  );

  const value = React.useMemo<MapLayersContextValue>(
    () => ({
      mapLayers,
      sheetLayers,
      visibleLayers: mapLayers,
      isMapLoading,
      isSheetLoading,
      isVisible,
      isSheetVisible,
      toggleLayer,
      setVisibleLayers,
    }),
    [
      mapLayers,
      sheetLayers,
      isMapLoading,
      isSheetLoading,
      isVisible,
      isSheetVisible,
      toggleLayer,
      setVisibleLayers,
    ]
  );

  return React.createElement(MapLayersContext.Provider, { value }, children);
}

export function useMapLayers(): MapLayersContextValue {
  const ctx = React.useContext(MapLayersContext);
  if (!ctx) throw new Error('useMapLayers must be used within MapLayersProvider');
  return ctx;
}
