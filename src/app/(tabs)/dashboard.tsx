import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useCallback } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { EmployerGate } from '../../components/EmployerGate';
import { k, Loading, LoadError, useLoad } from '../../components/kit';
import { Button, Empty } from '../../components/ui';
import { employerJobs, type EmployerJob } from '../../lib/account';
import { timeAgo } from '../../lib/api';
import { useStore } from '../../lib/store';
import { colors } from '../../lib/theme';

const STATUS: Record<EmployerJob['status'], { label: string; bg: string; fg: string }> = {
  active: { label: 'Live', bg: '#E8F5E9', fg: '#1B5E20' },
  pending: { label: 'In review', bg: '#FFF4E5', fg: '#B54708' },
  closed: { label: 'Closed', bg: '#F2F4F7', fg: '#475467' },
  expired: { label: 'Expired', bg: '#FDECEA', fg: '#B42318' },
};

function MyJobs() {
  const site = useStore((s) => s.site)!;
  const { data, error, loading, reload } = useLoad(() => employerJobs(site), [site]);
  useFocusEffect(useCallback(() => reload(), [reload]));
  if (!data) return loading ? <Loading /> : <LoadError text={error} retry={reload} />;
  const live = data.filter((j) => j.status === 'active');
  const total = data.reduce((n, j) => n + j.applicants, 0);
  return (
    <FlatList
      data={data}
      keyExtractor={(j) => String(j.id)}
      contentContainerStyle={{ padding: 14 }}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={reload} tintColor={colors.brand} />}
      ListHeaderComponent={
        data.length ? (
          <View style={st.stats}>
            <View style={st.stat}>
              <Text style={st.num}>{live.length}</Text>
              <Text style={k.sub}>live jobs</Text>
            </View>
            <View style={st.stat}>
              <Text style={st.num}>{total}</Text>
              <Text style={k.sub}>applicants</Text>
            </View>
            <Pressable style={st.stat} onPress={() => router.push('/messages')}>
              <Ionicons name="chatbubbles-outline" size={22} color={colors.brand} />
              <Text style={k.sub}>messages</Text>
            </Pressable>
          </View>
        ) : undefined
      }
      ListEmptyComponent={
        <Empty icon="briefcase-outline" title="Post your first job" text="It's free. Your job goes live on JobsRack and in Google job search.">
          <Button title="Post a job" icon="add" onPress={() => router.push('/post')} style={{ marginTop: 16 }} />
        </Empty>
      }
      renderItem={({ item }) => {
        const s = STATUS[item.status];
        return (
          <Pressable onPress={() => router.push({ pathname: '/employer/job/[id]', params: { id: String(item.id) } })} style={({ pressed }) => [k.card, pressed && { opacity: 0.85 }]}>
            <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}>
              <View style={{ flex: 1 }}>
                <Text style={k.title}>{item.title}</Text>
                <Text style={k.sub}>
                  {item.city ? `${item.city} · ` : ''}posted {timeAgo(item.posted)}
                </Text>
              </View>
              <Text style={[st.badge, { backgroundColor: s.bg, color: s.fg }]}>{s.label}</Text>
            </View>
            <View style={{ flexDirection: 'row', gap: 18, marginTop: 10 }}>
              <Text style={st.metric}>
                <Text style={st.metricNum}>{item.applicants}</Text> applicants
              </Text>
              <Text style={st.metric}>
                <Text style={st.metricNum}>{item.views}</Text> views
              </Text>
              {!!item.pay && <Text style={[st.metric, { color: colors.payText }]}>{item.pay}</Text>}
            </View>
          </Pressable>
        );
      }}
    />
  );
}

export default function Dashboard() {
  return (
    <EmployerGate what="post jobs and see applicants">
      <MyJobs />
    </EmployerGate>
  );
}

const st = StyleSheet.create({
  stats: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  stat: { flex: 1, backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: colors.line, padding: 12, alignItems: 'center' },
  num: { fontSize: 22, fontWeight: '800', color: colors.ink },
  badge: { fontSize: 12, fontWeight: '700', paddingHorizontal: 9, paddingVertical: 3, borderRadius: 999, overflow: 'hidden' },
  metric: { fontSize: 13.5, color: colors.muted },
  metricNum: { fontWeight: '800', color: colors.ink },
});
