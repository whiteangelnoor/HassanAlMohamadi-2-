// Returns, secondary progressions, profections and firdaria for a natal
// chart. AGPL-3.0-or-later.

import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { AstroEngine, BodyKey, ChartResult } from '../astro/engine';
import { dateFromJd, jdFromDate, returnTime } from '../astro/events';
import {
  crossAspects,
  firdaria,
  profection,
  secondaryProgressions,
  TROPICAL_YEAR,
} from '../astro/predictive';
import { isDayChart } from '../astro/traditional';
import { ChartInfo } from './ChartScreen';
import { formatDay, formatJd } from './dates';
import { Card, Hint, Row, Section, Stepper } from './list';
import {
  ASPECT_NAMES,
  BODIES,
  colors,
  formatDateTime,
  formatDegree,
  formatLongitude,
  POINT_NAMES,
  SIGNS,
} from './theme';
import { Button, Header } from './widgets';

export interface Natal {
  chart: ChartResult; // with houses
  lat: number;
  lon: number;
  title: string;
}

const PROGRESSED_BODIES: BodyKey[] = [
  'sun',
  'moon',
  'mercury',
  'venus',
  'mars',
  'jupiter',
  'saturn',
];
const FIRDAR_NAMES: Record<string, string> = {
  ...POINT_NAMES,
  northNode: 'العقدة الشمالية',
  southNode: 'العقدة الجنوبية',
};

/** Builds a full chart (all bodies, houses) for a moment at the birth place. */
function chartAt(
  natal: Natal,
  jd: number,
  title: string,
  houseSystem: string,
): ChartInfo {
  const chart = AstroEngine.chart({
    time: { jdUt: jd },
    location: { lat: natal.lat, lon: natal.lon },
    houseSystem,
    bodies: BODIES.map(b => b.key),
  });
  const d = dateFromJd(jd);
  return {
    title,
    lines: [
      natal.title,
      `بتوقيت هاتفك: ${formatJd(jd)}`,
      `بالتوقيت العالمي: ${formatDateTime({
        year: d.getUTCFullYear(),
        month: d.getUTCMonth() + 1,
        day: d.getUTCDate(),
        hour: d.getUTCHours(),
        minute: d.getUTCMinutes(),
      })}`,
      'محسوبة لمكان الولادة',
    ],
    notes: chart.warnings,
    chart,
  };
}

export function PredictiveScreen({
  natal,
  onOpenChart,
  onBack,
}: {
  natal: Natal;
  onOpenChart: (make: (houseSystem: string) => ChartInfo) => void;
  onBack: () => void;
}) {
  const now = useMemo(() => new Date(), []);
  const nowJd = jdFromDate(now);
  const [year, setYear] = useState(now.getFullYear());
  const [error, setError] = useState<string | null>(null);
  const birth = natal.chart;
  const sun = birth.bodies.find(b => b.key === 'sun')!.lon;
  const moon = birth.bodies.find(b => b.key === 'moon')!.lon;

  const openSolarReturn = () => {
    setError(null);
    // The Sun's return falls within a couple of days of the birthday.
    const b = dateFromJd(birth.jdUt);
    const around = jdFromDate(
      new Date(Date.UTC(year, b.getUTCMonth(), b.getUTCDate())),
    );
    const jd = returnTime('sun', sun, around - 4, around + 4);
    if (jd === null) {
      setError('تعذّر إيجاد عودة الشمس لهذه السنة.');
      return;
    }
    onOpenChart(hs => chartAt(natal, jd, `عودة الشمس ${year}`, hs));
  };

  const openLunarReturn = () => {
    setError(null);
    const jd = returnTime('moon', moon, nowJd, nowJd + 30);
    if (jd === null) {
      setError('تعذّر إيجاد عودة القمر.');
      return;
    }
    onOpenChart(hs => chartAt(natal, jd, 'عودة القمر القادمة', hs));
  };

  const progressed = useMemo(
    () => secondaryProgressions(birth, natal.lat, nowJd, PROGRESSED_BODIES),
    [birth, natal.lat, nowJd],
  );
  const progAspects = useMemo(
    () => crossAspects(progressed.chart, birth, 1),
    [progressed, birth],
  );

  const age = (nowJd - birth.jdUt) / TROPICAL_YEAR;
  const prof = profection(birth.houses!.asc, age);
  const day = isDayChart(birth);
  const periods = useMemo(() => firdaria(birth.jdUt, day), [birth.jdUt, day]);
  const current = periods.find(p => nowJd >= p.startJd && nowJd < p.endJd);
  const yearOf = (jd: number) => dateFromJd(jd).getFullYear();

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Header title="التحويلات" onBack={onBack} />
      <Text style={styles.subtitle}>{natal.title}</Text>

      <Section title="عودة الشمس" />
      <Stepper
        items={[
          { label: 'السنة السابقة', onPress: () => setYear(year - 1) },
          {
            label: String(year),
            onPress: () => setYear(now.getFullYear()),
            active: true,
          },
          { label: 'السنة التالية', onPress: () => setYear(year + 1) },
        ]}
      />
      <Button label={`خريطة عودة الشمس ${year}`} onPress={openSolarReturn} />
      <Button
        label="خريطة عودة القمر القادمة"
        kind="secondary"
        onPress={openLunarReturn}
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}

      <Section
        title={`التوجيهات الثانوية اليوم · العمر ${age.toFixed(1)} سنة`}
      />
      <Card>
        {progressed.chart.bodies.map(b => (
          <Row
            key={b.key}
            name={POINT_NAMES[b.key]}
            value={formatLongitude(b.lon)}
            detail={b.retrograde ? 'متراجع' : undefined}
          />
        ))}
        <Row name="الطالع الموجّه" value={formatLongitude(progressed.asc)} />
        <Row
          name="وسط السماء الموجّه"
          value={formatLongitude(progressed.mc)}
          last
        />
      </Card>
      <Hint>
        {`التاريخ الموجّه: ${formatDay(
          dateFromJd(progressed.jdUt),
        )}. يوم بعد الولادة مقابل كل سنة من العمر. وسط السماء بقوس الشمس، والطالع منه عند عرض مكان الولادة.`}
      </Hint>
      {progAspects.length ? (
        <Card>
          {progAspects.map((a, i) => (
            <Row
              key={`${a.a}-${a.b}`}
              last={i === progAspects.length - 1}
              name={`${POINT_NAMES[a.a]} الموجّه ${ASPECT_NAMES[a.kind]} ${
                POINT_NAMES[a.b]
              }`}
              value={formatDegree(a.orb)}
              detail={a.applying ? 'مقترب' : 'منفصل'}
            />
          ))}
        </Card>
      ) : (
        <Hint>لا جوانب موجّهة إلى خريطة الولادة ضمن درجة واحدة الآن.</Hint>
      )}

      <Section title="الانتهاء السنوي" />
      <Card>
        <Row name="برج السنة" value={SIGNS[prof.sign]} />
        <Row name="صاحب السنة" value={POINT_NAMES[prof.lord]} />
        <Row name="البيت المنتهى إليه" value={`البيت ${prof.house}`} last />
      </Card>

      <Section title={`الفردارات · ${day ? 'ولادة نهارية' : 'ولادة ليلية'}`} />
      <Card>
        {periods
          .filter(p => yearOf(p.startJd) <= now.getFullYear() + 40)
          .map((p, i, arr) => {
            const isNow = p === current;
            const sub = isNow
              ? p.sub.find(s => nowJd >= s.startJd && nowJd < s.endJd)
              : undefined;
            return (
              <View key={`${p.lord}-${p.startJd}`}>
                <Row
                  last={i === arr.length - 1}
                  highlight={isNow}
                  name={FIRDAR_NAMES[p.lord]}
                  value={`${yearOf(p.startJd)} – ${yearOf(p.endJd)}`}
                  detail={
                    sub
                      ? `الفترة الصغرى الآن: ${
                          FIRDAR_NAMES[sub.lord]
                        } حتى ${formatDay(dateFromJd(sub.endJd))}`
                      : undefined
                  }
                />
              </View>
            );
          })}
      </Card>
      <Hint>
        ترتيب أبي معشر، والعقدتان في آخر الدورة لولادات النهار والليل. وبعض
        المؤلفين يضعهما بعد المريخ لولادات الليل.
      </Hint>

      <Button label="رجوع" kind="secondary" onPress={onBack} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 20, gap: 14, paddingBottom: 40 },
  subtitle: { color: colors.muted, fontSize: 14, textAlign: 'right' },
  error: { color: colors.error, fontSize: 14, textAlign: 'right' },
});
