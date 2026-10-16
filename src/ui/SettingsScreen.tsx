// Settings: zodiac, house system, aspect orbs, minor aspects, points, and
// reminders for the spiritual hours.
// Saved on the phone and applied to every chart. AGPL-3.0-or-later.

import { useEffect, useState } from 'react';
import {
  AppState,
  PermissionsAndroid,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { Planet } from '../astro/traditional';
import {
  DEFAULT_SETTINGS,
  exactAlarmsAllowed,
  openExactAlarmSettings,
  persistent,
  remindersSupported,
  Settings,
} from '../store';
import { HOUSE_SYSTEMS } from './houseSystems';
import { Card, Hint, Section, Stepper, Toggle } from './list';
import { DEFAULT_PLACE } from './PlanetaryHoursScreen';
import { ASPECT_NAMES, colors, FONT, POINT_NAMES } from './theme';
import { Button, Header } from './widgets';

/** The usual sidereal options first; ids are the Swiss Ephemeris ones. */
export const AYANAMSAS: { id: number; name: string }[] = [
  { id: 1, name: 'لاهيري' },
  { id: 0, name: 'فاغان وبرادلي' },
  { id: 3, name: 'رامان' },
  { id: 5, name: 'كريشنامورتي' },
  { id: 27, name: 'تشيترا الحقيقية' },
  { id: 7, name: 'يوكتيشوار' },
  { id: 17, name: 'مركز المجرة عند صفر القوس' },
];

export function zodiacName(s: Settings): string {
  if (s.zodiac.type === 'tropical') {
    return 'الاستوائية';
  }
  const a = AYANAMSAS.find(x => x.id === s.zodiac.ayanamsa);
  return `النجمية · ${a ? a.name : s.zodiac.ayanamsa}`;
}

/** Weekday order: the Sun's day first. */
const HOUR_PLANETS: Planet[] = [
  'sun',
  'moon',
  'mars',
  'mercury',
  'jupiter',
  'venus',
  'saturn',
];
const LEADS = [0, 5, 10, 15];

/** Asks for the notification permission where the phone requires it. */
async function allowNotifications(): Promise<boolean> {
  if (Platform.OS !== 'android' || Number(Platform.Version) < 33) {
    return true;
  }
  const r = await PermissionsAndroid.request(
    'android.permission.POST_NOTIFICATIONS',
  );
  return r === PermissionsAndroid.RESULTS.GRANTED;
}

const ORB_KINDS = ['conjunction', 'opposition', 'trine', 'square', 'sextile'];
const MINOR_KINDS = ['quincunx', 'semisextile', 'semisquare', 'sesquiquadrate'];

export function SettingsScreen({
  settings,
  onChange,
  onBack,
}: {
  settings: Settings;
  onChange: (s: Settings) => void;
  onBack: () => void;
}) {
  const set = (patch: Partial<Settings>) => onChange({ ...settings, ...patch });
  const [exact, setExact] = useState(exactAlarmsAllowed);
  const [denied, setDenied] = useState(false);
  useEffect(() => {
    const sub = AppState.addEventListener('change', st => {
      if (st === 'active') {
        setExact(exactAlarmsAllowed());
      }
    });
    return () => sub.remove();
  }, []);
  const alerts = settings.hourAlerts;
  const setPlanet = async (p: Planet, on: boolean) => {
    if (on) {
      const ok = await allowNotifications();
      setDenied(!ok);
      if (!ok) {
        return;
      }
    }
    set({
      hourAlerts: {
        ...alerts,
        planets: on
          ? [...alerts.planets.filter(x => x !== p), p]
          : alerts.planets.filter(x => x !== p),
      },
    });
  };
  const orb = (kind: string, delta: number) =>
    set({
      orbs: {
        ...settings.orbs,
        [kind]: Math.min(15, Math.max(0, (settings.orbs[kind] ?? 0) + delta)),
      },
    });

  const option = (
    label: string,
    active: boolean,
    onPress: () => void,
    last = false,
  ) => (
    <Pressable
      key={label}
      onPress={onPress}
      style={({ pressed }) => [
        styles.option,
        last && styles.last,
        pressed && styles.pressed,
      ]}
    >
      <Text style={[styles.optionText, active && styles.active]}>{label}</Text>
      {active ? <Text style={styles.active}>✓</Text> : null}
    </Pressable>
  );

  const orbRow = (kind: string) => (
    <View key={kind} style={styles.orbRow}>
      <Text style={styles.optionText}>{ASPECT_NAMES[kind]}</Text>
      <View style={styles.orbControls}>
        <Pressable
          onPress={() => orb(kind, -0.5)}
          style={styles.orbBtn}
          hitSlop={6}
        >
          <Text style={styles.orbBtnText}>−</Text>
        </Pressable>
        <Text style={styles.orbValue}>{`${settings.orbs[kind] ?? 0}°`}</Text>
        <Pressable
          onPress={() => orb(kind, 0.5)}
          style={styles.orbBtn}
          hitSlop={6}
        >
          <Text style={styles.orbBtnText}>+</Text>
        </Pressable>
      </View>
    </View>
  );

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Header title="الإعدادات" onBack={onBack} />
      {persistent ? null : (
        <Hint>
          هذه النسخة لا تحفظ الإعدادات بعد إغلاق التطبيق. ثبّت النسخة الأحدث.
        </Hint>
      )}

      <Section title="دائرة البروج" />
      <Stepper
        items={[
          {
            label: 'الاستوائية',
            active: settings.zodiac.type === 'tropical',
            onPress: () =>
              set({ zodiac: { ...settings.zodiac, type: 'tropical' } }),
          },
          {
            label: 'النجمية',
            active: settings.zodiac.type === 'sidereal',
            onPress: () =>
              set({ zodiac: { ...settings.zodiac, type: 'sidereal' } }),
          },
        ]}
      />
      {settings.zodiac.type === 'sidereal' ? (
        <Card>
          {AYANAMSAS.map((a, i) =>
            option(
              a.name,
              settings.zodiac.ayanamsa === a.id,
              () => set({ zodiac: { type: 'sidereal', ayanamsa: a.id } }),
              i === AYANAMSAS.length - 1,
            ),
          )}
        </Card>
      ) : null}

      <Section title="منازل القمر" />
      <Stepper
        items={[
          {
            label: 'متساوية من أول الحمل',
            active: settings.mansions === 'tropical',
            onPress: () => set({ mansions: 'tropical' }),
          },
          {
            label: 'مرتبطة بالنجوم',
            active: settings.mansions === 'stars',
            onPress: () => set({ mansions: 'stars' }),
          },
        ]}
      />

      <Section title="نظام البيوت الافتراضي" />
      <Card>
        {HOUSE_SYSTEMS.filter(h => h.common).map((h, i, arr) =>
          option(
            h.name,
            settings.houseSystem === h.code,
            () => set({ houseSystem: h.code }),
            i === arr.length - 1,
          ),
        )}
      </Card>
      <Hint>بقية الأنظمة متاحة من شاشة الخريطة.</Hint>

      <Section title="سماح الجوانب" />
      <Card>{ORB_KINDS.map(orbRow)}</Card>
      <Toggle
        label="إظهار الجوانب الصغرى"
        value={settings.minorAspects}
        onChange={v => set({ minorAspects: v })}
      />
      {settings.minorAspects ? <Card>{MINOR_KINDS.map(orbRow)}</Card> : null}
      <Hint>تُزاد درجتان على السماح إذا كان أحد الطرفين الشمس أو القمر.</Hint>

      <Section title="النقاط المعروضة" />
      <Card>
        <Toggle
          label="العقدة الشمالية"
          value={settings.points.trueNode}
          onChange={v => set({ points: { ...settings.points, trueNode: v } })}
        />
        <Toggle
          label="كيرون"
          value={settings.points.chiron}
          onChange={v => set({ points: { ...settings.points, chiron: v } })}
        />
        <Toggle
          label="ليليث (القمر الأسود الوسطي)"
          value={settings.points.meanLilith}
          onChange={v => set({ points: { ...settings.points, meanLilith: v } })}
        />
      </Card>

      <Section title="تنبيهات الساعات الروحانية" />
      {remindersSupported ? (
        <>
          <Card>
            {HOUR_PLANETS.map(p => (
              <Toggle
                key={p}
                label={`ذكّرني بساعات ${POINT_NAMES[p]}`}
                value={alerts.planets.includes(p)}
                onChange={v => setPlanet(p, v)}
              />
            ))}
          </Card>
          <Stepper
            items={LEADS.map(m => ({
              label: m ? `قبل ${m} د` : 'عند البدء',
              active: alerts.lead === m,
              onPress: () => set({ hourAlerts: { ...alerts, lead: m } }),
            }))}
          />
          {denied ? (
            <Text style={styles.warn}>
              لم يُسمح للتطبيق بالإشعارات. اسمح بها من إعدادات الهاتف ثم أعد
              التفعيل.
            </Text>
          ) : null}
          {alerts.planets.length && !exact ? (
            <>
              <Text style={styles.warn}>
                الهاتف لا يسمح بالتنبيه في الدقيقة نفسها، فقد يتأخر التنبيه
                دقائق.
              </Text>
              <Button
                label="السماح بالتنبيه في الوقت الدقيق"
                kind="secondary"
                onPress={openExactAlarmSettings}
              />
            </>
          ) : null}
          <Hint>
            {`الأوقات لمدينة ${
              (settings.place ?? DEFAULT_PLACE).name
            } (تُغيَّر من شاشة الساعات الروحانية). تُجهَّز التنبيهات لعشرة أيام قادمة وتتجدد كلما فتحت التطبيق.`}
          </Hint>
        </>
      ) : (
        <Hint>التنبيهات تحتاج تثبيت النسخة الأحدث من التطبيق.</Hint>
      )}

      <Button
        label="استعادة الإعدادات الأصلية"
        kind="secondary"
        onPress={() => onChange(DEFAULT_SETTINGS)}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 20, gap: 12, paddingBottom: 40 },
  option: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomColor: colors.line,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  last: { borderBottomWidth: 0 },
  pressed: { opacity: 0.6 },
  optionText: {
    fontFamily: FONT,
    color: colors.text,
    fontSize: 15,
    textAlign: 'right',
  },
  active: {
    fontFamily: FONT,
    color: colors.gold,
    fontSize: 15,
    fontWeight: '600',
  },
  warn: {
    fontFamily: FONT,
    color: colors.error,
    fontSize: 13,
    textAlign: 'right',
  },
  orbRow: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  orbControls: { flexDirection: 'row-reverse', alignItems: 'center', gap: 12 },
  orbBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderColor: colors.line,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  orbBtnText: { fontFamily: FONT, color: colors.gold, fontSize: 18 },
  orbValue: {
    fontFamily: FONT,
    color: colors.text,
    fontSize: 15,
    minWidth: 40,
    textAlign: 'center',
  },
});
