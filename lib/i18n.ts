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
    search: 'Search Stations and Places...',
    english: 'English',
    persian: 'Persian',
    expand: 'Expand',
    collapse: 'Collapse',
    confirm: 'Confirm',
    headerTitle: 'Istgah',
    distance: 'Distance',
    duration: 'Duration',
    getDirections: 'Get Directions',
    driveThere: 'Drive there',
    drivingOnly: 'Car route only',
    locateYourselfFirst: 'Locate yourself first',
    clearRoute: 'Clear Route',
    backToList: 'Back to List',
    openInMaps: 'Open in Maps',
    defaultCity: 'Default city',
    metroStations: 'Metro Stations',
    brtStops: 'BRT Stops',
    busStops: 'Bus Stops',
    noResults: 'No results',
    noResultsHint: 'Try a different keyword, or search to find bus stops.',
    emptyListTitle: 'No stations to show',
    emptyListHint: 'Enable Metro or BRT using the toggles above, or search to find bus stops.',
    searching: 'Searching…',
    layerMetro: 'Metro',
    layerBrt: 'BRT',
    layerBus: 'Bus',
    busLines: 'Lines',
    direction: 'Direction',
    stationCode: 'Code',
    brtLine: 'BRT line',
    address: 'Address',
    seat: 'Seat',
    shelter: 'Shelter',
    light: 'Lighting',
    disabledAccess: 'Wheelchair access',
    transportMode: 'Vehicle type',
    amenities: 'Amenities',
    facilityYes: 'Yes',
    facilityNo: 'No',
    facilityNeeded: 'Needed',
    settings: 'Settings',
    language: 'Language',
    theme: 'Theme',
    themeLight: 'Light',
    themeDark: 'Dark',
    mapStyle: 'Map style',
    basemapStreet: 'Street',
    basemapSatellite: 'Satellite',
    satelliteVpnNote: 'Satellite view loads online tiles — may need VPN inside Iran.',
    reportIssue: 'Report an Issue',
    reportIssueDescription:
      'Found a bug, a missing station or stop, or want to suggest a feature? You can report it directly on GitHub.',
    reportIssueBody:
      'Please describe the issue in as much detail as you can. If a station or bus stop is missing from the map, include its name, city, and approximate location. For bugs, say what you expected, what happened, and how to reproduce it.',
    cancel: 'Cancel',
    openGitHubIssues: 'Open GitHub Issues',
    about: 'About',
    aboutTitle: 'About Istgah',
    aboutDescription:
      'Public transit companion for Iran — metro, BRT & bus on one map. Offline-ready, bilingual, and open source.',
    developer: 'Developer',
    developerName: 'Mohsen Dastaran',
    whatIsIstgah: 'What is Istgah?',
    aboutBody:
      'Istgah (ایستگاه, meaning "Station") helps you explore public transit across Iran. Browse stations on an interactive map, search in Persian or English, and get directions from your current location.',
    aboutFeaturesTitle: 'Highlights',
    aboutFeatureMetroBrtBus: 'Metro, BRT & regular bus stops with layer toggles',
    aboutFeatureMultiCity: 'Six cities: Tehran, Isfahan, Mashhad, Tabriz, Karaj & Shiraz',
    aboutFeatureRouting: 'In-app routing (OSRM) and open in device maps',
    aboutFeatureI18n: 'Persian & English with full RTL support',
    aboutFeatureTheme: 'Light and dark themes',
    aboutFeatureSatelliteBasemap: 'Street and satellite map styles in Settings',
    aboutFeaturePlaceSearch: 'Search addresses and landmarks via OpenStreetMap',
    developerGitHub: "Developer's GitHub Profile",
    appSourceCode: 'App Source Code',
    clearSearch: 'Clear search',
    closeSheet: 'Close sheet',
    places: 'Places',
    searchingPlaces: 'Searching places…',
    layerPlace: 'Place',
    noPlacesFound: 'No places found',
    placeSearchHint: 'Search for addresses and landmarks',
    placeSearchVpnNote: 'Online — may need VPN inside Iran',
    transitColumn: 'Transit Stations',
    nextArrivalBus: 'When is the next bus arriving?',
    nextArrivalBrt: 'When is the next BRT arriving?',
    nextArrivalHint: 'Dial *137*3*7*1# and paste the station code',
    km: 'km',
    min: 'min',
    openSettings: 'Open Settings',
    locationPermissionTitle: 'Location access needed',
    locationPermissionMessage:
      'Allow Istgah to use your location so the map can show where you are.',
    locationServicesOffTitle: 'Turn on location',
    locationServicesOffMessage:
      'Location services are turned off on this device. Enable them in Settings to use your position on the map.',
  },
  fa: {
    appName: 'ایستگاه',
    search: 'جستجوی ایستگاه‌ها و مکان‌ها...',
    english: 'انگلیسی',
    persian: 'فارسی',
    expand: 'گسترش',
    collapse: 'جمع‌کردن',
    confirm: 'تایید',
    headerTitle: 'ایستگاه',
    distance: 'مسافت',
    duration: 'زمان',
    getDirections: 'مسیریابی',
    driveThere: 'مسیریابی خودرو',
    drivingOnly: 'فقط مسیر خودرو',
    locateYourselfFirst: 'موقعیت شما یافت نشد',
    clearRoute: 'حذف مسیر',
    backToList: 'بازگشت به لیست',
    openInMaps: 'باز کردن در نقشه',
    defaultCity: 'شهر پیش‌فرض',
    metroStations: 'ایستگاه‌های مترو',
    brtStops: 'ایستگاه‌های BRT',
    busStops: 'ایستگاه‌های اتوبوس',
    noResults: 'نتیجه‌ای یافت نشد',
    noResultsHint: 'عبارت دیگری امتحان کنید یا برای یافتن ایستگاه‌های اتوبوس جستجو کنید.',
    emptyListTitle: 'ایستگاهی برای نمایش نیست',
    emptyListHint:
      'مترو یا BRT را از دکمه‌های بالا فعال کنید، یا برای یافتن ایستگاه‌های اتوبوس جستجو کنید.',
    searching: 'در حال جستجو…',
    layerMetro: 'مترو',
    layerBrt: 'BRT',
    layerBus: 'اتوبوس',
    busLines: 'خطوط',
    direction: 'جهت',
    stationCode: 'کد',
    brtLine: 'خط BRT',
    address: 'آدرس',
    seat: 'نیمکت',
    shelter: 'سایه‌بان',
    light: 'روشنایی',
    disabledAccess: 'دسترسی معلولین',
    transportMode: 'نوع وسیله',
    amenities: 'امکانات',
    facilityYes: 'دارد',
    facilityNo: 'ندارد',
    facilityNeeded: 'نیاز',
    settings: 'تنظیمات',
    language: 'زبان',
    theme: 'تم',
    themeLight: 'روشن',
    themeDark: 'تیره',
    mapStyle: 'نمای نقشه',
    basemapStreet: 'خیابانی',
    basemapSatellite: 'ماهواره‌ای',
    satelliteVpnNote: 'نمای ماهواره‌ای ممکن است به VPN نیاز داشته باشد.',
    reportIssue: 'گزارش مشکل',
    reportIssueDescription:
      'باگ دیدید، ایستگاهی روی نقشه نیست، یا پیشنهادی دارید؟ می‌توانید مستقیماً در گیت‌هاب گزارش دهید.',
    reportIssueBody:
      'لطفاً با جزئیات بنویسید. اگر ایستگاهی روی نقشه نیست، نام، شهر و در صورت امکان محل تقریبی را ذکر کنید. برای باگ، بگویید چه انتظاری داشتید، چه اتفاقی افتاد و چگونه تکرار می‌شود.',
    cancel: 'لغو',
    openGitHubIssues: 'باز کردن Issue در گیت‌هاب',
    about: 'درباره',
    aboutTitle: 'درباره ایستگاه',
    aboutDescription:
      'اپ همراه حمل‌ونقل عمومی ایران — مترو، BRT و اتوبوس روی یک نقشه. آفلاین، دوزبانه و متن‌باز.',
    developer: 'توسعه‌دهنده',
    developerName: 'محسن دستاران',
    whatIsIstgah: 'ایستگاه چیست؟',
    aboutBody:
      'ایستگاه (Istgah) برای کاوش حمل‌ونقل عمومی در ایران طراحی شده است. ایستگاه‌ها را روی نقشه ببینید، به فارسی یا انگلیسی جستجو کنید و از موقعیت فعلی‌تان مسیریابی کنید.',
    aboutFeaturesTitle: 'ویژگی‌ها',
    aboutFeatureMetroBrtBus: 'ایستگاه مترو، BRT و اتوبوس با کلید روشن/خاموش لایه‌ها',
    aboutFeatureMultiCity: '۶ شهر: تهران، اصفهان، مشهد، تبریز، کرج و شیراز',
    aboutFeatureRouting: 'مسیریابی درون‌برنامه (OSRM) و برون‌برنامه‌ای',
    aboutFeatureI18n: 'فارسی و انگلیسی با پشتیبانی کامل RTL',
    aboutFeatureTheme: 'تم روشن و تاریک',
    aboutFeatureSatelliteBasemap: 'نمای خیابانی و ماهواره‌ای نقشه در تنظیمات',
    aboutFeaturePlaceSearch: 'جستجوی آدرس و مکان با API اوپن‌استریت‌مپ',
    developerGitHub: 'پروفایل گیت‌هاب توسعه‌دهنده',
    appSourceCode: 'کد منبع برنامه',
    clearSearch: 'پاک کردن جستجو',
    closeSheet: 'بستن پنل',
    places: 'مکان‌ها',
    searchingPlaces: 'در حال جستجوی مکان…',
    layerPlace: 'مکان',
    noPlacesFound: 'مکانی یافت نشد',
    placeSearchHint: 'جستجوی آدرس و مکان',
    placeSearchVpnNote: 'ممکن است به VPN نیاز باشد',
    transitColumn: 'ایستگاه‌های حمل‌ونقل عمومی ',
    nextArrivalBus: 'اتوبوس بعدی کی می‌رسد؟',
    nextArrivalBrt: 'اتوبوس بعدی کی می‌رسد؟',
    nextArrivalHint: '*137*3*7*1# را بگیرید و کد ایستگاه را وارد کنید',
    km: 'کیلومتر',
    min: 'دقیقه',
    openSettings: 'باز کردن تنظیمات',
    locationPermissionTitle: 'دسترسی به موقعیت',
    locationPermissionMessage:
      'برای نمایش موقعیت شما روی نقشه، به ایستگاه اجازه دسترسی به موقعیت بدهید.',
    locationServicesOffTitle: 'موقعیت‌یابی را روشن کنید',
    locationServicesOffMessage:
      'سرویس موقعیت‌یابی روی دستگاه خاموش است. برای استفاده از موقعیت خود روی نقشه، آن را در تنظیمات فعال کنید.',
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
  const languageTag = Intl.DateTimeFormat().resolvedOptions().locale ?? 'fa';
  const languageCode = languageTag.split('-')[0]?.toLowerCase() ?? 'fa';

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
      const languageCode = locale?.languageCode ?? 'fa';
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
  return locale.languageCode === 'en' ? 'en' : 'fa';
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
