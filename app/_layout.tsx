import { useColorScheme } from "@/hooks/use-color-scheme";
import { registerAndSendPushToken } from "@/lib/notifications/registerForPushToken";
import { AuthProvider, useAuth } from "@/providers/auth-provider";
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
import { GestureHandlerRootView } from "react-native-gesture-handler";
import "react-native-reanimated";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { toast, Toaster } from "sonner-native";
import { ActivityIndicator, Platform, View } from "react-native";


export const unstable_settings = {
  initialRouteName: "onboarding",
};

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: false,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

// Notifications.setNotificationChannelAsync("default", {
//   name: "default",
//   importance: Notifications.AndroidImportance.MAX,
//   sound: null,
// });

function NavigationGuard() {
  const { isAuthenticated, isHydrated, hasSeenOnboarding } = useAuth();
  const segments = useSegments();
  const router = useRouter();


  // NO useState, NO useEffect for reading AsyncStorage — context handles it

  useEffect(() => {
    if (!isHydrated) return;

    const rootSegment = segments[0];
    const inAuthGroup = rootSegment === "(auth)" || rootSegment === "login";
    const inProtectedGroup =
      rootSegment === "(tabs)" ||
      rootSegment === "workspaces" ||
      rootSegment === "aiChat";
    const inOnboardingGroup = rootSegment === "onboarding";

    if (!hasSeenOnboarding) {
      if (!inOnboardingGroup) router.replace("/onboarding");
      return;
    }

    if (isAuthenticated) {
      if (inAuthGroup || inOnboardingGroup) router.replace("/(tabs)");
      return;
    }

    if (!isAuthenticated) {
      if (inProtectedGroup || inOnboardingGroup) router.replace("/(auth)/login");
      return;
    }
  }, [isAuthenticated, isHydrated, hasSeenOnboarding, segments]);

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
      <Stack.Screen name="onboarding" options={{ headerShown: false }} />
      <Stack.Screen name="aiChat" options={{ headerShown: false }} />
      <Stack.Screen name="privacy" options={{ headerShown: false }} />
      <Stack.Screen name="terms" options={{ headerShown: false }} />
      <Stack.Screen name="(auth)/login" options={{ headerShown: false }} />
      <Stack.Screen name="(auth)/signup" options={{ headerShown: false }} />
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="(auth)/reset-password" options={{ headerShown: false }} />
      <Stack.Screen name="(auth)/forgot-password" options={{ headerShown: false }} />
      <Stack.Screen name="(auth)/callback" options={{ headerShown: false }} />
      <Stack.Screen name="(auth)/mfa-setup" options={{ headerShown: false }} />
      <Stack.Screen name="(auth)/mfa-login" options={{ headerShown: false }} />
      <Stack.Screen name="(auth)/mfa-recovery" options={{ headerShown: false }} />
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
  const router = useRouter();
  const { isAuthenticated, token } = useAuth();
  const pushRegistrationStarted = useRef(false);

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

  // Push token registration

  useEffect(() => {
    if (!isAuthenticated || !token) return;
    if (pushRegistrationStarted.current) return;

    pushRegistrationStarted.current = true;

    const timer = setTimeout(() => {
      registerAndSendPushToken(token);
    }, 2000);

    return () => clearTimeout(timer);
  }, [isAuthenticated]);

  // Notification click listener
  useEffect(() => {

    // Handle app opened from terminated state
    const lastNotificationResponse =
      Notifications.getLastNotificationResponse();

    if (lastNotificationResponse) {

      setTimeout(() => {
        router.replace("/(tabs)");
      }, 500);

    }

    // Handle notification tap while app in background
    const subscription =
      Notifications.addNotificationResponseReceivedListener(
        (response) => {

          console.log(
            "Notification tapped:",
            response
          );

          setTimeout(() => {
            router.replace("/(tabs)");
          }, 100);

        }
      );

    return () => {
      subscription.remove();
    };

  }, []);

  return (
    <>
      <NavigationGuard />
      <Toaster />
    </>
  );
}
