/**
 * Root: initializes the engine with the ephemeris directory handed over by the
 * native side, then switches between the home, birth form and chart screens.
 * AGPL-3.0-or-later.
 *
 * @format
 */

import { useEffect, useMemo, useState } from 'react';
import {
  BackHandler,
  I18nManager,
  Linking,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

import { AstroEngine } from './src/astro/engine';
import { BirthData, BirthForm, describeConversion } from './src/ui/BirthForm';
import { ChartInfo, ChartScreen } from './src/ui/ChartScreen';
import { BODIES, colors, formatDateTime } from './src/ui/theme';
import { Button, Header } from './src/ui/widgets';
import { cityLabel } from './src/geo/cities';
import { BUILD } from './src/buildInfo';

// Layout is written right-to-left explicitly; keep it identical whatever the
// phone language is.
I18nManager.allowRTL(false);

type Props = {
  ephePath?: string;
  ephemerisError?: string;
  build?: number;
  apkUpdateUrl?: string;
};
type Screen =
  | { kind: 'home' }
  | { kind: 'form' }
  | { kind: 'chart'; make: ChartMaker; info: ChartInfo };

/** Builds a chart for a house system, so the system can be switched live. */
type ChartMaker = (houseSystem: string) => ChartInfo;

const BAGHDAD = { lat: 33.3152, lon: 44.3661 };

function initEngine(
  props: Props,
): { ok: true; version: string } | { ok: false; message: string } {
  if (!props.ephePath) {
    return {
      ok: false,
      message: props.ephemerisError ?? 'لم يصل مسار ملفات الجداول من النظام.',
    };
  }
  try {
    return {
      ok: true,
      version: AstroEngine.initialize(props.ephePath).version,
    };
  } catch (e) {
    return { ok: false, message: String(e) };
  }
}

function birthChart(data: BirthData, houseSystem: string): ChartInfo {
  const { city, conversion: c } = data;
  const chart = AstroEngine.chart({
    time: { utc: c.utc },
    location: { lat: city.lat, lon: city.lon },
    houseSystem,
    bodies: BODIES.map(b => b.key),
  });
  return {
    title: data.name || 'خريطة الولادة',
    lines: [
      `${cityLabel(city)} · ${city.countryName}`,
      `بالتوقيت المحلي: ${formatDateTime(data.local)}`,
      `بالتوقيت العالمي: ${formatDateTime(c.utc)}`,
    ],
    notes: describeConversion(c).slice(1).concat(chart.warnings),
    chart,
  };
}

function skyNow(at: Date, houseSystem: string): ChartInfo {
  const utc = {
    year: at.getUTCFullYear(),
    month: at.getUTCMonth() + 1,
    day: at.getUTCDate(),
    hour: at.getUTCHours(),
    minute: at.getUTCMinutes(),
    second: at.getUTCSeconds(),
  };
  const chart = AstroEngine.chart({
    time: { utc },
    location: BAGHDAD,
    houseSystem,
    bodies: BODIES.map(b => b.key),
  });
  return {
    title: 'السماء الآن',
    lines: ['فوق بغداد', `بالتوقيت العالمي: ${formatDateTime(utc)}`],
    notes: chart.warnings,
    chart,
  };
}

function App(props: Props) {
  const engine = useMemo(() => initEngine(props), [props]);
  const [screen, setScreen] = useState<Screen>({ kind: 'home' });
  const [error, setError] = useState<string | null>(null);
  // Kept for the whole session and used for every new chart.
  const [houseSystem, setHouseSystem] = useState('P');

  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (screen.kind === 'home') {
        return false;
      }
      setScreen({ kind: 'home' });
      return true;
    });
    return () => sub.remove();
  }, [screen]);

  const show = (make: ChartMaker, system = houseSystem) => {
    try {
      setError(null);
      setScreen({ kind: 'chart', make, info: make(system) });
    } catch (e) {
      setError(String(e));
      setScreen({ kind: 'home' });
    }
  };
  const home = () => setScreen({ kind: 'home' });

  let body;
  if (!engine.ok) {
    body = (
      <View style={styles.content}>
        <Header title="فلك" />
        <Text style={styles.errorTitle}>المحرّك لم يعمل</Text>
        <Text style={styles.text}>{engine.message}</Text>
      </View>
    );
  } else if (screen.kind === 'form') {
    body = (
      <BirthForm
        onBack={home}
        onSubmit={data => show(hs => birthChart(data, hs))}
      />
    );
  } else if (screen.kind === 'chart') {
    const { make } = screen;
    body = (
      <ChartScreen
        info={screen.info}
        houseSystem={houseSystem}
        onHouseSystem={code => {
          setHouseSystem(code);
          show(make, code);
        }}
        onBack={home}
      />
    );
  } else {
    body = (
      <View style={styles.content}>
        <Header title="فلك" />
        <View style={styles.actions}>
          <Button
            label="خريطة جديدة"
            onPress={() => setScreen({ kind: 'form' })}
          />
          <Button
            label="السماء الآن"
            kind="secondary"
            onPress={() => {
              const at = new Date();
              show(hs => skyNow(at, hs));
            }}
          />
        </View>
        {error ? <Text style={styles.error}>{error}</Text> : null}
        {props.apkUpdateUrl ? (
          <View style={styles.update}>
            <Text style={styles.text}>
              صدرت نسخة جديدة من التطبيق تحتاج تثبيتاً. نزّلها ثم افتح الملف.
            </Text>
            <Button
              label="تنزيل النسخة الجديدة"
              onPress={() => Linking.openURL(props.apkUpdateUrl!)}
            />
          </View>
        ) : null}
        <Text style={styles.footer}>
          {`النسخة ${BUILD || props.build || 0} · المكتبة السويسرية ${
            engine.version
          }`}
        </Text>
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <StatusBar barStyle="light-content" />
      <SafeAreaView style={styles.screen}>{body}</SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.navy },
  content: { padding: 20, gap: 16, flex: 1 },
  actions: { gap: 12, marginTop: 12 },
  text: {
    color: colors.text,
    fontSize: 15,
    textAlign: 'right',
    lineHeight: 24,
  },
  errorTitle: {
    color: colors.error,
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'right',
  },
  error: { color: colors.error, fontSize: 14, textAlign: 'right' },
  update: {
    gap: 10,
    borderColor: colors.gold,
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
  },
  footer: {
    color: colors.muted,
    fontSize: 12,
    textAlign: 'center',
    marginTop: 'auto',
  },
});

export default App;
