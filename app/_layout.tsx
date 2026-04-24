import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import { Stack, useRouter, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, useRef, useState } from "react";
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

function NavigationGuard() {
  const { isAuthenticated, isHydrated } = useAuth();
  const [hasSeenOnboarding, setHasSeenOnboarding] = useState<boolean | null>(null);
  const segments = useSegments();
  const router = useRouter();

  // ─── Track if we've already navigated to prevent double-fire ────────────
  const hasNavigated = useRef(false);

  // ─── Read onboarding flag ONCE on mount ──────────────────────────────────
  useEffect(() => {
    AsyncStorage.getItem("@has_seen_onboarding")
      .then(value => setHasSeenOnboarding(value === "true"))
      .catch(() => setHasSeenOnboarding(false));
  }, []); // ← empty deps: runs once, no re-check loop

  // ─── Navigation logic ─────────────────────────────────────────────────────
  useEffect(() => {
    // Wait until both auth and onboarding status are resolved
    if (!isHydrated || hasSeenOnboarding === null) return;

    const rootSegment = segments[0];
    const inAuthGroup = rootSegment === "(auth)" || rootSegment === "login";
    const inProtectedGroup =
      rootSegment === "(tabs)" ||
      rootSegment === "workspaces" ||
      rootSegment === "generate";
    const inOnboardingGroup = rootSegment === "onboarding";

    // ─── A. Never seen onboarding → go to onboarding ──────────────────────
    if (!hasSeenOnboarding && !inOnboardingGroup) {
      if (!hasNavigated.current) {
        hasNavigated.current = true;
        router.replace("/onboarding");
      }
      return;
    }

    // Reset nav guard once we're in the onboarding screen
    if (inOnboardingGroup) {
      hasNavigated.current = false;
      return;
    }

    // ─── B. Seen onboarding + not authenticated + in protected area ───────
    if (hasSeenOnboarding && !isAuthenticated && inProtectedGroup) {
      router.replace("/(auth)/login");
      return;
    }

    // ─── C. Already authenticated → skip auth/onboarding screens ─────────
    if (isAuthenticated && (inAuthGroup || inOnboardingGroup)) {
      router.replace("/(tabs)");
    }
  }, [isAuthenticated, isHydrated, hasSeenOnboarding, segments]);
  // ─────────────────────────────────────────────────────────────────────────

  if (!isHydrated || hasSeenOnboarding === null) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: "#0B3C7A",
        }}
      >
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
      <Stack.Screen name="onboarding" options={{ headerShown: false }} />
      <Stack.Screen name="aiChat" options={{ headerShown: false }} />
      <Stack.Screen name="(auth)/login" options={{ headerShown: false }} />
      <Stack.Screen name="(auth)/signup" options={{ headerShown: false }} />
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="(auth)/reset-password" options={{ headerShown: false }} />
      <Stack.Screen name="(auth)/forgot-password" options={{ headerShown: false }} />
      <Stack.Screen name="(auth)/verify-otp" options={{ headerShown: false }} />
    </Stack>
  );
}

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