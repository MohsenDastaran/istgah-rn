import { Input } from '@/components/ui/input';
import { type TrueSheet, TrueSheetProvider } from '@lodev09/react-native-true-sheet';
import {
  ReanimatedTrueSheet,
  ReanimatedTrueSheetProvider,
  useReanimatedTrueSheet,
} from '@lodev09/react-native-true-sheet/reanimated';
import { useI18n } from '@/lib/i18n';
import { useMapLayers } from '@/lib/map-layers-context';
import { openMapsDirections } from '@/lib/maps';
import { useStations } from '@/lib/stations-context';
import type { Station } from '@/lib/stations';
import { type BusStop, searchBusStops } from '@/lib/bus-stops';
import {
  ArrowLeft,
  ArrowRight,
  Bus,
  ExternalLink,
  Navigation2,
  RouteOff,
  TrainFront,
  X,
  XIcon,
  type LucideIcon,
} from 'lucide-react-native';
import * as React from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  SectionList,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
  type PressableProps,
  type SectionListData,
  type TextStyle,
} from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

// ─── Design tokens ────────────────────────────────────────────────────────────
const SPACING = 16;
const GAP = 12;
const INPUT_HEIGHT = SPACING * 3;
const BUTTON_HEIGHT = SPACING * 3;
const HEADER_HEIGHT = SPACING * 5;
const ROW_HEIGHT = 52;

const DARK = '#282e37';
const GRAY = '#b2bac8';
const LIGHT_GRAY = '#ebedf1';
const DARK_BLUE = '#1f64ae';

// ─── Sheet Header ─────────────────────────────────────────────────────────────
interface SheetHeaderProps {
  placeholder: string;
  isRTL: boolean;
  onChangeText: (text: string) => void;
  value: string;
}

const SheetHeader = ({ placeholder, isRTL, onChangeText, value }: SheetHeaderProps) => (
  <Animated.View style={headerStyles.container}>
    <View style={[headerStyles.inputWrap, isRTL && headerStyles.inputWrapRTL]}>
      <TextInput
        style={[headerStyles.input, isRTL && headerStyles.rtlInput]}
        placeholder={placeholder}
        placeholderTextColor={LIGHT_GRAY}
        textAlign={isRTL ? 'right' : 'left'}
        value={value}
        onChangeText={onChangeText}
        returnKeyType="search"
      />
      {value.length > 0 && (
        <Pressable
          onPress={() => onChangeText('')}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Clear search">
          <X size={18} color={LIGHT_GRAY} strokeWidth={2.25} />
        </Pressable>
      )}
    </View>
  </Animated.View>
);

const headerStyles = StyleSheet.create({
  container: {
    height: Platform.select({ ios: HEADER_HEIGHT, default: HEADER_HEIGHT + SPACING }),
    paddingTop: Platform.select({ ios: undefined, default: SPACING * 2 }),
    justifyContent: 'center',
    padding: SPACING,
  },
  inputWrap: {
    backgroundColor: Platform.select({
      ios: 'rgba(0, 0, 0, 0.5)',
      default: 'rgba(0, 0, 0, 0.3)',
    }),
    paddingHorizontal: SPACING,
    height: INPUT_HEIGHT,
    borderRadius: INPUT_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  inputWrapRTL: { flexDirection: 'row-reverse' },
  input: {
    flex: 1,
    fontSize: 16,
    height: INPUT_HEIGHT,
    color: 'white',
    padding: 0,
  },
  rtlInput: {
    writingDirection: 'rtl',
  } as TextStyle,
});

// ─── Pill button ──────────────────────────────────────────────────────────────
interface SheetButtonProps extends PressableProps {
  text: string;
  hint?: string;
  loading?: boolean;
  variant?: 'primary' | 'secondary';
  icon?: LucideIcon;
  isRTL?: boolean;
}

const SheetButton = ({
  text,
  hint,
  loading,
  style,
  variant = 'primary',
  icon: Icon,
  isRTL = false,
  ...rest
}: SheetButtonProps) => (
  <Pressable
    style={(state) => [
      btnStyles.button,
      variant === 'secondary' && btnStyles.secondary,
      state.pressed && btnStyles.pressed,
      typeof style === 'function' ? style(state) : style,
    ]}
    {...rest}>
    <View style={[btnStyles.content, isRTL && btnStyles.contentRTL]}>
      {Icon && (
        <Icon size={18} color={variant === 'secondary' ? LIGHT_GRAY : '#fff'} strokeWidth={2.25} />
      )}
      <Text style={[btnStyles.text, variant === 'secondary' && btnStyles.secondaryText]}>
        {text}
      </Text>
    </View>
    {hint && <Text style={btnStyles.hint}>{hint}</Text>}
    {loading && <ActivityIndicator style={btnStyles.loader} size="small" color="#fff" />}
  </Pressable>
);

const btnStyles = StyleSheet.create({
  button: {
    height: BUTTON_HEIGHT,
    padding: SPACING,
    borderRadius: BUTTON_HEIGHT,
    backgroundColor: DARK_BLUE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  contentRTL: { flexDirection: 'row-reverse' },
  secondary: { backgroundColor: 'rgba(255,255,255,0.12)' },
  pressed: { opacity: 0.8 },
  text: { color: '#fff' },
  secondaryText: { color: LIGHT_GRAY },
  hint: { fontSize: 10, color: 'rgba(255, 255, 255, 0.5)' },
  loader: { position: 'absolute', right: SPACING },
});

// ─── Category header ──────────────────────────────────────────────────────────
const CategoryHeader = React.memo(function CategoryHeader({
  label,
  icon: Icon,
  color,
}: {
  label: string;
  icon: LucideIcon;
  color: string;
}) {
  return (
    <View style={catStyles.header}>
      <Icon size={13} color={color} strokeWidth={2.5} />
      <Text style={[catStyles.label, { color }]}>{label}</Text>
    </View>
  );
});

const catStyles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 2,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255,255,255,0.08)',
    marginBottom: 2,
  },
  label: { fontSize: 11, fontWeight: '600', letterSpacing: 0.5, textTransform: 'uppercase' },
});

// ─── Metro station row ────────────────────────────────────────────────────────
const MetroRow = React.memo(function MetroRow({
  station,
  isRTL,
  onPress,
}: {
  station: Station;
  isRTL: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [rowStyles.row, pressed && rowStyles.pressed]}>
      <View style={[rowStyles.inner, isRTL && rowStyles.innerRTL]}>
        <View
          style={[
            rowStyles.dot,
            { backgroundColor: station.lineColor },
            !station.isActive && rowStyles.dotInactive,
          ]}
        />
        <View style={[rowStyles.textWrap, isRTL && rowStyles.textWrapRTL]}>
          <Text style={rowStyles.name} numberOfLines={1}>
            {isRTL ? station.name.fa : station.name.en}
          </Text>
          <Text style={rowStyles.sub} numberOfLines={1}>
            {station.line}
          </Text>
        </View>
      </View>
    </Pressable>
  );
});

// ─── Bus stop row ─────────────────────────────────────────────────────────────
const BusRow = React.memo(function BusRow({
  stop,
  isRTL,
  onPress,
}: {
  stop: BusStop;
  isRTL: boolean;
  onPress: () => void;
}) {
  const dotColor = stop.isBRT ? '#f97316' : '#64748b';
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [rowStyles.row, pressed && rowStyles.pressed]}>
      <View style={[rowStyles.inner, isRTL && rowStyles.innerRTL]}>
        <View style={[rowStyles.dot, { backgroundColor: dotColor }]} />
        <View style={[rowStyles.textWrap, isRTL && rowStyles.textWrapRTL]}>
          <Text style={rowStyles.name} numberOfLines={1}>
            {stop.name}
          </Text>
          {stop.lines ? (
            <Text style={rowStyles.sub} numberOfLines={1}>
              {stop.isBRT ? stop.brtLine : stop.lines}
            </Text>
          ) : null}
        </View>
      </View>
    </Pressable>
  );
});

const rowStyles = StyleSheet.create({
  row: {
    height: ROW_HEIGHT,
    justifyContent: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255,255,255,0.07)',
  },
  pressed: { opacity: 0.6 },
  inner: { flexDirection: 'row', alignItems: 'center', gap: GAP },
  innerRTL: { flexDirection: 'row-reverse' },
  dot: { width: 11, height: 11, borderRadius: 6, flexShrink: 0 },
  dotInactive: { opacity: 0.45 },
  textWrap: { flex: 1 },
  textWrapRTL: { alignItems: 'flex-end' },
  name: { color: '#fff', fontSize: 14, fontWeight: '500' },
  sub: { color: GRAY, fontSize: 12, marginTop: 1 },
});

// ─── Route info bar ───────────────────────────────────────────────────────────
const RouteInfoBar = React.memo(function RouteInfoBar({
  distance,
  duration,
  distanceLabel,
  durationLabel,
  isRTL,
}: {
  distance: number;
  duration: number;
  distanceLabel: string;
  durationLabel: string;
  isRTL: boolean;
}) {
  return (
    <View style={[routeStyles.bar, isRTL && routeStyles.barRTL]}>
      <View style={routeStyles.cell}>
        <Text style={routeStyles.label}>{distanceLabel}</Text>
        <Text style={routeStyles.value}>{distance.toFixed(1)} km</Text>
      </View>
      <View style={routeStyles.divider} />
      <View style={routeStyles.cell}>
        <Text style={routeStyles.label}>{durationLabel}</Text>
        <Text style={routeStyles.value}>{Math.round(duration)} min</Text>
      </View>
    </View>
  );
});

const routeStyles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: SPACING,
    paddingVertical: SPACING * 0.75,
    paddingHorizontal: SPACING,
  },
  barRTL: { flexDirection: 'row-reverse' },
  cell: { flex: 1, alignItems: 'center' },
  divider: { width: StyleSheet.hairlineWidth, backgroundColor: 'rgba(255,255,255,0.2)' },
  label: { color: GRAY, fontSize: 11, marginBottom: 4 },
  value: { color: '#fff', fontSize: 16, fontWeight: '600' },
});

// ─── Station detail ───────────────────────────────────────────────────────────
const StationDetail = React.memo(function StationDetail({
  station,
  isRTL,
  sheetRef,
}: {
  station: Station;
  isRTL: boolean;
  sheetRef: React.RefObject<TrueSheet | null>;
}) {
  const { t } = useI18n();
  const {
    route,
    routeDistance,
    routeDuration,
    routeLoading,
    userLocation,
    fetchRoute,
    clearRoute,
    selectStation,
  } = useStations();

  const handleDirections = async () => {
    await fetchRoute();
    sheetRef.current?.resize(1);
  };

  const handleOpenMaps = () => {
    const [lng, lat] = station.coordinates;
    openMapsDirections(lat, lng, isRTL ? station.name.fa : station.name.en);
  };

  const handleClose = () => {
    clearRoute();
    selectStation(null);
    sheetRef.current?.resize(0);
  };

  return (
    <View style={{ gap: GAP }}>
      <View style={[detailStyles.header, isRTL && detailStyles.headerRTL]}>
        <View
          style={[
            detailStyles.dot,
            { backgroundColor: station.lineColor },
            !station.isActive && detailStyles.dotInactive,
          ]}
        />
        <View style={[detailStyles.textWrap, isRTL && detailStyles.textWrapRTL]}>
          <Text style={detailStyles.name}>{isRTL ? station.name.fa : station.name.en}</Text>
          <Text style={detailStyles.line}>{station.line}</Text>
        </View>
      </View>

      {route && routeDistance != null && routeDuration != null && (
        <RouteInfoBar
          distance={routeDistance}
          duration={routeDuration}
          distanceLabel={t.distance}
          durationLabel={t.duration}
          isRTL={isRTL}
        />
      )}

      {!route && (
        <>
          <SheetButton
            text={t.getDirections}
            icon={Navigation2}
            isRTL={isRTL}
            loading={routeLoading}
            disabled={!userLocation || routeLoading}
            onPress={handleDirections}
            hint={!userLocation ? t.locateYourselfFirst : undefined}
          />
          <SheetButton
            text={t.openInMaps}
            icon={ExternalLink}
            isRTL={isRTL}
            variant="secondary"
            onPress={handleOpenMaps}
          />
        </>
      )}

      {route && (
        <SheetButton
          text={t.clearRoute}
          icon={RouteOff}
          isRTL={isRTL}
          variant="secondary"
          onPress={clearRoute}
        />
      )}

      <SheetButton
        text={t.backToList}
        icon={isRTL ? ArrowRight : ArrowLeft}
        isRTL={isRTL}
        variant="secondary"
        onPress={handleClose}
      />
    </View>
  );
});

const detailStyles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: GAP, marginBottom: SPACING / 2 },
  headerRTL: { flexDirection: 'row-reverse' },
  dot: { width: 18, height: 18, borderRadius: 9, flexShrink: 0 },
  dotInactive: { opacity: 0.55 },
  textWrap: { flex: 1 },
  textWrapRTL: { alignItems: 'flex-end' },
  name: { color: '#fff', fontSize: 18, fontWeight: '600' },
  line: { color: GRAY, fontSize: 13, marginTop: 2 },
  dotMedium: { width: 14, height: 14, borderRadius: 7, flexShrink: 0 },
  dotSmall: { width: 10, height: 10, borderRadius: 5, flexShrink: 0 },
  infoBlock: { gap: 6, marginBottom: SPACING / 2 },
  infoRow: { gap: 2 },
  infoLabel: { color: GRAY, fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.4 },
  infoValue: { color: '#fff', fontSize: 13, lineHeight: 18 },
  badge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(249,115,22,0.2)',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  badgeText: { color: '#fb923c', fontSize: 11, fontWeight: '600' },
});

const InfoRow = React.memo(function InfoRow({
  label,
  value,
  isRTL,
}: {
  label: string;
  value: string;
  isRTL: boolean;
}) {
  if (!value.trim()) return null;
  return (
    <View style={[detailStyles.infoRow, isRTL && detailStyles.textWrapRTL]}>
      <Text style={detailStyles.infoLabel}>{label}</Text>
      <Text style={detailStyles.infoValue}>{value}</Text>
    </View>
  );
});

// ─── Bus stop detail ──────────────────────────────────────────────────────────
const BusStopDetail = React.memo(function BusStopDetail({
  stop,
  isBRT,
  isRTL,
  sheetRef,
}: {
  stop: BusStop;
  isBRT: boolean;
  isRTL: boolean;
  sheetRef: React.RefObject<TrueSheet | null>;
}) {
  const { t } = useI18n();
  const {
    route,
    routeDistance,
    routeDuration,
    routeLoading,
    userLocation,
    fetchRoute,
    clearRoute,
    selectItem,
  } = useStations();

  const displayName =
    isRTL || !stop.latinName ? stop.name : stop.latinName;
  const dotColor = isBRT ? '#f97316' : '#64748b';
  const dotStyle = isBRT ? detailStyles.dotMedium : detailStyles.dotSmall;

  const handleDirections = async () => {
    await fetchRoute();
    sheetRef.current?.resize(1);
  };

  const handleOpenMaps = () => {
    const [lng, lat] = stop.coordinate;
    openMapsDirections(lat, lng, displayName);
  };

  const handleClose = () => {
    clearRoute();
    selectItem(null);
    sheetRef.current?.resize(0);
  };

  return (
    <View style={{ gap: GAP }}>
      <View style={[detailStyles.header, isRTL && detailStyles.headerRTL]}>
        <View style={[dotStyle, { backgroundColor: dotColor }]} />
        <View style={[detailStyles.textWrap, isRTL && detailStyles.textWrapRTL]}>
          <Text style={detailStyles.name}>{displayName}</Text>
          <Text style={detailStyles.line}>
            {isBRT ? t.brtStops : t.busStops}
          </Text>
        </View>
      </View>

      <View style={detailStyles.infoBlock}>
        {isBRT && stop.brtLine ? (
          <View style={[detailStyles.badge, isRTL && { alignSelf: 'flex-end' }]}>
            <Text style={detailStyles.badgeText}>{stop.brtLine}</Text>
          </View>
        ) : null}
        <InfoRow label={t.busLines} value={stop.lines} isRTL={isRTL} />
        <InfoRow label={t.direction} value={stop.direction} isRTL={isRTL} />
        <InfoRow label={t.stationCode} value={stop.stationCode} isRTL={isRTL} />
        <InfoRow label={t.address} value={stop.address} isRTL={isRTL} />
      </View>

      {route && routeDistance != null && routeDuration != null && (
        <RouteInfoBar
          distance={routeDistance}
          duration={routeDuration}
          distanceLabel={t.distance}
          durationLabel={t.duration}
          isRTL={isRTL}
        />
      )}

      {!route && (
        <>
          <SheetButton
            text={t.getDirections}
            icon={Navigation2}
            isRTL={isRTL}
            loading={routeLoading}
            disabled={!userLocation || routeLoading}
            onPress={handleDirections}
            hint={!userLocation ? t.locateYourselfFirst : undefined}
          />
          <SheetButton
            text={t.openInMaps}
            icon={ExternalLink}
            isRTL={isRTL}
            variant="secondary"
            onPress={handleOpenMaps}
          />
        </>
      )}

      {route && (
        <SheetButton
          text={t.clearRoute}
          icon={RouteOff}
          isRTL={isRTL}
          variant="secondary"
          onPress={clearRoute}
        />
      )}

      <SheetButton
        text={t.backToList}
        icon={isRTL ? ArrowRight : ArrowLeft}
        isRTL={isRTL}
        variant="secondary"
        onPress={handleClose}
      />
    </View>
  );
});

// ─── Search results (categorised) ────────────────────────────────────────────
type ListItem =
  | { kind: 'metro'; station: Station }
  | { kind: 'brt'; stop: BusStop }
  | { kind: 'bus'; stop: BusStop };

type Section = SectionListData<ListItem, { title: string; icon: LucideIcon; color: string }>;

const DEBOUNCE_MS = 300;

// ─── Inner ────────────────────────────────────────────────────────────────────
const SheetSectionInner = () => {
  const { height } = useWindowDimensions();
  const { animatedPosition } = useReanimatedTrueSheet();
  const sheetRef = React.useRef<TrueSheet>(null);
  const [currentDetent, setCurrentDetent] = React.useState(0);
  const { t, isRTL } = useI18n();
  const { isVisible } = useMapLayers();
  const { filteredStations, selected, selectItem, searchQuery, setSearchQuery } = useStations();

  // ── Debounced query ──────────────────────────────────────────────────────────
  const [debouncedQuery, setDebouncedQuery] = React.useState('');
  const [isSearching, setIsSearching] = React.useState(false);
  const debounceRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleSearchChange = React.useCallback(
    (text: string) => {
      setSearchQuery(text);
      if (debounceRef.current) clearTimeout(debounceRef.current);
      if (text.trim().length > 0) {
        setIsSearching(true);
        debounceRef.current = setTimeout(() => {
          setDebouncedQuery(text);
          setIsSearching(false);
        }, DEBOUNCE_MS);
      } else {
        setDebouncedQuery('');
        setIsSearching(false);
      }
    },
    [setSearchQuery]
  );

  // ── Bus stop search results ──────────────────────────────────────────────────
  const busResults = React.useMemo(
    () => (debouncedQuery.length >= 2 ? searchBusStops(debouncedQuery) : { brt: [], bus: [] }),
    [debouncedQuery]
  );

  // ── Section data ─────────────────────────────────────────────────────────────
  const hasQuery = debouncedQuery.trim().length > 0 || isSearching;

  const metroItems = React.useMemo(
    (): ListItem[] => filteredStations.map((s) => ({ kind: 'metro', station: s })),
    [filteredStations]
  );

  const brtItems = React.useMemo(
    (): ListItem[] => busResults.brt.map((s) => ({ kind: 'brt', stop: s })),
    [busResults.brt]
  );

  const busItems = React.useMemo(
    (): ListItem[] => busResults.bus.map((s) => ({ kind: 'bus', stop: s })),
    [busResults.bus]
  );

  const sections = React.useMemo((): Section[] => {
    const result: Section[] = [];
    if (isVisible('metro') && metroItems.length > 0)
      result.push({ title: t.metroStations, icon: TrainFront, color: '#60a5fa', data: metroItems });
    if (isVisible('brt') && brtItems.length > 0)
      result.push({ title: t.brtStops, icon: Bus, color: '#fb923c', data: brtItems });
    if (isVisible('bus') && busItems.length > 0)
      result.push({ title: t.busStops, icon: Bus, color: '#94a3b8', data: busItems });
    return result;
  }, [metroItems, brtItems, busItems, t, isVisible]);

  // ── Sheet expand / collapse ──────────────────────────────────────────────────
  const minHeight = HEADER_HEIGHT + Platform.select({ ios: 0, default: SPACING })!;

  React.useEffect(() => {
    if (selected && currentDetent === 0) {
      sheetRef.current?.resize(1);
    }
  }, [selected, currentDetent]);

  // ── Floating close button ────────────────────────────────────────────────────
  const floatingOpacity = useSharedValue(currentDetent === 1 ? 1 : 0);
  React.useEffect(() => {
    floatingOpacity.value = withTiming(currentDetent === 1 ? 1 : 0, {
      duration: 280,
      easing: Easing.out(Easing.cubic),
    });
  }, [currentDetent, floatingOpacity]);

  const floatingStyle = useAnimatedStyle(() => {
    const translateY = Math.min(-HEADER_HEIGHT, -(height - animatedPosition.value));
    return { opacity: floatingOpacity.value, transform: [{ translateY }] };
  });

  const handleStationPress = React.useCallback(
    (station: Station) => selectItem({ kind: 'metro', station }, { flyTo: true }),
    [selectItem]
  );

  const handleBusStopPress = React.useCallback(
    (stop: BusStop, kind: 'brt' | 'bus') => selectItem({ kind, stop }, { flyTo: true }),
    [selectItem]
  );

  const handleSheetClose = React.useCallback(() => {
    selectItem(null);
    sheetRef.current?.resize(0);
  }, [selectItem]);

  // ── Renderers ────────────────────────────────────────────────────────────────
  const renderSectionHeader = React.useCallback(
    ({ section }: { section: Section }) => (
      <CategoryHeader label={section.title} icon={section.icon} color={section.color} />
    ),
    []
  );

  const renderItem = React.useCallback(
    ({ item }: { item: ListItem }) => {
      if (item.kind === 'metro') {
        return (
          <MetroRow
            station={item.station}
            isRTL={isRTL}
            onPress={() => handleStationPress(item.station)}
          />
        );
      }
      if (item.kind === 'brt' || item.kind === 'bus') {
        return (
          <BusRow
            stop={item.stop}
            isRTL={isRTL}
            onPress={() => handleBusStopPress(item.stop, item.kind)}
          />
        );
      }
      return null;
    },
    [isRTL, handleStationPress, handleBusStopPress]
  );

  const keyExtractor = React.useCallback(
    (item: ListItem) =>
      item.kind === 'metro' ? `metro-${item.station.id}` : `${item.kind}-${item.stop.id}`,
    []
  );

  const contentStyle = [styles.content, isRTL && { direction: 'rtl' as const }];

  const showStationList = !selected && !isSearching && !(sections.length === 0 && hasQuery);

  return (
    <>
      <ReanimatedTrueSheet
        name="main"
        ref={sheetRef}
        detents={[minHeight / height, 0.5, 1]}
        initialDetentIndex={0}
        dimmed={false}
        dismissible={false}
        scrollable={showStationList}
        scrollableOptions={{ scrollingExpandsSheet: true }}
        style={contentStyle}
        detached
        backgroundColor={DARK}
        onDetentChange={(e) => setCurrentDetent(e.nativeEvent.index)}
        header={
          <SheetHeader
            placeholder={t.search}
            isRTL={isRTL}
            value={searchQuery}
            onChangeText={handleSearchChange}
          />
        }>
        {selected?.kind === 'metro' ? (
          <StationDetail station={selected.station} isRTL={isRTL} sheetRef={sheetRef} />
        ) : selected?.kind === 'brt' || selected?.kind === 'bus' ? (
          <BusStopDetail
            stop={selected.stop}
            isBRT={selected.kind === 'brt'}
            isRTL={isRTL}
            sheetRef={sheetRef}
          />
        ) : isSearching ? (
          <View style={styles.centered}>
            <ActivityIndicator size="small" color={GRAY} />
          </View>
        ) : sections.length === 0 && hasQuery ? (
          <View style={styles.centered}>
            <Text style={styles.emptyText}>{t.noResults}</Text>
          </View>
        ) : (
          <SectionList
            sections={sections}
            keyExtractor={keyExtractor}
            renderItem={renderItem}
            renderSectionHeader={renderSectionHeader}
            keyboardShouldPersistTaps="handled"
            initialNumToRender={12}
            maxToRenderPerBatch={10}
            windowSize={7}
            updateCellsBatchingPeriod={50}
            removeClippedSubviews={Platform.OS === 'android'}
            nestedScrollEnabled
            stickySectionHeadersEnabled={false}
            showsVerticalScrollIndicator={false}
            extraData={isRTL}
            style={styles.list}
            contentContainerStyle={styles.listContent}
          />
        )}
      </ReanimatedTrueSheet>

      <Animated.View
        pointerEvents={currentDetent === 1 ? 'box-none' : 'none'}
        style={[styles.floatingBtnHost, floatingStyle]}
        collapsable={false}>
        <Pressable
          disabled={currentDetent !== 1}
          style={({ pressed }) => [styles.floatingBtn, pressed && styles.floatingBtnPressed]}
          onPress={handleSheetClose}
          accessibilityRole="button"
          accessibilityLabel="Close sheet"
          hitSlop={8}>
          <View style={styles.floatingBtnContent}>
            <XIcon size={20} color="white" />
          </View>
        </Pressable>
      </Animated.View>
    </>
  );
};

// ─── Public export ────────────────────────────────────────────────────────────
export function SheetSection() {
  return (
    <TrueSheetProvider>
      <ReanimatedTrueSheetProvider>
        <SheetSectionInner />
      </ReanimatedTrueSheetProvider>
    </TrueSheetProvider>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  floatingBtnHost: {
    ...StyleSheet.absoluteFill,
    zIndex: 10,
    elevation: 10,
  },
  floatingBtn: {
    position: 'absolute',
    right: SPACING,
    bottom: SPACING,
    height: SPACING * 3,
    width: SPACING * 3,
    borderRadius: (SPACING * 3) / 2,
    backgroundColor: Platform.select({ ios: 'rgba(0, 0, 0, 0.3)', default: DARK }),
    borderColor: 'rgba(255, 255, 255, 0.3)',
    borderWidth: Platform.select({ ios: StyleSheet.hairlineWidth, default: 0 }),
    elevation: 8,
  },
  floatingBtnPressed: { opacity: 0.6 },
  floatingBtnContent: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: { padding: SPACING, gap: GAP },
  list: { flex: 1 },
  listContent: { paddingBottom: SPACING },
  centered: { paddingVertical: SPACING, alignItems: 'center' },
  emptyText: { color: GRAY, fontSize: 14 },
  inputWrapRTL: {
    flexDirection: 'row-reverse',
  },
});
