import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router/js-tabs';
import type { ColorValue } from 'react-native';
import { useStore } from '../../lib/store';
import { colors } from '../../lib/theme';

const icon =
  (name: keyof typeof Ionicons.glyphMap, active: keyof typeof Ionicons.glyphMap) =>
  ({ color, focused, size }: { color: ColorValue; focused: boolean; size: number }) => <Ionicons name={focused ? active : name} size={size} color={color as string} />;

/** Job seekers see Jobs / Saved / Alerts; employers (switch in Account) see My jobs / Post a job / Candidates. */
export default function TabsLayout() {
  const emp = useStore((s) => s.mode === 'employer');
  const seek = (o: object) => (emp ? { ...o, href: null } : o);
  const hire = (o: object) => (emp ? o : { ...o, href: null });
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.brand,
        tabBarInactiveTintColor: '#98A2B3',
        headerTitleStyle: { fontWeight: '700', color: colors.ink },
        sceneStyle: { backgroundColor: colors.bg },
      }}
    >
      <Tabs.Screen name="index" options={seek({ title: 'Jobs', headerShown: false, tabBarIcon: icon('search-outline', 'search') })} />
      <Tabs.Screen name="saved" options={seek({ title: 'Saved', tabBarIcon: icon('bookmark-outline', 'bookmark') })} />
      <Tabs.Screen name="alerts" options={seek({ title: 'Job alerts', tabBarLabel: 'Alerts', tabBarIcon: icon('notifications-outline', 'notifications') })} />
      <Tabs.Screen name="dashboard" options={hire({ title: 'My jobs', tabBarIcon: icon('briefcase-outline', 'briefcase') })} />
      <Tabs.Screen name="post" options={hire({ title: 'Post a job', tabBarLabel: 'Post job', tabBarIcon: icon('add-circle-outline', 'add-circle') })} />
      <Tabs.Screen name="candidates" options={hire({ title: 'Find candidates', tabBarLabel: 'Candidates', tabBarIcon: icon('people-outline', 'people') })} />
      <Tabs.Screen name="account" options={{ title: 'Account', tabBarIcon: icon('person-circle-outline', 'person-circle') }} />
    </Tabs>
  );
}
