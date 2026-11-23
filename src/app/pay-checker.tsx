import { Stack } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Share, StyleSheet, Text, View } from 'react-native';
import { Choice, ErrorText, Field, k } from '../components/kit';
import { Button, JobRow } from '../components/ui';
import { payCheck, payTitles, type PayResult } from '../lib/account';
import { useStore } from '../lib/store';
import { colors } from '../lib/theme';

const VERDICT = {
  high: { t: 'You are paid well 🎉', c: '#027A48' },
  average: { t: 'Your pay is about average', c: '#B54708' },
  low: { t: 'You may be underpaid', c: colors.danger },
};

export default function PayChecker() {
  const site = useStore((s) => s.site)!;
  const [titles, setTitles] = useState<string[]>([]);
  const [available, setAvailable] = useState(true);
  const [t, setT] = useState('');
  const [c, setC] = useState('');
  const [a, setA] = useState('');
  const [per, setPer] = useState(site === 'in' ? 'month' : 'hour');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [res, setRes] = useState<PayResult | null>(null);

  useEffect(() => {
    payTitles(site)
      .then((r) => {
        setAvailable(r.available);
        setTitles(r.titles ?? []);
      })
      .catch(() => {});
  }, [site]);

  const sugg = useMemo(() => {
    const q = t.trim().toLowerCase();
    if (q.length < 2) return [];
    return titles.filter((x) => x.toLowerCase().includes(q) && x.toLowerCase() !== q).slice(0, 6);
  }, [t, titles]);

  const check = async () => {
    setErr('');
    if (!t.trim()) return setErr('Please enter your job title.');
    if (!Number(a)) return setErr('Please enter your pay.');
    setBusy(true);
    try {
      setRes(await payCheck(site, t.trim(), c.trim(), a, per));
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  };

  if (!available)
    return (
      <View style={{ padding: 20 }}>
        <Stack.Screen options={{ title: 'Am I paid fairly?' }} />
        <Text style={k.p}>Pay is different in every country. Choose Canada, India or Australia in the Account tab to use the pay checker.</Text>
      </View>
    );

  const v = res?.verdict ? VERDICT[res.verdict] : null;
  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Stack.Screen options={{ title: 'Am I paid fairly?' }} />
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
        <Text style={[k.p, { marginBottom: 14 }]}>Compare your pay with real job ads on JobsRack. Free and private: nothing you enter is saved.</Text>
        <ErrorText text={err} />
        <Field label="Your job title" value={t} onChangeText={(x) => { setT(x); setRes(null); }} placeholder="e.g. Warehouse associate" />
        {sugg.length > 0 && (
          <View style={st.sugg}>
            {sugg.map((x) => (
              <Pressable key={x} onPress={() => setT(x)} style={st.chip}>
                <Text style={{ color: colors.brand, fontSize: 13 }}>{x}</Text>
              </Pressable>
            ))}
          </View>
        )}
        <Field label="City (optional)" value={c} onChangeText={setC} />
        <Field label="Your pay" value={a} onChangeText={setA} keyboardType="decimal-pad" />
        <Choice label="Per" value={per} onChange={setPer} options={['hour', 'week', 'month', 'year'].map((p) => ({ value: p, label: p[0].toUpperCase() + p.slice(1) }))} />
        <Button title={busy ? 'Checking…' : 'Check my pay'} onPress={check} disabled={busy} />

        {res && !res.n && (
          <View style={[k.card, { marginTop: 16 }]}>
            <Text style={k.p}>Not enough pay data for "{t}" yet. Try a more general title, e.g. "cook" instead of "line cook".</Text>
          </View>
        )}
        {res && !!res.n && v && (
          <View style={[k.card, { marginTop: 16 }]}>
            <Text style={{ fontSize: 22, fontWeight: '800', color: v.c }}>{v.t}</Text>
            <Text style={[k.p, { marginTop: 6 }]}>
              You earn more than <Text style={{ fontWeight: '800' }}>{res.pct}%</Text> of {res.n} "{t}" jobs advertised{res.local && c ? ` in ${c}` : ''} on JobsRack.
            </Text>
            <View style={st.bar}>
              <View style={[st.mark, { left: `${res.med_pos}%`, backgroundColor: '#98A2B3' }]} />
              <View style={[st.mark, { left: `${res.you_pos}%` }]} />
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={k.hint}>{res.min}</Text>
              <Text style={k.hint}>Typical {res.med}</Text>
              <Text style={k.hint}>{res.max}</Text>
            </View>
            <Text style={[k.hint, { marginTop: 4 }]}>Dark line: you · Grey line: typical pay</Text>
            <Button
              title="Share the pay checker"
              icon="share-social-outline"
              kind="outline"
              style={{ marginTop: 14 }}
              onPress={() => Share.share({ message: `Am I paid fairly as a ${t}? Check yours free: ${res.share}` })}
            />
          </View>
        )}
        {!!res?.jobs?.length && (
          <>
            <Text style={[k.title, { marginTop: 18, marginBottom: 6 }]}>Jobs that pay more than you get now</Text>
            {res.jobs.map((j) => (
              <JobRow key={j.id} job={{ ...j, site }} />
            ))}
          </>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const st = StyleSheet.create({
  sugg: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: -8, marginBottom: 12 },
  chip: { borderWidth: 1, borderColor: colors.brand, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5 },
  bar: { height: 12, borderRadius: 6, backgroundColor: '#FEF0C7', marginTop: 22, marginBottom: 8, position: 'relative' },
  mark: { position: 'absolute', top: -7, width: 4, height: 26, borderRadius: 2, backgroundColor: colors.ink, marginLeft: -2 },
});
