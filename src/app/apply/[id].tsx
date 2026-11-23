import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Button } from '../../components/ui';
import { applyWithSavedResume } from '../../lib/account';
import { askForReview } from '../../lib/review';
import { applyToJob, getJob, type JobDetail, type SiteCode } from '../../lib/api';
import { getState, markApplied, setProfile } from '../../lib/store';
import { colors, radius } from '../../lib/theme';

type Resume = { uri: string; name: string; mimeType?: string; size?: number; file?: any };

export default function Apply() {
  const p = useLocalSearchParams<{ id: string; site: string }>();
  const site = (p.site || getState().site) as SiteCode;
  const id = Number(p.id);
  const prof = getState().profile;
  const auth = getState().auth;
  const savedResume = auth && auth.site === site ? auth.user.resume_name : '';
  const [job, setJob] = useState<JobDetail | null>(null);
  const [name, setName] = useState(prof.name);
  const [email, setEmail] = useState(prof.email);
  const [phone, setPhone] = useState(prof.phone);
  const [message, setMessage] = useState('');
  const [answers, setAnswers] = useState<string[]>([]);
  const [resume, setResume] = useState<Resume | null>(null);
  const [agree, setAgree] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [done, setDone] = useState('');

  useEffect(() => {
    getJob(site, id)
      .then((j) => {
        setJob(j);
        setAnswers(j.questions.map(() => ''));
      })
      .catch((e) => setErr(e.message));
  }, [site, id]);

  const pick = async () => {
    const r = await DocumentPicker.getDocumentAsync({
      type: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/rtf'],
      copyToCacheDirectory: true,
      multiple: false,
    });
    if (r.canceled || !r.assets?.length) return;
    const a = r.assets[0];
    if (a.size && a.size > 5 * 1024 * 1024) {
      setErr('Your resume is too large. The limit is 5 MB.');
      return;
    }
    setErr('');
    setResume({ uri: a.uri, name: a.name, mimeType: a.mimeType, size: a.size, file: (a as any).file });
  };

  const send = async () => {
    setErr('');
    if (name.trim().length < 2) return setErr('Please enter your full name.');
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) return setErr('Please enter a valid email address.');
    if (phone.replace(/\D/g, '').length < 7) return setErr('Please enter a valid phone number.');
    if (!resume && !savedResume) return setErr('Please attach your resume.');
    if (answers.some((a) => !a.trim())) return setErr("Please answer all the employer's questions.");
    if (!agree) return setErr('Please tick the box to agree to share your application.');
    setBusy(true);
    setProfile({ name: name.trim(), email: email.trim(), phone: phone.trim() });
    const r =
      !resume && savedResume
        ? await applyWithSavedResume(site, id, message.trim(), answers)
            .then((x) => ({ ok: x.ok, msg: x.msg }))
            .catch((e) => ({ ok: false, msg: e.message as string }))
        : await applyToJob({ site, jobId: id, name: name.trim(), email: email.trim(), phone: phone.trim(), message: message.trim(), answers, resume, token: auth && auth.site === site ? auth.token : undefined });
    setBusy(false);
    if (r.ok) {
      markApplied(site, id);
      askForReview();
      setDone(r.msg || 'Application sent!');
    } else {
      setErr(r.msg || 'Could not send. Please try again.');
    }
  };

  if (done) {
    return (
      <View style={st.doneWrap}>
        <Ionicons name="checkmark-circle" size={64} color={colors.brand} />
        <Text style={st.doneTitle}>Application sent</Text>
        <Text style={st.doneText}>{done}</Text>
        <Button title="Back to jobs" onPress={() => router.dismissAll()} style={{ marginTop: 24, alignSelf: 'stretch' }} />
      </View>
    );
  }
  if (!job) return err ? <Text style={[st.err, { margin: 20 }]}>{err}</Text> : <ActivityIndicator color={colors.brand} style={{ marginTop: 40 }} />;

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
        <Text style={st.job}>{job.title}</Text>
        {!!job.company && <Text style={st.co}>{job.company}</Text>}
        <Text style={st.note}>No account needed. Takes about a minute.</Text>

        <Text style={st.label}>Full name *</Text>
        <TextInput style={st.input} value={name} onChangeText={setName} autoComplete="name" textContentType="name" placeholder="Your full name" placeholderTextColor="#98A2B3" />
        <Text style={st.label}>Email *</Text>
        <TextInput style={st.input} value={email} onChangeText={setEmail} autoComplete="email" textContentType="emailAddress" keyboardType="email-address" autoCapitalize="none" placeholder="you@example.com" placeholderTextColor="#98A2B3" />
        <Text style={st.label}>Phone *</Text>
        <TextInput style={st.input} value={phone} onChangeText={setPhone} autoComplete="tel" textContentType="telephoneNumber" keyboardType="phone-pad" placeholder="Phone number" placeholderTextColor="#98A2B3" />

        <Text style={st.label}>Resume *</Text>
        <Pressable onPress={pick} style={st.file} accessibilityRole="button">
          <Ionicons name={resume || savedResume ? 'document-attach' : 'cloud-upload-outline'} size={22} color={colors.brand} />
          <Text style={st.fileText} numberOfLines={1}>
            {resume ? resume.name : savedResume ? `Use my saved resume: ${savedResume}` : 'Choose your resume (PDF or Word, up to 5 MB)'}
          </Text>
        </Pressable>

        {job.questions.map((q, i) => (
          <View key={i}>
            <Text style={st.label}>{q.q} *</Text>
            {q.t === 'text' ? (
              <TextInput style={st.input} value={answers[i]} onChangeText={(t) => setAnswers((a) => a.map((x, n) => (n === i ? t : x)))} maxLength={300} />
            ) : (
              <View style={{ flexDirection: 'row', gap: 10 }}>
                {['yes', 'no'].map((v) => (
                  <Pressable key={v} onPress={() => setAnswers((a) => a.map((x, n) => (n === i ? v : x)))} style={[st.yn, answers[i] === v && st.ynOn]} accessibilityRole="radio" accessibilityState={{ checked: answers[i] === v }}>
                    <Text style={[st.ynText, answers[i] === v && { color: '#fff' }]}>{v === 'yes' ? 'Yes' : 'No'}</Text>
                  </Pressable>
                ))}
              </View>
            )}
          </View>
        ))}

        <Text style={st.label}>Message to the employer (optional)</Text>
        <TextInput style={[st.input, { minHeight: 90, textAlignVertical: 'top' }]} value={message} onChangeText={setMessage} multiline maxLength={3000} placeholder="A few lines about why you are a good fit" placeholderTextColor="#98A2B3" />

        <Pressable onPress={() => setAgree(!agree)} style={st.agree} accessibilityRole="checkbox" accessibilityState={{ checked: agree }}>
          <Ionicons name={agree ? 'checkbox' : 'square-outline'} size={22} color={colors.brand} />
          <Text style={st.agreeText}>
            I agree that JobsRack shares my application with this employer and creates a free account for me so I can track it.{' '}
            <Text style={{ color: colors.brand }} onPress={() => router.push('/page/privacy-policy')}>
              Privacy policy
            </Text>
          </Text>
        </Pressable>

        {!!err && <Text style={st.err}>{err}</Text>}
        <Button title={busy ? 'Sending…' : 'Send application'} onPress={send} disabled={busy} style={{ marginTop: 16 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const st = StyleSheet.create({
  job: { fontSize: 20, fontWeight: '800', color: colors.ink },
  co: { fontSize: 15, color: colors.text, marginTop: 2 },
  note: { fontSize: 13, color: colors.muted, marginTop: 6, marginBottom: 6 },
  label: { fontSize: 14, fontWeight: '600', color: colors.ink, marginTop: 14, marginBottom: 6 },
  input: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#D0D5DD', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 12, fontSize: 16, color: colors.ink },
  file: { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderStyle: 'dashed', borderColor: '#98A2B3', borderRadius: 10, padding: 14, backgroundColor: '#fff' },
  fileText: { flex: 1, color: colors.text, fontSize: 14 },
  yn: { flex: 1, borderWidth: 1, borderColor: colors.brand, borderRadius: 10, paddingVertical: 11, alignItems: 'center', backgroundColor: '#fff' },
  ynOn: { backgroundColor: colors.brand },
  ynText: { color: colors.brand, fontWeight: '700' },
  agree: { flexDirection: 'row', gap: 10, alignItems: 'flex-start', marginTop: 18 },
  agreeText: { flex: 1, fontSize: 13, color: colors.text, lineHeight: 19 },
  err: { color: colors.danger, fontSize: 14, marginTop: 12 },
  doneWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, backgroundColor: '#fff' },
  doneTitle: { fontSize: 24, fontWeight: '800', color: colors.ink, marginTop: 12 },
  doneText: { fontSize: 15, color: colors.text, textAlign: 'center', marginTop: 8, lineHeight: 22 },
});
