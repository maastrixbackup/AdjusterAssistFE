import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import * as Notifications from "expo-notifications";
import { Stack, useRouter, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, useRef } from "react";
import { ActivityIndicator, View } from "react-native";
import "react-native-reanimated";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { Toaster } from "sonner-native";

import { useColorScheme } from "@/hooks/use-color-scheme";
import { registerForPushNotifications } from "@/lib/notification";
import { AuthProvider, useAuth } from "@/providers/auth-provider";
import { GestureHandlerRootView } from "react-native-gesture-handler";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export const unstable_settings = {
  initialRouteName: "login",
};

// --- THIS COMPONENT HANDLES THE REDIRECT LOGIC ---
function NavigationGuard() {
  const { isAuthenticated, isHydrated, token } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  // References for notification listeners
  const notificationListener = useRef<any>(null);
  const responseListener = useRef<any>(null);

  useEffect(() => {
    if (!isHydrated) return;

    const inAuthGroup = segments[0] === "(tabs)" || segments[0] === "workspaces" || segments[0] === "generate";

    if (!isAuthenticated && inAuthGroup) {
      router.replace("/login");
    } else if (isAuthenticated && (segments[0] === "login" || segments[0] === "signup")) {
      router.replace("/(tabs)");
    }
  }, [isAuthenticated, isHydrated, segments]);

  useEffect(() => {
    if (isHydrated && isAuthenticated && token) {
      const timeout = setTimeout(() => {
        registerForPushNotifications(token);
      }, 1000);

      notificationListener.current = Notifications.addNotificationReceivedListener(notification => {
        console.log("Notification Received:", notification);
      });

      responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
        router.push("/(tabs)");
      });

      return () => {
        clearTimeout(timeout);
        // Change these lines here:
        if (notificationListener.current) notificationListener.current.remove();
        if (responseListener.current) responseListener.current.remove();
      };
    }
  }, [isAuthenticated, isHydrated, token]);

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
      <Stack.Screen name="reset-password" options={{ headerShown: false }} />
      <Stack.Screen name="forgot-password" options={{ headerShown: false }} />
      <Stack.Screen name="verify-otp" options={{ headerShown: false }} />
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
            <View style={{ flex: 1, backgroundColor: "#020617" }}>
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