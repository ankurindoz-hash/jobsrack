import { router, Stack } from 'expo-router';
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { Loading, LoadError, useLoad } from '../../components/kit';
import { Empty } from '../../components/ui';
import { threads } from '../../lib/account';
import { timeAgo } from '../../lib/api';
import { useStore } from '../../lib/store';
import { colors } from '../../lib/theme';

export default function Threads() {
  const site = useStore((s) => s.site)!;
  const emp = useStore((s) => s.auth?.user.role === 'employer');
  const { data, error, loading, reload } = useLoad(() => threads(site), [site]);
  if (!data) return loading ? <Loading /> : <LoadError text={error} retry={reload} />;
  return (
    <>
      <Stack.Screen options={{ title: 'Messages' }} />
      <FlatList
        data={data}
        keyExtractor={(t) => t.id}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={reload} tintColor={colors.brand} />}
        ListEmptyComponent={<Empty icon="chatbubbles-outline" title="No messages yet" text={emp ? 'Message an applicant or candidate and the conversation shows up here.' : 'When an employer messages you about a job, it shows up here.'} />}
        renderItem={({ item }) => (
          <Pressable onPress={() => router.push({ pathname: '/messages/[id]', params: { id: item.id } })} style={({ pressed }) => [st.row, pressed && { backgroundColor: '#F9FAFB' }]}>
            <View style={st.avatar}>
              <Text style={st.avatarText}>{(item.with || '?').slice(0, 1).toUpperCase()}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row' }}>
                <Text style={[st.name, item.unread && { fontWeight: '800' }]} numberOfLines={1}>
                  {item.with}
                </Text>
                <Text style={st.time}>{timeAgo(item.time)}</Text>
              </View>
              {!!item.job && (
                <Text style={st.job} numberOfLines={1}>
                  {item.job}
                </Text>
              )}
              <Text style={[st.last, item.unread && { color: colors.ink, fontWeight: '600' }]} numberOfLines={1}>
                {item.last}
              </Text>
            </View>
            {item.unread && <View style={st.dot} />}
          </Pressable>
        )}
      />
    </>
  );
}

const st = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 14, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: colors.line },
  avatar: { width: 42, height: 42, borderRadius: 21, backgroundColor: colors.navy, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  name: { flex: 1, fontSize: 15.5, fontWeight: '600', color: colors.ink },
  time: { fontSize: 12, color: colors.muted },
  job: { fontSize: 13, color: colors.brand, marginTop: 1 },
  last: { fontSize: 14, color: colors.muted, marginTop: 2 },
  dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.brand },
});
