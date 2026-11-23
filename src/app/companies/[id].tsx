import { Stack, useLocalSearchParams } from 'expo-router';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { Html } from '../../components/Html';
import { k, Loading, LoadError, useLoad } from '../../components/kit';
import { JobRow } from '../../components/ui';
import { company } from '../../lib/account';
import { timeAgo } from '../../lib/api';
import { openInApp } from '../../lib/nav';
import { useStore } from '../../lib/store';
import { colors } from '../../lib/theme';

export default function Company() {
  const site = useStore((s) => s.site)!;
  const id = String(useLocalSearchParams<{ id: string }>().id);
  const { data: c, error, loading, reload } = useLoad(() => company(site, id), [site, id]);
  if (!c) return loading ? <Loading /> : <LoadError text={error} retry={reload} />;
  return (
    <ScrollView contentContainerStyle={{ paddingVertical: 16, paddingBottom: 40 }}>
      <Stack.Screen options={{ title: c.name }} />
      <View style={{ paddingHorizontal: 16 }}>
        <Text style={{ fontSize: 24, fontWeight: '800', color: colors.ink }}>{c.name}</Text>
        <Text style={[k.sub, { marginTop: 4 }]}>
          {c.city ? `${c.city} · ` : ''}
          {c.jobs} open {c.jobs === 1 ? 'job' : 'jobs'}
          {c.reviews ? ` · ★ ${c.rating.toFixed(1)} from ${c.reviews} ${c.reviews === 1 ? 'review' : 'reviews'}` : ''}
        </Text>
        {!!c.website && (
          <Pressable onPress={() => openInApp(c.website, c.name)}>
            <Text style={{ color: colors.brand, marginTop: 6, fontWeight: '600' }}>Company website</Text>
          </Pressable>
        )}
        {!!c.about && (
          <View style={[k.card, { marginTop: 14 }]}>
            <Html html={c.about} />
          </View>
        )}
        <Text style={[k.h, { marginTop: 14 }]}>Open jobs</Text>
      </View>
      {c.jobs_list.length ? c.jobs_list.map((j) => <JobRow key={j.id} job={j} />) : <Text style={[k.p, { paddingHorizontal: 18 }]}>No open jobs right now.</Text>}
      {c.review_list.length > 0 && (
        <View style={{ paddingHorizontal: 16, marginTop: 10 }}>
          <Text style={k.h}>Reviews</Text>
          {c.review_list.map((r, i) => (
            <View key={i} style={k.card}>
              <Text style={{ color: '#B54708', fontSize: 15 }}>{'★'.repeat(r.stars)}{'☆'.repeat(5 - r.stars)}</Text>
              {!!r.title && <Text style={[k.title, { marginTop: 4 }]}>{r.title}</Text>}
              <Text style={[k.p, { marginTop: 4 }]}>{r.text}</Text>
              <Text style={[k.sub, { marginTop: 6 }]}>{timeAgo(r.time)}</Text>
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );
}
