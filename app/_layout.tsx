import '@/global.css';

import { NAV_THEME } from '@/lib/theme';
import { CityProvider } from '@/lib/city-context';
import { I18nProvider } from '@/lib/i18n';
import { StationsProvider } from '@/lib/stations-context';
import { ThemeProvider } from 'expo-router/react-navigation';
import { PortalHost } from '@rn-primitives/portal';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useUniwind } from 'uniwind';

export {
  ErrorBoundary,
} from 'expo-router';

export default function RootLayout() {
  const { theme } = useUniwind();

  return (
    <I18nProvider>
      <CityProvider>
        <StationsProvider>
          <ThemeProvider value={NAV_THEME[theme ?? 'light']}>
            <StatusBar style="light" />
            <Stack />
            <PortalHost />
          </ThemeProvider>
        </StationsProvider>
      </CityProvider>
    </I18nProvider>
  );
}
