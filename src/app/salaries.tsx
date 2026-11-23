import { Ionicons } from '@expo/vector-icons';
import { router, Stack } from 'expo-router';
import { useState } from 'react';
import { FlatList, Pressable, Text, TextInput, View } from 'react-native';
import { k, Loading, LoadError, useLoad } from '../components/kit';
import { Empty } from '../components/ui';
import { salaries } from '../lib/account';
import { useStore } from '../lib/store';
import { colors } from '../lib/theme';

export default function Salaries() {
  const site = useStore((s) => s.site)!;
  const [q, setQ] = useState('');
  const [active, setActive] = useState('');
  const { data, error, loading, reload } = useLoad(() => salaries(site, active), [site, active]);
  return (
    <View style={{ flex: 1 }}>
      <Stack.Screen options={{ title: 'Salaries' }} />
      <View style={{ padding: 14, paddingBottom: 4 }}>
        <TextInput value={q} onChangeText={setQ} onSubmitEditing={() => setActive(q.trim())} returnKeyType="search" placeholder="Search a job title, e.g. driver" placeholderTextColor="#98A2B3" style={k.input} />
        <Text style={[k.hint, { marginTop: 8 }]}>Typical pay from job ads on JobsRack.</Text>
      </View>
      {!data ? (
        loading ? <Loading /> : <LoadError text={error} retry={reload} />
      ) : (
        <FlatList
          data={data}
          keyExtractor={(s) => s.title}
          contentContainerStyle={{ padding: 14 }}
          ListEmptyComponent={<Empty icon="cash-outline" title="No salary data yet" text="Try a broader job title." />}
          renderItem={({ item }) => (
            <Pressable onPress={() => router.push({ pathname: '/', params: { q: item.title, loc: '' } })} style={[k.card, { flexDirection: 'row', alignItems: 'center' }]}>
              <View style={{ flex: 1 }}>
                <Text style={k.title}>{item.title}</Text>
                <Text style={{ fontSize: 18, fontWeight: '800', color: colors.payText, marginTop: 4 }}>{item.avg}</Text>
                <Text style={k.sub}>
                  Range {item.min} – {item.max} · from {item.n} {item.n === 1 ? 'job' : 'jobs'}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#98A2B3" />
            </Pressable>
          )}
        />
      )}
    </View>
  );
}
