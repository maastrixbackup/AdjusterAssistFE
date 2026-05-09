import { useColorScheme } from "@/hooks/use-color-scheme";
import { registerAndSendPushToken } from "@/lib/notifications/registerForPushToken";
import { AuthProvider, useAuth } from "@/providers/auth-provider";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "@react-navigation/native";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { LinearGradient } from "expo-linear-gradient";
import * as Notifications from "expo-notifications";
import { Stack, useRouter, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import "react-native-reanimated";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { toast, Toaster } from "sonner-native";

export const unstable_settings = {
  initialRouteName: "login",
};

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: false,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

function NavigationGuard() {
  const { isAuthenticated, isHydrated } = useAuth();
  const [hasSeenOnboarding, setHasSeenOnboarding] = useState<boolean | null>(
    null
  );
  const segments = useSegments();
  const router = useRouter();
  const hasNavigated = useRef(false);

  useEffect(() => {
    AsyncStorage.getItem("@has_seen_onboarding")
      .then((value) => setHasSeenOnboarding(value === "true"))
      .catch(() => setHasSeenOnboarding(false));
  }, []);

  useEffect(() => {
    if (!isHydrated || hasSeenOnboarding === null) return;

    const rootSegment = segments[0];
    const inAuthGroup = rootSegment === "(auth)" || rootSegment === "login";
    const inProtectedGroup =
      rootSegment === "(tabs)" ||
      rootSegment === "workspaces" ||
      rootSegment === "aiChat";
    const inOnboardingGroup = rootSegment === "onboarding";

    if (!hasSeenOnboarding && !inOnboardingGroup) {
      if (!hasNavigated.current) {
        hasNavigated.current = true;
        router.replace("/onboarding");
      }
      return;
    }

    if (inOnboardingGroup) {
      hasNavigated.current = false;
      return;
    }

    if (hasSeenOnboarding && !isAuthenticated && inProtectedGroup) {
      router.replace("/(auth)/login");
      return;
    }

    if (isAuthenticated && (inAuthGroup || inOnboardingGroup)) {
      router.replace("/(tabs)");
    }
  }, [isAuthenticated, isHydrated, hasSeenOnboarding, segments]);

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
      <Stack.Screen name="privacy" options={{ headerShown: false }} />
      <Stack.Screen name="(auth)/login" options={{ headerShown: false }} />
      <Stack.Screen name="(auth)/signup" options={{ headerShown: false }} />
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen
        name="(auth)/reset-password"
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="(auth)/forgot-password"
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="(auth)/verify-otp"
        options={{ headerShown: false }}
      />
    </Stack>
  );
}

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [queryClient] = useState(() => new QueryClient());

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
          <QueryClientProvider client={queryClient}>
            <ThemeProvider value={AppTheme}>
              <AppContent />
              <StatusBar style="light" />
            </ThemeProvider>
          </QueryClientProvider>
        </AuthProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

// Defined inside layout, but BELOW the provider
function AppContent() {
  const { isAuthenticated, token } = useAuth();
  const showToast = (
    msg: string,
    type: "success" | "error" | "warning" = "success"
  ) => {
    switch (type) {
      case "error":
        toast.error(msg);
        break;
      case "warning":
        toast.warning(msg);
        break;
      default:
        toast.success(msg);
    }
  };

  useEffect(() => {
    if (!isAuthenticated || !token) return;
    registerAndSendPushToken(token, showToast);
  }, [isAuthenticated, token]);

  return (
    <>
      <NavigationGuard />
      <Toaster />
    </>
  );
}
