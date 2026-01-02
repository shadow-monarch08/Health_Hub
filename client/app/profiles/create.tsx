import {
  View,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
} from "react-native";
import { Stack, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { ImageBackground } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Typography } from "../../src/components/ui/Typography";
import { Button } from "../../src/components/ui/Button";
import { Input } from "../../src/components/ui/Input";
import { Select } from "../../src/components/ui/Select";
import { DatePicker } from "../../src/components/ui/DatePicker";
import { useState } from "react";
import { images } from "../../constants";
import { useToastStore } from "@/src/store/toastStore";

const RELATION_TYPES = [
  { label: "Self", value: "self" },
  { label: "Spouse", value: "spouse" },
  { label: "Child", value: "child" },
  { label: "Parent", value: "parent" },
  { label: "Other", value: "other" },
];

export default function CreateProfileScreen() {
  const router = useRouter();
  const { showToast } = useToastStore();
  const [displayName, setDisplayName] = useState("");
  const [legalName, setLegalName] = useState("");
  const [dob, setDob] = useState<Date | null>(null);
  const [relation, setRelation] = useState("self");

  const handleCreateProfile = () => {
    // Add create profile logic here
    console.log({ displayName, legalName, dob, relation });
    // On success:
    showToast({
      message: "Profile created successfully!",
      type: "success",
    });
    router.replace("/auth/connect");
  };

  return (
    <SafeAreaView className="bg-neutral-50" edges={["bottom"]}>
      <Stack.Screen options={{ headerShown: false }} />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 80 : 0}
        // className="flex-1"
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ flexGrow: 1 }}
          // className="pb-6"
          keyboardShouldPersistTaps="handled"
        >
          {/* Image Header with Teal/Accent Theme */}
          <View className="rounded-b-[32px] overflow-hidden shadow-lg shadow-accent/20 bg-accent/10 mb-6">
            <ImageBackground
              source={images.createProfileHeader}
              className="h-[280px] w-full justify-between"
              resizeMode="cover"
            >
              {/* Overlay Gradient/Tint - Using Accent Color (#0FB9B1) */}
              <View className="absolute inset-0 bg-accent/20" />

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
                <View className="gap-2 mb-4">
                  <View className="size-11 p-2 rounded-xl bg-white/20 backdrop-blur-md items-center justify-center mb-2">
                    <Ionicons name="person-add" size={24} color="white" />
                  </View>
                  <Typography
                    variant="title"
                    className="text-3xl tracking-tight text-white shadow-sm"
                  >
                    Create Profile
                  </Typography>
                  <Typography
                    variant="body"
                    className="text-white/90 leading-6 font-medium shadow-sm"
                  >
                    Let's get to know you better.
                  </Typography>
                </View>
              </View>
            </ImageBackground>
          </View>

          {/* Main Content */}
          <View className="px-6 flex-1 justify-start pt-4 gap-4 pb-7">
            <Input
              label="Display Name"
              placeholder="e.g. John"
              value={displayName}
              onChangeText={setDisplayName}
            />

            <Input
              label="Legal Name"
              placeholder="Full legal name"
              value={legalName}
              onChangeText={setLegalName}
            />

            <DatePicker
              maxDate={new Date()}
              label="Date of Birth"
              value={dob}
              onChange={setDob}
            />

            <Select
              label="Relation Type"
              options={RELATION_TYPES}
              value={relation}
              onChange={setRelation}
            />

            {/* Action Button */}
            <View className="mt-2">
              <Button
                title="Create Profile"
                onPress={handleCreateProfile}
                variant="primary"
                className="shadow-md shadow-primary/20"
                disabled={!displayName || !legalName || !dob}
              />
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
