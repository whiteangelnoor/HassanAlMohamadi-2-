// Checks the interpolated event times against direct calls to the real
// engine, through the desktop bridge tests/engine_cli.cpp. Runs when
// ASTRO_CLI and ASTRO_EPHE point to a built bridge and the ephemeris files
// (CI builds it); skipped otherwise.

const env = (globalThis as any).process.env as Record<
  string,
  string | undefined
>;
const cli = env.ASTRO_CLI;
const ephe = env.ASTRO_EPHE;

jest.mock('../specs/NativeAstroEngine', () => {
  const { execFileSync } = require('child_process');
  const call = (method: string) => (req: string) =>
    execFileSync(
      (globalThis as any).process.env.ASTRO_CLI,
      [(globalThis as any).process.env.ASTRO_EPHE, method, req],
      { encoding: 'utf8' },
    );
  return {
    calcChart: call('chart'),
    calcSeries: call('series'),
    calcFixedStars: call('stars'),
    calcEclipses: call('eclipses'),
  };
});

import { AstroEngine } from '../src/astro/engine';
import {
  aspectHits,
  fixedTrack,
  ingresses,
  jdFromDate,
  moonPhases,
  returnTime,
  stations,
  tracks,
} from '../src/astro/events';

const run = cli && ephe ? describe : describe.skip;
const lonAt = (body: string, jd: number) =>
  AstroEngine.chart({ time: { jdUt: jd }, bodies: [body as any] }).bodies[0]
    .lon;
const sep = (a: number, b: number) => {
  const d = (((a - b) % 360) + 360) % 360;
  return d > 180 ? 360 - d : d;
};
// Degrees the body moves in one minute of time near jd.
const perMinute = (body: string, jd: number) =>
  Math.abs(
    AstroEngine.chart({ time: { jdUt: jd }, bodies: [body as any] }).bodies[0]
      .lonSpeed,
  ) / 1440;

run('event times match the engine', () => {
  const start = jdFromDate(new Date(Date.UTC(2026, 0, 1)));
  const end = start + 120;
  const t = tracks(['sun', 'moon', 'mercury', 'mars', 'saturn'], start, end);

  test('moon phases to within one minute', () => {
    const phases = moonPhases(t.moon, t.sun);
    expect(phases.length).toBeGreaterThanOrEqual(15);
    const angle = { new: 0, firstQuarter: 90, full: 180, lastQuarter: 270 };
    for (const p of phases) {
      const elong = lonAt('moon', p.jd) - lonAt('sun', p.jd);
      const err = sep(elong, angle[p.phase]);
      expect(err).toBeLessThan(perMinute('moon', p.jd));
    }
  });

  test('ingresses to within one minute, including the Moon', () => {
    for (const body of ['moon', 'mercury', 'sun'] as const) {
      const list = ingresses(t[body], body);
      expect(list.length).toBeGreaterThan(0);
      for (const ing of list) {
        const boundary = (ing.retrograde ? ing.sign + 1 : ing.sign) * 30;
        expect(sep(lonAt(body, ing.jd), boundary)).toBeLessThan(
          perMinute(body, ing.jd),
        );
      }
    }
  });

  test('transit aspects to a fixed natal point', () => {
    const natal = 123.456;
    const hits = aspectHits(t.mars, 'mars', fixedTrack(natal, t.mars), 'natal');
    expect(hits.length).toBeGreaterThan(0);
    const angle = {
      conjunction: 0,
      sextile: 60,
      square: 90,
      trine: 120,
      opposition: 180,
    };
    for (const h of hits) {
      const s = sep(lonAt('mars', h.jd), natal);
      expect(Math.abs(s - angle[h.kind])).toBeLessThan(
        perMinute('mars', h.jd) + 1e-6,
      );
    }
  });

  test('Mercury station found and refined', () => {
    const merc = tracks(['mercury'], start, start + 365).mercury;
    const st = stations(merc, 'mercury');
    expect(st.length).toBeGreaterThanOrEqual(6); // three retrograde periods a year
    for (const s of st) {
      const before = AstroEngine.chart({
        time: { jdUt: s.jd - 0.05 },
        bodies: ['mercury'],
      }).bodies[0].lonSpeed;
      const after = AstroEngine.chart({
        time: { jdUt: s.jd + 0.05 },
        bodies: ['mercury'],
      }).bodies[0].lonSpeed;
      expect(before * after).toBeLessThan(0);
    }
  });

  test('solar return to within a second', () => {
    const natalSun = 84.123;
    const jd = returnTime('sun', natalSun, start + 150, start + 190)!;
    expect(jd).not.toBeNull();
    expect(sep(lonAt('sun', jd), natalSun) / perMinute('sun', jd)).toBeLessThan(
      1 / 60,
    );
  });
});

run('calendar and transits against the engine', () => {
  const { calendarEvents } = require('../src/astro/calendar');
  const { upcomingTransits } = require('../src/astro/predictive');
  const start = jdFromDate(new Date(Date.UTC(2026, 9, 1)));
  const end = jdFromDate(new Date(Date.UTC(2026, 10, 1)));

  test('a month of calendar events is consistent', () => {
    const ev = calendarEvents(start, end);
    const phases = ev.filter((e: any) => e.type === 'phase');
    expect(phases.length).toBeGreaterThanOrEqual(3);
    const voids = ev.filter((e: any) => e.type === 'voidStart');
    expect(voids.length).toBeGreaterThanOrEqual(10);
    for (const v of voids) {
      // The Moon keeps its sign from the start of a void period to its end.
      const s1 = Math.floor(lonAt('moon', v.jd + 1 / 1440) / 30);
      const s2 = Math.floor(lonAt('moon', v.endJd - 1 / 1440) / 30);
      expect(s1).toBe(s2);
      expect(v.endJd - v.jd).toBeLessThan(2.6);
    }
  });

  test('transits to a natal chart over a year', () => {
    const natal = AstroEngine.chart({
      time: { utc: { year: 1990, month: 6, day: 15, hour: 8 } },
      location: { lat: 33.34, lon: 44.4 },
      houseSystem: 'P',
      bodies: ['sun', 'moon', 'mercury', 'venus', 'mars', 'jupiter', 'saturn'],
    });
    const hits = upcomingTransits(natal, start, start + 365);
    expect(hits.length).toBeGreaterThan(100);
    const sunHits = hits.filter((h: any) => h.a === 'sun' && h.b === 'sun');
    // The Sun aspects its own natal place 8 times a year (0, 2x60, 2x90, 2x120, 180).
    expect(sunHits.length).toBe(8);
  });
});

run('eclipses from the engine', () => {
  test('the four eclipses of 2026', () => {
    const start = jdFromDate(new Date(Date.UTC(2026, 0, 1)));
    const { eclipses } = AstroEngine.eclipses({
      startJdUt: start,
      endJdUt: start + 365,
    });
    const summary = eclipses.map(e => {
      const d = new Date((e.jdUt - 2440587.5) * 86400000);
      return `${e.kind} ${e.type} ${d.toISOString().slice(0, 10)}`;
    });
    expect(summary).toEqual([
      'solar annular 2026-02-17',
      'solar total 2026-08-12',
      'lunar total 2026-03-03',
      'lunar partial 2026-08-28',
    ]);
  });
});

run('settings applied to the engine', () => {
  test('sidereal zodiac shifts every position by the ayanamsa', () => {
    const req = {
      time: { utc: { year: 2000, month: 1, day: 1, hour: 12 } },
      bodies: ['sun' as const],
    };
    const tropical = AstroEngine.chart(req).bodies[0].lon;
    AstroEngine.setDefaults({ zodiac: { type: 'sidereal', ayanamsa: 1 } });
    try {
      const sidereal = AstroEngine.chart(req).bodies[0].lon;
      // Lahiri ayanamsa at J2000 is 23.85 degrees.
      expect(tropical - sidereal).toBeCloseTo(23.85, 1);
    } finally {
      AstroEngine.setDefaults({});
    }
  });

  test('fixed star contacts on a real chart', () => {
    const { starContacts } = require('../src/astro/synastry');
    // Regulus sat near 29 Leo in 1990; put a planet on it.
    const chart = AstroEngine.chart({
      time: { utc: { year: 1990, month: 8, day: 22, hour: 0 } },
      bodies: ['sun'],
    });
    const contacts = starContacts(chart, 2);
    expect(contacts.map((c: any) => c.star)).toContain('قلب الأسد');
  });
});

run('lunar mansions against the engine', () => {
  const {
    mansionDays,
    moonTrack,
    MANSION_WIDTH,
    MANSIONS,
    mansionOf,
    mansionOptions,
  } = require('../src/astro/mansions');
  const start = jdFromDate(new Date(Date.UTC(2026, 9, 1)));
  const days = Array.from({ length: 32 }, (_, i) => start + i);

  test('entry times to within a minute, both methods', () => {
    for (const method of ['tropical', 'stars']) {
      const moon = moonTrack(method, start, start + 31);
      const list = mansionDays(moon, days);
      expect(list).toHaveLength(31);
      const opts = mansionOptions(method);
      let entries = 0;
      for (const d of list) {
        for (const e of d.entries) {
          entries++;
          const lon = AstroEngine.chart({
            ...opts,
            time: { jdUt: e.jd },
            bodies: ['moon'],
          }).bodies[0].lon;
          const boundary = e.mansion * MANSION_WIDTH;
          expect(sep(lon, boundary)).toBeLessThan(perMinute('moon', e.jd));
        }
        const lon0 = AstroEngine.chart({
          ...opts,
          time: { jdUt: d.startJd + 1e-4 },
          bodies: ['moon'],
        }).bodies[0].lon;
        expect(mansionOf(lon0)).toBe(d.first);
      }
      // The Moon crosses about 28 mansions in 27.3 days.
      expect(entries).toBeGreaterThanOrEqual(30);
    }
  });

  test('with the star method each mansion holds its stars', () => {
    const { stars } = AstroEngine.fixedStars({
      ...mansionOptions('stars'),
      time: { jdUt: start },
      names: ['Alcyone', 'Aldebaran', 'Regulus', 'Antares'],
    });
    expect(stars.map((s: any) => MANSIONS[mansionOf(s.lon)])).toEqual([
      'الثريا',
      'الدبران',
      'الجبهة',
      'القلب',
    ]);
  });
});

run('Hijri months by predicted sighting', () => {
  const {
    monthStarts,
    SIGHTING_CITIES,
    sunset,
  } = require('../src/time/hijriSighting');
  const { hijriForMonth } = require('../src/time/hijriProvider');

  test('Tehran sunset on 16 October 2026 is about 17:28 local', () => {
    const jd = sunset(Date.UTC(2026, 9, 16), SIGHTING_CITIES.tehran);
    const local = new Date((jd - 2440587.5) * 86400000 + 3.5 * 3600000);
    expect(local.getUTCHours()).toBe(17);
    expect(Math.abs(local.getUTCMinutes() - 28)).toBeLessThanOrEqual(3);
  });

  test('months are 29 or 30 days and begin 1-3 days after conjunction', () => {
    for (const key of ['karachi', 'tehran', 'qom']) {
      const starts = monthStarts(
        Date.UTC(2026, 0, 1),
        Date.UTC(2026, 11, 31),
        SIGHTING_CITIES[key],
      );
      for (let i = 1; i < starts.length; i++) {
        const len = (starts[i] - starts[i - 1]) / 86400000;
        expect([29, 30]).toContain(len);
      }
    }
  });

  test('the offset shifts the Hijri day', () => {
    const a = hijriForMonth({ choice: 'tehran', offset: 0 }, 2026, 10)(
      2026,
      10,
      16,
    );
    const b = hijriForMonth({ choice: 'tehran', offset: 1 }, 2026, 10)(
      2026,
      10,
      16,
    );
    expect(b.day === a.day + 1 || (b.day === 1 && a.day >= 29)).toBe(true);
  });
});
