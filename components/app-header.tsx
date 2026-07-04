import { SettingsPanel } from '@/components/settings-panel';
import { StationLayerToggle } from '@/components/station-layer-toggle';
import { useI18n } from '@/lib/i18n';
import { Platform, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const HEADER_HEIGHT = 44;

export function AppHeader() {
  const insets = useSafeAreaInsets();
  const { t } = useI18n();

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <View style={styles.bar}>
        <View style={styles.side}>
          <Text style={styles.title} numberOfLines={1}>
            {t.headerTitle}
          </Text>
        </View>

        <View style={styles.center} pointerEvents="box-none">
          <StationLayerToggle />
        </View>

        <View style={[styles.side, styles.sideEnd]}>
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
  },
  side: {
    flex: 1,
    zIndex: 1,
    justifyContent: 'center',
  },
  sideEnd: {
    alignItems: 'flex-end',
  },
  center: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 0,
    // Let taps pass through the empty overlay area to the map.
    pointerEvents: 'box-none',
  },
  title: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: Platform.select({ ios: -0.3, default: 0 }),
  },
});
