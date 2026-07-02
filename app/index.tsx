import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { useI18n } from '@/lib/i18n';
import { useStations } from '@/lib/stations-context';
import { toGeoJSON } from '@/lib/stations';
import { Stack } from 'expo-router';
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
  const {
    stations,
    selectedStation,
    route,
    selectStation,
  } = useStations();

  if (!mapComponents) return null;
  const { MapMarker, MapUserLocation, MapRoute, GeoJSONSource, Layer } = mapComponents;

  const geojson = React.useMemo(() => toGeoJSON(stations), [stations]);

  const handleStationLayerPress = (event: {
    nativeEvent?: { features?: Array<{ properties?: { id?: string } }> };
  }) => {
    const stationId = event.nativeEvent?.features?.[0]?.properties?.id;
    if (!stationId) return;
    const station = stations.find((s) => s.id === stationId);
    if (station) selectStation(station);
  };

  return (
    <>
      {/* All station circles via GeoJSON layer */}
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

      {/* Highlighted marker for selected station */}
      {selectedStation && (
        <MapMarker coordinate={selectedStation.coordinates}>
          <View style={styles.selectedPin}>
            <View style={styles.selectedPinInner} />
          </View>
        </MapMarker>
      )}

      {/* Route polyline */}
      {route && <MapRoute coordinates={route} color="#3b82f6" width={4} />}

      {/* User location dot */}
      <MapUserLocation autoRequestPermission />

    </>
  );
}

function MapOverlayContent() {
  if (!mapComponents) return null;
  const { MapControls } = mapComponents;
  const { setUserLocation } = useStations();

  const handleLocate = ({ longitude, latitude }: { longitude: number; latitude: number }) => {
    setUserLocation([longitude, latitude]);
  };

  return (
    <MapControls
      showZoom
      showLocate
      position="bottom-right"
      onLocate={handleLocate}
    />
  );
}

// ─── GeoJSON layer tap handler wrapper ───────────────────────────────────────
// MapLibre's Layer doesn't expose onPress directly; we use a Pressable on the
// map itself via onPress on the MapLibreMap. We handle it in a thin wrapper.
function MapWithStations() {
  if (!mapComponents) return null;
  const { Map } = mapComponents;

  return (
    <Map
      zoom={12}
      center={[51.39, 35.72]}
      showLoader={false}
      overlay={<MapOverlayContent />}>
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
      <View style={styles.container}>
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
  container: {
    flex: 1,
    backgroundColor: BLUE,
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
