// Transits over a natal chart: bi-wheel for a chosen day, current aspects,
// and the exact transits of the coming year. AGPL-3.0-or-later.

import { useEffect, useMemo, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';

import { AstroEngine, BodyKey, ChartResult } from '../astro/engine';
import { AspectHit, jdFromDate } from '../astro/events';
import { crossAspects, upcomingTransits } from '../astro/predictive';
import { ChartWheel } from './ChartWheel';
import { formatDay, formatJd, MONTHS } from './dates';
import { Card, Hint, Row, Section, Stepper } from './list';
import {
  ASPECT_NAMES,
  colors,
  formatDegree,
  formatLongitude,
  POINT_NAMES,
} from './theme';
import { Button, Header } from './widgets';

const TRANSIT_WHEEL_BODIES: BodyKey[] = [
  'sun',
  'moon',
  'mercury',
  'venus',
  'mars',
  'jupiter',
  'saturn',
  'uranus',
  'neptune',
  'pluto',
  'trueNode',
];
const ORB = 2;
const DAY = 86400000;

export function TransitScreen({
  natal,
  title,
  onBack,
}: {
  natal: ChartResult;
  title: string;
  onBack: () => void;
}) {
  const { width } = useWindowDimensions();
  const [date, setDate] = useState(() => new Date());
  const [upcoming, setUpcoming] = useState<AspectHit[] | null>(null);

  const transit = useMemo(
    () =>
      AstroEngine.chart({
        time: { jdUt: jdFromDate(date) },
        bodies: TRANSIT_WHEEL_BODIES,
      }),
    [date],
  );
  const aspects = useMemo(
    () => crossAspects(transit, natal, ORB),
    [transit, natal],
  );

  // The yearly search takes a moment; let the screen draw first.
  const startJd = Math.floor(jdFromDate(date) - 0.5) + 0.5;
  useEffect(() => {
    setUpcoming(null);
    const id = setTimeout(
      () => setUpcoming(upcomingTransits(natal, startJd, startJd + 365)),
      50,
    );
    return () => clearTimeout(id);
  }, [natal, startJd]);

  const shift = (days: number, months = 0) => {
    const d = new Date(date.getTime() + days * DAY);
    if (months) {
      d.setMonth(d.getMonth() + months);
    }
    setDate(d);
  };

  // Group the yearly list by local month.
  const groups: { title: string; hits: AspectHit[] }[] = [];
  for (const h of upcoming ?? []) {
    const d = new Date((h.jd - 2440587.5) * DAY);
    const t = `${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
    if (groups.length === 0 || groups[groups.length - 1].title !== t) {
      groups.push({ title: t, hits: [] });
    }
    groups[groups.length - 1].hits.push(h);
  }

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Header title="العبور" onBack={onBack} />
      <Text style={styles.subtitle}>{title}</Text>
      <Text style={styles.date}>{formatDay(date)}</Text>
      <Stepper
        items={[
          { label: 'شهر −', onPress: () => shift(0, -1) },
          { label: 'يوم −', onPress: () => shift(-1) },
          { label: 'اليوم', onPress: () => setDate(new Date()) },
          { label: 'يوم +', onPress: () => shift(1) },
          { label: 'شهر +', onPress: () => shift(0, 1) },
        ]}
      />

      <View style={styles.wheel}>
        <ChartWheel
          chart={natal}
          outer={transit}
          outerAspects={aspects.filter(
            a => a.kind !== 'conjunction' && a.b !== 'asc' && a.b !== 'mc',
          )}
          size={Math.min(width - 40, 520)}
        />
      </View>
      <Hint>
        الحلقة الذهبية الخارجية: الكواكب العابرة. الداخلية: خريطة الولادة.
      </Hint>

      <Section title={`جوانب العبور في هذا اليوم (سماح ${ORB}°)`} />
      {aspects.length ? (
        <Card>
          {aspects.map((a, i) => (
            <Row
              key={`${a.a}-${a.b}`}
              last={i === aspects.length - 1}
              name={`${POINT_NAMES[a.a]} ${ASPECT_NAMES[a.kind]} ${
                POINT_NAMES[a.b]
              }`}
              value={formatDegree(a.orb)}
              detail={a.applying ? 'مقترب' : 'منفصل'}
            />
          ))}
        </Card>
      ) : (
        <Hint>لا توجد جوانب عبور ضمن السماح في هذا اليوم.</Hint>
      )}

      <Section title="مواقع الكواكب العابرة" />
      <Card>
        {transit.bodies.map((b, i) => (
          <Row
            key={b.key}
            last={i === transit.bodies.length - 1}
            name={POINT_NAMES[b.key]}
            value={formatLongitude(b.lon)}
            detail={b.retrograde ? 'متراجع' : undefined}
          />
        ))}
      </Card>

      <Section title="العبورات الدقيقة خلال السنة القادمة" />
      {upcoming === null ? (
        <Hint>جارٍ الحساب…</Hint>
      ) : (
        groups.map(g => (
          <View key={g.title} style={styles.group}>
            <Text style={styles.month}>{g.title}</Text>
            <Card>
              {g.hits.map((h, i) => (
                <Row
                  key={`${h.jd}-${h.a}-${h.b}-${h.kind}`}
                  last={i === g.hits.length - 1}
                  name={`${POINT_NAMES[h.a]} ${ASPECT_NAMES[h.kind]} ${
                    POINT_NAMES[h.b]
                  }`}
                  detail={`${formatJd(h.jd)}${h.retrograde ? ' · متراجع' : ''}`}
                />
              ))}
            </Card>
          </View>
        ))
      )}
      <Hint>
        الأوقات بتوقيت هاتفك. الكواكب العابرة من الشمس إلى بلوتو، على كواكب
        الولادة والطالع ووسط السماء. القمر غير مدرج لسرعته.
      </Hint>

      <Button label="رجوع" kind="secondary" onPress={onBack} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 20, gap: 14, paddingBottom: 40 },
  subtitle: { color: colors.muted, fontSize: 14, textAlign: 'right' },
  date: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'right',
  },
  wheel: { alignItems: 'center' },
  group: { gap: 6 },
  month: {
    color: colors.gold,
    fontSize: 15,
    fontWeight: '600',
    textAlign: 'right',
    marginTop: 4,
  },
});
