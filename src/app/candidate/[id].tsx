import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Linking, ScrollView, Text, View } from 'react-native';
import { ErrorText, Field, k, Loading, LoadError, useLoad } from '../../components/kit';
import { Button } from '../../components/ui';
import { candidate, startThread } from '../../lib/account';
import { openInApp } from '../../lib/nav';
import { useStore } from '../../lib/store';
import { colors } from '../../lib/theme';

export default function CandidateProfile() {
  const site = useStore((s) => s.site)!;
  const id = Number(useLocalSearchParams<{ id: string }>().id);
  const { data: c, error, loading, reload } = useLoad(() => candidate(site, id), [site, id]);
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  if (!c) return loading ? <Loading /> : <LoadError text={error} retry={reload} />;

  const send = async () => {
    if (msg.trim().length < 5) return setErr('Please write a short message.');
    setBusy(true);
    setErr('');
    try {
      const r = await startThread(site, c.id, 0, msg.trim());
      router.replace({ pathname: '/messages/[id]', params: { id: r.id } });
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
      <Stack.Screen options={{ title: c.name }} />
      <Text style={{ fontSize: 24, fontWeight: '800', color: colors.ink }}>{c.name}</Text>
      <Text style={[k.sub, { marginTop: 4 }]}>{[c.headline, c.city].filter(Boolean).join(' · ')}</Text>
      <View style={{ flexDirection: 'row', gap: 10, marginTop: 14 }}>
        {!!c.phone && <Button title="Call" icon="call-outline" kind="outline" onPress={() => Linking.openURL(`tel:${c.phone}`)} style={{ flex: 1 }} />}
        {!!c.email && <Button title="Email" icon="mail-outline" kind="outline" onPress={() => Linking.openURL(`mailto:${c.email}`)} style={{ flex: 1 }} />}
      </View>
      {!!c.resume_url && <Button title="View resume" icon="document-text-outline" onPress={() => openInApp(c.resume_url, `${c.name} – resume`)} style={{ marginTop: 10 }} />}
      {!!c.about && (
        <View style={[k.card, { marginTop: 14 }]}>
          <Text style={k.title}>About</Text>
          <Text style={[k.p, { marginTop: 6 }]}>{c.about}</Text>
        </View>
      )}
      <View style={[k.card, { marginTop: 4 }]}>
        <Text style={[k.title, { marginBottom: 10 }]}>Send a message</Text>
        <ErrorText text={err} />
        <Field label="" value={msg} onChangeText={setMsg} multiline placeholder={`Hi ${c.name.split(' ')[0]}, we have an opening that fits your profile…`} />
        <Button title={busy ? 'Sending…' : 'Send message'} icon="send-outline" onPress={send} disabled={busy} />
      </View>
    </ScrollView>
  );
}
