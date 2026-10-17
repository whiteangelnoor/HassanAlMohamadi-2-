// Horary questions (علم المسائل) after the Arabic method of Masha'allah and
// Sahl ibn Bishr, as carried on by the later books: the lord of the
// Ascendant and the Moon signify the querent, the lord of the house of the
// matter signifies the matter, and the judgment comes from whether and how
// they join before either leaves its sign. AGPL-3.0-or-later.
//
// Tropical zodiac, the seven planets, the five Ptolemaic aspects, houses by
// Regiomontanus as in the later horary books.

import { AstroEngine, ChartResult } from './engine';
import { crossings, ingresses, lonAt, Track, tracks } from './events';
import { planetaryDay } from './planetaryHours';
import {
  computeLots,
  DignityKind,
  isDayChart,
  Planet,
  planetDignity,
  PLANETS,
  rulersAt,
} from './traditional';

export type HoraryAspect =
  | 'conjunction'
  | 'sextile'
  | 'square'
  | 'trine'
  | 'opposition';

const ASPECTS: { kind: HoraryAspect; targets: number[] }[] = [
  { kind: 'conjunction', targets: [0] },
  { kind: 'sextile', targets: [60, 300] },
  { kind: 'square', targets: [90, 270] },
  { kind: 'trine', targets: [120, 240] },
  { kind: 'opposition', targets: [180] },
];

/** Orbs of light (Lilly); a planet's moiety is half. */
const ORB: Record<Planet, number> = {
  sun: 15,
  moon: 12,
  mercury: 7,
  venus: 7,
  mars: 7.5,
  jupiter: 9,
  saturn: 9,
};

const norm = (x: number) => ((x % 360) + 360) % 360;
const wrap = (x: number) => norm(x + 180) - 180;

export const HORARY_HOUSE_SYSTEM = 'R';

const YES_SUMMARY: Record<HoraryAspect, string> = {
  conjunction: 'يتم الأمر، والاتصال بالمقارنة وهي أقوى الاتصالات.',
  trine: 'يتم الأمر بسهولة.',
  sextile: 'يتم الأمر بيسر.',
  square: 'يتم الأمر بعد تعب وعسر.',
  opposition: 'يتم الأمر لكن مع خصام أو ندم بعده.',
};

export interface Join {
  a: Planet;
  b: Planet;
  kind: HoraryAspect;
  jd: number;
}

export interface PlanetState {
  planet: Planet;
  lon: number;
  house: number;
  dignities: DignityKind[];
  retrograde: boolean;
  /** Within 17′ of the Sun, within 8.5°, within 17°. */
  sun: 'cazimi' | 'combust' | 'beams' | null;
  angularity: 'angular' | 'succedent' | 'cadent';
  speed: number;
}

export interface Testimony {
  text: string;
  /** +1 for the matter, -1 against, 0 a remark. */
  weight: 1 | -1 | 0;
}

export interface HoraryJudgment {
  chart: ChartResult;
  jd: number;
  house: number; // house of the matter, counted from the Ascendant
  /** House of the person asked about (1 = the querent); 'house' derives from it. */
  subject: number;
  /** Lords of the twelve houses counted from the subject's house. */
  relLords: Planet[];
  /** For an unspoken question: how its house was found. */
  intention: { by: Planet; via: 'moon' | 'hour' } | null;
  querent: PlanetState;
  quesited: PlanetState;
  moon: PlanetState;
  /** When the lords are one planet the Moon stands for the querent. */
  sameLord: boolean;
  outcome: 'yes' | 'no' | 'doubt';
  summary: string;
  testimonies: Testimony[];
  considerations: string[];
  perfection: Join | null;
  moonNext: Join | null;
  moonLast: Join | null;
  hourLord: Planet | null;
  timing: string | null;
  /** Every planet's state, the lords of the twelve houses. */
  states: Record<Planet, PlanetState>;
  lords: Planet[];
  /** Aspects within the moiety of orbs at the question. */
  aspectsNow: NowAspect[];
  prohibition: Join | null;
  /** Reception between the significators. */
  reception: 'mutual' | 'matterReceives' | 'querentReceives' | null;
  translation: Planet | null;
  collection: Planet | null;
  fortune: { lon: number; house: number };
  /** The next exact aspect of a and b before either leaves its sign. */
  joinOf: (a: Planet, b: Planet) => Join | null;
}

export interface NowAspect {
  a: Planet;
  b: Planet;
  kind: HoraryAspect;
  orb: number;
  applying: boolean;
}

/** Aspects within the planets' moieties, applying when the gap is closing. */
export function aspectsInOrb(chart: ChartResult): NowAspect[] {
  const out: NowAspect[] = [];
  const pos = PLANETS.map(p => chart.bodies.find(b => b.key === p)!);
  for (let i = 0; i < pos.length; i++) {
    for (let k = i + 1; k < pos.length; k++) {
      const a = pos[i];
      const b = pos[k];
      const moiety = (ORB[a.key as Planet] + ORB[b.key as Planet]) / 2;
      for (const { kind, targets } of ASPECTS) {
        for (const g of targets) {
          const gap = (x: number, y: number) => Math.abs(wrap(x - y - g));
          const now = gap(a.lon, b.lon);
          if (now > moiety) {
            continue;
          }
          const later = gap(
            a.lon + a.lonSpeed * 0.01,
            b.lon + b.lonSpeed * 0.01,
          );
          out.push({
            a: a.key as Planet,
            b: b.key as Planet,
            kind,
            orb: now,
            applying: later < now,
          });
        }
      }
    }
  }
  return out.sort((x, y) => x.orb - y.orb);
}

// ---------- motion ----------------------------------------------------------------

type Tracks = Record<Planet, Track>;

function joinsBetween(t: Tracks, a: Planet, b: Planet): Join[] {
  return ASPECTS.flatMap(({ kind, targets }) =>
    crossings(t[a], t[b], targets).map(c => ({ a, b, kind, jd: c.jd })),
  ).sort((x, y) => x.jd - y.jd);
}

function nextJoin(
  t: Tracks,
  a: Planet,
  b: Planet,
  from: number,
  until: number,
): Join | null {
  return joinsBetween(t, a, b).find(j => j.jd > from && j.jd <= until) ?? null;
}

function lastJoin(t: Tracks, a: Planet, b: Planet, before: number) {
  const list = joinsBetween(t, a, b).filter(j => j.jd <= before);
  return list.length ? list[list.length - 1] : null;
}

/** When the planet next changes sign (forwards or backwards). */
function signExit(t: Tracks, p: Planet, from: number): number {
  const next = ingresses(t[p], p).find(i => i.jd > from);
  return next ? next.jd : Infinity;
}

/** When the planet last entered its present sign. */
function signEntry(t: Tracks, p: Planet, at: number): number {
  const list = ingresses(t[p], p).filter(i => i.jd <= at);
  return list.length ? list[list.length - 1].jd : -Infinity;
}

/** The first station (turn of direction) of a planet in (from, until]. */
export function stationAfter(
  t: Tracks,
  p: Planet,
  from: number,
  until: number,
): number | null {
  const tr = t[p];
  for (let i = 0; i + 1 < tr.speed.length; i++) {
    const a = tr.start + i * tr.step;
    const b = a + tr.step;
    if (b <= from || a > until) {
      continue;
    }
    if (tr.speed[i] * tr.speed[i + 1] < 0) {
      // Linear zero of the speed between the samples.
      const u = tr.speed[i] / (tr.speed[i] - tr.speed[i + 1]);
      const at = a + u * tr.step;
      if (at > from && at <= until) {
        return at;
      }
    }
  }
  return null;
}

/** Mean daily motions (Lilly). */
const MEAN_SPEED: Record<Planet, number> = {
  sun: 0.9856,
  moon: 13.1764,
  mercury: 0.9856,
  venus: 0.9856,
  mars: 0.524,
  jupiter: 0.083,
  saturn: 0.0336,
};

const HORARY_STARS: {
  name: string;
  arabic: string;
  meaning: string;
  weight: 1 | -1 | 0;
}[] = [
  {
    name: 'Algol',
    arabic: 'رأس الغول',
    meaning: 'نجم شؤم، خطر وأذى',
    weight: -1,
  },
  {
    name: 'Antares',
    arabic: 'قلب العقرب',
    meaning: 'خصومة وعنف، ونجاح يعقبه سقوط',
    weight: -1,
  },
  {
    name: 'Regulus',
    arabic: 'قلب الأسد',
    meaning: 'رفعة ونجاح وجاه',
    weight: 1,
  },
  {
    name: 'Spica',
    arabic: 'السماك الأعزل',
    meaning: 'نعمة وحماية وتيسير',
    weight: 1,
  },
  {
    name: 'Aldebaran',
    arabic: 'الدبران',
    meaning: 'نجاح وشرف مع خطر',
    weight: 0,
  },
];

function houseOfLon(chart: ChartResult, lon: number): number {
  const cusps = chart.houses!.cusps;
  for (let h = 0; h < 12; h++) {
    const a = cusps[h];
    const b = cusps[(h + 1) % 12];
    if (norm(lon - a) < norm(b - a)) {
      return h + 1;
    }
  }
  return 12;
}

/** The Arabic lot belonging to a house's matter, where one is used. */
function matterLot(
  chart: ChartResult,
  rel: number,
  day: boolean,
  lordOf: (h: number) => Planet,
  st: (c: ChartResult, p: Planet, d: boolean) => PlanetState,
): { name: string; lon: number } | null {
  const h = chart.houses!;
  const L = (p: Planet) => st(chart, p, day).lon;
  const lot = (plus: number, minus: number) => norm(h.asc + plus - minus);
  switch (rel) {
    case 2:
      return { name: 'سهم المال', lon: lot(h.cusps[1], L(lordOf(2))) };
    case 5:
      return {
        name: 'سهم الأولاد',
        lon: day
          ? lot(L('jupiter'), L('saturn'))
          : lot(L('saturn'), L('jupiter')),
      };
    case 6:
      return {
        name: 'سهم المرض',
        lon: day ? lot(L('mars'), L('saturn')) : lot(L('saturn'), L('mars')),
      };
    case 9:
      return { name: 'سهم السفر', lon: lot(h.cusps[8], L(lordOf(9))) };
    default:
      return null;
  }
}

// ---------- the judgment ----------------------------------------------------------

export const SIGN_MODALITY = ['cardinal', 'fixed', 'mutable'] as const;

function angularity(house: number): PlanetState['angularity'] {
  return house % 3 === 1 ? 'angular' : house % 3 === 2 ? 'succedent' : 'cadent';
}

function state(chart: ChartResult, p: Planet, day: boolean): PlanetState {
  const b = chart.bodies.find(x => x.key === p)!;
  const sun = chart.bodies.find(x => x.key === 'sun')!;
  const fromSun = Math.abs(wrap(b.lon - sun.lon));
  const house = Math.floor(b.housePosition ?? 1);
  return {
    planet: p,
    lon: b.lon,
    house,
    dignities: planetDignity(p, b.lon, day).dignities,
    retrograde: b.retrograde,
    sun:
      p === 'sun'
        ? null
        : fromSun < 17 / 60
        ? 'cazimi'
        : fromSun < 8.5
        ? 'combust'
        : fromSun < 17
        ? 'beams'
        : null,
    angularity: angularity(house),
    speed: b.lonSpeed,
  };
}

/** Does `host` receive `guest` (guest stands in host's domicile or exaltation)? */
export function receives(host: Planet, guestLon: number): boolean {
  const r = rulersAt(guestLon);
  return r.domicile === host || r.exaltation === host;
}

export interface HoraryNames {
  planet: (p: Planet) => string;
  aspect: (k: HoraryAspect) => string;
  date: (jd: number) => string;
}

export function judge(
  jd: number,
  place: { lat: number; lon: number },
  asked: number | 'intention',
  names: HoraryNames,
  subjectHouse = 1,
): HoraryJudgment {
  const chart = AstroEngine.chart({
    zodiac: { type: 'tropical' },
    time: { jdUt: jd },
    location: place,
    houseSystem: HORARY_HOUSE_SYSTEM,
    bodies: PLANETS,
  });
  const houses = chart.houses!;
  const day = isDayChart(chart);
  const t = tracks(PLANETS, jd - 40, jd + 800, 1, {
    zodiac: { type: 'tropical' },
  }) as Tracks;
  const N = names.planet;

  const lordOf = (h: number) => rulersAt(houses.cusps[h - 1]).domicile;
  const exit = (p: Planet) => signExit(t, p, jd);
  // The Moon: last separation and next application within her sign.
  const moonExit = exit('moon');
  const others = PLANETS.filter(p => p !== 'moon');
  const moonNext =
    others
      .map(p => nextJoin(t, 'moon', p, jd, moonExit))
      .filter((j): j is Join => j !== null)
      .sort((x, y) => x.jd - y.jd)[0] ?? null;
  const moonLast =
    others
      .map(p => lastJoin(t, 'moon', p, jd))
      .filter((j): j is Join => j !== null)
      .sort((x, y) => y.jd - x.jd)[0] ?? null;
  // Hour lord at the question.
  let hourLord: Planet | null = null;
  const qDate = new Date((jd - 2440587.5) * 86400000);
  for (const k of [0, -1]) {
    const d = new Date(
      qDate.getFullYear(),
      qDate.getMonth(),
      qDate.getDate() + k,
    );
    const p = planetaryDay(
      d.getFullYear(),
      d.getMonth() + 1,
      d.getDate(),
      place.lat,
      place.lon,
    );
    const h = p?.hours.find(x => jd >= x.startJd && jd < x.endJd);
    if (h) {
      hourLord = h.ruler;
      break;
    }
  }
  // An unspoken question: the matter is read from the chart itself.
  let intention: HoraryJudgment['intention'] = null;
  let rel: number;
  const subject = asked === 'intention' ? 1 : subjectHouse;
  if (asked === 'intention') {
    const found = intentionHouse(chart, moonNext, hourLord);
    rel = found ? found.house : 1;
    intention = found ? { by: found.by, via: found.via } : null;
  } else {
    rel = asked;
  }
  // Turned houses: a matter of another person is counted from that
  // person's house (the mother's illness is the sixth from the tenth).
  const from = (h: number) => ((subject - 1 + h - 1) % 12) + 1;
  const house = from(rel);
  const ascLord = lordOf(1);
  const subjectLord = lordOf(subject);
  const matterLord = lordOf(house);
  const sameLord = subjectLord === matterLord;
  // One planet cannot join itself: the Moon then signifies the asker's side.
  const A: Planet = sameLord ? 'moon' : subjectLord;
  const B: Planet = matterLord;
  const sA = state(chart, A, day);
  const sB = state(chart, B, day);
  const sMoon = state(chart, 'moon', day);

  const tests: Testimony[] = [];
  const cons: string[] = [];

  // Considerations before judgment.
  const ascDeg = norm(houses.asc) % 30;
  if (ascDeg < 3) {
    cons.push(
      'الطالع في أول درجات برجه: المسألة سابقة لأوانها أو لم تنضج بعد.',
    );
  } else if (ascDeg > 27) {
    cons.push(
      'الطالع في آخر درجات برجه: الأمر قد فات أو حُسم، أو سُئل عنه بعد أن قُضي.',
    );
  }
  const moonLon = norm(sMoon.lon);
  if (moonLon >= 195 && moonLon < 225) {
    cons.push(
      'القمر في الطريق المحترقة (بين منتصف الميزان ومنتصف العقرب): أحواله مضطربة.',
    );
  }
  const saturn = state(chart, 'saturn', day);
  if (saturn.house === 1 || saturn.house === 7) {
    cons.push(
      `زحل في البيت ${
        saturn.house === 1 ? 'الأول' : 'السابع'
      }: يُخشى على الحكم من الخطأ أو على المسألة من التعطيل.`,
    );
  }

  const moonSign = Math.floor(norm(sMoon.lon) / 30);
  // Void in Taurus, Cancer, Sagittarius or Pisces harms less (Lilly).
  const voidExcepted = [1, 3, 8, 11].includes(moonSign);
  const moonVoid = moonNext === null && !voidExcepted;
  if (moonNext === null && voidExcepted) {
    tests.push({
      text: 'القمر خالي السير، لكنه في برج يُستثنى فيه خلوّ السير (الثور أو السرطان أو القوس أو الحوت)، فلا يُبطل الأمر.',
      weight: 0,
    });
  } else if (moonVoid) {
    tests.push({
      text: 'القمر خالي السير: لا يتصل بكوكب قبل خروجه من برجه، وأكثر ما يدل عليه أن لا يكون من الأمر شيء.',
      weight: -1,
    });
  } else {
    const benefic = ['jupiter', 'venus'].includes(moonNext.b);
    const malefic = ['saturn', 'mars'].includes(moonNext.b);
    tests.push({
      text: `القمر يتصل بعد هذا بـ${N(moonNext.b)} ${names.aspect(
        moonNext.kind,
      )}${benefic ? '، وهو سعد' : malefic ? '، وهو نحس' : ''}.`,
      weight: benefic ? 1 : malefic ? -1 : 0,
    });
  }

  // The Moon's light: waxing helps; just before the new Moon she is spent.
  const sunLon = state(chart, 'sun', day).lon;
  const elong = norm(sMoon.lon - sunLon);
  if (elong > 348) {
    tests.push({
      text: 'القمر قبيل المحاق، نوره ذاهب: ضعف في الأمر وخفاء.',
      weight: -1,
    });
  } else {
    tests.push({
      text:
        elong < 180
          ? 'نور القمر زائد: الأمر في نماء.'
          : 'نور القمر ناقص: الأمر يميل إلى النقصان أو الخفاء.',
      weight: 0,
    });
  }

  // Main perfection between the two significators, before either changes sign.
  const limit = Math.min(exit(A), exit(B));
  const perfection = nextJoin(t, A, B, jd, limit);
  const MANNER: Record<HoraryAspect, string> = {
    conjunction: 'بالمقارنة، وهي أقوى الاتصالات',
    trine: 'بالتثليث، فيتم بسهولة',
    sextile: 'بالتسديس، فيتم بيسر',
    square: 'بالتربيع، فيتم بعد تعب وعسر',
    opposition: 'بالمقابلة، فإن تم كان مع خصام أو ندم',
  };
  if (perfection) {
    tests.push({
      text: `${N(A)} و${N(B)} يتصلان ${
        MANNER[perfection.kind]
      }، ويكتمل الاتصال ${names.date(perfection.jd)}.`,
      weight: perfection.kind === 'opposition' ? 0 : 1,
    });
  } else {
    tests.push({
      text: `لا يتصل ${N(A)} و${N(B)} قبل أن يخرج أحدهما من برجه.`,
      weight: -1,
    });
  }

  // Prohibition: a third planet (not the Moon) joins a significator first.
  let prohibition: Join | null = null;
  if (perfection) {
    for (const C of PLANETS) {
      if (C === A || C === B || C === 'moon') {
        continue;
      }
      for (const S of [A, B]) {
        const sp = state(chart, S, day).speed;
        const sc = state(chart, C, day).speed;
        if (Math.abs(sc) <= Math.abs(sp)) {
          continue; // only a faster planet applies to the significator
        }
        const j = nextJoin(t, C, S, jd, Math.min(perfection.jd, exit(C)));
        if (j && (!prohibition || j.jd < prohibition.jd)) {
          prohibition = j;
        }
      }
    }
    if (prohibition) {
      tests.push({
        text: `يعترض ${N(prohibition.a)} فيتصل بـ${N(
          prohibition.b,
        )} ${names.aspect(
          prohibition.kind,
        )} قبل تمام الاتصال: مانع يقطع الأمر أو يغيّره.`,
        weight: -1,
      });
    }
  }

  // Translation of light: a faster planet separating from one significator
  // and applying next to the other.
  let translation: Planet | null = null;
  if (!perfection) {
    for (const C of PLANETS) {
      if (C === A || C === B) {
        continue;
      }
      const sc = Math.abs(state(chart, C, day).speed);
      if (sc <= Math.abs(sA.speed) || sc <= Math.abs(sB.speed)) {
        continue;
      }
      for (const [src, to] of [
        [A, B],
        [B, A],
      ] as [Planet, Planet][]) {
        const last = lastJoin(t, C, src, jd);
        if (!last) {
          continue;
        }
        const moiety = (ORB[C] + ORB[src]) / 2;
        const target = ASPECTS.find(x => x.kind === last.kind)!.targets;
        const sep = Math.min(
          ...target.map(g =>
            Math.abs(wrap(lonAt(t[C], jd) - lonAt(t[src], jd) - g)),
          ),
        );
        if (sep > moiety) {
          continue;
        }
        const cExit = exit(C);
        const nextOfC = PLANETS.filter(p => p !== C)
          .map(p => nextJoin(t, C, p, jd, cExit))
          .filter((j): j is Join => j !== null)
          .sort((x, y) => x.jd - y.jd)[0];
        if (nextOfC && nextOfC.b === to) {
          translation = C;
        }
      }
      if (translation) {
        break;
      }
    }
    if (translation) {
      tests.push({
        text: `${N(
          translation,
        )} ينقل النور بينهما: ينفصل عن أحدهما ويتصل بالآخر، فيتم الأمر بواسطة شخص أو سبب.`,
        weight: 1,
      });
    }
  }

  // Collection of light: a slower planet that both apply to.
  let collection: Planet | null = null;
  if (!perfection && !translation) {
    for (const D of PLANETS) {
      if (D === A || D === B) {
        continue;
      }
      const sd = Math.abs(state(chart, D, day).speed);
      if (sd >= Math.abs(sA.speed) || sd >= Math.abs(sB.speed)) {
        continue;
      }
      const dExit = exit(D);
      const ja = nextJoin(t, A, D, jd, Math.min(exit(A), dExit));
      const jb = nextJoin(t, B, D, jd, Math.min(exit(B), dExit));
      if (ja && jb) {
        collection = D;
        break;
      }
    }
    if (collection) {
      tests.push({
        text: `${N(
          collection,
        )} يجمع نورهما: كلاهما يتصل به، فيتم الأمر بتدخل طرف ثالث.`,
        weight: 1,
      });
    }
  }

  // The Moon as the querent's partner applying to the lord of the matter.
  const moonToB =
    A !== 'moon' && B !== 'moon'
      ? nextJoin(t, 'moon', B, jd, Math.min(moonExit, exit(B)))
      : null;
  if (moonToB && !perfection) {
    tests.push({
      text: `القمر (شريك السائل) يتصل بـ${N(B)} صاحب المسألة ${names.aspect(
        moonToB.kind,
      )}: شاهد أضعف على حصول الأمر.`,
      weight: 1,
    });
  }

  // Refranation: applying now, but one turns about before the aspect is exact.
  if (!perfection) {
    const nowApplying = aspectsInOrb(chart).some(
      x => x.applying && ((x.a === A && x.b === B) || (x.a === B && x.b === A)),
    );
    const turn = [A, B]
      .map(p => ({ p, jd: stationAfter(t, p, jd, limit) }))
      .filter(x => x.jd !== null)
      .sort((x, y) => x.jd! - y.jd!)[0];
    if (nowApplying && turn) {
      tests.push({
        text: `ردّ النور: ${N(A)} و${N(B)} يتقاربان، لكن ${N(
          turn.p,
        )} يقف ويرجع قبل تمام الاتصال؛ يقترب الأمر ثم ينقلب أحد الطرفين عنه.`,
        weight: -1,
      });
    }
  }

  // Besiegement: between Mars and Saturn, leaving one and meeting the other.
  for (const S of A === B ? [A] : [A, B]) {
    const entry = signEntry(t, S, jd);
    const last = PLANETS.filter(x => x !== S)
      .map(x => lastJoin(t, S, x, jd))
      .filter((x): x is Join => x !== null && x.jd > entry)
      .sort((x, y) => y.jd - x.jd)[0];
    const next = PLANETS.filter(x => x !== S)
      .map(x => nextJoin(t, S, x, jd, exit(S)))
      .filter((x): x is Join => x !== null)
      .sort((x, y) => x.jd - y.jd)[0];
    if (
      last &&
      next &&
      ((last.b === 'mars' && next.b === 'saturn') ||
        (last.b === 'saturn' && next.b === 'mars'))
    ) {
      tests.push({
        text: `${N(S)} محاصَر بين النحسين (انفصل عن ${N(last.b)} ويتصل بـ${N(
          next.b,
        )}): ضيق وتعطيل.`,
        weight: -1,
      });
    }
  }

  // Speed: slow significators delay, fast ones hasten.
  for (const S of A === B ? [A] : [A, B]) {
    if (S === 'sun') {
      continue;
    }
    const sp = state(chart, S, day).speed;
    const v = Math.abs(sp);
    if (sp < 0) {
      continue; // retrograde is judged on its own
    }
    if (v < MEAN_SPEED[S] * 0.7) {
      tests.push({ text: `${N(S)} بطيء السير: تأخير وإبطاء.`, weight: 0 });
    } else if (v > MEAN_SPEED[S] * 1.2) {
      tests.push({ text: `${N(S)} سريع السير: تعجيل.`, weight: 0 });
    }
  }

  // Fixed stars on the angles or the significators (within 1°).
  try {
    const stars = AstroEngine.fixedStars({
      zodiac: { type: 'tropical' },
      time: { jdUt: jd },
      names: HORARY_STARS.map(x => x.name),
    }).stars;
    const points: [string, number][] = [
      ['الطالع', houses.asc],
      ['وسط السماء', houses.mc],
      [`${N(A)} (دليل السائل)`, sA.lon],
      [`${N(B)} (دليل المسألة)`, state(chart, B, day).lon],
    ];
    stars.forEach((st, i) => {
      for (const [label, lon] of points) {
        if (Math.abs(wrap(st.lon - lon)) <= 1) {
          const info = HORARY_STARS[i];
          tests.push({
            text: `${info.arabic} على ${label}: ${info.meaning}.`,
            weight: info.weight,
          });
        }
      }
    });
  } catch {
    // no star file on this device: the stars are left out
  }

  // The lot of the matter (from the Ascendant, for the querent's own matters).
  if (subject === 1) {
    const lot = matterLot(chart, rel, day, lordOf, state);
    if (lot) {
      const lotHouse = houseOfLon(chart, lot.lon);
      const near = PLANETS.filter(
        p => Math.abs(wrap(state(chart, p, day).lon - lot.lon)) <= 5,
      );
      const good = near.filter(p => p === 'jupiter' || p === 'venus');
      const bad = near.filter(p => p === 'saturn' || p === 'mars');
      const weightOf: 1 | -1 | 0 =
        good.length > bad.length
          ? 1
          : bad.length > good.length || [6, 8, 12].includes(lotHouse)
          ? -1
          : 0;
      tests.push({
        text: `${lot.name} في البيت ${lotHouse}${
          good.length ? ` مع ${good.map(N).join(' و')}` : ''
        }${bad.length ? ` مع ${bad.map(N).join(' و')}` : ''}${
          [6, 8, 12].includes(lotHouse) ? '، وهو بيت ساقط' : ''
        }.`,
        weight: weightOf,
      });
    }
  }

  // Reception.
  const BreceivesA = receives(B, sA.lon);
  const AreceivesB = receives(A, sB.lon);
  if (BreceivesA && AreceivesB) {
    tests.push({
      text: `بينهما قبول متبادل: كل منهما في بيت الآخر أو شرفه، وهو من أقوى شواهد الإتمام والرضا.`,
      weight: 1,
    });
  } else if (BreceivesA) {
    tests.push({
      text: `${N(B)} يقبل ${N(A)}: صاحب المسألة يرحّب بالسائل ويريده.`,
      weight: 1,
    });
  } else if (AreceivesB) {
    tests.push({
      text: `${N(A)} يقبل ${N(
        B,
      )}: السائل راغب في الأمر أكثر من رغبة الأمر فيه.`,
      weight: 0,
    });
  }

  // Condition of the significators.
  const condition = (s: PlanetState, who: string) => {
    const d = s.dignities;
    if (d.includes('domicile') || d.includes('exaltation')) {
      tests.push({
        text: `${N(s.planet)} (${who}) قوي في ${
          d.includes('domicile') ? 'بيته' : 'شرفه'
        }.`,
        weight: 1,
      });
    } else if (d.includes('detriment') || d.includes('fall')) {
      tests.push({
        text: `${N(s.planet)} (${who}) ضعيف في ${
          d.includes('detriment') ? 'وباله' : 'هبوطه'
        }.`,
        weight: -1,
      });
    } else if (d.includes('peregrine')) {
      tests.push({
        text: `${N(s.planet)} (${who}) غريب لا حظ له في موضعه.`,
        weight: 0,
      });
    }
    if (s.retrograde) {
      tests.push({
        text: `${N(s.planet)} (${who}) راجع: تراجع أو تردد أو عودة عن الأمر.`,
        weight: -1,
      });
    }
    if (s.sun === 'combust') {
      tests.push({
        text: `${N(
          s.planet,
        )} (${who}) محترق تحت الشمس: ضعف شديد أو خوف أو خفاء.`,
        weight: -1,
      });
    } else if (s.sun === 'cazimi') {
      tests.push({
        text: `${N(s.planet)} (${who}) في قلب الشمس: قوة عظيمة.`,
        weight: 1,
      });
    }
  };
  condition(
    sA,
    sameLord ? 'شريك السائل' : subject === 1 ? 'السائل' : 'صاحب الشأن',
  );
  condition(sB, 'المسألة');

  if (hourLord) {
    const ascRulers = rulersAt(houses.asc);
    const radical =
      hourLord === ascLord || ascRulers.triplicity.includes(hourLord);
    tests.push({
      text: radical
        ? `صاحب الساعة ${N(hourLord)} يوافق صاحب الطالع: المسألة صادقة جذرية.`
        : `صاحب الساعة ${N(
            hourLord,
          )} لا يوافق الطالع: قد لا يكون السؤال من القلب، فيُحتاط في الحكم.`,
      weight: 0,
    });
  }

  // Outcome.
  const plus = tests.filter(x => x.weight > 0).length;
  const minus = tests.filter(x => x.weight < 0).length;
  let outcome: HoraryJudgment['outcome'];
  let summary: string;
  if (perfection && !prohibition) {
    outcome = moonVoid ? 'doubt' : 'yes';
    summary =
      outcome === 'yes'
        ? YES_SUMMARY[perfection.kind]
        : 'الاتصال قائم لكن القمر خالي السير: يُرجى الأمر ولا يُجزم به.';
    if (perfection.kind === 'opposition') {
      summary = 'يتم الأمر لكن مع خصام أو ندم بعده.';
    }
  } else if (perfection && prohibition) {
    outcome = 'no';
    summary = `لا يتم كما يُرجى: ${N(prohibition.a)} يعترض قبل التمام.`;
  } else if (translation || collection) {
    outcome = moonVoid ? 'doubt' : 'yes';
    summary = translation
      ? `يتم الأمر بواسطة (${N(translation)} ينقل بينهما).`
      : `يتم الأمر بتدخل طرف ثالث (${N(collection!)} يجمع بينهما).`;
  } else if (moonToB) {
    outcome = 'doubt';
    summary = 'لا اتصال بين صاحبي المسألة، والقمر وحده يشهد له: أمل ضعيف.';
  } else {
    outcome = 'no';
    summary = 'لا يتم الأمر: لا اتصال بين صاحب السائل وصاحب المسألة.';
  }
  if (outcome === 'yes' && minus > plus + 1) {
    outcome = 'doubt';
    summary += ' لكن الشواهد المعاكسة كثيرة.';
  }

  // Timing: degrees the faster significator travels to perfection, in
  // units set by its sign and house.
  let timing: string | null = null;
  const timed = perfection ?? null;
  if (timed) {
    const fast = Math.abs(sA.speed) >= Math.abs(sB.speed) ? A : B;
    const sf = fast === A ? sA : sB;
    const deg = Math.abs(lonAt(t[fast], timed.jd) - lonAt(t[fast], jd));
    const modality = SIGN_MODALITY[Math.floor(norm(sf.lon) / 30) % 3];
    const UNITS: Record<PlanetState['angularity'], Record<string, string>> = {
      angular: { cardinal: 'أيام', mutable: 'أسابيع', fixed: 'أشهر' },
      succedent: { cardinal: 'أسابيع', mutable: 'أشهر', fixed: 'سنين' },
      cadent: { cardinal: 'أشهر', mutable: 'سنين', fixed: 'سنين' },
    };
    const n = Math.max(1, Math.round(deg));
    timing = `يكتمل الاتصال في السماء ${names.date(
      timed.jd,
    )}. وبالتوقيت الرمزي عند أهل المسائل (${n}° يقطعها ${N(
      fast,
    )} إلى الاتصال، كل درجة بوحدة يحددها برجه وبيته): نحو ${n} ${
      UNITS[sf.angularity][modality]
    }. إن اختلف التقديران فالأول حركة الكواكب الفعلية، والثاني قاعدة رمزية.`;
  }

  return {
    chart,
    jd,
    house,
    subject,
    relLords: Array.from({ length: 12 }, (_, i) => lordOf(from(i + 1))),
    intention,
    querent: sA,
    quesited: sB,
    moon: sMoon,
    sameLord,
    outcome,
    summary,
    testimonies: tests,
    considerations: cons,
    perfection,
    moonNext,
    moonLast,
    hourLord,
    timing,
    states: Object.fromEntries(
      PLANETS.map(p => [p, state(chart, p, day)]),
    ) as Record<Planet, PlanetState>,
    lords: Array.from({ length: 12 }, (_, i) => lordOf(i + 1)),
    aspectsNow: aspectsInOrb(chart),
    prohibition,
    reception:
      BreceivesA && AreceivesB
        ? 'mutual'
        : BreceivesA
        ? 'matterReceives'
        : AreceivesB
        ? 'querentReceives'
        : null,
    translation,
    collection,
    fortune: fortuneOf(chart),
    joinOf: (a: Planet, b: Planet) =>
      a === b ? null : nextJoin(t, a, b, jd, Math.min(exit(a), exit(b))),
  };
}

function fortuneOf(chart: ChartResult): { lon: number; house: number } {
  const lon = computeLots(chart).find(l => l.key === 'fortune')!.lon;
  const cusps = chart.houses!.cusps;
  let house = 12;
  for (let h = 0; h < 12; h++) {
    const a = cusps[h];
    const b = cusps[(h + 1) % 12];
    if (norm(lon - a) < norm(b - a)) {
      house = h + 1;
      break;
    }
  }
  return { lon, house };
}

/**
 * The querent's unspoken intention (الضمير): the house of the planet the
 * Moon next applies to, or else of the lord of the hour.
 */
export function intentionHouse(
  chart: ChartResult,
  moonNext: Join | null,
  hourLord: Planet | null,
): { house: number; by: Planet; via: 'moon' | 'hour' } | null {
  const p = moonNext?.b ?? hourLord;
  if (!p) {
    return null;
  }
  const b = chart.bodies.find(x => x.key === p)!;
  return {
    house: Math.floor(b.housePosition ?? 1),
    by: p,
    via: moonNext ? 'moon' : 'hour',
  };
}
