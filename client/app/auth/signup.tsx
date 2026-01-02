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
import { Input } from "../../src/components/ui/Input";
import { useState } from "react";
import { images } from "../../constants";

export default function SignupScreen() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  return (
    <SafeAreaView className="flex-1 bg-neutral-50" edges={["bottom"]}>
      <Stack.Screen options={{ headerShown: false }} />
      <KeyboardAvoidingView
        // className="flex-1"
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 80 : 0}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ flexGrow: 1 }}
          // className="pb-6"
          keyboardShouldPersistTaps="handled"
        >
          {/* Image Header */}
          <View className="rounded-b-[32px] overflow-hidden shadow-lg shadow-primary/20 bg-primary/10">
            <ImageBackground
              source={images.signupHeader}
              className="h-[280px] w-full justify-between"
              resizeMode="cover"
            >
              {/* Overlay Gradient/Tint (Optional for readability) */}
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
                  <TouchableOpacity
                    onPress={() => router.replace("/auth/login")}
                  >
                    <Typography
                      variant="body"
                      className="font-semibold text-white/90"
                    >
                      Log in
                    </Typography>
                  </TouchableOpacity>
                </View>

                {/* Title Section */}
                <View className="gap-2 mb-4">
                  <View className="size-11 p-2 rounded-xl bg-white/20 backdrop-blur-md items-center justify-center mb-2">
                    <Ionicons name="person-add" size={24} color="white" />
                  </View>
                  <Typography
                    variant="title"
                    className="text-3xl tracking-tight text-white shadow-sm"
                  >
                    Create account
                  </Typography>
                  <Typography
                    variant="body"
                    className="text-white/90 leading-6 font-medium shadow-sm"
                  >
                    Start your journey to better health.
                  </Typography>
                </View>
              </View>
            </ImageBackground>
          </View>

          {/* Main Content */}
          <View className="px-6 pt-7">
            <View className="justify-center gap-8 mb-10">
              {/* Form */}
              <View className="gap-1">
                <Input
                  label="Full Name"
                  placeholder="e.g. Sarah Connor"
                  value={name}
                  onChangeText={setName}
                  autoCapitalize="words"
                />
                <Input
                  label="Email Address"
                  placeholder="sarah@example.com"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
                <View>
                  <Input
                    label="Password"
                    placeholder="Min. 8 characters"
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry
                    showStrengthBar
                    strength={30}
                  />
                  {/* Simple strength hint */}
                  {password.length > 0 && password.length < 8 && (
                    <Typography
                      variant="caption"
                      className="text-neutral-400 mt-2 ml-1"
                    >
                      Must be at least 8 characters
                    </Typography>
                  )}
                </View>
              </View>

              {/* Trust & Legal */}
              <View className="flex-row gap-2 bg-primary/5 p-3 rounded-2xl items-start">
                <Ionicons
                  name="shield-checkmark-outline"
                  size={20}
                  color="#0A6ED1"
                />
                <View className="flex-1 gap-1">
                  <Typography
                    variant="caption"
                    className="text-neutral-600 leading-5"
                  >
                    Your health data is encrypted and protected. By creating an
                    account, you agree to our{" "}
                    <Typography
                      variant="caption"
                      className="text-primary font-medium"
                    >
                      Terms
                    </Typography>{" "}
                    &{" "}
                    <Typography
                      variant="caption"
                      className="text-primary font-medium"
                    >
                      Privacy Policy
                    </Typography>
                    .
                  </Typography>
                </View>
              </View>

              {/* Action Button */}
              <View className="gap-4">
                <Button
                  title="Create Account"
                  onPress={() => router.push("/auth/verify")}
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
