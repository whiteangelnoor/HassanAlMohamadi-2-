// Small shared controls. AGPL-3.0-or-later.

import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  View,
} from 'react-native';

import { colors } from './theme';

export function Header({
  title,
  onBack,
}: {
  title: string;
  onBack?: () => void;
}) {
  return (
    <View style={styles.header}>
      <Text style={styles.title}>{title}</Text>
      {onBack ? (
        <Pressable
          onPress={onBack}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel="رجوع"
        >
          <Text style={styles.back}>→</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

export function Button({
  label,
  onPress,
  kind = 'primary',
  disabled,
}: {
  label: string;
  onPress: () => void;
  kind?: 'primary' | 'secondary';
  disabled?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      style={({ pressed }) => [
        styles.button,
        kind === 'primary' ? styles.primary : styles.secondary,
        (pressed || disabled) && styles.dimmed,
      ]}
    >
      <Text
        style={kind === 'primary' ? styles.primaryText : styles.secondaryText}
      >
        {label}
      </Text>
    </Pressable>
  );
}

export function Field({ label, ...input }: TextInputProps & { label: string }) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        placeholderTextColor={colors.muted}
        selectionColor={colors.gold}
        {...input}
        style={[styles.input, input.style]}
      />
    </View>
  );
}

/** Accepts Arabic-Indic and Persian digits as typed on Arabic keyboards. */
export function toLatinDigits(s: string): string {
  return s
    .replace(/[٠-٩]/g, d => String(d.charCodeAt(0) - 0x0660))
    .replace(/[۰-۹]/g, d => String(d.charCodeAt(0) - 0x06f0));
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 4,
  },
  title: {
    color: colors.gold,
    fontSize: 26,
    fontWeight: '600',
    textAlign: 'right',
  },
  back: { color: colors.muted, fontSize: 26, paddingHorizontal: 4 },
  button: {
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  primary: { backgroundColor: colors.gold },
  secondary: { borderColor: colors.line, borderWidth: 1 },
  dimmed: { opacity: 0.5 },
  primaryText: { color: colors.goldText, fontSize: 17, fontWeight: '600' },
  secondaryText: { color: colors.text, fontSize: 16 },
  field: { flex: 1, gap: 6 },
  label: { color: colors.muted, fontSize: 13, textAlign: 'right' },
  input: {
    backgroundColor: colors.navyInput,
    borderColor: colors.line,
    borderWidth: 1,
    borderRadius: 10,
    color: colors.text,
    fontSize: 17,
    paddingHorizontal: 12,
    paddingVertical: 10,
    textAlign: 'right',
  },
});
