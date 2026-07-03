import { type TrueSheet, TrueSheetProvider } from '@lodev09/react-native-true-sheet';
import {
  ReanimatedTrueSheet,
  ReanimatedTrueSheetProvider,
  useReanimatedTrueSheet,
} from '@lodev09/react-native-true-sheet/reanimated';
import { useI18n } from '@/lib/i18n';
import { openMapsDirections } from '@/lib/maps';
import { useStations } from '@/lib/stations-context';
import type { Station } from '@/lib/stations';
import {
  ArrowLeft,
  ArrowRight,
  ExternalLink,
  Navigation2,
  RouteOff,
  X,
  XIcon,
  type LucideIcon,
} from 'lucide-react-native';
import * as React from 'react';
import {
  ActivityIndicator,
  FlatList,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  useWindowDimensions,
  type PressableProps,
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

const DARK = '#282e37';
const GRAY = '#b2bac8';
const DARK_GRAY = '#333b48';
const LIGHT_GRAY = '#ebedf1';
const DARK_BLUE = '#1f64ae';

// ─── Sheet Header with wired search ──────────────────────────────────────────
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
  inputWrapRTL: {
    flexDirection: 'row-reverse',
  },
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
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  contentRTL: {
    flexDirection: 'row-reverse',
  },
  secondary: {
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  pressed: { opacity: 0.8 },
  active: { backgroundColor: '#2a7fd4' },
  text: { color: '#fff' },
  secondaryText: { color: LIGHT_GRAY },
  hint: { fontSize: 10, color: 'rgba(255, 255, 255, 0.5)' },
  loader: { position: 'absolute', right: SPACING },
});

// ─── Button row ───────────────────────────────────────────────────────────────
const ButtonRow = ({ children, isRTL }: { children: React.ReactNode; isRTL: boolean }) => (
  <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', gap: GAP }}>
    {React.Children.map(children, (child) => (
      <View style={{ flex: 1 }}>{child}</View>
    ))}
  </View>
);

// ─── Station row in the list ──────────────────────────────────────────────────
const StationRow = ({
  station,
  isRTL,
  onPress,
}: {
  station: Station;
  isRTL: boolean;
  onPress: () => void;
}) => (
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
        <Text style={rowStyles.name}>{isRTL ? station.name.fa : station.name.en}</Text>
        <Text style={rowStyles.line}>{station.line}</Text>
      </View>
    </View>
  </Pressable>
);

const rowStyles = StyleSheet.create({
  row: {
    paddingVertical: SPACING * 0.75,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  pressed: { opacity: 0.6 },
  inner: { flexDirection: 'row', alignItems: 'center', gap: GAP },
  innerRTL: { flexDirection: 'row-reverse' },
  dot: { width: 12, height: 12, borderRadius: 6, flexShrink: 0 },
  dotInactive: { opacity: 0.55 },
  textWrap: { flex: 1 },
  textWrapRTL: { alignItems: 'flex-end' },
  name: { color: '#fff', fontSize: 14, fontWeight: '500' },
  line: { color: GRAY, fontSize: 12, marginTop: 2 },
});

// ─── Route info bar ───────────────────────────────────────────────────────────
const RouteInfoBar = ({
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
}) => (
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

// ─── Station detail view ──────────────────────────────────────────────────────
const StationDetail = ({
  station,
  isRTL,
  sheetRef,
}: {
  station: Station;
  isRTL: boolean;
  sheetRef: React.RefObject<TrueSheet | null>;
}) => {
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
    const label = isRTL ? station.name.fa : station.name.en;
    openMapsDirections(lat, lng, label);
  };

  const handleClose = () => {
    clearRoute();
    selectStation(null);
    sheetRef.current?.resize(0);
  };

  return (
    <View style={{ gap: GAP }}>
      {/* Station header */}
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

      {/* {!station.isActive && (
        <View style={[detailStyles.notice, isRTL && detailStyles.noticeRTL]}>
          <Text style={[detailStyles.noticeText, isRTL && detailStyles.noticeTextRTL]}>
            {t.stationMayNotBeFinished}
          </Text>
        </View>
      )} */}

      {/* Route info */}
      {route && routeDistance != null && routeDuration != null && (
        <RouteInfoBar
          distance={routeDistance}
          duration={routeDuration}
          distanceLabel={t.distance}
          durationLabel={t.duration}
          isRTL={isRTL}
        />
      )}

      {/* Directions */}
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

      {/* Clear route */}
      {route && (
        <SheetButton
          text={t.clearRoute}
          icon={RouteOff}
          isRTL={isRTL}
          variant="secondary"
          onPress={clearRoute}
        />
      )}

      {/* Back to list */}
      <SheetButton
        text={t.backToList}
        icon={isRTL ? ArrowRight : ArrowLeft}
        isRTL={isRTL}
        variant="secondary"
        onPress={handleClose}
      />
    </View>
  );
};

const detailStyles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: GAP, marginBottom: SPACING / 2 },
  headerRTL: { flexDirection: 'row-reverse' },
  dot: { width: 18, height: 18, borderRadius: 9, flexShrink: 0 },
  dotInactive: { opacity: 0.55 },
  textWrap: { flex: 1 },
  textWrapRTL: { alignItems: 'flex-end' },
  name: { color: '#fff', fontSize: 18, fontWeight: '600' },
  line: { color: GRAY, fontSize: 13, marginTop: 2 },
  notice: {
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    borderColor: 'rgba(245, 158, 11, 0.35)',
    borderWidth: 1,
    borderRadius: SPACING,
    paddingHorizontal: SPACING,
    paddingVertical: SPACING * 0.75,
  },
  noticeRTL: { alignItems: 'flex-end' },
  noticeText: { color: '#fbbf24', fontSize: 13, lineHeight: 18 },
  noticeTextRTL: { textAlign: 'right' },
});

// ─── Animated floating button ─────────────────────────────────────────────────
const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

// ─── Inner (must live inside ReanimatedTrueSheetProvider) ────────────────────
const SheetSectionInner = () => {
  const { height } = useWindowDimensions();
  const { animatedPosition } = useReanimatedTrueSheet();
  const sheetRef = React.useRef<TrueSheet>(null);
  const [currentDetent, setCurrentDetent] = React.useState(0);
  const { t, isRTL, lang, setLang } = useI18n();
  const { filteredStations, selectedStation, selectStation, searchQuery, setSearchQuery } =
    useStations();

  const minHeight = HEADER_HEIGHT + Platform.select({ ios: 0, default: SPACING })!;

  const floatingOpacity = useSharedValue(currentDetent === 1 ? 1 : 0);

  React.useEffect(() => {
    floatingOpacity.value = withTiming(currentDetent === 1 ? 1 : 0, {
      duration: 280,
      easing: Easing.out(Easing.cubic),
    });
  }, [currentDetent, floatingOpacity]);

  const floatingStyle = useAnimatedStyle(() => {
    const translateY = Math.min(-HEADER_HEIGHT, -(height - animatedPosition.value));
    return {
      opacity: floatingOpacity.value,
      transform: [{ translateY }],
    };
  });

  const contentStyle = [styles.content, isRTL && { direction: 'rtl' as const }];

  // When a station is selected from the map (sheet is minimised at detent 0),
  // expand to the 'auto' detent.  If the sheet is already open (the user tapped
  // a row in the list), skip the resize — swapping the content is enough and
  // calling resize(1) while already at detent 1 causes a native re-layout that
  // briefly expands the sheet to full-height, making the map vanish.
  React.useEffect(() => {
    if (selectedStation && currentDetent === 0) {
      sheetRef.current?.resize(1);
    }
  }, [selectedStation, currentDetent]);

  const handleStationPress = (station: Station) => {
    selectStation(station, { flyTo: true });
  };
  const handleSheetClose = () => {
    selectStation(null);
    sheetRef.current?.resize(0);
  };
  return (
    <>
      <Animated.View pointerEvents={currentDetent === 1 ? 'auto' : 'none'} style={floatingStyle}>
        <AnimatedTouchable
          activeOpacity={0.6}
          disabled={currentDetent !== 1}
          style={styles.floatingBtn}
          onPress={handleSheetClose}>
          <View style={styles.floatingBtnContent}>
            <XIcon size={20} color="white" />
          </View>
        </AnimatedTouchable>
      </Animated.View>

      <ReanimatedTrueSheet
        name="main"
        ref={sheetRef}
        detents={[minHeight / height, 'auto', 1]}
        initialDetentIndex={0}
        dimmed={false}
        dismissible={false}
        style={contentStyle}
        detached
        backgroundColor={DARK}
        onDetentChange={(e) => {
          setCurrentDetent(e.nativeEvent.index);
        }}
        header={
          <SheetHeader
            placeholder={t.search}
            isRTL={isRTL}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        }>
        {/* ── Station detail view ── */}
        {selectedStation ? (
          <StationDetail station={selectedStation} isRTL={isRTL} sheetRef={sheetRef} />
        ) : (
          <>
            {/* ── Station list ── */}

            <FlatList
              data={filteredStations}
              keyExtractor={(item) => item.id}
              scrollEnabled={false}
              renderItem={({ item }) => (
                <StationRow station={item} isRTL={isRTL} onPress={() => handleStationPress(item)} />
              )}
              style={{ maxHeight: 280 }}
            />

            <View style={{ height: SPACING / 2 }} />

            {/* Language switcher */}
            <ButtonRow isRTL={isRTL}>
              <SheetButton
                text={t.english}
                onPress={() => setLang('en')}
                style={lang === 'en' && btnStyles.active}
              />
              <SheetButton
                text={t.persian}
                onPress={() => setLang('fa')}
                style={lang === 'fa' && btnStyles.active}
              />
            </ButtonRow>
          </>
        )}
      </ReanimatedTrueSheet>
    </>
  );
};

// ─── Public export — manages its own providers ────────────────────────────────
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
    elevation: 4,
  },
  content: {
    padding: SPACING,
    gap: GAP,
  },
  heading: {
    marginBottom: SPACING / 2,
  },
  rtlBlock: {
    alignItems: 'flex-end',
  },
  floatingBtnContent: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
