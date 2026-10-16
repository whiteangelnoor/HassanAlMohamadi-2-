// The Arabic section: the Moon's mansion now, a monthly almanac with the
// mansion of every day and the Hijri date, and the table of the 28 mansions.
// AGPL-3.0-or-later.

import { useEffect, useMemo, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';

import { dateFromJd, jdFromDate } from '../astro/events';
import {
  MANSION_WIDTH,
  MansionDay,
  mansionDays,
  MansionMethod,
  MANSIONS,
  moonTrack,
} from '../astro/mansions';
import { HIJRI_MONTHS, toHijri } from '../time/hijri';
import { formatDay, formatJd, formatTime, MONTHS } from './dates';
import { Card, Hint, Row, Section, Stepper } from './list';
import { DateBar } from './DatePicker';
import { colors, FONT, formatDegree, SIGNS } from './theme';
import { Button, Header } from './widgets';

// Weeks start on Saturday, as on Arabic calendars; the first column is on
// the right.
const WEEKDAYS = [
  'السبت',
  'الأحد',
  'الاثنين',
  'الثلاثاء',
  'الأربعاء',
  'الخميس',
  'الجمعة',
];

export const METHOD_NAMES: Record<MansionMethod, string> = {
  tropical: 'متساوية من أول الحمل',
  stars: 'مرتبطة بالنجوم',
};

function mansionRange(i: number): string {
  const a = i * MANSION_WIDTH;
  const b = a + MANSION_WIDTH;
  const at = (x: number) =>
    `${formatDegree(x % 30)} ${SIGNS[Math.floor(x / 30) % 12]}`;
  return `من ${at(a)} إلى ${at(b)}`;
}

export function ArabicScreen({
  method,
  onMethod,
  onBack,
}: {
  method: MansionMethod;
  onMethod: (m: MansionMethod) => void;
  onBack: () => void;
}) {
  const { width } = useWindowDimensions();
  const now = useMemo(() => new Date(), []);
  const [ym, setYm] = useState({ y: now.getFullYear(), m: now.getMonth() });
  const [days, setDays] = useState<MansionDay[] | null>(null);
  const [selected, setSelected] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const count = new Date(ym.y, ym.m + 1, 0).getDate();
  // Local midnights of every day of the month, plus the next month's first.
  const starts = useMemo(
    () =>
      Array.from({ length: count + 1 }, (_, i) =>
        jdFromDate(new Date(ym.y, ym.m, i + 1)),
      ),
    [ym, count],
  );

  useEffect(() => {
    setDays(null);
    setError(null);
    const id = setTimeout(() => {
      try {
        const moon = moonTrack(method, starts[0], starts[starts.length - 1]);
        setDays(mansionDays(moon, starts));
      } catch (e) {
        setError(String(e));
      }
    }, 30);
    return () => clearTimeout(id);
  }, [method, starts]);

  // The Moon right now.
  const current = useMemo(() => {
    try {
      const jd = jdFromDate(new Date());
      const moon = moonTrack(method, jd, jd + 3);
      const [d] = mansionDays(moon, [jd, jd + 3]);
      return d;
    } catch {
      return null;
    }
  }, [method]);

  const firstWeekday = (new Date(ym.y, ym.m, 1).getDay() + 1) % 7; // Saturday = 0
  const cell = Math.floor((width - 40) / 7);
  const hijriFirst = toHijri(ym.y, ym.m + 1, 1);
  const hijriLast = toHijri(ym.y, ym.m + 1, count);
  const hijriTitle =
    hijriFirst.month === hijriLast.month
      ? `${HIJRI_MONTHS[hijriFirst.month - 1]} ${hijriFirst.year}`
      : `${HIJRI_MONTHS[hijriFirst.month - 1]} – ${
          HIJRI_MONTHS[hijriLast.month - 1]
        } ${hijriLast.year}`;

  const cells: (number | null)[] = [
    ...Array.from({ length: firstWeekday }, () => null),
    ...Array.from({ length: count }, (_, i) => i + 1),
  ];
  while (cells.length % 7) {
    cells.push(null);
  }
  const today =
    now.getFullYear() === ym.y && now.getMonth() === ym.m
      ? now.getDate()
      : null;
  const sel = selected !== null && days ? days[selected - 1] : null;

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Header title="القسم العربي" onBack={onBack} />

      <Section title="طريقة قياس المنازل" />
      <Stepper
        items={(['tropical', 'stars'] as MansionMethod[]).map(m => ({
          label: METHOD_NAMES[m],
          active: method === m,
          onPress: () => onMethod(m),
        }))}
      />

      {current ? (
        <Card>
          <Row
            name="القمر الآن في منزلة"
            value={<Text style={styles.gold}>{MANSIONS[current.first]}</Text>}
            detail={
              current.entries.length
                ? `يدخل ${MANSIONS[current.entries[0].mansion]} في ${formatJd(
                    current.entries[0].jd,
                  )}`
                : undefined
            }
            last
          />
        </Card>
      ) : null}

      <Section title="روزنامة منازل القمر" />
      <Text style={styles.month}>{`${MONTHS[ym.m]} ${ym.y}`}</Text>
      <Text style={styles.hijri}>{hijriTitle} هـ</Text>
      <DateBar
        mode="day"
        value={new Date(ym.y, ym.m, selected ?? 1)}
        onChange={d => {
          setYm({ y: d.getFullYear(), m: d.getMonth() });
          setSelected(d.getDate());
        }}
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}

      <View style={styles.grid}>
        {WEEKDAYS.map(w => (
          <Text key={w} style={[styles.weekday, { width: cell }]}>
            {w}
          </Text>
        ))}
        {cells.map((d, i) => {
          if (d === null) {
            return (
              <View
                key={`e${i}`}
                style={{ width: cell, height: cell * 1.55 }}
              />
            );
          }
          const info = days ? days[d - 1] : null;
          const h = toHijri(ym.y, ym.m + 1, d);
          return (
            <Pressable
              key={d}
              onPress={() => setSelected(d)}
              style={[
                styles.cell,
                { width: cell, height: cell * 1.55 },
                d === today && styles.today,
                d === selected && styles.selected,
              ]}
            >
              <Text style={styles.dayNum}>{d}</Text>
              <Text style={styles.hijriDay}>
                {h.day === 1 ? `1 ${HIJRI_MONTHS[h.month - 1]}` : h.day}
              </Text>
              {info ? (
                <Text style={styles.mansion} numberOfLines={2}>
                  {MANSIONS[info.first]}
                </Text>
              ) : null}
              {info && info.entries.length ? (
                <Text style={styles.change}>●</Text>
              ) : null}
            </Pressable>
          );
        })}
      </View>
      {days === null && !error ? <Hint>جارٍ الحساب…</Hint> : null}
      <Hint>
        في كل خانة: اليوم الميلادي، واليوم الهجري، ومنزلة القمر عند بداية اليوم.
        النقطة الذهبية تعني أن القمر ينتقل إلى منزلة أخرى خلال اليوم؛ اضغط
        الخانة لترى الوقت.
      </Hint>

      {sel && selected !== null ? (
        <Card>
          <Row
            name={formatDay(dateFromJd(sel.startJd))}
            detail={(() => {
              const h = toHijri(ym.y, ym.m + 1, selected);
              return `${h.day} ${HIJRI_MONTHS[h.month - 1]} ${h.year} هـ`;
            })()}
          />
          <Row
            name="عند بداية اليوم"
            value={<Text style={styles.gold}>{MANSIONS[sel.first]}</Text>}
          />
          {sel.entries.map((e, i) => (
            <Row
              key={e.jd}
              last={i === sel.entries.length - 1}
              name={`يدخل ${MANSIONS[e.mansion]}`}
              value={formatTime(dateFromJd(e.jd))}
            />
          ))}
        </Card>
      ) : null}

      <Section title="المنازل الثماني والعشرون" />
      <Card>
        {MANSIONS.map((m, i) => (
          <Row
            key={m}
            last={i === 27}
            name={`${i + 1}. ${m}`}
            detail={mansionRange(i) + (method === 'stars' ? ' (نجمية)' : '')}
          />
        ))}
      </Card>
      <Hint>
        {method === 'stars'
          ? 'المنازل هنا مقيسة من أول الحمل النجمي (لاهيري)، فتبقى كل منزلة مع نجومها: الثريا في منزلة الثريا، والدبران في الدبران، وقلب الأسد في الجبهة.'
          : 'المنازل هنا مقيسة من أول الحمل الاستوائي، كل منزلة 12° 51′، كما في كتب الأحكام المتأخرة.'}{' '}
        الأوقات بتوقيت هاتفك. التاريخ الهجري بتقويم أم القرى، وقد يختلف يوماً عن
        رؤية الهلال في بلدك.
      </Hint>

      <Button label="رجوع" kind="secondary" onPress={onBack} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 20, gap: 12, paddingBottom: 40 },
  gold: {
    fontFamily: FONT,
    color: colors.gold,
    fontSize: 16,
    fontWeight: '600',
  },
  month: {
    fontFamily: FONT,
    color: colors.text,
    fontSize: 20,
    fontWeight: '600',
    textAlign: 'right',
  },
  hijri: {
    fontFamily: FONT,
    color: colors.muted,
    fontSize: 14,
    textAlign: 'right',
  },
  error: {
    fontFamily: FONT,
    color: colors.error,
    fontSize: 14,
    textAlign: 'right',
  },
  grid: { flexDirection: 'row-reverse', flexWrap: 'wrap' },
  weekday: {
    fontFamily: FONT,
    color: colors.muted,
    fontSize: 10.5,
    textAlign: 'center',
    paddingVertical: 4,
  },
  cell: {
    borderColor: colors.line,
    borderWidth: StyleSheet.hairlineWidth,
    backgroundColor: colors.navyRaised,
    alignItems: 'center',
    paddingTop: 3,
    paddingHorizontal: 1,
  },
  today: { borderColor: colors.gold, borderWidth: 1.5 },
  selected: { backgroundColor: colors.line },
  dayNum: {
    fontFamily: FONT,
    color: colors.text,
    fontSize: 15,
    fontWeight: '600',
  },
  hijriDay: { fontFamily: FONT, color: colors.muted, fontSize: 9.5 },
  mansion: {
    fontFamily: FONT,
    color: colors.gold,
    fontSize: 9.5,
    textAlign: 'center',
    lineHeight: 12,
    marginTop: 1,
  },
  change: {
    color: colors.gold,
    fontSize: 7,
    marginTop: 'auto',
    marginBottom: 2,
  },
});
