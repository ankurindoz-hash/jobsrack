import { Stack } from 'expo-router';
import { useState } from 'react';
import { ScrollView, Text } from 'react-native';
import { ErrorText, Field, k } from '../../components/kit';
import { Button } from '../../components/ui';
import { forgotPassword } from '../../lib/account';
import { useStore } from '../../lib/store';

export default function Forgot() {
  const site = useStore((s) => s.site)!;
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [done, setDone] = useState('');
  const go = async () => {
    setErr('');
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) return setErr('Please enter a valid email address.');
    setBusy(true);
    try {
      const r = await forgotPassword(site, email.trim());
      setDone(r.message);
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <ScrollView contentContainerStyle={{ padding: 18 }} keyboardShouldPersistTaps="handled">
      <Stack.Screen options={{ title: 'Reset password' }} />
      <Text style={[k.p, { marginBottom: 16 }]}>Enter the email on your account. We'll email you a link to set a new password.</Text>
      {done ? (
        <Text style={[k.card, k.p]}>{done}</Text>
      ) : (
        <>
          <ErrorText text={err} />
          <Field label="Email" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" autoComplete="email" />
          <Button title={busy ? 'Sending…' : 'Send reset link'} onPress={go} disabled={busy} />
        </>
      )}
    </ScrollView>
  );
}
