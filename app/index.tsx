import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { useI18n } from '@/lib/i18n';
import { useStations } from '@/lib/stations-context';
import {
  METRO_NETWORK_GEOJSON,
  STATIONS,
  STATIONS_GEOJSON,
  type Station,
} from '@/lib/stations';
import { Stack } from 'expo-router';
import * as Location from 'expo-location';
import { MoonStarIcon, SunIcon, TrainFrontIcon } from 'lucide-react-native';
import * as React from 'react';
import { StyleSheet, Text, TurboModuleRegistry, View } from 'react-native';
import { Uniwind, useUniwind } from 'uniwind';

const isTrueSheetLinked = !!TurboModuleRegistry.get('TrueSheetModule');
const SheetSection = isTrueSheetLinked ? require('@/components/sheet-section').SheetSection : null;

const isMapLibreLinked = !!TurboModuleRegistry.get('MLRNCameraModule');
const mapComponents = isMapLibreLinked ? require('@/components/ui/map') : null;

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
    [selectStation],
  );

  const stationCircleStyle = React.useMemo(
    () => ({
      circleColor: [
        'case',
        ['==', ['get', 'isActive'], false],
        '#888888',
        ['get', 'lineColor'],
      ],
      circleStrokeColor: '#ffffff',
      circleStrokeWidth: 2,
      circleRadius: selectedStation
        ? ['case', ['==', ['get', 'id'], selectedStation.id], 0, 10]
        : 10,
      circleOpacity: ['case', ['==', ['get', 'isActive'], false], 0.55, 1],
    }),
    [selectedStation],
  );

  return (
    <>
      <GeoJSONSource id="metro-network" data={METRO_NETWORK_GEOJSON}>
        <Layer
          id="metro-lines"
          type="line"
          style={{
            lineColor: ['get', 'color'],
            lineWidth: 3,
            lineOpacity: 0.85,
            lineJoin: 'round',
            lineCap: 'round',
          }}
        />
      </GeoJSONSource>

      <GeoJSONSource
        id="stations"
        data={STATIONS_GEOJSON}
        onPress={handleStationPress}
        hitbox={{ top: 24, bottom: 24, left: 24, right: 24 }}>
        <Layer id="stations-circles" type="circle" style={stationCircleStyle} />
      </GeoJSONSource>

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

      {route && <MapRoute coordinates={route} color="#3b82f6" width={4} />}
    </>
  );
});

// ─── Map content (children of <Map>) ─────────────────────────────────────────
function MapContent() {
  const { selectedStation, route, selectStation, setUserLocation } = useStations();
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

  if (!mapComponents) return null;
  const { MapMarker, MapControls, MapUserLocation, MapRoute, GeoJSONSource, Layer } = mapComponents;

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

      <MapControls
        showZoom
        showLocate={hasPermission}
        position="bottom-right"
        onLocate={handleLocate}
      />
    </>
  );
}

function MapWithStations() {
  if (!mapComponents) return null;
  const { Map } = mapComponents;

  return (
    <Map zoom={12} center={[51.39, 35.72]}>
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
          headerRight: () => <ThemeToggle />,
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

const THEME_ICONS = {
  light: SunIcon,
  dark: MoonStarIcon,
};

function ThemeToggle() {
  const { theme } = useUniwind();

  function toggleTheme() {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    Uniwind.setTheme(newTheme);
  }

  return (
    <Button
      onPressIn={toggleTheme}
      size="icon"
      variant="ghost"
      className="ios:size-9 web:mx-4 rounded-full">
      <Icon as={THEME_ICONS[theme ?? 'light']} className="size-5" />
    </Button>
  );
}
