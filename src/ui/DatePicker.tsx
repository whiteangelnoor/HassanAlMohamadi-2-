// "Choose a date" dialog and the shared row of date buttons:
// اليوم · غداً · اختيار تاريخ (or this month / next month / choose).
// AGPL-3.0-or-later.

import { useEffect, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { formatDay, MONTHS } from './dates';
import { Stepper } from './list';
import { colors, FONT } from './theme';
import { Button, Field, toLatinDigits } from './widgets';

type Mode = 'day' | 'month' | 'year';

function DateDialog({
  visible,
  mode,
  initial,
  onPick,
  onClose,
}: {
  visible: boolean;
  mode: Mode;
  initial: Date;
  onPick: (d: Date) => void;
  onClose: () => void;
}) {
  const [day, setDay] = useState('');
  const [month, setMonth] = useState('');
  const [year, setYear] = useState('');

  useEffect(() => {
    if (visible) {
      setDay(String(initial.getDate()));
      setMonth(String(initial.getMonth() + 1));
      setYear(String(initial.getFullYear()));
    }
  }, [visible, initial]);

  const num = (s: string) => {
    const t = toLatinDigits(s).trim();
    return /^\d+$/.test(t) ? parseInt(t, 10) : NaN;
  };
  const y = num(year);
  const m = mode === 'year' ? 1 : num(month);
  const d = mode === 'day' ? num(day) : 1;
  const date = new Date(y, m - 1, d);
  const valid =
    y >= 1800 &&
    y <= 2399 &&
    date.getFullYear() === y &&
    date.getMonth() === m - 1 &&
    date.getDate() === d;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={() => {}}>
          <Text style={styles.title}>
            {mode === 'year'
              ? 'اختيار سنة'
              : mode === 'month'
              ? 'اختيار شهر'
              : 'اختيار تاريخ'}
          </Text>
          <View style={styles.row}>
            {mode === 'day' ? (
              <Field
                label="اليوم"
                value={day}
                onChangeText={setDay}
                keyboardType="number-pad"
                maxLength={2}
              />
            ) : null}
            {mode !== 'year' ? (
              <Field
                label="الشهر"
                value={month}
                onChangeText={setMonth}
                keyboardType="number-pad"
                maxLength={2}
              />
            ) : null}
            <Field
              label="السنة"
              value={year}
              onChangeText={setYear}
              keyboardType="number-pad"
              maxLength={4}
            />
          </View>
          <Text style={valid ? styles.preview : styles.error}>
            {valid
              ? mode === 'day'
                ? formatDay(date)
                : mode === 'month'
                ? `${MONTHS[date.getMonth()]} ${date.getFullYear()}`
                : String(y)
              : 'تاريخ غير صحيح (السنوات من 1800 إلى 2399).'}
          </Text>
          <View style={styles.row}>
            <View style={styles.flex}>
              <Button label="إلغاء" kind="secondary" onPress={onClose} />
            </View>
            <View style={styles.flex}>
              <Button
                label="تم"
                disabled={!valid}
                onPress={() => onPick(date)}
              />
            </View>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

/**
 * The three date buttons used across the app. `mode` sets the step: a day
 * (اليوم / غداً), a month (هذا الشهر / الشهر التالي) or a year.
 */
export function DateBar({
  mode,
  value,
  onChange,
}: {
  mode: Mode;
  value: Date;
  onChange: (d: Date) => void;
}) {
  const [open, setOpen] = useState(false);
  const now = new Date();
  const today = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
    now.getHours(),
    now.getMinutes(),
  );
  const next =
    mode === 'day'
      ? new Date(today.getTime() + 86400000)
      : mode === 'month'
      ? new Date(today.getFullYear(), today.getMonth() + 1, 1)
      : new Date(today.getFullYear() + 1, today.getMonth(), today.getDate());
  const same = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() &&
    (mode === 'year' || a.getMonth() === b.getMonth()) &&
    (mode !== 'day' || a.getDate() === b.getDate());
  const labels =
    mode === 'day'
      ? ['اليوم', 'غداً', 'اختيار تاريخ']
      : mode === 'month'
      ? ['هذا الشهر', 'الشهر التالي', 'اختيار شهر']
      : ['هذه السنة', 'السنة التالية', 'اختيار سنة'];
  const chosen = !same(value, today) && !same(value, next);
  return (
    <>
      <Stepper
        items={[
          {
            label: labels[0],
            active: same(value, today),
            onPress: () => onChange(today),
          },
          {
            label: labels[1],
            active: same(value, next),
            onPress: () => onChange(next),
          },
          { label: labels[2], active: chosen, onPress: () => setOpen(true) },
        ]}
      />
      <DateDialog
        visible={open}
        mode={mode}
        initial={value}
        onClose={() => setOpen(false)}
        onPick={d => {
          setOpen(false);
          // Keep the current time of day for day-level views.
          if (mode === 'day') {
            d.setHours(today.getHours(), today.getMinutes());
          }
          onChange(d);
        }}
      />
    </>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(5, 10, 25, 0.7)',
    justifyContent: 'center',
    padding: 24,
  },
  sheet: {
    backgroundColor: colors.navyRaised,
    borderColor: colors.line,
    borderWidth: 1,
    borderRadius: 16,
    padding: 18,
    gap: 14,
  },
  title: {
    fontFamily: FONT,
    color: colors.gold,
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'right',
  },
  row: { flexDirection: 'row-reverse', gap: 10 },
  flex: { flex: 1 },
  preview: {
    fontFamily: FONT,
    color: colors.text,
    fontSize: 15,
    textAlign: 'right',
  },
  error: {
    fontFamily: FONT,
    color: colors.error,
    fontSize: 14,
    textAlign: 'right',
  },
});
