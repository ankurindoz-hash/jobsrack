import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text } from 'react-native';
import { ErrorText, Field, k } from '../../components/kit';
import { Button } from '../../components/ui';
import { login } from '../../lib/account';
import { SITES } from '../../lib/api';
import { setAuth, useStore } from '../../lib/store';
import { colors } from '../../lib/theme';

export default function Login() {
  const site = useStore((s) => s.site)!;
  const p = useLocalSearchParams<{ role?: string }>();
  const [id, setId] = useState('');
  const [pw, setPw] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const go = async () => {
    setErr('');
    if (!id.trim() || !pw) return setErr('Please enter your email and password.');
    setBusy(true);
    try {
      const r = await login(site, id.trim(), pw);
      setAuth(r.token, r.user, site);
      router.dismissAll();
      router.replace(r.user.role === 'employer' ? '/dashboard' : '/account');
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Stack.Screen options={{ title: 'Sign in' }} />
      <ScrollView contentContainerStyle={{ padding: 18 }} keyboardShouldPersistTaps="handled">
        <Text style={{ fontSize: 24, fontWeight: '800', color: colors.ink }}>Welcome back</Text>
        <Text style={[k.p, { marginTop: 4, marginBottom: 20 }]}>Sign in to your {SITES[site].name} account. Job seekers and employers use the same sign in.</Text>
        <ErrorText text={err} />
        <Field label="Email or username" value={id} onChangeText={setId} autoCapitalize="none" keyboardType="email-address" autoComplete="email" textContentType="username" />
        <Field label="Password" value={pw} onChangeText={setPw} secureTextEntry autoComplete="password" textContentType="password" onSubmitEditing={go} />
        <Button title={busy ? 'Signing in…' : 'Sign in'} onPress={go} disabled={busy} />
        <Pressable onPress={() => router.push('/auth/forgot')} style={{ padding: 14, alignItems: 'center' }}>
          <Text style={{ color: colors.brand, fontWeight: '600' }}>Forgot your password?</Text>
        </Pressable>
        <Text style={[k.p, { textAlign: 'center', marginTop: 10 }]}>New to JobsRack?</Text>
        <Button title="Create a job seeker account" kind="outline" onPress={() => router.replace({ pathname: '/auth/register', params: { role: 'candidate' } })} style={{ marginTop: 10 }} />
        <Button title="Create an employer account" kind="outline" onPress={() => router.replace({ pathname: '/auth/register', params: { role: 'employer' } })} style={{ marginTop: 10 }} />
        {p.role === 'employer' && <Text style={[k.hint, { textAlign: 'center', marginTop: 12 }]}>Posting jobs is free.</Text>}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
