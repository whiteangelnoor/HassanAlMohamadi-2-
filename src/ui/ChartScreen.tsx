// One chart: planets and houses, aspects, lots, dignities. AGPL-3.0-or-later.

import { ReactNode, useMemo, useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';

import { ChartResult } from '../astro/engine';
import {
  aspectPoints,
  chartDignities,
  computeLots,
  findAspects,
  rulersAt,
} from '../astro/traditional';
import { starContacts } from '../astro/synastry';
import {
  ASPECT_NAMES,
  colors,
  DIGNITY_NAMES,
  FONT,
  formatDegree,
  formatLongitude,
  LOT_NAMES,
  POINT_NAMES,
  SIGNS,
} from './theme';
import { Button, Header } from './widgets';
import {
  ASC_IN,
  JUPITER_IN,
  MARS_IN,
  MERCURY_IN,
  MOON_IN,
  SATURN_IN,
  SUN_IN,
  VENUS_IN,
} from '../astro/readings';
import { ChartWheel } from './ChartWheel';
import { HOUSE_SYSTEMS, houseSystemName } from './houseSystems';

export interface ChartInfo {
  title: string;
  lines: string[]; // shown under the title, e.g. place and times
  notes: string[]; // conversion warnings shown in gold
  chart: ChartResult;
  /** A moment (the sky now) rather than a birth: no personal reading. */
  moment?: boolean;
}

type Tab = 'reading' | 'planets' | 'aspects' | 'lots' | 'dignities' | 'stars';
const TABS: { key: Tab; label: string }[] = [
  { key: 'reading', label: 'التفسير' },
  { key: 'planets', label: 'الكواكب' },
  { key: 'aspects', label: 'الجوانب' },
  { key: 'lots', label: 'السهام' },
  { key: 'dignities', label: 'الكرامات' },
  { key: 'stars', label: 'النجوم' },
];

export function ChartScreen({
  info,
  houseSystem,
  onHouseSystem,
  actions,
  onBack,
}: {
  info: ChartInfo;
  houseSystem: string;
  onHouseSystem: (code: string) => void;
  /** Buttons shown above the wheel (transits, save, export...). */
  actions?: { label: string; onPress: () => void }[];
  onBack: () => void;
}) {
  const [tab, setTab] = useState<Tab>('planets');
  const [picking, setPicking] = useState(false);
  const { chart } = info;
  const top = (actions ?? []).filter(a => a.label !== 'PDF');
  const bottom = (actions ?? []).filter(a => a.label === 'PDF');

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

      {top.length ? (
        <View style={styles.actions}>
          {top.map(a => (
            <Pressable
              key={a.label}
              onPress={a.onPress}
              style={({ pressed }) => [styles.chip, pressed && styles.pressed]}
              accessibilityRole="button"
            >
              <Text style={styles.chipText}>{a.label}</Text>
            </Pressable>
          ))}
        </View>
      ) : null}

      <BigThree chart={chart} />
      <Wheel chart={chart} />

      <Pressable
        onPress={() => setPicking(true)}
        style={({ pressed }) => [styles.selector, pressed && styles.pressed]}
        accessibilityRole="button"
      >
        <Text style={styles.selectorLabel}>نظام البيوت</Text>
        <Text style={styles.selectorValue}>
          {`${houseSystemName(houseSystem)}  ⌄`}
        </Text>
      </Pressable>
      <HouseSystemPicker
        visible={picking}
        current={houseSystem}
        onClose={() => setPicking(false)}
        onPick={code => {
          setPicking(false);
          if (code !== houseSystem) {
            onHouseSystem(code);
          }
        }}
      />

      <View style={styles.tabs}>
        {TABS.filter(t => !(info.moment && t.key === 'reading')).map(t => (
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
      {tab === 'stars' ? <Stars chart={chart} /> : null}
      {tab === 'reading' ? <Reading chart={chart} /> : null}

      {bottom.map(a => (
        <Button
          key={a.label}
          label="تصدير PDF"
          kind="secondary"
          onPress={a.onPress}
        />
      ))}

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

/** The Sun, the Moon and the Ascendant: what people ask about first. */
function BigThree({ chart }: { chart: ChartResult }) {
  const sign = (lon: number) =>
    SIGNS[Math.floor((((lon % 360) + 360) % 360) / 30)];
  const sun = chart.bodies.find(b => b.key === 'sun');
  const moon = chart.bodies.find(b => b.key === 'moon');
  const items: [string, string][] = [
    ...(sun ? [['الشمس', sign(sun.lon)] as [string, string]] : []),
    ...(moon ? [['القمر', sign(moon.lon)] as [string, string]] : []),
    ...(chart.houses
      ? [['الطالع', sign(chart.houses.asc)] as [string, string]]
      : []),
  ];
  return (
    <View style={styles.bigThree}>
      {items.map(([k, v]) => (
        <View key={k} style={styles.bigItem}>
          <Text style={styles.bigLabel}>{k}</Text>
          <Text style={styles.bigValue}>{v}</Text>
        </View>
      ))}
    </View>
  );
}

const READING_BODIES: [string, string, string[]][] = [
  ['sun', 'الشمس', SUN_IN],
  ['moon', 'القمر', MOON_IN],
  ['mercury', 'عطارد', MERCURY_IN],
  ['venus', 'الزهرة', VENUS_IN],
  ['mars', 'المريخ', MARS_IN],
  ['jupiter', 'المشتري', JUPITER_IN],
  ['saturn', 'زحل', SATURN_IN],
];

function Reading({ chart }: { chart: ChartResult }) {
  const sign = (lon: number) => Math.floor((((lon % 360) + 360) % 360) / 30);
  const parts: [string, string][] = [];
  if (chart.houses) {
    const s = sign(chart.houses.asc);
    parts.push([`الطالع في ${SIGNS[s]}`, ASC_IN[s]]);
  }
  for (const [key, name, texts] of READING_BODIES) {
    const b = chart.bodies.find(x => x.key === key);
    if (b) {
      parts.push([`${name} في ${SIGNS[sign(b.lon)]}`, texts[sign(b.lon)]]);
    }
  }
  return (
    <>
      {parts.map(([title, text]) => (
        <View key={title} style={styles.readingBlock}>
          <Text style={styles.readingTitle}>{title}</Text>
          <Text style={styles.readingText}>{text}</Text>
        </View>
      ))}
      <Text style={styles.note}>
        هذه قراءة لكل موضع على حدة؛ والخريطة تُفهم مجتمعة، فقد يقوّي موضعٌ
        موضعاً أو يخففه.
      </Text>
    </>
  );
}

function Wheel({ chart }: { chart: ChartResult }) {
  const { width } = useWindowDimensions();
  return (
    <View style={styles.wheel}>
      <ChartWheel chart={chart} size={Math.min(width - 40, 520)} />
    </View>
  );
}

function HouseSystemPicker({
  visible,
  current,
  onClose,
  onPick,
}: {
  visible: boolean;
  current: string;
  onClose: () => void;
  onPick: (code: string) => void;
}) {
  const common = HOUSE_SYSTEMS.filter(h => h.common);
  const others = HOUSE_SYSTEMS.filter(h => !h.common);
  const item = (h: { code: string; name: string }) => (
    <Pressable
      key={h.code}
      onPress={() => onPick(h.code)}
      style={({ pressed }) => [styles.option, pressed && styles.pressed]}
    >
      <Text
        style={[styles.optionText, h.code === current && styles.optionActive]}
      >
        {h.name}
      </Text>
      {h.code === current ? <Text style={styles.optionActive}>✓</Text> : null}
    </Pressable>
  );
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={() => {}}>
          <Text style={styles.sheetTitle}>نظام البيوت</Text>
          <ScrollView>
            {common.map(item)}
            <Text style={styles.section}>أنظمة أخرى</Text>
            {others.map(item)}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

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
          <Section title="رؤوس البيوت" />
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

function Stars({ chart }: { chart: ChartResult }) {
  const contacts = useMemo(() => {
    try {
      return starContacts(chart);
    } catch {
      return null;
    }
  }, [chart]);
  if (contacts === null) {
    return <Text style={styles.hint}>تعذّر حساب النجوم الثابتة.</Text>;
  }
  return (
    <>
      {contacts.length ? (
        <Card>
          {contacts.map((c, i) => (
            <Row
              key={`${c.star}-${c.point}`}
              last={i === contacts.length - 1}
              name={`${c.star} مع ${POINT_NAMES[c.point]}`}
              value={formatDegree(c.orb)}
              detail={`النجم في ${formatLongitude(
                c.starLon,
              )} · القدر ${c.magnitude.toFixed(1)}`}
            />
          ))}
        </Card>
      ) : (
        <Text style={styles.hint}>
          لا يقترن أي من النجوم الثلاثين المعتمدة بكواكب هذه الخريطة ضمن درجة.
        </Text>
      )}
      <Text style={styles.hint}>
        اقترانات ضمن درجة واحدة مع ثلاثين نجماً من ألمع النجوم وأشهرها في
        التراث.
      </Text>
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
  readingBlock: {
    borderColor: colors.line,
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    gap: 6,
    backgroundColor: colors.navyRaised,
  },
  readingTitle: {
    fontFamily: FONT,
    color: colors.gold,
    fontSize: 17,
    fontWeight: '600',
    textAlign: 'right',
  },
  readingText: {
    fontFamily: FONT,
    color: colors.text,
    fontSize: 15,
    lineHeight: 26,
    textAlign: 'right',
  },
  bigThree: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-around',
    borderColor: colors.gold,
    borderWidth: 1,
    borderRadius: 14,
    paddingVertical: 12,
    backgroundColor: colors.navyRaised,
  },
  bigItem: { alignItems: 'center', gap: 2 },
  bigLabel: { fontFamily: FONT, color: colors.muted, fontSize: 13 },
  bigValue: {
    fontFamily: FONT,
    color: colors.gold,
    fontSize: 18,
    fontWeight: '600',
  },
  actions: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 8 },
  chip: {
    borderColor: colors.gold,
    borderWidth: 1,
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  chipText: {
    fontFamily: FONT,
    color: colors.gold,
    fontSize: 14,
    fontWeight: '600',
  },
  selector: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.navyRaised,
    borderColor: colors.line,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  selectorLabel: { fontFamily: FONT, color: colors.muted, fontSize: 14 },
  selectorValue: {
    fontFamily: FONT,
    color: colors.gold,
    fontSize: 16,
    fontWeight: '600',
  },
  pressed: { opacity: 0.6 },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(5, 10, 25, 0.7)',
    justifyContent: 'center',
    padding: 24,
  },
  sheet: {
    backgroundColor: colors.navyRaised,
    borderColor: colors.line,
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 18,
    paddingVertical: 14,
    maxHeight: '80%',
  },
  sheetTitle: {
    fontFamily: FONT,
    color: colors.gold,
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'right',
    marginBottom: 6,
  },
  option: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomColor: colors.line,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  optionText: {
    fontFamily: FONT,
    color: colors.text,
    fontSize: 16,
    textAlign: 'right',
  },
  optionActive: {
    fontFamily: FONT,
    color: colors.gold,
    fontSize: 16,
    fontWeight: '600',
  },
  wheel: { alignItems: 'center' },
  content: { padding: 20, gap: 14, paddingBottom: 40 },
  subtitle: {
    fontFamily: FONT,
    color: colors.muted,
    fontSize: 14,
    textAlign: 'right',
  },
  note: {
    fontFamily: FONT,
    color: colors.gold,
    fontSize: 13,
    textAlign: 'right',
  },
  hint: {
    fontFamily: FONT,
    color: colors.muted,
    fontSize: 12,
    textAlign: 'right',
    lineHeight: 19,
  },
  section: {
    fontFamily: FONT,
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
  tabText: { fontFamily: FONT, color: colors.muted, fontSize: 12.5 },
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
  name: {
    fontFamily: FONT,
    color: colors.text,
    fontSize: 16,
    textAlign: 'right',
    flexShrink: 1,
  },
  value: {
    fontFamily: FONT,
    color: colors.text,
    fontSize: 16,
    fontVariant: ['tabular-nums'],
  },
  detail: {
    fontFamily: FONT,
    color: colors.muted,
    fontSize: 13,
    textAlign: 'right',
  },
  positive: {
    fontFamily: FONT,
    color: colors.gold,
    fontSize: 16,
    fontWeight: '600',
  },
  negative: {
    fontFamily: FONT,
    color: colors.error,
    fontSize: 16,
    fontWeight: '600',
  },
});
