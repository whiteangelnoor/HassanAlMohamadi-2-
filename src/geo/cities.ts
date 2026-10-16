// Offline city search over the bundled GeoNames extract. AGPL-3.0-or-later.

import { CITIES, COUNTRIES, ZONES } from './cities.data';

export interface City {
  name: string; // Latin name from GeoNames
  arabicName: string; // empty when GeoNames has no Arabic name
  country: string; // ISO code
  countryName: string; // Arabic
  lat: number;
  lon: number;
  timeZone: string; // IANA name
  population: number;
}

interface Entry {
  city: City;
  keys: string[];
}

let entries: Entry[] | null = null;

/** Folds the spelling differences people do not type consistently. */
function decompose(s: string): string {
  try {
    return s.normalize('NFD');
  } catch {
    return s;
  }
}

export function normalize(s: string): string {
  return decompose(s.toLowerCase())
    .replace(/[̀-ͯ]/g, '') // Latin accents
    .replace(/[\u064b-\u0655\u0670\u0640]/g, '') // Arabic diacritics, hamza marks, tatweel
    .replace(/[آأإٱ]/g, 'ا') // alef forms
    .replace(/ة/g, 'ه') // taa marbuta -> haa
    .replace(/ى/g, 'ي') // alef maqsura -> yaa
    .replace(/[ؤ]/g, 'و')
    .replace(/[ئ]/g, 'ي')
    .replace(/[\s\-'’`.,()/]+/g, ' ')
    .trim();
}

/** Arabic names are also searchable without the article "ال". */
function withoutArticle(s: string): string {
  return s.startsWith('ال') && s.length > 3 ? s.slice(2) : s;
}

function load(): Entry[] {
  if (entries) {
    return entries;
  }
  entries = CITIES.split('\n').map(line => {
    const [name, arabicName, country, lat, lon, zone, population] =
      line.split('\t');
    const city: City = {
      name,
      arabicName,
      country,
      countryName: COUNTRIES[country] ?? country,
      lat: parseFloat(lat),
      lon: parseFloat(lon),
      timeZone: ZONES[parseInt(zone, 10)],
      population: parseInt(population, 10),
    };
    const keys = [normalize(name)];
    if (arabicName) {
      const ar = normalize(arabicName);
      keys.push(ar, withoutArticle(ar));
    }
    return { city, keys };
  });
  return entries;
}

/**
 * Cities whose name starts with the query (or with a word of it), largest
 * first. Exact matches come before prefix matches.
 */
export function searchCities(query: string, limit = 30): City[] {
  const q = normalize(query);
  if (q.length < 2) {
    return [];
  }
  const qa = withoutArticle(q);
  const exact: City[] = [];
  const prefix: City[] = [];
  for (const { city, keys } of load()) {
    if (keys.some(k => k === q || k === qa)) {
      exact.push(city);
    } else if (
      keys.some(k => k.startsWith(q) || k.startsWith(qa) || k.includes(' ' + q))
    ) {
      prefix.push(city);
    }
    if (exact.length >= limit) {
      break;
    }
  }
  // CITIES is already sorted by population, so both lists are too.
  return exact.concat(prefix).slice(0, limit);
}

export function cityLabel(c: City): string {
  return c.arabicName || c.name;
}

/** The bundled city closest to a point (for its time zone). */
export function nearestCity(lat: number, lon: number): City {
  const rad = Math.PI / 180;
  let best: City | null = null;
  let bestD = Infinity;
  for (const { city } of load()) {
    // Haversine without the constant factors, enough for ordering.
    const dLat = (city.lat - lat) * rad;
    const dLon = (city.lon - lon) * rad;
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(lat * rad) * Math.cos(city.lat * rad) * Math.sin(dLon / 2) ** 2;
    if (a < bestD) {
      bestD = a;
      best = city;
    }
  }
  return best!;
}
