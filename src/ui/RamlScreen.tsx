// Istikhara by geomancy (علم الرمل): strike the sand (or enter the counts of
// lines struck by hand), see the figures and the judgment. Or the lot of the
// heart's intent (قرعة الضمير): four handfuls give one figure, read from the
// manuscript.
// AGPL-3.0-or-later.

import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import {
  castShield,
  Figure,
  figureInfo,
  judgeShield,
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
      <Button
        label={figure ? 'اسحب من جديد' : 'اسحب القرعة'}
        onPress={draw}
      />

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
            <Row
              last
              name="كوكبه"
              value={e.planet ?? 'لم تذكره المخطوطة'}
            />
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

export function RamlScreen({ onBack }: { onBack: () => void }) {
  const [qura, setQura] = useState(false);
  return (
    <ScrollView
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      <Header title="الرمل" onBack={onBack} />
      <Stepper
        items={[
          {
            label: 'الزائجة الكاملة',
            active: !qura,
            onPress: () => setQura(false),
          },
          {
            label: 'قرعة الضمير',
            active: qura,
            onPress: () => setQura(true),
          },
        ]}
      />
      {qura ? <QuraView /> : <ShieldView />}
    </ScrollView>
  );
}

function ShieldView() {
  const [matter, setMatter] = useState<Matter | null>(null);
  const [manual, setManual] = useState(false);
  const [counts, setCounts] = useState<string[]>(() => Array(16).fill(''));
  const [shield, setShield] = useState<Shield | null>(null);
  const [error, setError] = useState<string | null>(null);

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

  const answer = shield ? judgeShield(shield, house) : null;

  return (
    <>
      <MatterSelect
        label="موضوع الاستخارة (اختياري)"
        value={matter}
        allowIntention={false}
        onChange={m => {
          setMatter(m);
          setShield(null);
        }}
      />

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
          <View
            style={[styles.verdict, { borderColor: COLOR[answer.verdict] }]}
          >
            <Text style={[styles.headline, { color: COLOR[answer.verdict] }]}>
              {answer.headline}
            </Text>
            {answer.lines.map((l, i) => (
              <Text key={i} style={styles.body}>
                {l}
              </Text>
            ))}
          </View>

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
          <Section title="الشاهدان والحاكم" />
          <View style={styles.figRow}>
            <FigureView f={shield.rightWitness} label="الأيمن" />
            <FigureView f={shield.judge} label="الحاكم" />
            <FigureView f={shield.leftWitness} label="الأيسر" />
          </View>

          <Section title="البيوت" />
          <Card>
            {shield.houses.map((f, i) => {
              const info = figureInfo(f);
              return (
                <Row
                  key={i}
                  last={i === 11}
                  highlight={i + 1 === house && house !== 1}
                  name={`البيت ${i + 1}`}
                  value={`${info.name} · ${info.nature}`}
                />
              );
            })}
          </Card>
        </>
      ) : null}

      <Hint>
        تُعدّ نقاط كل سطر: الفرد نقطة والزوج نقطتان، وكل أربعة أسطر شكل. من
        الأمهات الأربع تُستخرج البنات والحفيدات، ثم الشاهدان والحاكم، وتوزَّع
        الأشكال الاثنا عشر الأولى على البيوت. الحكم من الحاكم والشاهدين، ثم من
        انتقال شكل الطالع إلى بيت المسألة.
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
