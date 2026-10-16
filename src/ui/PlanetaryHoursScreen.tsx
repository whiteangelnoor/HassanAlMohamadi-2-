// Spiritual (planetary) hours for a day at a chosen city. AGPL-3.0-or-later.

import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { dateFromJd, jdFromDate } from '../astro/events';
import { PlanetaryDay, planetaryDay } from '../astro/planetaryHours';
import { cityLabel, searchCities } from '../geo/cities';
import { SavedPlace } from '../store';
import { formatTime } from './dates';
import { DateBar } from './DatePicker';
import { Card, Hint, Row, Section } from './list';
import { colors, FONT, POINT_NAMES } from './theme';
import { Field, Header } from './widgets';

const WEEKDAYS = [
  'الأحد',
  'الاثنين',
  'الثلاثاء',
  'الأربعاء',
  'الخميس',
  'الجمعة',
  'السبت',
];

export const DEFAULT_PLACE: SavedPlace = {
  name: 'بغداد',
  country: 'العراق',
  lat: 33.3406,
  lon: 44.4009,
  timeZone: 'Asia/Baghdad',
};

export function PlanetaryHoursScreen({
  place,
  onPlace,
  onBack,
}: {
  place: SavedPlace;
  onPlace: (p: SavedPlace) => void;
  onBack: () => void;
}) {
  const [date, setDate] = useState(() => new Date());
  const [result, setResult] = useState<PlanetaryDay | null | undefined>(
    undefined,
  );
  const [error, setError] = useState<string | null>(null);
  const [picking, setPicking] = useState(false);
  const [query, setQuery] = useState('');
  const results = useMemo(
    () => (picking ? searchCities(query, 6) : []),
    [picking, query],
  );
  const [now, setNow] = useState(() => jdFromDate(new Date()));

  useEffect(() => {
    const id = setInterval(() => setNow(jdFromDate(new Date())), 30000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    setResult(undefined);
    setError(null);
    const id = setTimeout(() => {
      try {
        setResult(
          planetaryDay(
            date.getFullYear(),
            date.getMonth() + 1,
            date.getDate(),
            place.lat,
            place.lon,
          ),
        );
      } catch (e) {
        setError(String(e));
      }
    }, 30);
    return () => clearTimeout(id);
  }, [date, place]);

  const t = (jd: number) => formatTime(dateFromJd(jd));
  const current = result
    ? result.hours.find(h => now >= h.startJd && now < h.endJd)
    : undefined;

  return (
    <ScrollView
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      <Header title="الساعات الروحانية" onBack={onBack} />

      <Section title="المدينة" />
      {picking ? (
        <>
          <Field
            label="ابحث عن مدينتك"
            value={query}
            onChangeText={setQuery}
            placeholder="اسم المدينة"
          />
          {results.length ? (
            <Card>
              {results.map((c, i) => (
                <Pressable
                  key={`${c.name}-${c.lat}-${c.lon}`}
                  onPress={() => {
                    onPlace({
                      name: cityLabel(c),
                      country: c.countryName,
                      lat: c.lat,
                      lon: c.lon,
                      timeZone: c.timeZone,
                    });
                    setPicking(false);
                    setQuery('');
                  }}
                >
                  <Row
                    last={i === results.length - 1}
                    name={cityLabel(c)}
                    detail={c.countryName}
                  />
                </Pressable>
              ))}
            </Card>
          ) : null}
        </>
      ) : (
        <Pressable onPress={() => setPicking(true)}>
          <Text
            style={styles.place}
          >{`${place.name} · ${place.country}  (تغيير)`}</Text>
        </Pressable>
      )}

      <Section title="اليوم" />
      <DateBar mode="day" value={date} onChange={setDate} />
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {result === undefined && !error ? <Hint>جارٍ الحساب…</Hint> : null}
      {result === null ? (
        <Text style={styles.error}>
          لا شروق أو لا غروب في هذا اليوم عند هذا العرض الجغرافي.
        </Text>
      ) : null}

      {result ? (
        <>
          <Card>
            <Row
              name={`يوم ${WEEKDAYS[result.weekday]}`}
              value={
                <Text style={styles.gold}>{POINT_NAMES[result.ruler]}</Text>
              }
              detail="صاحب اليوم وصاحب الساعة الأولى بعد الشروق"
            />
            <Row name="الشروق" value={t(result.sunrise)} />
            <Row name="الغروب" value={t(result.sunset)} />
            <Row
              name="طول الساعة"
              value={`نهاراً ${Math.round(
                result.dayHourMinutes,
              )} د · ليلاً ${Math.round(result.nightHourMinutes)} د`}
              last
            />
          </Card>

          {current ? (
            <View style={styles.now}>
              <Text style={styles.nowTitle}>{`الساعة الآن: ساعة ${
                POINT_NAMES[current.ruler]
              }`}</Text>
              <Text style={styles.nowDetail}>
                {`تنتهي ${t(current.endJd)} · بعد ${Math.max(
                  0,
                  Math.round((current.endJd - now) * 1440),
                )} دقيقة`}
              </Text>
            </View>
          ) : null}

          <Section title="ساعات النهار (من الشروق إلى الغروب)" />
          <Card>
            {result.hours.slice(0, 12).map((h, i) => (
              <HourRow
                key={h.index}
                h={h}
                t={t}
                active={h === current}
                last={i === 11}
              />
            ))}
          </Card>
          <Section title="ساعات الليل (من الغروب إلى شروق الغد)" />
          <Card>
            {result.hours.slice(12).map((h, i) => (
              <HourRow
                key={h.index}
                h={h}
                t={t}
                active={h === current}
                last={i === 11}
              />
            ))}
          </Card>
        </>
      ) : null}

      <Hint>
        يُقسم النهار والليل كلٌّ منهما اثنتي عشرة ساعة متساوية، فتطول الساعة
        وتقصر مع الفصول. أول ساعة بعد الشروق لصاحب اليوم، ثم تتوالى على الترتيب
        الكلداني: زحل، المشتري، المريخ، الشمس، الزهرة، عطارد، القمر. الأوقات
        بتوقيت هاتفك، والشروق والغروب لحافة الشمس العليا مع انكسار الأفق.
      </Hint>
    </ScrollView>
  );
}

function HourRow({
  h,
  t,
  active,
  last,
}: {
  h: PlanetaryDay['hours'][number];
  t: (jd: number) => string;
  active: boolean;
  last: boolean;
}) {
  return (
    <Row
      last={last}
      highlight={active}
      name={`${h.day ? h.index : h.index - 12}. ${POINT_NAMES[h.ruler]}`}
      value={`${t(h.startJd)} – ${t(h.endJd)}`}
    />
  );
}

const styles = StyleSheet.create({
  content: { padding: 20, gap: 12, paddingBottom: 40 },
  place: {
    fontFamily: FONT,
    color: colors.gold,
    fontSize: 16,
    textAlign: 'right',
  },
  error: {
    fontFamily: FONT,
    color: colors.error,
    fontSize: 14,
    textAlign: 'right',
  },
  gold: {
    fontFamily: FONT,
    color: colors.gold,
    fontSize: 16,
    fontWeight: '600',
  },
  now: {
    borderColor: colors.gold,
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    gap: 4,
  },
  nowTitle: {
    fontFamily: FONT,
    color: colors.gold,
    fontSize: 17,
    fontWeight: '600',
    textAlign: 'right',
  },
  nowDetail: {
    fontFamily: FONT,
    color: colors.text,
    fontSize: 14,
    textAlign: 'right',
  },
});
