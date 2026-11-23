import { Stack, useLocalSearchParams } from 'expo-router';
import { ScrollView, Text } from 'react-native';
import { Html } from '../../components/Html';
import { Loading, LoadError, useLoad } from '../../components/kit';
import { page } from '../../lib/account';
import { useStore } from '../../lib/store';
import { colors } from '../../lib/theme';

/** Privacy policy, terms and other site pages, shown natively. */
export default function SitePage() {
  const site = useStore((s) => s.site)!;
  const slug = String(useLocalSearchParams<{ slug: string }>().slug);
  const { data, error, loading, reload } = useLoad(() => page(site, slug), [site, slug]);
  if (!data) return loading ? <Loading /> : <LoadError text={error} retry={reload} />;
  return (
    <ScrollView contentContainerStyle={{ padding: 18, paddingBottom: 40 }}>
      <Stack.Screen options={{ title: data.title }} />
      <Text style={{ fontSize: 24, fontWeight: '800', color: colors.ink, marginBottom: 10 }}>{data.title}</Text>
      <Html html={data.content} />
    </ScrollView>
  );
}
