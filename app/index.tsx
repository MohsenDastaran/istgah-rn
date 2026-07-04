import { useCity } from '@/lib/city-context';
import { flyToCoordinate } from '@/lib/map-camera';
import { useMapLayers } from '@/lib/map-layers-context';
import { useSheetDetent } from '@/lib/sheet-detent-context';
import { useStations, type MapSelection } from '@/lib/stations-context';
import { TEHRAN_BRT_LINES_GEOJSON } from '@/lib/brt-lines';
import {
  BRT_STOPS_GEOJSON,
  REGULAR_BUS_STOPS_GEOJSON,
  getBusStopById,
} from '@/lib/bus-stops';
import { METRO_NETWORK_GEOJSON, STATIONS, STATIONS_GEOJSON } from '@/lib/stations';
import { AppHeader } from '@/components/app-header';
import { Stack } from 'expo-router';
import * as Location from 'expo-location';
import { Bus, TrainFrontIcon } from 'lucide-react-native';
import * as React from 'react';
import { StyleSheet, Text, TurboModuleRegistry, View, ActivityIndicator } from 'react-native';

const isTrueSheetLinked = !!TurboModuleRegistry.get('TrueSheetModule');
const SheetSection = isTrueSheetLinked ? require('@/components/sheet-section').SheetSection : null;

const isMapLibreLinked = !!TurboModuleRegistry.get('MLRNCameraModule');
const mapComponents = isMapLibreLinked ? require('@/components/map') : null;

const METRO_LINES_LAYER_ID = 'metro-lines';
const BRT_LINES_LAYER_ID = 'brt-lines';
const METRO_STATIONS_LAYER_ID = 'metro-stations';
const BRT_STOPS_LAYER_ID = 'brt-stops';
const BUS_STOPS_LAYER_ID = 'bus-stops';

function layerVisibility(visible: boolean) {
  return { visibility: visible ? ('visible' as const) : ('none' as const) };
}

/** MapLibre requires `zoom` only in a top-level interpolate — hide selected stop inside each stop value. */
function zoomCircleRadius(
  selectedId: string | null,
  z10: number,
  z14: number,
  z18: number,
): unknown {
  if (!selectedId) {
    return ['interpolate', ['linear'], ['zoom'], 10, z10, 14, z14, 18, z18];
  }
  return [
    'interpolate',
    ['linear'],
    ['zoom'],
    10,
    ['case', ['==', ['get', 'id'], selectedId], 0, z10],
    14,
    ['case', ['==', ['get', 'id'], selectedId], 0, z14],
    18,
    ['case', ['==', ['get', 'id'], selectedId], 0, z18],
  ];
}

// ─── Map layers (memoized — GPU circle layers, no native markers for bulk stops) ─
type MapLayersProps = {
  selected: MapSelection | null;
  route: [number, number][] | null;
  showMetro: boolean;
  showBrt: boolean;
  showBus: boolean;
  selectItem: ReturnType<typeof useStations>['selectItem'];
  MapMarker: React.ComponentType<{
    coordinate: [number, number];
    children?: React.ReactNode;
  }>;
  MapRoute: React.ComponentType<{
    coordinates: [number, number][];
    color?: string;
    width?: number;
    beforeId?: string;
  }>;
  GeoJSONSource: React.ComponentType<{
    id?: string;
    data: unknown;
    onPress?: (event: { nativeEvent: { features?: GeoJSON.Feature[] } }) => void;
    hitbox?: { top: number; bottom: number; left: number; right: number };
    children?: React.ReactNode;
  }>;
  Layer: React.ComponentType<{
    id: string;
    type: string;
    paint?: Record<string, unknown>;
    layout?: Record<string, unknown>;
    beforeId?: string;
    afterId?: string;
  }>;
};

const MapLayers = React.memo(function MapLayers({
  selected,
  route,
  showMetro,
  showBrt,
  showBus,
  selectItem,
  MapMarker,
  MapRoute,
  GeoJSONSource,
  Layer,
}: MapLayersProps) {
  const selectedMetroId = selected?.kind === 'metro' ? selected.station.id : null;
  const selectedBrtId = selected?.kind === 'brt' ? selected.stop.id : null;
  const selectedBusId = selected?.kind === 'bus' ? selected.stop.id : null;

  const handleMetroPress = React.useCallback(
    (event: { nativeEvent: { features?: GeoJSON.Feature[] } }) => {
      const id = event.nativeEvent.features?.[0]?.properties?.id;
      if (typeof id !== 'string') return;
      const station = STATIONS.find((s) => s.id === id);
      if (station) selectItem({ kind: 'metro', station }, { flyTo: true });
    },
    [selectItem]
  );

  const handleBrtPress = React.useCallback(
    (event: { nativeEvent: { features?: GeoJSON.Feature[] } }) => {
      const id = event.nativeEvent.features?.[0]?.properties?.id;
      if (typeof id !== 'string') return;
      const stop = getBusStopById(id);
      if (stop?.isBRT) selectItem({ kind: 'brt', stop }, { flyTo: true });
    },
    [selectItem]
  );

  const handleBusPress = React.useCallback(
    (event: { nativeEvent: { features?: GeoJSON.Feature[] } }) => {
      const id = event.nativeEvent.features?.[0]?.properties?.id;
      if (typeof id !== 'string') return;
      const stop = getBusStopById(id);
      if (stop && !stop.isBRT) selectItem({ kind: 'bus', stop }, { flyTo: true });
    },
    [selectItem]
  );

  const metroCirclePaint = React.useMemo(
    () => ({
      circleColor: ['case', ['==', ['get', 'isActive'], false], '#888888', ['get', 'lineColor']],
      circleStrokeColor: [
        'case',
        ['boolean', ['get', 'isInterchange'], false],
        ['get', 'lineColor2'],
        '#ffffff',
      ],
      circleStrokeWidth: ['case', ['boolean', ['get', 'isInterchange'], false], 4, 1.5],
      circleRadius: selectedMetroId
        ? ['case', ['==', ['get', 'id'], selectedMetroId], 0, 8]
        : 8,
      circleOpacity: ['case', ['==', ['get', 'isActive'], false], 0.55, 1],
      circleStrokeOpacity: ['case', ['==', ['get', 'isActive'], false], 0.55, 1],
    }),
    [selectedMetroId]
  );

  const brtCirclePaint = React.useMemo(
    () => ({
      circleColor: '#f97316',
      circleStrokeColor: '#ffffff',
      circleStrokeWidth: 1.5,
      circleRadius: zoomCircleRadius(selectedBrtId, 5, 7, 9),
      circleOpacity: ['interpolate', ['linear'], ['zoom'], 10, 0.45, 14, 0.85],
    }),
    [selectedBrtId]
  );

  const busCirclePaint = React.useMemo(
    () => ({
      circleColor: '#64748b',
      circleStrokeColor: '#ffffff',
      circleStrokeWidth: 1,
      circleRadius: zoomCircleRadius(selectedBusId, 2, 4, 5),
      circleOpacity: ['interpolate', ['linear'], ['zoom'], 10, 0.35, 14, 0.75],
    }),
    [selectedBusId]
  );

  return (
    <>
      {/* Anchor layer — metro stations registered first; line/stop layers sit beneath */}
      <GeoJSONSource
        id="metro-stations"
        data={STATIONS_GEOJSON}
        onPress={handleMetroPress}
        hitbox={{ top: 24, bottom: 24, left: 24, right: 24 }}>
        <Layer
          id={METRO_STATIONS_LAYER_ID}
          type="circle"
          layout={layerVisibility(showMetro)}
          paint={metroCirclePaint}
        />
      </GeoJSONSource>

      <GeoJSONSource id="bus-stops" data={REGULAR_BUS_STOPS_GEOJSON} onPress={handleBusPress} hitbox={{ top: 12, bottom: 12, left: 12, right: 12 }}>
        <Layer
          id={BUS_STOPS_LAYER_ID}
          type="circle"
          beforeId={METRO_STATIONS_LAYER_ID}
          layout={layerVisibility(showBus)}
          paint={busCirclePaint}
        />
      </GeoJSONSource>

      <GeoJSONSource id="brt-stops" data={BRT_STOPS_GEOJSON} onPress={handleBrtPress} hitbox={{ top: 16, bottom: 16, left: 16, right: 16 }}>
        <Layer
          id={BRT_STOPS_LAYER_ID}
          type="circle"
          beforeId={METRO_STATIONS_LAYER_ID}
          layout={layerVisibility(showBrt)}
          paint={brtCirclePaint}
        />
      </GeoJSONSource>

      <GeoJSONSource id="metro-network" data={METRO_NETWORK_GEOJSON}>
        <Layer
          id={METRO_LINES_LAYER_ID}
          type="line"
          beforeId={METRO_STATIONS_LAYER_ID}
          layout={layerVisibility(showMetro)}
          paint={{
            lineColor: ['get', 'color'],
            lineWidth: 3,
            lineOpacity: 0.85,
            lineJoin: 'round',
            lineCap: 'round',
          }}
        />
      </GeoJSONSource>

      <GeoJSONSource id="brt-lines" data={TEHRAN_BRT_LINES_GEOJSON}>
        <Layer
          id={BRT_LINES_LAYER_ID}
          type="line"
          beforeId={METRO_STATIONS_LAYER_ID}
          layout={layerVisibility(showBrt)}
          paint={{
            lineColor: ['get', 'color'],
            lineWidth: 3,
            lineOpacity: 0.9,
            lineJoin: 'round',
            lineCap: 'round',
          }}
        />
      </GeoJSONSource>

      {route && (
        <MapRoute coordinates={route} color="#3b82f6" width={4} beforeId={METRO_STATIONS_LAYER_ID} />
      )}

      {selected?.kind === 'metro' && (
        <MapMarker coordinate={selected.station.coordinates}>
          <View
            style={[
              markerStyles.pinLarge,
              { backgroundColor: selected.station.lineColor },
            ]}>
            <TrainFrontIcon size={12} color="#ffffff" strokeWidth={2.5} />
          </View>
        </MapMarker>
      )}

      {selected?.kind === 'brt' && (
        <MapMarker coordinate={selected.stop.coordinate}>
          <View style={[markerStyles.pinMedium, { backgroundColor: '#f97316' }]}>
            <Bus size={12} color="#ffffff" strokeWidth={2.5} />
          </View>
        </MapMarker>
      )}

      {selected?.kind === 'bus' && (
        <MapMarker coordinate={selected.stop.coordinate}>
          <View style={[markerStyles.pinSmall, { backgroundColor: '#64748b' }]}>
            <Bus size={10} color="#ffffff" strokeWidth={2.5} />
          </View>
        </MapMarker>
      )}
    </>
  );
});

// ─── Map content (children of <Map>) ─────────────────────────────────────────
function MapContent() {
  const { selected, route, selectItem, setUserLocation, pendingFlyTo, clearPendingFlyTo } =
    useStations();
  const { isVisible } = useMapLayers();
  const { city, cityId } = useCity();
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const { cameraRef } = (mapComponents as NonNullable<typeof mapComponents>).useMap();
  const [hasPermission, setHasPermission] = React.useState(false);

  React.useEffect(() => {
    Location.requestForegroundPermissionsAsync().then(({ status }) => {
      setHasPermission(status === 'granted');
    });
  }, []);

  // eslint-disable-next-line react-hooks/rules-of-hooks
  const position = (mapComponents as NonNullable<typeof mapComponents>).useCurrentPosition({
    enabled: hasPermission,
  });
  React.useEffect(() => {
    if (position?.coords) {
      setUserLocation([position.coords.longitude, position.coords.latitude]);
    }
  }, [position, setUserLocation]);

  React.useEffect(() => {
    if (!cameraRef.current) return;
    cameraRef.current.flyTo({
      center: city.center,
      zoom: city.zoom,
      duration: 1500,
    });
  }, [cityId, city.center, city.zoom, cameraRef]);

  React.useEffect(() => {
    if (!pendingFlyTo || !cameraRef.current) return;
    flyToCoordinate(cameraRef.current, pendingFlyTo.center, {
      mapPaddingBottom: pendingFlyTo.paddingBottom,
    });
    clearPendingFlyTo();
  }, [pendingFlyTo, clearPendingFlyTo, cameraRef]);

  if (!mapComponents) return null;
  const { MapMarker, MapUserLocation, MapRoute, GeoJSONSource, Layer } = mapComponents;

  return (
    <>
      <MapLayers
        selected={selected}
        route={route}
        showMetro={isVisible('metro')}
        showBrt={isVisible('brt')}
        showBus={isVisible('bus')}
        selectItem={selectItem}
        MapMarker={MapMarker}
        MapRoute={MapRoute}
        GeoJSONSource={GeoJSONSource}
        Layer={Layer}
      />

      {hasPermission && <MapUserLocation />}
    </>
  );
}

function MapControlsOverlay() {
  if (!mapComponents) return null;
  const { MapControls, useMap, useCurrentPosition } = mapComponents;
  const { setUserLocation, registerLocateUser } = useStations();
  const { mapPaddingBottom } = useSheetDetent();
  const { cameraRef } = useMap();
  const [hasPermission, setHasPermission] = React.useState(false);

  React.useEffect(() => {
    Location.requestForegroundPermissionsAsync().then(({ status }) => {
      setHasPermission(status === 'granted');
    });
  }, []);

  const position = useCurrentPosition({ enabled: hasPermission });

  const handleLocate = React.useCallback(async () => {
    if (!cameraRef.current) return;
    try {
      const coords = position?.coords
        ? { longitude: position.coords.longitude, latitude: position.coords.latitude }
        : await Location.getCurrentPositionAsync({}).then((l) => l.coords);
      flyToCoordinate(cameraRef.current, [coords.longitude, coords.latitude], {
        mapPaddingBottom,
      });
      setUserLocation([coords.longitude, coords.latitude]);
    } catch (error) {
      console.error('Location error:', error);
    }
  }, [cameraRef, position, setUserLocation, mapPaddingBottom]);

  React.useEffect(() => {
    registerLocateUser(handleLocate);
    return () => registerLocateUser(null);
  }, [handleLocate, registerLocateUser]);

  return (
    <MapControls
      showZoom
      showLocate={hasPermission}
      position="bottom-right"
      onLocate={handleLocate}
    />
  );
}

function MapWithStations() {
  const { city } = useCity();
  const { isMapLoading } = useMapLayers();
  if (!mapComponents) return null;
  const { Map } = mapComponents;

  return (
    <View style={styles.mapHost}>
      <Map zoom={city.zoom} center={city.center} controls={<MapControlsOverlay />}>
        <MapContent />
      </Map>
      {isMapLoading ? (
        <View style={styles.mapLoadingOverlay} pointerEvents="none">
          <ActivityIndicator size="small" color="#ffffff" />
        </View>
      ) : null}
    </View>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────
export default function Screen() {
  return (
    <>
      <Stack.Screen
        options={{
          header: () => <AppHeader />,
          headerTransparent: true,
          headerShadowVisible: false,
        }}
      />
      <View className="flex-1">
        {isMapLibreLinked ? (
          <MapWithStations />
        ) : (
          <View style={styles.mapFallback}>
            <Text style={styles.mapFallbackText}>
              Map requires a development build. Run: npx expo run:android
            </Text>
          </View>
        )}
        {SheetSection && <SheetSection />}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  mapHost: {
    flex: 1,
  },
  mapLoadingOverlay: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.18)',
  },
  mapFallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  mapFallbackText: {
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'center',
    fontSize: 14,
  },
});

const markerStyles = StyleSheet.create({
  pinLarge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2.5,
    borderColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 6,
  },
  pinMedium: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2.5,
    borderColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 5,
  },
  pinSmall: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
  },
});
