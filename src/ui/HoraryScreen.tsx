// Horary questions: choose the matter (or leave it unspoken), and the chart
// of the moment is judged with every testimony shown. AGPL-3.0-or-later.

import { useEffect, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';

import { jdFromDate } from '../astro/events';
import {
  HoraryAspect,
  HoraryJudgment,
  judge,
  PlanetState,
} from '../astro/horary';
import { horaryReading } from '../astro/horaryReading';
import {
  HOUSE_MATTERS,
  MATTER_KIND,
  PERSON_HOUSES,
} from '../astro/horaryTopics';
import { DignityKind } from '../astro/traditional';
import { SavedPlace } from '../store';
import { ChartWheel } from './ChartWheel';
import { formatJd } from './dates';
import { Card, Hint, Row, Section } from './list';
import { colors, FONT, formatLongitude, POINT_NAMES } from './theme';
import { Button, Field, Header } from './widgets';

const ASPECT_ADVERB: Record<HoraryAspect, string> = {
  conjunction: 'مقارنةً',
  sextile: 'تسديساً',
  square: 'تربيعاً',
  trine: 'تثليثاً',
  opposition: 'مقابلةً',
};

const DIGNITY: Partial<Record<DignityKind, string>> = {
  domicile: 'في بيته',
  exaltation: 'في شرفه',
  triplicity: 'في مثلثته',
  term: 'في حدّه',
  face: 'في وجهه',
  detriment: 'في وباله',
  fall: 'في هبوطه',
  peregrine: 'غريب',
};

const ANGULARITY = {
  angular: 'وتد',
  succedent: 'مائل',
  cadent: 'زائل',
};

type Matter = { house: number; label: string } | 'intention';

function describe(s: PlanetState): string {
  return [
    `البيت ${s.house} (${ANGULARITY[s.angularity]})`,
    ...s.dignities.map(d => DIGNITY[d]).filter(Boolean),
    s.retrograde ? 'راجع' : null,
    s.sun === 'combust'
      ? 'محترق'
      : s.sun === 'beams'
      ? 'تحت الشعاع'
      : s.sun === 'cazimi'
      ? 'في قلب الشمس'
      : null,
  ]
    .filter(Boolean)
    .join(' · ');
}

const OUTCOME = {
  yes: { word: 'يتم', color: colors.gold },
  no: { word: 'لا يتم', color: colors.error },
  doubt: { word: 'مشكوك فيه', color: colors.muted },
};

export function HoraryScreen({
  place,
  onBack,
}: {
  place: SavedPlace;
  onBack: () => void;
}) {
  const { width } = useWindowDimensions();
  const [question, setQuestion] = useState('');
  const [matter, setMatter] = useState<Matter | null>(null);
  const [picking, setPicking] = useState(true);
  const [askedAt, setAskedAt] = useState<number | null>(null);
  const [result, setResult] = useState<HoraryJudgment | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (askedAt === null || matter === null) {
      return;
    }
    setResult(null);
    setError(null);
    const id = setTimeout(() => {
      try {
        setResult(
          judge(
            askedAt,
            place,
            matter === 'intention' ? 'intention' : matter.house,
            {
              planet: p => POINT_NAMES[p],
              aspect: k => ASPECT_ADVERB[k],
              date: jd => `في ${formatJd(jd)}`,
            },
          ),
        );
      } catch (e) {
        setError(String(e));
      }
    }, 30);
    return () => clearTimeout(id);
  }, [askedAt, matter, place]);

  const choose = (m: Matter) => {
    setMatter(m);
    setPicking(false);
    setAskedAt(null);
    setResult(null);
  };

  const N = (p: string) => POINT_NAMES[p];
  const houseTitle = (h: number) => HOUSE_MATTERS[h - 1].title;

  return (
    <ScrollView
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      <Header title="علم المسائل" onBack={onBack} />
      <Field
        label="سؤالك (اختياري، للتذكير فقط)"
        value={question}
        onChangeText={setQuestion}
        placeholder="اكتب سؤالك كما في قلبك"
        multiline
      />

      <Section title="موضوع المسألة" />
      {matter && !picking ? (
        <Pressable onPress={() => setPicking(true)}>
          <Text style={styles.chosen}>
            {matter === 'intention'
              ? 'نية السائل (يُستخرج الموضوع من الطالع)  (تغيير)'
              : `${matter.label} · البيت ${matter.house}  (تغيير)`}
          </Text>
        </Pressable>
      ) : (
        <View style={styles.picker}>
          <Pressable
            onPress={() => choose('intention')}
            style={({ pressed }) => [
              styles.intention,
              pressed && styles.pressed,
            ]}
          >
            <Text style={styles.intentionTitle}>نية السائل</Text>
            <Text style={styles.intentionText}>
              اضمر سؤالك في قلبك ولا تختر موضوعاً، فيُستخرج من الطالع ما يدور
              عليه السؤال ثم يُحكم فيه.
            </Text>
          </Pressable>
          {HOUSE_MATTERS.map(h => (
            <View key={h.house} style={styles.houseGroup}>
              <Text style={styles.houseTitle}>
                {`البيت ${h.house}: ${h.title}`}
              </Text>
              <View style={styles.chips}>
                {h.matters.map(m => (
                  <Pressable
                    key={m}
                    onPress={() => choose({ house: h.house, label: m })}
                    style={({ pressed }) => [
                      styles.chip,
                      pressed && styles.pressed,
                    ]}
                  >
                    <Text style={styles.chipText}>{m}</Text>
                  </Pressable>
                ))}
              </View>
            </View>
          ))}
        </View>
      )}

      {matter && !picking ? (
        <>
          <Button
            label={
              askedAt === null
                ? 'احكم على لحظة السؤال الآن'
                : 'أعد الحكم للحظة الآن'
            }
            onPress={() => setAskedAt(jdFromDate(new Date()))}
          />
          <Hint>
            {`تُرسم الخريطة للحظة الضغط فوق ${place.name} (تُغيَّر المدينة من شاشة الساعات الروحانية).`}
          </Hint>
        </>
      ) : null}

      {error ? <Text style={styles.error}>{error}</Text> : null}
      {askedAt !== null && !result && !error ? <Hint>جارٍ الحكم…</Hint> : null}

      {result ? (
        <>
          <View
            style={[
              styles.verdict,
              { borderColor: OUTCOME[result.outcome].color },
            ]}
          >
            <Text
              style={[
                styles.verdictWord,
                { color: OUTCOME[result.outcome].color },
              ]}
            >
              {OUTCOME[result.outcome].word}
            </Text>
            <Text style={styles.verdictText}>{result.summary}</Text>
            <Text style={styles.verdictTime}>{`لحظة السؤال: ${formatJd(
              result.jd,
            )}`}</Text>
          </View>

          {result.intention ? (
            <Card>
              <Row
                name="ما يدور عليه السؤال"
                value={`البيت ${result.house}`}
                detail={`${houseTitle(result.house)}: ${HOUSE_MATTERS[
                  result.house - 1
                ].matters.join('، ')}. استُخرج من ${
                  result.intention.via === 'moon'
                    ? `الكوكب الذي يتصل به القمر (${N(result.intention.by)})`
                    : `صاحب الساعة (${N(result.intention.by)})`
                } وموضعه في البيت ${result.house}.`}
                last
              />
            </Card>
          ) : null}

          {horaryReading(
            result,
            matter && matter !== 'intention'
              ? MATTER_KIND[matter.label]
              : undefined,
            PERSON_HOUSES.includes(result.house),
            { planet: p => POINT_NAMES[p], aspect: k => ASPECT_ADVERB[k] },
          ).map(sec => (
            <View key={sec.title} style={styles.group}>
              <Section title={sec.title} />
              <Card>
                {sec.lines.map((l, i) => (
                  <Text
                    key={i}
                    style={[
                      styles.readingLine,
                      i === sec.lines.length - 1 && styles.lastRow,
                    ]}
                  >
                    {l}
                  </Text>
                ))}
              </Card>
            </View>
          ))}

          <Section title="الدلائل وأوزانها" />
          <Card>
            {result.testimonies.map((x, i) => (
              <View
                key={i}
                style={[
                  styles.testimony,
                  i === result.testimonies.length - 1 && styles.lastRow,
                ]}
              >
                <Text
                  style={[
                    styles.mark,
                    {
                      color:
                        x.weight > 0
                          ? colors.gold
                          : x.weight < 0
                          ? colors.error
                          : colors.muted,
                    },
                  ]}
                >
                  {x.weight > 0 ? '✓' : x.weight < 0 ? '✗' : '•'}
                </Text>
                <Text style={styles.testimonyText}>{x.text}</Text>
              </View>
            ))}
          </Card>

          {result.timing ? (
            <>
              <Section title="التوقيت" />
              <Card>
                <Row name="متى" detail={result.timing} last />
              </Card>
            </>
          ) : null}

          {result.considerations.length ? (
            <>
              <Section title="موانع الحكم (تُراعى قبل الجزم)" />
              <Card>
                {result.considerations.map((c, i) => (
                  <Row
                    key={i}
                    name={c}
                    last={i === result.considerations.length - 1}
                  />
                ))}
              </Card>
            </>
          ) : null}

          <Section title="صاحبا المسألة" />
          <Card>
            <Row
              name={`${result.sameLord ? 'شريك السائل' : 'صاحب السائل'}: ${N(
                result.querent.planet,
              )}`}
              value={formatLongitude(result.querent.lon)}
              detail={describe(result.querent)}
            />
            <Row
              name={`صاحب المسألة (البيت ${result.house}): ${N(
                result.quesited.planet,
              )}`}
              value={formatLongitude(result.quesited.lon)}
              detail={describe(result.quesited)}
            />
            <Row
              name="القمر"
              value={formatLongitude(result.moon.lon)}
              detail={[
                describe(result.moon),
                result.moonLast ? `انفصل عن ${N(result.moonLast.b)}` : null,
                result.moonNext
                  ? `يتصل بـ${N(result.moonNext.b)} ${
                      ASPECT_ADVERB[result.moonNext.kind]
                    }`
                  : 'خالي السير',
              ]
                .filter(Boolean)
                .join(' · ')}
            />
            <Row
              name="صاحب الساعة"
              value={result.hourLord ? N(result.hourLord) : '—'}
              last
            />
          </Card>

          <View style={styles.wheel}>
            <ChartWheel chart={result.chart} size={Math.min(width - 40, 520)} />
          </View>
        </>
      ) : null}

      <Hint>
        الحكم على طريقة ما شاء الله وسهل بن بشر ومن نقل عنهما: صاحب الطالع
        والقمر للسائل، وصاحب بيت المسألة للمسؤول عنه. يُنظر هل يتصلان قبل خروج
        أحدهما من برجه وبأي نظر، وهل يعترضهما كوكب، وهل ينقل بينهما كوكب أو
        يجمعهما، وفي القبول وحال الكوكبين والقمر وصاحب الساعة. الحساب بالبروج
        الاستوائية وبيوت ريجيومونتانوس كما في كتب المسائل. هذا تطبيق للقواعد؛
        وفي الحالات الملتبسة يبقى اجتهاد المنجّم.
      </Hint>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 20, gap: 12, paddingBottom: 40 },
  pressed: { opacity: 0.6 },
  chosen: {
    fontFamily: FONT,
    color: colors.gold,
    fontSize: 16,
    textAlign: 'right',
  },
  picker: { gap: 14 },
  intention: {
    borderColor: colors.gold,
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    gap: 4,
    backgroundColor: colors.navyRaised,
  },
  intentionTitle: {
    fontFamily: FONT,
    color: colors.gold,
    fontSize: 17,
    fontWeight: '600',
    textAlign: 'right',
  },
  intentionText: {
    fontFamily: FONT,
    color: colors.text,
    fontSize: 14,
    lineHeight: 22,
    textAlign: 'right',
  },
  houseGroup: { gap: 8 },
  houseTitle: {
    fontFamily: FONT,
    color: colors.muted,
    fontSize: 13,
    textAlign: 'right',
  },
  chips: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 8 },
  chip: {
    borderColor: colors.line,
    borderWidth: 1,
    borderRadius: 18,
    paddingVertical: 7,
    paddingHorizontal: 12,
  },
  chipText: { fontFamily: FONT, color: colors.text, fontSize: 14 },
  verdict: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    gap: 6,
    backgroundColor: colors.navyRaised,
  },
  verdictWord: {
    fontFamily: FONT,
    fontSize: 26,
    fontWeight: '700',
    textAlign: 'right',
  },
  verdictText: {
    fontFamily: FONT,
    color: colors.text,
    fontSize: 15,
    lineHeight: 24,
    textAlign: 'right',
  },
  verdictTime: {
    fontFamily: FONT,
    color: colors.muted,
    fontSize: 12,
    textAlign: 'right',
  },
  testimony: {
    flexDirection: 'row-reverse',
    gap: 10,
    paddingVertical: 10,
    borderBottomColor: colors.line,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  lastRow: { borderBottomWidth: 0 },
  mark: { fontFamily: FONT, fontSize: 16, width: 18, textAlign: 'center' },
  testimonyText: {
    flex: 1,
    fontFamily: FONT,
    color: colors.text,
    fontSize: 14,
    lineHeight: 22,
    textAlign: 'right',
  },
  wheel: { alignItems: 'center' },
  group: { gap: 8 },
  readingLine: {
    fontFamily: FONT,
    color: colors.text,
    fontSize: 14.5,
    lineHeight: 24,
    textAlign: 'right',
    paddingVertical: 9,
    borderBottomColor: colors.line,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  error: {
    fontFamily: FONT,
    color: colors.error,
    fontSize: 14,
    textAlign: 'right',
  },
});
