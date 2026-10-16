// The spiritual sign by abjad of the name and the mother's name, with the
// nature (طبع) of the sign, of the name and of the mother's name.
// AGPL-3.0-or-later.

import { useState } from 'react';
import { ScrollView, StyleSheet, Text } from 'react-native';

import { rulersAt } from '../astro/traditional';
import {
  AbjadOptions,
  AbjadSystem,
  cosmicNumber,
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
            />
            <Row name="مجموع الاسم" value={String(r.nameValue)} />
            <Row name="مجموع اسم الأم" value={String(r.motherValue)} />
            <Row
              name="مجموع الاسم والأم"
              value={<Text style={styles.big}>{String(r.total)}</Text>}
              last
            />
          </Card>

          <Section title="الحساب الكوني" />
          <Card>
            <Row
              name="الحساب الكوني للاسم"
              value={<Text style={styles.big}>{cosmic(r.nameValue)}</Text>}
            />
            <Row
              name="الحساب الكوني للأم"
              value={<Text style={styles.big}>{cosmic(r.motherValue)}</Text>}
            />
            <Row
              name="الحساب الكوني للمجموع"
              value={<Text style={styles.big}>{cosmic(r.total)}</Text>}
              last
            />
          </Card>
        </>
      ) : (
        <Hint>اكتب الاسم واسم الأم بالعربية.</Hint>
      )}
    </ScrollView>
  );
}

const cosmic = (n: number) => String(cosmicNumber(n));

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
