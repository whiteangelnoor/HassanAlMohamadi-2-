/**
 * Engine check screen: installs nothing itself, it receives the on-device
 * ephemeris directory from the native side, initializes the engine and shows
 * the current sky for Baghdad. Proves the full native path works on a phone.
 * AGPL-3.0-or-later.
 *
 * @format
 */

import { useMemo } from 'react';
import {
  I18nManager,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

import { AstroEngine, BodyKey, ChartResult } from './src/astro/engine';

I18nManager.allowRTL(true);

const colors = {
  navy: '#0B1530',
  navyRaised: '#14213F',
  line: '#24335A',
  text: '#E8ECF5',
  muted: '#8E9AB8',
  gold: '#C9A54C',
  error: '#E07A6F',
};

const SIGNS = [
  'الحمل',
  'الثور',
  'الجوزاء',
  'السرطان',
  'الأسد',
  'العذراء',
  'الميزان',
  'العقرب',
  'القوس',
  'الجدي',
  'الدلو',
  'الحوت',
];

const BODIES: { key: BodyKey; name: string }[] = [
  { key: 'sun', name: 'الشمس' },
  { key: 'moon', name: 'القمر' },
  { key: 'mercury', name: 'عطارد' },
  { key: 'venus', name: 'الزهرة' },
  { key: 'mars', name: 'المريخ' },
  { key: 'jupiter', name: 'المشتري' },
  { key: 'saturn', name: 'زحل' },
  { key: 'uranus', name: 'أورانوس' },
  { key: 'neptune', name: 'نبتون' },
  { key: 'pluto', name: 'بلوتو' },
  { key: 'trueNode', name: 'العقدة الشمالية' },
  { key: 'chiron', name: 'كيرون' },
];

type Props = { ephePath?: string; ephemerisError?: string };

type CheckResult =
  | { ok: true; version: string; chart: ChartResult; at: Date }
  | { ok: false; message: string };

function runCheck(props: Props): CheckResult {
  if (!props.ephePath) {
    return {
      ok: false,
      message: props.ephemerisError ?? 'لم يصل مسار ملفات الجداول من النظام.',
    };
  }
  try {
    const init = AstroEngine.initialize(props.ephePath);
    const at = new Date();
    const chart = AstroEngine.chart({
      time: {
        utc: {
          year: at.getUTCFullYear(),
          month: at.getUTCMonth() + 1,
          day: at.getUTCDate(),
          hour: at.getUTCHours(),
          minute: at.getUTCMinutes(),
          second: at.getUTCSeconds(),
        },
      },
      location: { lat: 33.3152, lon: 44.3661 },
      houseSystem: 'P',
      bodies: BODIES.map(b => b.key),
    });
    return { ok: true, version: init.version, chart, at };
  } catch (e) {
    return { ok: false, message: String(e) };
  }
}

function formatDegree(degree: number): string {
  const d = Math.floor(degree);
  const m = Math.floor((degree - d) * 60);
  return `${d}° ${String(m).padStart(2, '0')}′`;
}

function App(props: Props) {
  const result = useMemo(() => runCheck(props), [props]);

  return (
    <SafeAreaProvider>
      <StatusBar barStyle="light-content" />
      <SafeAreaView style={styles.screen}>
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.title}>فحص المحرّك</Text>
          {result.ok ? (
            <ChartView result={result} />
          ) : (
            <ErrorView message={result.message} />
          )}
        </ScrollView>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

function ChartView({ result }: { result: Extract<CheckResult, { ok: true }> }) {
  const names = new Map(BODIES.map(b => [b.key, b.name]));
  const houses = result.chart.houses;
  return (
    <>
      <Text style={styles.subtitle}>
        السماء الآن فوق بغداد ·{' '}
        {result.at.toISOString().slice(0, 16).replace('T', ' ')} بالتوقيت
        العالمي
      </Text>
      <View style={styles.card}>
        {result.chart.bodies.map(b => (
          <View key={b.key} style={styles.row}>
            <Text style={styles.bodyName}>{names.get(b.key) ?? b.key}</Text>
            <Text style={styles.position}>
              {formatDegree(b.sign.degree)} {SIGNS[b.sign.index]}
              {b.retrograde ? <Text style={styles.retro}> متراجع</Text> : null}
            </Text>
          </View>
        ))}
      </View>
      {houses ? (
        <View style={styles.card}>
          <View style={styles.row}>
            <Text style={styles.bodyName}>الطالع</Text>
            <Text style={styles.position}>
              {formatDegree(houses.asc % 30)}{' '}
              {SIGNS[Math.floor(houses.asc / 30)]}
            </Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.bodyName}>وسط السماء</Text>
            <Text style={styles.position}>
              {formatDegree(houses.mc % 30)} {SIGNS[Math.floor(houses.mc / 30)]}
            </Text>
          </View>
        </View>
      ) : null}
      <Text style={styles.footer}>المكتبة السويسرية {result.version}</Text>
      {result.chart.warnings.map(w => (
        <Text key={w} style={styles.footer}>
          {w}
        </Text>
      ))}
    </>
  );
}

function ErrorView({ message }: { message: string }) {
  return (
    <View style={styles.card}>
      <Text style={styles.errorTitle}>المحرّك لم يعمل</Text>
      <Text style={styles.errorText}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.navy },
  content: { padding: 20, gap: 16 },
  title: {
    color: colors.gold,
    fontSize: 26,
    fontWeight: '600',
    textAlign: 'right',
  },
  subtitle: { color: colors.muted, fontSize: 14, textAlign: 'right' },
  card: {
    backgroundColor: colors.navyRaised,
    borderColor: colors.line,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 6,
  },
  row: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomColor: colors.line,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  bodyName: { color: colors.text, fontSize: 16 },
  position: { color: colors.text, fontSize: 16, fontVariant: ['tabular-nums'] },
  retro: { color: colors.gold, fontSize: 13 },
  footer: { color: colors.muted, fontSize: 12, textAlign: 'center' },
  errorTitle: {
    color: colors.error,
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'right',
    paddingTop: 10,
  },
  errorText: {
    color: colors.text,
    fontSize: 14,
    textAlign: 'right',
    paddingVertical: 10,
  },
});

export default App;
