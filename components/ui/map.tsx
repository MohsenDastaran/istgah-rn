import { cn } from '@/lib/utils';
import {
  Callout,
  Camera,
  GeoJSONSource,
  Layer,
  LocationManager,
  Map as MapLibreMap,
  Marker,
  UserLocation,
  useCurrentPosition,
  type CameraRef,
  type MapRef,
  type StyleSpecification,
} from '@maplibre/maplibre-react-native';
import {
  createContext,
  use,
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { ActivityIndicator, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useUniwind } from 'uniwind';

type MapContextValue = {
  mapRef: React.RefObject<MapRef | null>;
  cameraRef: React.RefObject<CameraRef | null>;
  isLoaded: boolean;
  theme: 'light' | 'dark';
};

const MapContext = createContext<MapContextValue | null>(null);

function useMap() {
  const context = use(MapContext);
  if (!context) {
    throw new Error('useMap must be used within a Map component');
  }
  return context;
}

const defaultStyles = {
  dark: 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json',
  light: 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json',
};

const MAP_LOAD_TIMEOUT_MS = 8000;

type MapStyleOption = string | StyleSpecification;

type MapProps = {
  children?: ReactNode;
  /** Screen-level UI (sheet, controls) rendered above the map with a high z-index. */
  chrome?: ReactNode;
  /** React overlay rendered above the native map. */
  overlay?: ReactNode;
  /** Custom map styles for light and dark themes. Overrides the default Carto styles. */
  styles?: {
    light?: MapStyleOption;
    dark?: MapStyleOption;
  };
  /** Initial center coordinate [longitude, latitude] */
  center?: [number, number];
  /** Initial zoom level */
  zoom?: number;
  /** Container style */
  className?: string;
  /** Show loading indicator */
  showLoader?: boolean;
  /** Called when the map is pressed. */
  onPress?: (event: unknown) => void;
};

const DefaultLoader = () => (
  <View
    pointerEvents="none"
    className="absolute inset-0 items-center justify-center bg-white/50"
    style={{ zIndex: 1 }}>
    <ActivityIndicator size="small" color="#999" />
  </View>
);

function Map({
  children,
  chrome,
  overlay,
  styles,
  center = [0, 0],
  zoom = 10,
  className,
  showLoader = true,
  onPress,
}: MapProps) {
  const mapRef = useRef<MapRef | null>(null);
  const cameraRef = useRef<CameraRef | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const { theme } = useUniwind();
  const mapStyle =
    theme === 'dark'
      ? (styles?.dark ?? defaultStyles.dark)
      : (styles?.light ?? defaultStyles.light);

  const markLoaded = useCallback(() => {
    setIsLoaded(true);
  }, []);

  useEffect(() => {
    if (isLoaded) return;
    const timeout = setTimeout(markLoaded, MAP_LOAD_TIMEOUT_MS);
    return () => clearTimeout(timeout);
  }, [isLoaded, markLoaded]);

  return (
    <MapContext value={{ mapRef, cameraRef, isLoaded, theme }}>
      <View className={cn('relative flex-1', className)} pointerEvents="box-none">
        <MapLibreMap
          ref={mapRef}
          style={{ flex: 1 }}
          mapStyle={mapStyle}
          androidView={Platform.OS === 'android' ? 'texture' : undefined}
          onDidFinishLoadingMap={markLoaded}
          onDidFinishLoadingStyle={markLoaded}
          onDidFinishRenderingMapFully={markLoaded}
          onPress={onPress}
          compass={false}
          logo={false}
          attribution={false}>
          <Camera ref={cameraRef} initialViewState={{ center, zoom }} />
          {children}
        </MapLibreMap>
        {overlay ? (
          <View pointerEvents="box-none" className="absolute inset-0" style={mapStyles.overlay}>
            {overlay}
          </View>
        ) : null}
        {showLoader && !isLoaded ? <DefaultLoader /> : null}
        {chrome ? (
          <View pointerEvents="box-none" style={mapStyles.chrome}>
            {chrome}
          </View>
        ) : null}
      </View>
    </MapContext>
  );
}

const mapStyles = StyleSheet.create({
  overlay: {
    zIndex: 2,
    elevation: 2,
  },
  chrome: {
    ...StyleSheet.absoluteFill,
    zIndex: 1000,
    elevation: 100,
  },
  controls: {
    zIndex: 1001,
    elevation: 101,
  },
  controlGroup: {
    elevation: 8,
  },
});

function anchorObjectToAnchorString(anchor: { x: number; y: number }) {
  const horizontal = anchor.x <= 0.25 ? 'left' : anchor.x >= 0.75 ? 'right' : 'center';
  const vertical = anchor.y <= 0.25 ? 'top' : anchor.y >= 0.75 ? 'bottom' : 'center';

  if (horizontal === 'center' && vertical === 'center') return 'center';
  if (horizontal === 'center') return vertical;
  if (vertical === 'center') return horizontal;

  return `${vertical}-${horizontal}` as 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
}

type MarkerContextValue = {
  coordinate: [number, number];
};

const MarkerContext = createContext<MarkerContextValue | null>(null);

type MapMarkerProps = {
  children?: ReactNode;
  label?: string;
  /** Anchor point for the marker (0.0 to 1.0). Default is center (0.5, 0.5) */
  anchor?: { x: number; y: number };
  /** Allow marker to overlap with other markers */
  allowOverlap?: boolean;
  /** Callback when marker is pressed */
  onPress?: () => void;
} & (
  | { coordinate: [number, number]; longitude?: never; latitude?: never }
  | { longitude: number; latitude: number; coordinate?: never }
);

function MapMarker({
  children,
  label,
  anchor = { x: 0.5, y: 0.5 },
  allowOverlap: _allowOverlap = false,
  onPress,
  ...positionProps
}: MapMarkerProps) {
  const id = useId();

  const coordinate: [number, number] =
    'coordinate' in positionProps && positionProps.coordinate
      ? positionProps.coordinate
      : [positionProps.longitude, positionProps.latitude];

  return (
    <MarkerContext value={{ coordinate }}>
      <Marker id={id} lngLat={coordinate} anchor={anchorObjectToAnchorString(anchor)}>
        <Pressable onPress={onPress}>
          <View className="flex flex-row items-center justify-center">
            {children || <DefaultMarkerIcon />}
            {label && <MarkerLabel>{label}</MarkerLabel>}
          </View>
        </Pressable>
      </Marker>
    </MarkerContext>
  );
}

type MarkerContentProps = {
  children?: ReactNode;
  className?: string;
};

function MarkerContent({ children, className }: MarkerContentProps) {
  return (
    <View className={cn('items-center justify-center', className)}>
      {children || <DefaultMarkerIcon />}
    </View>
  );
}

function DefaultMarkerIcon() {
  return (
    <View
      className="h-4 w-4 rounded-full border-2 border-white bg-blue-500 shadow-md"
      style={{ elevation: 5 }}
    />
  );
}

type MarkerPopupProps = {
  children: ReactNode;
  className?: string;
  /** Title text for the callout */
  title?: string;
};

function MarkerPopup({ children, className, title }: MarkerPopupProps) {
  return (
    <Callout title={title} className={className}>
      <View className="max-w-[300px] min-w-[100px] p-3">{children}</View>
    </Callout>
  );
}

type MarkerLabelProps = {
  children: ReactNode;
  className?: string;
  classNameText?: string;
  position?: 'top' | 'bottom';
};

function MarkerLabel({ children, className, classNameText, position = 'top' }: MarkerLabelProps) {
  return (
    <View
      className={cn(
        'absolute left-1/2 translate-x-[-50%]',
        position === 'top' ? 'bottom-full mb-1' : 'top-full mt-1',
        className
      )}>
      <Text className={cn('text-foreground text-[10px] font-semibold', classNameText)}>
        {children}
      </Text>
    </View>
  );
}

type MapControlsProps = {
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  showZoom?: boolean;
  showLocate?: boolean;
  className?: string;
  /** Called when the locate button is pressed. The callback is responsible for
   *  getting the location and moving the camera. */
  onLocate?: () => void | Promise<void>;
};

function MapControls({
  position = 'bottom-right',
  showZoom = true,
  showLocate = false,
  className,
  onLocate,
}: MapControlsProps) {
  const { cameraRef, mapRef } = useMap();
  const [isLocating, setIsLocating] = useState(false);

  const handleZoomIn = async () => {
    if (!cameraRef.current || !mapRef.current) return;
    try {
      const zoom = await mapRef.current.getZoom();
      cameraRef.current.zoomTo(Math.min(zoom + 1, 20), { duration: 300 });
    } catch (error) {
      console.error('Error zooming in:', error);
    }
  };

  const handleZoomOut = async () => {
    if (!cameraRef.current || !mapRef.current) return;
    try {
      const zoom = await mapRef.current.getZoom();
      cameraRef.current.zoomTo(Math.max(zoom - 1, 0), { duration: 300 });
    } catch (error) {
      console.error('Error zooming out:', error);
    }
  };

  const handleLocatePress = async () => {
    if (!onLocate) return;
    setIsLocating(true);
    try {
      await onLocate();
    } catch (error) {
      console.error('Error locating:', error);
    } finally {
      setIsLocating(false);
    }
  };

  const positionStyle = {
    'top-left': { top: 8, left: 8 },
    'top-right': { top: 8, right: 8 },
    'bottom-left': { bottom: 8, left: 8 },
    'bottom-right': { bottom: 8, right: 8 },
  }[position];

  return (
    <View
      pointerEvents="box-none"
      className={cn('absolute gap-1.5', className)}
      style={[positionStyle, mapStyles.controls]}
      collapsable={false}>
      {showZoom && (
        <View
          className="overflow-hidden rounded border border-gray-200 bg-white shadow-sm"
          style={mapStyles.controlGroup}
          collapsable={false}>
          <ControlButton onPress={handleZoomIn} label="+">
            <Text className="text-lg font-semibold text-gray-700">+</Text>
          </ControlButton>
          <View className="h-px bg-gray-200" />
          <ControlButton onPress={handleZoomOut} label="-">
            <Text className="text-lg font-semibold text-gray-700">−</Text>
          </ControlButton>
        </View>
      )}
      {showLocate && (
        <View
          className="overflow-hidden rounded border border-gray-200 bg-white shadow-sm"
          style={mapStyles.controlGroup}
          collapsable={false}>
          <ControlButton onPress={handleLocatePress} label="locate" disabled={isLocating}>
            {isLocating ? (
              <ActivityIndicator size="small" color="#666" />
            ) : (
              <Text className="text-lg font-semibold text-gray-700">📍</Text>
            )}
          </ControlButton>
        </View>
      )}
    </View>
  );
}

function ControlButton({
  onPress,
  label,
  children,
  disabled = false,
}: {
  onPress: () => void;
  label: string;
  children: ReactNode;
  disabled?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      hitSlop={8}
      className="h-8 w-8 items-center justify-center active:bg-gray-100"
      style={disabled ? { opacity: 0.5 } : undefined}
      accessibilityLabel={label}
      accessibilityRole="button">
      {children}
    </Pressable>
  );
}

type MapRouteProps = {
  coordinates: Array<[number, number]>;
  color?: string;
  width?: number;
  opacity?: number;
  dashArray?: [number, number];
};

function MapRoute({
  coordinates,
  color = '#4285F4',
  width = 3,
  opacity = 0.8,
  dashArray,
}: MapRouteProps) {
  const id = useId();
  const sourceId = `route-source-${id}`;
  const layerId = `route-layer-${id}`;

  if (coordinates.length < 2) {
    return null;
  }

  const shape = {
    type: 'Feature' as const,
    properties: {},
    geometry: {
      type: 'LineString' as const,
      coordinates,
    },
  };

  return (
    <GeoJSONSource id={sourceId} data={shape}>
      <Layer
        id={layerId}
        type="line"
        style={{
          lineColor: color,
          lineWidth: width,
          lineOpacity: opacity,
          ...(dashArray && { lineDasharray: dashArray }),
          lineJoin: 'round',
          lineCap: 'round',
        }}
      />
    </GeoJSONSource>
  );
}

type MapUserLocationProps = {
  /** Show user location on the map */
  visible?: boolean;
  /** Show accuracy circle around user location */
  showAccuracy?: boolean;
  /** Show heading arrow indicating device direction */
  showHeading?: boolean;
  /** Whether the location marker is animated between updates */
  animated?: boolean;
  /** Minimum delta in meters for location updates */
  minDisplacement?: number;
  /** Callback when user location is pressed */
  onPress?: () => void;
  /** Auto-request location permissions if not granted */
  autoRequestPermission?: boolean;
};

function MapUserLocation({
  visible = true,
  showAccuracy = true,
  showHeading = false,
  animated = true,
  minDisplacement,
  onPress,
  autoRequestPermission = true,
}: MapUserLocationProps) {
  const [hasPermission, setHasPermission] = useState(false);
  const [permissionChecked, setPermissionChecked] = useState(false);

  useEffect(() => {
    let mounted = true;

    const checkAndRequestPermissions = async () => {
      try {
        if (autoRequestPermission) {
          const granted = await LocationManager.requestPermissions();
          if (mounted) {
            setHasPermission(granted);
            setPermissionChecked(true);
          }
        } else {
          if (mounted) {
            setPermissionChecked(true);
          }
        }
      } catch (error) {
        console.error('Error requesting location permissions:', error);
        if (mounted) {
          setHasPermission(false);
          setPermissionChecked(true);
        }
      }
    };

    if (visible) {
      checkAndRequestPermissions();
    }

    return () => {
      mounted = false;
    };
  }, [visible, autoRequestPermission]);

  if (!visible || !permissionChecked || !hasPermission) {
    return null;
  }

  return (
    <UserLocation
      accuracy={showAccuracy}
      heading={showHeading}
      animated={animated}
      minDisplacement={minDisplacement}
      onPress={onPress}
    />
  );
}

// Re-export LocationManager for permission handling
export { GeoJSONSource, Layer, LocationManager };

export {
  Map,
  MapControls,
  MapMarker,
  MapRoute,
  MapUserLocation,
  MarkerContent,
  MarkerLabel,
  MarkerPopup,
  useCurrentPosition,
  useMap,
};
