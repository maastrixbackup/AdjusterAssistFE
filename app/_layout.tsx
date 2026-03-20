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

import { useColorScheme } from "@/hooks/use-color-scheme";
import { AuthProvider } from "@/providers/auth-provider";

export const unstable_settings = {
  // Ensure 'login' is definitely the first screen on the stack
  initialRouteName: "login",
};

export default function RootLayout() {
  const colorScheme = useColorScheme();

  // Custom theme to prevent the "White Flash" during transitions
  const AppTheme = {
    ...(colorScheme === "dark" ? DarkTheme : DefaultTheme),
    colors: {
      ...(colorScheme === "dark" ? DarkTheme.colors : DefaultTheme.colors),
      background: "#0B3C7A", // Force background to match your Login/Signup brand color
    },
  };

  return (
    <AuthProvider>
      <ThemeProvider value={AppTheme}>
        {/* We wrap the Stack in a View with the brand color as a secondary safety net */}
        <View style={{ flex: 1, backgroundColor: "#0B3C7A" }}>
          <Stack
            screenOptions={{
              headerTintColor: "#FFFFFF",
              // Fix: Added contentStyle to ensure all screens share the brand background
              contentStyle: { backgroundColor: "#0B3C7A" }, 
              headerTitleStyle: {
                fontSize: 15,
                fontWeight: "600",
              },
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
            {/* Login and Signup usually flicker most; we keep them as 'false' headers */}
            <Stack.Screen name="login" options={{ headerShown: false, animation: 'fade' }} />
            <Stack.Screen name="signup" options={{ headerShown: false, animation: 'fade' }} />
            
            <Stack.Screen
              name="forgot-password"
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="reset-password"
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="response"
              options={{
                headerShown: false,
              }}
            />
            
            {/* Tabs & Modals */}
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen
              name="modal"
              options={{ presentation: "modal", title: "Modal" }}
            />
            <Stack.Screen name="notification" options={{ title: "Notifications" }} />
          </Stack>
        </View>
        <StatusBar style="light" />
      </ThemeProvider>
    </AuthProvider>
  );
}