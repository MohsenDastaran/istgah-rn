export type CityId = 'tehran' | 'isfahan' | 'mashhad' | 'tabriz' | 'karaj' | 'shiraz';

export type City = {
  id: CityId;
  name: { en: string; fa: string };
  center: [number, number];
  zoom: number;
  /** Nominatim viewbox: [lon_min, lat_max, lon_max, lat_min] */
  bbox: [number, number, number, number];
};

export const CITIES: Record<CityId, City> = {
  tehran: {
    id: 'tehran',
    name: { en: 'Tehran', fa: 'تهران' },
    center: [51.39, 35.72],
    zoom: 12,
    bbox: [51.1, 35.85, 51.75, 35.55],
  },
  isfahan: {
    id: 'isfahan',
    name: { en: 'Isfahan', fa: 'اصفهان' },
    center: [51.67, 32.65],
    zoom: 12,
    bbox: [51.5, 32.85, 51.85, 32.5],
  },
  mashhad: {
    id: 'mashhad',
    name: { en: 'Mashhad', fa: 'مشهد' },
    center: [59.61, 36.3],
    zoom: 12,
    bbox: [59.4, 36.45, 59.75, 36.2],
  },
  tabriz: {
    id: 'tabriz',
    name: { en: 'Tabriz', fa: 'تبریز' },
    center: [46.29, 38.08],
    zoom: 12,
    bbox: [46.1, 38.2, 46.45, 37.95],
  },
  karaj: {
    id: 'karaj',
    name: { en: 'Karaj', fa: 'کرج' },
    center: [50.99, 35.84],
    zoom: 12,
    bbox: [50.8, 35.95, 51.15, 35.7],
  },
  shiraz: {
    id: 'shiraz',
    name: { en: 'Shiraz', fa: 'شیراز' },
    center: [52.53, 29.59],
    zoom: 12,
    bbox: [52.35, 29.75, 52.65, 29.5],
  },
};

export const CITY_IDS = Object.keys(CITIES) as CityId[];

export const DEFAULT_CITY_ID: CityId = 'tehran';

export function isCityId(value: string): value is CityId {
  return value in CITIES;
}

/** Maps metro dataset `City` field (English) to a localized label. */
const METRO_CITY_NAMES: Record<string, CityId> = {
  Tehran: 'tehran',
  Isfahan: 'isfahan',
  Mashhad: 'mashhad',
  Tabriz: 'tabriz',
  Karaj: 'karaj',
  Shiraz: 'shiraz',
};

export function cityLabelFromName(cityName: string, lang: 'en' | 'fa'): string {
  const id = METRO_CITY_NAMES[cityName.trim()];
  if (id) return CITIES[id].name[lang];
  return cityName;
}
