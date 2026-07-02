import { type TrueSheet, TrueSheetProvider } from '@lodev09/react-native-true-sheet';
import {
  ReanimatedTrueSheet,
  ReanimatedTrueSheetProvider,
  useReanimatedTrueSheet,
} from '@lodev09/react-native-true-sheet/reanimated';
import { useI18n } from '@/lib/i18n';
import { useStations } from '@/lib/stations-context';
import type { Station } from '@/lib/stations';
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
import Animated, { useAnimatedStyle } from 'react-native-reanimated';

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
    <View style={headerStyles.inputWrap}>
      <TextInput
        style={[headerStyles.input, isRTL && headerStyles.rtlInput]}
        placeholder={placeholder}
        placeholderTextColor={LIGHT_GRAY}
        textAlign={isRTL ? 'right' : 'left'}
        value={value}
        onChangeText={onChangeText}
        returnKeyType="search"
      />
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
    justifyContent: 'center',
  },
  input: {
    fontSize: 16,
    height: INPUT_HEIGHT,
    color: 'white',
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
}

const SheetButton = ({ text, hint, loading, style, variant = 'primary', ...rest }: SheetButtonProps) => (
  <Pressable
    style={(state) => [
      btnStyles.button,
      variant === 'secondary' && btnStyles.secondary,
      state.pressed && btnStyles.pressed,
      typeof style === 'function' ? style(state) : style,
    ]}
    {...rest}
  >
    <Text style={[btnStyles.text, variant === 'secondary' && btnStyles.secondaryText]}>
      {text}
    </Text>
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
    style={({ pressed }) => [rowStyles.row, pressed && rowStyles.pressed]}
  >
    <View style={[rowStyles.inner, isRTL && rowStyles.innerRTL]}>
      <View style={[rowStyles.dot, { backgroundColor: station.lineColor }]} />
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
  textWrap: { flex: 1 },
  textWrapRTL: { alignItems: 'flex-end' },
  name: { color: '#fff', fontSize: 14, fontWeight: '500' },
  line: { color: GRAY, fontSize: 12, marginTop: 2 },
});

// ─── Route info bar ───────────────────────────────────────────────────────────
const RouteInfoBar = ({
  distance,
  duration,
  isRTL,
}: {
  distance: number;
  duration: number;
  isRTL: boolean;
}) => (
  <View style={[routeStyles.bar, isRTL && routeStyles.barRTL]}>
    <View style={routeStyles.cell}>
      <Text style={routeStyles.label}>{isRTL ? 'مسافت' : 'Distance'}</Text>
      <Text style={routeStyles.value}>{distance.toFixed(1)} km</Text>
    </View>
    <View style={routeStyles.divider} />
    <View style={routeStyles.cell}>
      <Text style={routeStyles.label}>{isRTL ? 'زمان' : 'Duration'}</Text>
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
    sheetRef.current?.resize(2);
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
        <View style={[detailStyles.dot, { backgroundColor: station.lineColor }]} />
        <View style={[detailStyles.textWrap, isRTL && detailStyles.textWrapRTL]}>
          <Text style={detailStyles.name}>
            {isRTL ? station.name.fa : station.name.en}
          </Text>
          <Text style={detailStyles.line}>{station.line}</Text>
        </View>
      </View>

      {/* Route info */}
      {route && routeDistance != null && routeDuration != null && (
        <RouteInfoBar distance={routeDistance} duration={routeDuration} isRTL={isRTL} />
      )}

      {/* Directions button */}
      {!route && (
        <SheetButton
          text={isRTL ? 'مسیریابی' : 'Get Directions'}
          loading={routeLoading}
          disabled={!userLocation || routeLoading}
          onPress={handleDirections}
          hint={!userLocation ? (isRTL ? 'موقعیت شما یافت نشد' : 'Locate yourself first') : undefined}
        />
      )}

      {/* Clear route */}
      {route && (
        <SheetButton
          text={isRTL ? 'حذف مسیر' : 'Clear Route'}
          variant="secondary"
          onPress={clearRoute}
        />
      )}

      {/* Back to list */}
      <SheetButton
        text={isRTL ? 'بازگشت به لیست' : 'Back to List'}
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
  textWrap: { flex: 1 },
  textWrapRTL: { alignItems: 'flex-end' },
  name: { color: '#fff', fontSize: 18, fontWeight: '600' },
  line: { color: GRAY, fontSize: 13, marginTop: 2 },
});

// ─── Animated floating button ─────────────────────────────────────────────────
const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

// ─── Inner (must live inside ReanimatedTrueSheetProvider) ────────────────────
const SheetSectionInner = () => {
  const { height } = useWindowDimensions();
  const { animatedPosition } = useReanimatedTrueSheet();
  const sheetRef = React.useRef<TrueSheet>(null);
  const { t, isRTL, lang, setLang } = useI18n();
  const {
    filteredStations,
    selectedStation,
    selectStation,
    searchQuery,
    setSearchQuery,
  } = useStations();

  const minHeight = HEADER_HEIGHT + Platform.select({ ios: 0, default: SPACING })!;

  const floatingStyle = useAnimatedStyle(() => {
    const translateY = Math.min(-HEADER_HEIGHT, -(height - animatedPosition.value));
    return { transform: [{ translateY }] };
  });

  const contentStyle = [styles.content, isRTL && { direction: 'rtl' as const }];

  // When a station is selected, expand sheet to 'auto' detent
  React.useEffect(() => {
    if (selectedStation) {
      sheetRef.current?.resize(1);
    }
  }, [selectedStation]);

  const handleStationPress = (station: typeof selectedStation) => {
    selectStation(station);
  };

  return (
    <>
      <AnimatedTouchable
        activeOpacity={0.6}
        style={[styles.floatingBtn, floatingStyle]}
        onPress={() => sheetRef.current?.present(1)}
      />

      <ReanimatedTrueSheet
        name="main"
        ref={sheetRef}
        detents={[minHeight / height, 'auto', 1]}
        initialDetentIndex={0}
        dimmedDetentIndex={2}
        style={contentStyle}
        detached
        dismissible={false}
        backgroundColor={DARK}
        header={
          <SheetHeader
            placeholder={t.search}
            isRTL={isRTL}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        }
      >
        {/* ── Station detail view ── */}
        {selectedStation ? (
          <StationDetail station={selectedStation} isRTL={isRTL} sheetRef={sheetRef} />
        ) : (
          <>
            {/* ── Station list ── */}
            <View style={[styles.heading, isRTL && styles.rtlBlock]}>
              <Text style={styles.title}>{t.appName}</Text>
              <Text style={styles.subtitle}>{t.subtitle}</Text>
            </View>

            <FlatList
              data={filteredStations}
              keyExtractor={(item) => item.id}
              scrollEnabled={false}
              renderItem={({ item }) => (
                <StationRow
                  station={item}
                  isRTL={isRTL}
                  onPress={() => handleStationPress(item)}
                />
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
  title: {
    fontSize: 22,
    lineHeight: 28,
    fontWeight: '600',
    color: 'white',
  },
  subtitle: {
    lineHeight: 22,
    color: GRAY,
    fontSize: 13,
  },
});
