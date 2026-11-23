import { Ionicons } from '@expo/vector-icons';
import { router, Stack } from 'expo-router';
import { useState } from 'react';
import { FlatList, Pressable, Text, TextInput, View } from 'react-native';
import { k, Loading, LoadError, useLoad } from '../../components/kit';
import { Empty } from '../../components/ui';
import { companies } from '../../lib/account';
import { useStore } from '../../lib/store';
import { colors } from '../../lib/theme';

export default function Companies() {
  const site = useStore((s) => s.site)!;
  const [q, setQ] = useState('');
  const [active, setActive] = useState('');
  const { data, error, loading, reload } = useLoad(() => companies(site, active), [site, active]);
  return (
    <View style={{ flex: 1 }}>
      <Stack.Screen options={{ title: 'Companies hiring' }} />
      <View style={{ padding: 14, paddingBottom: 4 }}>
        <TextInput value={q} onChangeText={setQ} onSubmitEditing={() => setActive(q.trim())} returnKeyType="search" placeholder="Search a company" placeholderTextColor="#98A2B3" style={k.input} />
      </View>
      {!data ? (
        loading ? <Loading /> : <LoadError text={error} retry={reload} />
      ) : (
        <FlatList
          data={data.items}
          keyExtractor={(c) => c.id}
          contentContainerStyle={{ padding: 14 }}
          ListEmptyComponent={<Empty icon="business-outline" title="No companies found" />}
          renderItem={({ item }) => (
            <Pressable onPress={() => router.push({ pathname: '/companies/[id]', params: { id: item.id } })} style={[k.card, { flexDirection: 'row', alignItems: 'center', gap: 12 }]}>
              <View style={{ width: 42, height: 42, borderRadius: 10, backgroundColor: colors.navy, alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ color: '#fff', fontWeight: '700' }}>{item.name.slice(0, 2).toUpperCase()}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={k.title} numberOfLines={1}>
                  {item.name}
                </Text>
                <Text style={k.sub}>
                  {item.jobs} open {item.jobs === 1 ? 'job' : 'jobs'}
                  {item.city ? ` · ${item.city}` : ''}
                  {item.reviews ? ` · ★ ${item.rating.toFixed(1)} (${item.reviews})` : ''}
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
