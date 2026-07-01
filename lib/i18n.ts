import { requireOptionalNativeModule } from 'expo-modules-core';
import * as React from 'react';
import { AppState, Platform } from 'react-native';

// ─── Translations ─────────────────────────────────────────────────────────────
const translations = {
  en: {
    appName: 'Istgah',
    subtitle: 'The true native bottom sheet experience.',
    search: 'Search...',
    action1: 'Action 1',
    action2: 'Action 2',
    expand: 'Expand',
    collapse: 'Collapse',
    confirm: 'Confirm',
    headerTitle: 'Istgah',
  },
  fa: {
    appName: 'ایستگاه',
    subtitle: 'تجربه واقعی برگه بومی در React Native.',
    search: 'جستجو...',
    action1: 'اکشن اول',
    action2: 'اکشن دوم',
    expand: 'گسترش',
    collapse: 'جمع‌کردن',
    confirm: 'تایید',
    headerTitle: 'ایستگاه',
  },
} as const;

export type Lang = keyof typeof translations;
export type Strings = (typeof translations)[Lang];

const RTL_LANGUAGES = new Set(['ar', 'fa', 'he', 'ur']);

type DeviceLocale = {
  languageCode: string;
  textDirection: 'ltr' | 'rtl';
};

type ExpoLocalizationModule = {
  getLocales: () => Array<{
    languageCode?: string | null;
    textDirection?: 'ltr' | 'rtl' | null;
  }>;
  addListener: (event: 'onLocaleSettingsChanged', listener: () => void) => { remove: () => void };
};

function readLocaleFromIntl(): DeviceLocale {
  const languageTag = Intl.DateTimeFormat().resolvedOptions().locale ?? 'en';
  const languageCode = languageTag.split('-')[0]?.toLowerCase() ?? 'en';

  return {
    languageCode,
    textDirection: RTL_LANGUAGES.has(languageCode) ? 'rtl' : 'ltr',
  };
}

function readDeviceLocale(): DeviceLocale {
  const localization = requireOptionalNativeModule<ExpoLocalizationModule>('ExpoLocalization');

  if (localization?.getLocales) {
    try {
      const locale = localization.getLocales()[0];
      const languageCode = locale?.languageCode ?? 'en';
      const textDirection =
        locale?.textDirection ?? (RTL_LANGUAGES.has(languageCode) ? 'rtl' : 'ltr');

      return { languageCode, textDirection };
    } catch {
      // Fall through to Intl when native module isn't ready yet.
    }
  }

  return readLocaleFromIntl();
}

function toI18n(locale: DeviceLocale) {
  const lang: Lang = locale.languageCode === 'fa' ? 'fa' : 'en';
  const isRTL = locale.textDirection === 'rtl';

  return { t: translations[lang], lang, isRTL };
}

export function useI18n(): { t: Strings; lang: Lang; isRTL: boolean } {
  const [locale, setLocale] = React.useState(readDeviceLocale);

  React.useEffect(() => {
    const localization = requireOptionalNativeModule<ExpoLocalizationModule>('ExpoLocalization');
    const refresh = () => setLocale(readDeviceLocale());

    const subscription = localization?.addListener?.('onLocaleSettingsChanged', refresh);

    const appStateSubscription =
      Platform.OS === 'android'
        ? AppState.addEventListener('change', (state) => {
            if (state === 'active') {
              refresh();
            }
          })
        : null;

    return () => {
      subscription?.remove();
      appStateSubscription?.remove();
    };
  }, []);

  return React.useMemo(() => toI18n(locale), [locale]);
}
