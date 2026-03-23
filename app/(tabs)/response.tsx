import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage"; // Make sure to install this
import * as Clipboard from "expo-clipboard";
import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  Share,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { saveDraft } from "@/lib/api";
import { useAuth } from "@/providers/auth-provider";

type OutputType = "email" | "file" | "escalation";

type Params = {
  text?: string;
  type?: string;
  outputType?: OutputType;
  fileId?: string;
  alreadySaved: string;
};

const SAVED_DRAFTS_KEY = "@session_saved_drafts";

const defaultLabels: Record<string, string> = {
  email: "Email Response",
  file: "File",
  escalation: "Escalation Response",
};

export default function ResponseScreen() {
  const { token } = useAuth();
  const params = useLocalSearchParams<Params>();
  const insets = useSafeAreaInsets();

  const [copying, setCopying] = useState(false);
  const [saving, setSaving] = useState(false);
  const [isSaved, setIsSaved] = useState(params.alreadySaved === "true");

  const responseText = useMemo(() => {
    if (!params.text) return "No response available.";
    return params.text;
  }, [params.text]);

  const responseTypeLabel = params.type || defaultLabels[params.outputType || "email"] || "Generated Output";

  useEffect(() => {
    const checkSavedStatus = async () => {
      // If we are viewing a draft from the history/database, keep it as "Saved"
      if (params.alreadySaved === "true") {
        setIsSaved(true);
        return;
      }

      // If it's a fresh generation, check the session cache
      try {
        const stored = await AsyncStorage.getItem(SAVED_DRAFTS_KEY);
        if (stored) {
          const savedList: string[] = JSON.parse(stored);
          // Only set to true if THIS specific content was already saved in this session
          setIsSaved(savedList.includes(responseText));
        } else {
          setIsSaved(false);
        }
      } catch (e) {
        setIsSaved(false);
      }
    };

    checkSavedStatus();
  }, [responseText, params.alreadySaved]);

  async function onSave() {
    if (isSaved || saving) return;

    const fId = params.fileId;
    if (!fId || fId === "undefined" || fId === "null") {
      Alert.alert("Workspace Missing", "This draft is not linked to a workspace.");
      return;
    }

    if (!token) {
      Alert.alert("Session Expired", "Please log in again.");
      router.replace("/login");
      return;
    }

    const sanitizedToken = token.startsWith("Bearer ") ? token.split(" ")[1] : token;

    try {
      setSaving(true);
      const result = await saveDraft(
        sanitizedToken,
        Number(fId),
        params.outputType || 'email',
        responseText
      );

      // Assuming your API returns an object with success or the saved object itself
      if (result) {
        // 1. Update UI State immediately
        setIsSaved(true);

        // 2. Persist to Session Storage to prevent the "automatic save" glitch on next view
        const stored = await AsyncStorage.getItem(SAVED_DRAFTS_KEY);
        const savedList: string[] = stored ? JSON.parse(stored) : [];
        if (!savedList.includes(responseText)) {
          savedList.push(responseText);
          await AsyncStorage.setItem(SAVED_DRAFTS_KEY, JSON.stringify(savedList));
        }

        Alert.alert("Success", "Draft saved to workspace successfully.");
      }
    } catch (error: any) {
      console.error("[SAVE ERROR]:", error);
      Alert.alert("Save Failed", error.message || "An unexpected error occurred.");
    } finally {
      setSaving(false);
    }
  }

  function onBack() {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace("/(tabs)");
    }
  }

  const onShare = async () => {
    try {
      await Share.share({ message: responseText, title: responseTypeLabel });
    } catch (error) {
      console.log("Share error:", error);
    }
  };

  async function onCopy() {
    try {
      setCopying(true);
      await Clipboard.setStringAsync(responseText);
      setTimeout(() => setCopying(false), 2000);
    } catch {
      Alert.alert("Error", "Failed to copy text.");
      setCopying(false);
    }
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      <LinearGradient colors={["#276bbd", "#0B3C7A"]} style={[styles.header, { paddingTop: insets.top }]}>
        <View style={styles.headerContent}>
          <Pressable onPress={onBack} style={styles.iconButton}>
            <Ionicons name="chevron-back" size={28} color="#FFFFFF" />
          </Pressable>
          <Text style={styles.headerTitle}>Review Draft</Text>
          <Pressable onPress={onShare} style={styles.iconButton}>
            <Ionicons name="share-outline" size={24} color="#FFFFFF" />
          </Pressable>
        </View>
      </LinearGradient>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 160 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.metaRow}>
          <View style={styles.typeBadge}>
            <MaterialCommunityIcons name="robot" size={16} color="#1469C9" />
            <Text style={styles.typeText}>{responseTypeLabel}</Text>
          </View>
          <Text style={styles.timestamp}>{new Date().toLocaleDateString()}</Text>
        </View>

        <View style={styles.documentCard}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardHeaderLabel}>AI GENERATED CONTENT</Text>
            <View style={styles.cardHeaderLine} />
          </View>
          <Text style={styles.bodyText}>{responseText}</Text>
          <View style={styles.cardFooter}>
            <Text style={styles.footerNote}>Check for accuracy before sending.</Text>
          </View>
        </View>
      </ScrollView>

      <View style={[styles.floatingFooter, { paddingBottom: insets.bottom + 20 }]}>
        <View style={styles.buttonRow}>
          <Pressable onPress={onCopy} style={styles.secondaryButton}>
            <Ionicons name={copying ? "checkmark" : "copy-outline"} size={20} color="#0B3C7A" />
            <Text style={styles.secondaryButtonText}>{copying ? "Copied" : "Copy"}</Text>
          </Pressable>

          <Pressable
            onPress={onSave}
            disabled={saving || isSaved}
            style={[styles.primaryButton, (saving || isSaved) && { opacity: 0.8 }]}
          >
            <LinearGradient
              colors={isSaved ? ["#10B981", "#059669"] : ["#276bbd", "#0B3C7A"]}
              style={styles.buttonGradient}
            >
              {saving ? (
                <ActivityIndicator color="#FFF" size="small" />
              ) : (
                <>
                  <Ionicons name={isSaved ? "cloud-done" : "cloud-upload-outline"} size={20} color="#FFF" />
                  <Text style={styles.buttonText}>
                    {isSaved ? "Saved" : "Save to Workspace"}
                  </Text>
                </>
              )}
            </LinearGradient>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8FAFC" },
  header: { borderBottomLeftRadius: 24, borderBottomRightRadius: 24 },
  headerContent: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, height: 64 },
  headerTitle: { color: "#FFFFFF", fontSize: 18, fontWeight: "800" },
  iconButton: { padding: 8 },
  scroll: { flex: 1 },
  scrollContent: { padding: 20 },
  metaRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 16 },
  typeBadge: { flexDirection: "row", alignItems: "center", backgroundColor: "#DBEAFE", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, gap: 6 },
  typeText: { color: "#1E40AF", fontSize: 13, fontWeight: "700" },
  timestamp: { color: "#64748B", fontSize: 12 },
  documentCard: { backgroundColor: "#FFFFFF", borderRadius: 20, padding: 24, borderWidth: 1, borderColor: "#E2E8F0" },
  cardHeader: { marginBottom: 20, flexDirection: "row", alignItems: "center", gap: 10 },
  cardHeaderLabel: { fontSize: 10, color: "#94A3B8", fontWeight: "800" },
  cardHeaderLine: { flex: 1, height: 1, backgroundColor: "#F1F5F9" },
  bodyText: { color: "#334155", fontSize: 16, lineHeight: 28 },
  cardFooter: { marginTop: 30, paddingTop: 20, borderTopWidth: 1, borderTopColor: "#F1F5F9" },
  footerNote: { fontSize: 12, color: "#94A3B8", textAlign: "center" },
  floatingFooter: { position: "absolute", bottom: 0, left: 0, right: 0, backgroundColor: "#FFF", paddingHorizontal: 20, paddingTop: 16, borderTopWidth: 1, borderTopColor: "#E2E8F0" },
  buttonRow: { flexDirection: "row", gap: 12 },
  secondaryButton: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", borderWidth: 1.5, borderColor: "#276bbd", borderRadius: 16, height: 56, gap: 8 },
  secondaryButtonText: { color: "#0B3C7A", fontWeight: "700", fontSize: 15 },
  primaryButton: { flex: 2, borderRadius: 16, overflow: "hidden" },
  buttonGradient: { flexDirection: "row", alignItems: "center", justifyContent: "center", height: 56, gap: 10 },
  buttonText: { color: "#FFFFFF", fontSize: 15, fontWeight: "800" },
});