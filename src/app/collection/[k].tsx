import { Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Text, View } from 'react-native';
import { LoadError } from '../../components/kit';
import { Empty, JobRow } from '../../components/ui';
import { collection } from '../../lib/account';
import type { JobCard } from '../../lib/api';
import { useStore } from '../../lib/store';
import { colors } from '../../lib/theme';

export default function Collection() {
  const site = useStore((s) => s.site)!;
  const { k, title } = useLocalSearchParams<{ k: string; title?: string }>();
  const [jobs, setJobs] = useState<JobCard[]>([]);
  const [intro, setIntro] = useState('');
  const [head, setHead] = useState(title ?? '');
  const [page, setPage] = useState(1);
  const [more, setMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = (p: number) => {
    setLoading(true);
    setError('');
    collection(site, k, p)
      .then((r) => {
        setJobs((x) => (p === 1 ? r.jobs : [...x, ...r.jobs]));
        setIntro(r.intro);
        setHead(r.title);
        setMore(r.more);
        setPage(p);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  };
  useEffect(() => load(1), [site, k]); // eslint-disable-line react-hooks/exhaustive-deps

  if (error && !jobs.length) return <LoadError text={error} retry={() => load(1)} />;
  return (
    <>
      <Stack.Screen options={{ title: head }} />
      <FlatList
        data={jobs}
        keyExtractor={(j) => String(j.id)}
        renderItem={({ item }) => <JobRow job={{ ...item, site }} />}
        contentContainerStyle={{ paddingBottom: 30 }}
        ListHeaderComponent={intro ? <Text style={{ color: colors.text, fontSize: 14, lineHeight: 20, padding: 16, paddingBottom: 6 }}>{intro}</Text> : undefined}
        ListEmptyComponent={loading ? undefined : <Empty icon="briefcase-outline" title="No jobs here right now" text="New jobs are added every day. Check back soon." />}
        onEndReachedThreshold={0.4}
        onEndReached={() => more && !loading && load(page + 1)}
        ListFooterComponent={loading ? <ActivityIndicator color={colors.brand} style={{ margin: 24 }} /> : <View style={{ height: 10 }} />}
      />
    </>
  );
}
