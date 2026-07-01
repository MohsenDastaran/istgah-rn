import { type TrueSheet, TrueSheetProvider } from '@lodev09/react-native-true-sheet';
import {
  ReanimatedTrueSheet,
  ReanimatedTrueSheetProvider,
  useReanimatedTrueSheet,
} from '@lodev09/react-native-true-sheet/reanimated';
import { useI18n } from '@/lib/i18n';
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

// ─── Sheet Header ─────────────────────────────────────────────────────────────
interface SheetHeaderProps {
  placeholder: string;
  isRTL: boolean;
}

const SheetHeader = ({ placeholder, isRTL }: SheetHeaderProps) => (
  <Animated.View style={headerStyles.container}>
    <View style={headerStyles.inputWrap}>
      <TextInput
        style={[headerStyles.input, isRTL && headerStyles.rtlInput]}
        placeholder={placeholder}
        placeholderTextColor={LIGHT_GRAY}
        textAlign={isRTL ? 'right' : 'left'}
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
const ButtonRow = ({ children, isRTL }: { children: React.ReactNode; isRTL: boolean }) => (
  <View style={[{ flexDirection: isRTL ? 'row-reverse' : 'row', gap: GAP }]}>
    {React.Children.map(children, (child) => (
      <View style={{ flex: 1 }}>{child}</View>
    ))}
  </View>
);

// // ─── Footer bar ───────────────────────────────────────────────────────────────
// const SheetFooter = ({ text, onPress }: { text: string; onPress?: () => void }) => (
//   <Pressable
//     style={({ pressed }) => [footerStyles.wrapper, pressed && footerStyles.pressed]}
//     onPress={onPress}
//   >
//     <Text style={footerStyles.text}>{text}</Text>
//   </Pressable>
// );

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

// ─── Animated floating button ─────────────────────────────────────────────────
const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

// ─── Inner (must live inside ReanimatedTrueSheetProvider) ────────────────────
const SheetSectionInner = () => {
  const { height } = useWindowDimensions();
  const { animatedPosition } = useReanimatedTrueSheet();
  const sheetRef = React.useRef<TrueSheet>(null);
  const { t, isRTL } = useI18n();

  const minHeight = HEADER_HEIGHT + Platform.select({ ios: 0, default: SPACING })!;

  const floatingStyle = useAnimatedStyle(() => {
    const translateY = Math.min(-HEADER_HEIGHT, -(height - animatedPosition.value));
    return { transform: [{ translateY }] };
  });

  const contentStyle = [styles.content, isRTL && { direction: 'rtl' as const }];

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
        dimmedDetentIndex={1}
        style={contentStyle}
        detached
        dismissible={false}
        backgroundColor={DARK}
        header={<SheetHeader placeholder={t.search} isRTL={isRTL} />}>
        <View style={[styles.heading, isRTL && styles.rtlBlock]}>
          <Text style={styles.title}>{t.appName}</Text>
          <Text style={styles.subtitle}>{t.subtitle}</Text>
        </View>

        <SheetButton text={t.action1} onPress={() => {}} />
        <SheetButton text={t.action2} onPress={() => {}} />

        <View style={{ height: SPACING / 2 }} />

        <ButtonRow isRTL={isRTL}>
          <SheetButton text={t.expand} onPress={() => sheetRef.current?.resize(2)} />
          <SheetButton text={t.collapse} onPress={() => sheetRef.current?.resize(0)} />
        </ButtonRow>
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
    marginBottom: SPACING,
  },
  rtlBlock: {
    alignItems: 'flex-end',
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
