// Horary questions: choose the matter (or leave it unspoken), and the chart
// of the moment is judged with every testimony shown. AGPL-3.0-or-later.

import { useEffect, useMemo, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';

import { jdFromDate } from '../astro/events';
import { HoraryAspect, HoraryJudgment, judge } from '../astro/horary';
import { horaryAnswer } from '../astro/horaryAnswer';
import {
  HOUSE_MATTERS,
  MATTER_KIND,
  PERSON_HOUSES,
} from '../astro/horaryTopics';
import { SavedPlace } from '../store';
import { ChartWheel } from './ChartWheel';
import { formatJd } from './dates';
import { Card, Hint, Row, Section } from './list';
import { colors, FONT, POINT_NAMES } from './theme';
import { Button, Field, Header } from './widgets';

const ASPECT_ADVERB: Record<HoraryAspect, string> = {
  conjunction: 'مقارنةً',
  sextile: 'تسديساً',
  square: 'تربيعاً',
  trine: 'تثليثاً',
  opposition: 'مقابلةً',
};

type Matter = { house: number; label: string } | 'intention';

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
  const [showEvidence, setShowEvidence] = useState(false);
  const answer = useMemo(
    () =>
      result
        ? horaryAnswer(
            result,
            matter && matter !== 'intention'
              ? MATTER_KIND[matter.label]
              : undefined,
            PERSON_HOUSES.includes(result.house),
            {
              planet: p => POINT_NAMES[p],
              date: jd => formatJd(jd),
            },
          )
        : null,
    [result, matter],
  );

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
    setShowEvidence(false);
    setMatter(m);
    setPicking(false);
    setAskedAt(null);
    setResult(null);
  };

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

      {result && answer ? (
        <>
          <View style={styles.wheel}>
            <ChartWheel chart={result.chart} size={Math.min(width - 40, 520)} />
          </View>

          <View
            style={[
              styles.verdict,
              { borderColor: OUTCOME[answer.verdict].color },
            ]}
          >
            {result.intention ? (
              <Text style={styles.intentionNote}>
                {`سؤالك يدور على الأغلب حول: ${
                  HOUSE_MATTERS[result.house - 1].title
                }.`}
              </Text>
            ) : null}
            <Text
              style={[
                styles.verdictWord,
                { color: OUTCOME[answer.verdict].color },
              ]}
            >
              {answer.headline}
            </Text>
            <Text style={styles.verdictText}>
              {answer.paragraphs.join(' ')}
            </Text>
          </View>

          {answer.place || answer.person || answer.when ? (
            <Card>
              {[
                answer.place ? ['المكان', answer.place] : null,
                answer.person ? ['الصفة', answer.person] : null,
                answer.when ? ['متى', answer.when] : null,
              ]
                .filter((x): x is string[] => x !== null)
                .map(([k, v], i, all) => (
                  <Row
                    key={k}
                    name={k}
                    detail={v}
                    last={i === all.length - 1}
                  />
                ))}
            </Card>
          ) : null}

          {answer.caution ? (
            <Text style={styles.caution}>{answer.caution}</Text>
          ) : null}

          <Text style={styles.verdictTime}>{`لحظة السؤال: ${formatJd(
            result.jd,
          )} · ${place.name}`}</Text>

          <Pressable onPress={() => setShowEvidence(v => !v)}>
            <Text style={styles.toggle}>
              {showEvidence ? 'إخفاء الأدلة الفلكية' : 'عرض الأدلة الفلكية'}
            </Text>
          </Pressable>
          {showEvidence ? (
            <Card>
              {answer.evidence.map((l, i) => (
                <Text
                  key={i}
                  style={[
                    styles.readingLine,
                    i === answer.evidence.length - 1 && styles.lastRow,
                  ]}
                >
                  {l}
                </Text>
              ))}
            </Card>
          ) : null}
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
  intentionNote: {
    fontFamily: FONT,
    color: colors.muted,
    fontSize: 13,
    textAlign: 'right',
  },
  caution: {
    fontFamily: FONT,
    color: colors.muted,
    fontSize: 13,
    lineHeight: 21,
    textAlign: 'right',
  },
  toggle: {
    fontFamily: FONT,
    color: colors.gold,
    fontSize: 15,
    textAlign: 'center',
    paddingVertical: 8,
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
    fontSize: 20,
    lineHeight: 32,
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
