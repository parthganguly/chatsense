import type { ExpoConfig } from "expo/config"

const sharedFileMimeTypes = [
  "application/zip",
  "application/x-zip-compressed",
  "application/octet-stream",
  "text/plain",
] as const

const config: ExpoConfig = {
  name: "ChatSense",
  slug: "chatsense",
  scheme: "chatsense",
  version: "1.0.0",
  orientation: "portrait",
  icon: "./assets/icon.png",
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
    intentFilters: [
      {
        action: "SEND",
        category: ["DEFAULT"],
        data: sharedFileMimeTypes.map((mimeType) => ({ mimeType })),
      },
      {
        action: "VIEW",
        category: ["DEFAULT", "BROWSABLE"],
        data: sharedFileMimeTypes.map((mimeType) => ({
          mimeType,
          scheme: "content",
        })),
      },
    ],
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
