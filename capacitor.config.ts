import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'pro.gitbattle.app',
  appName: 'GitHub Battle',
  webDir: 'dist',
  server: {
    // Load the live web app from gitbattle.pro. The mobile app is a thin
    // WebView wrapper that shares the exact same backend (Netlify Blobs)
    // as the web version. No code duplication, always up to date.
    url: 'https://gitbattle.pro',
    cleartext: false,
    // Allow navigation to github.com for the OAuth flow
    allowNavigation: [
      'github.com',
      '*.github.com',
      'api.github.com',
    ],
  },
  android: {
    allowMixedContent: false,
  },
};

export default config;
