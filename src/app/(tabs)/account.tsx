import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import { router } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SITES } from '../../lib/api';
import { useStore } from '../../lib/store';
import { colors, radius } from '../../lib/theme';

type Row = { icon: keyof typeof Ionicons.glyphMap; title: string; sub?: string; path?: string; onPress?: () => void };

export default function Account() {
  const site = useStore((s) => s.site);
  if (!site) return null;
  const host = SITES[site].host;
  const open = (path: string) => WebBrowser.openBrowserAsync(host + path, { controlsColor: colors.brand, toolbarColor: '#fff' });

  const groups: { title: string; rows: Row[] }[] = [
    {
      title: 'Your account',
      rows: [
        { icon: 'log-in-outline', title: 'Sign in', sub: 'See your applications and their status', path: '/login/' },
        { icon: 'person-add-outline', title: 'Create a free account', sub: 'Build your profile and resume', path: '/candidate-registration/' },
        { icon: 'chatbubbles-outline', title: 'Messages from employers', path: '/messages/' },
      ],
    },
    {
      title: 'Explore',
      rows: [
        { icon: 'cash-outline', title: 'Salaries', sub: 'Typical pay by job title and city', path: '/salaries/' },
        { icon: 'business-outline', title: 'Companies', sub: 'Employers hiring now, with reviews', path: '/companies/' },
        { icon: 'newspaper-outline', title: 'Career advice', path: '/blogs/' },
      ],
    },
    {
      title: 'Employers',
      rows: [{ icon: 'briefcase-outline', title: 'Post a job', sub: site === 'ca' ? 'Hire on JobsRack Canada' : 'Free job posting', path: '/employer-registration/' }],
    },
    {
      title: 'App',
      rows: [
        { icon: 'globe-outline', title: 'Country', sub: `${SITES[site].flag} ${SITES[site].short}`, onPress: () => router.push('/welcome') },
        { icon: 'shield-checkmark-outline', title: 'Privacy policy', path: '/privacy-policy/' },
        { icon: 'document-text-outline', title: 'Terms', path: '/terms-and-policies/' },
        { icon: 'mail-outline', title: 'Contact us', path: '/contact-us/' },
      ],
    },
  ];

  return (
    <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 32 }}>
      {groups.map((g) => (
        <View key={g.title} style={{ marginBottom: 18 }}>
          <Text style={st.h}>{g.title}</Text>
          <View style={st.box}>
            {g.rows.map((r, i) => (
              <Pressable key={r.title} onPress={r.onPress ?? (() => open(r.path!))} style={({ pressed }) => [st.row, i > 0 && st.sep, pressed && { backgroundColor: '#F9FAFB' }]} accessibilityRole="button">
                <Ionicons name={r.icon} size={22} color={colors.brand} />
                <View style={{ flex: 1 }}>
                  <Text style={st.title}>{r.title}</Text>
                  {!!r.sub && <Text style={st.sub}>{r.sub}</Text>}
                </View>
                <Ionicons name={r.onPress ? 'chevron-forward' : 'open-outline'} size={18} color="#98A2B3" />
              </Pressable>
            ))}
          </View>
        </View>
      ))}
      <Text style={st.ver}>JobsRack {Constants.expoConfig?.version ?? ''}</Text>
    </ScrollView>
  );
}

const st = StyleSheet.create({
  h: { fontSize: 13, fontWeight: '700', color: colors.muted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8, marginLeft: 4 },
  box: { backgroundColor: '#fff', borderRadius: radius, borderWidth: 1, borderColor: colors.line, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 },
  sep: { borderTopWidth: 1, borderTopColor: colors.line },
  title: { fontSize: 15.5, fontWeight: '600', color: colors.ink },
  sub: { fontSize: 13, color: colors.muted, marginTop: 2 },
  ver: { textAlign: 'center', color: '#98A2B3', fontSize: 12, marginTop: 8 },
});
