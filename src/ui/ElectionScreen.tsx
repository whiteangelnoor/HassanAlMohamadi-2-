// The finder of suitable times for a purpose. AGPL-3.0-or-later.

import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { dateFromJd, jdFromDate } from '../astro/events';
import { MansionMethod, MANSIONS } from '../astro/mansions';
import { findWindows, PURPOSES, Window } from '../spiritual/election';
import { SavedPlace } from '../store';
import { formatDay, formatTime } from './dates';
import { Card, Hint, Row, Section, Stepper } from './list';
import { colors, FONT, POINT_NAMES } from './theme';
import { Header } from './widgets';

const RANGES = [7, 14, 30];

export function ElectionScreen({
  place,
  method,
  onBack,
}: {
  place: SavedPlace;
  method: MansionMethod;
  onBack: () => void;
}) {
  const [purpose, setPurpose] = useState(PURPOSES[0].key);
  const [days, setDays] = useState(14);
  const [result, setResult] = useState<Window[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setResult(null);
    setError(null);
    const id = setTimeout(() => {
      try {
        const p = PURPOSES.find(x => x.key === purpose)!;
        setResult(findWindows(p, place, method, jdFromDate(new Date()), days));
      } catch (e) {
        setError(String(e));
      }
    }, 30);
    return () => clearTimeout(id);
  }, [purpose, days, place, method]);

  // Grouped by local day.
  const groups: { day: string; items: Window[] }[] = [];
  for (const w of result ?? []) {
    const day = formatDay(dateFromJd(w.startJd));
    const last = groups[groups.length - 1];
    if (last && last.day === day) {
      last.items.push(w);
    } else {
      groups.push({ day, items: [w] });
    }
  }
  const t = (jd: number) => formatTime(dateFromJd(jd));

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Header title="الوقت المناسب" onBack={onBack} />

      <Section title="الغرض" />
      <View style={styles.chips}>
        {PURPOSES.map(p => (
          <Pressable
            key={p.key}
            onPress={() => setPurpose(p.key)}
            style={({ pressed }) => [
              styles.chip,
              purpose === p.key && styles.chipActive,
              pressed && styles.pressed,
            ]}
          >
            <Text
              style={[styles.chipText, purpose === p.key && styles.chipTextOn]}
            >
              {p.label}
            </Text>
          </Pressable>
        ))}
      </View>

      <Section title="المدة" />
      <Stepper
        items={RANGES.map(n => ({
          label: `${n} يوماً`,
          active: days === n,
          onPress: () => setDays(n),
        }))}
      />

      {error ? <Text style={styles.error}>{error}</Text> : null}
      {result === null && !error ? <Hint>جارٍ البحث…</Hint> : null}
      {result && result.length === 0 ? (
        <Hint>لا وقت تجتمع فيه الشروط في هذه المدة. جرّب مدة أطول.</Hint>
      ) : null}
      {groups.map(g => (
        <View key={g.day} style={styles.group}>
          <Section title={g.day} />
          <Card>
            {g.items.map((w, i) => (
              <Row
                key={w.startJd}
                last={i === g.items.length - 1}
                name={`ساعة ${POINT_NAMES[w.ruler]}`}
                value={
                  <Text style={styles.gold}>{`${t(w.startJd)} – ${t(
                    w.endJd,
                  )}`}</Text>
                }
                detail={`القمر في ${MANSIONS[w.mansion]}`}
              />
            ))}
          </Card>
        </View>
      ))}

      <Hint>
        {`يُعرض الوقت الذي تجتمع فيه ثلاثة شروط: الساعة لكوكب يصلح للغرض، والقمر في منزلة تصلح له، والقمر غير خالي السير (أي ما زال أمامه اتصال تام بأحد الكواكب السبعة قبل أن يخرج من برجه). الساعات لمدينة ${place.name}، وتُغيَّر من شاشة الساعات الروحانية. الأوقات بتوقيت هاتفك، ويُهمل ما يقل عن عشر دقائق.`}
      </Hint>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 20, gap: 12, paddingBottom: 40 },
  chips: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 8 },
  chip: {
    borderColor: colors.line,
    borderWidth: 1,
    borderRadius: 18,
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  chipActive: { borderColor: colors.gold, backgroundColor: colors.navyRaised },
  chipText: { fontFamily: FONT, color: colors.text, fontSize: 14 },
  chipTextOn: { color: colors.gold, fontWeight: '600' },
  pressed: { opacity: 0.6 },
  group: { gap: 8 },
  gold: {
    fontFamily: FONT,
    color: colors.gold,
    fontSize: 15,
    fontWeight: '600',
  },
  error: {
    fontFamily: FONT,
    color: colors.error,
    fontSize: 14,
    textAlign: 'right',
  },
});
