// Planet and angle positions of one chart. AGPL-3.0-or-later.

import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { ChartResult } from '../astro/engine';
import { BODIES, colors, formatLongitude } from './theme';
import { Button, Header } from './widgets';

export interface ChartInfo {
  title: string;
  lines: string[]; // shown under the title, e.g. place and times
  notes: string[]; // conversion warnings shown in gold
  chart: ChartResult;
}

const NAMES = new Map(BODIES.map(b => [b.key, b.name]));

export function ChartScreen({
  info,
  onBack,
}: {
  info: ChartInfo;
  onBack: () => void;
}) {
  const { chart } = info;
  const houses = chart.houses;
  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Header title={info.title} onBack={onBack} />
      {info.lines.map(l => (
        <Text key={l} style={styles.subtitle}>
          {l}
        </Text>
      ))}
      {info.notes.map(n => (
        <Text key={n} style={styles.note}>
          {n}
        </Text>
      ))}

      <View style={styles.card}>
        {chart.bodies.map((b, i) => (
          <View
            key={b.key}
            style={[
              styles.row,
              i === chart.bodies.length - 1 && styles.lastRow,
            ]}
          >
            <Text style={styles.name}>{NAMES.get(b.key) ?? b.key}</Text>
            <Text style={styles.value}>
              {b.retrograde ? <Text style={styles.retro}>متراجع </Text> : null}
              {formatLongitude(b.lon)}
              {b.housePosition ? (
                <Text style={styles.house}>{`  البيت ${Math.floor(
                  b.housePosition,
                )}`}</Text>
              ) : null}
            </Text>
          </View>
        ))}
      </View>

      {houses ? (
        <>
          <View style={styles.card}>
            <View style={styles.row}>
              <Text style={styles.name}>الطالع</Text>
              <Text style={styles.value}>{formatLongitude(houses.asc)}</Text>
            </View>
            <View style={[styles.row, styles.lastRow]}>
              <Text style={styles.name}>وسط السماء</Text>
              <Text style={styles.value}>{formatLongitude(houses.mc)}</Text>
            </View>
          </View>

          <Text style={styles.section}>رؤوس البيوت · {houses.systemName}</Text>
          <View style={styles.card}>
            {houses.cusps.slice(0, 12).map((c, i) => (
              <View key={i} style={[styles.row, i === 11 && styles.lastRow]}>
                <Text style={styles.name}>{`البيت ${i + 1}`}</Text>
                <Text style={styles.value}>{formatLongitude(c)}</Text>
              </View>
            ))}
          </View>
          {houses.fallbackUsed ? (
            <Text style={styles.note}>
              نظام البيوت المختار لا يعمل عند هذا العرض الجغرافي، فاستُخدم نظام
              بورفيري بدلاً منه.
            </Text>
          ) : null}
        </>
      ) : null}

      <Button label="رجوع" kind="secondary" onPress={onBack} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 20, gap: 14 },
  subtitle: { color: colors.muted, fontSize: 14, textAlign: 'right' },
  note: { color: colors.gold, fontSize: 13, textAlign: 'right' },
  section: {
    color: colors.muted,
    fontSize: 13,
    textAlign: 'right',
    marginTop: 6,
  },
  card: {
    backgroundColor: colors.navyRaised,
    borderColor: colors.line,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 14,
    paddingHorizontal: 16,
  },
  row: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomColor: colors.line,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  lastRow: { borderBottomWidth: 0 },
  name: { color: colors.text, fontSize: 16 },
  value: { color: colors.text, fontSize: 16, fontVariant: ['tabular-nums'] },
  retro: { color: colors.gold, fontSize: 13 },
  house: { color: colors.muted, fontSize: 13 },
});
