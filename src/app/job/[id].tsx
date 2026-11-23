import { Ionicons } from '@expo/vector-icons';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Share, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Badge, Button, Empty, Pay } from '../../components/ui';
import { companyByName } from '../../lib/account';
import { getJob, htmlToBlocks, timeAgo, type JobDetail, type SiteCode } from '../../lib/api';
import { openInApp } from '../../lib/nav';
import { getState, hasApplied, isSaved, toggleSaved, useStore } from '../../lib/store';
import { colors, radius } from '../../lib/theme';

export default function JobScreen() {
  const p = useLocalSearchParams<{ id: string; site?: string }>();
  const storeSite = useStore((s) => s.site);
  const site = ((p.site as SiteCode) || storeSite) as SiteCode;
  const id = Number(p.id);
  const [job, setJob] = useState<JobDetail | null>(null);
  const [error, setError] = useState('');
  const saved = useStore((s) => isSaved(s, site, id));
  const applied = useStore((s) => hasApplied(s, site, id));

  const load = () => {
    setError('');
    getJob(site, id)
      .then((j) => setJob({ ...j, site }))
      .catch((e) => {
        // Offline: fall back to the saved copy if there is one
        const cached = getState().saved.find((x) => x.id === id && x.site === site);
        if (cached) setJob({ ...(cached as any), content: '', highlights: null, questions: [], ontario: null, apply_url: '', open: true, company_url: '' });
        setError(e.message);
      });
  };
  useEffect(load, [site, id]); // eslint-disable-line react-hooks/exhaustive-deps

  const blocks = useMemo(() => (job?.content ? htmlToBlocks(job.content) : []), [job?.content]);

  if (!job) {
    return error ? (
      <Empty icon="cloud-offline-outline" title="Could not open this job" text={error}>
        <Button title="Try again" kind="outline" onPress={load} style={{ marginTop: 16 }} />
      </Empty>
    ) : (
      <ActivityIndicator color={colors.brand} style={{ marginTop: 40 }} />
    );
  }

  const apply = () => {
    if (job.apply_url) openInApp(job.apply_url, job.company || 'Apply');
    else router.push({ pathname: '/apply/[id]', params: { id: String(job.id), site } });
  };
  const openCompany = () =>
    companyByName(site, job.company)
      .then((c) => router.push({ pathname: '/companies/[id]', params: { id: String(c.id) } }))
      .catch(() => {});
  const share = () => Share.share({ message: `${job.title}${job.company ? ` at ${job.company}` : ''} – ${job.url}`, url: job.url });
  const hl = job.highlights;

  return (
    <View style={{ flex: 1 }}>
      <Stack.Screen
        options={{
          title: '',
          headerRight: () => (
            <View style={{ flexDirection: 'row', gap: 18 }}>
              <Pressable onPress={share} hitSlop={10} accessibilityLabel="Share job">
                <Ionicons name="share-outline" size={22} color={colors.brand} />
              </Pressable>
              <Pressable onPress={() => toggleSaved(job)} hitSlop={10} accessibilityLabel={saved ? 'Remove from saved jobs' : 'Save job'}>
                <Ionicons name={saved ? 'bookmark' : 'bookmark-outline'} size={22} color={colors.brand} />
              </Pressable>
            </View>
          ),
        }}
      />
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 120 }}>
        {!!error && <Text style={st.offline}>You are offline. Showing your saved copy.</Text>}
        <Text style={st.title}>{job.title}</Text>
        {!!job.company && (
          <Pressable onPress={openCompany}>
            <Text style={st.company}>{job.company}</Text>
          </Pressable>
        )}
        <Text style={st.meta}>
          {job.city ? `${job.city} · ` : ''}Posted {timeAgo(job.posted)}
        </Text>
        <View style={st.tags}>
          <Pay text={job.pay} />
          {job.badges.map((b) => (
            <Badge key={b} label={b} />
          ))}
        </View>

        {hl && (hl.shifts.length > 0 || hl.benefits.length > 0) && (
          <View style={st.card}>
            {hl.shifts.length > 0 && (
              <>
                <Text style={st.h}>Schedule</Text>
                <View style={st.chips}>
                  {hl.shifts.map((x) => (
                    <Text key={x} style={st.chip}>
                      {x}
                    </Text>
                  ))}
                </View>
              </>
            )}
            {hl.benefits.length > 0 && (
              <>
                <Text style={[st.h, hl.shifts.length > 0 && { marginTop: 12 }]}>Benefits</Text>
                <View style={st.chips}>
                  {hl.benefits.map((x) => (
                    <Text key={x} style={st.chip}>
                      {x}
                    </Text>
                  ))}
                </View>
              </>
            )}
          </View>
        )}

        {job.ontario && (job.ontario.vac || job.ontario.ai) ? (
          <View style={st.card}>
            <Text style={st.h}>About this posting</Text>
            {job.ontario.vac === 'yes' && <Text style={st.p}>• This is a current vacancy: the job is open now.</Text>}
            {job.ontario.vac === 'no' && <Text style={st.p}>• This posting is for future openings.</Text>}
            {job.ontario.ai === 'no' && <Text style={st.p}>• The employer does not use AI to screen applicants.</Text>}
            {job.ontario.ai === 'yes' && <Text style={st.p}>• The employer uses AI to screen applicants.</Text>}
          </View>
        ) : null}

        {blocks.length > 0 && (
          <View style={st.card}>
            <Text style={st.h}>Job description</Text>
            {blocks.map((b, i) =>
              b.type === 'h' ? (
                <Text key={i} style={[st.h, { marginTop: 12 }]}>
                  {b.text}
                </Text>
              ) : b.type === 'li' ? (
                <View key={i} style={{ flexDirection: 'row', marginTop: 4 }}>
                  <Text style={st.p}>•  </Text>
                  <Text style={[st.p, { flex: 1 }]}>{b.text}</Text>
                </View>
              ) : (
                <Text key={i} style={[st.p, { marginTop: 8 }]}>
                  {b.text}
                </Text>
              )
            )}
          </View>
        )}
      </ScrollView>
      <SafeAreaView edges={['bottom']} style={st.bar}>
        {applied ? (
          <View style={st.appliedBox}>
            <Ionicons name="checkmark-circle" size={20} color={colors.brand} />
            <Text style={st.appliedText}>You applied to this job</Text>
          </View>
        ) : job.open ? (
          <Button title={job.apply_url ? 'Apply on company site' : 'Apply now'} icon={job.apply_url ? 'open-outline' : 'paper-plane-outline'} onPress={apply} />
        ) : (
          <View style={st.appliedBox}>
            <Ionicons name="time-outline" size={20} color={colors.muted} />
            <Text style={[st.appliedText, { color: colors.muted }]}>Applications for this job are closed</Text>
          </View>
        )}
      </SafeAreaView>
    </View>
  );
}

const st = StyleSheet.create({
  offline: { backgroundColor: '#FFF4E5', color: '#B54708', padding: 10, borderRadius: 8, marginBottom: 12, fontSize: 13 },
  title: { fontSize: 24, fontWeight: '800', color: colors.ink, lineHeight: 30 },
  company: { fontSize: 16, color: colors.brand, fontWeight: '600', marginTop: 4 },
  meta: { fontSize: 14, color: colors.muted, marginTop: 4 },
  tags: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 12 },
  card: { backgroundColor: '#fff', borderRadius: radius, borderWidth: 1, borderColor: colors.line, padding: 14, marginTop: 12 },
  h: { fontSize: 16, fontWeight: '700', color: colors.ink },
  p: { fontSize: 15, color: colors.text, lineHeight: 22 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 },
  chip: { borderWidth: 1, borderColor: colors.line, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4, fontSize: 13, color: colors.text, overflow: 'hidden' },
  link: { color: colors.brand, fontWeight: '600', fontSize: 15, textAlign: 'center' },
  bar: { position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: colors.line, paddingHorizontal: 16, paddingTop: 10, paddingBottom: 10 },
  appliedBox: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 12 },
  appliedText: { fontSize: 15, fontWeight: '600', color: colors.brand },
});
