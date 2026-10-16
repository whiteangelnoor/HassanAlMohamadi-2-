/**
 * @format
 */

import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import App from '../App';

// The C++ engine is not available under Jest; the screen must still render
// its error state instead of crashing.
jest.mock('../specs/NativeAstroEngine', () => ({}));
jest.mock(
  'react-native-safe-area-context',
  () => require('react-native-safe-area-context/jest/mock').default,
);

test('renders the error state when no ephemeris path arrives', async () => {
  let tree: ReactTestRenderer.ReactTestRenderer | undefined;
  await ReactTestRenderer.act(() => {
    tree = ReactTestRenderer.create(<App ephemerisError="missing" />);
  });
  expect(JSON.stringify(tree!.toJSON())).toContain('missing');
});
