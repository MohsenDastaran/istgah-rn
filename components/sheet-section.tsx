import { type TrueSheet, TrueSheetProvider } from '@lodev09/react-native-true-sheet';
import {
  ReanimatedTrueSheet,
  ReanimatedTrueSheetProvider,
  useReanimatedTrueSheet,
} from '@lodev09/react-native-true-sheet/reanimated';
import * as React from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  useWindowDimensions,
  type PressableProps,
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

// ─── Sheet Header (search bar shown as the grabber area) ─────────────────────
const SheetHeader = () => (
  <Animated.View style={headerStyles.container}>
    <View style={headerStyles.inputWrap}>
      <TextInput
        style={headerStyles.input}
        placeholder="جستجو..."
        placeholderTextColor={LIGHT_GRAY}
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
});

// ─── Pill button ──────────────────────────────────────────────────────────────
interface SheetButtonProps extends PressableProps {
  text: string;
  hint?: string;
  loading?: boolean;
}

const SheetButton = ({ text, hint, loading, style, ...rest }: SheetButtonProps) => (
  <Pressable
    style={(state) => [
      btnStyles.button,
      state.pressed && btnStyles.pressed,
      typeof style === 'function' ? style(state) : style,
    ]}
    {...rest}>
    <Text style={btnStyles.text}>{text}</Text>
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
  pressed: { opacity: 0.8 },
  text: { color: '#fff' },
  hint: { fontSize: 10, color: 'rgba(255, 255, 255, 0.5)' },
  loader: { position: 'absolute', right: SPACING },
});

// ─── Button row ───────────────────────────────────────────────────────────────
const ButtonRow = ({ children }: { children: React.ReactNode }) => (
  <View style={{ flexDirection: 'row', gap: GAP }}>
    {React.Children.map(children, (child) => (
      <View style={{ flex: 1 }}>{child}</View>
    ))}
  </View>
);

// ─── Footer bar ───────────────────────────────────────────────────────────────

const footerStyles = StyleSheet.create({
  wrapper: {
    height: BUTTON_HEIGHT + SPACING,
    backgroundColor: DARK_GRAY,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: { opacity: 0.6 },
  text: { color: '#fff', fontWeight: '600' },
});

// ─── Animated floating button (moves up with the sheet) ──────────────────────
const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

// ─── Inner component (needs to be inside ReanimatedTrueSheetProvider) ─────────
const SheetSectionInner = () => {
  const { height } = useWindowDimensions();
  const { animatedPosition } = useReanimatedTrueSheet();
  const sheetRef = React.useRef<TrueSheet>(null);

  // First detent: only show the header (search bar)
  const minHeight = HEADER_HEIGHT + Platform.select({ ios: 0, default: SPACING })!;

  // Float button rides up as the sheet expands
  const floatingStyle = useAnimatedStyle(() => {
    const translateY = Math.min(-HEADER_HEIGHT, -(height - animatedPosition.value));
    return { transform: [{ translateY }] };
  });

  return (
    <>
      {/* Floating action button that brings sheet to mid detent */}
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
        dimmedDetentIndex={1}
        style={styles.content}
        detached
        dismissible={false}
        backgroundColor={DARK}
        header={<SheetHeader />}>
        {/* Title block */}
        <View style={styles.heading}>
          <Text style={styles.title}>استگاه</Text>
          <Text style={styles.subtitle}>تجربه واقعی برگه بومی در React Native.</Text>
        </View>

        <SheetButton text="اکشن اول" onPress={() => {}} />
        <SheetButton text="اکشن دوم" onPress={() => {}} />

        <View style={{ height: SPACING / 2 }} />

        <ButtonRow>
          <SheetButton text="گسترش" onPress={() => sheetRef.current?.resize(2)} />
          <SheetButton text="جمع‌کردن" onPress={() => sheetRef.current?.resize(0)} />
        </ButtonRow>
      </ReanimatedTrueSheet>
    </>
  );
};

// ─── Public export — wraps its own providers ──────────────────────────────────
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
    marginBottom: SPACING,
  },
  title: {
    fontSize: 24,
    lineHeight: 30,
    fontWeight: '500',
    color: 'white',
  },
  subtitle: {
    lineHeight: 24,
    color: GRAY,
  },
});
