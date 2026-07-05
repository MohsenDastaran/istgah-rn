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

const FLY_TO_RETRY_MS = 50;
const FLY_TO_MAX_ATTEMPTS = 50;

/** Retries until the native camera ref is mounted — refs do not trigger re-renders on their own. */
export function scheduleFlyTo(
  getCamera: () => CameraRef | null | undefined,
  center: [number, number],
  options: FlyToCoordinateOptions = {}
): { cancel: () => void; done: Promise<boolean> } {
  let cancelled = false;
  let attempts = 0;
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  const done = new Promise<boolean>((resolve) => {
    const tryFly = () => {
      if (cancelled) {
        resolve(false);
        return;
      }

      const camera = getCamera();
      if (camera) {
        flyToCoordinate(camera, center, options);
        resolve(true);
        return;
      }

      if (attempts++ >= FLY_TO_MAX_ATTEMPTS) {
        resolve(false);
        return;
      }

      timeoutId = setTimeout(tryFly, FLY_TO_RETRY_MS);
    };

    tryFly();
  });

  return {
    cancel: () => {
      cancelled = true;
      if (timeoutId) clearTimeout(timeoutId);
    },
    done,
  };
}
