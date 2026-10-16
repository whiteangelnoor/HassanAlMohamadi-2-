// Synastry (bi-wheel and cross aspects) and the composite chart of two
// people. AGPL-3.0-or-later.

import { useMemo, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';

import { ChartResult } from '../astro/engine';
import { compositeChart, synastryAspects } from '../astro/synastry';
import { ChartWheel } from './ChartWheel';
import { Card, Hint, Row, Section, Stepper } from './list';
import {
  ASPECT_NAMES,
  colors,
  FONT,
  formatDegree,
  formatLongitude,
  POINT_NAMES,
} from './theme';
import { Button, Header } from './widgets';

export interface Person {
  name: string;
  chart: ChartResult;
}

export function SynastryScreen({
  a,
  b,
  onBack,
}: {
  a: Person;
  b: Person;
  onBack: () => void;
}) {
  const { width } = useWindowDimensions();
  const [view, setView] = useState<'synastry' | 'composite'>('synastry');
  const size = Math.min(width - 40, 520);
  const aspects = useMemo(() => synastryAspects(b.chart, a.chart), [a, b]);
  const composite = useMemo(() => compositeChart(a.chart, b.chart), [a, b]);
  const label = (k: string) => POINT_NAMES[k] ?? k;

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Header title="التوافق" onBack={onBack} />
      <Text style={styles.subtitle}>{`${a.name} و${b.name}`}</Text>
      <Stepper
        items={[
          {
            label: 'المقارنة',
            active: view === 'synastry',
            onPress: () => setView('synastry'),
          },
          {
            label: 'الخريطة المركّبة',
            active: view === 'composite',
            onPress: () => setView('composite'),
          },
        ]}
      />

      {view === 'synastry' ? (
        <>
          <View style={styles.wheel}>
            <ChartWheel
              chart={a.chart}
              outer={b.chart}
              aspects={aspects.filter(
                x =>
                  x.kind !== 'conjunction' &&
                  x.b !== 'asc' &&
                  x.b !== 'mc' &&
                  x.a !== 'asc' &&
                  x.a !== 'mc',
              )}
              size={size}
            />
          </View>
          <Hint>{`الداخل: ${a.name}. الحلقة الذهبية الخارجية: ${b.name}.`}</Hint>
          <Section title="الجوانب بين الخريطتين" />
          <Card>
            {aspects.map((x, i) => (
              <Row
                key={`${x.a}-${x.b}`}
                last={i === aspects.length - 1}
                name={`${label(x.a)} (${b.name}) ${
                  ASPECT_NAMES[x.kind]
                } ${label(x.b)} (${a.name})`}
                value={formatDegree(x.orb)}
              />
            ))}
          </Card>
          <Hint>
            السماح ست درجات، وثمانٍ إذا كان أحد الطرفين الشمس أو القمر.
          </Hint>
        </>
      ) : (
        <>
          <View style={styles.wheel}>
            <ChartWheel chart={composite} size={size} />
          </View>
          <Section title="مواقع الخريطة المركّبة" />
          <Card>
            {composite.bodies.map(x => (
              <Row
                key={x.key}
                name={label(x.key)}
                value={formatLongitude(x.lon)}
              />
            ))}
            {composite.houses ? (
              <>
                <Row
                  name="الطالع"
                  value={formatLongitude(composite.houses.asc)}
                />
                <Row
                  name="وسط السماء"
                  value={formatLongitude(composite.houses.mc)}
                  last
                />
              </>
            ) : null}
          </Card>
          <Hint>
            كل موقع هو منتصف القوس الأقصر بين موقعي الشخصين، والطالع ووسط السماء
            منتصف زوايا الخريطتين، دون رؤوس بيوت.
          </Hint>
        </>
      )}
      <Button label="رجوع" kind="secondary" onPress={onBack} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 20, gap: 14, paddingBottom: 40 },
  subtitle: {
    fontFamily: FONT,
    color: colors.muted,
    fontSize: 14,
    textAlign: 'right',
  },
  wheel: { alignItems: 'center' },
});
