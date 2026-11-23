import AsyncStorage from '@react-native-async-storage/async-storage';
import * as StoreReview from 'expo-store-review';
import { Platform } from 'react-native';

/**
 * Google Play's in-app review card. We only ask at good moments (after an application is sent,
 * after a job is posted, or on the 4th visit), at most once every 60 days from our side.
 * Google decides whether the card actually shows and limits it further.
 */
const KEY = 'jobsrack:review';
type S = { opens: number; asked: number };

async function get(): Promise<S> {
  try {
    const r = await AsyncStorage.getItem(KEY);
    return r ? { opens: 0, asked: 0, ...JSON.parse(r) } : { opens: 0, asked: 0 };
  } catch {
    return { opens: 0, asked: 0 };
  }
}
async function put(s: S) {
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify(s));
  } catch {}
}

export async function askForReview(delayMs = 1200) {
  if (Platform.OS === 'web') return;
  const s = await get();
  if (Date.now() - s.asked < 60 * 24 * 3600 * 1000) return;
  try {
    if (!(await StoreReview.isAvailableAsync())) return;
    await put({ ...s, asked: Date.now() });
    setTimeout(() => StoreReview.requestReview().catch(() => {}), delayMs);
  } catch {}
}

/** Call once per app start. Asks on the 4th visit. */
export async function countOpen() {
  const s = await get();
  const opens = s.opens + 1;
  await put({ ...s, opens });
  if (opens === 4) askForReview(4000);
}
