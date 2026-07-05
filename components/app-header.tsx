import { SettingsPanel } from '@/components/settings-panel';
import { StationLayerToggle } from '@/components/station-layer-toggle';
import { Text } from '@/components/ui/text';
import { useI18n } from '@/lib/i18n';
import { Platform, StyleSheet, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const HEADER_HEIGHT = 44;
const COMPACT_WIDTH = 390;

export function AppHeader() {
  const insets = useSafeAreaInsets();
  const { t } = useI18n();
  const { width } = useWindowDimensions();
  const compact = width < COMPACT_WIDTH;

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <View style={[styles.bar, compact && styles.barCompact]}>
        <View style={styles.side} pointerEvents="box-none">
          <Text
            className={`text-foreground font-bold ${compact ? 'text-[15px]' : 'text-[17px]'}`}
            numberOfLines={1}
            style={styles.title}>
            {t.headerTitle}
          </Text>
        </View>

        <View style={styles.center} pointerEvents="box-none">
          <StationLayerToggle />
        </View>

        <View style={[styles.side, styles.sideEnd]} pointerEvents="box-none">
          <SettingsPanel />
        </View>
      </View>
    </View>
  );
}

export const APP_HEADER_HEIGHT = HEADER_HEIGHT;

const styles = StyleSheet.create({
  root: {
    backgroundColor: 'transparent',
  },
  bar: {
    height: HEADER_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    position: 'relative',
  },
  barCompact: {
    paddingHorizontal: 12,
  },
  side: {
    flex: 1,
    minWidth: 0,
    zIndex: 1,
    justifyContent: 'center',
  },
  sideEnd: {
    alignItems: 'flex-end',
    flexShrink: 0,
  },
  center: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
    pointerEvents: 'box-none',
  },
  title: {
    flexShrink: 1,
    letterSpacing: Platform.select({ ios: -0.3, default: 0 }),
  },
});
