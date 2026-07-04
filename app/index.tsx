import { useCity } from '@/lib/city-context';
import { useI18n } from '@/lib/i18n';
import { useStations } from '@/lib/stations-context';
import { TEHRAN_BRT_LINES_GEOJSON } from '@/lib/brt-lines';
import { METRO_NETWORK_GEOJSON, STATIONS, STATIONS_GEOJSON, type Station } from '@/lib/stations';
import { SettingsPanel } from '@/components/settings-panel';
import { Stack } from 'expo-router';
import * as Location from 'expo-location';
import { TrainFrontIcon } from 'lucide-react-native';
import * as React from 'react';
import { StyleSheet, Text, TurboModuleRegistry, View } from 'react-native';

const isTrueSheetLinked = !!TurboModuleRegistry.get('TrueSheetModule');
const SheetSection = isTrueSheetLinked ? require('@/components/sheet-section').SheetSection : null;

const isMapLibreLinked = !!TurboModuleRegistry.get('MLRNCameraModule');
const mapComponents = isMapLibreLinked ? require('@/components/map') : null;

const METRO_LINES_LAYER_ID = 'metro-lines';
const BRT_LINES_LAYER_ID = 'brt-lines';
const STATIONS_LAYER_ID = 'stations-circles';

// ─── Map layers (memoized — avoids re-rendering 140+ native markers on tap) ─────
type MapLayersProps = {
  selectedStation: Station | null;
  route: [number, number][] | null;
  selectStation: (station: Station) => void;
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
    style?: Record<string, unknown>;
    beforeId?: string;
    afterId?: string;
  }>;
};

const MapLayers = React.memo(function MapLayers({
  selectedStation,
  route,
  selectStation,
  MapMarker,
  MapRoute,
  GeoJSONSource,
  Layer,
}: MapLayersProps) {
  const handleStationPress = React.useCallback(
    (event: { nativeEvent: { features?: GeoJSON.Feature[] } }) => {
      const id = event.nativeEvent.features?.[0]?.properties?.id;
      if (typeof id !== 'string') return;
      const station = STATIONS.find((s) => s.id === id);
      if (station) selectStation(station);
    },
    [selectStation]
  );

  const stationCircleStyle = React.useMemo(
    () => ({
      // Inactive stations use grey; active stations use their primary line colour.
      circleColor: ['case', ['==', ['get', 'isActive'], false], '#888888', ['get', 'lineColor']],
      // Interchange stations: secondary line colour as stroke.
      // Single-line stations: plain white stroke.
      circleStrokeColor: [
        'case',
        ['boolean', ['get', 'isInterchange'], false],
        ['get', 'lineColor2'],
        '#ffffff',
      ],
      // Interchange stations get a thicker stroke so the second colour is clearly visible.
      circleStrokeWidth: ['case', ['boolean', ['get', 'isInterchange'], false], 5, 2],
      // Hide the circle for the currently selected station (native pin takes over).
      circleRadius: selectedStation
        ? ['case', ['==', ['get', 'id'], selectedStation.id], 0, 10]
        : 10,
      circleOpacity: ['case', ['==', ['get', 'isActive'], false], 0.55, 1],
      circleStrokeOpacity: ['case', ['==', ['get', 'isActive'], false], 0.55, 1],
    }),
    [selectedStation]
  );

  return (
    <>
      {/* Station markers — registered first so line layers can sit beneath them */}
      <GeoJSONSource
        id="stations"
        data={STATIONS_GEOJSON}
        onPress={handleStationPress}
        hitbox={{ top: 24, bottom: 24, left: 24, right: 24 }}>
        <Layer id={STATIONS_LAYER_ID} type="circle" style={stationCircleStyle} />
      </GeoJSONSource>

      <GeoJSONSource id="metro-network" data={METRO_NETWORK_GEOJSON}>
        <Layer
          id={METRO_LINES_LAYER_ID}
          type="line"
          beforeId={STATIONS_LAYER_ID}
          style={{
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
          beforeId={STATIONS_LAYER_ID}
          style={{
            lineColor: ['get', 'color'],
            lineWidth: 5,
            lineOpacity: 0.9,
            lineJoin: 'round',
            lineCap: 'round',
          }}
        />
      </GeoJSONSource>

      {route && (
        <MapRoute coordinates={route} color="#3b82f6" width={4} beforeId={STATIONS_LAYER_ID} />
      )}

      {/* Selected-station pin sits above everything else */}
      {selectedStation && (
        <MapMarker coordinate={selectedStation.coordinates}>
          <View
            style={[
              markerStyles.pin,
              { backgroundColor: selectedStation.lineColor },
              markerStyles.pinSelected,
            ]}>
            <TrainFrontIcon size={14} color="#ffffff" strokeWidth={2.5} />
          </View>
        </MapMarker>
      )}
    </>
  );
});

// ─── Map content (children of <Map>) ─────────────────────────────────────────
function MapContent() {
  const {
    selectedStation,
    route,
    selectStation,
    setUserLocation,
    pendingFlyTo,
    clearPendingFlyTo,
  } = useStations();
  const { city, cityId } = useCity();
  // Safe: MapContent is only ever rendered inside <Map>, which provides MapContext.
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const { cameraRef } = (mapComponents as NonNullable<typeof mapComponents>).useMap();
  const [hasPermission, setHasPermission] = React.useState(false);

  React.useEffect(() => {
    Location.requestForegroundPermissionsAsync().then(({ status }) => {
      setHasPermission(status === 'granted');
    });
  }, []);

  // Mirror live position updates (the blue dot source) into the shared context
  // so that "Get Directions" knows where the user is without a manual locate tap.
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
    cameraRef.current.flyTo({
      center: pendingFlyTo,
      zoom: 14,
      duration: 1500,
    });
    clearPendingFlyTo();
  }, [pendingFlyTo, clearPendingFlyTo, cameraRef]);

  if (!mapComponents) return null;
  const { MapMarker, MapUserLocation, MapRoute, GeoJSONSource, Layer } = mapComponents;

  return (
    <>
      <MapLayers
        selectedStation={selectedStation}
        route={route}
        selectStation={selectStation}
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
  const { setUserLocation } = useStations();
  const { cameraRef } = useMap();
  const [hasPermission, setHasPermission] = React.useState(false);

  React.useEffect(() => {
    Location.requestForegroundPermissionsAsync().then(({ status }) => {
      setHasPermission(status === 'granted');
    });
  }, []);

  const position = useCurrentPosition({ enabled: hasPermission });

  const handleLocate = async () => {
    if (!cameraRef.current) return;
    try {
      const coords = position?.coords
        ? { longitude: position.coords.longitude, latitude: position.coords.latitude }
        : await Location.getCurrentPositionAsync({}).then((l) => l.coords);
      cameraRef.current.flyTo({
        center: [coords.longitude, coords.latitude],
        zoom: 14,
        duration: 1500,
      });
      setUserLocation([coords.longitude, coords.latitude]);
    } catch (error) {
      console.error('Location error:', error);
    }
  };

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
  if (!mapComponents) return null;
  const { Map } = mapComponents;

  return (
    <Map zoom={city.zoom} center={city.center} controls={<MapControlsOverlay />}>
      <MapContent />
    </Map>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────
export default function Screen() {
  const { t } = useI18n();

  return (
    <>
      <Stack.Screen
        options={{
          title: t.headerTitle,
          headerTransparent: true,
          headerRight: () => <SettingsPanel />,
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
  pin: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 3,
    borderColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 6,
  },
  pinSelected: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
});
