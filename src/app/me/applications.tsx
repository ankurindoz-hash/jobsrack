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
          const key = item.status === 'new' && item.viewed ? 'viewed' : item.status;
          const s = STATUS[key] ?? STATUS.new;
          const steps = [
            { label: 'Sent', on: true },
            { label: 'Viewed', on: !!item.viewed || item.status !== 'new' },
            { label: item.status === 'rejected' ? 'Not selected' : 'Shortlisted', on: item.status === 'shortlisted' || item.status === 'rejected', bad: item.status === 'rejected' },
          ];
          return (
            <View>
              <Text style={{ marginHorizontal: 18, marginBottom: 4, fontSize: 13, color: s.color, fontWeight: '700' }}>
                {s.label} · applied {timeAgo(item.applied)}
              </Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginHorizontal: 18, marginBottom: 6 }}>
                {steps.map((x, i) => (
                  <View key={i} style={{ flexDirection: 'row', alignItems: 'center', flex: i < 2 ? 1 : 0 }}>
                    <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: x.on ? (x.bad ? colors.danger : colors.brand) : colors.line }} />
                    <Text style={{ fontSize: 11, color: x.on ? colors.ink : colors.muted, marginLeft: 4 }}>{x.label}</Text>
                    {i < 2 && <View style={{ flex: 1, height: 2, marginHorizontal: 6, backgroundColor: steps[i + 1].on ? colors.brand : colors.line }} />}
                  </View>
                ))}
              </View>
              <JobRow job={item.job} />
            </View>
          );
        }}
      />
    </>
  );
}
