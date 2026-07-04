import type { CameraRef } from '@maplibre/maplibre-react-native';

type FlyToCoordinateOptions = {
  zoom?: number;
  duration?: number;
  mapPaddingBottom?: number;
};

export function flyToCoordinate(
  camera: CameraRef | null | undefined,
  center: [number, number],
  { zoom = 14, duration = 1500, mapPaddingBottom = 0 }: FlyToCoordinateOptions = {}
) {
  if (!camera) return;

  camera.flyTo({
    center,
    zoom,
    duration,
    ...(mapPaddingBottom > 0 ? { padding: { bottom: mapPaddingBottom } } : {}),
  });
}
