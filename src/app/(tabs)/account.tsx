import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import { router } from 'expo-router';
import { Alert, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { Group, k, type RowItem } from '../../components/kit';
import { Button } from '../../components/ui';
import { logout } from '../../lib/account';
import { SITES } from '../../lib/api';
import { getToken } from '../../lib/push';
import { setMode, signOutLocal, useStore } from '../../lib/store';
import { colors, radius } from '../../lib/theme';

export default function Account() {
  const site = useStore((s) => s.site);
  const auth = useStore((s) => s.auth);
  const mode = useStore((s) => s.mode);
  if (!site) return null;
  const user = auth?.user;
  const emp = mode === 'employer';

  const switchMode = (on: boolean) => {
    if (on && user && user.role !== 'employer') {
      Alert.alert('Employer account needed', 'You are signed in as a job seeker. To hire, sign out and create a free employer account.');
      return;
    }
    setMode(on ? 'employer' : 'seeker');
    router.replace(on ? '/dashboard' : '/');
  };

  const signOut = () =>
    Alert.alert('Sign out?', '', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign out',
        style: 'destructive',
        onPress: async () => {
          await logout(site, await getToken(false).catch(() => null));
          signOutLocal();
          router.replace('/account');
        },
      },
    ]);

  const accountRows: RowItem[] = user
    ? emp
      ? [
          { icon: 'business-outline', title: 'Company profile', sub: user.company || user.name, href: '/me/profile' },
          { icon: 'chatbubbles-outline', title: 'Messages', href: '/messages' },
        ]
      : [
          { icon: 'person-outline', title: 'My profile and resume', sub: user.headline || 'Add the job you want so employers can find you', href: '/me/profile' },
          { icon: 'paper-plane-outline', title: 'My applications', sub: 'Status of every job you applied to', href: '/me/applications' },
          { icon: 'chatbubbles-outline', title: 'Messages from employers', href: '/messages' },
        ]
    : [];

  return (
    <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 32 }}>
      {user ? (
        <View style={st.me}>
          <View style={st.avatar}>
            <Text style={st.avatarText}>{(user.name || user.email).slice(0, 1).toUpperCase()}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={st.name}>{user.name}</Text>
            <Text style={k.sub}>
              {user.role === 'employer' ? `Employer${user.company ? ` · ${user.company}` : ''}` : 'Job seeker'} · {SITES[site].short}
            </Text>
          </View>
        </View>
      ) : (
        <View style={st.signin}>
          <Text style={st.name}>{emp ? 'Hire on JobsRack' : 'Get more from JobsRack'}</Text>
          <Text style={[k.p, { marginTop: 4 }]}>
            {emp ? 'Post jobs for free, see applicants and message them from your phone.' : 'Track your applications, keep your resume ready and let employers find you.'}
          </Text>
          <Button title="Sign in" onPress={() => router.push({ pathname: '/auth/login', params: { role: emp ? 'employer' : 'candidate' } })} style={{ marginTop: 14 }} />
          <Button title="Create a free account" kind="outline" onPress={() => router.push({ pathname: '/auth/register', params: { role: emp ? 'employer' : 'candidate' } })} style={{ marginTop: 10 }} />
        </View>
      )}

      <View style={[k.box, { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 12, marginBottom: 18 }]}>
        <Ionicons name="briefcase-outline" size={22} color={colors.brand} />
        <View style={{ flex: 1 }}>
          <Text style={k.title}>I'm hiring</Text>
          <Text style={k.sub}>{emp ? 'Showing employer tools' : 'Switch to post jobs and find candidates'}</Text>
        </View>
        <Switch value={emp} onValueChange={switchMode} trackColor={{ true: colors.brand, false: '#D0D5DD' }} thumbColor="#fff" />
      </View>

      {accountRows.length > 0 && <Group title="Your account" rows={accountRows} />}

      {!emp && (
        <Group
          title="Explore"
          rows={[
            { icon: 'sparkles-outline', title: 'AI resume builder', sub: 'A professional resume in a minute, free', href: '/resume' },
            { icon: 'cash-outline', title: 'Salaries', sub: 'Typical pay by job title', href: '/salaries' },
            { icon: 'business-outline', title: 'Companies', sub: 'Employers hiring now, with reviews', href: '/companies' },
            { icon: 'newspaper-outline', title: 'Career advice', href: '/blog' },
          ]}
        />
      )}

      <Group
        title="App"
        rows={[
          { icon: 'globe-outline', title: 'Country', sub: `${SITES[site].flag} ${SITES[site].short}`, href: '/welcome' },
          { icon: 'shield-checkmark-outline', title: 'Privacy policy', href: '/page/privacy-policy' },
          { icon: 'document-text-outline', title: 'Terms', href: '/page/terms-of-use' },
          { icon: 'mail-outline', title: 'Contact us', href: '/contact' },
          ...(user ? [{ icon: 'log-out-outline' as const, title: 'Sign out', onPress: signOut, danger: true }] : []),
        ]}
      />
      <Text style={st.ver}>JobsRack {Constants.expoConfig?.version ?? ''}</Text>
    </ScrollView>
  );
}

const st = StyleSheet.create({
  me: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#fff', borderRadius: radius, borderWidth: 1, borderColor: colors.line, padding: 14, marginBottom: 14 },
  avatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: colors.navy, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#fff', fontWeight: '800', fontSize: 20 },
  name: { fontSize: 18, fontWeight: '800', color: colors.ink },
  signin: { backgroundColor: '#fff', borderRadius: radius, borderWidth: 1, borderColor: colors.line, padding: 16, marginBottom: 14 },
  ver: { textAlign: 'center', color: '#98A2B3', fontSize: 12, marginTop: 8 },
});
