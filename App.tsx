/**
 * Root: initializes the engine with the ephemeris directory handed over by the
 * native side, then navigates a stack of screens (home, birth form, chart,
 * transits, predictive, calendar); the back button pops one level.
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
import { CalendarScreen } from './src/ui/CalendarScreen';
import { ChartInfo, ChartScreen } from './src/ui/ChartScreen';
import { Natal, PredictiveScreen } from './src/ui/PredictiveScreen';
import { TransitScreen } from './src/ui/TransitScreen';
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
  | { kind: 'calendar' }
  // `place` is set for birth charts, which offer transits and predictive.
  | { kind: 'chart'; make: ChartMaker; info: ChartInfo; place?: Place }
  | { kind: 'transits'; natal: Natal }
  | { kind: 'predictive'; natal: Natal };
type Place = { lat: number; lon: number };

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
  const [stack, setStack] = useState<Screen[]>([{ kind: 'home' }]);
  const screen = stack[stack.length - 1];
  const [error, setError] = useState<string | null>(null);
  // Kept for the whole session and used for every new chart.
  const [houseSystem, setHouseSystem] = useState('P');

  const push = (s: Screen) => setStack(st => [...st, s]);
  const replace = (s: Screen) => setStack(st => [...st.slice(0, -1), s]);
  const back = () => setStack(st => (st.length > 1 ? st.slice(0, -1) : st));
  const home = () => setStack([{ kind: 'home' }]);

  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (stack.length <= 1) {
        return false;
      }
      back();
      return true;
    });
    return () => sub.remove();
  }, [stack]);

  /** Opens a chart; `how` replaces the current screen or pushes a new one. */
  const openChart = (
    make: ChartMaker,
    how: 'push' | 'replace',
    place?: Place,
    system = houseSystem,
  ) => {
    try {
      setError(null);
      const s: Screen = { kind: 'chart', make, info: make(system), place };
      how === 'push' ? push(s) : replace(s);
    } catch (e) {
      setError(String(e));
      home();
    }
  };

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
        onBack={back}
        onSubmit={data =>
          openChart(hs => birthChart(data, hs), 'replace', {
            lat: data.city.lat,
            lon: data.city.lon,
          })
        }
      />
    );
  } else if (screen.kind === 'chart') {
    const { make, place, info } = screen;
    const natal: Natal | undefined = place
      ? { chart: info.chart, lat: place.lat, lon: place.lon, title: info.title }
      : undefined;
    body = (
      <ChartScreen
        info={info}
        houseSystem={houseSystem}
        onHouseSystem={code => {
          setHouseSystem(code);
          openChart(make, 'replace', place, code);
        }}
        onTransits={natal ? () => push({ kind: 'transits', natal }) : undefined}
        onPredictive={
          natal ? () => push({ kind: 'predictive', natal }) : undefined
        }
        onBack={back}
      />
    );
  } else if (screen.kind === 'transits') {
    body = (
      <TransitScreen
        natal={screen.natal.chart}
        title={screen.natal.title}
        onBack={back}
      />
    );
  } else if (screen.kind === 'predictive') {
    body = (
      <PredictiveScreen
        natal={screen.natal}
        onOpenChart={make => openChart(make, 'push')}
        onBack={back}
      />
    );
  } else if (screen.kind === 'calendar') {
    body = <CalendarScreen onBack={back} />;
  } else {
    body = (
      <View style={styles.content}>
        <Header title="فلك" />
        <View style={styles.actions}>
          <Button label="خريطة جديدة" onPress={() => push({ kind: 'form' })} />
          <Button
            label="السماء الآن"
            kind="secondary"
            onPress={() => {
              const at = new Date();
              openChart(hs => skyNow(at, hs), 'push');
            }}
          />
          <Button
            label="التقويم الفلكي"
            kind="secondary"
            onPress={() => push({ kind: 'calendar' })}
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
