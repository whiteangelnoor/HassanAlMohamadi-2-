/**
 * Renders the transit, calendar and predictive screens against the real
 * engine (desktop bridge, see events.engine.test.ts). Skipped without it.
 *
 * @format
 */

import React from 'react';
import ReactTestRenderer from 'react-test-renderer';

const env = (globalThis as any).process.env as Record<
  string,
  string | undefined
>;

jest.mock('../specs/NativeAstroEngine', () => {
  const { execFileSync } = require('child_process');
  const e = (globalThis as any).process.env;
  const call = (method: string) => (req: string) =>
    execFileSync(e.ASTRO_CLI, [e.ASTRO_EPHE, method, req], {
      encoding: 'utf8',
    });
  return {
    calcChart: call('chart'),
    calcSeries: call('series'),
    calcFixedStars: call('stars'),
    calcEclipses: call('eclipses'),
  };
});

import { AstroEngine } from '../src/astro/engine';
import { CalendarScreen } from '../src/ui/CalendarScreen';
import { PredictiveScreen } from '../src/ui/PredictiveScreen';
import { TransitScreen } from '../src/ui/TransitScreen';
import { ArabicScreen } from '../src/ui/ArabicScreen';
import { SpiritualScreen } from '../src/ui/SpiritualScreen';
import { HoraryScreen } from '../src/ui/HoraryScreen';
import { TodayCard } from '../src/ui/TodayCard';
import { RamlScreen } from '../src/ui/RamlScreen';
import {
  DEFAULT_PLACE,
  PlanetaryHoursScreen,
} from '../src/ui/PlanetaryHoursScreen';

const run = env.ASTRO_CLI && env.ASTRO_EPHE ? describe : describe.skip;

async function render(el: React.ReactElement) {
  jest.useFakeTimers();
  let tree: ReactTestRenderer.ReactTestRenderer | undefined;
  await ReactTestRenderer.act(async () => {
    tree = ReactTestRenderer.create(el);
  });
  await ReactTestRenderer.act(async () => {
    jest.runOnlyPendingTimers();
  });
  jest.useRealTimers();
  return JSON.stringify(tree!.toJSON());
}

run('new screens with the real engine', () => {
  const natal = () =>
    AstroEngine.chart({
      time: { utc: { year: 1990, month: 6, day: 15, hour: 8 } },
      location: { lat: 33.34, lon: 44.4 },
      houseSystem: 'P',
      bodies: ['sun', 'moon', 'mercury', 'venus', 'mars', 'jupiter', 'saturn'],
    });

  test('transits', async () => {
    const out = await render(
      <TransitScreen natal={natal()} title="تجربة" onBack={() => {}} />,
    );
    expect(out).toContain('العبورات الدقيقة خلال السنة القادمة');
    expect(out).not.toContain('جارٍ الحساب');
  }, 60000);

  test('calendar', async () => {
    const out = await render(<CalendarScreen onBack={() => {}} />);
    expect(out).toContain('القمر خالٍ من المسار');
    expect(out).toMatch(/البدر|المحاق/);
  }, 60000);

  test('predictive', async () => {
    const out = await render(
      <PredictiveScreen
        natal={{ chart: natal(), lat: 33.34, lon: 44.4, title: 'تجربة' }}
        onOpenChart={() => {}}
        onBack={() => {}}
      />,
    );
    expect(out).toContain('الانتهاء السنوي');
    expect(out).toContain('الطالع الموجّه');
    expect(out).toContain('الفترة الصغرى الآن');
  }, 60000);

  test('arabic section with the mansion almanac', async () => {
    const out = await render(
      <ArabicScreen
        method="tropical"
        onMethod={() => {}}
        hijri={{ choice: 'tehran', offset: 1 }}
        onHijri={() => {}}
        onBack={() => {}}
      />,
    );
    expect(out).toContain('القمر الآن في منزلة');
    expect(out).toContain('روزنامة منازل القمر');
    expect(out).toContain('بطن الحوت');
    expect(out).toContain('هـ');
    expect(out).not.toContain('جارٍ الحساب');
  }, 60000);

  test('spiritual section: three cards and the planetary hours', async () => {
    const grid = await render(
      <SpiritualScreen onOpen={() => {}} onBack={() => {}} />,
    );
    for (const t of ['البرج الروحاني', 'الساعات الروحانية', 'قريباً']) {
      expect(grid).toContain(t);
    }
    const hours = await render(
      <PlanetaryHoursScreen
        place={DEFAULT_PLACE}
        onPlace={() => {}}
        onBack={() => {}}
      />,
    );
    expect(hours).toContain('ساعات النهار');
    expect(hours).toContain('الشروق');
    expect(hours).not.toContain('جارٍ الحساب');
  }, 60000);

  test('horary: dropdowns only, no question box, no house numbers', async () => {
    const out = await render(
      <HoraryScreen place={DEFAULT_PLACE} onBack={() => {}} />,
    );
    expect(out).toContain('المسألة عن');
    expect(out).toContain('اختر الباب');
    expect(out).not.toContain('سؤالك');
    expect(out).not.toContain('البيت 1');
    expect(out).not.toContain('اضمر سؤالك');
  });

  test('today card: the Moon and the hour now', async () => {
    const out = await render(
      <TodayCard place={DEFAULT_PLACE} method="tropical" />,
    );
    expect(out).toContain('القمر');
    expect(out).toContain('منزلة');
    expect(out).toContain('الساعة الآن');
  });

  test('geomancy: one press casts the sand and judges', async () => {
    jest.useFakeTimers();
    let tree: ReactTestRenderer.ReactTestRenderer | undefined;
    await ReactTestRenderer.act(async () => {
      tree = ReactTestRenderer.create(<RamlScreen onBack={() => {}} />);
    });
    const strike = tree!.root.findAll(
      (n: any) =>
        n.props.label === 'اضرب الرمل' && typeof n.props.onPress === 'function',
    );
    expect(strike.length).toBeGreaterThan(0);
    await ReactTestRenderer.act(async () => {
      strike[0].props.onPress();
    });
    jest.useRealTimers();
    const out = JSON.stringify(tree!.toJSON());
    expect(out).toContain('الميزان');
    expect(out).toContain('الأمهات');
    expect(out).toMatch(/الاستخارة/);
  });

  test('قرعة الضمير: one press draws one figure and its judgment', async () => {
    jest.useFakeTimers();
    let tree: ReactTestRenderer.ReactTestRenderer | undefined;
    await ReactTestRenderer.act(async () => {
      tree = ReactTestRenderer.create(<RamlScreen onBack={() => {}} />);
    });
    const mode = tree!.root.findAll(
      (n: any) =>
        Array.isArray(n.props.items) &&
        n.props.items.some((i: any) => i.label === 'قرعة الضمير'),
    );
    await ReactTestRenderer.act(async () => {
      mode[0].props.items[1].onPress();
    });
    const draw = tree!.root.findAll(
      (n: any) =>
        n.props.label === 'اسحب القرعة' && typeof n.props.onPress === 'function',
    );
    expect(draw.length).toBeGreaterThan(0);
    await ReactTestRenderer.act(async () => {
      draw[0].props.onPress();
    });
    jest.useRealTimers();
    const out = JSON.stringify(tree!.toJSON());
    expect(out).toContain('كوكبه');
    expect(out).toMatch(/الشكل (سعيد|يأمر|يحذّر)/);
    expect(out).not.toContain('الأمهات');
  });
});
