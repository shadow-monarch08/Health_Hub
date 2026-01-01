import { View, ScrollView, KeyboardAvoidingView, Platform } from "react-native";
import { Stack, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { ImageBackground } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Typography } from "../../src/components/ui/Typography";
import { Button } from "../../src/components/ui/Button";
import { Input } from "../../src/components/ui/Input";
import { useState } from "react";
import { images } from "../../constants";

export default function ResetPasswordScreen() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // Simple strength calculation (demo logic)
  const calculateStrength = (pass: string) => {
    let score = 0;
    if (pass.length > 5) score += 20;
    if (pass.length > 8) score += 20;
    if (/[A-Z]/.test(pass)) score += 20;
    if (/[0-9]/.test(pass)) score += 20;
    if (/[^A-Za-z0-9]/.test(pass)) score += 20;
    return Math.min(100, score);
  };

  const strength = calculateStrength(password);

  const handleResetPassword = () => {
    // Logic to reset password
    // On success, go to login
    router.replace("/auth/login");
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
              source={images.resetPasswordHeader}
              className="h-[280px] w-full justify-between"
              resizeMode="cover"
            >
              {/* Overlay Gradient/Tint */}
              <View className="absolute inset-0 bg-primary/20" />

              <View className="flex-1 justify-end p-6 pb-12">
                {/* Title Section */}
                <View className="gap-2">
                  <View className="size-11 p-2 rounded-xl bg-white/20 backdrop-blur-md items-center justify-center mb-2">
                    <Ionicons name="lock-open" size={24} color="white" />
                  </View>
                  <Typography
                    variant="title"
                    className="text-3xl tracking-tight text-white shadow-sm"
                  >
                    Reset Password
                  </Typography>
                  <Typography
                    variant="body"
                    className="text-white/90 leading-6 font-medium shadow-sm"
                  >
                    Please type something you’ll remember used as password.
                  </Typography>
                </View>
              </View>
            </ImageBackground>
          </View>

          {/* Main Content */}
          <View className="px-6 flex-1 justify-start pt-4 gap-4">
            <Input
              label="New Password"
              placeholder="Must be 8 characters"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              showStrengthBar
              strength={strength}
            />
            <Input
              label="Confirm New Password"
              placeholder="Repeat password"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry
            />

            {/* Action Button */}
            <View className="gap-4 mt-8">
              <Button
                title="Reset Password"
                onPress={handleResetPassword}
                variant="primary"
                className="shadow-md shadow-primary/20"
                disabled={
                  !password || !confirmPassword || password !== confirmPassword
                }
              />
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
