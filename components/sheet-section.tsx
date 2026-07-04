import { Input } from '@/components/ui/input';
import { Button, type ButtonProps } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Text as UiText } from '@/components/ui/text';
import { cn } from '@/lib/utils';
import { type TrueSheet, TrueSheetProvider } from '@lodev09/react-native-true-sheet';
import {
  ReanimatedTrueSheet,
  ReanimatedTrueSheetProvider,
  useReanimatedTrueSheet,
} from '@lodev09/react-native-true-sheet/reanimated';
import { useCity } from '@/lib/city-context';
import { useI18n } from '@/lib/i18n';
import { useMapLayers } from '@/lib/map-layers-context';
import { openMapsDirections } from '@/lib/maps';
import { useStations } from '@/lib/stations-context';
import type { Station } from '@/lib/stations';
import { type BusStop, listBrtStops, searchBusStops } from '@/lib/bus-stops';
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
const HEADER_HEIGHT = SPACING * 5;
const ROW_HEIGHT = 52;

const DARK = '#282e37';
const GRAY = '#b2bac8';
const LIGHT_GRAY = '#ebedf1';

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

// ─── Detail action button ─────────────────────────────────────────────────────
type DetailActionButtonProps = Omit<ButtonProps, 'children'> & {
  label: string;
  icon?: LucideIcon;
  hint?: string;
  isRTL?: boolean;
  loading?: boolean;
  tone?: 'primary' | 'secondary';
};

function DetailActionButton({
  label,
  icon,
  hint,
  isRTL,
  loading,
  tone = 'primary',
  className,
  ...props
}: DetailActionButtonProps) {
  return (
    <View className="gap-1">
      <Button
        variant={tone === 'secondary' ? 'outline' : 'default'}
        className={cn('h-12 w-full rounded-full', isRTL && 'flex-row-reverse', className)}
        {...props}>
        {loading ? (
          <ActivityIndicator size="small" color={tone === 'secondary' ? GRAY : '#ffffff'} />
        ) : icon ? (
          <Icon as={icon} className="size-[18px]" />
        ) : null}
        <UiText>{label}</UiText>
      </Button>
      {hint ? (
        <UiText variant="muted" className="text-center text-xs">
          {hint}
        </UiText>
      ) : null}
    </View>
  );
}

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

const TYPE_META = {
  metro: { Icon: TrainFront, color: '#60a5fa' },
  brt: { Icon: Bus, color: '#fb923c' },
  bus: { Icon: Bus, color: '#94a3b8' },
} as const;

type RowTypeKind = keyof typeof TYPE_META;

// ─── Station list row ─────────────────────────────────────────────────────────
const StationListRow = React.memo(function StationListRow({
  name,
  detail,
  cityLabel,
  typeLabel,
  typeKind,
  dotColor,
  dotInactive,
  isRTL,
  onPress,
}: {
  name: string;
  detail?: string;
  cityLabel: string;
  typeLabel: string;
  typeKind: RowTypeKind;
  dotColor: string;
  dotInactive?: boolean;
  isRTL: boolean;
  onPress: () => void;
}) {
  const { Icon, color: typeColor } = TYPE_META[typeKind];

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [rowStyles.row, pressed && rowStyles.pressed]}>
      <View style={[rowStyles.inner, isRTL && rowStyles.innerRTL]}>
        <View
          style={[rowStyles.dot, { backgroundColor: dotColor }, dotInactive && rowStyles.dotInactive]}
        />
        <View style={[rowStyles.main, isRTL && rowStyles.mainRTL]}>
          <Text style={rowStyles.name} numberOfLines={1}>
            {name}
          </Text>
          {detail ? (
            <Text style={rowStyles.sub} numberOfLines={1}>
              {detail}
            </Text>
          ) : null}
        </View>
        <View style={[rowStyles.trailing, isRTL && rowStyles.trailingRTL]}>
          <View style={[rowStyles.typeRow, isRTL && rowStyles.typeRowRTL]}>
            <Icon size={12} color={typeColor} strokeWidth={2.5} />
            <Text style={[rowStyles.type, { color: typeColor }]} numberOfLines={1}>
              {typeLabel}
            </Text>
          </View>
          <Text style={rowStyles.city} numberOfLines={1}>
            {cityLabel}
          </Text>
        </View>
      </View>
    </Pressable>
  );
});

// ─── Metro station row ────────────────────────────────────────────────────────
const MetroRow = React.memo(function MetroRow({
  station,
  cityLabel,
  typeLabel,
  isRTL,
  onPress,
}: {
  station: Station;
  cityLabel: string;
  typeLabel: string;
  isRTL: boolean;
  onPress: () => void;
}) {
  return (
    <StationListRow
      name={isRTL ? station.name.fa : station.name.en}
      detail={station.line}
      cityLabel={cityLabel}
      typeLabel={typeLabel}
      typeKind="metro"
      dotColor={station.lineColor}
      dotInactive={!station.isActive}
      isRTL={isRTL}
      onPress={onPress}
    />
  );
});

// ─── Bus stop row ─────────────────────────────────────────────────────────────
const BusRow = React.memo(function BusRow({
  stop,
  cityLabel,
  typeLabel,
  typeKind,
  isRTL,
  onPress,
}: {
  stop: BusStop;
  cityLabel: string;
  typeLabel: string;
  typeKind: 'brt' | 'bus';
  isRTL: boolean;
  onPress: () => void;
}) {
  const name = isRTL || !stop.latinName ? stop.name : stop.latinName;
  const detail = stop.isBRT ? stop.brtLine : stop.lines;
  const dotColor = stop.isBRT ? '#f97316' : '#64748b';

  return (
    <StationListRow
      name={name}
      detail={detail || undefined}
      cityLabel={cityLabel}
      typeLabel={typeLabel}
      typeKind={typeKind}
      dotColor={dotColor}
      isRTL={isRTL}
      onPress={onPress}
    />
  );
});

// ─── Empty list fallback ──────────────────────────────────────────────────────
const ListEmptyFallback = React.memo(function ListEmptyFallback({
  isRTL,
  title,
  hint,
}: {
  isRTL: boolean;
  title: string;
  hint: string;
}) {
  return (
    <View style={[emptyStyles.wrap, isRTL && emptyStyles.wrapRTL]}>
      <Text style={emptyStyles.title}>{title}</Text>
      <Text style={emptyStyles.hint}>{hint}</Text>
    </View>
  );
});

const emptyStyles = StyleSheet.create({
  wrap: { paddingVertical: SPACING * 2, paddingHorizontal: SPACING, gap: 8 },
  wrapRTL: { alignItems: 'flex-end' },
  title: { color: '#fff', fontSize: 15, fontWeight: '600', textAlign: 'center' },
  hint: { color: GRAY, fontSize: 13, lineHeight: 20, textAlign: 'center' },
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
  main: { flex: 1, minWidth: 0 },
  mainRTL: { alignItems: 'flex-end' },
  name: { color: '#fff', fontSize: 14, fontWeight: '500' },
  sub: { color: GRAY, fontSize: 12, marginTop: 1 },
  trailing: { flexShrink: 0, alignItems: 'flex-end', gap: 2, maxWidth: '38%' },
  trailingRTL: { alignItems: 'flex-start' },
  typeRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  typeRowRTL: { flexDirection: 'row-reverse' },
  type: { fontSize: 11, fontWeight: '600' },
  city: { color: GRAY, fontSize: 11 },
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
  onBackToList,
}: {
  station: Station;
  isRTL: boolean;
  sheetRef: React.RefObject<TrueSheet | null>;
  onBackToList: () => void;
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
    locateUser,
  } = useStations();

  const handleDirections = async () => {
    await fetchRoute();
    sheetRef.current?.resize(1);
  };

  const handlePrimaryPress = async () => {
    if (!userLocation) {
      sheetRef.current?.resize(0);
      await locateUser();
      return;
    }
    await handleDirections();
  };

  const handleOpenMaps = () => {
    const [lng, lat] = station.coordinates;
    openMapsDirections(lat, lng, isRTL ? station.name.fa : station.name.en);
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
          <DetailActionButton
            label={t.getDirections}
            icon={Navigation2}
            isRTL={isRTL}
            loading={routeLoading}
            disabled={routeLoading}
            onPress={handlePrimaryPress}
            hint={!userLocation ? t.locateYourselfFirst : undefined}
          />
          <DetailActionButton
            label={t.openInMaps}
            icon={ExternalLink}
            isRTL={isRTL}
            tone="secondary"
            onPress={handleOpenMaps}
          />
        </>
      )}

      {route && (
        <DetailActionButton
          label={t.clearRoute}
          icon={RouteOff}
          isRTL={isRTL}
          tone="secondary"
          onPress={clearRoute}
        />
      )}

      <DetailActionButton
        label={t.backToList}
        icon={isRTL ? ArrowRight : ArrowLeft}
        isRTL={isRTL}
        tone="secondary"
        onPress={onBackToList}
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
  onBackToList,
}: {
  stop: BusStop;
  isBRT: boolean;
  isRTL: boolean;
  sheetRef: React.RefObject<TrueSheet | null>;
  onBackToList: () => void;
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
    locateUser,
  } = useStations();

  const displayName =
    isRTL || !stop.latinName ? stop.name : stop.latinName;
  const dotColor = isBRT ? '#f97316' : '#64748b';
  const dotStyle = isBRT ? detailStyles.dotMedium : detailStyles.dotSmall;

  const handleDirections = async () => {
    await fetchRoute();
    sheetRef.current?.resize(1);
  };

  const handlePrimaryPress = async () => {
    if (!userLocation) {
      sheetRef.current?.resize(0);
      await locateUser();
      return;
    }
    await handleDirections();
  };

  const handleOpenMaps = () => {
    const [lng, lat] = stop.coordinate;
    openMapsDirections(lat, lng, displayName);
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
          <DetailActionButton
            label={t.getDirections}
            icon={Navigation2}
            isRTL={isRTL}
            loading={routeLoading}
            disabled={routeLoading}
            onPress={handlePrimaryPress}
            hint={!userLocation ? t.locateYourselfFirst : undefined}
          />
          <DetailActionButton
            label={t.openInMaps}
            icon={ExternalLink}
            isRTL={isRTL}
            tone="secondary"
            onPress={handleOpenMaps}
          />
        </>
      )}

      {route && (
        <DetailActionButton
          label={t.clearRoute}
          icon={RouteOff}
          isRTL={isRTL}
          tone="secondary"
          onPress={clearRoute}
        />
      )}

      <DetailActionButton
        label={t.backToList}
        icon={isRTL ? ArrowRight : ArrowLeft}
        isRTL={isRTL}
        tone="secondary"
        onPress={onBackToList}
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
  const { city } = useCity();
  const { isSheetVisible, isSheetLoading } = useMapLayers();
  const { filteredStations, selected, selectItem, searchQuery, setSearchQuery } = useStations();

  const cityLabel = isRTL ? city.name.fa : city.name.en;

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

  const metroItems = React.useMemo((): ListItem[] => {
    if (!isSheetVisible('metro')) return [];
    return filteredStations.map((s) => ({ kind: 'metro', station: s }));
  }, [filteredStations, isSheetVisible]);

  const brtItems = React.useMemo((): ListItem[] => {
    if (!isSheetVisible('brt')) return [];
    return listBrtStops(searchQuery).map((s) => ({ kind: 'brt', stop: s }));
  }, [searchQuery, isSheetVisible]);

  const busItems = React.useMemo((): ListItem[] => {
    if (!isSheetVisible('bus')) return [];
    return busResults.bus.map((s) => ({ kind: 'bus', stop: s }));
  }, [busResults.bus, isSheetVisible]);

  const sections = React.useMemo((): Section[] => {
    const result: Section[] = [];
    if (isSheetVisible('metro') && metroItems.length > 0)
      result.push({ title: t.metroStations, icon: TrainFront, color: '#60a5fa', data: metroItems });
    if (isSheetVisible('brt') && brtItems.length > 0)
      result.push({ title: t.brtStops, icon: Bus, color: '#fb923c', data: brtItems });
    if (isSheetVisible('bus') && busItems.length > 0)
      result.push({ title: t.busStops, icon: Bus, color: '#94a3b8', data: busItems });
    return result;
  }, [metroItems, brtItems, busItems, t, isSheetVisible]);

  // ── Sheet expand / collapse ──────────────────────────────────────────────────
  const minHeight = HEADER_HEIGHT + Platform.select({ ios: 0, default: SPACING })!;

  const selectedKey = selected
    ? selected.kind === 'metro'
      ? `metro-${selected.station.id}`
      : `${selected.kind}-${selected.stop.id}`
    : null;

  // Expand only when the user picks a station — not when they collapse to peek (e.g. locate).
  React.useEffect(() => {
    if (selectedKey) {
      sheetRef.current?.resize(1);
    }
  }, [selectedKey]);

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

  const handleBackToList = React.useCallback(() => {
    selectItem(null);
    setSearchQuery('');
    setDebouncedQuery('');
    setIsSearching(false);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    sheetRef.current?.resize(1);
  }, [selectItem, setSearchQuery]);

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
            cityLabel={cityLabel}
            typeLabel={t.layerMetro}
            isRTL={isRTL}
            onPress={() => handleStationPress(item.station)}
          />
        );
      }
      if (item.kind === 'brt' || item.kind === 'bus') {
        return (
          <BusRow
            stop={item.stop}
            cityLabel={cityLabel}
            typeLabel={item.kind === 'brt' ? t.layerBrt : t.layerBus}
            typeKind={item.kind}
            isRTL={isRTL}
            onPress={() => handleBusStopPress(item.stop, item.kind)}
          />
        );
      }
      return null;
    },
    [isRTL, cityLabel, t.layerMetro, t.layerBrt, t.layerBus, handleStationPress, handleBusStopPress]
  );

  const keyExtractor = React.useCallback(
    (item: ListItem) =>
      item.kind === 'metro' ? `metro-${item.station.id}` : `${item.kind}-${item.stop.id}`,
    []
  );

  const contentStyle = [styles.content, isRTL && { direction: 'rtl' as const }];

  const showStationList =
    !selected && !isSearching && !isSheetLoading && sections.length > 0;

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
          <StationDetail
            station={selected.station}
            isRTL={isRTL}
            sheetRef={sheetRef}
            onBackToList={handleBackToList}
          />
        ) : selected?.kind === 'brt' || selected?.kind === 'bus' ? (
          <BusStopDetail
            stop={selected.stop}
            isBRT={selected.kind === 'brt'}
            isRTL={isRTL}
            sheetRef={sheetRef}
            onBackToList={handleBackToList}
          />
        ) : isSearching || isSheetLoading ? (
          <View style={styles.centered}>
            <ActivityIndicator size="small" color={GRAY} />
          </View>
        ) : sections.length === 0 ? (
          <ListEmptyFallback
            isRTL={isRTL}
            title={hasQuery ? t.noResults : t.emptyListTitle}
            hint={hasQuery ? t.noResultsHint : t.emptyListHint}
          />
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
