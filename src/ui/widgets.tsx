// Small shared controls. AGPL-3.0-or-later.

import { useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  View,
} from 'react-native';

import { colors, FONT } from './theme';

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
/** A dropdown: shows the chosen item, opens a list to choose from. */
export function Select({
  label,
  value,
  placeholder,
  options,
  onChange,
}: {
  label?: string;
  value: string | null;
  placeholder: string;
  options: string[];
  onChange: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <View style={styles.field}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <Pressable
        onPress={() => setOpen(true)}
        style={({ pressed }) => [selectStyles.box, pressed && { opacity: 0.6 }]}
        accessibilityRole="button"
      >
        <Text style={[selectStyles.value, !value && selectStyles.placeholder]}>
          {value ?? placeholder}
        </Text>
        <Text style={selectStyles.caret}>▾</Text>
      </Pressable>
      <Modal
        visible={open}
        transparent
        animationType="fade"
        onRequestClose={() => setOpen(false)}
      >
        <Pressable style={selectStyles.backdrop} onPress={() => setOpen(false)}>
          <Pressable style={selectStyles.sheet}>
            <ScrollView>
              {options.map((o, i) => (
                <Pressable
                  key={o}
                  onPress={() => {
                    onChange(o);
                    setOpen(false);
                  }}
                  style={({ pressed }) => [
                    selectStyles.item,
                    i === options.length - 1 && selectStyles.lastItem,
                    pressed && { opacity: 0.6 },
                  ]}
                >
                  <Text
                    style={[
                      selectStyles.itemText,
                      o === value && selectStyles.itemOn,
                    ]}
                  >
                    {o}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const selectStyles = StyleSheet.create({
  box: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderColor: colors.line,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: colors.navyRaised,
  },
  value: { fontFamily: FONT, color: colors.text, fontSize: 16, flexShrink: 1 },
  placeholder: { color: colors.muted },
  caret: { color: colors.gold, fontSize: 16, marginRight: 8 },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    padding: 24,
  },
  sheet: {
    maxHeight: '75%',
    backgroundColor: colors.navyRaised,
    borderColor: colors.gold,
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 16,
  },
  item: {
    paddingVertical: 14,
    borderBottomColor: colors.line,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  lastItem: { borderBottomWidth: 0 },
  itemText: {
    fontFamily: FONT,
    color: colors.text,
    fontSize: 16,
    textAlign: 'right',
  },
  itemOn: { color: colors.gold, fontWeight: '600' },
});

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
    fontFamily: FONT,
    color: colors.gold,
    fontSize: 26,
    fontWeight: '600',
    textAlign: 'right',
  },
  back: {
    fontFamily: FONT,
    color: colors.muted,
    fontSize: 26,
    paddingHorizontal: 4,
  },
  button: {
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  primary: { backgroundColor: colors.gold },
  secondary: { borderColor: colors.line, borderWidth: 1 },
  dimmed: { opacity: 0.5 },
  primaryText: {
    fontFamily: FONT,
    color: colors.goldText,
    fontSize: 17,
    fontWeight: '600',
  },
  secondaryText: { fontFamily: FONT, color: colors.text, fontSize: 16 },
  field: { flex: 1, gap: 6 },
  label: {
    fontFamily: FONT,
    color: colors.muted,
    fontSize: 13,
    textAlign: 'right',
  },
  input: {
    fontFamily: FONT,
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
