import AsyncStorageModule from '@react-native-async-storage/async-storage';
// The native module may be absent in an older dev build (before `npx expo run:android`).
// Use optional chaining everywhere so the app doesn't crash — persistence just won't
// work until the app is rebuilt with the new native module included.
const AsyncStorage = AsyncStorageModule ?? null;
import { requireOptionalNativeModule } from 'expo-modules-core';
import * as React from 'react';
import { AppState, Platform } from 'react-native';

const LANG_STORAGE_KEY = '@istgah/lang';

// ─── Translations ─────────────────────────────────────────────────────────────
const translations = {
  en: {
    appName: 'Istgah',
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
    openInMaps: 'Open in Maps',
    defaultCity: 'Default city',
    metroStations: 'Metro Stations',
    brtStops: 'BRT Stops',
    busStops: 'Bus Stops',
    noResults: 'No results',
    searching: 'Searching…',
  },
  fa: {
    appName: 'ایستگاه',
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
    openInMaps: 'باز کردن در نقشه',
    defaultCity: 'شهر پیش‌فرض',
    metroStations: 'ایستگاه‌های مترو',
    brtStops: 'ایستگاه‌های BRT',
    busStops: 'ایستگاه‌های اتوبوس',
    noResults: 'نتیجه‌ای یافت نشد',
    searching: 'در حال جستجو…',
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
  const [lang, setLangState] = React.useState<Lang>(() => deviceLocaleToLang(readDeviceLocale()));

  // On mount, load persisted preference (overrides device locale if set)
  React.useEffect(() => {
    AsyncStorage?.getItem(LANG_STORAGE_KEY).then((saved) => {
      if (saved === 'en' || saved === 'fa') {
        setLangState(saved);
      }
    });
  }, []);

  // Listen for device locale changes (only applies when no manual override)
  React.useEffect(() => {
    const localization = requireOptionalNativeModule<ExpoLocalizationModule>('ExpoLocalization');
    const refresh = () => {
      if (AsyncStorage) {
        AsyncStorage.getItem(LANG_STORAGE_KEY).then((saved) => {
          if (!saved) setLangState(deviceLocaleToLang(readDeviceLocale()));
        });
      } else {
        setLangState(deviceLocaleToLang(readDeviceLocale()));
      }
    };

    const subscription = localization?.addListener?.('onLocaleSettingsChanged', refresh);
    const appStateSubscription =
      Platform.OS === 'android'
        ? AppState.addEventListener('change', (state) => {
            if (state === 'active') refresh();
          })
        : null;

    return () => {
      subscription?.remove();
      appStateSubscription?.remove();
    };
  }, []);

  const setLang = React.useCallback((newLang: Lang) => {
    setLangState(newLang);
    AsyncStorage?.setItem(LANG_STORAGE_KEY, newLang);
  }, []);

  const value = React.useMemo<I18nContextValue>(
    () => ({
      t: translations[lang],
      lang,
      isRTL: lang === 'fa',
      setLang,
    }),
    [lang, setLang]
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
