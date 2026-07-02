import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { useI18n } from '@/lib/i18n';
import { useStations } from '@/lib/stations-context';
import { Stack } from 'expo-router';
import * as Location from 'expo-location';
import { MoonStarIcon, SunIcon, TrainFrontIcon } from 'lucide-react-native';
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
  const { MapMarker, MapControls, MapUserLocation, MapRoute } = mapComponents;

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
      {stations.map((station) => {
        const isSelected = selectedStation?.id === station.id;
        return (
          <MapMarker
            key={station.id}
            coordinate={station.coordinates}
            onPress={() => selectStation(station)}>
            <View
              style={[
                markerStyles.pin,
                { backgroundColor: station.lineColor },
                isSelected && markerStyles.pinSelected,
              ]}>
              <TrainFrontIcon
                size={isSelected ? 14 : 11}
                color="#ffffff"
                strokeWidth={2.5}
              />
            </View>
          </MapMarker>
        );
      })}

      {route && <MapRoute coordinates={route} color="#3b82f6" width={4} />}

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
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 3,
  },
  pinSelected: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 3,
    elevation: 6,
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
