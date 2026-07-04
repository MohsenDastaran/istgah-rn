export type CityId = 'tehran' | 'isfahan' | 'mashhad' | 'tabriz' | 'karaj' | 'shiraz';

export type City = {
  id: CityId;
  name: { en: string; fa: string };
  center: [number, number];
  zoom: number;
};

export const CITIES: Record<CityId, City> = {
  tehran: {
    id: 'tehran',
    name: { en: 'Tehran', fa: 'تهران' },
    center: [51.39, 35.72],
    zoom: 12,
  },
  isfahan: {
    id: 'isfahan',
    name: { en: 'Isfahan', fa: 'اصفهان' },
    center: [51.67, 32.65],
    zoom: 12,
  },
  mashhad: {
    id: 'mashhad',
    name: { en: 'Mashhad', fa: 'مشهد' },
    center: [59.61, 36.3],
    zoom: 12,
  },
  tabriz: {
    id: 'tabriz',
    name: { en: 'Tabriz', fa: 'تبریز' },
    center: [46.29, 38.08],
    zoom: 12,
  },
  karaj: {
    id: 'karaj',
    name: { en: 'Karaj', fa: 'کرج' },
    center: [50.99, 35.84],
    zoom: 12,
  },
  shiraz: {
    id: 'shiraz',
    name: { en: 'Shiraz', fa: 'شیراز' },
    center: [52.53, 29.59],
    zoom: 12,
  },
};

export const CITY_IDS = Object.keys(CITIES) as CityId[];

export const DEFAULT_CITY_ID: CityId = 'tehran';

export function isCityId(value: string): value is CityId {
  return value in CITIES;
}
