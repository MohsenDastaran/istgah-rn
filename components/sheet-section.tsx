import { Icon } from '@/components/ui/icon';
import { cn } from '@/lib/utils';
import { type TrueSheet, TrueSheetProvider } from '@lodev09/react-native-true-sheet';
import {
  ReanimatedTrueSheet,
  ReanimatedTrueSheetProvider,
  useReanimatedTrueSheet,
} from '@lodev09/react-native-true-sheet/reanimated';
import { useCity } from '@/lib/city-context';
import { useI18n, type Lang } from '@/lib/i18n';
import { useMapLayers } from '@/lib/map-layers-context';
import { sheetDetentFraction, useSheetDetent } from '@/lib/sheet-detent-context';
import { openMapsDirections } from '@/lib/maps';
import { useStations } from '@/lib/stations-context';
import type { Station } from '@/lib/stations';
import {
  type BusStop,
  formatBusFacilityValue,
  listBrtStops,
  searchBusStops,
} from '@/lib/bus-stops';
import {
  ArrowLeft,
  Bus,
  Car,
  ExternalLink,
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

const DARK = '#282e37';
const GRAY = '#b2bac8';
const LIGHT_GRAY = '#ebedf1';

function busStopDisplayName(stop: BusStop, lang: Lang): string {
  return lang === 'fa' || !stop.latinName ? stop.name : stop.latinName;
}

// ─── Sheet Header ─────────────────────────────────────────────────────────────
interface SheetHeaderProps {
  placeholder: string;
  clearLabel: string;
  onChangeText: (text: string) => void;
  value: string;
}

const SheetHeader = ({ placeholder, clearLabel, onChangeText, value }: SheetHeaderProps) => {
  const { isRTL } = useI18n();

  return (
    <Animated.View style={[headerStyles.container, isRTL && headerStyles.containerRTL]}>
      <View
        className="flex-row items-center gap-2 rounded-full px-4 rtl:flex-row-reverse"
        style={headerStyles.inputWrap}>
        <TextInput
          className="h-full min-h-0 flex-1 p-0 text-base text-white rtl:text-right"
          style={headerStyles.input}
          placeholder={placeholder}
          placeholderTextColor={LIGHT_GRAY}
          value={value}
          onChangeText={onChangeText}
          returnKeyType="search"
        />
        {value.length > 0 && (
          <Pressable
            onPress={() => onChangeText('')}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={clearLabel}>
            <X size={18} color={LIGHT_GRAY} strokeWidth={2.25} />
          </Pressable>
        )}
      </View>
    </Animated.View>
  );
};

const headerStyles = StyleSheet.create({
  container: {
    height: Platform.select({ ios: HEADER_HEIGHT, default: HEADER_HEIGHT + SPACING }),
    paddingTop: Platform.select({ ios: undefined, default: SPACING * 2 }),
    justifyContent: 'center',
    padding: SPACING,
  },
  containerRTL: { direction: 'rtl' },
  inputWrap: {
    backgroundColor: Platform.select({
      ios: 'rgba(0, 0, 0, 0.5)',
      default: 'rgba(0, 0, 0, 0.3)',
    }),
    height: INPUT_HEIGHT,
    borderRadius: INPUT_HEIGHT,
  },
  input: {
    fontSize: 16,
    height: INPUT_HEIGHT,
    color: 'white',
  },
});

// ─── Detail layout ────────────────────────────────────────────────────────────
function ToolbarDivider() {
  return <View className="w-px self-stretch bg-white/10" />;
}

function ToolbarTile({
  icon,
  label,
  hint,
  onPress,
  loading,
  disabled,
  accessibilityLabel,
}: {
  icon: LucideIcon;
  label: string;
  hint?: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  accessibilityLabel?: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? (hint ? `${label}, ${hint}` : label)}
      className={cn(
        'min-h-[52px] min-w-0 flex-1 items-center justify-center gap-0.5 px-2 py-2.5 active:bg-white/10',
        (disabled || loading) && 'opacity-50'
      )}>
      {loading ? (
        <ActivityIndicator size="small" color="#ffffff" />
      ) : (
        <Icon as={icon} className="size-[18px]" />
      )}
      <Text className="text-center text-xs leading-4 font-semibold text-white" numberOfLines={2}>
        {label}
      </Text>
      {hint ? (
        <Text className="text-center text-[10px] leading-3 text-[#b2bac8]" numberOfLines={1}>
          {hint}
        </Text>
      ) : null}
    </Pressable>
  );
}

const DetailToolbar = React.memo(function DetailToolbar({
  onBackToList,
  onOpenMaps,
  onPrimaryPress,
  onClearRoute,
  route,
  routeLoading,
}: {
  onBackToList: () => void;
  onOpenMaps: () => void;
  onPrimaryPress: () => void;
  onClearRoute: () => void;
  route: boolean;
  routeLoading: boolean;
}) {
  const { t, isRTL } = useI18n();

  return (
    <View className="gap-1.5">
      <Pressable
        onPress={onBackToList}
        accessibilityRole="button"
        accessibilityLabel={t.backToList}
        className="flex-row items-center gap-1.5 self-start rounded-lg px-2 py-1.5 active:bg-white/10">
        <Icon as={ArrowLeft} className={cn('size-4', isRTL && 'rotate-180')} />
        <Text className="text-xs text-[#b2bac8]">{t.backToList}</Text>
      </Pressable>

      <View className="overflow-hidden rounded-xl bg-white/5">
        <View className="flex-row items-stretch">
          {route ? (
            <ToolbarTile icon={RouteOff} label={t.clearRoute} onPress={onClearRoute} />
          ) : (
            <ToolbarTile
              icon={Car}
              label={t.driveThere}
              loading={routeLoading}
              disabled={routeLoading}
              onPress={onPrimaryPress}
              accessibilityLabel={`${t.driveThere}, ${t.drivingOnly}`}
            />
          )}
          <ToolbarDivider />
          <ToolbarTile icon={ExternalLink} label={t.openInMaps} onPress={onOpenMaps} />
        </View>
      </View>
    </View>
  );
});

function DetailHeader({
  title,
  subtitle,
  dotColor,
  dotSizeClass = 'size-[18px]',
  dotInactive,
}: {
  title: string;
  subtitle?: string;
  dotColor: string;
  dotSizeClass?: string;
  dotInactive?: boolean;
}) {
  return (
    <View className="flex-row items-center gap-2.5">
      <View
        className={cn('shrink-0 rounded-full', dotSizeClass, dotInactive && 'opacity-55')}
        style={{ backgroundColor: dotColor }}
      />
      <View className="min-w-0 flex-1">
        <Text className="text-base leading-5 font-semibold text-white" numberOfLines={2}>
          {title}
        </Text>
        {subtitle ? (
          <Text className="mt-0.5 text-xs text-[#b2bac8]" numberOfLines={2}>
            {subtitle}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

const InfoRow = React.memo(function InfoRow({ label, value }: { label: string; value: string }) {
  if (!value.trim()) return null;
  return (
    <View className="gap-0.5">
      <Text className="text-[10px] tracking-wide text-[#b2bac8] uppercase">{label}</Text>
      <Text className="text-[13px] leading-[18px] text-white">{value}</Text>
    </View>
  );
});

function BusAmenities({ stop, lang }: { stop: BusStop; lang: Lang }) {
  const { t } = useI18n();
  const fmt = (value: string) => formatBusFacilityValue(value, lang, t);

  const items = [
    { key: 'seat', label: t.seat, value: fmt(stop.seat) },
    { key: 'shelter', label: t.shelter, value: fmt(stop.shelter) },
    { key: 'light', label: t.light, value: fmt(stop.light) },
    { key: 'disabled', label: t.disabledAccess, value: fmt(stop.disabledAccess) },
  ].filter((item) => item.value);

  if (items.length === 0) return null;

  return (
    <View className="gap-1.5">
      <Text className="text-[10px] font-semibold tracking-wide text-[#b2bac8] uppercase">
        {t.amenities}
      </Text>
      <View className="flex-row flex-wrap gap-1.5">
        {items.map((item) => (
          <View key={item.key} className="min-w-[47%] flex-1 rounded-lg bg-white/6 px-2.5 py-1.5">
            <Text className="text-[10px] text-[#b2bac8]">{item.label}</Text>
            <Text className="text-xs font-medium text-white">{item.value}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

// ─── Route info bar ───────────────────────────────────────────────────────────
const RouteInfoBar = React.memo(function RouteInfoBar({
  distance,
  duration,
  distanceLabel,
  durationLabel,
  kmUnit,
  minUnit,
}: {
  distance: number;
  duration: number;
  distanceLabel: string;
  durationLabel: string;
  kmUnit: string;
  minUnit: string;
}) {
  return (
    <View className="mb-1 flex-row items-center justify-center gap-3 rounded-xl bg-white/10 px-3 py-2">
      <View className="items-center">
        <Text className="text-[10px] text-[#b2bac8]">{distanceLabel}</Text>
        <Text className="text-sm font-semibold text-white">
          {distance.toFixed(1)} {kmUnit}
        </Text>
      </View>
      <View className="h-6 w-px bg-white/20" />
      <View className="items-center">
        <Text className="text-[10px] text-[#b2bac8]">{durationLabel}</Text>
        <Text className="text-sm font-semibold text-white">
          {Math.round(duration)} {minUnit}
        </Text>
      </View>
    </View>
  );
});

// ─── Category header ──────────────────────────────────────────────────────────
const CategoryHeader = React.memo(function CategoryHeader({
  label,
  icon: IconComp,
  color,
}: {
  label: string;
  icon: LucideIcon;
  color: string;
}) {
  return (
    <View className="mb-0.5 flex-row items-center gap-1.5 border-b border-white/10 px-0.5 py-2 rtl:flex-row-reverse">
      <IconComp size={13} color={color} strokeWidth={2.5} />
      <Text className="text-[11px] font-semibold tracking-wide uppercase" style={{ color }}>
        {label}
      </Text>
    </View>
  );
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
  onPress,
}: {
  name: string;
  detail?: string;
  cityLabel: string;
  typeLabel: string;
  typeKind: RowTypeKind;
  dotColor: string;
  dotInactive?: boolean;
  onPress: () => void;
}) {
  const { Icon: TypeIcon, color: typeColor } = TYPE_META[typeKind];

  return (
    <Pressable
      onPress={onPress}
      className="h-[52px] justify-center border-b border-white/10 active:opacity-60">
      <View className="flex-row items-center gap-3 rtl:flex-row-reverse">
        <View
          className={cn('size-[11px] shrink-0 rounded-full', dotInactive && 'opacity-45')}
          style={{ backgroundColor: dotColor }}
        />
        <View className="min-w-0 flex-1 rtl:items-end">
          <Text className="text-sm font-medium text-white" numberOfLines={1}>
            {name}
          </Text>
          {detail ? (
            <Text className="mt-px text-xs text-[#b2bac8]" numberOfLines={1}>
              {detail}
            </Text>
          ) : null}
        </View>
        <View className="max-w-[38%] shrink-0 items-end gap-0.5 rtl:items-start">
          <View className="flex-row items-center gap-1 rtl:flex-row-reverse">
            <TypeIcon size={12} color={typeColor} strokeWidth={2.5} />
            <Text
              className="text-[11px] font-semibold"
              style={{ color: typeColor }}
              numberOfLines={1}>
              {typeLabel}
            </Text>
          </View>
          <Text className="text-[11px] text-[#b2bac8]" numberOfLines={1}>
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
  lang,
  onPress,
}: {
  station: Station;
  cityLabel: string;
  typeLabel: string;
  lang: Lang;
  onPress: () => void;
}) {
  return (
    <StationListRow
      name={station.name[lang]}
      detail={station.line}
      cityLabel={cityLabel}
      typeLabel={typeLabel}
      typeKind="metro"
      dotColor={station.lineColor}
      dotInactive={!station.isActive}
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
  lang,
  onPress,
}: {
  stop: BusStop;
  cityLabel: string;
  typeLabel: string;
  typeKind: 'brt' | 'bus';
  lang: Lang;
  onPress: () => void;
}) {
  const name = busStopDisplayName(stop, lang);
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
      onPress={onPress}
    />
  );
});

// ─── Empty list fallback ──────────────────────────────────────────────────────
const ListEmptyFallback = React.memo(function ListEmptyFallback({
  title,
  hint,
}: {
  title: string;
  hint: string;
}) {
  return (
    <View className="gap-2 px-4 py-8">
      <Text className="text-center text-[15px] font-semibold text-white">{title}</Text>
      <Text className="text-center text-[13px] leading-5 text-[#b2bac8]">{hint}</Text>
    </View>
  );
});

// ─── Station detail ───────────────────────────────────────────────────────────
const StationDetail = React.memo(function StationDetail({
  station,
  lang,
  sheetRef,
  onBackToList,
}: {
  station: Station;
  lang: Lang;
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
    openMapsDirections(lat, lng, station.name[lang]);
  };

  return (
    <View className="gap-2.5">
      <DetailToolbar
        onBackToList={onBackToList}
        onOpenMaps={handleOpenMaps}
        onPrimaryPress={handlePrimaryPress}
        onClearRoute={clearRoute}
        route={!!route}
        routeLoading={routeLoading}
      />

      {!userLocation && !route ? (
        <Text className="text-center text-[11px] text-[#b2bac8]">{t.locateYourselfFirst}</Text>
      ) : null}

      {route && routeDistance != null && routeDuration != null ? (
        <RouteInfoBar
          distance={routeDistance}
          duration={routeDuration}
          distanceLabel={t.distance}
          durationLabel={t.duration}
          kmUnit={t.km}
          minUnit={t.min}
        />
      ) : null}

      <DetailHeader
        title={station.name[lang]}
        subtitle={station.line}
        dotColor={station.lineColor}
        dotInactive={!station.isActive}
      />
    </View>
  );
});

// ─── Bus stop detail ──────────────────────────────────────────────────────────
const BusStopDetail = React.memo(function BusStopDetail({
  stop,
  isBRT,
  lang,
  sheetRef,
  onBackToList,
}: {
  stop: BusStop;
  isBRT: boolean;
  lang: Lang;
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

  const displayName = busStopDisplayName(stop, lang);
  const dotColor = isBRT ? '#f97316' : '#64748b';
  const dotSizeClass = isBRT ? 'size-3.5' : 'size-2.5';
  const transportMode = formatBusFacilityValue(stop.transportMode, lang, t);

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
    <View className="gap-2.5">
      <DetailToolbar
        onBackToList={onBackToList}
        onOpenMaps={handleOpenMaps}
        onPrimaryPress={handlePrimaryPress}
        onClearRoute={clearRoute}
        route={!!route}
        routeLoading={routeLoading}
      />

      {!userLocation && !route ? (
        <Text className="text-center text-[11px] text-[#b2bac8]">{t.locateYourselfFirst}</Text>
      ) : null}

      {route && routeDistance != null && routeDuration != null ? (
        <RouteInfoBar
          distance={routeDistance}
          duration={routeDuration}
          distanceLabel={t.distance}
          durationLabel={t.duration}
          kmUnit={t.km}
          minUnit={t.min}
        />
      ) : null}

      <DetailHeader
        title={displayName}
        subtitle={isBRT ? t.brtStops : t.busStops}
        dotColor={dotColor}
        dotSizeClass={dotSizeClass}
      />

      {isBRT && stop.brtLine ? (
        <View className="self-start rounded-md bg-orange-500/20 px-2 py-0.5">
          <Text className="text-[11px] font-semibold text-orange-400">{stop.brtLine}</Text>
        </View>
      ) : null}

      <BusAmenities stop={stop} lang={lang} />

      <View className="gap-2 rounded-xl bg-white/5 p-2.5">
        <InfoRow label={t.busLines} value={stop.lines} />
        <InfoRow label={t.direction} value={stop.direction} />
        <InfoRow label={t.stationCode} value={stop.stationCode} />
        <InfoRow label={t.transportMode} value={transportMode} />
        <InfoRow label={t.address} value={stop.address} />
      </View>
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
  const { t, lang, isRTL } = useI18n();
  const { city } = useCity();
  const { isSheetVisible, isSheetLoading } = useMapLayers();
  const { setMapPaddingBottom } = useSheetDetent();
  const { filteredStations, selected, selectItem, searchQuery, setSearchQuery } = useStations();

  const cityLabel = city.name[lang];

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
  const peekFraction = minHeight / height;

  const syncMapPadding = React.useCallback(
    (detentIndex: number) => {
      const fraction = sheetDetentFraction(detentIndex, peekFraction);
      setMapPaddingBottom(Math.round(height * fraction));
    },
    [height, peekFraction, setMapPaddingBottom]
  );

  const handleDetentChange = React.useCallback(
    (index: number) => {
      setCurrentDetent(index);
      syncMapPadding(index);
    },
    [syncMapPadding]
  );

  React.useEffect(() => {
    syncMapPadding(currentDetent);
  }, [currentDetent, syncMapPadding]);

  const selectedKey = selected
    ? selected.kind === 'metro'
      ? `metro-${selected.station.id}`
      : `${selected.kind}-${selected.stop.id}`
    : null;

  // Expand only when the user picks a station — not when they collapse to peek (e.g. locate).
  React.useEffect(() => {
    if (selectedKey) {
      handleDetentChange(1);
      sheetRef.current?.resize(1);
    }
  }, [selectedKey, handleDetentChange]);

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
            lang={lang}
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
            lang={lang}
            onPress={() => handleBusStopPress(item.stop, item.kind)}
          />
        );
      }
      return null;
    },
    [lang, cityLabel, t.layerMetro, t.layerBrt, t.layerBus, handleStationPress, handleBusStopPress]
  );

  const keyExtractor = React.useCallback(
    (item: ListItem) =>
      item.kind === 'metro' ? `metro-${item.station.id}` : `${item.kind}-${item.stop.id}`,
    []
  );

  const contentStyle = [styles.content, isRTL && styles.contentRTL];

  const showStationList = !selected && !isSearching && !isSheetLoading && sections.length > 0;

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
        onDetentChange={(e) => handleDetentChange(e.nativeEvent.index)}
        header={
          <SheetHeader
            placeholder={t.search}
            clearLabel={t.clearSearch}
            value={searchQuery}
            onChangeText={handleSearchChange}
          />
        }>
        {selected?.kind === 'metro' ? (
          <StationDetail
            station={selected.station}
            lang={lang}
            sheetRef={sheetRef}
            onBackToList={handleBackToList}
          />
        ) : selected?.kind === 'brt' || selected?.kind === 'bus' ? (
          <BusStopDetail
            stop={selected.stop}
            isBRT={selected.kind === 'brt'}
            lang={lang}
            sheetRef={sheetRef}
            onBackToList={handleBackToList}
          />
        ) : isSearching || isSheetLoading ? (
          <View style={styles.centered}>
            <ActivityIndicator size="small" color={GRAY} />
          </View>
        ) : sections.length === 0 ? (
          <ListEmptyFallback
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
            extraData={lang}
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
          className={cn(
            'absolute bottom-4 size-12 items-center justify-center rounded-full active:opacity-60',
            'right-4 rtl:right-auto rtl:left-4',
            Platform.OS === 'android' && 'elevation-8'
          )}
          style={({ pressed }) => [styles.floatingBtn, pressed && styles.floatingBtnPressed]}
          onPress={handleSheetClose}
          accessibilityRole="button"
          accessibilityLabel={t.closeSheet}
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
  contentRTL: { direction: 'rtl' },
  list: { flex: 1 },
  listContent: { paddingBottom: SPACING },
  centered: { paddingVertical: SPACING, alignItems: 'center' },
});
