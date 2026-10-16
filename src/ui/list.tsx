// List building blocks shared by the screens. AGPL-3.0-or-later.

import { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors } from './theme';

export function Card({ children }: { children: ReactNode }) {
  return <View style={styles.card}>{children}</View>;
}

export function Row({
  name,
  value,
  detail,
  last,
  highlight,
}: {
  name: ReactNode;
  value?: ReactNode;
  detail?: ReactNode;
  last?: boolean;
  highlight?: boolean;
}) {
  return (
    <View style={[styles.row, last && styles.lastRow]}>
      <View style={styles.rowMain}>
        <Text style={[styles.name, highlight && styles.highlight]}>{name}</Text>
        {value !== undefined ? <Text style={styles.value}>{value}</Text> : null}
      </View>
      {detail ? <Text style={styles.detail}>{detail}</Text> : null}
    </View>
  );
}

export function Section({ title }: { title: string }) {
  return <Text style={styles.section}>{title}</Text>;
}

export function Hint({ children }: { children: ReactNode }) {
  return <Text style={styles.hint}>{children}</Text>;
}

/** A row of small buttons, e.g. to step a date. */
export function Stepper({
  items,
}: {
  items: { label: string; onPress: () => void; active?: boolean }[];
}) {
  return (
    <View style={styles.stepper}>
      {items.map(it => (
        <Pressable
          key={it.label}
          onPress={it.onPress}
          style={({ pressed }) => [
            styles.step,
            it.active && styles.stepActive,
            pressed && styles.pressed,
          ]}
          accessibilityRole="button"
        >
          <Text style={[styles.stepText, it.active && styles.stepTextActive]}>
            {it.label}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.navyRaised,
    borderColor: colors.line,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 14,
    paddingHorizontal: 16,
  },
  row: {
    paddingVertical: 11,
    borderBottomColor: colors.line,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 3,
  },
  rowMain: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 10,
  },
  lastRow: { borderBottomWidth: 0 },
  name: { color: colors.text, fontSize: 16, textAlign: 'right', flexShrink: 1 },
  highlight: { color: colors.gold, fontWeight: '600' },
  value: { color: colors.text, fontSize: 15, fontVariant: ['tabular-nums'] },
  detail: { color: colors.muted, fontSize: 13, textAlign: 'right' },
  section: {
    color: colors.muted,
    fontSize: 13,
    textAlign: 'right',
    marginTop: 6,
  },
  hint: {
    color: colors.muted,
    fontSize: 12,
    textAlign: 'right',
    lineHeight: 19,
  },
  stepper: { flexDirection: 'row-reverse', gap: 6 },
  step: {
    flex: 1,
    borderColor: colors.line,
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 9,
    alignItems: 'center',
  },
  stepActive: { backgroundColor: colors.gold, borderColor: colors.gold },
  stepText: { color: colors.text, fontSize: 14 },
  stepTextActive: { color: colors.goldText, fontWeight: '600' },
  pressed: { opacity: 0.6 },
});
