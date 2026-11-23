import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, View } from 'react-native';
import { Choice, ErrorText, Field, k } from '../../components/kit';
import { Button } from '../../components/ui';
import { register, type Role } from '../../lib/account';
import { SITES } from '../../lib/api';
import { setAuth, useStore } from '../../lib/store';
import { colors } from '../../lib/theme';

export default function Register() {
  const site = useStore((s) => s.site)!;
  const prof = useStore((s) => s.profile);
  const p = useLocalSearchParams<{ role?: string }>();
  const [role, setRole] = useState<Role>(p.role === 'employer' ? 'employer' : 'candidate');
  const [name, setName] = useState(prof.name);
  const [company, setCompany] = useState('');
  const [email, setEmail] = useState(prof.email);
  const [phone, setPhone] = useState(prof.phone);
  const [pw, setPw] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const emp = role === 'employer';

  const go = async () => {
    setErr('');
    if (name.trim().length < 2) return setErr('Please enter your full name.');
    if (emp && company.trim().length < 2) return setErr('Please enter your company name.');
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) return setErr('Please enter a valid email address.');
    if (phone.replace(/\D/g, '').length < 7) return setErr('Please enter a valid phone number.');
    if (pw.length < 8) return setErr('Your password needs at least 8 characters.');
    setBusy(true);
    try {
      const r = await register(site, { role, name: name.trim(), email: email.trim(), phone: phone.trim(), password: pw, company: emp ? company.trim() : undefined });
      setAuth(r.token, r.user, site);
      router.dismissAll();
      router.replace(emp ? '/dashboard' : '/me/profile');
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Stack.Screen options={{ title: 'Create account' }} />
      <ScrollView contentContainerStyle={{ padding: 18 }} keyboardShouldPersistTaps="handled">
        <Text style={{ fontSize: 24, fontWeight: '800', color: colors.ink }}>{emp ? 'Start hiring for free' : 'Create your free account'}</Text>
        <Text style={[k.p, { marginTop: 4, marginBottom: 18 }]}>
          {emp ? `Post jobs on ${SITES[site].name}, see applicants and message them, all from your phone.` : 'Apply faster, keep track of your applications and let employers find you.'}
        </Text>
        <Choice<Role>
          label="I want to"
          value={role}
          onChange={setRole}
          options={[
            { value: 'candidate', label: 'Find a job' },
            { value: 'employer', label: 'Hire people' },
          ]}
        />
        <ErrorText text={err} />
        <Field label="Full name" value={name} onChangeText={setName} autoComplete="name" textContentType="name" />
        {emp && <Field label="Company name" value={company} onChangeText={setCompany} autoComplete="organization" />}
        <Field label="Email" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" autoComplete="email" textContentType="emailAddress" />
        <Field label="Phone" value={phone} onChangeText={setPhone} keyboardType="phone-pad" autoComplete="tel" textContentType="telephoneNumber" />
        <Field label="Password" value={pw} onChangeText={setPw} secureTextEntry autoComplete="new-password" textContentType="newPassword" hint="At least 8 characters." />
        <Button title={busy ? 'Creating your account…' : 'Create account'} onPress={go} disabled={busy} />
        <View style={{ flexDirection: 'row', justifyContent: 'center', marginTop: 14 }}>
          <Text style={k.p}>Already have an account? </Text>
          <Pressable onPress={() => router.replace('/auth/login')}>
            <Text style={[k.p, { color: colors.brand, fontWeight: '700' }]}>Sign in</Text>
          </Pressable>
        </View>
        <Pressable onPress={() => router.push('/page/privacy-policy')} style={{ marginTop: 16 }}>
          <Text style={[k.hint, { textAlign: 'center' }]}>
            By creating an account you agree to our <Text style={{ color: colors.brand }}>privacy policy</Text>.
          </Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
