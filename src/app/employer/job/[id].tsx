import { Ionicons } from '@expo/vector-icons';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, FlatList, Linking, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ErrorText, Field, k, Loading, LoadError, useLoad } from '../../../components/kit';
import { Button, Empty } from '../../../components/ui';
import { applicants, employerJobs, setApplicantStatus, setJobStatus, startThread, type Applicant } from '../../../lib/account';
import { timeAgo } from '../../../lib/api';
import { openInApp } from '../../../lib/nav';
import { useStore } from '../../../lib/store';
import { colors } from '../../../lib/theme';

const TAG: Record<Applicant['status'], { label: string; color: string }> = {
  new: { label: 'New', color: '#1D4ED8' },
  shortlisted: { label: 'Shortlisted', color: colors.brand },
  rejected: { label: 'Not selected', color: colors.danger },
};

export default function JobApplicants() {
  const site = useStore((s) => s.site)!;
  const id = Number(useLocalSearchParams<{ id: string }>().id);
  const jobs = useLoad(() => employerJobs(site), [site]);
  const { data, error, loading, reload, setData } = useLoad(() => applicants(site, id), [site, id]);
  const [open, setOpen] = useState<Applicant | null>(null);
  const [filter, setFilter] = useState<'all' | Applicant['status']>('all');
  const job = jobs.data?.find((j) => j.id === id);

  const toggleJob = () => {
    if (!job) return;
    const close = job.status === 'active' || job.status === 'pending';
    Alert.alert(close ? 'Close this job?' : 'Reopen this job?', close ? 'It stops showing on JobsRack and nobody new can apply.' : 'It goes back on JobsRack for 30 days.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: close ? 'Close job' : 'Reopen',
        onPress: async () => {
          try {
            await setJobStatus(site, id, close ? 'closed' : 'active');
            jobs.reload();
          } catch (e: any) {
            Alert.alert('Could not update', e.message);
          }
        },
      },
    ]);
  };

  const setStatus = async (a: Applicant, status: Applicant['status']) => {
    try {
      await setApplicantStatus(site, id, a.user_id, status);
      setData((data ?? []).map((x) => (x.id === a.id ? { ...x, status } : x)));
      setOpen({ ...a, status });
    } catch (e: any) {
      Alert.alert('Could not update', e.message);
    }
  };

  const list = (data ?? []).filter((a) => filter === 'all' || a.status === filter);

  return (
    <View style={{ flex: 1 }}>
      <Stack.Screen
        options={{
          title: job?.title ?? 'Applicants',
          headerRight: () => (
            <Pressable onPress={() => router.push({ pathname: '/employer/edit/[id]', params: { id: String(id) } })} hitSlop={10} accessibilityLabel="Edit job">
              <Ionicons name="create-outline" size={22} color={colors.brand} />
            </Pressable>
          ),
        }}
      />
      {job && (
        <View style={st.head}>
          <Text style={k.sub}>
            {job.applicants} applicants · {job.views} views · posted {timeAgo(job.posted)}
          </Text>
          <Pressable onPress={toggleJob}>
            <Text style={{ color: job.status === 'active' || job.status === 'pending' ? colors.danger : colors.brand, fontWeight: '700' }}>{job.status === 'active' || job.status === 'pending' ? 'Close job' : 'Reopen job'}</Text>
          </Pressable>
        </View>
      )}
      <View style={st.filters}>
        {(['all', 'new', 'shortlisted', 'rejected'] as const).map((f) => (
          <Pressable key={f} onPress={() => setFilter(f)} style={[k.chip, filter === f && k.chipOn]}>
            <Text style={[k.chipText, filter === f && { color: '#fff' }]}>{f === 'all' ? 'All' : TAG[f].label}</Text>
          </Pressable>
        ))}
      </View>
      {!data ? (
        loading ? <Loading /> : <LoadError text={error} retry={reload} />
      ) : (
        <FlatList
          data={list}
          keyExtractor={(a) => String(a.id)}
          contentContainerStyle={{ padding: 14 }}
          ListEmptyComponent={<Empty icon="people-outline" title={data.length ? 'Nobody here' : 'No applicants yet'} text={data.length ? undefined : 'New applications show up here and are emailed to you.'} />}
          renderItem={({ item }) => (
            <Pressable onPress={() => setOpen(item)} style={[k.card, { flexDirection: 'row', alignItems: 'center', gap: 12 }]}>
              <View style={{ flex: 1 }}>
                <Text style={k.title}>{item.name}</Text>
                <Text style={k.sub}>
                  {item.city ? `${item.city} · ` : ''}applied {timeAgo(item.applied)}
                </Text>
              </View>
              <Text style={{ color: TAG[item.status].color, fontWeight: '700', fontSize: 13 }}>{TAG[item.status].label}</Text>
            </Pressable>
          )}
        />
      )}
      <Modal visible={!!open} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setOpen(null)}>
        {open && <ApplicantSheet a={open} jobId={id} onClose={() => setOpen(null)} onStatus={(s) => setStatus(open, s)} />}
      </Modal>
    </View>
  );
}

function ApplicantSheet({ a, jobId, onClose, onStatus }: { a: Applicant; jobId: number; onClose: () => void; onStatus: (s: Applicant['status']) => void }) {
  const site = useStore((s) => s.site)!;
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const message = async () => {
    if (!a.user_id) return setErr('This person applied without an account. Please call or email them.');
    if (msg.trim().length < 2) return setErr('Please write a message.');
    setBusy(true);
    try {
      const r = await startThread(site, a.user_id, jobId, msg.trim());
      onClose();
      router.push({ pathname: '/messages/[id]', params: { id: r.id } });
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={st.sheetHead}>
        <Text style={{ fontSize: 20, fontWeight: '800', color: colors.ink, flex: 1 }}>{a.name}</Text>
        <Pressable onPress={onClose} hitSlop={12} accessibilityLabel="Close">
          <Ionicons name="close" size={26} color={colors.muted} />
        </Pressable>
      </View>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
        <Text style={k.sub}>
          {a.city ? `${a.city} · ` : ''}applied {timeAgo(a.applied)}
        </Text>
        <View style={{ flexDirection: 'row', gap: 10, marginTop: 14 }}>
          {!!a.phone && <Button title="Call" icon="call-outline" kind="outline" onPress={() => Linking.openURL(`tel:${a.phone}`)} style={{ flex: 1 }} />}
          {!!a.email && <Button title="Email" icon="mail-outline" kind="outline" onPress={() => Linking.openURL(`mailto:${a.email}`)} style={{ flex: 1 }} />}
        </View>
        {!!a.resume_url && <Button title="View resume" icon="document-text-outline" onPress={() => openInApp(a.resume_url, `${a.name} – resume`)} style={{ marginTop: 10 }} />}
        <View style={{ flexDirection: 'row', gap: 10, marginTop: 10 }}>
          <Button title={a.status === 'shortlisted' ? 'Shortlisted' : 'Shortlist'} icon="star-outline" kind={a.status === 'shortlisted' ? 'primary' : 'outline'} onPress={() => onStatus('shortlisted')} style={{ flex: 1 }} />
          <Button title={a.status === 'rejected' ? 'Not selected' : 'Reject'} icon="close-circle-outline" kind="outline" onPress={() => onStatus('rejected')} style={{ flex: 1 }} />
        </View>
        {!!a.cover && (
          <View style={[k.card, { marginTop: 14 }]}>
            <Text style={k.title}>Message from {a.name.split(' ')[0]}</Text>
            <Text style={[k.p, { marginTop: 6 }]}>{a.cover}</Text>
          </View>
        )}
        {a.answers.map((x, i) => (
          <View key={i} style={k.card}>
            <Text style={k.title}>{x.q}</Text>
            <Text style={[k.p, { marginTop: 4 }]}>{x.a}</Text>
          </View>
        ))}
        <View style={k.card}>
          <Text style={[k.title, { marginBottom: 8 }]}>Message {a.name.split(' ')[0]}</Text>
          <ErrorText text={err} />
          <Field label="" value={msg} onChangeText={setMsg} multiline placeholder="e.g. Thanks for applying. Are you free for a call tomorrow?" />
          <Button title={busy ? 'Sending…' : 'Send message'} icon="send-outline" onPress={message} disabled={busy} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const st = StyleSheet.create({
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#fff', padding: 14, borderBottomWidth: 1, borderBottomColor: colors.line },
  filters: { flexDirection: 'row', gap: 8, paddingHorizontal: 14, paddingTop: 12 },
  sheetHead: { flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: colors.line, backgroundColor: '#fff' },
});
