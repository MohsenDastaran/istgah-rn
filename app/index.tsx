import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { useI18n } from '@/lib/i18n';
import { useStations } from '@/lib/stations-context';
import { toGeoJSON } from '@/lib/stations';
import { Stack } from 'expo-router';
import * as Location from 'expo-location';
import { MoonStarIcon, SunIcon } from 'lucide-react-native';
import * as React from 'react';
import { StyleSheet, Text, TurboModuleRegistry, View } from 'react-native';
import { Uniwind, useUniwind } from 'uniwind';

const BLUE = '#3784d7';

const isTrueSheetLinked = !!TurboModuleRegistry.get('TrueSheetModule');
const SheetSection = isTrueSheetLinked ? require('@/components/sheet-section').SheetSection : null;

const isMapLibreLinked = !!TurboModuleRegistry.get('MLRNCameraModule');
const mapComponents = isMapLibreLinked ? require('@/components/ui/map') : null;

// ─── Map content (children of <Map>) ─────────────────────────────────────────
function MapContent() {
  const { stations, selectedStation, route, selectStation, setUserLocation } = useStations();
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

  const geojson = React.useMemo(() => toGeoJSON(stations), [stations]);

  const handleStationLayerPress = (event: {
    nativeEvent?: { features?: Array<{ properties?: { id?: string } }> };
  }) => {
    const stationId = event.nativeEvent?.features?.[0]?.properties?.id;
    if (!stationId) return;
    const station = stations.find((s) => s.id === stationId);
    if (station) selectStation(station);
  };

  const handleLocate = async () => {
    if (!cameraRef.current) return;
    try {
      // Use the already-known position if available, otherwise fetch fresh.
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
      <GeoJSONSource id="stations-source" data={geojson} onPress={handleStationLayerPress}>
        <Layer
          id="stations-circles"
          type="circle"
          style={{
            circleRadius: 10,
            circleColor: ['get', 'lineColor'],
            circleOpacity: 0.85,
            circleStrokeWidth: 2,
            circleStrokeColor: '#ffffff',
          }}
        />
        <Layer
          id="stations-labels"
          type="symbol"
          style={{
            textField: ['get', 'nameFa'],
            textSize: 11,
            textColor: '#ffffff',
            textHaloColor: '#000000',
            textHaloWidth: 1,
            textOffset: [0, 2],
          }}
        />
      </GeoJSONSource>

      {selectedStation && (
        <MapMarker coordinate={selectedStation.coordinates}>
          <View style={styles.selectedPin}>
            <View style={styles.selectedPinInner} />
          </View>
        </MapMarker>
      )}

      {route && <MapRoute coordinates={route} color="#3b82f6" width={4} />}

      {hasPermission && <MapUserLocation />}

      <MapControls
        showZoom
        showLocate={hasPermission}
        position="top-right"
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
  selectedPin: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#3b82f6',
    borderWidth: 3,
    borderColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
  },
  selectedPinInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#ffffff',
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
