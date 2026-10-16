// The chart wheel: zodiac ring, houses, planets and aspect lines.
// AGPL-3.0-or-later.
//
// Orientation follows the usual convention: Ascendant on the left, zodiac
// running counter-clockwise, Midheaven towards the top. The geometry is built
// once as plain shapes (wheelShapes) and drawn either with react-native-svg
// on screen or as an SVG string for the PDF export, so both look the same.

import { useMemo } from 'react';
import Svg, { Circle, Line, Text as SvgText } from 'react-native-svg';

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
  meanLilith: '⚸',
};

const HARD = new Set(['square', 'opposition', 'semisquare', 'sesquiquadrate']);
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
      const b = (k + 1) % n;
      let gap = pos[b] - pos[k];
      if (b === 0) {
        gap += 360;
      }
      if (gap < minGap) {
        const push = (minGap - gap) / 2;
        pos[k] -= push;
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

export type Shape =
  | {
      t: 'circle';
      cx: number;
      cy: number;
      r: number;
      stroke: string;
      width: number;
      fill: string;
    }
  | {
      t: 'line';
      x1: number;
      y1: number;
      x2: number;
      y2: number;
      stroke: string;
      width: number;
      opacity?: number;
      dash?: number[];
    }
  | { t: 'dot'; cx: number; cy: number; r: number; fill: string }
  | {
      t: 'text';
      x: number;
      y: number;
      size: number;
      fill: string;
      text: string;
    };

export interface WheelInput {
  chart: ChartResult;
  size: number;
  /** A second ring of planets (transits, progressions, a partner). */
  outer?: ChartResult;
  /** Lines to draw; by default the chart's own aspects. */
  aspects?: WheelAspect[];
  /** Colors; the PDF uses a light palette. */
  palette?: typeof colors;
}

export function wheelShapes({
  chart,
  size,
  outer,
  aspects,
  palette = colors,
}: WheelInput): Shape[] {
  const P = palette;
  const shapes: Shape[] = [];
  const houses = chart.houses;
  const asc = houses ? houses.asc : 0;
  const c = size / 2;
  const R = size / 2 - 2;
  const bi = outer !== undefined;
  const rSignOuter = R;
  const rSignInner = R * 0.84;
  const rOuterPlanet = R * 0.765;
  const rOuterDegree = R * 0.685;
  const rSeparator = R * 0.64;
  const rPlanet = R * (bi ? 0.55 : 0.71);
  const rDegree = R * (bi ? 0.475 : 0.605);
  const rHouseNum = R * (bi ? 0.41 : 0.47);
  const rInner = R * (bi ? 0.355 : 0.4);

  const pt = (lon: number, r: number) => {
    const a = ((180 + lon - asc) * Math.PI) / 180;
    return { x: c + r * Math.cos(a), y: c - r * Math.sin(a) };
  };
  const line = (
    lon: number,
    r1: number,
    r2: number,
    stroke: string,
    width: number,
  ) => {
    const p = pt(lon, r1);
    const q = pt(lon, r2);
    shapes.push({
      t: 'line',
      x1: p.x,
      y1: p.y,
      x2: q.x,
      y2: q.y,
      stroke,
      width,
    });
  };
  const text = (
    lon: number,
    r: number,
    s: string,
    fontSize: number,
    fill: string,
  ) => {
    const p = pt(lon, r);
    shapes.push({
      t: 'text',
      x: p.x,
      y: p.y + fontSize * 0.35,
      size: fontSize,
      fill,
      text: s,
    });
  };

  // Rings.
  shapes.push({
    t: 'circle',
    cx: c,
    cy: c,
    r: rSignOuter,
    stroke: P.line,
    width: 1.2,
    fill: P.navyRaised,
  });
  shapes.push({
    t: 'circle',
    cx: c,
    cy: c,
    r: rSignInner,
    stroke: P.line,
    width: 1,
    fill: P.navy,
  });
  if (bi) {
    shapes.push({
      t: 'circle',
      cx: c,
      cy: c,
      r: rSeparator,
      stroke: P.line,
      width: 0.8,
      fill: 'none',
    });
  }
  shapes.push({
    t: 'circle',
    cx: c,
    cy: c,
    r: rInner,
    stroke: P.line,
    width: 1,
    fill: 'none',
  });

  // Signs and degree ticks.
  for (let i = 0; i < 12; i++) {
    line(i * 30, rSignOuter, rSignInner, P.line, 1);
    text(
      i * 30 + 15,
      (rSignOuter + rSignInner) / 2,
      SIGN_GLYPHS[i],
      R * 0.085,
      P.gold,
    );
  }
  for (let d = 0; d < 360; d++) {
    const len = d % 10 === 0 ? 0.045 : d % 5 === 0 ? 0.03 : 0.015;
    line(d, rSignInner, rSignInner - R * len, P.line, d % 30 === 0 ? 1.2 : 0.8);
  }

  // Houses.
  if (houses) {
    const cusps = houses.cusps.slice(0, 12);
    cusps.forEach((cusp, i) => {
      line(cusp, rSignInner, rInner, P.line, 0.8);
      if (cusps.length === 12) {
        const mid = cusp + norm(cusps[(i + 1) % 12] - cusp) / 2;
        text(mid, rHouseNum, String(i + 1), R * 0.05, P.muted);
      }
    });
    // Ascendant and Midheaven on their own: in whole-sign and similar
    // systems they are not house cusps.
    line(houses.asc, rSignOuter, rInner, P.gold, 1.6);
    line(houses.mc, rSignOuter, rInner, P.gold, 1.6);
  }

  // Aspect lines.
  const lonIn = (k: string) =>
    k === 'asc'
      ? asc
      : k === 'mc'
      ? houses?.mc ?? 0
      : chart.bodies.find(b => b.key === k)?.lon;
  const lonOut = (k: string) =>
    (outer ?? chart).bodies.find(b => b.key === k)?.lon;
  const lines =
    aspects ??
    findAspects(aspectPoints(chart)).filter(
      a =>
        a.kind !== 'conjunction' &&
        ![a.a, a.b].some(k => k === 'asc' || k === 'mc'),
    );
  for (const a of lines) {
    const la = bi ? lonOut(a.a) : lonIn(a.a);
    const lb = lonIn(a.b);
    if (la === undefined || lb === undefined || a.kind === 'conjunction') {
      continue;
    }
    const p = pt(la, rInner);
    const q = pt(lb, rInner);
    shapes.push({
      t: 'line',
      x1: p.x,
      y1: p.y,
      x2: q.x,
      y2: q.y,
      stroke: HARD.has(a.kind) ? P.error : P.gold,
      width: 1,
      opacity: Math.max(0.35, 1 - a.orb / 9),
      dash:
        a.kind === 'sextile' || a.kind === 'semisextile' ? [4, 3] : undefined,
    });
  }

  // Planets of a ring: exact tick, glyph and degree spread apart.
  const ring = (
    bodies: ChartResult['bodies'],
    tickFrom: number,
    tickLen: number,
    rGlyph: number,
    rDeg: number,
    glyphSize: number,
    color: string,
    dots: boolean,
  ) => {
    const list = bodies.filter(b => PLANET_GLYPHS[b.key]);
    const shown = spread(list.map(b => b.lon));
    list.forEach((b, i) => {
      line(b.lon, tickFrom, tickFrom - R * tickLen, color, 1.4);
      if (dots) {
        const d = pt(b.lon, rInner);
        shapes.push({ t: 'dot', cx: d.x, cy: d.y, r: 1.8, fill: P.text });
      }
      text(shown[i], rGlyph, PLANET_GLYPHS[b.key] + T, glyphSize, color);
      const deg = Math.floor(norm(b.lon) % 30);
      text(
        shown[i],
        rDeg,
        `${deg}°${b.retrograde ? '℞' : ''}`,
        R * 0.036,
        P.muted,
      );
    });
  };
  ring(
    chart.bodies,
    bi ? rSeparator : rSignInner,
    bi ? 0.03 : 0.05,
    rPlanet,
    rDegree,
    R * 0.078,
    P.text,
    true,
  );
  if (outer) {
    ring(
      outer.bodies,
      rSignInner,
      0.035,
      rOuterPlanet,
      rOuterDegree,
      R * 0.068,
      P.gold,
      false,
    );
  }
  return shapes;
}

export function ChartWheel(props: WheelInput) {
  const { chart, size, outer, aspects, palette } = props;
  const shapes = useMemo(
    () => wheelShapes({ chart, size, outer, aspects, palette }),
    [chart, size, outer, aspects, palette],
  );
  return (
    <Svg width={size} height={size}>
      {shapes.map((s, i) => {
        switch (s.t) {
          case 'circle':
            return (
              <Circle
                key={i}
                cx={s.cx}
                cy={s.cy}
                r={s.r}
                stroke={s.stroke}
                strokeWidth={s.width}
                fill={s.fill}
              />
            );
          case 'dot':
            return <Circle key={i} cx={s.cx} cy={s.cy} r={s.r} fill={s.fill} />;
          case 'line':
            return (
              <Line
                key={i}
                x1={s.x1}
                y1={s.y1}
                x2={s.x2}
                y2={s.y2}
                stroke={s.stroke}
                strokeWidth={s.width}
                strokeOpacity={s.opacity}
                strokeDasharray={s.dash}
              />
            );
          case 'text':
            return (
              <SvgText
                key={i}
                x={s.x}
                y={s.y}
                fontSize={s.size}
                fill={s.fill}
                textAnchor="middle"
              >
                {s.text}
              </SvgText>
            );
        }
      })}
    </Svg>
  );
}

/** The same wheel as an SVG document, for HTML/PDF. */
export function wheelSvg(input: WheelInput): string {
  const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');
  const f = (n: number) => n.toFixed(2);
  const body = wheelShapes(input)
    .map(s => {
      switch (s.t) {
        case 'circle':
          return `<circle cx="${f(s.cx)}" cy="${f(s.cy)}" r="${f(
            s.r,
          )}" stroke="${s.stroke}" stroke-width="${s.width}" fill="${
            s.fill
          }"/>`;
        case 'dot':
          return `<circle cx="${f(s.cx)}" cy="${f(s.cy)}" r="${s.r}" fill="${
            s.fill
          }"/>`;
        case 'line':
          return `<line x1="${f(s.x1)}" y1="${f(s.y1)}" x2="${f(s.x2)}" y2="${f(
            s.y2,
          )}" stroke="${s.stroke}" stroke-width="${s.width}"${
            s.opacity !== undefined
              ? ` stroke-opacity="${s.opacity.toFixed(2)}"`
              : ''
          }${s.dash ? ` stroke-dasharray="${s.dash.join(',')}"` : ''}/>`;
        case 'text':
          return `<text x="${f(s.x)}" y="${f(s.y)}" font-size="${f(
            s.size,
          )}" fill="${s.fill}" text-anchor="middle">${esc(s.text)}</text>`;
      }
    })
    .join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${input.size}" height="${input.size}" viewBox="0 0 ${input.size} ${input.size}">${body}</svg>`;
}
