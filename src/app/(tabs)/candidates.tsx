import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { FlatList, Pressable, Text, TextInput, View } from 'react-native';
import { EmployerGate } from '../../components/EmployerGate';
import { k, Loading, LoadError, useLoad } from '../../components/kit';
import { Button, Empty } from '../../components/ui';
import { searchCandidates } from '../../lib/account';
import { SITES, timeAgo } from '../../lib/api';
import { useStore } from '../../lib/store';
import { colors } from '../../lib/theme';

function Search() {
  const site = useStore((s) => s.site)!;
  const [q, setQ] = useState('');
  const [loc, setLoc] = useState('');
  const [active, setActive] = useState({ q: '', loc: '' });
  const { data, error, loading, reload } = useLoad(() => searchCandidates(site, active.q, active.loc), [site, active.q, active.loc]);
  const go = () => setActive({ q: q.trim(), loc: loc.trim() });
  return (
    <View style={{ flex: 1 }}>
      <View style={{ padding: 14, paddingBottom: 6, gap: 8 }}>
        <TextInput value={q} onChangeText={setQ} onSubmitEditing={go} returnKeyType="search" placeholder="Job title or skill, e.g. forklift" placeholderTextColor="#98A2B3" style={k.input} />
        <TextInput value={loc} onChangeText={setLoc} onSubmitEditing={go} returnKeyType="search" placeholder={`City, e.g. ${SITES[site].example}`} placeholderTextColor="#98A2B3" style={k.input} />
        <Button title="Search candidates" icon="search" onPress={go} />
      </View>
      {!data ? (
        loading ? <Loading /> : <LoadError text={error} retry={reload} />
      ) : (
        <FlatList
          data={data.items}
          keyExtractor={(c) => String(c.id)}
          contentContainerStyle={{ padding: 14 }}
          ListEmptyComponent={<Empty icon="people-outline" title="No candidates found" text="Try a broader job title or leave the city empty." />}
          renderItem={({ item }) => (
            <Pressable onPress={() => router.push({ pathname: '/candidate/[id]', params: { id: String(item.id) } })} style={[k.card, { flexDirection: 'row', alignItems: 'center', gap: 12 }]}>
              <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: colors.navy, alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ color: '#fff', fontWeight: '800' }}>{item.name.slice(0, 1).toUpperCase()}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={k.title}>{item.name}</Text>
                <Text style={k.sub} numberOfLines={1}>
                  {[item.headline, item.city].filter(Boolean).join(' · ') || 'Job seeker'}
                </Text>
                <Text style={[k.sub, { fontSize: 12 }]}>Active {timeAgo(item.updated)}</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#98A2B3" />
            </Pressable>
          )}
        />
      )}
    </View>
  );
}

export default function Candidates() {
  return (
    <EmployerGate what="search candidates">
      <Search />
    </EmployerGate>
  );
}
