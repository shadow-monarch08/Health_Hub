import {
  View,
  ScrollView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { Stack, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { ImageBackground } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Typography } from "../../src/components/ui/Typography";
import { Button } from "../../src/components/ui/Button";
import { Select } from "../../src/components/ui/Select";
import { useState } from "react";
import { images } from "../../constants";
import { useToastStore } from "../../src/store/toastStore";

const PROVIDERS = [
  { label: "Epic Systems", value: "epic" },
  { label: "Oracle Cerner", value: "cerner" },
  { label: "Athena Health", value: "athena" },
  { label: "Allscripts", value: "allscripts" },
  { label: "Meditech", value: "meditech" },
];

export default function ConnectScreen() {
  const router = useRouter();
  const [provider, setProvider] = useState("");
  const { showToast, hideToast } = useToastStore();

  const handleConnect = () => {
    if (!provider) {
      showToast({
        message: "Please select a provider first.",
        type: "warning",
      });
      return;
    }

    // Mock connection logic
    showToast({
      message: "Connecting to provider...",
      type: "info",
      duration: 0,
    });

    setTimeout(() => {
      hideToast();
      showToast({
        message: "Successfully connected!",
        type: "success",
      });
      // Navigate to next screen or dashboard?
      // For now, let's just stay or maybe go back to login/dashboard
      // router.replace("/dashboard"); // or something
    }, 4000);
  };

  return (
    <SafeAreaView className="flex-1 bg-neutral-50" edges={["bottom"]}>
      <Stack.Screen options={{ headerShown: false }} />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 80 : 0}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ flexGrow: 1 }}
          keyboardShouldPersistTaps="handled"
        >
          {/* Image Header */}
          <View className="rounded-b-[32px] overflow-hidden shadow-lg shadow-primary/20 bg-primary/10">
            <ImageBackground
              source={images.connectHeader}
              className="h-[280px] w-full justify-between"
              resizeMode="cover"
            >
              {/* Overlay Gradient/Tint */}
              <View className="absolute inset-0 bg-primary/20" />

              <View className="flex-1 justify-between p-6">
                {/* Nav Bar */}
                <View className="flex-row justify-between items-center">
                  <TouchableOpacity
                    onPress={() => router.back()}
                    className="w-10 h-10 items-center justify-center rounded-full bg-white/20 backdrop-blur-md active:bg-white/30"
                  >
                    <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
                  </TouchableOpacity>
                </View>

                {/* Title Section */}
                <View className="gap-2 mb-4">
                  <View className="size-11 p-2 rounded-xl bg-white/20 backdrop-blur-md items-center justify-center mb-2">
                    <Ionicons name="link" size={24} color="white" />
                  </View>
                  <Typography
                    variant="title"
                    className="text-3xl tracking-tight text-white shadow-sm"
                  >
                    Connect Provider
                  </Typography>
                  <Typography
                    variant="body"
                    className="text-white/90 leading-6 font-medium shadow-sm"
                  >
                    Link your health records for a unified view.
                  </Typography>
                </View>
              </View>
            </ImageBackground>
          </View>

          {/* Main Content */}
          <View className="px-6 pt-7">
            <View className="justify-center gap-8 mb-10">
              <View className="gap-4">
                <Typography variant="body" className="text-neutral-600">
                  Select your healthcare provider from the list below to
                  securely sync your records.
                </Typography>

                <Select
                  label="EHR Provider"
                  placeholder="Select your provider"
                  value={provider}
                  options={PROVIDERS}
                  onChange={setProvider}
                />
              </View>

              {/* Trust & Legal - Smaller visual footprint */}
              <View className="flex-row gap-2 bg-primary/5 p-3 rounded-2xl items-start">
                <Ionicons
                  name="lock-closed-outline"
                  size={20}
                  color="#0A6ED1"
                />
                <Typography
                  variant="caption"
                  className="text-neutral-600 leading-5 flex-1"
                >
                  We use bank-level encryption to securely connect to your
                  provider. Your credentials are never stored.
                </Typography>
              </View>

              {/* Action Button */}
              <View className="gap-4">
                <Button
                  title="Connect Provider"
                  onPress={handleConnect}
                  variant="primary"
                  className="shadow-md shadow-primary/20"
                />
              </View>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
