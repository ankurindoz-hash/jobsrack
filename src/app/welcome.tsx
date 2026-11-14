import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SITES, type SiteCode } from '../lib/api';
import { clearAlerts } from '../lib/push';
import { getState, setSite } from '../lib/store';
import { colors } from '../lib/theme';

const ORDER: SiteCode[] = ['ca', 'in', 'au', 'gl'];

export default function Welcome() {
  const current = getState().site;
  const choose = async (c: SiteCode) => {
    if (current && current !== c) clearAlerts(current);
    setSite(c);
    if (router.canGoBack()) router.back();
    else router.replace('/');
  };
  return (
    <SafeAreaView style={st.wrap}>
      <ScrollView contentContainerStyle={st.inner}>
        <Text style={st.logo}>JobsRack</Text>
        <Text style={st.h1}>Find your next job</Text>
        <Text style={st.sub}>Real jobs from real employers. Search, save and apply in minutes, no account needed.</Text>
        <Text style={st.q}>Where are you looking for work?</Text>
        {ORDER.map((c) => (
          <Pressable key={c} onPress={() => choose(c)} style={({ pressed }) => [st.opt, current === c && st.optOn, pressed && { opacity: 0.8 }]} accessibilityRole="button" accessibilityLabel={SITES[c].name}>
            <Text style={st.flag}>{SITES[c].flag}</Text>
            <View style={{ flex: 1 }}>
              <Text style={st.optTitle}>{SITES[c].short}</Text>
              <Text style={st.optSub}>{c === 'gl' ? 'Jobs worldwide' : SITES[c].host.replace('https://', '')}</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#98A2B3" />
          </Pressable>
        ))}
        <Text style={st.note}>You can change this any time in Account.</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const st = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: colors.navy },
  inner: { padding: 22, paddingTop: 40 },
  logo: { color: '#5FD3A0', fontWeight: '800', fontSize: 18, letterSpacing: 1 },
  h1: { color: '#fff', fontSize: 32, fontWeight: '800', marginTop: 18 },
  sub: { color: '#C9D2E3', fontSize: 16, lineHeight: 23, marginTop: 8 },
  q: { color: '#fff', fontSize: 17, fontWeight: '700', marginTop: 32, marginBottom: 12 },
  opt: { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: '#fff', borderRadius: 14, padding: 16, marginBottom: 10 },
  optOn: { borderWidth: 2, borderColor: '#5FD3A0' },
  flag: { fontSize: 28 },
  optTitle: { fontSize: 17, fontWeight: '700', color: colors.ink },
  optSub: { fontSize: 13, color: colors.muted, marginTop: 2 },
  note: { color: '#98A2B3', fontSize: 13, textAlign: 'center', marginTop: 14 },
});
