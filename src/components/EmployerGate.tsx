import { router } from 'expo-router';
import { Text, View } from 'react-native';
import { useStore } from '../lib/store';
import { colors } from '../lib/theme';
import { k } from './kit';
import { Button } from './ui';

/** Employer screens need an employer account; show a friendly sign-in prompt otherwise. */
export function EmployerGate({ children, what }: { children: React.ReactNode; what: string }) {
  const user = useStore((s) => s.auth?.user);
  if (user?.role === 'employer') return <>{children}</>;
  return (
    <View style={{ padding: 20 }}>
      <View style={k.card}>
        <Text style={{ fontSize: 20, fontWeight: '800', color: colors.ink }}>Hire on JobsRack</Text>
        <Text style={[k.p, { marginTop: 6 }]}>
          {user ? `You are signed in as a job seeker. To ${what}, sign out from Account and create a free employer account.` : `Create a free employer account to ${what}. Posting jobs is free.`}
        </Text>
        {!user && (
          <>
            <Button title="Create an employer account" onPress={() => router.push({ pathname: '/auth/register', params: { role: 'employer' } })} style={{ marginTop: 14 }} />
            <Button title="Sign in" kind="outline" onPress={() => router.push({ pathname: '/auth/login', params: { role: 'employer' } })} style={{ marginTop: 10 }} />
          </>
        )}
      </View>
    </View>
  );
}
