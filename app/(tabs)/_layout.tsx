import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router, Tabs } from "expo-router";
import React, { useEffect } from "react";
import { Platform, StyleSheet } from "react-native";

import { HapticTab } from "@/components/haptic-tab";
import { useAuth } from "@/providers/auth-provider";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function TabLayout() {
  const { isHydrated, isAuthenticated } = useAuth();
  const insets = useSafeAreaInsets();

  useEffect(() => {
    if (isHydrated && !isAuthenticated) {
      router.replace("/login");
    }
  }, [isAuthenticated, isHydrated]);

  if (!isHydrated || !isAuthenticated) {
    return null;
  }

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: "#276bbd",
        tabBarInactiveTintColor: "#94A3B8",
        headerShown: true,
        headerTitleAlign: "center",
        headerTintColor: "#FFFFFF",
        headerTitleStyle: styles.headerTitle,
        headerBackground: () => (
          <LinearGradient
            colors={["#276bbd", "#0B3C7A"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={StyleSheet.absoluteFill}
          />
        ),
        tabBarButton: HapticTab,
        tabBarStyle: {
          height: Platform.OS === 'ios' ? 88 : 68,
          paddingTop: 10,
          paddingBottom: Platform.OS === 'ios' ? insets.bottom : 10,
          backgroundColor: "#FFFFFF",
          borderTopWidth: 1,
          borderTopColor: "#E2E8F0",
          ...Platform.select({
            ios: {
              shadowColor: "#000",
              shadowOffset: { width: 0, height: -2 },
              shadowOpacity: 0.05,
              shadowRadius: 10,
            },
            android: {
              elevation: 8,
            },
          }),
        },
        tabBarLabelStyle: styles.tabBarLabel,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          headerShown: false,
          tabBarLabel: "Home",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons 
              size={24} 
              name={focused ? "home" : "home-outline"} 
              color={color} 
            />
          ),
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          title: "History",
          tabBarLabel: "History",
          tabBarIcon: ({ color, focused }) => (
            <MaterialCommunityIcons
              size={26}
              name={focused ? "clock" : "clock-outline"}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="guides"
        options={{
          title: "Guides",
          tabBarLabel: "Guides",
          tabBarIcon: ({ color, focused }) => (
            <MaterialCommunityIcons
              size={26}
              name={focused ? "file-document" : "file-document-outline"}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: "Settings",
          tabBarLabel: "Settings",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons 
              size={24} 
              name={focused ? "settings" : "settings-outline"} 
              color={color} 
            />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  headerTitle: {
    fontSize: 17,
    fontWeight: "700",
    letterSpacing: 0.5,
    fontFamily: Platform.select({ ios: "System", android: "sans-serif-medium" }),
  },
  tabBarLabel: {
    fontSize: 11,
    fontWeight: "600",
    marginTop: 2,
  },
});