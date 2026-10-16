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

export interface WheelAspect {
  a: string; // key in `outer` (or in `chart` when there is no outer ring)
  b: string; // key in `chart`
  kind: string;
  orb: number;
}

/**
 * `outer` adds a second ring of planets (transits, progressions) outside the
 * chart's own; `outerAspects` are then the lines drawn, from outer to inner.
 */
export function ChartWheel({
  chart,
  size,
  outer,
  outerAspects,
}: {
  chart: ChartResult;
  size: number;
  outer?: ChartResult;
  outerAspects?: WheelAspect[];
}) {
  const houses = chart.houses;
  const asc = houses ? houses.asc : 0;
  const c = size / 2;
  const R = size / 2 - 2;
  const rSignOuter = R;
  const rSignInner = R * 0.84;
  const bi = outer !== undefined;
  const rOuterPlanet = R * 0.765;
  const rOuterDegree = R * 0.685;
  const rSeparator = R * 0.64;
  const rPlanet = R * (bi ? 0.55 : 0.71);
  const rDegree = R * (bi ? 0.475 : 0.605);
  const rHouseNum = R * (bi ? 0.41 : 0.47);
  const rInner = R * (bi ? 0.355 : 0.4);

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
  const outerBodies = useMemo(
    () => (outer ? outer.bodies.filter(b => PLANET_GLYPHS[b.key]) : []),
    [outer],
  );
  const outerShown = useMemo(
    () => spread(outerBodies.map(b => b.lon)),
    [outerBodies],
  );
  const aspects: WheelAspect[] = useMemo(
    () =>
      outerAspects ??
      findAspects(aspectPoints(chart)).filter(
        a =>
          a.kind !== 'conjunction' &&
          a.a !== 'asc' &&
          a.a !== 'mc' &&
          a.b !== 'asc' &&
          a.b !== 'mc',
      ),
    [chart, outerAspects],
  );
  const lonOf = (k: string) => chart.bodies.find(b => b.key === k)?.lon ?? 0;
  const pointLon = (k: string) =>
    k === 'asc' ? asc : k === 'mc' ? houses?.mc ?? 0 : lonOf(k);
  const outerLon = (k: string) =>
    (outer ?? chart).bodies.find(b => b.key === k)?.lon ?? 0;

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
      {bi ? (
        <Circle
          cx={c}
          cy={c}
          r={rSeparator}
          stroke={colors.line}
          strokeWidth={0.8}
          fill="none"
        />
      ) : null}
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
            const from = pt(cusp, rSignInner);
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
                  stroke={colors.line}
                  strokeWidth={0.8}
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

      {/* Ascendant and Midheaven, drawn on their own: in whole-sign and
          other systems they are not house cusps */}
      {houses
        ? [houses.asc, houses.mc].map((lon, i) => {
            const a = pt(lon, rSignOuter);
            const b = pt(lon, rInner);
            return (
              <Line
                key={`angle${i}`}
                x1={a.x}
                y1={a.y}
                x2={b.x}
                y2={b.y}
                stroke={colors.gold}
                strokeWidth={1.6}
              />
            );
          })
        : null}

      {/* aspect lines */}
      {aspects.map(a => {
        const p = pt(bi ? outerLon(a.a) : pointLon(a.a), rInner);
        const q = pt(pointLon(a.b), rInner);
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
        // With an outer ring the chart's own ticks sit on the separator.
        const tickFrom = bi ? rSeparator : rSignInner;
        const exactOuter = pt(b.lon, tickFrom);
        const exactInner = pt(b.lon, tickFrom - R * (bi ? 0.03 : 0.05));
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

      {/* outer ring: transiting or progressed planets */}
      {outerBodies.map((b, i) => {
        const exactOuter = pt(b.lon, rSignInner);
        const exactInner = pt(b.lon, rSignInner - R * 0.035);
        const g = pt(outerShown[i], rOuterPlanet);
        const d = pt(outerShown[i], rOuterDegree);
        const fs = R * 0.068;
        const fd = R * 0.034;
        const deg = Math.floor(norm(b.lon) % 30);
        return (
          <G key={`o${b.key}`}>
            <Line
              x1={exactOuter.x}
              y1={exactOuter.y}
              x2={exactInner.x}
              y2={exactInner.y}
              stroke={colors.gold}
              strokeWidth={1.4}
            />
            <SvgText
              x={g.x}
              y={g.y + fs * 0.35}
              fontSize={fs}
              fill={colors.gold}
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
