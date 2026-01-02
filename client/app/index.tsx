import { View, Text, TouchableOpacity, ScrollView, SafeAreaView } from "react-native";
import { useRouter } from "expo-router";

export default function Index() {
  const router = useRouter();

  const routes = [
    {
      title: "Core",
      items: [
        { label: "Design System", path: "/design-system" },
        { label: "Sync", path: "/sync" },
      ],
    },
    {
      title: "Auth",
      items: [
        { label: "Login", path: "/auth/login" },
        { label: "Signup", path: "/auth/signup" },
        { label: "Connect", path: "/auth/connect" },
        { label: "Verify", path: "/auth/verify" },
        { label: "Forgot Password", path: "/auth/forgot-password" },
        { label: "Reset Password", path: "/auth/reset-password" },
        { label: "Callback", path: "/auth/callback" },
      ],
    },
    {
      title: "Profiles",
      items: [
        { label: "Profiles List", path: "/profiles" },
        { label: "Create Profile", path: "/profiles/create" },
        { label: "Edit Profile", path: "/profiles/edit" },
      ],
    },
    {
      title: "Home",
      items: [
        { label: "Overview", path: "/home/overview" },
        { label: "Timeline", path: "/home/timeline" },
        { label: "Medications", path: "/home/medications" },
        { label: "Labs", path: "/home/labs" },
        { label: "Vitals", path: "/home/vitals" },
      ],
    },
    {
      title: "Details",
      items: [
        { label: "Medication Details", path: "/details/medication" },
        { label: "Observation Details", path: "/details/observation" },
      ],
    },
  ];

  return (
    <SafeAreaView className="flex-1 bg-white">
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
        <Text className="text-2xl font-bold mb-6 mt-4 text-center text-slate-900">Health Hub Dev</Text>

        {routes.map((section) => (
          <View key={section.title} className="mb-6">
            <Text className="text-lg font-semibold mb-3 text-slate-700 px-1">{section.title}</Text>
            <View className="gap-2">
              {section.items.map((item) => (
                <TouchableOpacity
                  key={item.path}
                  className="w-full bg-slate-50 border border-slate-200 p-4 rounded-xl active:bg-slate-100"
                  onPress={() => router.push(item.path as any)}
                >
                  <Text className="text-slate-700 font-medium">{item.label}</Text>
                  <Text className="text-xs text-slate-400 mt-1">{item.path}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}
