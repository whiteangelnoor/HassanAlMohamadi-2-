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

const run = env.ASTRO_CLI && env.ASTRO_EPHE ? describe : describe.skip;

async function render(el: React.ReactElement) {
  jest.useFakeTimers();
  let tree: ReactTestRenderer.ReactTestRenderer | undefined;
  await ReactTestRenderer.act(async () => {
    tree = ReactTestRenderer.create(el);
  });
  await ReactTestRenderer.act(async () => {
    jest.runAllTimers();
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
      <ArabicScreen method="tropical" onMethod={() => {}} onBack={() => {}} />,
    );
    expect(out).toContain('القمر الآن في منزلة');
    expect(out).toContain('روزنامة منازل القمر');
    expect(out).toContain('بطن الحوت');
    expect(out).toContain('هـ');
    expect(out).not.toContain('جارٍ الحساب');
  }, 60000);
});
