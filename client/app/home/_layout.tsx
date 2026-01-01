import { Tabs } from "expo-router";
import { FontAwesome5 } from "@expo/vector-icons";

export default function HomeLayout() {
    return (
        <Tabs screenOptions={{ tabBarActiveTintColor: "#0284c7", headerShown: false }}>
            <Tabs.Screen
                name="overview"
                options={{
                    title: "Overview",
                    tabBarIcon: ({ color }) => <FontAwesome5 name="home" size={24} color={color} />,
                }}
            />
            <Tabs.Screen
                name="vitals"
                options={{
                    title: "Vitals",
                    tabBarIcon: ({ color }) => <FontAwesome5 name="heartbeat" size={24} color={color} />,
                }}
            />
            <Tabs.Screen
                name="labs"
                options={{
                    title: "Labs",
                    tabBarIcon: ({ color }) => <FontAwesome5 name="vial" size={24} color={color} />,
                }}
            />
            <Tabs.Screen
                name="medications"
                options={{
                    title: "Meds",
                    tabBarIcon: ({ color }) => <FontAwesome5 name="pills" size={24} color={color} />,
                }}
            />
            <Tabs.Screen
                name="timeline"
                options={{
                    title: "Timeline",
                    tabBarIcon: ({ color }) => <FontAwesome5 name="history" size={24} color={color} />,
                }}
            />
        </Tabs>
    );
}
