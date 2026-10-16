// The spiritual section: a grid of cards, three to a row. AGPL-3.0-or-later.

import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';

import { Hint } from './list';
import { colors, FONT } from './theme';
import { Header } from './widgets';

export type SpiritualPage = 'sign' | 'hours' | 'election' | 'match';

const CARDS: { key: SpiritualPage | null; title: string; glyph: string }[] = [
  { key: 'sign', title: 'البرج الروحاني', glyph: '♈︎' },
  { key: 'hours', title: 'الساعات الروحانية', glyph: '☉︎' },
  { key: 'election', title: 'الوقت المناسب', glyph: '☽︎' },
  { key: 'match', title: 'توافق الاسمين', glyph: '♀︎' },
  { key: null, title: 'قريباً', glyph: '✦' },
];

export function SpiritualScreen({
  onOpen,
  onBack,
}: {
  onOpen: (page: SpiritualPage) => void;
  onBack: () => void;
}) {
  // Three to a row: the screen width less the page padding and two gaps.
  const { width } = useWindowDimensions();
  const cardWidth = Math.floor((width - 2 * PAD - 2 * GAP) / 3);
  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Header title="القسم الروحاني" onBack={onBack} />
      <View style={styles.grid}>
        {CARDS.map(c => (
          <Pressable
            key={c.title}
            disabled={!c.key}
            onPress={() => c.key && onOpen(c.key)}
            style={({ pressed }) => [
              styles.card,
              { width: cardWidth },
              !c.key && styles.soon,
              pressed && styles.pressed,
            ]}
            accessibilityRole="button"
          >
            <Text style={[styles.glyph, !c.key && styles.dim]}>{c.glyph}</Text>
            <Text style={[styles.title, !c.key && styles.dim]}>{c.title}</Text>
          </Pressable>
        ))}
      </View>
      <Hint>أبواب أخرى من التراث الروحاني تُضاف هنا تباعاً.</Hint>
    </ScrollView>
  );
}

const PAD = 20;
const GAP = 10;

const styles = StyleSheet.create({
  content: { padding: PAD, gap: 16 },
  grid: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: GAP },
  card: {
    aspectRatio: 0.9,
    backgroundColor: colors.navyRaised,
    borderColor: colors.gold,
    borderWidth: 1,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    padding: 8,
  },
  soon: { borderColor: colors.line },
  pressed: { opacity: 0.6 },
  glyph: { color: colors.gold, fontSize: 30 },
  title: {
    fontFamily: FONT,
    color: colors.text,
    fontSize: 13.5,
    fontWeight: '600',
    textAlign: 'center',
  },
  dim: { color: colors.muted },
});
