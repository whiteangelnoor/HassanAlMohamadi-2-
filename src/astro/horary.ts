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
  house: number; // house of the matter
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
  let house: number;
  if (asked === 'intention') {
    const found = intentionHouse(chart, moonNext, hourLord);
    house = found ? found.house : 1;
    intention = found ? { by: found.by, via: found.via } : null;
  } else {
    house = asked;
  }
  const ascLord = lordOf(1);
  const matterLord = lordOf(house);
  const sameLord = ascLord === matterLord;
  // One planet cannot join itself: the Moon then signifies the querent.
  const A: Planet = sameLord ? 'moon' : ascLord;
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

  const moonVoid = moonNext === null;
  if (moonVoid) {
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
      for (const [from, to] of [
        [A, B],
        [B, A],
      ] as [Planet, Planet][]) {
        const last = lastJoin(t, C, from, jd);
        if (!last) {
          continue;
        }
        const moiety = (ORB[C] + ORB[from]) / 2;
        const target = ASPECTS.find(x => x.kind === last.kind)!.targets;
        const sep = Math.min(
          ...target.map(g =>
            Math.abs(wrap(lonAt(t[C], jd) - lonAt(t[from], jd) - g)),
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
  condition(sA, sameLord ? 'شريك السائل' : 'السائل');
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
        ? `يتم الأمر ${MANNER[perfection.kind].replace(/^[^،]*،\s*/, '')}.`
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
  };
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
