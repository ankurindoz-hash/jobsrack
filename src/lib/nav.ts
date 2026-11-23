import { router } from 'expo-router';
import { Platform } from 'react-native';

/** Open any outside link inside the app (never the phone's browser).
 * Android's web view cannot show PDF and Word files, so those open through Google's document viewer. */
export const openInApp = (url: string, title?: string) => {
  const doc = /\.(pdf|docx?|rtf)(\?|#|$)/i.test(url);
  const u = doc && Platform.OS === 'android' ? `https://docs.google.com/gview?embedded=1&url=${encodeURIComponent(url)}` : url;
  router.push({ pathname: '/web', params: { url: u, title: title ?? '' } });
};
