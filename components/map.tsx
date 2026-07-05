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
import { CircleArrowUp, LocateFixed, Minus, Plus } from 'lucide-react-native';
import {
  ActivityIndicator,
  Keyboard,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useUniwind } from 'uniwind';

type MapContextValue = {
  mapRef: React.RefObject<MapRef | null>;
  cameraRef: React.RefObject<CameraRef | null>;
  isLoaded: boolean;
  theme: 'light' | 'dark';
  bearing: number;
  setBearing: (b: number) => void;
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
  /** Overlay controls rendered outside the native map surface (avoids GL compositing bugs). */
  controls?: ReactNode;
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
  <View pointerEvents="none" className="absolute inset-0 items-center justify-center bg-white/50">
    <ActivityIndicator size="small" color="#999" />
  </View>
);

function Map({
  children,
  controls,
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
  const [bearing, setBearing] = useState(0);
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
    <MapContext value={{ mapRef, cameraRef, isLoaded, theme, bearing, setBearing }}>
      <View className={cn('relative flex-1', className)}>
        <MapLibreMap
          ref={mapRef}
          style={{ flex: 1 }}
          androidView="texture"
          mapStyle={mapStyle}
          onDidFinishLoadingMap={markLoaded}
          onDidFinishLoadingStyle={markLoaded}
          onDidFinishRenderingMapFully={markLoaded}
          onRegionIsChanging={(e) => setBearing(e.nativeEvent.bearing ?? 0)}
          onRegionDidChange={(e) => setBearing(e.nativeEvent.bearing ?? 0)}
          onPress={onPress}
          compass={false}
          logo={false}
          attribution={false}>
          <Camera ref={cameraRef} zoom={zoom} center={center} easing="fly" duration={1000} />
          {children}
        </MapLibreMap>
        {controls ? (
          <View pointerEvents="box-none" style={StyleSheet.absoluteFill}>
            {controls}
          </View>
        ) : null}
        {showLoader && !isLoaded ? <DefaultLoader /> : null}
      </View>
    </MapContext>
  );
}

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
  const { cameraRef, mapRef, bearing } = useMap();
  const [isLocating, setIsLocating] = useState(false);
  const [keyboardVisible, setKeyboardVisible] = useState(false);

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const showSub = Keyboard.addListener(showEvent, () => setKeyboardVisible(true));
    const hideSub = Keyboard.addListener(hideEvent, () => setKeyboardVisible(false));
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

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

  const { theme } = useUniwind();
  const isDark = theme === 'dark';

  const positionStyle = {
    'top-left': { top: 8, left: 8 },
    'top-right': { top: 8, right: 8 },
    'bottom-left': { bottom: 140, left: 20 },
    'bottom-right': { bottom: 140, right: 20 },
  }[position];

  const cardStyle = [controlStyles.card, isDark ? controlStyles.cardDark : controlStyles.cardLight];
  const dividerStyle = isDark ? controlStyles.dividerDark : controlStyles.dividerLight;
  const iconColor = isDark ? '#e2e8f0' : '#334155';
  const isNorth = Math.abs(bearing) < 1 || Math.abs(bearing - 360) < 1;
  const compassOpacity = useSharedValue(isNorth ? 0 : 1);

  useEffect(() => {
    compassOpacity.value = withTiming(isNorth ? 0 : 1, {
      duration: 280,
      easing: Easing.out(Easing.cubic),
    });
  }, [isNorth, compassOpacity]);

  const compassFadeStyle = useAnimatedStyle(() => {
    const v = compassOpacity.value;
    return {
      opacity: v,
      maxHeight: v * 52,
      marginBottom: v * 8,
      overflow: 'hidden' as const,
    };
  });

  const handleResetNorth = () => {
    cameraRef.current?.setStop({ bearing: 0, duration: 300 });
  };

  if (keyboardVisible) return null;

  return (
    <View
      pointerEvents="box-none"
      style={[controlStyles.container, positionStyle]}
      className={className}>
      {/* Compass — fades in when map is rotated off north; tap to reset */}
      <Animated.View
        style={[cardStyle, compassFadeStyle]}
        pointerEvents={isNorth ? 'none' : 'auto'}>
        <ControlButton onPress={handleResetNorth} label="Reset north" isDark={isDark}>
          <View
            style={{
              width: 20,
              height: 20,
              alignItems: 'center',
              justifyContent: 'center',
              transform: [{ rotate: `${-bearing}deg` }],
            }}>
            <CircleArrowUp size={20} color={iconColor} strokeWidth={2} />
          </View>
        </ControlButton>
      </Animated.View>

      {showZoom && (
        <View style={cardStyle}>
          <ControlButton onPress={handleZoomIn} label="Zoom in" isDark={isDark}>
            <Plus size={20} color={iconColor} strokeWidth={2} />
          </ControlButton>
          <View style={dividerStyle} />
          <ControlButton onPress={handleZoomOut} label="Zoom out" isDark={isDark}>
            <Minus size={20} color={iconColor} strokeWidth={2} />
          </ControlButton>
        </View>
      )}
      {showLocate && (
        <View style={cardStyle}>
          <ControlButton
            onPress={handleLocatePress}
            label="My location"
            isDark={isDark}
            disabled={isLocating}>
            {isLocating ? (
              <ActivityIndicator size="small" color={iconColor} />
            ) : (
              <LocateFixed size={20} color={iconColor} strokeWidth={2} />
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
  isDark = false,
}: {
  onPress: () => void;
  label: string;
  children: ReactNode;
  disabled?: boolean;
  isDark?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      hitSlop={8}
      style={({ pressed }) => [
        controlStyles.btn,
        pressed && (isDark ? controlStyles.btnPressedDark : controlStyles.btnPressedLight),
        disabled && controlStyles.btnDisabled,
      ]}
      accessibilityLabel={label}
      accessibilityRole="button">
      {children}
    </Pressable>
  );
}

const controlStyles = StyleSheet.create({
  container: {
    position: 'absolute',
    gap: 8,
    marginBottom: 10,
  },
  card: {
    borderRadius: 14,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 6,
    elevation: 5,
  },
  cardLight: {
    backgroundColor: 'rgba(255, 255, 255, 0.92)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(0,0,0,0.08)',
  },
  cardDark: {
    backgroundColor: 'rgba(30, 36, 46, 0.92)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  dividerLight: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(0,0,0,0.1)',
    marginHorizontal: 10,
  },
  dividerDark: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(255,255,255,0.1)',
    marginHorizontal: 10,
  },
  btn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnPressedLight: {
    backgroundColor: 'rgba(0,0,0,0.06)',
  },
  btnPressedDark: {
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  btnDisabled: {
    opacity: 0.4,
  },
});

type MapRouteProps = {
  coordinates: Array<[number, number]>;
  color?: string;
  width?: number;
  opacity?: number;
  dashArray?: [number, number];
  /** Insert this route layer below the given layer id (keeps markers on top). */
  beforeId?: string;
};

function MapRoute({
  coordinates,
  color = '#4285F4',
  width = 3,
  opacity = 0.8,
  dashArray,
  beforeId,
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
        beforeId={beforeId}
        paint={{
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
  /** When set, skip internal permission handling and trust the parent */
  permissionGranted?: boolean;
};

function MapUserLocation({
  visible = true,
  showAccuracy = true,
  showHeading = false,
  animated = true,
  minDisplacement,
  onPress,
  autoRequestPermission = true,
  permissionGranted,
}: MapUserLocationProps) {
  const [hasPermission, setHasPermission] = useState(permissionGranted ?? false);
  const [permissionChecked, setPermissionChecked] = useState(permissionGranted !== undefined);

  useEffect(() => {
    if (permissionGranted !== undefined) return;

    let mounted = true;

    const checkAndRequestPermissions = async () => {
      try {
        if (autoRequestPermission) {
          const granted = await LocationManager.requestPermissions();
          if (mounted) {
            setHasPermission(granted);
            setPermissionChecked(true);
          }
        } else if (mounted) {
          setPermissionChecked(true);
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
  }, [visible, autoRequestPermission, permissionGranted]);

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
