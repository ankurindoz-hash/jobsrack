import { Stack, useLocalSearchParams } from 'expo-router';
import { Image, ScrollView, Text } from 'react-native';
import { Html } from '../../components/Html';
import { k, Loading, LoadError, useLoad } from '../../components/kit';
import { post } from '../../lib/account';
import { timeAgo } from '../../lib/api';
import { useStore } from '../../lib/store';
import { colors } from '../../lib/theme';

export default function Article() {
  const site = useStore((s) => s.site)!;
  const id = Number(useLocalSearchParams<{ id: string }>().id);
  const { data: p, error, loading, reload } = useLoad(() => post(site, id), [site, id]);
  if (!p) return loading ? <Loading /> : <LoadError text={error} retry={reload} />;
  return (
    <ScrollView contentContainerStyle={{ padding: 18, paddingBottom: 40 }}>
      <Stack.Screen options={{ title: '' }} />
      {!!p.image && <Image source={{ uri: p.image }} style={{ width: '100%', height: 190, borderRadius: 12, marginBottom: 14 }} resizeMode="cover" />}
      <Text style={{ fontSize: 24, fontWeight: '800', color: colors.ink, lineHeight: 30 }}>{p.title}</Text>
      <Text style={[k.sub, { marginTop: 6, marginBottom: 12 }]}>{timeAgo(p.time)}</Text>
      <Html html={p.content} />
    </ScrollView>
  );
}
