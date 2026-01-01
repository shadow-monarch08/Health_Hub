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

export default function LoginScreen() {
  const router = useRouter();
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
          className="pb-6"
          keyboardShouldPersistTaps="handled"
        >
          {/* Image Header */}
          <View className="rounded-b-[32px] overflow-hidden shadow-lg shadow-primary/20 bg-primary/10">
            <ImageBackground
              source={images.loginHeader}
              className="h-[240px] w-full justify-between"
              resizeMode="cover"
            >
              {/* Overlay Gradient/Tint */}
              <View className="absolute inset-0 bg-primary/10" />

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
                    onPress={() => router.replace("/auth/signup")}
                  >
                    <Typography
                      variant="body"
                      className="font-semibold text-white/90"
                    >
                      Sign up
                    </Typography>
                  </TouchableOpacity>
                </View>

                {/* Title Section */}
                <View className="gap-2 mb-4">
                  <Typography
                    variant="title"
                    className="text-3xl tracking-tight text-white shadow-sm"
                  >
                    Welcome back
                  </Typography>
                  <Typography
                    variant="body"
                    className="text-white/90 leading-6 font-medium shadow-sm"
                  >
                    Log in to access your health dashboard.
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
                  label="Email Address"
                  placeholder="e.g. sarah@example.com"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
                <View>
                  <Input
                    label="Password"
                    placeholder="Enter your password"
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry
                  />
                  <TouchableOpacity
                    className="self-end mt-2"
                    onPress={() => router.push("/auth/forgot-password")}
                  >
                    <Typography
                      variant="caption"
                      className="text-primary font-medium"
                    >
                      Forgot Password?
                    </Typography>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Action Button */}
              <View className="gap-4">
                <Button
                  title="Log In"
                  onPress={() => { }}
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
