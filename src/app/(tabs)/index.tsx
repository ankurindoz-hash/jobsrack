import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, Empty, JobRow } from '../../components/ui';
import { searchJobs, SITES, type JobCard } from '../../lib/api';
import { syncAlerts } from '../../lib/push';
import { addAlert, useStore } from '../../lib/store';
import { colors } from '../../lib/theme';

export default function Jobs() {
  const site = useStore((s) => s.site);
  const params = useLocalSearchParams<{ q?: string; loc?: string }>();
  const [q, setQ] = useState(params.q ?? '');
  const [loc, setLoc] = useState(params.loc ?? '');
  const [items, setItems] = useState<JobCard[]>([]);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [alertMsg, setAlertMsg] = useState('');
  const active = useRef({ q: params.q ?? '', loc: params.loc ?? '' });
  const reqId = useRef(0);

  const load = useCallback(
    async (p: number, mode: 'new' | 'more' | 'refresh') => {
      if (!site) return;
      const id = ++reqId.current;
      if (mode === 'refresh') setRefreshing(true);
      else setLoading(true);
      setError('');
      try {
        const r = await searchJobs(site, active.current.q, active.current.loc, p);
        if (id !== reqId.current) return;
        const got = r.items.map((j) => ({ ...j, site }));
        setItems((prev) => (mode === 'more' ? [...prev, ...got.filter((g) => !prev.some((x) => x.id === g.id))] : got));
        setPage(r.page);
        setPages(r.pages);
        setTotal(r.total);
      } catch (e: any) {
        if (id === reqId.current) setError(e.message);
      } finally {
        if (id === reqId.current) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    },
    [site]
  );

  useEffect(() => {
    if (params.q !== undefined || params.loc !== undefined) {
      setQ(params.q ?? '');
      setLoc(params.loc ?? '');
      active.current = { q: params.q ?? '', loc: params.loc ?? '' };
    }
    setItems([]);
    load(1, 'new');
  }, [site, params.q, params.loc, load]);

  const submit = () => {
    active.current = { q: q.trim(), loc: loc.trim() };
    setAlertMsg('');
    load(1, 'new');
  };

  const saveAlert = async () => {
    const added = addAlert({ q: active.current.q, loc: active.current.loc });
    setAlertMsg(added ? 'Alert saved. We will notify you about new jobs like these.' : 'You already have this alert.');
    if (added) {
      const ok = await syncAlerts(true);
      if (!ok) setAlertMsg('Alert saved. Turn on notifications in Settings to get alerts on this phone.');
    }
  };

  if (!site) return null;
  const label = active.current.q || active.current.loc ? `${active.current.q || 'Jobs'}${active.current.loc ? ` in ${active.current.loc}` : ''}` : `Latest jobs in ${SITES[site].short}`;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['top']}>
      <View style={st.head}>
        <View style={st.brandRow}>
          <Text style={st.brand}>JobsRack</Text>
          <Pressable onPress={() => router.push('/welcome')} style={st.country} accessibilityLabel="Change country">
            <Text style={st.countryText}>
              {SITES[site].flag} {SITES[site].short}
            </Text>
            <Ionicons name="chevron-down" size={14} color="#C9D2E3" />
          </Pressable>
        </View>
        <View style={st.searchBox}>
          <View style={st.field}>
            <Ionicons name="search" size={18} color={colors.muted} />
            <TextInput value={q} onChangeText={setQ} placeholder="Job title, keyword or company" placeholderTextColor="#98A2B3" style={st.input} returnKeyType="search" onSubmitEditing={submit} autoCorrect={false} />
          </View>
          <View style={[st.field, { borderTopWidth: 1, borderTopColor: colors.line }]}>
            <Ionicons name="location-outline" size={18} color={colors.muted} />
            <TextInput value={loc} onChangeText={setLoc} placeholder={site === 'gl' ? 'City or country' : `City, e.g. ${SITES[site].example}`} placeholderTextColor="#98A2B3" style={st.input} returnKeyType="search" onSubmitEditing={submit} autoCorrect={false} />
          </View>
          <Button title="Find jobs" onPress={submit} style={{ margin: 8, marginTop: 4 }} />
        </View>
      </View>
      <FlatList
        data={items}
        keyExtractor={(j) => String(j.id)}
        renderItem={({ item }) => <JobRow job={item} />}
        contentContainerStyle={{ paddingTop: 12, paddingBottom: 24 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(1, 'refresh')} tintColor={colors.brand} />}
        onEndReachedThreshold={0.6}
        onEndReached={() => {
          if (!loading && page < pages) load(page + 1, 'more');
        }}
        ListHeaderComponent={
          items.length || loading ? (
            <View style={st.listHead}>
              <Text style={st.count}>
                {label}
              </Text>
              {(active.current.q || active.current.loc) && total > 0 ? (
                <Pressable onPress={saveAlert} style={st.alertBtn} accessibilityRole="button">
                  <Ionicons name="notifications-outline" size={16} color={colors.brand} />
                  <Text style={st.alertText}>Get alerts for this search</Text>
                </Pressable>
              ) : null}
              {!!alertMsg && <Text style={st.alertMsg}>{alertMsg}</Text>}
            </View>
          ) : undefined
        }
        ListEmptyComponent={
          loading ? undefined : error ? (
            <Empty icon="cloud-offline-outline" title="Could not load jobs" text={error}>
              <Button title="Try again" kind="outline" onPress={() => load(1, 'new')} style={{ marginTop: 16 }} />
            </Empty>
          ) : (
            <Empty icon="search-outline" title="No jobs found" text="Try a different job title, a nearby city, or clear the location." />
          )
        }
        ListFooterComponent={loading ? <ActivityIndicator color={colors.brand} style={{ margin: 24 }} /> : undefined}
      />
    </SafeAreaView>
  );
}

const st = StyleSheet.create({
  head: { backgroundColor: colors.navy, paddingHorizontal: 14, paddingBottom: 14, paddingTop: 6 },
  brandRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  brand: { color: '#5FD3A0', fontWeight: '800', fontSize: 20 },
  country: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 6, paddingHorizontal: 10, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.1)' },
  countryText: { color: '#fff', fontWeight: '600', fontSize: 14 },
  searchBox: { backgroundColor: '#fff', borderRadius: 14, overflow: 'hidden' },
  field: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, gap: 8 },
  input: { flex: 1, fontSize: 16, paddingVertical: 12, color: colors.ink },
  listHead: { paddingHorizontal: 16, paddingBottom: 8 },
  count: { fontSize: 15, fontWeight: '700', color: colors.ink },
  countN: { fontWeight: '400', color: colors.muted },
  alertBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8, alignSelf: 'flex-start', paddingVertical: 6, paddingHorizontal: 10, borderRadius: 999, borderWidth: 1, borderColor: colors.brand, backgroundColor: '#fff' },
  alertText: { color: colors.brand, fontWeight: '600', fontSize: 13 },
  alertMsg: { color: colors.text, fontSize: 13, marginTop: 6 },
});
