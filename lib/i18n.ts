import { requireOptionalNativeModule } from 'expo-modules-core';
import * as React from 'react';
import { AppState, Platform } from 'react-native';

// ─── Translations ─────────────────────────────────────────────────────────────
const translations = {
  en: {
    appName: 'Istgah',
    subtitle: 'The true native bottom sheet experience.',
    search: 'Search...',
    english: 'English',
    persian: 'Persian',
    expand: 'Expand',
    collapse: 'Collapse',
    confirm: 'Confirm',
    headerTitle: 'Istgah',
    distance: 'Distance',
    duration: 'Duration',
    getDirections: 'Get Directions',
    locateYourselfFirst: 'Locate yourself first',
    clearRoute: 'Clear Route',
    backToList: 'Back to List',
    openInGoogleMaps: 'Open in Google Maps',
  },
  fa: {
    appName: 'ایستگاه',
    subtitle: 'تجربه واقعی برگه بومی در React Native.',
    search: 'جستجو...',
    english: 'انگلیسی',
    persian: 'فارسی',
    expand: 'گسترش',
    collapse: 'جمع‌کردن',
    confirm: 'تایید',
    headerTitle: 'ایستگاه',
    distance: 'مسافت',
    duration: 'زمان',
    getDirections: 'مسیریابی',
    locateYourselfFirst: 'موقعیت شما یافت نشد',
    clearRoute: 'حذف مسیر',
    backToList: 'بازگشت به لیست',
    openInGoogleMaps: 'باز کردن در گوگل مپ',
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

type I18nContextValue = {
  t: Strings;
  lang: Lang;
  isRTL: boolean;
  setLang: (lang: Lang) => void;
};

const I18nContext = React.createContext<I18nContextValue | null>(null);

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

function deviceLocaleToLang(locale: DeviceLocale): Lang {
  return locale.languageCode === 'fa' ? 'fa' : 'en';
}

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLang] = React.useState<Lang>(() => deviceLocaleToLang(readDeviceLocale()));

  React.useEffect(() => {
    const localization = requireOptionalNativeModule<ExpoLocalizationModule>('ExpoLocalization');
    const refresh = () => setLang(deviceLocaleToLang(readDeviceLocale()));

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

  const value = React.useMemo<I18nContextValue>(
    () => ({
      t: translations[lang],
      lang,
      isRTL: lang === 'fa',
      setLang,
    }),
    [lang]
  );

  return React.createElement(I18nContext.Provider, { value }, children);
}

export function useI18n(): I18nContextValue {
  const context = React.useContext(I18nContext);
  if (!context) {
    throw new Error('useI18n must be used within I18nProvider');
  }
  return context;
}
