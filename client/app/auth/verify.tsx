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
import { OtpInput } from "../../src/components/ui/OtpInput";
import { useRef, useState, useEffect } from "react";
import { images } from "../../constants";
import { useLocalSearchParams } from "expo-router";

export default function VerifyScreen() {
  const router = useRouter();
  const { mode } = useLocalSearchParams<{ mode: "signup" | "reset" }>();

  const isResetMode = mode === "reset";
  const [code, setCode] = useState("");
  const [timer, setTimer] = useState(30);

  // Simple countdown timer
  useEffect(() => {
    let interval: number;
    if (timer > 0) {
      interval = setInterval(() => {
        setTimer((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [timer]);

  const handleVerify = () => {
    // Add verification logic here using 'code'
    console.log("Verifying code:", code, "Mode:", mode);

    if (isResetMode) {
      router.replace("/auth/reset-password");
    } else {
      // router.replace("/(tabs)/home");
    }
  };

  const handleResend = () => {
    setTimer(30);
    // Trigger resend logic
  };

  return (
    <SafeAreaView className="flex-1 bg-neutral-50" edges={["bottom"]}>
      <Stack.Screen options={{ headerShown: false }} />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 80 : 0}
        // className="flex-1"
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ flexGrow: 1 }}
          className="pb-6"
          keyboardShouldPersistTaps="handled"
        >
          {/* Image Header */}
          <View className="rounded-b-[32px] overflow-hidden shadow-lg shadow-primary/20 bg-primary/10 mb-6">
            <ImageBackground
              source={images.verifyHeader}
              className="h-[280px] w-full justify-between"
              resizeMode="cover"
            >
              {/* Overlay Gradient/Tint */}
              <View className="absolute inset-0 bg-primary/10" />

              <View className="flex-1 justify-between p-6">
                {/* Nav Bar */}
                <View className="flex-row">
                  <TouchableOpacity
                    onPress={() => router.back()}
                    className="w-10 h-10 items-center justify-center rounded-full bg-white/20 backdrop-blur-md active:bg-white/30"
                  >
                    <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
                  </TouchableOpacity>
                </View>

                {/* Title Section */}
                <View className="gap-2 mb-8">
                  <View className="size-11 p-2 rounded-xl bg-white/20 backdrop-blur-md items-center justify-center mb-2">
                    <Ionicons
                      name={isResetMode ? "key-outline" : "shield-checkmark"}
                      size={24}
                      color="white"
                    />
                  </View>
                  <Typography
                    variant="title"
                    className="text-3xl tracking-tight text-white shadow-sm"
                  >
                    {isResetMode ? "Reset Password" : "Verify Account"}
                  </Typography>
                  <Typography
                    variant="body"
                    className="text-white/90 leading-6 font-medium shadow-sm"
                  >
                    {isResetMode
                      ? "Enter the code sent to your email to reset your password."
                      : "Enter the code sent to your email to verify your identity."}
                  </Typography>
                </View>
              </View>
            </ImageBackground>
          </View>

          {/* Main Content */}
          <View className="px-6 flex-1 justify-between">
            <View className="gap-10">
              {/* Code Input Section */}
              <View className="gap-2 items-center">
                <Typography variant="body" className="text-neutral-500 mb-2">
                  Enter the 4-digit code
                </Typography>
                <OtpInput value={code} onChange={setCode} length={4} />
              </View>

              {/* Resend Timer */}
              <View className="items-center">
                {timer > 0 ? (
                  <Typography variant="body" className="text-neutral-500">
                    Resend code in{" "}
                    <Typography className="text-primary font-bold">
                      {timer}s
                    </Typography>
                  </Typography>
                ) : (
                  <TouchableOpacity onPress={handleResend}>
                    <Typography
                      variant="body"
                      className="text-primary font-bold"
                    >
                      Resend Code
                    </Typography>
                  </TouchableOpacity>
                )}
              </View>
            </View>

            {/* Action Button */}
            <View className="gap-4 mt-10">
              <Button
                title="Verify Identity"
                onPress={handleVerify}
                variant="primary"
                className="shadow-md shadow-primary/20"
                disabled={code.length < 4}
              />
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
