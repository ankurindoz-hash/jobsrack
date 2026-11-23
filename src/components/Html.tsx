import { Text, View } from 'react-native';
import { htmlToBlocks } from '../lib/api';
import { colors } from '../lib/theme';

/** Shows simple HTML (headings, paragraphs, lists) as native text. */
export function Html({ html }: { html: string }) {
  const blocks = htmlToBlocks(html || '');
  return (
    <View>
      {blocks.map((b, i) =>
        b.type === 'h' ? (
          <Text key={i} style={{ fontSize: 17, fontWeight: '700', color: colors.ink, marginTop: i ? 16 : 0, marginBottom: 4 }}>
            {b.text}
          </Text>
        ) : b.type === 'li' ? (
          <View key={i} style={{ flexDirection: 'row', marginTop: 4 }}>
            <Text style={{ fontSize: 15, color: colors.text, lineHeight: 22 }}>•  </Text>
            <Text style={{ flex: 1, fontSize: 15, color: colors.text, lineHeight: 22 }}>{b.text}</Text>
          </View>
        ) : (
          <Text key={i} style={{ fontSize: 15, color: colors.text, lineHeight: 22, marginTop: 8 }}>
            {b.text}
          </Text>
        )
      )}
    </View>
  );
}
