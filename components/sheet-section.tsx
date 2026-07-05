import { Icon } from '@/components/ui/icon';
import { cn } from '@/lib/utils';
import { type TrueSheet, TrueSheetProvider } from '@lodev09/react-native-true-sheet';
import {
  ReanimatedTrueSheet,
  ReanimatedTrueSheetProvider,
  useReanimatedTrueSheet,
} from '@lodev09/react-native-true-sheet/reanimated';
import { useCity } from '@/lib/city-context';
import { cityLabelFromName } from '@/lib/cities';
import { useI18n, type Lang, type Strings } from '@/lib/i18n';
import { useMapLayers } from '@/lib/map-layers-context';
import { sheetDetentFraction, useSheetDetent } from '@/lib/sheet-detent-context';
import { openMapsDirections } from '@/lib/maps';
import { useStations } from '@/lib/stations-context';
import type { Station } from '@/lib/stations';
import {
  type BusStop,
  formatBusFacilityValue,
} from '@/lib/bus-stops';
import type { PlaceResult } from '@/lib/geocoding';
import { usePlaceSearch } from '@/lib/use-place-search';
import {
  buildTransitSections,
  type TransitListItem,
  type TransitSection,
  useTransitSearch,
} from '@/lib/use-transit-search';
import {
  ArrowLeft,
  Bus,
  Car,
  ExternalLink,
  MapPin,
  RouteOff,
  TrainFront,
  X,
  XIcon,
  type LucideIcon,
} from 'lucide-react-native';
import * as React from 'react';
import {
  ActivityIndicator,
  BackHandler,
  Platform,
  Pressable,
  ScrollView,
  SectionList,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedReaction,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
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
        <Icon as={icon} className="size-[18px] text-white" color="#ffffff" />
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
        <View className={cn(isRTL && 'rotate-180')}>
          <Icon as={ArrowLeft} className={cn('size-4 text-white')} color="#ffffff" />
        </View>
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
  loading,
}: {
  label: string;
  icon: LucideIcon;
  color: string;
  loading?: boolean;
}) {
  return (
    <View className="mb-0.5 flex-row items-center gap-1.5 border-b border-white/10 px-0.5 py-2 rtl:flex-row-reverse">
      <IconComp size={13} color={color} strokeWidth={2.5} />
      <Text className="text-[11px] font-semibold tracking-wide uppercase" style={{ color }}>
        {label}
      </Text>
      {loading ? (
        <ActivityIndicator size="small" color={color} style={{ marginLeft: 4, opacity: 0.7 }} />
      ) : null}
    </View>
  );
});

const TYPE_META = {
  metro: { Icon: TrainFront, color: '#60a5fa' },
  brt: { Icon: Bus, color: '#fb923c' },
  bus: { Icon: Bus, color: '#94a3b8' },
  place: { Icon: MapPin, color: '#a78bfa' },
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
  typeLabel,
  lang,
  onPress,
}: {
  station: Station;
  typeLabel: string;
  lang: Lang;
  onPress: () => void;
}) {
  return (
    <StationListRow
      name={station.name[lang]}
      detail={station.line}
      cityLabel={cityLabelFromName(station.city, lang)}
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
  typeLabel,
  typeKind,
  lang,
  onPress,
}: {
  stop: BusStop;
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
      cityLabel={cityLabelFromName(stop.city, lang)}
      typeLabel={typeLabel}
      typeKind={typeKind}
      dotColor={dotColor}
      onPress={onPress}
    />
  );
});

// ─── Place row ────────────────────────────────────────────────────────────────
const PlaceRow = React.memo(function PlaceRow({
  place,
  typeLabel,
  onPress,
}: {
  place: PlaceResult;
  typeLabel: string;
  onPress: () => void;
}) {
  const { Icon: TypeIcon, color: typeColor } = TYPE_META.place;
  const detail = place.displayName.split(',').slice(1, 3).join(',').trim();

  return (
    <Pressable
      onPress={onPress}
      className="h-[52px] justify-center border-b border-white/10 active:opacity-60">
      <View className="flex-row items-center gap-3 rtl:flex-row-reverse">
        <View className="size-[11px] shrink-0 rounded-sm" style={{ backgroundColor: '#a78bfa' }} />
        <View className="min-w-0 flex-1 rtl:items-end">
          <Text className="text-sm font-medium text-white" numberOfLines={1}>
            {place.name}
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
          {place.cityName ? (
            <Text className="text-[11px] text-[#b2bac8]" numberOfLines={1}>
              {place.cityName}
            </Text>
          ) : null}
        </View>
      </View>
    </Pressable>
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

// ─── Place detail ─────────────────────────────────────────────────────────────
const PlaceDetail = React.memo(function PlaceDetail({
  place,
  sheetRef,
  onBackToList,
}: {
  place: PlaceResult;
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
    const [lng, lat] = place.coordinate;
    openMapsDirections(lat, lng, place.name);
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
        title={place.name}
        subtitle={t.layerPlace}
        dotColor="#a78bfa"
        dotSizeClass="size-3.5 rounded-sm"
      />

      <View className="gap-2 rounded-xl bg-white/5 p-2.5">
        <InfoRow label={t.address} value={place.displayName} />
      </View>
    </View>
  );
});

// ─── Two-column search layout ─────────────────────────────────────────────────

/** Compact column label — sits above each search column. */
const ColumnLabel = React.memo(function ColumnLabel({
  label,
  icon: IconComp,
  color,
  loading,
}: {
  label: string;
  icon: LucideIcon;
  color: string;
  loading?: boolean;
}) {
  return (
    <View style={colStyles.colLabelRow} className="rtl:flex-row-reverse">
      <View style={[colStyles.colLabelIcon, { backgroundColor: `${color}26` }]}>
        <IconComp size={11} color={color} strokeWidth={2.5} />
      </View>
      <Text style={[colStyles.colLabelText, { color }]} numberOfLines={1}>
        {label}
      </Text>
      {loading ? (
        <ActivityIndicator size="small" color={color} style={colStyles.colLabelSpinner} />
      ) : null}
    </View>
  );
});

/** Mini section separator inside a column. */
const ColSectionDivider = React.memo(function ColSectionDivider({
  label,
  color,
}: {
  label: string;
  color: string;
}) {
  return (
    <Text style={[colStyles.colSectionLabel, { color }]} numberOfLines={1}>
      {label}
    </Text>
  );
});

/** Narrow row for two-column search results. */
const CompactRow = React.memo(function CompactRow({
  dotColor,
  dotSquare,
  name,
  detail,
  cityLabel,
  onPress,
}: {
  dotColor: string;
  dotSquare?: boolean;
  name: string;
  detail?: string;
  cityLabel?: string;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={colStyles.compactRow} className="active:opacity-55">
      <View
        style={[
          colStyles.compactDot,
          dotSquare && colStyles.compactDotSquare,
          { backgroundColor: dotColor },
        ]}
      />
      <View style={colStyles.compactTextBlock}>
        <Text style={colStyles.compactName} numberOfLines={1}>
          {name}
        </Text>
        {detail ? (
          <Text style={colStyles.compactDetail} numberOfLines={1}>
            {detail}
          </Text>
        ) : null}
        {cityLabel ? (
          <Text style={colStyles.compactCity} numberOfLines={1}>
            {cityLabel}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
});

/** Pulsing skeleton rows shown while the places API call is in flight. */
function SkeletonLine({ widthPct }: { widthPct: number }) {
  return (
    <View style={[colStyles.compactRow, { gap: 0 }]}>
      <View style={[colStyles.compactDot, colStyles.compactDotSquare, colStyles.skeletonDot]} />
      <View style={[colStyles.skeletonLine, { width: `${widthPct}%` }]} />
    </View>
  );
}

const SearchColumnSkeleton = React.memo(function SearchColumnSkeleton() {
  const opacity = useSharedValue(0.7);
  React.useEffect(() => {
    opacity.value = withRepeat(
      withTiming(0.25, { duration: 650, easing: Easing.inOut(Easing.ease) }),
      -1,
      true
    );
    return () => {
      opacity.value = 0.7;
    };
  }, [opacity]);
  const animStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));
  return (
    <Animated.View style={animStyle}>
      <SkeletonLine widthPct={75} />
      <SkeletonLine widthPct={60} />
      <SkeletonLine widthPct={82} />
      <SkeletonLine widthPct={50} />
    </Animated.View>
  );
});

const COL_LABEL_H = 36;

type ListItem = TransitListItem;
type Section = TransitSection;

type SearchColumnsProps = {
  sections: Section[];
  isTransitSearching: boolean;
  places: PlaceResult[];
  isPlaceSearching: boolean;
  query: string;
  t: Strings;
  lang: Lang;
  isRTL: boolean;
  /** Total height of the two-column block (labels + scroll areas). */
  bodyHeight: number;
  onStationPress: (station: Station) => void;
  onBusStopPress: (stop: BusStop, kind: 'brt' | 'bus') => void;
  onPlacePress: (place: PlaceResult) => void;
};

const SearchColumns = React.memo(function SearchColumns({
  sections,
  isTransitSearching,
  places,
  isPlaceSearching,
  query,
  t,
  lang,
  isRTL,
  bodyHeight,
  onStationPress,
  onBusStopPress,
  onPlacePress,
}: SearchColumnsProps) {
  const scrollH = Math.max(80, bodyHeight - COL_LABEL_H);

  return (
    <View style={[colStyles.columns, { height: bodyHeight }, isRTL && colStyles.columnsRTL]}>
      {/* ── Station column (debounced filter; UI reacts to input immediately) ── */}
      <View style={colStyles.column}>
        <ColumnLabel
          label={t.transitColumn}
          icon={TrainFront}
          color="#60a5fa"
          loading={isTransitSearching}
        />
        <ScrollView
          style={{ height: scrollH }}
          contentContainerStyle={colStyles.columnScrollContent}
          nestedScrollEnabled
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          scrollEventThrottle={16}>
          {isTransitSearching ? (
            <SearchColumnSkeleton />
          ) : sections.length === 0 ? (
            <Text style={colStyles.colEmpty}>{t.noResults}</Text>
          ) : (
            <View key={`transit-${query.trim()}`}>
            {sections.map((section) => (
              <View key={section.title}>
                <ColSectionDivider label={section.title} color={section.color} />
                {section.data.map((item) =>
                  item.kind === 'metro' ? (
                    <CompactRow
                      key={`m-${item.station.id}`}
                      dotColor={item.station.lineColor}
                      name={item.station.name[lang]}
                      detail={item.station.line}
                      cityLabel={cityLabelFromName(item.station.city, lang)}
                      onPress={() => onStationPress(item.station)}
                    />
                  ) : (
                    <CompactRow
                      key={`${item.kind}-${item.stop.id}`}
                      dotColor={item.kind === 'brt' ? '#0d9488' : '#64748b'}
                      dotSquare={item.kind === 'brt'}
                      name={busStopDisplayName(item.stop, lang)}
                      detail={
                        item.kind === 'brt'
                          ? item.stop.brtLine || undefined
                          : item.stop.lines || undefined
                      }
                      cityLabel={cityLabelFromName(item.stop.city, lang)}
                      onPress={() => onBusStopPress(item.stop, item.kind)}
                    />
                  )
                )}
              </View>
            ))}
            </View>
          )}
        </ScrollView>
      </View>

      {/* Divider */}
      <View style={colStyles.columnDivider} />

      {/* ── Places column (Nominatim API, debounced) ───────────────────── */}
      <View style={colStyles.column}>
        <ColumnLabel
          label={t.places}
          icon={MapPin}
          color="#a78bfa"
          loading={isPlaceSearching || isTransitSearching}
        />
        <ScrollView
          style={{ height: scrollH }}
          contentContainerStyle={colStyles.columnScrollContent}
          nestedScrollEnabled
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          scrollEventThrottle={16}>
          {query.trim().length >= 2 ? (
            isPlaceSearching ? (
              <SearchColumnSkeleton />
            ) : places.length > 0 ? (
              <View key={`places-${query.trim()}`}>
              {places.map((place) => (
                <CompactRow
                  key={place.id}
                  dotColor="#a78bfa"
                  dotSquare
                  name={place.name}
                  detail={place.displayName.split(',').slice(1, 2).join('').trim() || undefined}
                  cityLabel={place.cityName}
                  onPress={() => onPlacePress(place)}
                />
              ))}
              </View>
            ) : (
              <Text style={colStyles.colEmpty}>{t.noPlacesFound}</Text>
            )
          ) : isTransitSearching ? (
            <SearchColumnSkeleton />
          ) : (
            <Text style={colStyles.colEmpty}>{t.placeSearchHint}</Text>
          )}
        </ScrollView>
      </View>
    </View>
  );
});

// ─── Inner ────────────────────────────────────────────────────────────────────
const SheetSectionInner = () => {
  const { height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const { animatedPosition } = useReanimatedTrueSheet();
  const sheetRef = React.useRef<TrueSheet>(null);
  const [currentDetent, setCurrentDetent] = React.useState(0);
  const { t, lang, isRTL } = useI18n();
  const { cityId } = useCity();
  const { isSheetVisible, isSheetLoading } = useMapLayers();
  const { setMapPaddingBottom } = useSheetDetent();
  const { selected, selectItem } = useStations();
  const [searchQuery, setSearchQuery] = React.useState('');
  const isSearchActive = searchQuery.trim().length > 0;

  // Debounced search logic only — UI uses raw searchQuery / isSearchActive.
  const { sections: transitSections, isSearching: isTransitSearching } = useTransitSearch(
    searchQuery,
    isSheetVisible,
    t
  );
  const { places, isSearching: isPlaceSearching } = usePlaceSearch(searchQuery, cityId, lang);

  const listSections = React.useMemo(
    () => buildTransitSections('', isSheetVisible, t),
    [isSheetVisible, t]
  );

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

  const currentDetentRef = React.useRef(currentDetent);
  currentDetentRef.current = currentDetent;

  React.useEffect(() => {
    const onBackPress = () => {
      const index = currentDetentRef.current;
      if (index >= 2) {
        handleDetentChange(1);
        sheetRef.current?.resize(1);
        return true;
      }
      if (index === 1) {
        handleDetentChange(0);
        sheetRef.current?.resize(0);
        return true;
      }
      return false;
    };

    const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => subscription.remove();
  }, [handleDetentChange]);

  React.useEffect(() => {
    syncMapPadding(currentDetent);
  }, [currentDetent, syncMapPadding]);

  const selectedKey = selected
    ? selected.kind === 'metro'
      ? `metro-${selected.station.id}`
      : selected.kind === 'place'
        ? `place-${selected.place.id}`
        : `${selected.kind}-${selected.stop.id}`
    : null;

  // Expand when user picks a station or when search becomes active.
  React.useEffect(() => {
    if (selectedKey) {
      handleDetentChange(1);
      sheetRef.current?.resize(1);
    }
  }, [selectedKey, handleDetentChange]);

  const searchBodyHeightRef = React.useRef(
    Math.max(160, Math.round(height * 0.5) - HEADER_HEIGHT - SPACING * 2)
  );
  const [searchBodyHeight, setSearchBodyHeight] = React.useState(searchBodyHeightRef.current);

  const syncSearchBodyHeight = React.useCallback(
    (sheetTop: number) => {
      const detached = insets.bottom + SPACING;
      const visible = height - sheetTop - detached;
      const next = Math.max(160, Math.round(visible - HEADER_HEIGHT - SPACING * 2));
      if (Math.abs(next - searchBodyHeightRef.current) < 2) return;
      searchBodyHeightRef.current = next;
      setSearchBodyHeight(next);
    },
    [height, insets.bottom]
  );

  const expandSheetForSearch = React.useCallback(() => {
    const nextHeight = Math.max(160, Math.round(height * 0.5) - HEADER_HEIGHT - SPACING * 2);
    searchBodyHeightRef.current = nextHeight;
    setSearchBodyHeight(nextHeight);
    handleDetentChange(1);
    sheetRef.current?.resize(1);
  }, [height, handleDetentChange]);

  const handleSearchChange = React.useCallback(
    (text: string) => {
      setSearchQuery(text);
      if (text.trim().length > 0) {
        if (currentDetentRef.current < 1) {
          expandSheetForSearch();
        }
      }
    },
    [expandSheetForSearch]
  );

  useAnimatedReaction(
    () => animatedPosition.value,
    (sheetTop) => {
      if (isSearchActive) {
        runOnJS(syncSearchBodyHeight)(sheetTop);
      }
    },
    [isSearchActive, syncSearchBodyHeight]
  );

  React.useEffect(() => {
    if (isSearchActive) {
      syncSearchBodyHeight(animatedPosition.value);
    }
  }, [isSearchActive, currentDetent, syncSearchBodyHeight, animatedPosition]);

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
    sheetRef.current?.resize(1);
  }, [selectItem]);

  const handlePlacePress = React.useCallback(
    (place: PlaceResult) => selectItem({ kind: 'place', place }, { flyTo: true }),
    [selectItem]
  );

  // ── Renderers ────────────────────────────────────────────────────────────────
  const renderSectionHeader = React.useCallback(
    ({ section }: { section: Section }) => (
      <CategoryHeader
        label={section.title}
        icon={section.icon}
        color={section.color}
      />
    ),
    []
  );

  const renderItem = React.useCallback(
    ({ item }: { item: ListItem }) => {
      if (item.kind === 'metro') {
        return (
          <MetroRow
            station={item.station}
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
            typeLabel={item.kind === 'brt' ? t.layerBrt : t.layerBus}
            typeKind={item.kind}
            lang={lang}
            onPress={() => handleBusStopPress(item.stop, item.kind)}
          />
        );
      }
      return null;
    },
    [lang, t.layerMetro, t.layerBrt, t.layerBus, handleStationPress, handleBusStopPress]
  );

  const keyExtractor = React.useCallback(
    (item: ListItem) =>
      item.kind === 'metro' ? `metro-${item.station.id}` : `${item.kind}-${item.stop.id}`,
    []
  );

  const contentStyle = [
    styles.content,
    isRTL && styles.contentRTL,
    isSearchActive && !selected && styles.searchSheetContent,
  ];

  // In search mode the sheet hosts two independent ScrollViews, so TrueSheet
  // must NOT wrap content in a native scroll view.
  const sheetScrollable = !isSearchActive && !selected && !isSheetLoading && listSections.length > 0;

  return (
    <>
      <ReanimatedTrueSheet
        name="main"
        ref={sheetRef}
        detents={[minHeight / height, 0.5, 1]}
        initialDetentIndex={0}
        dimmed={false}
        dismissible={false}
        scrollable={sheetScrollable}
        scrollableOptions={{ scrollingExpandsSheet: true }}
        style={contentStyle}
        detached
        detachedOffset={insets.bottom + SPACING}
        insetAdjustment="automatic"
        backgroundColor={DARK}
        onDetentChange={(e) => handleDetentChange(e.nativeEvent.index)}
        header={
          !selected ? (
            <SheetHeader
              placeholder={t.search}
              clearLabel={t.clearSearch}
              value={searchQuery}
              onChangeText={handleSearchChange}
            />
          ) : undefined
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
        ) : selected?.kind === 'place' ? (
          <PlaceDetail place={selected.place} sheetRef={sheetRef} onBackToList={handleBackToList} />
        ) : isSearchActive ? (
          /* ── Two-column search results (immediate; columns load independently) */
          <View style={styles.searchHost}>
            <SearchColumns
              sections={transitSections}
              isTransitSearching={isTransitSearching}
              places={places}
              isPlaceSearching={isPlaceSearching}
              query={searchQuery}
              t={t}
              lang={lang}
              isRTL={isRTL}
              bodyHeight={searchBodyHeight}
              onStationPress={handleStationPress}
              onBusStopPress={handleBusStopPress}
              onPlacePress={handlePlacePress}
            />
          </View>
        ) : isSheetLoading ? (
          <View style={styles.centered}>
            <ActivityIndicator size="small" color={GRAY} />
          </View>
        ) : listSections.length > 0 ? (
          /* ── Default single-column station list ──────────────────────── */
          <SectionList
            sections={listSections}
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
            contentContainerStyle={[styles.listContent, { paddingBottom: SPACING + insets.bottom }]}
          />
        ) : (
          <ListEmptyFallback title={t.emptyListTitle} hint={t.emptyListHint} />
        )}
      </ReanimatedTrueSheet>

      <Animated.View
        pointerEvents={currentDetent === 1 ? 'box-none' : 'none'}
        style={[styles.floatingBtnHost, floatingStyle]}
        collapsable={false}>
        <Pressable
          disabled={currentDetent !== 1}
          className={cn(
            'absolute size-12 items-center justify-center rounded-full active:opacity-60',
            'right-4 rtl:right-auto rtl:left-4',
            Platform.OS === 'android' && 'elevation-8'
          )}
          style={({ pressed }) => [
            styles.floatingBtn,
            { bottom: insets.bottom },
            pressed && styles.floatingBtnPressed,
          ]}
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
  searchSheetContent: {
    flex: 1,
    minHeight: 0,
  },
  searchHost: {
    flex: 1,
    minHeight: 0,
  },
  list: { flex: 1 },
  listContent: { paddingBottom: SPACING },
  centered: { paddingVertical: SPACING, alignItems: 'center' },
});

// ─── Two-column search styles ─────────────────────────────────────────────────
const colStyles = StyleSheet.create({
  // Container row — children in LTR order; isRTL reversal applied via columnsRTL
  columns: {
    flexDirection: 'row',
    gap: 0,
  },
  columnsRTL: {
    flexDirection: 'row-reverse',
  },
  column: {
    flex: 1,
    minWidth: 0,
    minHeight: 0,
  },
  columnScrollContent: {
    paddingBottom: 8,
  },
  columnDivider: {
    width: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(255,255,255,0.12)',
    marginHorizontal: 8,
    alignSelf: 'stretch',
  },
  // Column header row
  colLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
    paddingBottom: 6,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255,255,255,0.15)',
  },
  colLabelIcon: {
    width: 20,
    height: 20,
    borderRadius: 5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  colLabelText: {
    flex: 1,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  colLabelSpinner: {
    transform: [{ scale: 0.75 }],
  },
  // Mini section label inside a column
  colSectionLabel: {
    fontSize: 9,
    fontWeight: '600',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    opacity: 0.65,
    marginTop: 10,
    marginBottom: 2,
  },
  colEmpty: {
    paddingVertical: 14,
    fontSize: 12,
    color: GRAY,
    textAlign: 'center',
  },
  // Compact row (44px, narrower than StationListRow)
  compactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 7,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255,255,255,0.07)',
    minHeight: 44,
  },
  compactDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    flexShrink: 0,
  },
  compactDotSquare: {
    borderRadius: 2,
  },
  compactTextBlock: {
    flex: 1,
    minWidth: 0,
  },
  compactName: {
    fontSize: 13,
    fontWeight: '500',
    color: '#ffffff',
    lineHeight: 17,
  },
  compactDetail: {
    fontSize: 11,
    color: GRAY,
    lineHeight: 14,
    marginTop: 1,
  },
  compactCity: {
    fontSize: 10,
    color: GRAY,
    lineHeight: 13,
    marginTop: 1,
    opacity: 0.85,
  },
  // Skeleton
  skeletonDot: {
    backgroundColor: 'rgba(255,255,255,0.18)',
    marginRight: 8,
  },
  skeletonLine: {
    height: 12,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.13)',
  },
});
