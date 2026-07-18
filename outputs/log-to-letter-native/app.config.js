const variants = {
  development: {
    name: "Log Planet Dev",
    scheme: "logplanet-dev",
    iosBundleIdentifier: "com.youarejinlee.logplanet.dev",
    androidPackage: "com.youarejinlee.logplanet.dev"
  },
  preview: {
    name: "Log Planet Preview",
    scheme: "logplanet-preview",
    iosBundleIdentifier: "com.youarejinlee.logplanet.preview",
    androidPackage: "com.youarejinlee.logplanet.preview"
  },
  production: {
    name: "Log Planet",
    scheme: "logplanet",
    iosBundleIdentifier: "com.youarejinlee.logplanet",
    androidPackage: "com.youarejinlee.logplanet"
  }
};

const appVariant = process.env.APP_VARIANT || "development";
const identity = variants[appVariant] || variants.development;

module.exports = {
  expo: {
    name: identity.name,
    slug: "log-to-letter",
    scheme: identity.scheme,
    version: "0.1.0",
    orientation: "portrait",
    icon: "./assets/assets_v4/app-logo/logo_v2.png",
    userInterfaceStyle: "light",
    splash: {
      image: "./assets/splash.png",
      resizeMode: "contain",
      backgroundColor: "#070d2a"
    },
    ios: {
      supportsTablet: false,
      buildNumber: "1",
      bundleIdentifier: identity.iosBundleIdentifier,
      infoPlist: {
        CFBundleDisplayName: identity.name,
        CFBundleName: identity.name,
        ITSAppUsesNonExemptEncryption: false,
        NSUserNotificationUsageDescription: "순간의 생각을 기록할 수 있도록 알림을 보내기 위해 사용해.",
        NSPhotoLibraryAddUsageDescription: "이미지를 저장하기 위해 사진 보관함 접근 권한을 사용해."
      }
    },
    android: {
      versionCode: 1,
      blockedPermissions: [
        "android.permission.RECORD_AUDIO",
        "android.permission.READ_EXTERNAL_STORAGE",
        "android.permission.READ_MEDIA_VISUAL_USER_SELECTED",
        "android.permission.READ_MEDIA_IMAGES",
        "android.permission.READ_MEDIA_VIDEO",
        "android.permission.READ_MEDIA_AUDIO"
      ],
      adaptiveIcon: {
        foregroundImage: "./assets/assets_v4/app-logo/logo_v2.png",
        backgroundColor: "#070d2a"
      },
      package: identity.androidPackage
    },
    plugins: [
      ...(appVariant === "development" ? ["expo-dev-client"] : []),
      [
        "expo-audio",
        {
          microphonePermission: false,
          recordAudioAndroid: false
        }
      ],
      "expo-notifications",
      [
        "expo-media-library",
        {
          granularPermissions: []
        }
      ],
      [
        "expo-splash-screen",
        {
          image: "./assets/splash.png",
          backgroundColor: "#070d2a",
          imageWidth: 320
        }
      ]
    ],
    extra: {
      appVariant,
      eas: {
        projectId: "46937731-6170-43ee-9258-3bc7a75537ee"
      }
    }
  }
};
