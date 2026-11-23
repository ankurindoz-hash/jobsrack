import { Image } from 'react-native';
import { router, Stack } from 'expo-router';
import { FlatList, Pressable, Text, View } from 'react-native';
import { k, Loading, LoadError, useLoad } from '../../components/kit';
import { Empty } from '../../components/ui';
import { posts } from '../../lib/account';
import { timeAgo } from '../../lib/api';
import { useStore } from '../../lib/store';

export default function Blog() {
  const site = useStore((s) => s.site)!;
  const { data, error, loading, reload } = useLoad(() => posts(site, 1), [site]);
  if (!data) return loading ? <Loading /> : <LoadError text={error} retry={reload} />;
  return (
    <>
      <Stack.Screen options={{ title: 'Career advice' }} />
      <FlatList
        data={data.items}
        keyExtractor={(p) => String(p.id)}
        contentContainerStyle={{ padding: 14 }}
        ListEmptyComponent={<Empty icon="newspaper-outline" title="No articles yet" />}
        renderItem={({ item }) => (
          <Pressable onPress={() => router.push({ pathname: '/blog/[id]', params: { id: String(item.id) } })} style={[k.card, { padding: 0, overflow: 'hidden' }]}>
            {!!item.image && <Image source={{ uri: item.image }} style={{ width: '100%', height: 160 }} resizeMode="cover" />}
            <View style={{ padding: 14 }}>
              <Text style={k.title}>{item.title}</Text>
              <Text style={[k.sub, { marginTop: 4 }]} numberOfLines={3}>
                {item.excerpt}
              </Text>
              <Text style={[k.sub, { marginTop: 6, fontSize: 12 }]}>{timeAgo(item.time)}</Text>
            </View>
          </Pressable>
        )}
      />
    </>
  );
}
