import { Linking } from 'react-native';

/** Opens Google Maps with directions to the given coordinates. */
export function openGoogleMapsDirections(latitude: number, longitude: number): void {
  const url = `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}`;
  Linking.openURL(url).catch((error) => {
    console.error('Failed to open Google Maps', error);
  });
}
