import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.up.alarm",
  appName: "UP",
  webDir: "dist",
  bundledWebRuntime: false,
  plugins: {
    SplashScreen: { launchShowDuration: 0 }
  }
};

export default config;
