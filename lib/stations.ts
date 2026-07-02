export type Station = {
  id: string;
  name: { en: string; fa: string };
  line: string;
  lineColor: string;
  coordinates: [number, number]; // [longitude, latitude]
};

export const STATIONS: Station[] = [
  {
    id: 'teh-1',
    name: { en: 'Imam Khomeini', fa: 'امام خمینی' },
    line: 'Line 1',
    lineColor: '#e63946',
    coordinates: [51.4197, 35.6814],
  },
  {
    id: 'teh-2',
    name: { en: 'Mellat Park', fa: 'پارک ملت' },
    line: 'Line 1',
    lineColor: '#e63946',
    coordinates: [51.4087, 35.7609],
  },
  {
    id: 'teh-3',
    name: { en: 'Tajrish', fa: 'تجریش' },
    line: 'Line 1',
    lineColor: '#e63946',
    coordinates: [51.4317, 35.8069],
  },
  {
    id: 'teh-4',
    name: { en: 'Mirdamad', fa: 'میرداماد' },
    line: 'Line 1',
    lineColor: '#e63946',
    coordinates: [51.4362, 35.7597],
  },
  {
    id: 'teh-5',
    name: { en: 'Sadeghieh', fa: 'صادقیه' },
    line: 'Line 2',
    lineColor: '#457b9d',
    coordinates: [51.3296, 35.7197],
  },
  {
    id: 'teh-6',
    name: { en: 'Navvab', fa: 'نواب' },
    line: 'Line 2',
    lineColor: '#457b9d',
    coordinates: [51.3819, 35.7081],
  },
  {
    id: 'teh-7',
    name: { en: 'Shahid Beheshti', fa: 'شهید بهشتی' },
    line: 'Line 2',
    lineColor: '#457b9d',
    coordinates: [51.4512, 35.7298],
  },
  {
    id: 'teh-8',
    name: { en: 'Shahid Hemmat', fa: 'شهید همت' },
    line: 'Line 3',
    lineColor: '#2a9d8f',
    coordinates: [51.3744, 35.7483],
  },
  {
    id: 'teh-9',
    name: { en: 'Azadegan', fa: 'آزادگان' },
    line: 'Line 4',
    lineColor: '#e9c46a',
    coordinates: [51.3131, 35.6742],
  },
  {
    id: 'teh-10',
    name: { en: 'Ershad', fa: 'ارشاد' },
    line: 'Line 4',
    lineColor: '#e9c46a',
    coordinates: [51.3483, 35.6869],
  },
  {
    id: 'teh-11',
    name: { en: 'Tehran Railway Station', fa: 'راه آهن' },
    line: 'Line 5',
    lineColor: '#f4a261',
    coordinates: [51.3819, 35.6683],
  },
  {
    id: 'teh-12',
    name: { en: 'Mohammadiyeh', fa: 'محمدیه' },
    line: 'Line 1',
    lineColor: '#e63946',
    coordinates: [51.4261, 35.6714],
  },
];

export function toGeoJSON(stations: Station[]) {
  return {
    type: 'FeatureCollection' as const,
    features: stations.map((s) => ({
      type: 'Feature' as const,
      properties: {
        id: s.id,
        nameEn: s.name.en,
        nameFa: s.name.fa,
        line: s.line,
        lineColor: s.lineColor,
      },
      geometry: {
        type: 'Point' as const,
        coordinates: s.coordinates,
      },
    })),
  };
}
