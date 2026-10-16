// The chart wheel: zodiac ring, houses, planets and aspect lines.
// AGPL-3.0-or-later.
//
// Orientation follows the usual convention: Ascendant on the left, zodiac
// running counter-clockwise, Midheaven towards the top.

import { useMemo } from 'react';
import Svg, { Circle, G, Line, Text as SvgText } from 'react-native-svg';

import { ChartResult } from '../astro/engine';
import { aspectPoints, findAspects } from '../astro/traditional';
import { colors } from './theme';

// U+FE0E asks for the text (not emoji) form of each symbol.
const T = '︎';
const SIGN_GLYPHS = Array.from(
  { length: 12 },
  (_, i) => String.fromCharCode(0x2648 + i) + T,
);
const PLANET_GLYPHS: Record<string, string> = {
  sun: '☉',
  moon: '☽',
  mercury: '☿',
  venus: '♀',
  mars: '♂',
  jupiter: '♃',
  saturn: '♄',
  uranus: '♅',
  neptune: '♆',
  pluto: '♇',
  trueNode: '☊',
  meanNode: '☊',
  chiron: '⚷',
};

const HARD = new Set(['square', 'opposition']);
const MIN_GAP = 9.5; // degrees between neighbouring planet glyphs

const norm = (x: number) => ((x % 360) + 360) % 360;

/** Spreads glyph positions so close planets do not overlap. */
export function spread(lons: number[], minGap = MIN_GAP): number[] {
  const n = lons.length;
  if (n < 2) {
    return lons.slice();
  }
  const order = lons
    .map((l, i) => ({ l: norm(l), i }))
    .sort((a, b) => a.l - b.l);
  const pos = order.map(o => o.l);
  for (let iter = 0; iter < 60; iter++) {
    let moved = false;
    for (let k = 0; k < n; k++) {
      const a = k;
      const b = (k + 1) % n;
      let gap = pos[b] - pos[a];
      if (b === 0) {
        gap += 360;
      }
      if (gap < minGap) {
        const push = (minGap - gap) / 2;
        pos[a] -= push;
        pos[b] += push;
        moved = true;
      }
    }
    if (!moved) {
      break;
    }
  }
  const out = new Array<number>(n);
  order.forEach((o, k) => {
    out[o.i] = norm(pos[k]);
  });
  return out;
}

export function ChartWheel({
  chart,
  size,
}: {
  chart: ChartResult;
  size: number;
}) {
  const houses = chart.houses;
  const asc = houses ? houses.asc : 0;
  const c = size / 2;
  const R = size / 2 - 2;
  const rSignOuter = R;
  const rSignInner = R * 0.84;
  const rPlanet = R * 0.71;
  const rDegree = R * 0.605;
  const rHouseNum = R * 0.47;
  const rInner = R * 0.4;

  // Longitude -> screen point.
  const pt = (lon: number, r: number) => {
    const a = ((180 + lon - asc) * Math.PI) / 180;
    return { x: c + r * Math.cos(a), y: c - r * Math.sin(a) };
  };

  const bodies = useMemo(
    () => chart.bodies.filter(b => PLANET_GLYPHS[b.key]),
    [chart],
  );
  const shown = useMemo(() => spread(bodies.map(b => b.lon)), [bodies]);
  const aspects = useMemo(
    () =>
      findAspects(aspectPoints(chart)).filter(
        a =>
          a.kind !== 'conjunction' &&
          a.a !== 'asc' &&
          a.a !== 'mc' &&
          a.b !== 'asc' &&
          a.b !== 'mc',
      ),
    [chart],
  );
  const lonOf = (k: string) => chart.bodies.find(b => b.key === k)!.lon;

  const ticks = [];
  for (let d = 0; d < 360; d++) {
    const len = d % 10 === 0 ? 0.045 : d % 5 === 0 ? 0.03 : 0.015;
    const p1 = pt(d, rSignInner);
    const p2 = pt(d, rSignInner - R * len);
    ticks.push(
      <Line
        key={`t${d}`}
        x1={p1.x}
        y1={p1.y}
        x2={p2.x}
        y2={p2.y}
        stroke={colors.line}
        strokeWidth={d % 30 === 0 ? 1.2 : 0.8}
      />,
    );
  }

  return (
    <Svg width={size} height={size}>
      {/* rings */}
      <Circle
        cx={c}
        cy={c}
        r={rSignOuter}
        stroke={colors.line}
        strokeWidth={1.2}
        fill={colors.navyRaised}
      />
      <Circle
        cx={c}
        cy={c}
        r={rSignInner}
        stroke={colors.line}
        strokeWidth={1}
        fill={colors.navy}
      />
      <Circle
        cx={c}
        cy={c}
        r={rInner}
        stroke={colors.line}
        strokeWidth={1}
        fill="none"
      />

      {/* sign boundaries and glyphs */}
      {SIGN_GLYPHS.map((g, i) => {
        const a = pt(i * 30, rSignOuter);
        const b = pt(i * 30, rSignInner);
        const m = pt(i * 30 + 15, (rSignOuter + rSignInner) / 2);
        const fs = R * 0.085;
        return (
          <G key={`s${i}`}>
            <Line
              x1={a.x}
              y1={a.y}
              x2={b.x}
              y2={b.y}
              stroke={colors.line}
              strokeWidth={1}
            />
            <SvgText
              x={m.x}
              y={m.y + fs * 0.35}
              fontSize={fs}
              fill={colors.gold}
              textAnchor="middle"
            >
              {g}
            </SvgText>
          </G>
        );
      })}
      {ticks}

      {/* houses */}
      {houses
        ? houses.cusps.slice(0, 12).map((cusp, i) => {
            const angle = i === 0 || i === 9;
            const from = pt(cusp, angle ? rSignOuter : rSignInner);
            const to = pt(cusp, rInner);
            const next = houses.cusps[(i + 1) % 12];
            const mid = cusp + norm(next - cusp) / 2;
            const n = pt(mid, rHouseNum);
            const fs = R * 0.05;
            return (
              <G key={`h${i}`}>
                <Line
                  x1={from.x}
                  y1={from.y}
                  x2={to.x}
                  y2={to.y}
                  stroke={angle ? colors.gold : colors.line}
                  strokeWidth={angle ? 1.6 : 0.8}
                />
                <SvgText
                  x={n.x}
                  y={n.y + fs * 0.35}
                  fontSize={fs}
                  fill={colors.muted}
                  textAnchor="middle"
                >
                  {String(i + 1)}
                </SvgText>
              </G>
            );
          })
        : null}

      {/* aspect lines */}
      {aspects.map(a => {
        const p = pt(lonOf(a.a), rInner);
        const q = pt(lonOf(a.b), rInner);
        const hard = HARD.has(a.kind);
        return (
          <Line
            key={`a${a.a}${a.b}`}
            x1={p.x}
            y1={p.y}
            x2={q.x}
            y2={q.y}
            stroke={hard ? colors.error : colors.gold}
            strokeWidth={1}
            strokeOpacity={Math.max(0.35, 1 - a.orb / 9)}
            strokeDasharray={a.kind === 'sextile' ? [4, 3] : undefined}
          />
        );
      })}

      {/* planets: exact tick on the zodiac ring, glyph and degree spread out */}
      {bodies.map((b, i) => {
        const exactOuter = pt(b.lon, rSignInner);
        const exactInner = pt(b.lon, rSignInner - R * 0.06);
        const g = pt(shown[i], rPlanet);
        const d = pt(shown[i], rDegree);
        const fs = R * 0.078;
        const fd = R * 0.038;
        const deg = Math.floor(norm(b.lon) % 30);
        return (
          <G key={`p${b.key}`}>
            <Line
              x1={exactOuter.x}
              y1={exactOuter.y}
              x2={exactInner.x}
              y2={exactInner.y}
              stroke={colors.text}
              strokeWidth={1.4}
            />
            <Circle
              cx={pt(b.lon, rInner).x}
              cy={pt(b.lon, rInner).y}
              r={1.8}
              fill={colors.text}
            />
            <SvgText
              x={g.x}
              y={g.y + fs * 0.35}
              fontSize={fs}
              fill={colors.text}
              textAnchor="middle"
            >
              {PLANET_GLYPHS[b.key] + T}
            </SvgText>
            <SvgText
              x={d.x}
              y={d.y + fd * 0.35}
              fontSize={fd}
              fill={colors.muted}
              textAnchor="middle"
            >
              {`${deg}°${b.retrograde ? '℞' : ''}`}
            </SvgText>
          </G>
        );
      })}
    </Svg>
  );
}
