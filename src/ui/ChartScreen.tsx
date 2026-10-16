// One chart: planets and houses, aspects, lots, dignities. AGPL-3.0-or-later.

import { ReactNode, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { ChartResult } from '../astro/engine';
import {
  aspectPoints,
  chartDignities,
  computeLots,
  findAspects,
  isDayChart,
  rulersAt,
} from '../astro/traditional';
import {
  ASPECT_NAMES,
  colors,
  DIGNITY_NAMES,
  formatDegree,
  formatLongitude,
  LOT_NAMES,
  POINT_NAMES,
} from './theme';
import { Button, Header } from './widgets';

export interface ChartInfo {
  title: string;
  lines: string[]; // shown under the title, e.g. place and times
  notes: string[]; // conversion warnings shown in gold
  chart: ChartResult;
}

type Tab = 'planets' | 'aspects' | 'lots' | 'dignities';
const TABS: { key: Tab; label: string }[] = [
  { key: 'planets', label: 'الكواكب' },
  { key: 'aspects', label: 'الجوانب' },
  { key: 'lots', label: 'السهام' },
  { key: 'dignities', label: 'الكرامات' },
];

export function ChartScreen({
  info,
  onBack,
}: {
  info: ChartInfo;
  onBack: () => void;
}) {
  const [tab, setTab] = useState<Tab>('planets');
  const { chart } = info;
  const day = chart.houses ? isDayChart(chart) : null;

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Header title={info.title} onBack={onBack} />
      {info.lines.map(l => (
        <Text key={l} style={styles.subtitle}>
          {l}
        </Text>
      ))}
      {day !== null ? (
        <Text style={styles.subtitle}>
          {day ? 'خريطة نهارية' : 'خريطة ليلية'}
        </Text>
      ) : null}
      {info.notes.map(n => (
        <Text key={n} style={styles.note}>
          {n}
        </Text>
      ))}

      <View style={styles.tabs}>
        {TABS.map(t => (
          <Pressable
            key={t.key}
            onPress={() => setTab(t.key)}
            style={[styles.tab, tab === t.key && styles.tabActive]}
            accessibilityRole="tab"
            accessibilityState={{ selected: tab === t.key }}
          >
            <Text
              style={[styles.tabText, tab === t.key && styles.tabTextActive]}
            >
              {t.label}
            </Text>
          </Pressable>
        ))}
      </View>

      {tab === 'planets' ? <Planets chart={chart} /> : null}
      {tab === 'aspects' ? <Aspects chart={chart} /> : null}
      {tab === 'lots' ? <Lots chart={chart} /> : null}
      {tab === 'dignities' ? <Dignities chart={chart} /> : null}

      <Button label="رجوع" kind="secondary" onPress={onBack} />
    </ScrollView>
  );
}

// ---------- building blocks ---------------------------------------------------

function Card({ children }: { children: ReactNode }) {
  return <View style={styles.card}>{children}</View>;
}

function Row({
  name,
  value,
  detail,
  last,
}: {
  name: ReactNode;
  value: ReactNode;
  detail?: ReactNode;
  last?: boolean;
}) {
  return (
    <View style={[styles.row, last && styles.lastRow]}>
      <View style={styles.rowMain}>
        <Text style={styles.name}>{name}</Text>
        <Text style={styles.value}>{value}</Text>
      </View>
      {detail ? <Text style={styles.detail}>{detail}</Text> : null}
    </View>
  );
}

function Section({ title }: { title: string }) {
  return <Text style={styles.section}>{title}</Text>;
}

// ---------- tabs ---------------------------------------------------------------

function Planets({ chart }: { chart: ChartResult }) {
  const houses = chart.houses;
  return (
    <>
      <Card>
        {chart.bodies.map((b, i) => (
          <Row
            key={b.key}
            last={i === chart.bodies.length - 1}
            name={POINT_NAMES[b.key] ?? b.key}
            value={formatLongitude(b.lon)}
            detail={[
              b.retrograde ? 'متراجع' : null,
              b.housePosition ? `البيت ${Math.floor(b.housePosition)}` : null,
            ]
              .filter(Boolean)
              .join(' · ')}
          />
        ))}
      </Card>
      {houses ? (
        <>
          <Card>
            <Row name="الطالع" value={formatLongitude(houses.asc)} />
            <Row name="وسط السماء" value={formatLongitude(houses.mc)} last />
          </Card>
          <Section title={`رؤوس البيوت · ${houses.systemName}`} />
          <Card>
            {houses.cusps.slice(0, 12).map((c, i) => (
              <Row
                key={i}
                last={i === 11}
                name={`البيت ${i + 1}`}
                value={formatLongitude(c)}
              />
            ))}
          </Card>
          {houses.fallbackUsed ? (
            <Text style={styles.note}>
              نظام البيوت المختار لا يعمل عند هذا العرض الجغرافي، فاستُخدم نظام
              بورفيري بدلاً منه.
            </Text>
          ) : null}
        </>
      ) : null}
    </>
  );
}

function Aspects({ chart }: { chart: ChartResult }) {
  const aspects = useMemo(() => findAspects(aspectPoints(chart)), [chart]);
  return (
    <>
      <Card>
        {aspects.map((a, i) => (
          <Row
            key={`${a.a}-${a.b}`}
            last={i === aspects.length - 1}
            name={`${POINT_NAMES[a.a]} ${ASPECT_NAMES[a.kind]} ${
              POINT_NAMES[a.b]
            }`}
            value={formatDegree(a.orb)}
            detail={
              a.applying === null ? undefined : a.applying ? 'مقترب' : 'منفصل'
            }
          />
        ))}
      </Card>
      <Text style={styles.hint}>
        الرقم هو الانحراف عن الزاوية الدقيقة. السماح: ثماني درجات للاقتران
        والمقابلة، وسبع للتثليث والتربيع، وخمس للتسديس، ودرجتان زيادة مع الشمس
        والقمر.
      </Text>
    </>
  );
}

function Lots({ chart }: { chart: ChartResult }) {
  const lots = useMemo(() => (chart.houses ? computeLots(chart) : []), [chart]);
  if (lots.length === 0) {
    return <Text style={styles.hint}>السهام تحتاج خريطة فيها بيوت.</Text>;
  }
  return (
    <>
      <Card>
        {lots.map((l, i) => (
          <Row
            key={l.key}
            last={i === lots.length - 1}
            name={LOT_NAMES[l.key]}
            value={formatLongitude(l.lon)}
            detail={`الطالع + ${LOT_NAMES[l.formula[0]]} − ${
              LOT_NAMES[l.formula[1]]
            }`}
          />
        ))}
      </Card>
      <Text style={styles.hint}>تنعكس معادلة كل سهم في الخرائط الليلية.</Text>
    </>
  );
}

function Dignities({ chart }: { chart: ChartResult }) {
  const rows = useMemo(
    () => (chart.houses ? chartDignities(chart) : []),
    [chart],
  );
  if (rows.length === 0) {
    return <Text style={styles.hint}>الكرامات تحتاج خريطة فيها بيوت.</Text>;
  }
  return (
    <>
      <Card>
        {rows.map((d, i) => {
          const r = rulersAt(d.lon);
          return (
            <Row
              key={d.planet}
              last={i === rows.length - 1}
              name={POINT_NAMES[d.planet]}
              value={
                <Text style={d.score < 0 ? styles.negative : styles.positive}>
                  {d.score > 0 ? `+${d.score}` : `${d.score}`}
                </Text>
              }
              detail={`${d.dignities
                .map(k => DIGNITY_NAMES[k])
                .join('، ')}\nصاحب الحد: ${POINT_NAMES[r.term]} · صاحب الوجه: ${
                POINT_NAMES[r.face]
              }`}
            />
          );
        })}
      </Card>
      <Text style={styles.hint}>
        النقاط: بيت ٥، شرف ٤، مثلثة ٣، حد ٢، وجه ١، وبال −٥، هبوط −٤، غريب −٥.
        الحدود المصرية، والمثلثات على مذهب دوروثيوس.
      </Text>
    </>
  );
}

const styles = StyleSheet.create({
  content: { padding: 20, gap: 14, paddingBottom: 40 },
  subtitle: { color: colors.muted, fontSize: 14, textAlign: 'right' },
  note: { color: colors.gold, fontSize: 13, textAlign: 'right' },
  hint: {
    color: colors.muted,
    fontSize: 12,
    textAlign: 'right',
    lineHeight: 19,
  },
  section: {
    color: colors.muted,
    fontSize: 13,
    textAlign: 'right',
    marginTop: 6,
  },
  tabs: {
    flexDirection: 'row-reverse',
    backgroundColor: colors.navyRaised,
    borderRadius: 12,
    padding: 4,
    gap: 4,
  },
  tab: { flex: 1, paddingVertical: 9, borderRadius: 9, alignItems: 'center' },
  tabActive: { backgroundColor: colors.gold },
  tabText: { color: colors.muted, fontSize: 14 },
  tabTextActive: { color: colors.goldText, fontWeight: '600' },
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
  rowMain: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 10,
  },
  lastRow: { borderBottomWidth: 0 },
  name: { color: colors.text, fontSize: 16, textAlign: 'right', flexShrink: 1 },
  value: { color: colors.text, fontSize: 16, fontVariant: ['tabular-nums'] },
  detail: { color: colors.muted, fontSize: 13, textAlign: 'right' },
  positive: { color: colors.gold, fontSize: 16, fontWeight: '600' },
  negative: { color: colors.error, fontSize: 16, fontWeight: '600' },
});
