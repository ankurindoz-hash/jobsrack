import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import { router, Stack } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, View } from 'react-native';
import { ErrorText, Field, k } from '../../components/kit';
import { Button } from '../../components/ui';
import { deleteAccount, getMe, updateMe } from '../../lib/account';
import { openInApp } from '../../lib/nav';
import { setUser, signOutLocal, useStore } from '../../lib/store';
import { colors } from '../../lib/theme';

type Resume = { uri: string; name: string; mimeType?: string; file?: any };

export default function Profile() {
  const site = useStore((s) => s.site)!;
  const user = useStore((s) => s.auth?.user);
  const emp = user?.role === 'employer';
  const [f, setF] = useState({ name: '', phone: '', city: '', headline: '', company: '', website: '', about: '' });
  const [resume, setResume] = useState<Resume | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [ok, setOk] = useState('');

  useEffect(() => {
    if (!user) return;
    setF({ name: user.name, phone: user.phone, city: user.city, headline: user.headline, company: user.company, website: user.website, about: user.about });
    getMe(site)
      .then((u) => {
        setUser(u);
        setF({ name: u.name, phone: u.phone, city: u.city, headline: u.headline, company: u.company, website: u.website, about: u.about });
      })
      .catch(() => {});
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (!user) {
    return (
      <View style={{ padding: 18 }}>
        <Text style={k.p}>Please sign in first.</Text>
        <Button title="Sign in" onPress={() => router.replace('/auth/login')} style={{ marginTop: 12 }} />
      </View>
    );
  }

  const up = (key: keyof typeof f) => (v: string) => setF((x) => ({ ...x, [key]: v }));

  const pick = async () => {
    const r = await DocumentPicker.getDocumentAsync({ type: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'], copyToCacheDirectory: true });
    if (r.canceled || !r.assets?.length) return;
    const a = r.assets[0];
    if (a.size && a.size > 5 * 1024 * 1024) return setErr('Your resume is too large. The limit is 5 MB.');
    setResume({ uri: a.uri, name: a.name, mimeType: a.mimeType, file: (a as any).file });
  };

  const save = async () => {
    setErr('');
    setOk('');
    if (f.name.trim().length < 2) return setErr('Please enter your name.');
    setBusy(true);
    try {
      const u = await updateMe(site, f, resume ?? undefined);
      setUser(u);
      setResume(null);
      setOk('Saved.');
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  };

  const del = () =>
    Alert.alert('Delete your account?', 'Your profile, resume and applications will be deleted. This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            const r = await deleteAccount(site);
            signOutLocal();
            Alert.alert('Account deleted', r.message);
            router.replace('/account');
          } catch (e: any) {
            setErr(e.message);
          }
        },
      },
    ]);

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Stack.Screen options={{ title: emp ? 'Company profile' : 'My profile' }} />
      <ScrollView contentContainerStyle={{ padding: 18, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
        <ErrorText text={err} />
        {!!ok && <Text style={[k.p, { color: colors.brand, marginBottom: 10, fontWeight: '700' }]}>{ok}</Text>}
        <Field label="Full name" value={f.name} onChangeText={up('name')} />
        <Text style={[k.label]}>Email</Text>
        <Text style={[k.p, { marginBottom: 14 }]}>{user.email}</Text>
        <Field label="Phone" value={f.phone} onChangeText={up('phone')} keyboardType="phone-pad" />
        <Field label="City" value={f.city} onChangeText={up('city')} />
        {emp ? (
          <>
            <Field label="Company name" value={f.company} onChangeText={up('company')} />
            <Field label="Company website" value={f.website} onChangeText={up('website')} autoCapitalize="none" keyboardType="url" />
            <Field label="About the company" value={f.about} onChangeText={up('about')} multiline />
          </>
        ) : (
          <>
            <Field label="Job title you want" value={f.headline} onChangeText={up('headline')} placeholder="e.g. Warehouse associate" />
            <Field label="About you" value={f.about} onChangeText={up('about')} multiline placeholder="Your experience and skills in a few lines" />
            <Text style={k.label}>Resume</Text>
            <Pressable onPress={pick} style={[k.card, { flexDirection: 'row', alignItems: 'center', gap: 10 }]}>
              <Ionicons name="document-attach-outline" size={24} color={colors.brand} />
              <Text style={[k.p, { flex: 1 }]} numberOfLines={1}>
                {resume?.name || user.resume_name || 'Upload your resume (PDF or Word)'}
              </Text>
              <Text style={{ color: colors.brand, fontWeight: '700' }}>{user.resume_name || resume ? 'Change' : 'Upload'}</Text>
            </Pressable>
            {!!user.resume_url && !resume && (
              <Pressable onPress={() => openInApp(user.resume_url, 'My resume')} style={{ marginTop: -4, marginBottom: 14 }}>
                <Text style={{ color: colors.brand }}>View my resume</Text>
              </Pressable>
            )}
            <Text style={[k.hint, { marginBottom: 14 }]}>Employers on JobsRack can find you by the job title and city you add here.</Text>
          </>
        )}
        <Button title={busy ? 'Saving…' : 'Save'} onPress={save} disabled={busy} />
        <Pressable onPress={del} style={{ marginTop: 28, alignItems: 'center' }}>
          <Text style={{ color: colors.danger, fontWeight: '600' }}>Delete my account</Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
