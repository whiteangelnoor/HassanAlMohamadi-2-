// Monthly astrological calendar: Moon phases, ingresses, stations and the
// void-of-course Moon. AGPL-3.0-or-later.
//
// Void of course: from the Moon's last exact Ptolemaic aspect to any planet
// (Sun to Pluto) while in a sign, until it enters the next sign.

import { AstroEngine, BodyKey, Eclipse } from './engine';
import {
  aspectHits,
  AspectKind,
  Ingress,
  ingresses,
  moonPhases,
  Phase,
  Station,
  stations,
  tracks,
} from './events';

export const CALENDAR_PLANETS: BodyKey[] = [
  'sun',
  'mercury',
  'venus',
  'mars',
  'jupiter',
  'saturn',
  'uranus',
  'neptune',
  'pluto',
];

export type CalendarEvent =
  | { type: 'phase'; jd: number; phase: Phase }
  | ({ type: 'ingress' } & Ingress)
  | ({ type: 'station' } & Station)
  | { type: 'eclipse'; jd: number; eclipse: Eclipse }
  | {
      type: 'voidStart';
      jd: number;
      endJd: number;
      lastAspect: { kind: AspectKind; with: string } | null;
    };

/** Events with jd in [startJd, endJd). */
export function calendarEvents(
  startJd: number,
  endJd: number,
): CalendarEvent[] {
  // Margins: a void period can start days before the window opens, and
  // stations need samples on both sides.
  const from = Math.floor(startJd) - 4.5;
  const to = Math.ceil(endJd) + 1.5;
  const t = tracks(['moon', ...CALENDAR_PLANETS], from, to);
  const events: CalendarEvent[] = [];

  for (const p of moonPhases(t.moon, t.sun)) {
    events.push({ type: 'phase', ...p });
  }
  for (const b of CALENDAR_PLANETS) {
    for (const ing of ingresses(t[b], b)) {
      events.push({ type: 'ingress', ...ing });
    }
    if (b !== 'sun') {
      for (const st of stations(t[b], b)) {
        events.push({ type: 'station', ...st });
      }
    }
  }

  for (const e of AstroEngine.eclipses({ startJdUt: startJd, endJdUt: endJd })
    .eclipses) {
    events.push({ type: 'eclipse', jd: e.jdUt, eclipse: e });
  }

  // Void of course Moon.
  const moonIngress = ingresses(t.moon, 'moon');
  for (const ing of moonIngress) {
    events.push({ type: 'ingress', ...ing });
  }
  const moonAspects = CALENDAR_PLANETS.flatMap(p =>
    aspectHits(t.moon, 'moon', t[p], p),
  ).sort((a, b) => a.jd - b.jd);
  for (let i = 1; i < moonIngress.length; i++) {
    const enter = moonIngress[i - 1].jd;
    const leave = moonIngress[i].jd;
    const inSign = moonAspects.filter(a => a.jd > enter && a.jd < leave);
    const last = inSign[inSign.length - 1];
    const start = last ? last.jd : enter;
    if (leave - start < 1 / 1440) {
      continue;
    }
    events.push({
      type: 'voidStart',
      jd: start,
      endJd: leave,
      lastAspect: last ? { kind: last.kind, with: last.b } : null,
    });
  }

  // A void period that began before the window but is still running counts.
  const inWindow = (e: CalendarEvent) =>
    e.jd < endJd &&
    (e.type === 'voidStart' ? e.endJd >= startJd : e.jd >= startJd);
  return events.filter(inWindow).sort((a, b) => a.jd - b.jd);
}
