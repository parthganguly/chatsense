import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.thegreatparthicle.chatsense',
  appName: 'ChatSense',
  webDir: 'out',
  // Capacitor's default ("debug") logs bridge traffic, plugin results/errors and
  // WebView console output to logcat in debuggable builds, which would include
  // shared export display names. Imported chats must stay in-app.
  loggingBehavior: 'none',
  android: {
    // Default is enabled for debuggable builds. QA (Maestro) uses the
    // accessibility tree, not DevTools; enable locally only when needed.
    webContentsDebuggingEnabled: false,
  },
};

export default config;
