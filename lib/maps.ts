import { Linking, Platform } from 'react-native';

/** Opens the device's map app(s) with directions to the given coordinates. */
export function openMapsDirections(
  latitude: number,
  longitude: number,
  label?: string,
): void {
  const coords = `${latitude},${longitude}`;
  const name = label ? encodeURIComponent(label) : 'Destination';

  const url = Platform.select({
    // Android geo intent — shows a chooser when multiple map apps are installed
    android: `geo:0,0?q=${coords}(${name})`,
    // iOS — opens Apple Maps; user can switch apps from there if needed
    ios: `http://maps.apple.com/?daddr=${coords}&dirflg=d`,
    default: `geo:0,0?q=${coords}(${name})`,
  });

  if (!url) return;

  Linking.openURL(url).catch((error) => {
    console.error('Failed to open maps', error);
  });
}
