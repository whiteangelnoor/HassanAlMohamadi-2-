// Two-chart techniques and fixed stars. AGPL-3.0-or-later.
//
// - Synastry: aspects from one person's planets to the other's planets and
//   angles, orb 6° (8° with a luminary).
// - Composite: the nearer midpoint of each pair of positions; the composite
//   Ascendant and Midheaven are the midpoints of the two charts' angles.
// - Fixed stars: conjunctions within 1° of 30 bright or traditional stars.

import { AstroEngine, ChartResult } from './engine';
import { CrossAspect, natalPoints } from './predictive';

const norm = (x: number) => ((x % 360) + 360) % 360;
const separation = (x: number, y: number) => {
  const d = Math.abs(norm(x) - norm(y));
  return d > 180 ? 360 - d : d;
};

const SYN_ASPECTS: [CrossAspect['kind'], number][] = [
  ['conjunction', 0],
  ['sextile', 60],
  ['square', 90],
  ['trine', 120],
  ['opposition', 180],
];

export interface SynastryAspect {
  a: string; // first person's point
  b: string; // second person's point
  kind: CrossAspect['kind'];
  orb: number;
}

export function synastryAspects(
  a: ChartResult,
  b: ChartResult,
  orb = 6,
  luminaryOrb = 8,
): SynastryAspect[] {
  const out: SynastryAspect[] = [];
  for (const p of natalPoints(a)) {
    for (const q of natalPoints(b)) {
      if (
        (p.key === 'asc' || p.key === 'mc') &&
        (q.key === 'asc' || q.key === 'mc')
      ) {
        continue;
      }
      const lim = [p.key, q.key].some(k => k === 'sun' || k === 'moon')
        ? luminaryOrb
        : orb;
      const sep = separation(p.lon, q.lon);
      for (const [kind, angle] of SYN_ASPECTS) {
        const o = Math.abs(sep - angle);
        if (o <= lim) {
          out.push({ a: p.key, b: q.key, kind, orb: o });
          break;
        }
      }
    }
  }
  return out.sort((x, y) => x.orb - y.orb);
}

/** Midpoint on the shorter arc. */
export function midpoint(x: number, y: number): number {
  const d = norm(y - x);
  return norm(d <= 180 ? x + d / 2 : x + d / 2 + 180);
}

/** A composite chart shaped like an engine chart (no cusps, speeds 0). */
export function compositeChart(a: ChartResult, b: ChartResult): ChartResult {
  const bodies = a.bodies.flatMap(x => {
    const y = b.bodies.find(z => z.key === x.key);
    if (!y) {
      return [];
    }
    const lon = midpoint(x.lon, y.lon);
    return [
      {
        ...x,
        lon,
        lat: 0,
        lonSpeed: 0,
        latSpeed: 0,
        distSpeed: 0,
        retrograde: false,
        sign: { index: Math.floor(lon / 30), degree: lon % 30 },
        housePosition: undefined,
      },
    ];
  });
  const houses =
    a.houses && b.houses
      ? {
          ...a.houses,
          system: '',
          systemName: '',
          cusps: [],
          asc: midpoint(a.houses.asc, b.houses.asc),
          mc: midpoint(a.houses.mc, b.houses.mc),
          fallbackUsed: false,
        }
      : undefined;
  return { ...a, jdUt: (a.jdUt + b.jdUt) / 2, bodies, houses, warnings: [] };
}

// ---------- fixed stars -------------------------------------------------------------

export const STARS: { name: string; arabic: string }[] = [
  { name: 'Regulus', arabic: 'قلب الأسد' },
  { name: 'Spica', arabic: 'السماك الأعزل' },
  { name: 'Algol', arabic: 'رأس الغول' },
  { name: 'Aldebaran', arabic: 'الدبران' },
  { name: 'Antares', arabic: 'قلب العقرب' },
  { name: 'Fomalhaut', arabic: 'فم الحوت' },
  { name: 'Sirius', arabic: 'الشعرى اليمانية' },
  { name: 'Arcturus', arabic: 'السماك الرامح' },
  { name: 'Vega', arabic: 'النسر الواقع' },
  { name: 'Altair', arabic: 'النسر الطائر' },
  { name: 'Pollux', arabic: 'رأس التوأم المؤخر' },
  { name: 'Castor', arabic: 'رأس التوأم المقدم' },
  { name: 'Procyon', arabic: 'الشعرى الشامية' },
  { name: 'Betelgeuse', arabic: 'منكب الجوزاء' },
  { name: 'Rigel', arabic: 'رجل الجبار' },
  { name: 'Capella', arabic: 'العيّوق' },
  { name: 'Deneb Algedi', arabic: 'ذنب الجدي' },
  { name: 'Denebola', arabic: 'الصرفة' },
  { name: 'Alcyone', arabic: 'الثريا' },
  { name: 'Achernar', arabic: 'آخر النهر' },
  { name: 'Canopus', arabic: 'سهيل' },
  { name: 'Zubenelgenubi', arabic: 'الزبانى الجنوبي' },
  { name: 'Zubeneschamali', arabic: 'الزبانى الشمالي' },
  { name: 'Vindemiatrix', arabic: 'مقدم القطاف' },
  { name: 'Markab', arabic: 'مركب الفرس' },
  { name: 'Scheat', arabic: 'ساق الفرس' },
  { name: 'Algenib', arabic: 'جناح الفرس' },
  { name: 'Alphecca', arabic: 'الفكّة' },
  { name: 'Rasalhague', arabic: 'رأس الحوّاء' },
  { name: 'Deneb', arabic: 'ذنب الدجاجة' },
];

export interface StarContact {
  star: string; // Arabic name
  point: string; // chart point key
  orb: number;
  starLon: number;
  magnitude: number;
}

export function starContacts(chart: ChartResult, orb = 1): StarContact[] {
  const r = AstroEngine.fixedStars({
    time: { jdUt: chart.jdUt },
    names: STARS.map(s => s.name),
  });
  const out: StarContact[] = [];
  r.stars.forEach((s, i) => {
    for (const p of natalPoints(chart)) {
      const o = separation(s.lon, p.lon);
      if (o <= orb) {
        out.push({
          star: STARS[i].arabic,
          point: p.key,
          orb: o,
          starLon: s.lon,
          magnitude: s.magnitude,
        });
      }
    }
  });
  return out.sort((x, y) => x.orb - y.orb);
}
