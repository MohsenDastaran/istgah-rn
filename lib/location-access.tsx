import { useI18n } from '@/lib/i18n';
import * as Location from 'expo-location';
import * as React from 'react';
import { Alert, Linking, Platform } from 'react-native';

type LocationCoords = { longitude: number; latitude: number };

type LocationAccessContextValue = {
  /** Permission granted and device location services enabled. */
  hasAccess: boolean;
  /** Check current access without prompting. */
  refreshAccess: () => Promise<boolean>;
  /** Request permission if needed, then return current coordinates. */
  requestAccess: () => Promise<LocationCoords | null>;
};

const LocationAccessContext = React.createContext<LocationAccessContextValue | null>(null);

async function readAccess(): Promise<boolean> {
  const [{ status }, servicesEnabled] = await Promise.all([
    Location.getForegroundPermissionsAsync(),
    Location.hasServicesEnabledAsync(),
  ]);
  return status === 'granted' && servicesEnabled;
}

function openLocationSettings() {
  if (Platform.OS === 'android') {
    void Linking.sendIntent('android.settings.LOCATION_SOURCE_SETTINGS').catch(() => {
      void Linking.openSettings();
    });
    return;
  }
  void Linking.openSettings();
}

function confirmAction(
  title: string,
  message: string,
  confirmLabel: string,
  cancelLabel: string
): Promise<boolean> {
  return new Promise((resolve) => {
    Alert.alert(title, message, [
      { text: cancelLabel, style: 'cancel', onPress: () => resolve(false) },
      { text: confirmLabel, onPress: () => resolve(true) },
    ]);
  });
}

async function ensureLocationServicesEnabled(
  title: string,
  message: string,
  confirmLabel: string,
  cancelLabel: string
): Promise<boolean> {
  let servicesEnabled = await Location.hasServicesEnabledAsync();
  if (servicesEnabled) return true;

  if (Platform.OS === 'android') {
    try {
      await Location.enableNetworkProviderAsync();
    } catch {
      // User dismissed the system dialog.
    }
    servicesEnabled = await Location.hasServicesEnabledAsync();
    if (servicesEnabled) return true;
  }

  const shouldOpenSettings = await confirmAction(title, message, confirmLabel, cancelLabel);
  if (!shouldOpenSettings) return false;

  openLocationSettings();
  return Location.hasServicesEnabledAsync();
}

export function LocationAccessProvider({ children }: { children: React.ReactNode }) {
  const { t } = useI18n();
  const [hasAccess, setHasAccess] = React.useState(false);

  const refreshAccess = React.useCallback(async () => {
    const granted = await readAccess();
    setHasAccess(granted);
    return granted;
  }, []);

  React.useEffect(() => {
    void refreshAccess();
  }, [refreshAccess]);

  const requestAccess = React.useCallback(async (): Promise<LocationCoords | null> => {
    let permission = await Location.getForegroundPermissionsAsync();
    if (permission.status !== 'granted') {
      permission = await Location.requestForegroundPermissionsAsync();
    }

    if (permission.status !== 'granted') {
      if (!permission.canAskAgain) {
        const shouldOpenSettings = await confirmAction(
          t.locationPermissionTitle,
          t.locationPermissionMessage,
          t.openSettings,
          t.cancel
        );
        if (shouldOpenSettings) openLocationSettings();
      }
      return null;
    }

    const servicesEnabled = await ensureLocationServicesEnabled(
      t.locationServicesOffTitle,
      t.locationServicesOffMessage,
      t.openSettings,
      t.cancel
    );
    if (!servicesEnabled) return null;

    setHasAccess(true);

    try {
      const { coords } = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      return { longitude: coords.longitude, latitude: coords.latitude };
    } catch {
      const recovered = await ensureLocationServicesEnabled(
        t.locationServicesOffTitle,
        t.locationServicesOffMessage,
        t.openSettings,
        t.cancel
      );
      if (!recovered) return null;

      try {
        const { coords } = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        return { longitude: coords.longitude, latitude: coords.latitude };
      } catch {
        return null;
      }
    }
  }, [t]);

  const value = React.useMemo(
    () => ({ hasAccess, refreshAccess, requestAccess }),
    [hasAccess, refreshAccess, requestAccess]
  );

  return (
    <LocationAccessContext.Provider value={value}>{children}</LocationAccessContext.Provider>
  );
}

export function useLocationAccess(): LocationAccessContextValue {
  const ctx = React.useContext(LocationAccessContext);
  if (!ctx) throw new Error('useLocationAccess must be used within LocationAccessProvider');
  return ctx;
}
