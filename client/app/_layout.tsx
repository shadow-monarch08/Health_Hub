import { GestureHandlerRootView } from "react-native-gesture-handler";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import "../global.css"; // Ensure NativeWind/Tailwind styles are applied if using a global css file, or just nativewind behaves via babel. Default expo + nativewind usually needs an import if css file exists, but pure nativewind v4 might just work. User didn't specify global.css creation but nativewind usually needs one. I'll omit if not sure, but creating one is safer for tailwind directives. Wait, instructions don't explicitly ask for global.css, but standard install usually involves one.
import { SafeAreaProvider } from "react-native-safe-area-context";

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider style={{ flex: 1 }}>
        <StatusBar style="auto" />
        <Stack screenOptions={{ headerShown: false }} />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
