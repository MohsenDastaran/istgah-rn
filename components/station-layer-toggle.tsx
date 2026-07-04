import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Text } from '@/components/ui/text';
import { useI18n } from '@/lib/i18n';
import { LAYER_KEYS, useMapLayers, type LayerKey } from '@/lib/map-layers-context';
import { Bus, TrainFront } from 'lucide-react-native';
import { View } from 'react-native';

const LAYER_META: Record<LayerKey, { icon: typeof TrainFront; labelKey: 'layerMetro' | 'layerBrt' | 'layerBus' }> = {
  metro: { icon: TrainFront, labelKey: 'layerMetro' },
  brt: { icon: Bus, labelKey: 'layerBrt' },
  bus: { icon: Bus, labelKey: 'layerBus' },
};

export function StationLayerToggle() {
  const { t } = useI18n();
  const { visibleLayers, setVisibleLayers } = useMapLayers();

  return (
    <ToggleGroup
      type="multiple"
      value={LAYER_KEYS.filter((k) => visibleLayers.has(k))}
      onValueChange={(keys) => setVisibleLayers(keys as LayerKey[])}
      variant="outline"
      size="sm"
      className="border-white/20 bg-black/30">
      {LAYER_KEYS.map((key, index) => {
        const Icon = LAYER_META[key].icon;
        return (
          <ToggleGroupItem
            key={key}
            value={key}
            isFirst={index === 0}
            isLast={index === LAYER_KEYS.length - 1}
            className="px-2">
            <View className="flex-row items-center gap-1">
              <Icon size={13} color="white" strokeWidth={2.25} />
              <Text className="text-xs text-white">{t[LAYER_META[key].labelKey]}</Text>
            </View>
          </ToggleGroupItem>
        );
      })}
    </ToggleGroup>
  );
}
