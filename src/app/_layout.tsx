import * as Notifications from 'expo-notifications';
import { router, Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { ActivityIndicator, Platform, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { syncMyPush } from '../lib/push';
import { countOpen } from '../lib/review';
import { setSite, useHydrated, useStore } from '../lib/store';
import { colors } from '../lib/theme';

export default function RootLayout() {
  const ready = useHydrated();
  const site = useStore((s) => s.site);
  const authKey = useStore((s) => (s.auth ? `${s.auth.site}:${s.auth.user.id}` : ''));
  const last = Platform.OS === 'web' ? null : Notifications.useLastNotificationResponse();

  useEffect(() => {
    if (ready && !site) router.replace('/welcome');
  }, [ready, site]);

  useEffect(() => {
    if (ready) countOpen();
  }, [ready]);

  // Signed in: let the portal notify this phone about messages and shortlisting
  useEffect(() => {
    if (ready && authKey && Platform.OS !== 'web') syncMyPush();
  }, [ready, authKey]);

  // Open what a tapped notification is about
  useEffect(() => {
    const data = last?.notification?.request?.content?.data as { site?: string; jobId?: number; type?: string; thread?: string } | undefined;
    if (!ready || !data) return;
    if (data.type === 'msg' && data.thread) return void router.push({ pathname: '/messages/[id]', params: { id: data.thread } });
    if (data.type === 'app') return void router.push('/me/applications');
    if (!data.jobId) return;
    if (data.site && data.site !== site && ['ca', 'in', 'au', 'gl'].includes(data.site)) setSite(data.site as any);
    router.push({ pathname: '/job/[id]', params: { id: String(data.jobId), site: data.site ?? '' } });
  }, [last, ready]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!ready) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.navy }}>
        <ActivityIndicator color="#fff" />
      </View>
    );
  }
  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerTintColor: colors.brand,
          headerTitleStyle: { color: colors.ink, fontWeight: '700' },
          contentStyle: { backgroundColor: colors.bg },
          headerBackButtonDisplayMode: 'minimal',
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="welcome" options={{ headerShown: false, gestureEnabled: false }} />
        <Stack.Screen name="job/[id]" options={{ title: 'Job details' }} />
        <Stack.Screen name="apply/[id]" options={{ title: 'Apply', presentation: 'modal' }} />
        <Stack.Screen name="auth/login" options={{ title: 'Sign in', presentation: 'modal' }} />
        <Stack.Screen name="auth/register" options={{ title: 'Create account', presentation: 'modal' }} />
        <Stack.Screen name="auth/forgot" options={{ title: 'Reset password' }} />
        <Stack.Screen name="web" options={{ title: '' }} />
        <Stack.Screen name="resume" options={{ title: 'AI resume builder' }} />
        <Stack.Screen name="pay-checker" options={{ title: 'Am I paid fairly?' }} />
        <Stack.Screen name="collection/[k]" options={{ title: '' }} />
      </Stack>
    </SafeAreaProvider>
  );
}
