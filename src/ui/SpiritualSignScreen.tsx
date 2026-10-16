// The spiritual sign by abjad of the name and the mother's name.
// AGPL-3.0-or-later.

import { useState } from 'react';
import { ScrollView, StyleSheet, Text } from 'react-native';

import { rulersAt } from '../astro/traditional';
import {
  abjadLetters,
  spiritualSign,
  unknownLetters,
} from '../spiritual/abjad';
import { Card, Hint, Row, Section, Stepper } from './list';
import { colors, FONT, POINT_NAMES, SIGNS } from './theme';
import { Field, Header } from './widgets';

const ELEMENTS = ['ناري', 'ترابي', 'هوائي', 'مائي'];

export function SpiritualSignScreen({ onBack }: { onBack: () => void }) {
  const [name, setName] = useState('');
  const [mother, setMother] = useState('');
  const [taa, setTaa] = useState<5 | 400>(5);
  const o = { taaMarbuta: taa };

  const ready = name.trim() !== '' && mother.trim() !== '';
  const r = ready ? spiritualSign(name, mother, o) : null;
  const bad = [...unknownLetters(name), ...unknownLetters(mother)];
  const letters = (s: string) =>
    abjadLetters(s, o)
      .map(l => `${l.letter} ${l.value}`)
      .join(' + ');

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
              name="البرج الروحاني"
              value={<Text style={styles.big}>{SIGNS[r.sign]}</Text>}
            />
            <Row name="طبيعته" value={ELEMENTS[r.sign % 4]} />
            <Row
              name="كوكبه"
              value={POINT_NAMES[rulersAt(r.sign * 30 + 1).domicile]}
              last
            />
          </Card>

          <Section title="خطوات الحساب" />
          <Card>
            <Row
              name={`قيمة «${name.trim()}»`}
              value={String(r.nameValue)}
              detail={letters(name)}
            />
            <Row
              name={`قيمة «${mother.trim()}»`}
              value={String(r.motherValue)}
              detail={letters(mother)}
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
        حساب الجُمَّل المشرقي (أبجد هوز حطي كلمن سعفص قرشت ثخذ ضظغ). تُهمل
        الحركات والمسافات، والهمزة تُحسب ألفاً. بعض المدارس تحسب التاء المربوطة
        400، فاختر ما تعتمده.
      </Hint>
    </ScrollView>
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
