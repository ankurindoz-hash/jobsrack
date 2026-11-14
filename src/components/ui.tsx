import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View, type ViewStyle } from 'react-native';
import { timeAgo, type JobCard as Job } from '../lib/api';
import { isSaved, toggleSaved, useStore } from '../lib/store';
import { badgeColors, colors, radius } from '../lib/theme';

export function Badge({ label }: { label: string }) {
  const c = badgeColors[label] || { bg: '#F2F4F7', fg: colors.text };
  return (
    <View style={[s.badge, { backgroundColor: c.bg }]}>
      <Text style={[s.badgeText, { color: c.fg }]}>{label}</Text>
    </View>
  );
}

export function Pay({ text }: { text: string }) {
  if (!text) return null;
  return (
    <View style={s.pay}>
      <Text style={s.payText}>{text}</Text>
    </View>
  );
}

export function Button({ title, onPress, kind = 'primary', icon, disabled, style }: { title: string; onPress: () => void; kind?: 'primary' | 'outline' | 'ghost'; icon?: keyof typeof Ionicons.glyphMap; disabled?: boolean; style?: ViewStyle }) {
  const primary = kind === 'primary';
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [s.btn, primary ? s.btnPrimary : kind === 'outline' ? s.btnOutline : s.btnGhost, (pressed || disabled) && { opacity: 0.7 }, style]}
    >
      {icon ? <Ionicons name={icon} size={18} color={primary ? '#fff' : colors.brand} style={{ marginRight: 6 }} /> : null}
      <Text style={[s.btnText, { color: primary ? '#fff' : colors.brand }]}>{title}</Text>
    </Pressable>
  );
}

export function JobRow({ job }: { job: Job }) {
  const saved = useStore((st) => isSaved(st, job.site ?? null, job.id));
  const initials = (job.company || job.title)
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join('');
  return (
    <Pressable onPress={() => router.push({ pathname: '/job/[id]', params: { id: String(job.id), site: job.site ?? '' } })} style={({ pressed }) => [s.card, pressed && { opacity: 0.85 }]} accessibilityRole="button" accessibilityLabel={`${job.title} at ${job.company}`}>
      <View style={s.row}>
        <View style={s.avatar}>
          <Text style={s.avatarText}>{initials || 'J'}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={s.title} numberOfLines={2}>
            {job.title}
          </Text>
          {!!job.company && (
            <Text style={s.company} numberOfLines={1}>
              {job.company}
            </Text>
          )}
          {!!job.city && (
            <Text style={s.meta} numberOfLines={1}>
              <Ionicons name="location-outline" size={13} color={colors.muted} /> {job.city}
            </Text>
          )}
        </View>
        <Pressable hitSlop={12} onPress={() => toggleSaved(job)} accessibilityLabel={saved ? 'Remove from saved jobs' : 'Save job'}>
          <Ionicons name={saved ? 'bookmark' : 'bookmark-outline'} size={22} color={saved ? colors.brand : colors.muted} />
        </Pressable>
      </View>
      <View style={s.tags}>
        <Pay text={job.pay} />
        {job.badges.map((b) => (
          <Badge key={b} label={b} />
        ))}
      </View>
      {!!job.summary && (
        <Text style={s.summary} numberOfLines={2}>
          {job.summary}
        </Text>
      )}
      <Text style={s.posted}>{timeAgo(job.posted)}</Text>
    </Pressable>
  );
}

export function Empty({ icon, title, text, children }: { icon: keyof typeof Ionicons.glyphMap; title: string; text?: string; children?: React.ReactNode }) {
  return (
    <View style={s.empty}>
      <Ionicons name={icon} size={44} color={colors.line} />
      <Text style={s.emptyTitle}>{title}</Text>
      {!!text && <Text style={s.emptyText}>{text}</Text>}
      {children}
    </View>
  );
}

export const s = StyleSheet.create({
  badge: { borderRadius: 999, paddingHorizontal: 9, paddingVertical: 3, marginRight: 6, marginBottom: 6 },
  badgeText: { fontSize: 12, fontWeight: '600' },
  pay: { backgroundColor: colors.payBg, borderRadius: 8, paddingHorizontal: 9, paddingVertical: 3, marginRight: 6, marginBottom: 6 },
  payText: { color: colors.payText, fontWeight: '700', fontSize: 13 },
  btn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderRadius: 10, paddingVertical: 13, paddingHorizontal: 18 },
  btnPrimary: { backgroundColor: colors.brand },
  btnOutline: { borderWidth: 1, borderColor: colors.brand, backgroundColor: '#fff' },
  btnGhost: { backgroundColor: 'transparent' },
  btnText: { fontSize: 16, fontWeight: '700' },
  card: { backgroundColor: colors.card, borderRadius: radius, padding: 14, marginHorizontal: 14, marginBottom: 10, borderWidth: 1, borderColor: colors.line },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  avatar: { width: 40, height: 40, borderRadius: 10, backgroundColor: colors.navy, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  title: { fontSize: 16.5, fontWeight: '700', color: colors.ink, lineHeight: 21 },
  company: { fontSize: 14, color: colors.text, marginTop: 2 },
  meta: { fontSize: 13, color: colors.muted, marginTop: 2 },
  tags: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 10 },
  summary: { fontSize: 13.5, color: colors.text, lineHeight: 19, marginTop: 2 },
  posted: { fontSize: 12, color: colors.muted, marginTop: 8 },
  empty: { alignItems: 'center', padding: 32, marginTop: 30 },
  emptyTitle: { fontSize: 17, fontWeight: '700', color: colors.ink, marginTop: 10, textAlign: 'center' },
  emptyText: { fontSize: 14, color: colors.muted, marginTop: 6, textAlign: 'center', lineHeight: 20 },
});
