import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import { File, Paths } from 'expo-file-system';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import * as Sharing from 'expo-sharing';
import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Linking, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { ErrorText, Field, k } from '../components/kit';
import { Button } from '../components/ui';
import { getMe, resumePdf, resumeStatus, writeResume, type ResumeDoc, type ResumeInput } from '../lib/account';
import { SITES } from '../lib/api';
import { setDraftResume } from '../lib/resumeDraft';
import { getState, setUser, useStore } from '../lib/store';
import { colors } from '../lib/theme';

type Old = { uri: string; name: string; mimeType?: string; file?: any };
const FORMAT: Record<string, string> = { ca: 'Canadian', au: 'Australian', in: 'Indian', gl: 'international' };

export default function ResumeWriter() {
  const site = useStore((s) => s.site)!;
  const auth = useStore((s) => s.auth);
  const { from, target: t0 } = useLocalSearchParams<{ from?: string; target?: string }>();
  const candidate = !!auth && auth.site === site && auth.user.role === 'candidate';
  const prof = getState().profile;
  const [f, setF] = useState<ResumeInput>({
    name: auth?.user.name || prof.name,
    target: t0 || auth?.user.headline || '',
    email: auth?.user.email || prof.email,
    phone: auth?.user.phone || prof.phone,
    city: auth?.user.city || '',
    experience: '',
    education: '',
    skills: '',
  });
  const [old, setOld] = useState<Old | null>(null);
  const [ready, setReady] = useState<boolean | null>(null);
  const [busy, setBusy] = useState('');
  const [err, setErr] = useState('');
  const [ok, setOk] = useState('');
  const [doc, setDoc] = useState<ResumeDoc | null>(null);

  useEffect(() => {
    resumeStatus(site)
      .then((r) => setReady(r.ready))
      .catch(() => setReady(true));
  }, [site]);

  const up = (key: keyof ResumeInput) => (v: string) => setF((x) => ({ ...x, [key]: v }));

  const pick = async () => {
    const r = await DocumentPicker.getDocumentAsync({ type: ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain'], copyToCacheDirectory: true });
    if (r.canceled || !r.assets?.length) return;
    const a = r.assets[0];
    if (a.size && a.size > 5 * 1024 * 1024) return setErr('That file is too large. The limit is 5 MB.');
    setErr('');
    setOld({ uri: a.uri, name: a.name, mimeType: a.mimeType, file: (a as any).file });
  };

  const write = async () => {
    setErr('');
    if (f.name.trim().length < 2) return setErr('Please enter your full name.');
    if (!f.target.trim()) return setErr('Please enter the job you want.');
    if (!old && (f.experience + f.education).trim().length < 30) return setErr('Tell us about your work or studies (a few lines is fine), or upload your old resume.');
    setBusy('write');
    try {
      setDoc(await writeResume(site, f, old));
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setBusy('');
    }
  };

  const download = async (): Promise<{ uri: string; name: string } | null> => {
    const r = await resumePdf(site, doc!, false);
    if (Platform.OS === 'web') {
      Linking.openURL(r.url);
      return null;
    }
    const file = new File(Paths.cache, r.name);
    if (file.exists) file.delete();
    const saved = await File.downloadFileAsync(r.url, file);
    return { uri: saved.uri, name: r.name };
  };

  const share = async () => {
    setErr('');
    setBusy('share');
    try {
      const d = await download();
      if (d && (await Sharing.isAvailableAsync())) await Sharing.shareAsync(d.uri, { mimeType: 'application/pdf', dialogTitle: 'Save or send your resume', UTI: 'com.adobe.pdf' });
    } catch (e: any) {
      setErr(e.message || 'Could not create the PDF.');
    } finally {
      setBusy('');
    }
  };

  const saveToProfile = async () => {
    setErr('');
    setBusy('save');
    try {
      await resumePdf(site, doc!, true);
      setUser(await getMe(site));
      setOk('Saved to your profile. Employers see this resume, and it is used when you apply.');
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setBusy('');
    }
  };

  const useForApplication = async () => {
    setErr('');
    setBusy('use');
    try {
      const d = await download();
      if (d) setDraftResume({ ...d, mimeType: 'application/pdf' });
      router.back();
    } catch (e: any) {
      setErr(e.message || 'Could not create the PDF.');
    } finally {
      setBusy('');
    }
  };

  if (doc) {
    return (
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
        <Stack.Screen options={{ title: 'Your new resume' }} />
        <Preview r={doc} site={site} />
        {doc.tips.length > 0 && (
          <View style={st.tips}>
            <Text style={{ fontWeight: '700', color: colors.ink, marginBottom: 4 }}>Make it even stronger</Text>
            {doc.tips.map((t, i) => (
              <Text key={i} style={k.p}>
                • {t}
              </Text>
            ))}
          </View>
        )}
        <ErrorText text={err} />
        {!!ok && <Text style={{ color: colors.brand, fontWeight: '700', marginBottom: 10 }}>{ok}</Text>}
        {from === 'apply' && <Button title={busy === 'use' ? 'Preparing…' : 'Use this resume for my application'} icon="checkmark-circle-outline" onPress={useForApplication} disabled={!!busy} />}
        {candidate && from !== 'apply' && <Button title={busy === 'save' ? 'Saving…' : 'Save to my profile'} icon="person-circle-outline" onPress={saveToProfile} disabled={!!busy || !!ok} />}
        <Button title={busy === 'share' ? 'Preparing PDF…' : 'Download or share PDF'} icon="download-outline" kind={from === 'apply' || candidate ? 'outline' : 'primary'} onPress={share} disabled={!!busy} style={{ marginTop: 10 }} />
        <Button title="Change my details" kind="ghost" onPress={() => setDoc(null)} style={{ marginTop: 6 }} />
        <Text style={[k.hint, { textAlign: 'center', marginTop: 8 }]}>The AI only uses what you told it. Please check everything before you send it.</Text>
      </ScrollView>
    );
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Stack.Screen options={{ title: 'AI resume builder' }} />
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
        <View style={st.hero}>
          <Ionicons name="sparkles" size={26} color={colors.brand} />
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 18, fontWeight: '800', color: colors.ink }}>Get a professional resume in a minute</Text>
            <Text style={[k.p, { marginTop: 2 }]}>
              Free. Written in the {FORMAT[site]} format employers in {SITES[site].short} expect.
            </Text>
          </View>
        </View>
        {ready === false && <Text style={[k.p, { color: colors.danger, marginBottom: 10 }]}>The AI resume builder is coming soon. Please check back shortly.</Text>}
        <ErrorText text={err} />
        <Field label="Full name" value={f.name} onChangeText={up('name')} autoComplete="name" />
        <Field label="Job you want" value={f.target} onChangeText={up('target')} placeholder="e.g. Customer service representative" />
        <Field label="Email" value={f.email} onChangeText={up('email')} autoCapitalize="none" keyboardType="email-address" />
        <Field label="Phone" value={f.phone} onChangeText={up('phone')} keyboardType="phone-pad" />
        <Field label="City" value={f.city} onChangeText={up('city')} />
        <Text style={k.label}>Old resume (optional)</Text>
        <Pressable onPress={pick} style={st.file} accessibilityRole="button">
          <Ionicons name={old ? 'document-attach' : 'cloud-upload-outline'} size={22} color={colors.brand} />
          <Text style={{ flex: 1, color: colors.text }} numberOfLines={1}>
            {old ? old.name : 'Upload it and the AI rewrites it (PDF or Word)'}
          </Text>
          {old && (
            <Pressable onPress={() => setOld(null)} hitSlop={10} accessibilityLabel="Remove file">
              <Ionicons name="close-circle" size={20} color={colors.muted} />
            </Pressable>
          )}
        </Pressable>
        <View style={{ height: 14 }} />
        <Field
          label="Your work experience"
          hint="Job title, company, when, and what you did. Your own words are fine."
          value={f.experience}
          onChangeText={up('experience')}
          multiline
          placeholder="e.g. Cashier at FreshCo, Brampton, 2023 to now. Handle cash, help customers, train new staff."
        />
        <Field label="Education" value={f.education} onChangeText={up('education')} multiline placeholder="e.g. Diploma in Business, Sheridan College, 2022" />
        <Field label="Skills (optional)" value={f.skills} onChangeText={up('skills')} placeholder="e.g. Excel, forklift, Punjabi" />
        <Button title={busy ? 'Writing your resume… (about 20 seconds)' : 'Write my resume'} icon="sparkles-outline" onPress={write} disabled={!!busy || ready === false} />
        <Text style={[k.hint, { textAlign: 'center', marginTop: 10 }]}>Free in the app, up to 2 a day.</Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function Preview({ r, site }: { r: ResumeDoc; site: string }) {
  const c = [r.contact.city, r.contact.phone, r.contact.email, r.contact.link].filter(Boolean).join('  |  ');
  const H = ({ t }: { t: string }) => <Text style={st.h}>{t.toUpperCase()}</Text>;
  return (
    <View style={st.paper}>
      <Text style={{ fontSize: 22, fontWeight: '800', color: colors.ink }}>{r.name}</Text>
      {!!r.headline && <Text style={{ color: colors.text, fontSize: 15 }}>{r.headline}</Text>}
      {!!c && <Text style={[k.hint, { marginTop: 2 }]}>{c}</Text>}
      {!!r.summary && (
        <>
          <H t="Professional summary" />
          <Text style={st.body}>{r.summary}</Text>
        </>
      )}
      {r.skills.length > 0 && (
        <>
          <H t={site === 'in' || site === 'au' ? 'Key skills' : 'Skills'} />
          <Text style={st.body}>{r.skills.join('  ·  ')}</Text>
        </>
      )}
      {r.experience.length > 0 && <H t="Work experience" />}
      {r.experience.map((e, i) => (
        <View key={i} style={{ marginBottom: 8 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}>
            <Text style={[st.body, { fontWeight: '700', flex: 1 }]}>{e.title}</Text>
            <Text style={k.hint}>{[e.start, e.end].filter(Boolean).join(' – ')}</Text>
          </View>
          <Text style={[st.body, { color: colors.muted }]}>{[e.company, e.city].filter(Boolean).join(', ')}</Text>
          {e.bullets.map((b, j) => (
            <Text key={j} style={st.body}>
              • {b}
            </Text>
          ))}
        </View>
      ))}
      {r.education.length > 0 && <H t="Education" />}
      {r.education.map((e, i) => (
        <View key={i} style={{ marginBottom: 6 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}>
            <Text style={[st.body, { fontWeight: '700', flex: 1 }]}>{e.credential || e.school}</Text>
            <Text style={k.hint}>{e.year}</Text>
          </View>
          {!!e.credential && <Text style={[st.body, { color: colors.muted }]}>{[e.school, e.city].filter(Boolean).join(', ')}</Text>}
        </View>
      ))}
      {r.certifications.length > 0 && (
        <>
          <H t="Certifications" />
          {r.certifications.map((b, i) => (
            <Text key={i} style={st.body}>
              • {b}
            </Text>
          ))}
        </>
      )}
      {r.languages.length > 0 && (
        <>
          <H t="Languages" />
          <Text style={st.body}>{r.languages.join(', ')}</Text>
        </>
      )}
      {r.extras.map((x, i) => (
        <View key={i}>
          <H t={x.heading} />
          {x.items.map((b, j) => (
            <Text key={j} style={st.body}>
              • {b}
            </Text>
          ))}
        </View>
      ))}
    </View>
  );
}

const st = StyleSheet.create({
  hero: { flexDirection: 'row', gap: 12, alignItems: 'center', backgroundColor: '#ECFDF3', borderRadius: 12, padding: 14, marginBottom: 16 },
  file: { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderStyle: 'dashed', borderColor: '#98A2B3', borderRadius: 10, padding: 14, backgroundColor: '#fff' },
  paper: { backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: colors.line, padding: 18, marginBottom: 14 },
  h: { fontSize: 12, fontWeight: '800', letterSpacing: 0.6, color: colors.ink, borderBottomWidth: 1, borderBottomColor: colors.line, paddingBottom: 3, marginTop: 14, marginBottom: 6 },
  body: { fontSize: 14, color: colors.text, lineHeight: 20 },
  tips: { backgroundColor: '#ECFDF3', borderRadius: 10, padding: 12, marginBottom: 12 },
});
