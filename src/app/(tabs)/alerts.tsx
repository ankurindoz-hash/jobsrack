import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { Linking, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Button } from '../../components/ui';
import { SITES } from '../../lib/api';
import { syncAlerts } from '../../lib/push';
import { addAlert, removeAlert, useStore } from '../../lib/store';
import { colors, radius } from '../../lib/theme';

export default function Alerts() {
  const alerts = useStore((s) => s.alerts);
  const pushOn = useStore((s) => s.pushOn);
  const site = useStore((s) => s.site);
  const [q, setQ] = useState('');
  const [loc, setLoc] = useState('');
  const [msg, setMsg] = useState('');

  const add = async () => {
    if (!q.trim() && !loc.trim()) {
      setMsg('Type a job title or a city first.');
      return;
    }
    if (alerts.length >= 5) {
      setMsg('You can have up to 5 alerts. Remove one to add another.');
      return;
    }
    const ok = addAlert({ q: q.trim(), loc: loc.trim() });
    setMsg(ok ? '' : 'You already have this alert.');
    if (ok) {
      setQ('');
      setLoc('');
      const on = await syncAlerts(true);
      if (!on) setMsg(Platform.OS === 'web' ? 'Alerts work in the phone app.' : 'Alert saved. Allow notifications for JobsRack in your phone Settings to receive alerts.');
    }
  };
  const remove = async (i: number) => {
    removeAlert(i);
    await syncAlerts(false);
  };

  return (
    <ScrollView contentContainerStyle={{ padding: 16 }} keyboardShouldPersistTaps="handled">
      <Text style={st.intro}>Get a notification when new jobs match your search{site ? ` on JobsRack ${SITES[site].short}` : ''}. At most one alert every 12 hours.</Text>
      <View style={st.box}>
        <TextInput value={q} onChangeText={setQ} placeholder="Job title, e.g. Cook" placeholderTextColor="#98A2B3" style={st.input} />
        <TextInput value={loc} onChangeText={setLoc} placeholder="City (optional)" placeholderTextColor="#98A2B3" style={[st.input, { borderTopWidth: 1, borderTopColor: colors.line }]} />
        <Button title="Create alert" icon="notifications-outline" onPress={add} style={{ margin: 8 }} />
      </View>
      {!!msg && <Text style={st.msg}>{msg}</Text>}
      {msg.includes('Settings') && Platform.OS !== 'web' ? <Button title="Open Settings" kind="outline" onPress={() => Linking.openSettings()} style={{ marginTop: 8 }} /> : null}
      <Text style={st.h}>Your alerts</Text>
      {alerts.length === 0 ? (
        <Text style={st.none}>No alerts yet.</Text>
      ) : (
        alerts.map((a, i) => (
          <View key={`${a.q}|${a.loc}`} style={st.item}>
            <Pressable style={{ flex: 1 }} onPress={() => router.navigate({ pathname: '/', params: { q: a.q, loc: a.loc } })} accessibilityRole="button">
              <Text style={st.itemTitle}>{a.q || 'Any job'}</Text>
              <Text style={st.itemSub}>{a.loc || 'Anywhere'}</Text>
            </Pressable>
            <Pressable onPress={() => remove(i)} hitSlop={10} accessibilityLabel="Delete alert">
              <Ionicons name="trash-outline" size={20} color={colors.danger} />
            </Pressable>
          </View>
        ))
      )}
      {alerts.length > 0 && <Text style={st.status}>{pushOn ? 'Notifications are on for this phone.' : 'Notifications are off. Allow notifications to receive alerts.'}</Text>}
    </ScrollView>
  );
}

const st = StyleSheet.create({
  intro: { fontSize: 14, color: colors.text, lineHeight: 20, marginBottom: 12 },
  box: { backgroundColor: '#fff', borderRadius: radius, borderWidth: 1, borderColor: colors.line, overflow: 'hidden' },
  input: { fontSize: 16, paddingVertical: 12, paddingHorizontal: 14, color: colors.ink },
  msg: { marginTop: 10, color: colors.ink, fontSize: 14 },
  h: { fontSize: 16, fontWeight: '700', color: colors.ink, marginTop: 24, marginBottom: 8 },
  none: { color: colors.muted, fontSize: 14 },
  item: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: radius, borderWidth: 1, borderColor: colors.line, padding: 14, marginBottom: 8 },
  itemTitle: { fontSize: 15, fontWeight: '700', color: colors.ink },
  itemSub: { fontSize: 13, color: colors.muted, marginTop: 2 },
  status: { fontSize: 13, color: colors.muted, marginTop: 8 },
});
