// The day at a glance on the home screen: the Moon's sign and mansion, the
// planetary hour now, and whether the Moon is void of course.
// AGPL-3.0-or-later.

import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { AstroEngine } from '../astro/engine';
import { dateFromJd, jdFromDate } from '../astro/events';
import { MANSION_TRAITS } from '../astro/mansionTraits';
import {
  MansionMethod,
  mansionOf,
  mansionOptions,
  MANSIONS,
} from '../astro/mansions';
import { planetaryDay } from '../astro/planetaryHours';
import { voidSpans } from '../spiritual/election';
import { SavedPlace } from '../store';
import { formatTime } from './dates';
import { colors, FONT, POINT_NAMES, SIGNS } from './theme';

interface Today {
  moonSign: string;
  mansion: number;
  hour: { ruler: string; end: number } | null;
  voidUntil: number | null;
}

function compute(place: SavedPlace, method: MansionMethod): Today {
  const now = new Date();
  const jd = jdFromDate(now);
  const moon = AstroEngine.chart({
    time: { jdUt: jd },
    bodies: ['moon'],
  }).bodies[0];
  const moonM = AstroEngine.chart({
    ...mansionOptions(method),
    time: { jdUt: jd },
    bodies: ['moon'],
  }).bodies[0];
  let hour: Today['hour'] = null;
  for (const k of [0, -1]) {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + k);
    const p = planetaryDay(
      d.getFullYear(),
      d.getMonth() + 1,
      d.getDate(),
      place.lat,
      place.lon,
    );
    const h = p?.hours.find(x => jd >= x.startJd && jd < x.endJd);
    if (h) {
      hour = { ruler: h.ruler, end: h.endJd };
      break;
    }
  }
  const v = voidSpans(jd - 3, jd + 3).find(x => jd >= x.a && jd < x.b);
  return {
    moonSign: SIGNS[Math.floor((((moon.lon % 360) + 360) % 360) / 30)],
    mansion: mansionOf(moonM.lon),
    hour,
    voidUntil: v ? v.b : null,
  };
}

export function TodayCard({
  place,
  method,
}: {
  place: SavedPlace;
  method: MansionMethod;
}) {
  const [today, setToday] = useState<Today | null>(null);

  useEffect(() => {
    const run = () => {
      try {
        setToday(compute(place, method));
      } catch {
        setToday(null);
      }
    };
    const first = setTimeout(run, 50);
    const every = setInterval(run, 60000);
    return () => {
      clearTimeout(first);
      clearInterval(every);
    };
  }, [place, method]);

  if (!today) {
    return null;
  }
  const t = (jd: number) => formatTime(dateFromJd(jd));
  return (
    <View style={styles.card}>
      <Line
        k="القمر"
        v={`في ${today.moonSign} · منزلة ${MANSIONS[today.mansion]} (${
          MANSION_TRAITS[today.mansion].nature
        })`}
      />
      {today.hour ? (
        <Line
          k="الساعة الآن"
          v={`ساعة ${POINT_NAMES[today.hour.ruler]} حتى ${t(today.hour.end)}`}
        />
      ) : null}
      {today.voidUntil !== null ? (
        <Line k="تنبيه" v={`القمر خالي السير حتى ${t(today.voidUntil)}`} warn />
      ) : null}
    </View>
  );
}

function Line({ k, v, warn }: { k: string; v: string; warn?: boolean }) {
  return (
    <View style={styles.line}>
      <Text style={styles.key}>{k}</Text>
      <Text style={[styles.value, warn && styles.warn]}>{v}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderColor: colors.gold,
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    gap: 8,
    backgroundColor: colors.navyRaised,
  },
  line: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    gap: 10,
  },
  key: { fontFamily: FONT, color: colors.muted, fontSize: 14 },
  value: {
    fontFamily: FONT,
    color: colors.text,
    fontSize: 14,
    flexShrink: 1,
    textAlign: 'left',
  },
  warn: { color: colors.gold },
});
