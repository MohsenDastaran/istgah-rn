import { useI18n } from '@/lib/i18n';
import { LAYER_KEYS, useMapLayers, type LayerKey } from '@/lib/map-layers-context';
import { Bus, TrainFront } from 'lucide-react-native';
import * as React from 'react';
import { Platform, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';

const COMPACT_WIDTH = 390;

const LAYER_META: Record<
  LayerKey,
  { icon: typeof TrainFront; labelKey: 'layerMetro' | 'layerBrt' | 'layerBus' }
> = {
  metro: { icon: TrainFront, labelKey: 'layerMetro' },
  brt: { icon: Bus, labelKey: 'layerBrt' },
  bus: { icon: Bus, labelKey: 'layerBus' },
};

const ICON_ACTIVE = '#ffffff';
const ICON_INACTIVE = 'rgba(255, 255, 255, 0.5)';

export function StationLayerToggle() {
  const { t, isRTL } = useI18n();
  const { visibleLayers, toggleLayer } = useMapLayers();
  const { width } = useWindowDimensions();
  const compact = width < COMPACT_WIDTH;
  const lastIndex = LAYER_KEYS.length - 1;

  const trackRadius = compact ? 16 : 20;
  const roundStart = isRTL
    ? { borderTopRightRadius: trackRadius, borderBottomRightRadius: trackRadius }
    : { borderTopLeftRadius: trackRadius, borderBottomLeftRadius: trackRadius };
  const roundEnd = isRTL
    ? { borderTopLeftRadius: trackRadius, borderBottomLeftRadius: trackRadius }
    : { borderTopRightRadius: trackRadius, borderBottomRightRadius: trackRadius };

  return (
    <View style={[styles.track, compact && styles.trackCompact, isRTL && styles.trackRTL]}>
      {LAYER_KEYS.map((key, index) => {
        const selected = visibleLayers.has(key);
        const prevKey = index > 0 ? LAYER_KEYS[index - 1] : null;
        const prevSelected = prevKey ? visibleLayers.has(prevKey) : false;
        const showDivider = index > 0 && !selected && !prevSelected;
        const Icon = LAYER_META[key].icon;
        const isFirst = index === 0;
        const isLast = index === lastIndex;

        return (
          <React.Fragment key={key}>
            {showDivider ? (
              <View style={[styles.divider, compact && styles.dividerCompact]} />
            ) : null}
            <Pressable
              onPress={() => toggleLayer(key)}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              accessibilityLabel={t[LAYER_META[key].labelKey]}
              style={({ pressed }) => [
                styles.segment,
                compact && styles.segmentCompact,
                isFirst && roundStart,
                isLast && roundEnd,
                selected && styles.segmentSelected,
                pressed && !selected && styles.segmentPressed,
                pressed && selected && styles.segmentSelectedPressed,
              ]}>
              <Icon
                size={compact ? 13 : 15}
                color={selected ? ICON_ACTIVE : ICON_INACTIVE}
                strokeWidth={selected ? 2.75 : 2}
              />
              <Text
                style={[
                  styles.label,
                  compact && styles.labelCompact,
                  selected ? styles.labelActive : styles.labelInactive,
                ]}>
                {t[LAYER_META[key].labelKey]}
              </Text>
            </Pressable>
          </React.Fragment>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(14, 16, 20, 0.94)',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.14)',
    padding: 3,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.4,
        shadowRadius: 6,
      },
      android: { elevation: 6 },
    }),
  },
  trackCompact: {
    borderRadius: 18,
    padding: 2,
  },
  trackRTL: {
    flexDirection: 'row-reverse',
  },
  segment: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 13,
    paddingVertical: 8,
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  segmentCompact: {
    gap: 4,
    paddingHorizontal: 9,
    paddingVertical: 5,
  },
  segmentSelected: {
    backgroundColor: 'rgba(255, 255, 255, 0.22)',
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  segmentPressed: {
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
  },
  segmentSelectedPressed: {
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
  },
  divider: {
    width: StyleSheet.hairlineWidth,
    height: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.22)',
  },
  dividerCompact: {
    height: 14,
  },
  label: {
    fontSize: 13,
  },
  labelCompact: {
    fontSize: 11,
  },
  labelActive: {
    color: '#fff',
    fontWeight: '700',
    letterSpacing: 0.15,
  },
  labelInactive: {
    color: 'rgba(255, 255, 255, 0.52)',
    fontWeight: '500',
  },
});
