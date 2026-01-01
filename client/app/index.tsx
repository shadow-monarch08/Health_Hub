import { View, Text, ActivityIndicator, TouchableOpacity } from "react-native";
import { useRouter } from "expo-router";
import { useEffect } from "react";

export default function Index() {
  const router = useRouter();

  // useEffect(() => {
  //     setTimeout(() => {
  //         router.replace("/design-system");
  //     }, 5000);
  // }, []);

  return (
    <View className="flex-1 items-center justify-center bg-white gap-4">
      <Text className="text-xl font-bold mb-4">Health Hub Dev</Text>

      {/* Dev Navigation */}
      <View className="w-full px-10 gap-3 mt-8">
        <TouchableOpacity
          className="w-full"
          onPress={() => router.push("/design-system")}
        >
          <Text className="text-center text-blue-500 py-3 bg-blue-50 rounded-lg overflow-hidden">
            View Design System
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          className="w-full"
          onPress={() => router.push("/auth/signup")}
        >
          <Text className="text-center text-blue-500 py-3 bg-blue-50 rounded-lg overflow-hidden">
            View Signup Demo
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          className="w-full"
          onPress={() => router.push("/profiles/create")}
        >
          <Text className="text-center text-blue-500 py-3 bg-blue-50 rounded-lg overflow-hidden">
            View Profile Demo
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
