/**
 * @format
 */

import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import App from '../App';

// The C++ engine is not available under Jest.
jest.mock('../specs/NativeAstroEngine', () => ({
  initialize: () =>
    JSON.stringify({
      ok: true,
      version: '2.10.03',
      ephePath: '/x',
      filesOk: true,
    }),
}));
jest.mock(
  'react-native-safe-area-context',
  () => require('react-native-safe-area-context/jest/mock').default,
);

async function render(el: React.ReactElement) {
  let tree: ReactTestRenderer.ReactTestRenderer | undefined;
  await ReactTestRenderer.act(() => {
    tree = ReactTestRenderer.create(el);
  });
  return JSON.stringify(tree!.toJSON());
}

test('shows why the engine could not start', async () => {
  expect(await render(<App ephemerisError="missing" />)).toContain('missing');
});

test('shows the home screen once the engine is ready', async () => {
  const out = await render(<App ephePath="/x" />);
  expect(out).toContain('خريطة جديدة');
  expect(out).toContain('2.10.03');
  expect(out).not.toContain('تنزيل النسخة الجديدة');
});

test('offers a newer APK when one is published', async () => {
  const out = await render(
    <App ephePath="/x" build={7} apkUpdateUrl="https://x/falak.apk" />,
  );
  expect(out).toContain('تنزيل النسخة الجديدة');
  expect(out).toContain('النسخة 7');
});
