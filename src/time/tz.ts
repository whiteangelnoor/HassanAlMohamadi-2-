// Historical local time -> UTC, from the bundled IANA tables. AGPL-3.0-or-later.
//
// The tables cover 1800..TZ_END_YEAR. Before a zone adopted standard time the
// database gives Local Mean Time of the zone's main city; for a birthplace we
// use the birthplace's own longitude instead, which is what that clock showed.

import { TZ_END_YEAR, TZ_VERSION, ZONE_DATA } from './tzdata.data';

export { TZ_VERSION, TZ_END_YEAR };

interface ZoneType {
  offset: number; // seconds east of UTC
  dst: boolean;
  lmt: boolean;
}

interface Zone {
  types: ZoneType[];
  initial: number;
  times: number[]; // UTC seconds of each transition, ascending
  ids: number[]; // type in force from times[i]
}

const cache = new Map<string, Zone>();

function zone(name: string): Zone {
  let z = cache.get(name);
  if (z) {
    return z;
  }
  const raw = ZONE_DATA[name];
  if (raw === undefined) {
    throw new Error(`unknown time zone ${name}`);
  }
  const [typesPart, initialPart, deltasPart, idsPart] = raw.split('|');
  const types = typesPart.split(',').map(t => {
    const [off, flags] = t.split(':');
    return {
      offset: parseInt(off, 36),
      dst: flags[0] === '1',
      lmt: flags[1] === '1',
    };
  });
  const times: number[] = [];
  let acc = 0;
  for (const d of deltasPart ? deltasPart.split(',') : []) {
    acc += parseInt(d, 36);
    times.push(acc);
  }
  const ids = Array.from(idsPart, c => parseInt(c, 36));
  z = { types, initial: parseInt(initialPart, 36), times, ids };
  cache.set(name, z);
  return z;
}

function typeAt(z: Zone, utc: number): ZoneType {
  // Last transition at or before utc.
  let lo = 0;
  let hi = z.times.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (z.times[mid] <= utc) {
      lo = mid + 1;
    } else {
      hi = mid;
    }
  }
  return z.types[lo === 0 ? z.initial : z.ids[lo - 1]];
}

export interface LocalDateTime {
  year: number;
  month: number; // 1..12
  day: number;
  hour: number;
  minute: number;
  second?: number;
}

export interface UtcConversion {
  /** Seconds since 1970-01-01T00:00:00Z. */
  utcSeconds: number;
  utc: {
    year: number;
    month: number;
    day: number;
    hour: number;
    minute: number;
    second: number;
  };
  /** Offset that was applied, seconds east of UTC. */
  offsetSeconds: number;
  dst: boolean;
  /** Local Mean Time of the given longitude (before standard time). */
  lmt: boolean;
  /** The clock showed this time twice; the first occurrence was chosen. */
  ambiguous: boolean;
  /** The clock skipped this time; it was read with the offset before the jump. */
  nonexistent: boolean;
}

function lmtOffset(longitude: number): number {
  return Math.round(longitude * 240); // 4 minutes of time per degree
}

/**
 * Converts a wall-clock time in `zoneName` to UTC.
 * `longitude` (east positive) replaces the zone's LMT before standard time;
 * pass null to keep the database's LMT.
 */
export function localToUtc(
  local: LocalDateTime,
  zoneName: string,
  longitude: number | null,
): UtcConversion {
  if (local.year < 1800 || local.year > TZ_END_YEAR) {
    throw new RangeError(`year outside 1800..${TZ_END_YEAR}`);
  }
  const z = zone(zoneName);
  const wall =
    Date.UTC(
      local.year,
      local.month - 1,
      local.day,
      local.hour,
      local.minute,
      local.second ?? 0,
    ) / 1000;

  const offsetOf = (t: ZoneType) =>
    t.lmt && longitude !== null ? lmtOffset(longitude) : t.offset;

  // Every offset that could apply within a day of this wall time.
  const candidates: ZoneType[] = [];
  for (const probe of [wall - 86400, wall, wall + 86400]) {
    const t = typeAt(z, probe);
    if (!candidates.includes(t)) {
      candidates.push(t);
    }
  }
  const valid: { t: ZoneType; utc: number }[] = [];
  for (const c of candidates) {
    const utc = wall - offsetOf(c);
    const actual = typeAt(z, utc);
    if (offsetOf(actual) === offsetOf(c) && !valid.some(v => v.utc === utc)) {
      valid.push({ t: actual, utc });
    }
  }
  valid.sort((a, b) => a.utc - b.utc);

  let chosen: { t: ZoneType; utc: number };
  let nonexistent = false;
  if (valid.length > 0) {
    chosen = valid[0];
  } else {
    // Inside a forward jump: read the time with the offset in force before it.
    nonexistent = true;
    const before = typeAt(z, wall - 86400);
    chosen = { t: before, utc: wall - offsetOf(before) };
  }

  const d = new Date(chosen.utc * 1000);
  return {
    utcSeconds: chosen.utc,
    utc: {
      year: d.getUTCFullYear(),
      month: d.getUTCMonth() + 1,
      day: d.getUTCDate(),
      hour: d.getUTCHours(),
      minute: d.getUTCMinutes(),
      second: d.getUTCSeconds(),
    },
    offsetSeconds: offsetOf(chosen.t),
    dst: chosen.t.dst,
    lmt: chosen.t.lmt && longitude !== null,
    ambiguous: valid.length > 1,
    nonexistent,
  };
}

/** "+03:00", "-04:56:02" */
export function formatOffset(seconds: number): string {
  const sign = seconds < 0 ? '-' : '+';
  const a = Math.abs(seconds);
  const h = Math.floor(a / 3600);
  const m = Math.floor((a % 3600) / 60);
  const s = a % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${sign}${pad(h)}:${pad(m)}${s ? `:${pad(s)}` : ''}`;
}
