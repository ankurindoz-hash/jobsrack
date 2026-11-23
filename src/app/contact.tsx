import { Stack } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, Text } from 'react-native';
import { ErrorText, Field, k } from '../components/kit';
import { Button } from '../components/ui';
import { contact } from '../lib/account';
import { useStore } from '../lib/store';

export default function Contact() {
  const site = useStore((s) => s.site)!;
  const prof = useStore((s) => s.profile);
  const [name, setName] = useState(prof.name);
  const [email, setEmail] = useState(prof.email);
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [done, setDone] = useState('');
  const go = async () => {
    setErr('');
    if (name.trim().length < 2) return setErr('Please enter your name.');
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) return setErr('Please enter a valid email address.');
    if (msg.trim().length < 5) return setErr('Please write your message.');
    setBusy(true);
    try {
      const r = await contact(site, { name: name.trim(), email: email.trim(), message: msg.trim() });
      setDone(r.message);
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Stack.Screen options={{ title: 'Contact us' }} />
      <ScrollView contentContainerStyle={{ padding: 18 }} keyboardShouldPersistTaps="handled">
        {done ? (
          <Text style={[k.card, k.p]}>{done}</Text>
        ) : (
          <>
            <Text style={[k.p, { marginBottom: 16 }]}>Questions, problems with a job ad, or help with your account? Send us a message and we'll reply by email.</Text>
            <ErrorText text={err} />
            <Field label="Your name" value={name} onChangeText={setName} />
            <Field label="Email" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />
            <Field label="Message" value={msg} onChangeText={setMsg} multiline />
            <Button title={busy ? 'Sending…' : 'Send'} onPress={go} disabled={busy} />
          </>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
