import { ChartResult } from '../src/astro/engine';
import {
  computeLots,
  findAspects,
  isDayChart,
  planetDignity,
  rulersAt,
} from '../src/astro/traditional';

function chart(
  bodies: Record<string, [number, number?, number?]>,
  asc: number,
): ChartResult {
  return {
    jdUt: 0,
    jdTt: 0,
    deltaTSeconds: 0,
    obliquity: 23.44,
    nutationLon: 0,
    warnings: [],
    houses: {
      system: 'P',
      systemName: 'Placidus',
      cusps: [],
      asc,
      mc: (asc + 270) % 360,
      armc: 0,
      vertex: 0,
      equatorialAsc: 0,
      coAscKoch: 0,
      coAscMunkasey: 0,
      polarAsc: 0,
      fallbackUsed: false,
    },
    bodies: Object.entries(bodies).map(([key, [lon, speed = 1, house]]) => ({
      key: key as any,
      id: 0,
      lon,
      lat: 0,
      dist: 1,
      lonSpeed: speed,
      latSpeed: 0,
      distSpeed: 0,
      ra: 0,
      dec: 0,
      decSpeed: 0,
      retrograde: speed < 0,
      sign: { index: Math.floor(lon / 30), degree: lon % 30 },
      housePosition: house,
    })),
  };
}

test('rulers of a degree follow the Egyptian terms and Chaldean faces', () => {
  expect(rulersAt(5)).toMatchObject({
    domicile: 'mars',
    exaltation: 'sun',
    term: 'jupiter',
    face: 'mars',
  });
  expect(rulersAt(15)).toMatchObject({ term: 'mercury', face: 'sun' });
  // 25 Pisces: term of Mars (19..28), third face of Pisces = Mars.
  expect(rulersAt(355)).toMatchObject({
    domicile: 'jupiter',
    exaltation: 'venus',
    term: 'mars',
    face: 'mars',
  });
  // Faces cycle: first face of Taurus is Mercury.
  expect(rulersAt(31).face).toBe('mercury');
});

test('dignity scores', () => {
  // Sun at 19 Aries by day: exaltation, fire day triplicity ruler, and the
  // second face of Aries (10..20) is the Sun's.
  expect(planetDignity('sun', 19, true)).toMatchObject({
    dignities: ['exaltation', 'triplicity', 'face'],
    score: 8,
  });
  // Saturn at 10 Aries: fall, but participating fire ruler -> not peregrine.
  expect(planetDignity('saturn', 10, true)).toMatchObject({
    dignities: ['fall'],
    score: -4,
  });
  // Venus at 5 Aries by day: Venus has no dignity there; detriment.
  expect(planetDignity('venus', 5, true).dignities).toEqual([
    'detriment',
    'peregrine',
  ]);
  // Moon at 5 Taurus by night: exaltation, night earth triplicity.
  expect(planetDignity('moon', 33, false)).toMatchObject({
    dignities: ['exaltation', 'triplicity'],
    score: 7,
  });
});

test('aspects with orbs, luminary bonus and applying/separating', () => {
  const c = chart(
    { sun: [10, 1], moon: [100, 13], mars: [17.5, 0.5], saturn: [130, 0] },
    0,
  );
  const asp = findAspects([
    ...c.bodies.map(b => ({ key: b.key, lon: b.lon, speed: b.lonSpeed })),
  ]);
  const find = (a: string, b: string) => asp.find(x => x.a === a && x.b === b);
  // Sun-Moon 90 exactly: square, Moon faster and ahead -> separating.
  expect(find('sun', 'moon')).toMatchObject({
    kind: 'square',
    applying: false,
  });
  // Sun-Mars 7.5: conjunction within 8+2; Sun catching up -> applying.
  expect(find('sun', 'mars')).toMatchObject({
    kind: 'conjunction',
    applying: true,
  });
  // Mars-Saturn 112.5: trine needs <= 7, so none.
  expect(find('mars', 'saturn')).toBeUndefined();
  // Moon-Saturn 30: no aspect.
  expect(find('moon', 'saturn')).toBeUndefined();
});

test('sect and lots reverse by night', () => {
  const day = chart(
    {
      sun: [200, 1, 10.5],
      moon: [50],
      mercury: [190],
      venus: [220],
      mars: [10],
      jupiter: [100],
      saturn: [300],
    },
    100,
  );
  expect(isDayChart(day)).toBe(true);
  const lots = computeLots(day);
  // Fortune by day: Asc + Moon - Sun = 100 + 50 - 200 = -50 = 310.
  expect(lots.find(l => l.key === 'fortune')!.lon).toBeCloseTo(310);
  expect(lots.find(l => l.key === 'spirit')!.lon).toBeCloseTo(250);

  const night = chart(
    {
      sun: [200, 1, 3.2],
      moon: [50],
      mercury: [190],
      venus: [220],
      mars: [10],
      jupiter: [100],
      saturn: [300],
    },
    100,
  );
  expect(isDayChart(night)).toBe(false);
  expect(computeLots(night).find(l => l.key === 'fortune')!.lon).toBeCloseTo(
    250,
  );
});
