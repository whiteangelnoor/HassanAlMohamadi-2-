import { cityLabel, searchCities } from '../src/geo/cities';

test('finds Arabic names with or without the article and hamza', () => {
  expect(cityLabel(searchCities('بغداد')[0])).toBe('بغداد');
  expect(searchCities('موصل').map(cityLabel)).toContain('الموصل');
  expect(searchCities('اربيل').map(cityLabel)).toContain('أربيل');
});

test('finds Latin names without accents, largest first', () => {
  const r = searchCities('paris');
  expect(r[0]).toMatchObject({
    name: 'Paris',
    country: 'FR',
    timeZone: 'Europe/Paris',
  });
  expect(searchCities('sao paulo')[0].name).toBe('São Paulo');
});

test('ignores one-letter queries', () => {
  expect(searchCities('ب')).toEqual([]);
});
