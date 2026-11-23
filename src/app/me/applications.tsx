import { Stack } from 'expo-router';
import { FlatList, RefreshControl, Text, View } from 'react-native';
import { Loading, LoadError, useLoad } from '../../components/kit';
import { Empty, JobRow } from '../../components/ui';
import { myApplications } from '../../lib/account';
import { timeAgo } from '../../lib/api';
import { useStore } from '../../lib/store';
import { colors } from '../../lib/theme';

const STATUS: Record<string, { label: string; color: string }> = {
  new: { label: 'Sent', color: colors.muted },
  viewed: { label: 'Viewed by employer', color: '#1D4ED8' },
  shortlisted: { label: 'Shortlisted', color: colors.brand },
  rejected: { label: 'Not selected', color: colors.danger },
};

export default function Applications() {
  const site = useStore((s) => s.site)!;
  const { data, error, loading, reload } = useLoad(() => myApplications(site), [site]);
  if (!data) return loading ? <Loading /> : <LoadError text={error} retry={reload} />;
  return (
    <>
      <Stack.Screen options={{ title: 'My applications' }} />
      <FlatList
        data={data}
        keyExtractor={(a) => String(a.job.id)}
        contentContainerStyle={{ paddingVertical: 12 }}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={reload} tintColor={colors.brand} />}
        ListEmptyComponent={<Empty icon="paper-plane-outline" title="No applications yet" text="Jobs you apply to while signed in show up here, with their status." />}
        renderItem={({ item }) => {
          const s = STATUS[item.status] ?? STATUS.new;
          return (
            <View>
              <Text style={{ marginHorizontal: 18, marginBottom: 4, fontSize: 13, color: s.color, fontWeight: '700' }}>
                {s.label} · applied {timeAgo(item.applied)}
              </Text>
              <JobRow job={item.job} />
            </View>
          );
        }}
      />
    </>
  );
}
