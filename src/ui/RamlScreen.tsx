// Istikhara by geomancy (علم الرمل): strike the sand (or enter the counts of
// lines struck by hand), see the figures and the judgment. Or the lot of the
// heart's intent (قرعة الضمير): four handfuls give one figure, read from the
// manuscript.
// AGPL-3.0-or-later.

import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import {
  castShield,
  Figure,
  figureInfo,
  figureKind,
  judgeShield,
  RAML_HOUSES,
  randomCounts,
  Shield,
} from '../spiritual/raml';
import {
  castQura,
  QURA_TOPICS,
  QuraTopic,
  quraEntry,
  randomHandfuls,
} from '../spiritual/qura';
import { BOOK_FIELDS, BOOK_RULES, rulesOf } from '../spiritual/ramlBook';
import { LOT_ANSWERS, LOT_QUESTIONS } from '../spiritual/qura16';
import { RamlField, RuleAnswer } from '../spiritual/ramlKit';
import { Matter, MatterSelect } from './HoraryScreen';
import { Card, Hint, Row, Section, Stepper } from './list';
import { colors, FONT } from './theme';
import { Button, Field, Header, Select, toLatinDigits } from './widgets';

const COLOR = {
  yes: colors.gold,
  no: colors.error,
  doubt: colors.muted,
  wait: colors.muted,
};

const QURA_HEAD = {
  yes: 'الشكل سعيد: الحاجة مقضية بإذن الله.',
  wait: 'الشكل يأمر بالصبر: الحاجة تُقضى في غير هذا الوقت.',
  no: 'الشكل يحذّر: الأولى ترك هذا الأمر.',
};

function QuraView() {
  const [topic, setTopic] = useState<QuraTopic | null>(null);
  const [manual, setManual] = useState(false);
  const [counts, setCounts] = useState<string[]>(() => Array(4).fill(''));
  const [figure, setFigure] = useState<Figure | null>(null);
  const [error, setError] = useState<string | null>(null);

  const draw = () => {
    setError(null);
    if (!manual) {
      setFigure(castQura(randomHandfuls()));
      return;
    }
    const n = counts.map(c => Number(toLatinDigits(c.trim())));
    if (n.some(x => !Number.isInteger(x) || x < 1)) {
      setError('اكتب عدد الحبات الباقية أو المأخوذة في كل قبضة من الأربع.');
      return;
    }
    setFigure(castQura(n));
  };

  const e = figure ? quraEntry(figure) : null;
  const label = QURA_TOPICS.find(t => t.key === topic)?.label ?? 'عام';
  const special = e && topic ? e.topics[topic] : undefined;

  return (
    <>
      <Select
        label="باب السؤال"
        value={label}
        placeholder="عام"
        options={QURA_TOPICS.map(t => t.label)}
        onChange={v => setTopic(QURA_TOPICS.find(t => t.label === v)!.key)}
      />
      <Stepper
        items={[
          {
            label: 'قرعة تلقائية',
            active: !manual,
            onPress: () => setManual(false),
          },
          {
            label: 'قبضت بيدي',
            active: manual,
            onPress: () => setManual(true),
          },
        ]}
      />
      {manual ? (
        <>
          <Hint>
            خذ قبضة من حبوب أو من حبات السبحة دون عدّ وأنت تضمر حاجتك، ثم اكتب
            عددها. أربع قبضات بالترتيب.
          </Hint>
          <View style={styles.countRow}>
            {[0, 1, 2, 3].map(i => (
              <View key={i} style={styles.countCell}>
                <Field
                  label={String(i + 1)}
                  value={counts[i]}
                  onChangeText={v =>
                    setCounts(c => c.map((x, k) => (k === i ? v : x)))
                  }
                  keyboardType="number-pad"
                />
              </View>
            ))}
          </View>
        </>
      ) : (
        <Hint>أضمر حاجتك في قلبك، ثم اضغط «اسحب القرعة».</Hint>
      )}
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <Button label={figure ? 'اسحب من جديد' : 'اسحب القرعة'} onPress={draw} />

      {figure && e ? (
        <>
          <View style={styles.figRow}>
            <FigureView f={figure} />
          </View>
          <View style={[styles.verdict, { borderColor: COLOR[e.verdict] }]}>
            <Text style={[styles.headline, { color: COLOR[e.verdict] }]}>
              {QURA_HEAD[e.verdict]}
            </Text>
            <Text style={styles.verse}>
              ﴿{e.verse}﴾ <Text style={styles.ref}>[{e.ref}]</Text>
            </Text>
            <Text style={styles.body}>{e.judgment}</Text>
            {topic ? (
              <Text style={styles.body}>
                {special
                  ? `في ${label}: ${special}`
                  : `لم تذكر المخطوطة لهذا الشكل حكماً خاصاً في ${label}، فالحكم العام أعلاه هو المعتبر.`}
              </Text>
            ) : null}
          </View>
          <Card>
            <Row name="الشكل" value={e.name} />
            <Row last name="كوكبه" value={e.planet ?? 'لم تذكره المخطوطة'} />
          </Card>
        </>
      ) : null}

      <Hint>
        من مخطوطة «القرعة في علم الرمل لاستخراج الضمير»، منسوبة في متنها إلى
        جعفر الصادق ومؤلفها غير معروف. كل قبضة تُطرح منها الحبات اثنتين اثنتين،
        فإن بقي واحد فهو نقطة، وإن بقي اثنان فنقطتان، والقبضات الأربع شكل واحد
        يُقرأ حكمه.
      </Hint>
    </>
  );
}

function FigureView({ f, label }: { f: Figure; label?: string }) {
  const info = figureInfo(f);
  return (
    <View style={styles.figure}>
      {label ? <Text style={styles.figLabel}>{label}</Text> : null}
      {f.map((r, i) => (
        <Text key={i} style={styles.dots}>
          {r === 1 ? '●' : '●   ●'}
        </Text>
      ))}
      <Text style={styles.figName}>{info.name}</Text>
    </View>
  );
}

type Mode = 'shield' | 'qura' | 'lot';

export function RamlScreen({ onBack }: { onBack: () => void }) {
  const [mode, setMode] = useState<Mode>('shield');
  return (
    <ScrollView
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      <Header title="الرمل" onBack={onBack} />
      <Stepper
        items={(
          [
            ['shield', 'الزائجة الكاملة'],
            ['lot', 'قرعة الأسئلة'],
            ['qura', 'قرعة الضمير'],
          ] as [Mode, string][]
        ).map(([m, label]) => ({
          label,
          active: mode === m,
          onPress: () => setMode(m),
        }))}
      />
      {mode === 'qura' ? (
        <QuraView />
      ) : mode === 'lot' ? (
        <LotView />
      ) : (
        <ShieldView />
      )}
    </ScrollView>
  );
}

/** The lot of sixteen questions (ص٣٦٨): one figure, one question. */
function LotView() {
  const [q, setQ] = useState<number | null>(null);
  const [figure, setFigure] = useState<Figure | null>(null);
  const answer = figure && q !== null ? LOT_ANSWERS[figure.join('')][q] : null;
  return (
    <>
      <Select
        label="السؤال"
        value={q === null ? null : LOT_QUESTIONS[q]}
        placeholder="اختر سؤالك"
        options={LOT_QUESTIONS}
        onChange={v => {
          setQ(LOT_QUESTIONS.indexOf(v));
          setFigure(null);
        }}
      />
      <Hint>أضمر سؤالك، ثم اضغط «اسحب القرعة».</Hint>
      <Button
        label={figure ? 'اسحب من جديد' : 'اسحب القرعة'}
        onPress={() => q !== null && setFigure(castQura(randomHandfuls()))}
      />
      {q === null ? <Hint>اختر السؤال أولاً.</Hint> : null}
      {figure && answer ? (
        <>
          <View style={styles.figRow}>
            <FigureView f={figure} />
          </View>
          <View style={[styles.verdict, { borderColor: colors.gold }]}>
            <Text style={[styles.headline, { color: colors.gold }]}>
              {answer}
            </Text>
            <Text style={styles.body}>
              خرج شكل «{figureInfo(figure).name}» لسؤال «{LOT_QUESTIONS[q!]}».
            </Text>
          </View>
        </>
      ) : null}
      <Hint>
        من «باب قرعة رملية» في الفلك المشحون (ص٣٦٨): أربعة أسطر نقاط تعطي شكلاً
        واحداً، ومن الشكل ورقم السؤال يُعرف الحرف، ومن جدول الحرف يُقرأ الجواب.
      </Hint>
    </>
  );
}

const GENERAL = 'عام';

function AnswerBox({ a }: { a: RuleAnswer }) {
  const color = a.verdict === 'info' ? colors.gold : COLOR[a.verdict];
  return (
    <View style={[styles.verdict, { borderColor: color }]}>
      <Text style={[styles.headline, { color }]}>{a.headline}</Text>
      {a.lines.map((l, i) => (
        <Text key={i} style={styles.body}>
          {l}
        </Text>
      ))}
    </View>
  );
}

function ShieldView() {
  const [field, setField] = useState<RamlField | null>(null);
  const [ruleId, setRuleId] = useState<string | null>(null);
  const [matter, setMatter] = useState<Matter | null>(null);
  const [manual, setManual] = useState(false);
  const [counts, setCounts] = useState<string[]>(() => Array(16).fill(''));
  const [shield, setShield] = useState<Shield | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState<number | null>(null);

  const house = matter && matter !== 'intention' ? matter.house : 1;

  const strike = () => {
    setError(null);
    if (!manual) {
      setShield(castShield(randomCounts()));
      return;
    }
    const n = counts.map(c => Number(toLatinDigits(c.trim())));
    if (n.some(x => !Number.isInteger(x) || x < 1)) {
      setError('اكتب عدد النقاط في كل سطر من الأسطر الستة عشر.');
      return;
    }
    setShield(castShield(n));
  };

  const rule = BOOK_RULES.find(r => r.id === ruleId) ?? null;
  const answer = shield ? judgeShield(shield, rule ? 1 : house) : null;
  const special = shield && rule ? rule.judge(shield) : null;

  return (
    <>
      <Select
        label="الموضوع"
        value={field ?? GENERAL}
        placeholder={GENERAL}
        options={[GENERAL, ...BOOK_FIELDS]}
        onChange={v => {
          setField(v === GENERAL ? null : (v as RamlField));
          setRuleId(null);
          setShield(null);
        }}
      />
      {field ? (
        <Select
          label="السؤال"
          value={rule?.title ?? null}
          placeholder="اختر السؤال"
          options={rulesOf(field).map(r => r.title)}
          onChange={v => {
            setRuleId(rulesOf(field).find(r => r.title === v)?.id ?? null);
            setShield(null);
          }}
        />
      ) : (
        <MatterSelect
          label="بيت المسألة (اختياري)"
          value={matter}
          allowIntention={false}
          onChange={m => {
            setMatter(m);
            setShield(null);
          }}
        />
      )}

      <Stepper
        items={[
          {
            label: 'ضرب تلقائي',
            active: !manual,
            onPress: () => setManual(false),
          },
          {
            label: 'ضربته بيدي',
            active: manual,
            onPress: () => setManual(true),
          },
        ]}
      />
      {manual ? (
        <>
          <Hint>
            اكتب عدد نقاط كل سطر بالترتيب، من السطر الأول إلى السادس عشر.
          </Hint>
          {[0, 1, 2, 3].map(row => (
            <View key={row} style={styles.countRow}>
              {[0, 1, 2, 3].map(col => {
                const i = row * 4 + col;
                return (
                  <View key={i} style={styles.countCell}>
                    <Field
                      label={String(i + 1)}
                      value={counts[i]}
                      onChangeText={v =>
                        setCounts(c => c.map((x, k) => (k === i ? v : x)))
                      }
                      keyboardType="number-pad"
                    />
                  </View>
                );
              })}
            </View>
          ))}
        </>
      ) : (
        <Hint>أضمر حاجتك، ثم اضغط «اضرب الرمل».</Hint>
      )}
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <Button label={shield ? 'اضرب من جديد' : 'اضرب الرمل'} onPress={strike} />

      {shield && answer ? (
        <>
          {special && rule ? (
            <>
              <AnswerBox a={special} />
              <Hint>
                من باب «{rule.title}» في الفلك المشحون، ص{rule.page}.
              </Hint>
              <Section title="الأحكام العامة للضرب" />
            </>
          ) : null}
          <AnswerBox a={answer} />

          <Section title="الأمهات" />
          <View style={styles.figRow}>
            {shield.mothers.map((f, i) => (
              <FigureView key={i} f={f} />
            ))}
          </View>
          <Section title="البنات" />
          <View style={styles.figRow}>
            {shield.daughters.map((f, i) => (
              <FigureView key={i} f={f} />
            ))}
          </View>
          <Section title="الحفيدات" />
          <View style={styles.figRow}>
            {shield.nieces.map((f, i) => (
              <FigureView key={i} f={f} />
            ))}
          </View>
          <Section title="السائل والمسؤول" />
          <View style={styles.figRow}>
            <FigureView f={shield.rightWitness} label="السائل" />
            <FigureView f={shield.leftWitness} label="المسؤول" />
          </View>
          <Section title="الميزان والعاقبة" />
          <View style={styles.figRow}>
            <FigureView f={shield.judge} label="الميزان" />
            <FigureView f={shield.outcome} label="العاقبة" />
          </View>

          <Section title="البيوت الستة عشر" />
          <Hint>اضغط على بيت لترى صفات شكله.</Hint>
          <Card>
            {shield.houses.map((f, i) => {
              const info = figureInfo(f);
              return (
                <Pressable
                  key={i}
                  onPress={() => setOpen(o => (o === i ? null : i))}
                >
                  <Row
                    last={i === 15}
                    highlight={i + 1 === house && house !== 1}
                    name={`${i + 1} · ${RAML_HOUSES[i]}`}
                    value={`${info.name} · ${info.nature}`}
                    detail={
                      open === i
                        ? `كوكبه ${info.planet} · برجه ${info.sign} · عنصره ${
                            info.element
                          } · ${figureKind(f)}`
                        : undefined
                    }
                  />
                </Pressable>
              );
            })}
          </Card>
        </>
      ) : null}

      <Hint>
        على طريقة «الفلك المشحون في علم الرمل المصون»: تُعدّ نقاط كل سطر، الفرد
        نقطة والزوج نقطتان، وكل أربعة أسطر شكل. من الأمهات تُستخرج البنات
        والحفيدات، ثم السائل والمسؤول والميزان والعاقبة، فتتم البيوت الستة عشر.
        يُنظر أولاً في صدق الرمل، ثم في عاقبة الحاجة، ثم في شكل بيت المسألة
        وشرفه وهبوطه. وأصحّ الرمل ما ضُرب في الليل.
      </Hint>
    </>
  );
}

const styles = StyleSheet.create({
  content: { padding: 20, gap: 12, paddingBottom: 40 },
  countRow: { flexDirection: 'row-reverse', gap: 8 },
  countCell: { flex: 1 },
  verdict: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    gap: 8,
    backgroundColor: colors.navyRaised,
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
    lineHeight: 25,
    textAlign: 'right',
  },
  figRow: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-around',
  },
  figure: { alignItems: 'center', gap: 2, minWidth: 70 },
  figLabel: { fontFamily: FONT, color: colors.muted, fontSize: 12 },
  dots: { color: colors.gold, fontSize: 14, lineHeight: 18 },
  figName: {
    fontFamily: FONT,
    color: colors.text,
    fontSize: 12,
    marginTop: 4,
    textAlign: 'center',
  },
  verse: {
    fontFamily: FONT,
    color: colors.gold,
    fontSize: 16,
    lineHeight: 28,
    textAlign: 'right',
  },
  ref: { color: colors.muted, fontSize: 12 },
  error: {
    fontFamily: FONT,
    color: colors.error,
    fontSize: 14,
    textAlign: 'right',
  },
});
