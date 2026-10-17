/**
 * Root: initializes the engine with the ephemeris directory handed over by the
 * native side, loads the saved settings and charts, then navigates a stack of
 * screens; the back button pops one level.
 * AGPL-3.0-or-later.
 *
 * @format
 */

import { useEffect, useMemo, useState } from 'react';
import {
  BackHandler,
  I18nManager,
  Linking,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

import { AstroEngine } from './src/astro/engine';
import { setAspectSettings } from './src/astro/traditional';
import { hourReminders } from './src/spiritual/reminders';
import { MANSION_TRAITS } from './src/astro/mansionTraits';
import { BUILD } from './src/buildInfo';
import { cityLabel } from './src/geo/cities';
import {
  deleteChart,
  loadCharts,
  loadSettings,
  printHtml,
  SavedChart,
  saveChart,
  saveSettings,
  scheduleReminders,
  Settings,
} from './src/store';
import { localToUtc } from './src/time/tz';
import { BirthData, BirthForm, describeConversion } from './src/ui/BirthForm';
import { CalendarScreen } from './src/ui/CalendarScreen';
import { ChartInfo, ChartScreen } from './src/ui/ChartScreen';
import { chartReportHtml } from './src/ui/pdf';
import { Natal, PredictiveScreen } from './src/ui/PredictiveScreen';
import { SavedList } from './src/ui/SavedList';
import { ArabicScreen } from './src/ui/ArabicScreen';
import { SpiritualPage, SpiritualScreen } from './src/ui/SpiritualScreen';
import { SpiritualSignScreen } from './src/ui/SpiritualSignScreen';
import { NameMatchScreen } from './src/ui/NameMatchScreen';
import { ElectionScreen } from './src/ui/ElectionScreen';
import { HoraryScreen } from './src/ui/HoraryScreen';
import { TodayCard } from './src/ui/TodayCard';
import {
  DEFAULT_PLACE,
  PlanetaryHoursScreen,
} from './src/ui/PlanetaryHoursScreen';
import { MANSIONS, mansionOf, mansionOptions } from './src/astro/mansions';
import { SettingsScreen, zodiacName } from './src/ui/SettingsScreen';
import { SynastryScreen } from './src/ui/SynastryScreen';
import { TransitScreen } from './src/ui/TransitScreen';
import { chartBodies, colors, FONT, formatDateTime } from './src/ui/theme';
import { Button, Header } from './src/ui/widgets';

// Layout is written right-to-left explicitly; keep it identical whatever the
// phone language is.
I18nManager.allowRTL(false);

type Props = {
  ephePath?: string;
  ephemerisError?: string;
  build?: number;
  apkUpdateUrl?: string;
};

/** Builds a chart with the current settings, so a change can recompute it. */
type ChartMaker = (settings: Settings) => ChartInfo;

type Screen =
  | { kind: 'home' }
  | { kind: 'form' }
  | { kind: 'calendar' }
  | { kind: 'settings' }
  | { kind: 'arabic' }
  | { kind: 'horary' }
  | { kind: 'spiritual' }
  | { kind: 'spiritualPage'; page: SpiritualPage }
  // `birth` is set for birth charts, which offer transits, synastry, saving.
  | {
      kind: 'chart';
      make: ChartMaker;
      info: ChartInfo;
      birth?: BirthData;
      savedId?: string;
    }
  | { kind: 'transits'; natal: Natal }
  | { kind: 'predictive'; natal: Natal }
  | { kind: 'partner'; birth: BirthData; info: ChartInfo }
  | {
      kind: 'synastry';
      a: { name: string; info: ChartInfo };
      b: { name: string; info: ChartInfo };
    };

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

/** Pushes the settings into the engine and the aspect finder. */
function applySettings(s: Settings) {
  AstroEngine.setDefaults({
    zodiac:
      s.zodiac.type === 'sidereal'
        ? { type: 'sidereal', ayanamsa: s.zodiac.ayanamsa }
        : { type: 'tropical' },
  });
  setAspectSettings({ orbs: s.orbs, minor: s.minorAspects });
}

/** "القمر في منزلة ..." for a chart moment, in the chosen mansion frame. */
function moonMansionLine(jdUt: number, s: Settings): string {
  try {
    const moon = AstroEngine.chart({
      ...mansionOptions(s.mansions),
      time: { jdUt },
      bodies: ['moon'],
    }).bodies[0];
    const i = mansionOf(moon.lon);
    return `القمر في منزلة ${MANSIONS[i]} (${MANSION_TRAITS[i].nature})`;
  } catch {
    return '';
  }
}

function birthChart(data: BirthData, s: Settings): ChartInfo {
  const { city, conversion: c } = data;
  const chart = AstroEngine.chart({
    time: { utc: c.utc },
    // Without a birth time there is no Ascendant, so no houses either.
    location: data.timeUnknown ? undefined : { lat: city.lat, lon: city.lon },
    houseSystem: s.houseSystem,
    bodies: chartBodies(s.points),
  });
  return {
    title: data.name || 'خريطة الولادة',
    lines: [
      `${cityLabel(city)} · ${city.countryName}`,
      data.timeUnknown
        ? `${data.local.year}/${data.local.month}/${data.local.day} · وقت الولادة غير معروف (حُسبت لمنتصف النهار)`
        : `بالتوقيت المحلي: ${formatDateTime(data.local)}`,
      `بالتوقيت العالمي: ${formatDateTime(c.utc)}`,
      `دائرة البروج: ${zodiacName(s)}`,
      moonMansionLine(chart.jdUt, s),
    ].filter(Boolean),
    notes: describeConversion(c).slice(1).concat(chart.warnings),
    chart,
  };
}

function skyNow(at: Date, s: Settings): ChartInfo {
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
    houseSystem: s.houseSystem,
    bodies: chartBodies(s.points),
  });
  return {
    title: 'السماء الآن',
    lines: [
      'فوق بغداد',
      `بالتوقيت العالمي: ${formatDateTime(utc)}`,
      `دائرة البروج: ${zodiacName(s)}`,
      moonMansionLine(chart.jdUt, s),
    ].filter(Boolean),
    notes: chart.warnings,
    chart,
  };
}

function birthFromSaved(c: SavedChart): BirthData {
  return {
    name: c.name,
    local: c.local,
    timeUnknown: c.timeUnknown,
    city: {
      name: c.place.name,
      arabicName: c.place.name,
      country: '',
      countryName: c.place.country,
      lat: c.place.lat,
      lon: c.place.lon,
      timeZone: c.place.timeZone,
      population: 0,
    },
    conversion: localToUtc(c.local, c.place.timeZone, c.place.lon),
  };
}

function App(props: Props) {
  const engine = useMemo(() => initEngine(props), [props]);
  const [settings, setSettings] = useState<Settings>(() => {
    const s = loadSettings();
    applySettings(s);
    return s;
  });
  const [charts, setCharts] = useState<SavedChart[]>(() => loadCharts());
  const [stack, setStack] = useState<Screen[]>([{ kind: 'home' }]);
  const screen = stack[stack.length - 1];
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const push = (s: Screen) => setStack(st => [...st, s]);
  const replace = (s: Screen) => setStack(st => [...st.slice(0, -1), s]);
  const back = () => {
    setMessage(null);
    setStack(st => (st.length > 1 ? st.slice(0, -1) : st));
  };
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

  // Reminders for the chosen spiritual hours: the next ten days, refreshed
  // at every start and whenever the choice or the city changes.
  const alerts = settings.hourAlerts;
  const alertPlace = settings.place ?? DEFAULT_PLACE;
  useEffect(() => {
    if (!engine.ok) {
      return;
    }
    const id = setTimeout(() => {
      try {
        scheduleReminders(
          hourReminders(
            alerts.planets,
            alerts.lead,
            alertPlace,
            Date.now(),
            10,
          ),
        );
      } catch {
        // the reminders keep their last schedule
      }
    }, 1500);
    return () => clearTimeout(id);
  }, [engine.ok, alerts, alertPlace]);

  const fail = (e: unknown) => {
    setError(String(e));
    home();
  };

  const chartScreen = (
    make: ChartMaker,
    s: Settings,
    birth?: BirthData,
    savedId?: string,
  ): Screen => ({ kind: 'chart', make, info: make(s), birth, savedId });

  const openChart = (
    make: ChartMaker,
    how: 'push' | 'replace',
    birth?: BirthData,
    savedId?: string,
  ) => {
    try {
      setError(null);
      setMessage(null);
      const s = chartScreen(make, settings, birth, savedId);
      how === 'push' ? push(s) : replace(s);
    } catch (e) {
      fail(e);
    }
  };

  /** New settings: saved, applied, and every open chart recomputed. */
  const changeSettings = (s: Settings) => {
    saveSettings(s);
    applySettings(s);
    setSettings(s);
    try {
      setStack(st =>
        st.map(x =>
          x.kind === 'chart' ? chartScreen(x.make, s, x.birth, x.savedId) : x,
        ),
      );
    } catch (e) {
      fail(e);
    }
  };

  const exportPdf = async (info: ChartInfo) => {
    try {
      await printHtml(chartReportHtml(info, settings.houseSystem), info.title);
    } catch (e) {
      setMessage(e instanceof Error ? e.message : String(e));
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
        onSubmit={data => openChart(s => birthChart(data, s), 'replace', data)}
      />
    );
  } else if (screen.kind === 'chart') {
    const { info, birth, savedId } = screen;
    const natal: Natal | undefined = birth
      ? {
          chart: info.chart,
          lat: birth.city.lat,
          lon: birth.city.lon,
          title: info.title,
        }
      : undefined;
    const actions: { label: string; onPress: () => void }[] = [];
    if (natal && birth) {
      actions.push({
        label: 'العبور',
        onPress: () => push({ kind: 'transits', natal }),
      });
      if (info.chart.houses) {
        actions.push({
          label: 'التحويلات',
          onPress: () => push({ kind: 'predictive', natal }),
        });
      }
      actions.push({
        label: 'التوافق',
        onPress: () => push({ kind: 'partner', birth, info }),
      });
      if (!savedId) {
        actions.push({
          label: 'حفظ',
          onPress: () => {
            const entry = saveChart({
              name: birth.name || 'بلا اسم',
              local: birth.local,
              timeUnknown: birth.timeUnknown,
              place: {
                name: cityLabel(birth.city),
                country: birth.city.countryName,
                lat: birth.city.lat,
                lon: birth.city.lon,
                timeZone: birth.city.timeZone,
              },
            });
            setCharts(loadCharts());
            replace({ ...screen, savedId: entry.id });
            setMessage('حُفظت الخريطة.');
          },
        });
      }
    }
    actions.push({ label: 'PDF', onPress: () => exportPdf(info) });
    body = (
      <>
        <ChartScreen
          info={info}
          houseSystem={settings.houseSystem}
          onHouseSystem={code =>
            changeSettings({ ...settings, houseSystem: code })
          }
          actions={actions}
          onBack={back}
        />
        {message ? <Text style={styles.toast}>{message}</Text> : null}
      </>
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
  } else if (screen.kind === 'spiritual') {
    body = (
      <SpiritualScreen
        onOpen={page => push({ kind: 'spiritualPage', page })}
        onBack={back}
      />
    );
  } else if (screen.kind === 'spiritualPage') {
    const place = settings.place ?? DEFAULT_PLACE;
    body =
      screen.page === 'sign' ? (
        <SpiritualSignScreen onBack={back} />
      ) : screen.page === 'match' ? (
        <NameMatchScreen onBack={back} />
      ) : screen.page === 'election' ? (
        <ElectionScreen
          place={place}
          method={settings.mansions}
          onBack={back}
        />
      ) : (
        <PlanetaryHoursScreen
          place={place}
          onPlace={p => changeSettings({ ...settings, place: p })}
          onBack={back}
        />
      );
  } else if (screen.kind === 'horary') {
    body = (
      <HoraryScreen place={settings.place ?? DEFAULT_PLACE} onBack={back} />
    );
  } else if (screen.kind === 'arabic') {
    body = (
      <ArabicScreen
        method={settings.mansions}
        onMethod={m => changeSettings({ ...settings, mansions: m })}
        hijri={settings.hijri}
        onHijri={h => changeSettings({ ...settings, hijri: h })}
        onBack={back}
      />
    );
  } else if (screen.kind === 'settings') {
    body = (
      <SettingsScreen
        settings={settings}
        onChange={changeSettings}
        onBack={back}
      />
    );
  } else if (screen.kind === 'partner') {
    const { birth, info } = screen;
    body = (
      <ScrollView contentContainerStyle={styles.content}>
        <Header title="التوافق مع…" onBack={back} />
        <Text
          style={styles.text}
        >{`اختر شخصاً من الخرائط المحفوظة لمقارنته مع ${info.title}.`}</Text>
        <SavedList
          charts={charts}
          onOpen={c => {
            try {
              const other = birthFromSaved(c);
              replace({
                kind: 'synastry',
                a: { name: birth.name || info.title, info },
                b: { name: c.name, info: birthChart(other, settings) },
              });
            } catch (e) {
              fail(e);
            }
          }}
        />
        {charts.length === 0 ? (
          <Text style={styles.text}>
            لا توجد خرائط محفوظة بعد. احفظ خريطة الشخص الآخر أولاً.
          </Text>
        ) : null}
      </ScrollView>
    );
  } else if (screen.kind === 'synastry') {
    body = (
      <SynastryScreen
        a={{ name: screen.a.name, chart: screen.a.info.chart }}
        b={{ name: screen.b.name, chart: screen.b.info.chart }}
        onBack={back}
      />
    );
  } else {
    body = (
      <ScrollView contentContainerStyle={styles.content}>
        <Header title="فلك" />
        {engine.ok ? (
          <TodayCard
            place={settings.place ?? DEFAULT_PLACE}
            method={settings.mansions}
          />
        ) : null}
        <View style={styles.actions}>
          <Button label="خريطة جديدة" onPress={() => push({ kind: 'form' })} />
          <Button
            label="السماء الآن"
            kind="secondary"
            onPress={() => {
              const at = new Date();
              openChart(s => skyNow(at, s), 'push');
            }}
          />
          <Button
            label="التقويم الفلكي"
            kind="secondary"
            onPress={() => push({ kind: 'calendar' })}
          />
          <Button
            label="علم المسائل (التنجيم الساعي)"
            kind="secondary"
            onPress={() => push({ kind: 'horary' })}
          />
          <Button
            label="القسم العربي ومنازل القمر"
            kind="secondary"
            onPress={() => push({ kind: 'arabic' })}
          />
          <Button
            label="القسم الروحاني"
            kind="secondary"
            onPress={() => push({ kind: 'spiritual' })}
          />
          <Button
            label="الإعدادات"
            kind="secondary"
            onPress={() => push({ kind: 'settings' })}
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
        {charts.length ? (
          <Text style={styles.section}>الخرائط المحفوظة</Text>
        ) : null}
        <SavedList
          charts={charts}
          onOpen={c => {
            try {
              const data = birthFromSaved(c);
              openChart(s => birthChart(data, s), 'push', data, c.id);
            } catch (e) {
              fail(e);
            }
          }}
          onDelete={c => {
            deleteChart(c.id);
            setCharts(loadCharts());
          }}
        />
        {charts.length ? (
          <Text style={styles.hint}>اضغط مطولاً على خريطة لحذفها.</Text>
        ) : null}
        <Text style={styles.footer}>
          {`النسخة ${BUILD || props.build || 0} · المكتبة السويسرية ${
            engine.version
          }`}
        </Text>
      </ScrollView>
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
  content: { padding: 20, gap: 16, flexGrow: 1 },
  actions: { gap: 12, marginTop: 12 },
  text: {
    fontFamily: FONT,
    color: colors.text,
    fontSize: 15,
    textAlign: 'right',
    lineHeight: 24,
  },
  section: {
    fontFamily: FONT,
    color: colors.muted,
    fontSize: 13,
    textAlign: 'right',
    marginTop: 8,
  },
  hint: {
    fontFamily: FONT,
    color: colors.muted,
    fontSize: 12,
    textAlign: 'right',
  },
  errorTitle: {
    fontFamily: FONT,
    color: colors.error,
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'right',
  },
  error: {
    fontFamily: FONT,
    color: colors.error,
    fontSize: 14,
    textAlign: 'right',
  },
  update: {
    gap: 10,
    borderColor: colors.gold,
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
  },
  toast: {
    fontFamily: FONT,
    position: 'absolute',
    bottom: 24,
    left: 24,
    right: 24,
    backgroundColor: colors.navyRaised,
    borderColor: colors.gold,
    borderWidth: 1,
    borderRadius: 12,
    color: colors.text,
    textAlign: 'center',
    padding: 12,
    fontSize: 14,
  },
  footer: {
    fontFamily: FONT,
    color: colors.muted,
    fontSize: 12,
    textAlign: 'center',
    marginTop: 'auto',
    paddingTop: 16,
  },
});

export default App;
