import { router } from 'expo-router';

/** Open any outside link inside the app (never the phone's browser). */
export const openInApp = (url: string, title?: string) => router.push({ pathname: '/web', params: { url, title: title ?? '' } });
