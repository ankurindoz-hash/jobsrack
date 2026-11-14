import * as Notifications from 'expo-notifications';
import { router, Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { ActivityIndicator, Platform, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import '../lib/push';
import { setSite, useHydrated, useStore } from '../lib/store';
import { colors } from '../lib/theme';

export default function RootLayout() {
  const ready = useHydrated();
  const site = useStore((s) => s.site);
  const last = Platform.OS === 'web' ? null : Notifications.useLastNotificationResponse();

  useEffect(() => {
    if (ready && !site) router.replace('/welcome');
  }, [ready, site]);

  // Open the job from a tapped job-alert notification
  useEffect(() => {
    const data = last?.notification?.request?.content?.data as { site?: string; jobId?: number } | undefined;
    if (!ready || !data?.jobId) return;
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
      </Stack>
    </SafeAreaProvider>
  );
}
