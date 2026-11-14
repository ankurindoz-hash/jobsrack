import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useState, useSyncExternalStore } from 'react';
import type { JobCard, SiteCode } from './api';

type Alert = { q: string; loc: string };
type Profile = { name: string; email: string; phone: string };
type State = {
  ready: boolean;
  site: SiteCode | null;
  saved: JobCard[];
  alerts: Alert[];
  pushOn: boolean;
  profile: Profile;
  applied: string[];
};

const KEY = 'jobsrack:v1';
let state: State = { ready: false, site: null, saved: [], alerts: [], pushOn: false, profile: { name: '', email: '', phone: '' }, applied: [] };
const subs = new Set<() => void>();

function emit() {
  subs.forEach((f) => f());
}
async function persist() {
  const { ready, ...rest } = state;
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify(rest));
  } catch {}
}
export async function loadStore() {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (raw) state = { ...state, ...JSON.parse(raw) };
  } catch {}
  state = { ...state, ready: true };
  emit();
}
function set(patch: Partial<State>) {
  state = { ...state, ...patch };
  emit();
  persist();
}

export function useStore<T>(pick: (s: State) => T): T {
  const get = useCallback(() => pick(state), [pick]);
  return useSyncExternalStore((f) => {
    subs.add(f);
    return () => subs.delete(f);
  }, get);
}
export const getState = () => state;

export const setSite = (site: SiteCode) => set({ site, alerts: [] });
export const setProfile = (profile: Profile) => set({ profile });
export const setPushOn = (pushOn: boolean) => set({ pushOn });

export function toggleSaved(job: JobCard) {
  const exists = state.saved.some((j) => j.id === job.id && j.site === job.site);
  set({ saved: exists ? state.saved.filter((j) => !(j.id === job.id && j.site === job.site)) : [{ ...job }, ...state.saved].slice(0, 200) });
  return !exists;
}
export const isSaved = (s: State, site: SiteCode | null, id: number) => s.saved.some((j) => j.id === id && j.site === site);
export const updateSaved = (jobs: JobCard[]) => set({ saved: jobs });

export function addAlert(a: Alert) {
  const key = (x: Alert) => `${x.q.trim().toLowerCase()}|${x.loc.trim().toLowerCase()}`;
  if (state.alerts.some((x) => key(x) === key(a))) return false;
  set({ alerts: [a, ...state.alerts].slice(0, 5) });
  return true;
}
export const removeAlert = (i: number) => set({ alerts: state.alerts.filter((_, n) => n !== i) });

export const markApplied = (site: SiteCode, id: number) => set({ applied: [...state.applied, `${site}:${id}`].slice(-500) });
export const hasApplied = (s: State, site: SiteCode | null, id: number) => s.applied.includes(`${site}:${id}`);

export function useHydrated() {
  const ready = useStore((s) => s.ready);
  const [started, setStarted] = useState(false);
  useEffect(() => {
    if (!started) {
      setStarted(true);
      if (!ready) loadStore();
    }
  }, [ready, started]);
  return ready;
}
