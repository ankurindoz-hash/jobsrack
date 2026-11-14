import { router } from 'expo-router';
import { useCallback, useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { Button, Empty, JobRow } from '../../components/ui';
import { jobsByIds, type SiteCode } from '../../lib/api';
import { getState, updateSaved, useStore } from '../../lib/store';
import { colors } from '../../lib/theme';

export default function Saved() {
  const saved = useStore((s) => s.saved);
  const [refreshing, setRefreshing] = useState(false);
  const [note, setNote] = useState('');

  // Refresh saved jobs and drop ones that are no longer open
  const refresh = useCallback(async () => {
    setRefreshing(true);
    setNote('');
    try {
      const bySite: Record<string, number[]> = {};
      getState().saved.forEach((j) => (bySite[j.site ?? 'ca'] ||= []).push(j.id));
      let removed = 0;
      let next = [...getState().saved];
      for (const site of Object.keys(bySite)) {
        const r = await jobsByIds(site as SiteCode, bySite[site]);
        const live = new Map(r.items.map((j) => [j.id, j]));
        next = next.flatMap((j) => {
          if ((j.site ?? 'ca') !== site) return [j];
          const fresh = live.get(j.id);
          if (!fresh) {
            removed++;
            return [];
          }
          return [{ ...fresh, site: j.site }];
        });
      }
      updateSaved(next);
      if (removed) setNote(`${removed} saved ${removed === 1 ? 'job has' : 'jobs have'} closed and ${removed === 1 ? 'was' : 'were'} removed.`);
    } catch (e: any) {
      setNote(e.message);
    } finally {
      setRefreshing(false);
    }
  }, []);

  return (
    <FlatList
      data={saved}
      keyExtractor={(j) => `${j.site}:${j.id}`}
      renderItem={({ item }) => <JobRow job={item} />}
      contentContainerStyle={{ paddingTop: 12, paddingBottom: 24, flexGrow: 1 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.brand} />}
      ListHeaderComponent={
        saved.length ? (
          <View style={st.head}>
            <Text style={st.text}>
              {saved.length} saved {saved.length === 1 ? 'job' : 'jobs'} · available offline · pull down to refresh
            </Text>
            {!!note && <Text style={[st.text, { color: colors.ink, marginTop: 4 }]}>{note}</Text>}
          </View>
        ) : undefined
      }
      ListEmptyComponent={
        <Empty icon="bookmark-outline" title="No saved jobs yet" text="Tap the bookmark on any job to keep it here. Saved jobs work even without internet.">
          <Button title="Find jobs" kind="outline" onPress={() => router.navigate('/')} style={{ marginTop: 16 }} />
        </Empty>
      }
    />
  );
}

const st = StyleSheet.create({
  head: { paddingHorizontal: 16, paddingBottom: 8 },
  text: { fontSize: 13, color: colors.muted },
});
