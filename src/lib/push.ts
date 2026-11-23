import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { registerMyPush } from './account';
import { registerPush, type SiteCode } from './api';
import { getState, setPushOn } from './store';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export async function getToken(ask: boolean): Promise<string | null> {
  if (Platform.OS === 'web' || !Device.isDevice) return null;
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Job alerts',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 200, 120, 200],
      lightColor: '#1F7A4D',
    });
  }
  let { status } = await Notifications.getPermissionsAsync();
  if (status !== 'granted' && ask) status = (await Notifications.requestPermissionsAsync()).status;
  if (status !== 'granted') return null;
  const projectId = Constants?.expoConfig?.extra?.eas?.projectId ?? Constants?.easConfig?.projectId;
  if (!projectId) return null;
  try {
    return (await Notifications.getExpoPushTokenAsync({ projectId })).data;
  } catch {
    return null;
  }
}

/** Send the current alerts to the portal. Returns false if notifications are not allowed. */
export async function syncAlerts(ask = false): Promise<boolean> {
  const s = getState();
  if (!s.site) return false;
  const token = await getToken(ask);
  if (!token) {
    if (ask) setPushOn(false);
    return false;
  }
  const ok = await registerPush(s.site as SiteCode, token, s.alerts).catch(() => false);
  setPushOn(ok && s.alerts.length > 0);
  return ok;
}

/** Stop alerts on the old portal when the user switches country. */
export async function clearAlerts(site: SiteCode) {
  const token = await getToken(false);
  if (token) await registerPush(site, token, []).catch(() => false);
}

/** Signed-in users: register this phone for personal notifications. Asks for permission once. */
export async function syncMyPush() {
  const a = getState().auth;
  if (!a) return;
  const token = await getToken(true);
  if (token) await registerMyPush(a.site as SiteCode, token).catch(() => {});
}
