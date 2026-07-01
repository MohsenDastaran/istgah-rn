import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { useI18n } from '@/lib/i18n';
import { Stack } from 'expo-router';
import { MoonStarIcon, SunIcon } from 'lucide-react-native';
import * as React from 'react';
import { StyleSheet, TurboModuleRegistry, View } from 'react-native';
import { Uniwind, useUniwind } from 'uniwind';

const BLUE = '#3784d7';

const isTrueSheetLinked = !!TurboModuleRegistry.get('TrueSheetModule');
const SheetSection = isTrueSheetLinked
  ? require('@/components/sheet-section').SheetSection
  : null;

export default function Screen() {
  const { t } = useI18n();

  return (
    <>
      <Stack.Screen
        options={{
          title: t.headerTitle,
          headerTransparent: true,
          headerRight: () => <ThemeToggle />,
        }}
      />
      <View style={styles.container}>
        {SheetSection && <SheetSection />}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BLUE,
  },
});

const THEME_ICONS = {
  light: SunIcon,
  dark: MoonStarIcon,
};

function ThemeToggle() {
  const { theme } = useUniwind();

  function toggleTheme() {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    Uniwind.setTheme(newTheme);
  }

  return (
    <Button
      onPressIn={toggleTheme}
      size="icon"
      variant="ghost"
      className="ios:size-9 web:mx-4 rounded-full">
      <Icon as={THEME_ICONS[theme ?? 'light']} className="size-5" />
    </Button>
  );
}
