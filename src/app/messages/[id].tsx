import { Ionicons } from '@expo/vector-icons';
import { Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { FlatList, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Loading, LoadError, useLoad } from '../../components/kit';
import { sendMessage, thread, type Message } from '../../lib/account';
import { timeAgo } from '../../lib/api';
import { useStore } from '../../lib/store';
import { colors } from '../../lib/theme';

export default function Conversation() {
  const site = useStore((s) => s.site)!;
  const id = String(useLocalSearchParams<{ id: string }>().id);
  const { data, error, loading, reload, setData } = useLoad(() => thread(site, id), [site, id]);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const list = useRef<FlatList<Message>>(null);

  // Check for new replies every 20 seconds while the chat is open.
  useEffect(() => {
    const t = setInterval(() => thread(site, id).then(setData).catch(() => {}), 20000);
    return () => clearInterval(t);
  }, [site, id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!data) return loading ? <Loading /> : <LoadError text={error} retry={reload} />;

  const send = async () => {
    const t = text.trim();
    if (!t) return;
    setBusy(true);
    setErr('');
    try {
      const m = await sendMessage(site, id, t);
      setData({ ...data, messages: [...data.messages, m] });
      setText('');
      setTimeout(() => list.current?.scrollToEnd({ animated: true }), 100);
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={90}>
      <Stack.Screen options={{ title: data.thread.with }} />
      {!!data.thread.job && <Text style={st.job}>About: {data.thread.job}</Text>}
      <FlatList
        ref={list}
        data={data.messages}
        keyExtractor={(m) => String(m.id)}
        contentContainerStyle={{ padding: 14 }}
        onContentSizeChange={() => list.current?.scrollToEnd({ animated: false })}
        renderItem={({ item }) => (
          <View style={[st.bubble, item.mine ? st.mine : st.theirs]}>
            <Text style={[st.text, item.mine && { color: '#fff' }]}>{item.text}</Text>
            <Text style={[st.time, item.mine && { color: '#D1FADF' }]}>{timeAgo(item.time)}</Text>
          </View>
        )}
      />
      {!!err && <Text style={st.err}>{err}</Text>}
      <SafeAreaView edges={['bottom']} style={st.bar}>
        <TextInput value={text} onChangeText={setText} placeholder="Write a message" placeholderTextColor="#98A2B3" style={st.input} multiline />
        <Pressable onPress={send} disabled={busy || !text.trim()} style={[st.send, (busy || !text.trim()) && { opacity: 0.5 }]} accessibilityLabel="Send">
          <Ionicons name="send" size={20} color="#fff" />
        </Pressable>
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
}

const st = StyleSheet.create({
  job: { backgroundColor: '#fff', padding: 10, paddingHorizontal: 16, color: colors.brand, fontWeight: '600', borderBottomWidth: 1, borderBottomColor: colors.line },
  bubble: { maxWidth: '82%', borderRadius: 14, padding: 10, marginBottom: 8 },
  mine: { alignSelf: 'flex-end', backgroundColor: colors.brand },
  theirs: { alignSelf: 'flex-start', backgroundColor: '#fff', borderWidth: 1, borderColor: colors.line },
  text: { fontSize: 15, color: colors.ink, lineHeight: 21 },
  time: { fontSize: 11, color: colors.muted, marginTop: 4 },
  bar: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, padding: 10, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: colors.line },
  input: { flex: 1, maxHeight: 120, borderWidth: 1, borderColor: colors.line, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 9, fontSize: 15, color: colors.ink },
  send: { width: 42, height: 42, borderRadius: 21, backgroundColor: colors.brand, alignItems: 'center', justifyContent: 'center' },
  err: { color: colors.danger, paddingHorizontal: 16, paddingBottom: 6 },
});
