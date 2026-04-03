import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Clipboard from "expo-clipboard";
import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Share,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { OutputType, saveDraft, updateDraft } from "@/lib/api"; // Added updateDraft
import { useAuth } from "@/providers/auth-provider";
import { toast } from "sonner-native";


type Params = {
  text?: string;
  type?: string;
  outputType?: OutputType;
  fileId?: string;
  alreadySaved?: string;
  draftId?: string; // Added draftId to params
};

const SESSION_HISTORY_KEY = "@session_saved_drafts_data";
const defaultLabels: Record<OutputType, string> = {
  file_note: "File Note",
  email_insured: "Insured Correspondence",
  email_contractor: "Contractor Correspondence",
  escalation_response: "Escalation Response",
  supplement_response: "Supplement Response",
  coverage_analysis: "Coverage Analysis",
  denial_support: "Denial Support",
  claim_summary: "Claim Summary",
  xactanalysis_response: "Xact Analysis",
  damage_evaluation: "Damage Evaluation",
};

export default function ResponseScreen() {
  const { token } = useAuth();
  const params = useLocalSearchParams<Params>();
  const insets = useSafeAreaInsets();

  const [copying, setCopying] = useState(false);
  const [saving, setSaving] = useState(false);
  const [isSaved, setIsSaved] = useState(params.alreadySaved === "true");

  // --- NEW EDITING STATES ---
  const [isEditing, setIsEditing] = useState(false);
  const [editedText, setEditedText] = useState(params.text || "");

  const responseTypeLabel = params.type || defaultLabels[params.outputType || "file_note"] || "Generated Output";

  /**
   * 1. AUTOMATIC LOCAL SESSION SAVE
   */
  useEffect(() => {
    const logToSession = async () => {
      if (params.alreadySaved === "true") return;

      try {
        const rawData = await AsyncStorage.getItem(SESSION_HISTORY_KEY);
        let currentData = rawData ? JSON.parse(rawData) : [];
        const exists = currentData.some((item: any) => item.content === editedText);

        if (!exists) {
          const newEntry = {
            id: Date.now(),
            content: editedText,
            draft_type: params.outputType || 'email',
            file_id: params.fileId,
            created_at: new Date().toISOString(),
          };
          currentData.unshift(newEntry);
          await AsyncStorage.setItem(SESSION_HISTORY_KEY, JSON.stringify(currentData.slice(0, 50)));
        }
      } catch (e) {
        console.error("Local Session Log Error:", e);
      }
    };
    logToSession();
  }, [params.text]);

  useEffect(() => {
    setIsSaved(params.alreadySaved === "true");
    setEditedText(params.text || "");
    setSaving(false);
  }, [params.text, params.alreadySaved]);

  /**
   * 2. MANUAL DB SAVE / UPDATE
   */
  async function onSave() {
    // If user is editing, "Confirming" just exits edit mode locally
    if (isEditing) {
      setIsEditing(false);
      toast.success("Draft updated.");
      return;
    }

    if (isSaved || saving) return;

    const fId = params.fileId;
    if (!fId || fId === "undefined" || fId === "null") {
      toast.warning("Workspace is missing")
      return;
    }

    if (!token) {
      toast.warning("Session Expired")
      router.replace("/login");
      return;
    }

    try {
      setSaving(true);
      const sanitizedToken = token.startsWith("Bearer ") ? token.split(" ")[1] : token;

      let result;
      // Use updateDraft if we already have a record, otherwise saveDraft
      if (params.alreadySaved === "true" && params.draftId) {
        result = await updateDraft(sanitizedToken, params.draftId, {
          content: editedText,
          draft_type: params.outputType || 'email'
        });
      } else {
        result = await saveDraft(
          sanitizedToken,
          Number(fId),
          params.outputType || 'file_note',
          editedText
        );
      }

      if (result) {
        setIsSaved(true);
        toast.success("Success", {
          description: "Draft has been saved to your workspace.",
        });
      }
    } catch (error: any) {
      toast.error("Error", { description: "Save failed" });
      console.log(error);
    } finally {
      setSaving(false);
    }
  }

  const onShare = async () => {
    try {
      await Share.share({ message: editedText, title: responseTypeLabel });
    } catch (error) {
      console.log("Share error:", error);
    }
  };

  async function onCopy() {
    try {
      setCopying(true);
      await Clipboard.setStringAsync(editedText);
      setTimeout(() => setCopying(false), 2000);
      toast.success("Copied to Clipboard")
    } catch {
      setCopying(false);
    }
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      <LinearGradient colors={["#276bbd", "#0B3C7A"]} style={[styles.header, { paddingTop: insets.top }]}>
        <View style={styles.headerContent}>
          <Pressable onPress={() => router.back()} style={styles.iconButton}>
            <Ionicons name="chevron-back" size={28} color="#FFFFFF" />
          </Pressable>
          <Text style={styles.headerTitle}>Review Draft</Text>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {/* NEW EDIT ICON */}
            <Pressable onPress={() => setIsEditing(!isEditing)} style={styles.iconButton}>
              <MaterialCommunityIcons 
                name={isEditing ? "close-circle" : "pencil-outline"} 
                size={24} 
                color={isEditing ? "#ff0909" : "#FFFFFF"} 
              />
            </Pressable>
            <Pressable onPress={onShare} style={styles.iconButton}>
              <Ionicons name="share-outline" size={24} color="#FFFFFF" />
            </Pressable>
          </View>
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
          <Text style={styles.timestamp}>
            {isEditing ? "EDIT MODE" : new Date().toLocaleDateString()}
          </Text>
        </View>

        <View style={[styles.documentCard, isEditing && styles.editingCard]}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardHeaderLabel}>
               {isEditing ? "EDIT DRAFT" : "AI GENERATED CONTENT"}
            </Text>
            <View style={styles.cardHeaderLine} />
          </View>
          
          {/* TOGGLE BETWEEN TEXT AND TEXTINPUT */}
          {isEditing ? (
            <TextInput
              style={styles.textInput}
              multiline
              value={editedText}
              onChangeText={setEditedText}
              autoFocus
              textAlignVertical="top"
            />
          ) : (
            <Text style={styles.bodyText}>{editedText}</Text>
          )}

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
            disabled={saving || (isSaved && !isEditing)}
            style={[styles.primaryButton, (saving || (isSaved && !isEditing)) && { opacity: 0.8 }]}
          >
            <LinearGradient
              colors={isEditing ? ["#10B981", "#059669"] : (isSaved ? ["#10B981", "#059669"] : ["#276bbd", "#0B3C7A"])}
              style={styles.buttonGradient}
            >
              {saving ? (
                <ActivityIndicator color="#FFF" size="small" />
              ) : (
                <>
                  <Ionicons name={isEditing ? "checkmark-done" : (isSaved ? "cloud-done" : "cloud-upload-outline")} size={20} color="#FFF" />
                  <Text style={styles.buttonText}>
                    {isEditing ? "Confirm Changes" : (isSaved ? "Saved" : "Save to Workspace")}
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
  editingCard: { borderColor: "#276bbd", borderWidth: 2, backgroundColor: "#F0F7FF" }, // Highlight card when editing
  cardHeader: { marginBottom: 20, flexDirection: "row", alignItems: "center", gap: 10 },
  cardHeaderLabel: { fontSize: 10, color: "#94A3B8", fontWeight: "800" },
  cardHeaderLine: { flex: 1, height: 1, backgroundColor: "#F1F5F9" },
  bodyText: { color: "#334155", fontSize: 16, lineHeight: 28 },
  textInput: { color: "#334155", fontSize: 16, lineHeight: 28, minHeight: 200, padding: 0 }, // Style for editable text
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