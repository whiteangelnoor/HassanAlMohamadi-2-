// The spiritual sign by abjad of the name and the mother's name, with the
// nature (طبع) of the sign, of the name and of the mother's name.
// AGPL-3.0-or-later.

import { useState } from 'react';
import { ScrollView, StyleSheet, Text } from 'react-native';

import { rulersAt } from '../astro/traditional';
import {
  AbjadOptions,
  AbjadSystem,
  abjadLetters,
  ELEMENT_NAMES,
  ELEMENTS,
  nameNature,
  natureLabel,
  spiritualSign,
  unknownLetters,
} from '../spiritual/abjad';
import { Card, Hint, Row, Section, Stepper } from './list';
import { colors, FONT, POINT_NAMES, SIGNS } from './theme';
import { Field, Header } from './widgets';

export function SpiritualSignScreen({ onBack }: { onBack: () => void }) {
  const [name, setName] = useState('');
  const [mother, setMother] = useState('');
  const [system, setSystem] = useState<AbjadSystem>('mashriqi');
  const [taa, setTaa] = useState<5 | 400>(5);
  const o: AbjadOptions = { system, taaMarbuta: taa };

  const ready = name.trim() !== '' && mother.trim() !== '';
  const r = ready ? spiritualSign(name, mother, o) : null;
  const bad = [...unknownLetters(name), ...unknownLetters(mother)];
  const values = (s: string) =>
    abjadLetters(s, o)
      .map(l => `${l.letter} ${l.value}`)
      .join(' + ');
  const systemName = system === 'mashriqi' ? 'المشرقي' : 'المغربي';

  return (
    <ScrollView
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      <Header title="البرج الروحاني" onBack={onBack} />
      <Field
        label="الاسم"
        value={name}
        onChangeText={setName}
        placeholder="مثلاً: محمد"
      />
      <Field
        label="اسم الأم"
        value={mother}
        onChangeText={setMother}
        placeholder="مثلاً: فاطمة"
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
      <Section title="التاء المربوطة (ة) تُحسب" />
      <Stepper
        items={[
          { label: 'هاءً (5)', active: taa === 5, onPress: () => setTaa(5) },
          {
            label: 'تاءً (400)',
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

      {r ? (
        <>
          <Card>
            <Row
              name={`البرج الروحاني (${systemName})`}
              value={<Text style={styles.big}>{SIGNS[r.sign]}</Text>}
            />
            <Row name="طبع البرج" value={ELEMENT_NAMES[ELEMENTS[r.sign % 4]]} />
            <Row
              name="كوكبه"
              value={POINT_NAMES[rulersAt(r.sign * 30 + 1).domicile]}
            />
            <Row name="طبع الاسم" value={natureLabel(nameNature(name, o))} />
            <Row
              name="طبع اسم الأم"
              value={natureLabel(nameNature(mother, o))}
              last
            />
          </Card>

          <NatureCard title={`طبع «${name.trim()}»`} name={name} o={o} />
          <NatureCard title={`طبع «${mother.trim()}»`} name={mother} o={o} />

          <Section title="خطوات حساب البرج" />
          <Card>
            <Row
              name={`قيمة «${name.trim()}»`}
              value={String(r.nameValue)}
              detail={values(name)}
            />
            <Row
              name={`قيمة «${mother.trim()}»`}
              value={String(r.motherValue)}
              detail={values(mother)}
            />
            <Row name="المجموع" value={String(r.total)} />
            <Row
              name="الباقي بعد طرح 12 مراراً"
              value={String(r.remainder)}
              detail={
                r.remainder === 0
                  ? 'الباقي صفر يعني البرج الثاني عشر، الحوت.'
                  : `يُعدّ من الحمل: ${r.remainder} = ${SIGNS[r.sign]}`
              }
              last
            />
          </Card>
        </>
      ) : (
        <Hint>اكتب الاسم واسم الأم بالعربية.</Hint>
      )}

      <Hint>
        المشرقي: أبجد هوز حطي كلمن سعفص قرشت ثخذ ضظغ. المغربي: أبجد هوز حطي كلمن
        صعفض قرست ثخذ ظغش. طبع الاسم: تُوزَّع الحروف على ترتيب الأبجد أربعةً
        أربعة على النار والتراب والهواء والماء، قوة الأربعة الأولى 7 ثم 6 حتى 1،
        وتُجمع قوى حروف الاسم لكل عنصر فالأكبر هو الطبع، وإن تساوى الأكبر فالطبع
        ممتزج. في الحساب المغربي يتبع التوزيع ترتيب الأبجد المغربي. تُهمل
        الحركات والمسافات، والهمزة تُحسب ألفاً.
      </Hint>
    </ScrollView>
  );
}

function NatureCard({
  title,
  name,
  o,
}: {
  title: string;
  name: string;
  o: AbjadOptions;
}) {
  const n = nameNature(name, o);
  return (
    <>
      <Section title={`${title}: ${natureLabel(n)}`} />
      <Card>
        {ELEMENTS.map((e, i) => {
          const ls = n.letters.filter(l => l.element === e);
          return (
            <Row
              key={e}
              name={ELEMENT_NAMES[e]}
              value={String(n.totals[e])}
              highlight={n.winners.includes(e)}
              detail={
                ls.length
                  ? ls.map(l => `${l.letter} ${l.strength}`).join(' + ')
                  : 'لا حروف'
              }
              last={i === ELEMENTS.length - 1}
            />
          );
        })}
      </Card>
    </>
  );
}

const styles = StyleSheet.create({
  content: { padding: 20, gap: 14, paddingBottom: 40 },
  big: {
    fontFamily: FONT,
    color: colors.gold,
    fontSize: 20,
    fontWeight: '600',
  },
  error: {
    fontFamily: FONT,
    color: colors.error,
    fontSize: 13,
    textAlign: 'right',
  },
});
