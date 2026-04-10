import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import { savePushToken } from "./api";

export async function registerForPushNotifications(token: string) {
  let expoToken;

  // 1. Request Permissions
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== "granted") {
    console.log("Failed to get push token for push notification!");
    return;
  }

  // 2. Get the token from Expo
  // Note: 'projectId' is required for EAS builds. Find it in your app.json
  expoToken = (
    await Notifications.getExpoPushTokenAsync({
      projectId: "6a1feab1-61a6-4811-a565-a7c7c1dc31fc",
    })
  ).data;

  // 3. Send to your backend
  if (expoToken) {
    try {
      await savePushToken(expoToken, token);
      console.log("Push token synced with AdjusterAssist backend");
    } catch (err) {
      console.error("Error syncing push token:", err);
    }
  }

  // Android specific configuration
  if (Platform.OS === "android") {
    Notifications.setNotificationChannelAsync("default", {
      name: "default",
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#FF231F7C",
    });
  }
}
