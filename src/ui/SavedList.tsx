// List of saved charts, used on the home screen and to pick a partner for
// synastry. AGPL-3.0-or-later.

import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import { SavedChart } from '../store';
import { colors, FONT } from './theme';

const pad = (n: number) => String(n).padStart(2, '0');

export function savedSummary(c: SavedChart): string {
  const d = `${c.local.year}/${pad(c.local.month)}/${pad(c.local.day)}`;
  const t = c.timeUnknown
    ? 'الوقت غير معروف'
    : `${pad(c.local.hour)}:${pad(c.local.minute)}`;
  return `${d} · ${t} · ${c.place.name}`;
}

export function SavedList({
  charts,
  onOpen,
  onDelete,
}: {
  charts: SavedChart[];
  onOpen: (c: SavedChart) => void;
  onDelete?: (c: SavedChart) => void;
}) {
  if (charts.length === 0) {
    return null;
  }
  return (
    <View style={styles.card}>
      {charts.map((c, i) => (
        <Pressable
          key={c.id}
          onPress={() => onOpen(c)}
          onLongPress={
            onDelete
              ? () =>
                  Alert.alert('حذف الخريطة', `هل تريد حذف خريطة «${c.name}»؟`, [
                    { text: 'إلغاء', style: 'cancel' },
                    {
                      text: 'حذف',
                      style: 'destructive',
                      onPress: () => onDelete(c),
                    },
                  ])
              : undefined
          }
          style={({ pressed }) => [
            styles.row,
            i === charts.length - 1 && styles.last,
            pressed && styles.pressed,
          ]}
        >
          <Text style={styles.name}>{c.name}</Text>
          <Text style={styles.detail}>{savedSummary(c)}</Text>
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
  last: { borderBottomWidth: 0 },
  pressed: { opacity: 0.6 },
  name: {
    fontFamily: FONT,
    color: colors.text,
    fontSize: 16,
    textAlign: 'right',
  },
  detail: {
    fontFamily: FONT,
    color: colors.muted,
    fontSize: 13,
    textAlign: 'right',
  },
});
