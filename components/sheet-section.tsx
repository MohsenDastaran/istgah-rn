import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Text } from '@/components/ui/text';
import { TrueSheet } from '@lodev09/react-native-true-sheet';
import * as React from 'react';
import { View } from 'react-native';

export function SheetSection() {
  const sheet = React.useRef<TrueSheet>(null);

  const presentSheet = async () => {
    await sheet.current?.present();
  };

  const dismissSheet = async () => {
    await sheet.current?.dismiss();
  };

  return (
    <>
      <Button onPress={presentSheet}>
        <Text>Open Sheet</Text>
      </Button>

      <TrueSheet ref={sheet} detents={['auto', 1]}>
        <View className="gap-4 p-6">
          <Text className="text-lg font-semibold">TrueSheet</Text>
          <Text className="text-muted-foreground">
            Drag the sheet up to expand, or tap below to dismiss.
          </Text>
          <Input placeholder="Enter your name" />
          <Button onPress={dismissSheet}>
            <Text>Dismiss</Text>
          </Button>
        </View>
      </TrueSheet>
    </>
  );
}
