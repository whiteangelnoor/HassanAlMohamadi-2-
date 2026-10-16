// Monthly astrological calendar in the phone's local time. AGPL-3.0-or-later.

import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { CalendarEvent, calendarEvents } from '../astro/calendar';
import { AstroEngine } from '../astro/engine';
import { dateFromJd, jdFromDate } from '../astro/events';
import { dayKey, formatDay, formatJd, formatTime, monthTitle } from './dates';
import { Card, Hint, Row, Stepper } from './list';
import {
  ASPECT_NAMES,
  colors,
  formatLongitude,
  POINT_NAMES,
  SIGNS,
} from './theme';
import { Button, Header } from './widgets';

const PHASE_NAMES = {
  new: 'المحاق (القمر الجديد)',
  firstQuarter: 'التربيع الأول',
  full: 'البدر',
  lastQuarter: 'التربيع الأخير',
};

function describe(e: CalendarEvent): {
  name: string;
  detail: string;
  strong?: boolean;
} {
  const time = formatTime(dateFromJd(e.jd));
  switch (e.type) {
    case 'phase': {
      const moon = AstroEngine.chart({ time: { jdUt: e.jd }, bodies: ['moon'] })
        .bodies[0];
      return {
        name: PHASE_NAMES[e.phase],
        detail: `${time} · ${formatLongitude(moon.lon)}`,
        strong: true,
      };
    }
    case 'ingress':
      return {
        name: `${POINT_NAMES[e.body]} يدخل ${SIGNS[e.sign]}${
          e.retrograde ? ' متراجعاً' : ''
        }`,
        detail: time,
        strong: e.body !== 'moon',
      };
    case 'station':
      return {
        name:
          e.kind === 'retrograde'
            ? `${POINT_NAMES[e.body]} يبدأ التراجع`
            : `${POINT_NAMES[e.body]} يستقيم`,
        detail: `${time} · ${formatLongitude(e.lon)}`,
        strong: true,
      };
    case 'voidStart':
      return {
        name: 'القمر خالٍ من المسار',
        detail:
          `حتى ${formatJd(e.endJd)}` +
          (e.lastAspect
            ? ` · آخر جانب: ${ASPECT_NAMES[e.lastAspect.kind]} ${
                POINT_NAMES[e.lastAspect.with]
              }`
            : ''),
      };
  }
}

export function CalendarScreen({ onBack }: { onBack: () => void }) {
  const now = new Date();
  const [ym, setYm] = useState({ y: now.getFullYear(), m: now.getMonth() });
  const [events, setEvents] = useState<CalendarEvent[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setEvents(null);
    setError(null);
    const id = setTimeout(() => {
      try {
        const start = jdFromDate(new Date(ym.y, ym.m, 1));
        const end = jdFromDate(new Date(ym.y, ym.m + 1, 1));
        setEvents(calendarEvents(start, end));
      } catch (e) {
        setError(String(e));
      }
    }, 50);
    return () => clearTimeout(id);
  }, [ym]);

  const move = (k: number) => {
    const d = new Date(ym.y, ym.m + k, 1);
    setYm({ y: d.getFullYear(), m: d.getMonth() });
  };

  // Group by local day; a void period that started last month is shown on
  // the first day of this one.
  const monthStart = jdFromDate(new Date(ym.y, ym.m, 1));
  const days: { key: string; jd: number; items: CalendarEvent[] }[] = [];
  for (const e of events ?? []) {
    const jd = Math.max(e.jd, monthStart);
    const k = dayKey(jd);
    if (days.length === 0 || days[days.length - 1].key !== k) {
      days.push({ key: k, jd, items: [] });
    }
    days[days.length - 1].items.push(e);
  }

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Header title="التقويم الفلكي" onBack={onBack} />
      <Text style={styles.month}>{monthTitle(ym.y, ym.m)}</Text>
      <Stepper
        items={[
          { label: 'الشهر السابق', onPress: () => move(-1) },
          {
            label: 'هذا الشهر',
            onPress: () => setYm({ y: now.getFullYear(), m: now.getMonth() }),
          },
          { label: 'الشهر التالي', onPress: () => move(1) },
        ]}
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {events === null && !error ? <Hint>جارٍ الحساب…</Hint> : null}

      {days.map(d => (
        <View key={d.key} style={styles.day}>
          <Text style={styles.dayTitle}>{formatDay(dateFromJd(d.jd))}</Text>
          <Card>
            {d.items.map((e, i) => {
              const x = describe(e);
              return (
                <Row
                  key={`${e.type}-${e.jd}-${i}`}
                  last={i === d.items.length - 1}
                  name={x.name}
                  detail={x.detail}
                  highlight={x.strong}
                />
              );
            })}
          </Card>
        </View>
      ))}

      <Hint>
        الأوقات بتوقيت هاتفك. القمر خالٍ من المسار من آخر جانب دقيق يصنعه مع
        كوكب (من الشمس إلى بلوتو) قبل أن يغادر برجه، حتى دخوله البرج التالي.
      </Hint>
      <Button label="رجوع" kind="secondary" onPress={onBack} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 20, gap: 14, paddingBottom: 40 },
  month: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '600',
    textAlign: 'right',
  },
  day: { gap: 6 },
  dayTitle: {
    color: colors.gold,
    fontSize: 15,
    fontWeight: '600',
    textAlign: 'right',
    marginTop: 4,
  },
  error: { color: colors.error, fontSize: 14, textAlign: 'right' },
});
