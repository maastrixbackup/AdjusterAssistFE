import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { View } from "react-native";
import "react-native-reanimated";
// 1. Import Toaster from sonner-native
import { Toaster } from "sonner-native";

import { useColorScheme } from "@/hooks/use-color-scheme";
import { AuthProvider } from "@/providers/auth-provider";
import { GestureHandlerRootView } from "react-native-gesture-handler";

export const unstable_settings = {
  initialRouteName: "login",
};

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
    // 2. Added flex: 1 to ensure the app fills the screen
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AuthProvider>
        <ThemeProvider value={AppTheme}>
          <View style={{ flex: 1, backgroundColor: "#0B3C7A" }}>
            <Stack
              screenOptions={{
                headerTintColor: "#FFFFFF",
                contentStyle: { backgroundColor: "#0B3C7A" },
                headerTitleStyle: {
                  fontSize: 15,
                  fontWeight: "600",
                },
                animation:"fade",
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
              <Stack.Screen name="login" options={{ headerShown: false, animation: 'fade' }} />
              <Stack.Screen name="signup" options={{ headerShown: false, animation: 'fade' }} />
              <Stack.Screen name="forgot-password" options={{ headerShown: false }} />
              <Stack.Screen name="reset-password" options={{ headerShown: false }} />
              <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
              <Stack.Screen name="modal" options={{ presentation: "modal", title: "Modal" }} />
              <Stack.Screen name="notification" options={{ title: "Notifications" }} />
            </Stack>

            {/* 3. Place Toaster here at the bottom of the JSX so it overlays everything */}
            <Toaster />
          </View>
          <StatusBar style="light" />
        </ThemeProvider>
      </AuthProvider>
    </GestureHandlerRootView>
  );
}