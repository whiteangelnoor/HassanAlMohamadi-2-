/**
 * @format
 */

import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import { ChartScreen } from '../src/ui/ChartScreen';

// Baghdad, 1990-06-15 08:00 UTC, computed by the engine on desktop.
const chart = require('./fixtures/chart-baghdad-1990.json');

test('every tab renders for a real chart', async () => {
  let tree: ReactTestRenderer.ReactTestRenderer | undefined;
  await ReactTestRenderer.act(() => {
    tree = ReactTestRenderer.create(
      <ChartScreen
        info={{ title: 'تجربة', lines: [], notes: [], chart }}
        onBack={() => {}}
      />,
    );
  });
  const text = () => JSON.stringify(tree!.toJSON());
  expect(text()).toContain('خريطة نهارية');

  const tabs = tree!.root.findAll(
    n =>
      n.props.accessibilityRole === 'tab' &&
      typeof n.props.onPress === 'function',
  );
  const press = async (i: number) =>
    ReactTestRenderer.act(() => {
      tabs[i].props.onPress();
    });

  expect(text()).toContain('الطالع');
  await press(1);
  expect(text()).toMatch(/مقترب|منفصل/);
  await press(2);
  expect(text()).toContain('سهم السعادة');
  await press(3);
  expect(text()).toContain('صاحب الحد');
});

test('close planets are spread apart on the wheel', () => {
  const { spread } = require('../src/ui/ChartWheel');
  const out: number[] = spread([10, 11, 12, 200, 359.5, 0.5]);
  const sorted = [...out].sort((a, b) => a - b);
  for (let i = 0; i < sorted.length; i++) {
    const next = i + 1 < sorted.length ? sorted[i + 1] : sorted[0] + 360;
    expect(next - sorted[i]).toBeGreaterThan(9.4);
  }
  expect(out[3]).toBeCloseTo(200);
});
