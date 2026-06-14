import type { ExpoConfig } from "expo/config"

const config: ExpoConfig = {
  name: "ChatSense",
  slug: "chatsense",
  scheme: "chatsense",
  version: "1.0.0",
  orientation: "portrait",
  icon: "./assets/icon.png",
  userInterfaceStyle: "automatic",
  plugins: [
    [
      "expo-splash-screen",
      {
        image: "./assets/splash.png",
        backgroundColor: "#f8faf8",
        imageWidth: 200,
        resizeMode: "contain",
      },
    ],
  ],
  ios: {
    supportsTablet: true,
  },
  android: {
    package: "com.thegreatparthicle.chatsense",
    versionCode: 1,
    permissions: [],
    adaptiveIcon: {
      foregroundImage: "./assets/android-icon-foreground.png",
      backgroundColor: "#ffffff",
      monochromeImage: "./assets/android-icon-monochrome.png",
    },
    predictiveBackGestureEnabled: false,
  },
  updates: {
    enabled: false,
  },
}

export default config
