// Horary questions: whose matter, which matter (or the unspoken intention,
// or which of two options), the moment and the place; then the wheel, the
// answer in plain words, the evidence on request, and a log of questions
// whose outcome can be marked later. AGPL-3.0-or-later.

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
import { HoraryAnswer, horaryAnswer } from '../astro/horaryAnswer';
import {
  HOUSE_MATTERS,
  MATTER_KIND,
  PERSON_HOUSES,
  SUBJECTS,
} from '../astro/horaryTopics';
import { cityLabel, searchCities } from '../geo/cities';
import {
  addHoraryEntry,
  deleteHoraryEntry,
  HoraryEntry,
  loadHoraryLog,
  markHoraryEntry,
  SavedPlace,
} from '../store';
import { ChartWheel } from './ChartWheel';
import { formatJd } from './dates';
import { DateBar } from './DatePicker';
import { Card, Hint, Row, Section, Stepper } from './list';
import { colors, FONT, POINT_NAMES } from './theme';
import { Button, Field, Header, toLatinDigits } from './widgets';

const ASPECT_ADVERB: Record<HoraryAspect, string> = {
  conjunction: 'مقارنةً',
  sextile: 'تسديساً',
  square: 'تربيعاً',
  trine: 'تثليثاً',
  opposition: 'مقابلةً',
};

type Matter = { house: number; label: string } | 'intention';
type Subject = (typeof SUBJECTS)[number];

const COLOR = {
  yes: colors.gold,
  no: colors.error,
  doubt: colors.muted,
};

const JUDGE_NAMES = {
  planet: (p: string) => POINT_NAMES[p],
  aspect: (k: HoraryAspect) => ASPECT_ADVERB[k],
  date: (jd: number) => `في ${formatJd(jd)}`,
};

function answerFor(j: HoraryJudgment, m: Matter): HoraryAnswer {
  return horaryAnswer(
    j,
    m !== 'intention' ? MATTER_KIND[m.label] : undefined,
    PERSON_HOUSES.includes(j.house) || j.subject !== 1,
    { planet: p => POINT_NAMES[p], date: jd => formatJd(jd) },
  );
}

/** For comparing two options: the verdict first, then the testimonies. */
function rank(a: HoraryAnswer, j: HoraryJudgment): number {
  const v = a.verdict === 'yes' ? 2 : a.verdict === 'doubt' ? 1 : 0;
  const w = j.testimonies.reduce((s, t) => s + t.weight, 0);
  return v * 100 + w;
}

export function HoraryScreen({
  place: defaultPlace,
  onBack,
}: {
  place: SavedPlace;
  onBack: () => void;
}) {
  const { width } = useWindowDimensions();
  const [question, setQuestion] = useState('');
  const [two, setTwo] = useState(false);
  const [subject, setSubject] = useState<Subject>(SUBJECTS[0]);
  const [matter, setMatter] = useState<Matter | null>(null);
  const [matterB, setMatterB] = useState<Matter | null>(null);
  const [picking, setPicking] = useState<'a' | 'b' | null>('a');

  const [timeMode, setTimeMode] = useState<'now' | 'custom'>('now');
  const [day, setDay] = useState(() => new Date());
  const [hh, setHh] = useState(() => String(new Date().getHours()));
  const [mm, setMm] = useState(() => String(new Date().getMinutes()));

  const [place, setPlace] = useState<SavedPlace>(defaultPlace);
  const [pickingCity, setPickingCity] = useState(false);
  const [query, setQuery] = useState('');
  const cities = useMemo(
    () => (pickingCity ? searchCities(query, 6) : []),
    [pickingCity, query],
  );

  const [askedAt, setAskedAt] = useState<number | null>(null);
  const [results, setResults] = useState<HoraryJudgment[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showEvidence, setShowEvidence] = useState(false);
  const [log, setLog] = useState<HoraryEntry[]>(() => loadHoraryLog());

  const matters = two ? [matter, matterB] : [matter];
  const ready = matters.every(m => m !== null);

  const reset = () => {
    setResults(null);
    setAskedAt(null);
    setShowEvidence(false);
  };

  useEffect(() => {
    if (askedAt === null || !ready) {
      return;
    }
    setResults(null);
    setError(null);
    const id = setTimeout(() => {
      try {
        const rs = (matters as Matter[]).map(m =>
          judge(
            askedAt,
            place,
            m === 'intention' ? 'intention' : m.house,
            JUDGE_NAMES,
            subject.house,
          ),
        );
        setResults(rs);
        if (!two) {
          const a = answerFor(rs[0], matter!);
          addHoraryEntry({
            jd: askedAt,
            question: question.trim(),
            label:
              matter === 'intention'
                ? 'نية السائل'
                : `${matter!.label}${
                    subject.house !== 1 ? ` (${subject.label})` : ''
                  }`,
            verdict: a.verdict,
            headline: a.headline,
          });
          setLog(loadHoraryLog());
        }
      } catch (e) {
        setError(String(e));
      }
    }, 30);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [askedAt]);

  const ask = () => {
    if (timeMode === 'now') {
      setAskedAt(jdFromDate(new Date()));
      return;
    }
    const h = Math.min(23, Math.max(0, Number(toLatinDigits(hh)) || 0));
    const m = Math.min(59, Math.max(0, Number(toLatinDigits(mm)) || 0));
    setAskedAt(
      jdFromDate(
        new Date(day.getFullYear(), day.getMonth(), day.getDate(), h, m),
      ),
    );
  };

  const choose = (m: Matter) => {
    if (picking === 'b') {
      setMatterB(m);
    } else {
      setMatter(m);
    }
    setPicking(two && picking === 'a' && !matterB ? 'b' : null);
    reset();
  };

  const answers =
    results && ready
      ? results.map((r, i) => answerFor(r, matters[i] as Matter))
      : null;

  const matterText = (m: Matter | null) =>
    m === null
      ? 'لم يُختر'
      : m === 'intention'
      ? 'نية السائل'
      : `${m.label} · البيت ${m.house}`;

  // ---------- the matter picker ----------
  const picker = (
    <View style={styles.picker}>
      {!two ? (
        <Pressable
          onPress={() => choose('intention')}
          style={({ pressed }) => [styles.intention, pressed && styles.pressed]}
        >
          <Text style={styles.intentionTitle}>نية السائل</Text>
          <Text style={styles.intentionText}>
            اضمر سؤالك في قلبك ولا تختر موضوعاً، فيُستخرج من الطالع ما يدور عليه
            السؤال ثم يُحكم فيه.
          </Text>
        </Pressable>
      ) : null}
      {HOUSE_MATTERS.map(h => (
        <View key={h.house} style={styles.houseGroup}>
          <Text
            style={styles.houseTitle}
          >{`البيت ${h.house}: ${h.title}`}</Text>
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
  );

  // ---------- one answer ----------
  const answerBox = (a: HoraryAnswer, r: HoraryJudgment, title?: string) => (
    <View style={[styles.verdict, { borderColor: COLOR[a.verdict] }]}>
      {title ? <Text style={styles.optionTitle}>{title}</Text> : null}
      {r.intention ? (
        <Text style={styles.note}>
          {`سؤالك يدور على الأغلب حول: ${HOUSE_MATTERS[r.house - 1].title}.`}
        </Text>
      ) : null}
      <Text style={[styles.headline, { color: COLOR[a.verdict] }]}>
        {a.headline}
      </Text>
      <Text style={styles.body}>{a.paragraphs.join(' ')}</Text>
    </View>
  );

  const extras = (a: HoraryAnswer) =>
    a.place || a.person || a.when ? (
      <Card>
        {[
          a.place ? ['المكان', a.place] : null,
          a.person ? ['الصفة', a.person] : null,
          a.when ? ['متى', a.when] : null,
        ]
          .filter((x): x is string[] => x !== null)
          .map(([k, v], i, all) => (
            <Row key={k} name={k} detail={v} last={i === all.length - 1} />
          ))}
      </Card>
    ) : null;

  // ---------- the log ----------
  const judged = log.filter(e => e.result !== null && e.verdict !== 'doubt');
  const hits = judged.filter(e => e.verdict === e.result).length;

  return (
    <ScrollView
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      <Header title="علم المسائل" onBack={onBack} />

      <Stepper
        items={[
          {
            label: 'سؤال',
            active: !two,
            onPress: () => {
              setTwo(false);
              setPicking(matter ? null : 'a');
              reset();
            },
          },
          {
            label: 'أيّ الخيارين خير',
            active: two,
            onPress: () => {
              setTwo(true);
              if (matter === 'intention') {
                setMatter(null);
              }
              setPicking(!matter || matter === 'intention' ? 'a' : 'b');
              reset();
            },
          },
        ]}
      />

      <Field
        label="سؤالك (اختياري، للتذكير فقط)"
        value={question}
        onChangeText={setQuestion}
        placeholder="اكتب سؤالك كما في قلبك"
        multiline
      />

      {matter !== 'intention' ? (
        <>
          <Section title="المسألة عن" />
          <View style={styles.chips}>
            {SUBJECTS.map(s => (
              <Pressable
                key={s.label}
                onPress={() => {
                  setSubject(s);
                  reset();
                }}
                style={[
                  styles.chip,
                  subject.label === s.label && styles.chipOn,
                ]}
              >
                <Text
                  style={[
                    styles.chipText,
                    subject.label === s.label && styles.chipTextOn,
                  ]}
                >
                  {s.label}
                </Text>
              </Pressable>
            ))}
          </View>
        </>
      ) : null}

      <Section title={two ? 'الخياران' : 'موضوع المسألة'} />
      {two ? (
        <Card>
          <Pressable onPress={() => setPicking('a')}>
            <Row
              name="الخيار الأول"
              value={matterText(matter)}
              highlight={picking === 'a'}
            />
          </Pressable>
          <Pressable onPress={() => setPicking('b')}>
            <Row
              name="الخيار الثاني"
              value={matterText(matterB)}
              highlight={picking === 'b'}
              last
            />
          </Pressable>
        </Card>
      ) : matter && !picking ? (
        <Pressable onPress={() => setPicking('a')}>
          <Text style={styles.chosen}>{`${matterText(matter)}  (تغيير)`}</Text>
        </Pressable>
      ) : null}
      {picking ? picker : null}
      {two &&
      matter &&
      matterB &&
      matter !== 'intention' &&
      matterB !== 'intention' &&
      matter.house === matterB.house ? (
        <Text style={styles.warn}>
          الخياران من باب واحد (البيت نفسه)، فلا تفرق الخريطة بينهما. اختر
          خيارين من بابين مختلفين، أو اسأل عن كل خيار في وقت مستقل.
        </Text>
      ) : null}

      {ready && !picking ? (
        <>
          <Section title="لحظة السؤال ومكانه" />
          <Stepper
            items={[
              {
                label: 'الآن',
                active: timeMode === 'now',
                onPress: () => setTimeMode('now'),
              },
              {
                label: 'وقت آخر',
                active: timeMode === 'custom',
                onPress: () => setTimeMode('custom'),
              },
            ]}
          />
          {timeMode === 'custom' ? (
            <>
              <DateBar mode="day" value={day} onChange={setDay} />
              <View style={styles.timeRow}>
                <View style={styles.timeField}>
                  <Field
                    label="الساعة (0–23)"
                    value={hh}
                    onChangeText={setHh}
                    keyboardType="number-pad"
                  />
                </View>
                <View style={styles.timeField}>
                  <Field
                    label="الدقيقة"
                    value={mm}
                    onChangeText={setMm}
                    keyboardType="number-pad"
                  />
                </View>
              </View>
              <Hint>الوقت بتوقيت هاتفك.</Hint>
            </>
          ) : null}
          {pickingCity ? (
            <>
              <Field
                label="ابحث عن مدينة السؤال"
                value={query}
                onChangeText={setQuery}
                placeholder="اسم المدينة"
              />
              {cities.length ? (
                <Card>
                  {cities.map((c, i) => (
                    <Pressable
                      key={`${c.name}-${c.lat}-${c.lon}`}
                      onPress={() => {
                        setPlace({
                          name: cityLabel(c),
                          country: c.countryName,
                          lat: c.lat,
                          lon: c.lon,
                          timeZone: c.timeZone,
                        });
                        setPickingCity(false);
                        setQuery('');
                        reset();
                      }}
                    >
                      <Row
                        last={i === cities.length - 1}
                        name={cityLabel(c)}
                        detail={c.countryName}
                      />
                    </Pressable>
                  ))}
                </Card>
              ) : null}
            </>
          ) : (
            <Pressable onPress={() => setPickingCity(true)}>
              <Text style={styles.chosen}>
                {`المكان: ${place.name} · ${place.country}  (تغيير)`}
              </Text>
            </Pressable>
          )}
          <Button
            label={askedAt === null ? 'احكم' : 'أعد الحكم'}
            onPress={ask}
          />
        </>
      ) : null}

      {error ? <Text style={styles.error}>{error}</Text> : null}
      {askedAt !== null && !results && !error ? <Hint>جارٍ الحكم…</Hint> : null}

      {results && answers ? (
        <>
          <View style={styles.wheel}>
            <ChartWheel
              chart={results[0].chart}
              size={Math.min(width - 40, 520)}
            />
          </View>

          {two ? (
            (() => {
              const ra = rank(answers[0], results[0]);
              const rb = rank(answers[1], results[1]);
              const best =
                ra === rb
                  ? null
                  : ra > rb
                  ? matterText(matter)
                  : matterText(matterB);
              return (
                <>
                  <View style={[styles.verdict, { borderColor: colors.gold }]}>
                    <Text style={[styles.headline, { color: colors.gold }]}>
                      {best
                        ? `الخير في: ${best}`
                        : 'الخياران متقاربان، ولا يرجح أحدهما على الآخر.'}
                    </Text>
                  </View>
                  {answerBox(answers[0], results[0], 'الخيار الأول')}
                  {extras(answers[0])}
                  {answerBox(answers[1], results[1], 'الخيار الثاني')}
                  {extras(answers[1])}
                </>
              );
            })()
          ) : (
            <>
              {answerBox(answers[0], results[0])}
              {extras(answers[0])}
            </>
          )}

          {answers[0].caution ? (
            <Text style={styles.note}>{answers[0].caution}</Text>
          ) : null}
          <Text style={styles.note}>{`لحظة السؤال: ${formatJd(
            results[0].jd,
          )} · ${place.name}`}</Text>

          <Pressable onPress={() => setShowEvidence(v => !v)}>
            <Text style={styles.toggle}>
              {showEvidence ? 'إخفاء الأدلة الفلكية' : 'عرض الأدلة الفلكية'}
            </Text>
          </Pressable>
          {showEvidence
            ? answers.map((a, k) => (
                <Card key={k}>
                  {a.evidence.map((l, i) => (
                    <Text
                      key={i}
                      style={[
                        styles.line,
                        i === a.evidence.length - 1 && styles.lastLine,
                      ]}
                    >
                      {l}
                    </Text>
                  ))}
                </Card>
              ))
            : null}
        </>
      ) : null}

      {log.length ? (
        <>
          <Section title="سجل المسائل" />
          {judged.length ? (
            <Text style={styles.note}>
              {`أصاب الحكم في ${hits} من ${judged.length} مسألة عُرفت نتيجتها (لا تُحسب المشكوك فيها).`}
            </Text>
          ) : (
            <Hint>
              بعد أن يتضح ما حدث في مسألة، علّمها بـ«حصل» أو «لم يحصل» ليظهر لك
              مع الوقت مقدار الإصابة.
            </Hint>
          )}
          <Card>
            {log.slice(0, 30).map((e, i, all) => (
              <View
                key={e.id}
                style={[styles.logRow, i === all.length - 1 && styles.lastLine]}
              >
                <Text style={styles.logTitle}>{e.label}</Text>
                {e.question ? (
                  <Text style={styles.logText}>{`«${e.question}»`}</Text>
                ) : null}
                <Text style={styles.logText}>
                  {`${formatJd(e.jd)} · ${e.headline}`}
                </Text>
                <View style={styles.logButtons}>
                  {(
                    [
                      ['yes', 'حصل'],
                      ['no', 'لم يحصل'],
                    ] as const
                  ).map(([v, label]) => (
                    <Pressable
                      key={v}
                      onPress={() => {
                        markHoraryEntry(e.id, e.result === v ? null : v);
                        setLog(loadHoraryLog());
                      }}
                      style={[styles.chip, e.result === v && styles.chipOn]}
                    >
                      <Text
                        style={[
                          styles.chipText,
                          e.result === v && styles.chipTextOn,
                        ]}
                      >
                        {label}
                      </Text>
                    </Pressable>
                  ))}
                  <Pressable
                    onPress={() => {
                      deleteHoraryEntry(e.id);
                      setLog(loadHoraryLog());
                    }}
                    style={styles.chip}
                  >
                    <Text style={styles.chipText}>حذف</Text>
                  </Pressable>
                </View>
              </View>
            ))}
          </Card>
        </>
      ) : null}

      <Hint>
        الحكم على طريقة ما شاء الله وسهل بن بشر ومن نقل عنهما. المسألة عن غيرك
        تُحسب بتدوير البيوت من بيت ذلك الشخص. الحساب بالبروج الاستوائية وبيوت
        ريجيومونتانوس كما في كتب المسائل. هذا تطبيق للقواعد؛ وفي الحالات
        الملتبسة يبقى اجتهاد المنجّم.
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
    fontSize: 15,
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
  chipOn: { borderColor: colors.gold, backgroundColor: colors.navyRaised },
  chipText: { fontFamily: FONT, color: colors.text, fontSize: 14 },
  chipTextOn: { color: colors.gold, fontWeight: '600' },
  timeRow: { flexDirection: 'row-reverse', gap: 10 },
  timeField: { flex: 1 },
  wheel: { alignItems: 'center' },
  verdict: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    gap: 8,
    backgroundColor: colors.navyRaised,
  },
  optionTitle: {
    fontFamily: FONT,
    color: colors.muted,
    fontSize: 13,
    textAlign: 'right',
  },
  headline: {
    fontFamily: FONT,
    fontSize: 20,
    lineHeight: 32,
    fontWeight: '700',
    textAlign: 'right',
  },
  body: {
    fontFamily: FONT,
    color: colors.text,
    fontSize: 15,
    lineHeight: 26,
    textAlign: 'right',
  },
  note: {
    fontFamily: FONT,
    color: colors.muted,
    fontSize: 13,
    lineHeight: 21,
    textAlign: 'right',
  },
  warn: {
    fontFamily: FONT,
    color: colors.error,
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
  line: {
    fontFamily: FONT,
    color: colors.text,
    fontSize: 14,
    lineHeight: 23,
    textAlign: 'right',
    paddingVertical: 9,
    borderBottomColor: colors.line,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  lastLine: { borderBottomWidth: 0 },
  logRow: {
    paddingVertical: 10,
    gap: 4,
    borderBottomColor: colors.line,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  logTitle: {
    fontFamily: FONT,
    color: colors.gold,
    fontSize: 15,
    textAlign: 'right',
  },
  logText: {
    fontFamily: FONT,
    color: colors.text,
    fontSize: 13,
    lineHeight: 20,
    textAlign: 'right',
  },
  logButtons: { flexDirection: 'row-reverse', gap: 8, marginTop: 4 },
  error: {
    fontFamily: FONT,
    color: colors.error,
    fontSize: 14,
    textAlign: 'right',
  },
});
