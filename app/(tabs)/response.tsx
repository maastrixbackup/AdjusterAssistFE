import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import React, { useState } from "react";
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

// Ensure generateNextStep is exported from your @/lib/api
import { generateNextStep, saveDraft, updateDraft } from "@/lib/api";
import { useAuth } from "@/providers/auth-provider";
import { toast } from "sonner-native";

type Params = {
  text?: string;
  type?: string;
  output_format?: string;
  userInput?: string;
  fileId?: string;
  alreadySaved?: string;
  draftId?: string;
  created_at?: string;
};

const SESSION_HISTORY_KEY = "@session_saved_drafts_data";

export default function ResponseScreen() {
  const { token } = useAuth();
  const params = useLocalSearchParams<Params>();
  const insets = useSafeAreaInsets();

  const [copying, setCopying] = useState(false);
  const [saving, setSaving] = useState(false);
  const [isSaved, setIsSaved] = useState(params.alreadySaved === "true");
  const [draftCreatedAt, setDraftCreatedAt] = useState(params.created_at || "");
  const [isEditing, setIsEditing] = useState(false);
  const [editedText, setEditedText] = useState(params.text || "");
  
  // --- NEXT STEP STATE ---
  const [isGeneratingNext, setIsGeneratingNext] = useState(false);

  /**
   * TRIGGER WORKFLOW CHAIN
   * This calls your new API and pushes the user to a NEW response screen
   */
  const handleWorkflowChain = async () => {
    if (!token || isGeneratingNext) return;

    try {
      setIsGeneratingNext(true);
      const sanitizedToken = token.startsWith("Bearer ") ? token.split(" ")[1] : token;

      const result = await generateNextStep(sanitizedToken, {
        fileId: params.fileId || "",
        userInput: params.userInput, // Fallback context
        previousResponse: editedText,
        output_format: params.output_format || "",
        // nextPrompt: "Generate the mandatory follow-up documentation for this file." // Static prompt for now
      });

      if (result) {
        toast.success("Workflow Advanced");
        // Push to a fresh response screen with the new AI content
        router.push({
          pathname: "/response",
          params: {
            text: result.responseText,
            output_format: result.output_format,
            fileId: params.fileId,
            alreadySaved: "false",
            created_at: result.createdAt
          }
        });
      }
    } catch (error: any) {
      toast.error("Workflow Error", { description: error.message });
    } finally {
      setIsGeneratingNext(false);
    }
  };

  // ... [Keep your existing useEffects for loading and session logging] ...

  async function onSave() {
    if (isEditing) { setIsEditing(false); toast.success("Draft updated locally."); return; }
    if (isSaved || saving) return;
    const fId = params.fileId;
    if (!fId || fId === "undefined") { toast.warning("Workspace missing"); return; }
    try {
      setSaving(true);
      const sanitizedToken = token?.startsWith("Bearer ") ? token.split(" ")[1] : token;
      let result = (params.alreadySaved === "true" && params.draftId)
        ? await updateDraft(sanitizedToken!, params.draftId, { content: editedText, output_format: params.output_format || "" })
        : await saveDraft(sanitizedToken!, Number(fId), params.output_format || "", editedText);
      if (result) { setIsSaved(true); toast.success("Draft Saved"); }
    } catch (e: any) { toast.error("Save failed"); } finally { setSaving(false); }
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
            <Pressable onPress={() => setIsEditing(!isEditing)} style={styles.iconButton}>
              <MaterialCommunityIcons name={isEditing ? "close-circle" : "pencil-outline"} size={24} color={isEditing ? "#ff4444" : "#FFFFFF"} />
            </Pressable>
            <Pressable onPress={() => Share.share({ message: editedText })} style={styles.iconButton}>
              <Ionicons name="share-outline" size={24} color="#FFFFFF" />
            </Pressable>
          </View>
        </View>
      </LinearGradient>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 180 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.metaRow}>
          <View style={styles.typeBadge}>
            <MaterialCommunityIcons name="robot" size={16} color="#1469C9" />
            <Text style={styles.typeText}>{params.output_format}</Text>
          </View>
          <Text style={styles.timestamp}>{new Date().toLocaleTimeString()}</Text>
        </View>

        <View style={[styles.documentCard, isEditing && styles.editingCard]}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardHeaderLabel}>{isEditing ? "EDITING" : "AI CONTENT"}</Text>
            <View style={styles.cardHeaderLine} />
          </View>
          
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
        </View>

        {/* STATIC NEXT STEP BUTTON (Triggering the Workflow API) */}
        {!isEditing && (
          <Pressable 
            onPress={handleWorkflowChain} 
            disabled={isGeneratingNext}
            style={({ pressed }) => [styles.nextStepBar, pressed && { opacity: 0.8 }]}
          >
            <View style={styles.nextStepContent}>
              <MaterialCommunityIcons name="lightning-bolt" size={20} color="#F59E0B" />
              <View>
                <Text style={styles.nextStepTitle}>Generate Next Step</Text>
                <Text style={styles.nextStepSub}>Draft the mandatory follow-up documentation</Text>
              </View>
            </View>
            {isGeneratingNext ? (
              <ActivityIndicator color="#276bbd" />
            ) : (
              <Ionicons name="chevron-forward" size={20} color="#94A3B8" />
            )}
          </Pressable>
        )}
      </ScrollView>

      {/* FIXED FOOTER */}
      <View style={[styles.floatingFooter, { paddingBottom: insets.bottom + 20 }]}>
        <View style={styles.buttonRow}>
          <Pressable onPress={() => { Clipboard.setStringAsync(editedText); setCopying(true); setTimeout(() => setCopying(false), 2000); toast.success("Copied"); }} style={styles.secondaryButton}>
            <Ionicons name={copying ? "checkmark" : "copy-outline"} size={20} color="#0B3C7A" />
            <Text style={styles.secondaryButtonText}>{copying ? "Copied" : "Copy"}</Text>
          </Pressable>

          <Pressable onPress={onSave} disabled={saving || (isSaved && !isEditing)} style={styles.primaryButton}>
            <LinearGradient
              colors={isEditing || isSaved ? ["#10B981", "#059669"] : ["#276bbd", "#0B3C7A"]}
              style={styles.buttonGradient}
            >
              {saving ? <ActivityIndicator color="#FFF" /> : (
                <>
                  <Ionicons name={isEditing ? "checkmark-done" : (isSaved ? "cloud-done" : "cloud-upload-outline")} size={20} color="#FFF" />
                  <Text style={styles.buttonText}>{isEditing ? "Confirm" : (isSaved ? "Saved" : "Save Draft")}</Text>
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
  header: { borderBottomLeftRadius: 24, borderBottomRightRadius: 24, elevation: 4 },
  headerContent: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, height: 64 },
  headerTitle: { color: "#FFFFFF", fontSize: 18, fontWeight: "800" },
  iconButton: { padding: 8 },
  scroll: { flex: 1 },
  scrollContent: { padding: 20 },
  metaRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 12 },
  typeBadge: { flexDirection: "row", alignItems: "center", backgroundColor: "#DBEAFE", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, gap: 4 },
  typeText: { color: "#1E40AF", fontSize: 12, fontWeight: "700" },
  timestamp: { color: "#94A3B8", fontSize: 11 },
  documentCard: { backgroundColor: "#FFFFFF", borderRadius: 20, padding: 20, borderWidth: 1, borderColor: "#E2E8F0", elevation: 1 },
  editingCard: { borderColor: "#276bbd", backgroundColor: "#F9FBFF", borderWidth: 2 },
  cardHeader: { marginBottom: 16, flexDirection: "row", alignItems: "center", gap: 8 },
  cardHeaderLabel: { fontSize: 10, color: "#94A3B8", fontWeight: "800", letterSpacing: 1 },
  cardHeaderLine: { flex: 1, height: 1, backgroundColor: "#F1F5F9" },
  bodyText: { color: "#334155", fontSize: 15, lineHeight: 24 },
  textInput: { color: "#334155", fontSize: 15, lineHeight: 24, minHeight: 250 },
  
  // NEXT STEP BAR STYLES
  nextStepBar: { 
    marginTop: 20, 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between',
    backgroundColor: '#FFF', 
    borderRadius: 16, 
    padding: 16, 
    borderWidth: 1, 
    borderColor: '#E2E8F0',
    borderLeftWidth: 4,
    borderLeftColor: '#F59E0B'
  },
  nextStepContent: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  nextStepTitle: { fontWeight: '800', color: '#1E293B', fontSize: 14 },
  nextStepSub: { color: '#64748B', fontSize: 11, marginTop: 2 },

  floatingFooter: { position: "absolute", bottom: 0, left: 0, right: 0, backgroundColor: "#FFF", paddingHorizontal: 20, paddingTop: 12, borderTopWidth: 1, borderTopColor: "#E2E8F0" },
  buttonRow: { flexDirection: "row", gap: 10 },
  secondaryButton: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", borderWidth: 1.5, borderColor: "#276bbd", borderRadius: 14, height: 52 },
  secondaryButtonText: { color: "#0B3C7A", fontWeight: "700", fontSize: 14 },
  primaryButton: { flex: 2, borderRadius: 14, overflow: "hidden" },
  buttonGradient: { flexDirection: "row", alignItems: "center", justifyContent: "center", height: 52, gap: 8 },
  buttonText: { color: "#FFFFFF", fontSize: 14, fontWeight: "800" },
});