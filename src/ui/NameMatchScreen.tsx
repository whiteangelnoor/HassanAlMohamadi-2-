// Compatibility of two people by abjad: the nature of each one's spiritual
// sign and of each name. AGPL-3.0-or-later.

import { useState } from 'react';
import { ScrollView, StyleSheet, Text } from 'react-native';

import {
  AbjadOptions,
  AbjadSystem,
  cosmicNumber,
  Element,
  ELEMENTS,
  nameNature,
  natureLabel,
  natureRelation,
  RELATION_NAMES,
  spiritualSign,
  unknownLetters,
} from '../spiritual/abjad';
import { Card, Hint, Row, Section, Stepper } from './list';
import { colors, FONT, SIGNS } from './theme';
import { Field, Header } from './widgets';

interface Person {
  name: string;
  mother: string;
}

function reading(p: Person, o: AbjadOptions) {
  const s = spiritualSign(p.name, p.mother, o);
  const n = nameNature(p.name, o);
  const signElement: Element = ELEMENTS[s.sign % 4];
  return { s, n, signElement };
}

export function NameMatchScreen({ onBack }: { onBack: () => void }) {
  const [a, setA] = useState<Person>({ name: '', mother: '' });
  const [b, setB] = useState<Person>({ name: '', mother: '' });
  const [system, setSystem] = useState<AbjadSystem>('mashriqi');
  const [taa, setTaa] = useState<5 | 400>(5);
  const o: AbjadOptions = { system, taaMarbuta: taa };

  const filled = (p: Person) => p.name.trim() !== '' && p.mother.trim() !== '';
  const ready = filled(a) && filled(b);
  const ra = ready ? reading(a, o) : null;
  const rb = ready ? reading(b, o) : null;
  const bad = [a.name, a.mother, b.name, b.mother].flatMap(unknownLetters);

  const signRel =
    ra && rb ? natureRelation([ra.signElement], [rb.signElement]) : null;
  const nameRel = ra && rb ? natureRelation(ra.n.winners, rb.n.winners) : null;

  const personCard = (p: Person, r: NonNullable<typeof ra>) => (
    <>
      <Section title={p.name.trim()} />
      <Card>
        <Row
          name="البرج الروحاني"
          value={<Text style={styles.gold}>{SIGNS[r.s.sign]}</Text>}
        />
        <Row
          name="طبع البرج"
          value={natureLabel({ ...r.n, winners: [r.signElement] })}
        />
        <Row name="طبع الاسم" value={natureLabel(r.n)} />
        <Row
          name="الحساب الكوني للاسم"
          value={String(cosmicNumber(r.s.nameValue))}
          last
        />
      </Card>
    </>
  );

  return (
    <ScrollView
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      <Header title="توافق الاسمين" onBack={onBack} />

      <Section title="الأول" />
      <Field
        label="الاسم"
        value={a.name}
        onChangeText={v => setA({ ...a, name: v })}
        placeholder="مثلاً: حسن"
      />
      <Field
        label="اسم الأم"
        value={a.mother}
        onChangeText={v => setA({ ...a, mother: v })}
        placeholder="مثلاً: نادية"
      />
      <Section title="الثاني" />
      <Field
        label="الاسم"
        value={b.name}
        onChangeText={v => setB({ ...b, name: v })}
        placeholder="مثلاً: مريم"
      />
      <Field
        label="اسم الأم"
        value={b.mother}
        onChangeText={v => setB({ ...b, mother: v })}
        placeholder="مثلاً: زينب"
      />

      <Section title="الحساب" />
      <Stepper
        items={[
          {
            label: 'المشرقي',
            active: system === 'mashriqi',
            onPress: () => setSystem('mashriqi'),
          },
          {
            label: 'المغربي',
            active: system === 'maghribi',
            onPress: () => setSystem('maghribi'),
          },
        ]}
      />
      <Stepper
        items={[
          {
            label: 'التاء المربوطة 5',
            active: taa === 5,
            onPress: () => setTaa(5),
          },
          {
            label: 'التاء المربوطة 400',
            active: taa === 400,
            onPress: () => setTaa(400),
          },
        ]}
      />
      {bad.length ? (
        <Text style={styles.error}>{`حروف غير عربية لم تُحسب: ${bad.join(
          ' ',
        )}`}</Text>
      ) : null}

      {ra && rb ? (
        <>
          <Card>
            <Row
              name="توافق البرجين"
              value={
                <Text style={styles.gold}>
                  {signRel ? RELATION_NAMES[signRel] : '—'}
                </Text>
              }
              detail={`${SIGNS[ra.s.sign]} و${SIGNS[rb.s.sign]}`}
            />
            <Row
              name="توافق طبع الاسمين"
              value={
                <Text style={styles.gold}>
                  {nameRel ? RELATION_NAMES[nameRel] : '—'}
                </Text>
              }
              detail={`${natureLabel(ra.n)} و${natureLabel(rb.n)}`}
              last
            />
          </Card>
          {personCard(a, ra)}
          {personCard(b, rb)}
        </>
      ) : (
        <Hint>اكتب الاسمين واسمي الأمّين بالعربية.</Hint>
      )}

      <Hint>
        النار والهواء متوافقان لأنهما حاران، والماء والتراب متوافقان لأنهما
        باردان، وكل طبع يوافق نفسه. النار والماء متنافران، وكذلك الهواء والتراب،
        لاختلافهما في الصفتين. وما سوى ذلك معتدل لاشتراكه في صفة واحدة. إن كان
        الطبع ممتزجاً أُخذ أحسن ما بين عناصره.
      </Hint>
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
  error: {
    fontFamily: FONT,
    color: colors.error,
    fontSize: 13,
    textAlign: 'right',
  },
});
