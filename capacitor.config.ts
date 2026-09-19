import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'mr.nataiji.app',
  appName: 'Nataiji | نتائجي',
  webDir: 'public',
  server: {
    url: 'https://nataiji.onrender.com',
    cleartext: false,
    allowNavigation: ['nataiji.onrender.com']
  },
  android: {
    allowMixedContent: false,
    backgroundColor: '#f4f8fb',
    adjustMarginsForEdgeToEdge: 'disable'
  },
  ios: {
    backgroundColor: '#f4f8fb',
    contentInset: 'automatic'
  }
};

export default config;
