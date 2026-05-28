// lib/notifications/registerForPushToken.ts
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import { apiRequest } from "../services/apiClient";

export async function registerAndSendPushToken(token: string | null) {
  try {
    if (!token) return;

    if (Platform.OS === "android") {
      await Notifications.setNotificationChannelAsync("default", {
        name: "default",
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: "#FF231F7C",
      });
    }

    const { status: existingStatus } =
      await Notifications.getPermissionsAsync();

    let finalStatus = existingStatus;

    if (existingStatus !== "granted") {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    // USER DENIED: update profile only, then stop
    if (finalStatus !== "granted") {
      if (__DEV__) {
        console.log("Push permission denied. Updating push_enabled false.");
      }

      setTimeout(() => {
        apiRequest("/user/update", "PATCH", {
          push_enabled: false,
          expo_push_token: null,
        }).catch(() => {});
      }, 1000);
      return;
    }

    const projectId = "34289344-f849-4bd5-ae0b-728b8cc40829";

    const { data: expoPushToken } = await Notifications.getExpoPushTokenAsync({
      projectId,
    });

    if (!expoPushToken) return;

    if (__DEV__) {
      console.log("Expo push token:", expoPushToken);
    }

    await apiRequest("/notifications/save-token", "POST", {
      pushToken: expoPushToken,
    });

    await apiRequest("/user/update", "PATCH", {
      push_enabled: true,
      expo_push_token: expoPushToken,
    });
  } catch (err: any) {
    if (__DEV__) {
      console.log("Push registration skipped:", err?.message || err);
    }

    // Important: never throw from here
    return;
  }
}
