// Birth data entry: date, clock time, birthplace. AGPL-3.0-or-later.

import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { City, cityLabel, searchCities } from '../geo/cities';
import {
  formatOffset,
  localToUtc,
  TZ_END_YEAR,
  UtcConversion,
} from '../time/tz';
import { colors, formatDateTime } from './theme';
import { Button, Field, Header, toLatinDigits } from './widgets';

export interface BirthData {
  name: string;
  local: {
    year: number;
    month: number;
    day: number;
    hour: number;
    minute: number;
  };
  city: City;
  conversion: UtcConversion;
}

type Parsed =
  | { ok: true; value: BirthData['local'] }
  | { ok: false; message: string }
  | null;

function parseInt10(s: string): number | null {
  const t = toLatinDigits(s).trim();
  return /^\d+$/.test(t) ? parseInt(t, 10) : null;
}

function parseLocal(f: {
  day: string;
  month: string;
  year: string;
  hour: string;
  minute: string;
}): Parsed {
  if ([f.day, f.month, f.year, f.hour, f.minute].some(v => v.trim() === '')) {
    return null;
  }
  const [day, month, year, hour, minute] = [
    f.day,
    f.month,
    f.year,
    f.hour,
    f.minute,
  ].map(parseInt10);
  if (
    day === null ||
    month === null ||
    year === null ||
    hour === null ||
    minute === null
  ) {
    return { ok: false, message: 'اكتب أرقاماً فقط في التاريخ والوقت.' };
  }
  if (year < 1800 || year > TZ_END_YEAR) {
    return {
      ok: false,
      message: `السنة يجب أن تكون بين 1800 و${TZ_END_YEAR}.`,
    };
  }
  const probe = new Date(Date.UTC(year, month - 1, day));
  if (
    month < 1 ||
    month > 12 ||
    probe.getUTCMonth() !== month - 1 ||
    probe.getUTCDate() !== day
  ) {
    return { ok: false, message: 'هذا التاريخ غير موجود في التقويم.' };
  }
  if (hour > 23 || minute > 59) {
    return { ok: false, message: 'الساعة من 0 إلى 23، والدقيقة من 0 إلى 59.' };
  }
  return { ok: true, value: { year, month, day, hour, minute } };
}

export function describeConversion(c: UtcConversion): string[] {
  const kind = c.lmt
    ? 'التوقيت الشمسي المحلي للمكان'
    : c.dst
    ? 'توقيت صيفي'
    : 'توقيت شتوي';
  const lines = [
    `فرق التوقيت آنذاك: ${formatOffset(c.offsetSeconds)} (${kind})`,
  ];
  if (c.ambiguous) {
    lines.push(
      'تكرر هذا الوقت على الساعة ليلة تغيير التوقيت؛ اعتُمدت المرة الأولى.',
    );
  }
  if (c.nonexistent) {
    lines.push(
      'هذا الوقت لم يظهر على الساعة لأنها قُدّمت ليلتها؛ حُسب بالتوقيت الذي سبق التقديم.',
    );
  }
  return lines;
}

export function BirthForm({
  onBack,
  onSubmit,
}: {
  onBack: () => void;
  onSubmit: (data: BirthData) => void;
}) {
  const [name, setName] = useState('');
  const [day, setDay] = useState('');
  const [month, setMonth] = useState('');
  const [year, setYear] = useState('');
  const [hour, setHour] = useState('');
  const [minute, setMinute] = useState('');
  const [query, setQuery] = useState('');
  const [city, setCity] = useState<City | null>(null);

  const parsed = parseLocal({ day, month, year, hour, minute });
  const results = useMemo(
    () => (city ? [] : searchCities(query, 8)),
    [query, city],
  );

  let conversion: UtcConversion | null = null;
  let conversionError: string | null = null;
  if (parsed?.ok && city) {
    try {
      conversion = localToUtc(parsed.value, city.timeZone, city.lon);
    } catch (e) {
      conversionError = String(e);
    }
  }

  return (
    <ScrollView
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      <Header title="خريطة جديدة" onBack={onBack} />

      <Field label="الاسم (اختياري)" value={name} onChangeText={setName} />

      <View style={styles.row}>
        <Field
          label="اليوم"
          value={day}
          onChangeText={setDay}
          keyboardType="number-pad"
          maxLength={2}
        />
        <Field
          label="الشهر"
          value={month}
          onChangeText={setMonth}
          keyboardType="number-pad"
          maxLength={2}
        />
        <Field
          label="السنة"
          value={year}
          onChangeText={setYear}
          keyboardType="number-pad"
          maxLength={4}
        />
      </View>
      <View style={styles.row}>
        <Field
          label="الساعة (0 إلى 23)"
          value={hour}
          onChangeText={setHour}
          keyboardType="number-pad"
          maxLength={2}
        />
        <Field
          label="الدقيقة"
          value={minute}
          onChangeText={setMinute}
          keyboardType="number-pad"
          maxLength={2}
        />
      </View>
      <Text style={styles.hint}>اكتب الوقت كما كان على ساعة مكان الولادة.</Text>
      {parsed && !parsed.ok ? (
        <Text style={styles.error}>{parsed.message}</Text>
      ) : null}

      {city ? (
        <View style={styles.card}>
          <View style={styles.cityHeader}>
            <Text style={styles.cityName}>{cityLabel(city)}</Text>
            <Pressable
              onPress={() => {
                setCity(null);
                setQuery('');
              }}
              hitSlop={10}
            >
              <Text style={styles.change}>تغيير</Text>
            </Pressable>
          </View>
          <Text style={styles.cityDetail}>{city.countryName}</Text>
          <Text style={styles.cityDetail}>
            {`العرض ${Math.abs(city.lat).toFixed(2)} ${
              city.lat >= 0 ? 'شمالاً' : 'جنوباً'
            } · الطول ${Math.abs(city.lon).toFixed(2)} ${
              city.lon >= 0 ? 'شرقاً' : 'غرباً'
            }`}
          </Text>
        </View>
      ) : (
        <>
          <Field
            label="مكان الولادة"
            value={query}
            onChangeText={setQuery}
            placeholder="ابحث باسم المدينة"
          />
          {results.length > 0 ? (
            <View style={styles.card}>
              {results.map((c, i) => (
                <Pressable
                  key={`${c.name}-${c.lat}-${c.lon}`}
                  onPress={() => setCity(c)}
                  style={({ pressed }) => [
                    styles.result,
                    i === results.length - 1 && styles.lastRow,
                    pressed && styles.pressed,
                  ]}
                >
                  <Text style={styles.cityName}>{cityLabel(c)}</Text>
                  <Text style={styles.cityDetail}>
                    {`${c.countryName} · ${c.lat.toFixed(1)}، ${c.lon.toFixed(
                      1,
                    )}`}
                  </Text>
                </Pressable>
              ))}
            </View>
          ) : query.trim().length >= 2 ? (
            <Text style={styles.hint}>
              لا توجد مدينة بهذا الاسم. جرّب كتابته بالإنكليزية.
            </Text>
          ) : null}
        </>
      )}

      {conversion ? (
        <View style={styles.card}>
          {describeConversion(conversion).map(l => (
            <Text key={l} style={styles.convLine}>
              {l}
            </Text>
          ))}
          <Text style={styles.convLine}>{`بالتوقيت العالمي: ${formatDateTime(
            conversion.utc,
          )}`}</Text>
        </View>
      ) : null}
      {conversionError ? (
        <Text style={styles.error}>{conversionError}</Text>
      ) : null}

      <Button
        label="احسب الخريطة"
        disabled={!conversion || !parsed?.ok || !city}
        onPress={() => {
          if (conversion && parsed?.ok && city) {
            onSubmit({
              name: name.trim(),
              local: parsed.value,
              city,
              conversion,
            });
          }
        }}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 20, gap: 14, paddingBottom: 40 },
  row: { flexDirection: 'row-reverse', gap: 10 },
  hint: { color: colors.muted, fontSize: 13, textAlign: 'right' },
  error: { color: colors.error, fontSize: 14, textAlign: 'right' },
  card: {
    backgroundColor: colors.navyRaised,
    borderColor: colors.line,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 4,
  },
  cityHeader: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cityName: { color: colors.text, fontSize: 16, textAlign: 'right' },
  cityDetail: { color: colors.muted, fontSize: 13, textAlign: 'right' },
  change: { color: colors.gold, fontSize: 14 },
  result: {
    paddingVertical: 10,
    borderBottomColor: colors.line,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  lastRow: { borderBottomWidth: 0 },
  pressed: { opacity: 0.6 },
  convLine: { color: colors.text, fontSize: 14, textAlign: 'right' },
});
