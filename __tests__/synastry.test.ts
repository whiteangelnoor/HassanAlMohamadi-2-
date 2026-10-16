jest.mock('../specs/NativeAstroEngine', () => ({}));

import {
  compositeChart,
  midpoint,
  synastryAspects,
} from '../src/astro/synastry';
import {
  loadCharts,
  loadSettings,
  saveChart,
  saveSettings,
  deleteChart,
} from '../src/store';
import { chartReportHtml } from '../src/ui/pdf';

const chart = require('./fixtures/chart-baghdad-1990.json');

test('midpoints take the shorter arc', () => {
  expect(midpoint(10, 30)).toBeCloseTo(20);
  expect(midpoint(350, 20)).toBeCloseTo(5);
  expect(midpoint(20, 350)).toBeCloseTo(5);
  expect(midpoint(100, 280)).toBeCloseTo(190);
});

test('a chart compared with itself: every point conjunct its own place', () => {
  const asp = synastryAspects(chart, chart);
  for (const b of chart.bodies) {
    expect(asp).toContainEqual(
      expect.objectContaining({
        a: b.key,
        b: b.key,
        kind: 'conjunction',
        orb: 0,
      }),
    );
  }
  const comp = compositeChart(chart, chart);
  expect(comp.bodies[0].lon).toBeCloseTo(chart.bodies[0].lon);
  expect(comp.houses!.asc).toBeCloseTo(chart.houses.asc);
});

test('store keeps settings and charts for the session without the native module', () => {
  const s = loadSettings();
  expect(s.houseSystem).toBe('P');
  saveSettings({ ...s, houseSystem: 'W' });
  expect(loadSettings().houseSystem).toBe('W');
  const c = saveChart({
    name: 'تجربة',
    local: { year: 1990, month: 6, day: 15, hour: 12, minute: 0 },
    timeUnknown: false,
    place: {
      name: 'بغداد',
      country: 'العراق',
      lat: 33.34,
      lon: 44.4,
      timeZone: 'Asia/Baghdad',
    },
  });
  expect(loadCharts()[0].id).toBe(c.id);
  deleteChart(c.id);
  expect(loadCharts()).toEqual([]);
});

test('PDF report holds the wheel and the tables, right to left', () => {
  const html = chartReportHtml(
    { title: 'تجربة', lines: ['بغداد'], notes: [], chart },
    'P',
  );
  expect(html).toContain('dir="rtl"');
  expect(html).toContain('<svg');
  for (const h of ['الكواكب', 'الجوانب', 'السهام', 'الكرامات', 'بلاسيدس']) {
    expect(html).toContain(h);
  }
});
