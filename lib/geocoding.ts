import type { CityId } from './cities';
import { CITIES } from './cities';
import type { Lang } from './i18n';

export type PlaceResult = {
  id: string;
  name: string;
  displayName: string;
  coordinate: [number, number];
  category?: string;
};

type NominatimFeature = {
  place_id: number;
  name: string;
  display_name: string;
  lon: string;
  lat: string;
  type?: string;
  class?: string;
};

export async function searchPlaces(
  query: string,
  { cityId, lang, signal }: { cityId: CityId; lang: Lang; signal: AbortSignal }
): Promise<PlaceResult[]> {
  const city = CITIES[cityId];
  const [west, north, east, south] = city.bbox;

  const params = new URLSearchParams({
    q: query,
    format: 'json',
    limit: '8',
    addressdetails: '0',
    viewbox: `${west},${north},${east},${south}`,
    bounded: '1',
  });

  const res = await fetch(`https://nominatim.openstreetmap.org/search?${params}`, {
    signal,
    headers: {
      'User-Agent': 'Istgah/1.0 (com.mohsendastaran.istgah)',
      'Accept-Language': lang === 'fa' ? 'fa,en' : 'en,fa',
    },
  });

  if (!res.ok) throw new Error(`Nominatim error: ${res.status}`);

  const json: NominatimFeature[] = await res.json();

  return json.map((f) => ({
    id: String(f.place_id),
    name: f.name || f.display_name.split(',')[0].trim(),
    displayName: f.display_name,
    coordinate: [parseFloat(f.lon), parseFloat(f.lat)] as [number, number],
    category: f.class,
  }));
}
