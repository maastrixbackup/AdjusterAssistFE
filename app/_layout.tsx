import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import { Stack, useRouter, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useEffect } from "react";
import { ActivityIndicator, View } from "react-native";
import "react-native-reanimated";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { Toaster } from "sonner-native";

// import PushNotificationManager from "@/components/PushNotification";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { AuthProvider, useAuth } from "@/providers/auth-provider";
import { GestureHandlerRootView } from "react-native-gesture-handler";

export const unstable_settings = {
  initialRouteName: "login",
};

// --- THIS COMPONENT HANDLES THE REDIRECT LOGIC ---
function NavigationGuard() {
  const { isAuthenticated, isHydrated } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (!isHydrated) return;

    // Segments tells us which folder/file we are in
    const inAuthGroup = segments[0] === "(tabs)" || segments[0] === "workspaces" || segments[0] === "generate";

    if (!isAuthenticated && inAuthGroup) {
      // Not logged in -> Go to Login
      router.replace("/login");
    } else if (isAuthenticated && (segments[0] === "login" || segments[0] === "signup")) {
      // Logged in -> Go to Home
      router.replace("/(tabs)");
    }
  }, [isAuthenticated, isHydrated, segments]);

  if (!isHydrated) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#0B3C7A" }}>
        <ActivityIndicator size="large" color="#FFFFFF" />
      </View>
    );
  }

  return (
    <Stack
      screenOptions={{
        headerTintColor: "#FFFFFF",
        contentStyle: { backgroundColor: "#0B3C7A" },
        headerTitleStyle: { fontSize: 15, fontWeight: "600" },
        animation: "fade",
        headerBackground: () => (
          <LinearGradient
            colors={["#276bbd", "#0B3C7A"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={{ flex: 1 }}
          />
        ),
      }}
    >
      <Stack.Screen name="login" options={{ headerShown: false }} />
      <Stack.Screen name="signup" options={{ headerShown: false }} />
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="notification" options={{ title: "Notifications" }} />
    </Stack>
  );
}

// --- MAIN ROOT LAYOUT ---
export default function RootLayout() {
  const colorScheme = useColorScheme();

  const AppTheme = {
    ...(colorScheme === "dark" ? DarkTheme : DefaultTheme),
    colors: {
      ...(colorScheme === "dark" ? DarkTheme.colors : DefaultTheme.colors),
      background: "#0B3C7A",
    },
  };

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <AuthProvider>
          <ThemeProvider value={AppTheme}>
            {/* Expo notifications temporarily disabled. Re-enable by restoring PushNotificationManager wrapper. */}
            {/* <PushNotificationManager> */}
            <View style={{ flex: 1, backgroundColor: "#0B3C7A" }}>
              <NavigationGuard />
              <Toaster />
            </View>
            <StatusBar style="light" />
            {/* </PushNotificationManager> */}
          </ThemeProvider>
        </AuthProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
