import { Ionicons } from '@expo/vector-icons';
import { Stack, useLocalSearchParams } from 'expo-router';
import { useRef, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, Share, View } from 'react-native';
import { WebView as RNWebView } from 'react-native-webview';

// The WebView class typings clash with React 19; it works fine at runtime.
const WebView = RNWebView as any;
import { colors } from '../lib/theme';

/** In-app browser: employer websites and "apply on company site" open here, inside JobsRack. */
export default function Web() {
  const p = useLocalSearchParams<{ url: string; title?: string }>();
  const ref = useRef<any>(null);
  const [loading, setLoading] = useState(true);
  const [canBack, setCanBack] = useState(false);
  const url = String(p.url || '');

  if (Platform.OS === 'web') {
    return <iframe src={url} style={{ border: 0, width: '100%', height: '100%' }} title={p.title || 'Page'} />;
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#fff' }}>
      <Stack.Screen
        options={{
          title: p.title || '',
          headerRight: () => (
            <View style={{ flexDirection: 'row', gap: 18 }}>
              {canBack && (
                <Pressable onPress={() => ref.current?.goBack()} hitSlop={10} accessibilityLabel="Back a page">
                  <Ionicons name="arrow-undo-outline" size={22} color={colors.brand} />
                </Pressable>
              )}
              <Pressable onPress={() => ref.current?.reload()} hitSlop={10} accessibilityLabel="Reload">
                <Ionicons name="refresh-outline" size={22} color={colors.brand} />
              </Pressable>
              <Pressable onPress={() => Share.share({ message: url, url })} hitSlop={10} accessibilityLabel="Share link">
                <Ionicons name="share-outline" size={22} color={colors.brand} />
              </Pressable>
            </View>
          ),
        }}
      />
      <WebView
        ref={ref}
        source={{ uri: url }}
        onLoadEnd={() => setLoading(false)}
        onNavigationStateChange={(n: { canGoBack: boolean }) => setCanBack(n.canGoBack)}
        allowsBackForwardNavigationGestures
        setSupportMultipleWindows={false}
      />
      {loading && <ActivityIndicator color={colors.brand} style={{ position: 'absolute', top: 30, alignSelf: 'center' }} />}
    </View>
  );
}

