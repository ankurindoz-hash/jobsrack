import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native';
import { colors, radius } from '../lib/theme';
import { Button, Empty } from './ui';

/** Load data for a screen with loading / error / retry handled. */
export function useLoad<T>(fn: () => Promise<T>, deps: any[]) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const run = useCallback(() => {
    setLoading(true);
    setError('');
    fn()
      .then((d) => setData(d))
      .catch((e) => setError(e.message || 'Something went wrong.'))
      .finally(() => setLoading(false));
  }, deps); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(run, [run]);
  return { data, error, loading, reload: run, setData };
}

export function Loading() {
  return <ActivityIndicator color={colors.brand} style={{ marginTop: 40 }} />;
}

export function LoadError({ text, retry }: { text: string; retry: () => void }) {
  return (
    <Empty icon="cloud-offline-outline" title="Could not load" text={text}>
      <Button title="Try again" kind="outline" onPress={retry} style={{ marginTop: 16 }} />
    </Empty>
  );
}

export function Field({ label, hint, ...p }: TextInputProps & { label: string; hint?: string }) {
  return (
    <View style={{ marginBottom: 14 }}>
      <Text style={k.label}>{label}</Text>
      <TextInput placeholderTextColor="#98A2B3" {...p} style={[k.input, p.multiline && { minHeight: 110, textAlignVertical: 'top' }, p.style]} />
      {!!hint && <Text style={k.hint}>{hint}</Text>}
    </View>
  );
}

export function Choice<T extends string | number>({ label, options, value, onChange }: { label: string; options: { value: T; label: string }[]; value: T | undefined; onChange: (v: T) => void }) {
  return (
    <View style={{ marginBottom: 14 }}>
      <Text style={k.label}>{label}</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {options.map((o) => (
          <Pressable key={String(o.value)} onPress={() => onChange(o.value)} style={[k.chip, value === o.value && k.chipOn]} accessibilityRole="radio" accessibilityState={{ selected: value === o.value }}>
            <Text style={[k.chipText, value === o.value && { color: '#fff' }]}>{o.label}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

export type RowItem = { icon: keyof typeof Ionicons.glyphMap; title: string; sub?: string; href?: any; onPress?: () => void; danger?: boolean };

export function Group({ title, rows }: { title?: string; rows: RowItem[] }) {
  return (
    <View style={{ marginBottom: 18 }}>
      {!!title && <Text style={k.h}>{title}</Text>}
      <View style={k.box}>
        {rows.map((r, i) => (
          <Pressable key={r.title} onPress={r.onPress ?? (() => router.push(r.href))} style={({ pressed }) => [k.row, i > 0 && k.sep, pressed && { backgroundColor: '#F9FAFB' }]} accessibilityRole="button">
            <Ionicons name={r.icon} size={22} color={r.danger ? colors.danger : colors.brand} />
            <View style={{ flex: 1 }}>
              <Text style={[k.title, r.danger && { color: colors.danger }]}>{r.title}</Text>
              {!!r.sub && <Text style={k.sub}>{r.sub}</Text>}
            </View>
            <Ionicons name="chevron-forward" size={18} color="#98A2B3" />
          </Pressable>
        ))}
      </View>
    </View>
  );
}

export function ErrorText({ text }: { text: string }) {
  return text ? <Text style={k.err}>{text}</Text> : null;
}

export const k = StyleSheet.create({
  label: { fontSize: 14, fontWeight: '600', color: colors.ink, marginBottom: 6 },
  hint: { fontSize: 12.5, color: colors.muted, marginTop: 4 },
  input: { backgroundColor: '#fff', borderWidth: 1, borderColor: colors.line, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 11, fontSize: 16, color: colors.ink },
  chip: { borderWidth: 1, borderColor: colors.line, backgroundColor: '#fff', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 7 },
  chipOn: { backgroundColor: colors.brand, borderColor: colors.brand },
  chipText: { fontSize: 14, color: colors.text, fontWeight: '600' },
  h: { fontSize: 13, fontWeight: '700', color: colors.muted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8, marginLeft: 4 },
  box: { backgroundColor: '#fff', borderRadius: radius, borderWidth: 1, borderColor: colors.line, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 },
  sep: { borderTopWidth: 1, borderTopColor: colors.line },
  title: { fontSize: 15.5, fontWeight: '600', color: colors.ink },
  sub: { fontSize: 13, color: colors.muted, marginTop: 2 },
  err: { color: colors.danger, backgroundColor: colors.dangerBg, padding: 10, borderRadius: 8, marginBottom: 12, fontSize: 14 },
  card: { backgroundColor: '#fff', borderRadius: radius, borderWidth: 1, borderColor: colors.line, padding: 14, marginBottom: 12 },
  p: { fontSize: 15, color: colors.text, lineHeight: 22 },
});
