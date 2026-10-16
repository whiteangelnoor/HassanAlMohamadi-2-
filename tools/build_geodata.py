#!/usr/bin/env python3
"""Builds the offline city atlas and historical time-zone tables.

Inputs (passed on the command line, nothing is downloaded here):
  --cities    GeoNames cities file as shipped in the geonamescache wheel
              (geonamescache/data/cities5000.json)
  --zoneinfo  zoneinfo directory of the IANA tz database, e.g. from the
              `tzdata` wheel (tzdata/zoneinfo)
  --countries Arabic country names, i18n-iso-countries/langs/ar.json

Outputs:
  src/geo/cities.data.ts   one tab-separated line per city
  src/time/tzdata.data.ts  per-zone UTC transitions from the TZif files,
                           extended year by year up to 2100 with the zone's
                           current rule

AGPL-3.0-or-later.
"""

import argparse
import json
import os
import struct
import zoneinfo
from datetime import datetime, timedelta, timezone

END_YEAR = 2100
START_UTC = int(datetime(1800, 1, 1, tzinfo=timezone.utc).timestamp())
END_UTC = int(datetime(END_YEAR + 1, 1, 1, tzinfo=timezone.utc).timestamp())

# Letters used by Persian, Urdu, Kurdish and Pashto but not by Arabic. A name
# containing any of them is not an Arabic-language name.
NON_ARABIC_LETTERS = set(
    'پچژکگیےٹڈڑں'
    'ھہۃەڵێۆۇۈۋڤ'
    'ڻڕڭځڅډړږښڼې'
)


def is_arabic_name(s):
    has_letter = False
    for c in s:
        o = ord(c)
        if c in NON_ARABIC_LETTERS:
            return False
        if 0x0621 <= o <= 0x064A:
            has_letter = True
        elif 0x064B <= o <= 0x0652 or o == 0x0670 or c in ' -ـ':
            continue
        else:
            return False
    return has_letter


def arabic_spelling(s):
    # Kurdish writes the vowel "e" with taa marbuta inside a word; in Arabic
    # taa marbuta and alef maqsura only end a word.
    for word in s.replace('-', ' ').split():
        if '\u0629' in word[:-1] or '\u0649' in word[:-1]:
            return False
    return True


def arabic_name(alternates):
    for a in alternates:
        if is_arabic_name(a) and arabic_spelling(a):
            return a
    return ''


# ---------- TZif ---------------------------------------------------------------

def read_tzif(path):
    """Returns (types, transitions). types: [(utoff, isdst, abbr)];
    transitions: [(utc_seconds, type_index)]. Uses the 64-bit (v2+) block."""
    data = open(path, 'rb').read()
    if data[:4] != b'TZif':
        raise ValueError(path)

    def header(off):
        return struct.unpack('>6l', data[off + 20:off + 44])

    isutcnt, isstdcnt, leapcnt, timecnt, typecnt, charcnt = header(0)
    v1_len = 44 + timecnt * 5 + typecnt * 6 + charcnt + leapcnt * 8 + isstdcnt + isutcnt
    if data[4] < ord('2'):
        raise ValueError(f'{path}: version 1 TZif not supported')
    off = v1_len
    isutcnt, isstdcnt, leapcnt, timecnt, typecnt, charcnt = header(off)
    p = off + 44
    times = struct.unpack(f'>{timecnt}q', data[p:p + timecnt * 8])
    p += timecnt * 8
    idx = data[p:p + timecnt]
    p += timecnt
    raw_types = []
    for _ in range(typecnt):
        raw_types.append(struct.unpack('>lBB', data[p:p + 6]))
        p += 6
    chars = data[p:p + charcnt]
    types = []
    for utoff, isdst, abbrind in raw_types:
        end = chars.index(b'\0', abbrind)
        types.append((utoff, isdst, chars[abbrind:end].decode()))
    return types, list(zip(times, idx))


def zone_table(zoneinfo_dir, name):
    types, transitions = read_tzif(os.path.join(zoneinfo_dir, name))
    zi = zoneinfo.ZoneInfo.from_file(open(os.path.join(zoneinfo_dir, name), 'rb'), key=name)

    # Type in force before the first transition: the first non-DST type
    # (RFC 8536 section 3.2), normally LMT.
    initial = next((i for i, t in enumerate(types) if not t[1]), 0)

    out_types = []  # (offset, isdst, isLmt)
    type_map = {}

    def type_id(utoff, isdst, abbr):
        key = (utoff, bool(isdst), abbr == 'LMT')
        if key not in type_map:
            type_map[key] = len(out_types)
            out_types.append(key)
        return type_map[key]

    first = type_id(*types[initial])
    rows = []
    last_t = None
    for t, i in transitions:
        if t >= END_UTC:
            break
        tid = type_id(*types[i])
        rows.append((t, tid))
        last_t = t

    # Extend past the last explicit transition with the POSIX footer rule,
    # which zoneinfo applies. Daily sampling, then bisection to the second.
    def state(ts):
        dt = datetime.fromtimestamp(ts, tz=timezone.utc).astimezone(zi)
        off = int(dt.utcoffset().total_seconds())
        dst = bool(dt.dst())
        return type_id(off, dst, dt.tzname())

    # A footer without a DST rule ("<+03>-3") means no further changes.
    footer = open(os.path.join(zoneinfo_dir, name), 'rb').read().rstrip(b'\n').rsplit(b'\n', 1)[-1]
    start = (last_t if last_t is not None else START_UTC) + 1
    cur = state(start)
    ts = start if b',' in footer else END_UTC
    while ts < END_UTC:
        nxt = ts + 86400
        s = state(nxt)
        if s != cur:
            lo, hi = ts, nxt
            while hi - lo > 1:
                mid = (lo + hi) // 2
                if state(mid) == cur:
                    lo = mid
                else:
                    hi = mid
            rows.append((hi, s))
            cur = s
        ts = nxt

    # Drop transitions before 1800 but keep the type in force at 1800.
    while rows and rows[0][0] <= START_UTC:
        first = rows.pop(0)[1]

    return {
        'types': [[o, int(d), int(l)] for o, d, l in out_types],
        'initial': first,
        'transitions': rows,
    }


# ---------- output -------------------------------------------------------------

def encode_zone(z):
    # "<types>|<initial>|<deltas>|<type ids>", numbers in base 36.
    def b36(n):
        digits = '0123456789abcdefghijklmnopqrstuvwxyz'
        if n == 0:
            return '0'
        neg = n < 0
        n = abs(n)
        s = ''
        while n:
            n, r = divmod(n, 36)
            s = digits[r] + s
        return ('-' if neg else '') + s

    types = ','.join(f'{b36(o)}:{d}{l}' for o, d, l in z['types'])
    deltas = []
    prev = 0
    for t, _ in z['transitions']:
        deltas.append(b36(t - prev))
        prev = t
    ids = ''.join(b36(i) for _, i in z['transitions'])
    if any(i >= 36 for _, i in z['transitions']):
        raise ValueError('more than 36 types in a zone')
    return f"{types}|{b36(z['initial'])}|{','.join(deltas)}|{ids}"


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--cities', required=True)
    ap.add_argument('--zoneinfo', required=True)
    ap.add_argument('--countries', required=True)
    ap.add_argument('--tzversion', required=True)
    ap.add_argument('--out', default='.')
    args = ap.parse_args()

    countries_ar = json.load(open(args.countries, encoding='utf-8'))['countries']
    cities = json.load(open(args.cities, encoding='utf-8'))

    zones = sorted({c['timezone'] for c in cities.values() if c.get('timezone')})
    zone_index = {z: i for i, z in enumerate(zones)}

    lines = []
    for c in sorted(cities.values(), key=lambda c: -c['population']):
        if not c.get('timezone'):
            continue
        lines.append('\t'.join([
            c['name'],
            arabic_name(c.get('alternatenames', [])),
            c['countrycode'],
            f"{c['latitude']:.4f}",
            f"{c['longitude']:.4f}",
            str(zone_index[c['timezone']]),
            str(c['population']),
        ]))

    used_countries = sorted({c['countrycode'] for c in cities.values()})
    country_names = {}
    for cc in used_countries:
        v = countries_ar.get(cc)
        if isinstance(v, list):
            v = v[0]
        country_names[cc] = v or cc

    header = (
        '// Generated by tools/build_geodata.py. Do not edit.\n'
        '// City data: GeoNames (CC BY 4.0), cities with population >= 5000.\n'
        '// Country names: i18n-iso-countries (MIT).\n'
        '/* eslint-disable */\n'
    )
    with open(os.path.join(args.out, 'src/geo/cities.data.ts'), 'w', encoding='utf-8') as f:
        f.write(header)
        f.write('export const ZONES: string[] = ' + json.dumps(zones) + ';\n')
        f.write('export const COUNTRIES: Record<string, string> = '
                + json.dumps(country_names, ensure_ascii=False) + ';\n')
        f.write('// name \\t arabic name \\t country \\t lat \\t lon \\t zone index \\t population\n')
        f.write('export const CITIES = ' + json.dumps('\n'.join(lines), ensure_ascii=False) + ';\n')

    tz = {z: encode_zone(zone_table(args.zoneinfo, z)) for z in zones}
    with open(os.path.join(args.out, 'src/time/tzdata.data.ts'), 'w', encoding='utf-8') as f:
        f.write('// Generated by tools/build_geodata.py. Do not edit.\n')
        f.write(f'// IANA time zone database {args.tzversion} (public domain), 1800..{END_YEAR}.\n')
        f.write('/* eslint-disable */\n')
        f.write(f'export const TZ_VERSION = {json.dumps(args.tzversion)};\n')
        f.write(f'export const TZ_END_YEAR = {END_YEAR};\n')
        f.write('export const ZONE_DATA: Record<string, string> = '
                + json.dumps(tz, indent=0) + ';\n')

    print(f'{len(lines)} cities, {len(zones)} zones')


if __name__ == '__main__':
    main()
