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
    backgroundColor: '#082b4b',
    adjustMarginsForEdgeToEdge: 'disable'
  },
  ios: {
    backgroundColor: '#fbfaf6',
    contentInset: 'automatic'
  },
  plugins: {
    StatusBar: {
      style: 'DARK',
      backgroundColor: '#fbfaf6',
      overlaysWebView: false
    }
  }
};

export default config;
