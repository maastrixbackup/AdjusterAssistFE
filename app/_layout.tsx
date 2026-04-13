import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import { Stack, useRouter, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
import { ActivityIndicator, View } from "react-native";
import "react-native-reanimated";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { Toaster } from "sonner-native";

import { useColorScheme } from "@/hooks/use-color-scheme";
import { AuthProvider, useAuth } from "@/providers/auth-provider";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { GestureHandlerRootView } from "react-native-gesture-handler";

export const unstable_settings = {
  initialRouteName: "login",
};

// --- THIS COMPONENT HANDLES THE REDIRECT LOGIC ---
function NavigationGuard() {
  const { isAuthenticated, isHydrated } = useAuth();
  const [hasSeenOnboarding, setHasSeenOnboarding] = useState<boolean | null>(null);
  const segments = useSegments();
  const router = useRouter();

  // 1. Fetch the onboarding status from storage on mount
  useEffect(() => {
    async function checkOnboarding() {
      try {
        const value = await AsyncStorage.getItem("@has_seen_onboarding");
        setHasSeenOnboarding(value === "true");
      } catch (e) {
        setHasSeenOnboarding(false);
      }
    }
    checkOnboarding();
  }, []);

  // 2. Optimized Navigation Logic
  useEffect(() => {
    // If auth state isn't loaded from storage yet, or we don't know onboarding status, wait.
    if (!isHydrated || hasSeenOnboarding === null) return;

    const rootSegment = segments[0];
    
    // Define the groups for easier logic
    const inAuthGroup = rootSegment === "(auth)" || rootSegment === "login";
    const inProtectedGroup = rootSegment === "(tabs)" || rootSegment === "workspaces" || rootSegment === "generate";
    const inOnboardingGroup = rootSegment === "onboarding";

    // A. If they haven't seen onboarding, force them there
    if (!hasSeenOnboarding && !inOnboardingGroup) {
      router.replace("/onboarding");
      return;
    }

    // B. If logged out and trying to access protected areas, redirect to login
    if (!isAuthenticated && inProtectedGroup) {
      // Using replace ensures the transition is a clean swap
      router.replace("/(auth)/login");
      return;
    }

    // C. If logged in and trying to access auth/onboarding screens, send to home
    if (isAuthenticated && (inAuthGroup || inOnboardingGroup)) {
      router.replace("/(tabs)");
    }
  }, [isAuthenticated, isHydrated, hasSeenOnboarding, segments]);

  // Premium Loading state while checking storage/auth
  if (!isHydrated || hasSeenOnboarding === null) {
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
        // Use 'fade' for a premium, non-jarring transition between auth and app
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
      <Stack.Screen name="onboarding" options={{ headerShown: false }} />
      <Stack.Screen name="(auth)/login" options={{ headerShown: false }} />
      <Stack.Screen name="(auth)/signup" options={{ headerShown: false }} />
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="(auth)/reset-password" options={{ headerShown: false }} />
      <Stack.Screen name="(auth)/forgot-password" options={{ headerShown: false }} />
      <Stack.Screen name="(auth)/verify-otp" options={{ headerShown: false }} />
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
            <View style={{ flex: 1, backgroundColor: "#263369" }}>
              <NavigationGuard />
              <Toaster />
            </View>
            <StatusBar style="light" />
          </ThemeProvider>
        </AuthProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}