import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, Text, View } from 'react-native';
import { employerJob, saveJob, taxonomies, type JobForm, type Taxonomies } from '../lib/account';
import { useStore } from '../lib/store';
import { colors } from '../lib/theme';
import { Choice, ErrorText, Field, k, Loading } from './kit';
import { Button } from './ui';

const EMPTY: JobForm = { title: '', description: '', city: '', type: 0, category: 0, pay_min: '', pay_max: '', pay_period: 'year', apply_email: '', openings: '1' };

/** Post a new job, or edit one (pass id). The pay range is required. */
export function JobFormView({ id }: { id?: number }) {
  const site = useStore((s) => s.site)!;
  const user = useStore((s) => s.auth?.user);
  const [tax, setTax] = useState<Taxonomies | null>(null);
  const [f, setF] = useState<JobForm>({ ...EMPTY, apply_email: user?.email ?? '', city: user?.city ?? '' });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [done, setDone] = useState('');

  useEffect(() => {
    taxonomies(site)
      .then((t) => {
        setTax(t);
        setF((x) => ({ ...x, pay_period: t.periods.includes(x.pay_period) ? x.pay_period : t.periods[0], ...(t.ontario && !id ? { vacancy: 'yes', ai: 'no' } : {}) }));
      })
      .catch((e) => setErr(e.message));
    if (id) employerJob(site, id).then((j) => setF({ ...EMPTY, ...j })).catch((e) => setErr(e.message));
  }, [site, id]);

  if (!tax) return err ? <ErrorText text={err} /> : <Loading />;
  const up = (key: keyof JobForm) => (v: any) => setF((x) => ({ ...x, [key]: v }));
  const num = (s: string) => Number(String(s).replace(/[^\d.]/g, ''));

  const submit = async () => {
    setErr('');
    if (f.title.trim().length < 3) return setErr('Please enter the job title.');
    if (!f.city.trim()) return setErr('Please enter the city.');
    if (!f.type) return setErr('Please choose the job type.');
    if (!f.category) return setErr('Please choose a category.');
    if (!num(f.pay_min) || !num(f.pay_max)) return setErr('Please enter the pay range. Jobs with pay get far more applicants.');
    if (num(f.pay_max) < num(f.pay_min)) return setErr('The highest pay must be more than the lowest pay.');
    if (f.description.trim().length < 80) return setErr('Please describe the job in a few more lines: duties, hours and what you need.');
    if (!/^\S+@\S+\.\S+$/.test(f.apply_email.trim())) return setErr('Please enter the email where applications should go.');
    setBusy(true);
    try {
      const r = await saveJob(site, { ...f, title: f.title.trim(), description: f.description.trim(), city: f.city.trim(), apply_email: f.apply_email.trim() }, id);
      setDone(r.message);
      if (!id) setF({ ...EMPTY, apply_email: f.apply_email, city: f.city, pay_period: f.pay_period });
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  };

  if (done) {
    return (
      <View style={{ padding: 20 }}>
        <View style={k.card}>
          <Text style={{ fontSize: 20, fontWeight: '800', color: colors.ink }}>{id ? 'Job updated' : 'Job posted'}</Text>
          <Text style={[k.p, { marginTop: 6 }]}>{done}</Text>
          <Button title="See my jobs" onPress={() => router.replace('/dashboard')} style={{ marginTop: 14 }} />
          {!id && <Button title="Post another job" kind="outline" onPress={() => setDone('')} style={{ marginTop: 10 }} />}
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
        {!id && <Text style={[k.p, { marginBottom: 14 }]}>Posting is free. Your job goes live on JobsRack after a quick check.</Text>}
        <ErrorText text={err} />
        <Field label="Job title" value={f.title} onChangeText={up('title')} placeholder="e.g. Warehouse associate" />
        <Field label="City" value={f.city} onChangeText={up('city')} placeholder="e.g. Brampton" />
        <Choice label="Job type" value={f.type} onChange={up('type')} options={tax.types.map((t) => ({ value: t.id, label: t.name }))} />
        <Choice label="Category" value={f.category} onChange={up('category')} options={tax.categories.map((t) => ({ value: t.id, label: t.name }))} />
        <Text style={k.label}>Pay range ({tax.currency})</Text>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <View style={{ flex: 1 }}>
            <Field label="From" value={f.pay_min} onChangeText={up('pay_min')} keyboardType="decimal-pad" placeholder="e.g. 18" />
          </View>
          <View style={{ flex: 1 }}>
            <Field label="To" value={f.pay_max} onChangeText={up('pay_max')} keyboardType="decimal-pad" placeholder="e.g. 22" />
          </View>
        </View>
        <Choice label="Per" value={f.pay_period} onChange={up('pay_period')} options={tax.periods.map((p) => ({ value: p, label: p[0].toUpperCase() + p.slice(1) }))} />
        <Field label="Job description" value={f.description} onChangeText={up('description')} multiline placeholder="What the job involves, hours, and what you're looking for" />
        <Field label="Number of openings" value={f.openings} onChangeText={up('openings')} keyboardType="number-pad" />
        <Field label="Send applications to" value={f.apply_email} onChangeText={up('apply_email')} autoCapitalize="none" keyboardType="email-address" hint="Each application, with the resume, is emailed here. You can also see them in the app." />
        {tax.ontario && (
          <>
            <Choice
              label="Is this a current vacancy?"
              value={f.vacancy}
              onChange={up('vacancy')}
              options={[
                { value: 'yes', label: 'Yes, open now' },
                { value: 'no', label: 'No, future openings' },
              ]}
            />
            <Choice
              label="Do you use AI to screen applicants?"
              value={f.ai}
              onChange={up('ai')}
              options={[
                { value: 'no', label: 'No' },
                { value: 'yes', label: 'Yes' },
              ]}
            />
            <Text style={[k.hint, { marginTop: -6, marginBottom: 14 }]}>Ontario law requires these on job postings.</Text>
          </>
        )}
        <Button title={busy ? 'Saving…' : id ? 'Save changes' : 'Post job'} onPress={submit} disabled={busy} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
