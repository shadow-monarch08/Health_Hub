import { GestureHandlerRootView } from "react-native-gesture-handler";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import "../global.css";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { Toast } from "../src/components/ui/Toast";

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider style={{ flex: 1 }}>
        <StatusBar style="auto" />
        <Stack screenOptions={{ headerShown: false }} />
        <Toast />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
