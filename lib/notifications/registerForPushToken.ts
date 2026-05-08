// lib/notifications/registerForPushToken.ts
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

export async function registerAndSendPushToken(
  token: string | null, // pass token from component
  showToast?: (msg: string) => void,
) {
  try {
    // 1. Android: set notification channel
    if (Platform.OS === "android") {
      await Notifications.setNotificationChannelAsync("default", {
        name: "default",
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: "#FF231F7C",
      });
    }

    // 2. Ask for permission
    const { status: existingStatus } =
      await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== "granted") {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (existingStatus !== "granted") {
      const { status } = await Notifications.requestPermissionsAsync();
      if (status !== "granted") {
        showToast?.("Push notification permission denied");
        return;
      }
      finalStatus = status;
    }

    // 3. Get projectId (EAS)
    const projectId = "34289344-f849-4bd5-ae0b-728b8cc40829";

    if (!projectId) {
      showToast?.("Project ID not found");
      return;
    }
    // console.log("projectId:", projectId);
    // 4. Get Expo push token
    const { data: expoPushToken } = await Notifications.getExpoPushTokenAsync({
      projectId,
    });

    console.log("Expo push token:", expoPushToken);

    if (!expoPushToken) {
      showToast?.("Failed to get push token");
      return;
    }

    // 5. Auth token is passed in; don’t call useAuth here
    if (!token) {
      showToast?.("You are not logged in");
      return;
    }

    // 6. Send to backend
    const res = await fetch(
      "https://adjusterassist-backend.onrender.com/api/v1/notifications/save-token",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ pushToken: expoPushToken }),
      },
    );

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || "Failed to save token");
    }

    // showToast?.("Push token saved");
  } catch (err: any) {
    console.log("registerAndSendPushToken error:", err);
    showToast?.(`Error: ${err.message}`);
  }
}
