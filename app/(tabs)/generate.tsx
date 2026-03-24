import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Toast from "react-native-toast-message";

import {
  ClaimFile,
  createFile,
  generateResponse,
  GenerateResponseRequest,
  getMyFiles,
  getRecentDrafts,
  getSubscriptionStatus,
  OutputType,
  RecentDraft,
  SubscriptionStatus,
} from "@/lib/api";
import { useAuth } from "@/providers/auth-provider";
import { toast } from "sonner-native";

type OutputMode = "Email" | "File Note" | "Escalation";
const outputModes: OutputMode[] = ["Email", "File Note", "Escalation"];

const outputTypeMap: Record<OutputMode, OutputType> = {
  Email: "email",
  "File Note": "file",
  Escalation: "escalation",
};

export default function GenerateScreen() {
  const { token } = useAuth();

  const [workspaces, setWorkspaces] = useState<ClaimFile[]>([]);
  const [selectedWorkspace, setSelectedWorkspace] = useState<ClaimFile | null>(null);

  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isCreatingFile, setIsCreatingFile] = useState(false);
  const [newClaim, setNewClaim] = useState("");
  const [newPolicy, setNewPolicy] = useState("");
  const [newClient, setNewClient] = useState("");

  const [selectedOutput, setSelectedOutput] = useState<OutputMode>("Email");
  const [request, setRequest] = useState("");
  const [claimDetails, setClaimDetails] = useState("");
  const [status, setStatus] = useState<SubscriptionStatus | null>(null);
  const [recentDrafts, setRecentDrafts] = useState<RecentDraft[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async () => {
    if (!token) return;
    try {
      const [statusData, draftsData, filesData] = await Promise.all([
        getSubscriptionStatus(token),
        getRecentDrafts(token),
        getMyFiles(token),
      ]);
      setStatus(statusData);
      setRecentDrafts(draftsData ?? []);
      setWorkspaces(filesData ?? []);

      if (filesData && filesData.length > 0 && !selectedWorkspace) {
        setSelectedWorkspace(filesData[0]);
      }
    } catch (err) {
      console.error("Fetch error:", err);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, [token, selectedWorkspace]);

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreateWorkspace = async () => {
    if (!token) return;
    if (!newClaim || !newClient) {
      toast.warning("Missing information")
      return;
    }

    setIsCreatingFile(true);
    try {
      const response = await createFile(token, {
        client_name: newClient,
        policy_number: newPolicy || null,
        claim_number: newClaim,
        status: "active",
      });

      if (response.success) {
        const newFile = response.file;
        setWorkspaces((prev) => [newFile, ...prev]);
        setSelectedWorkspace(newFile);
        setIsModalVisible(false);
        setNewClaim("");
        setNewPolicy("");
        setNewClient("");
        toast.success("Workspace created successfully")
      }
    } catch (error: any) {
      console.log(error)
      toast.error("unable to create workspace")
    } finally {
      setIsCreatingFile(false);
    }
  };

  const onGenerate = useCallback(async () => {
    if (!token) return router.replace("/login");
    if (!selectedWorkspace) {
      Toast.show({ type: "error", text1: "No Workspace" });
      return;
    }

    setIsGenerating(true);
    try {
      const payload: GenerateResponseRequest = {
        fileId: selectedWorkspace.id,
        type: outputTypeMap[selectedOutput],
        userInput: `${request.trim()}${claimDetails ? `\n\nContext: ${claimDetails.trim()}` : ""}`,
        shouldSave: false
      };

      const result = await generateResponse(token, payload);
      router.push({
        pathname: "/response",
        params: {
          outputType: result.responseType,
          type: result.responseTypeLabel,
          text: result.responseText,
          fileId: result.fileId.toString(),
          alreadySaved: "false",
        },
      });
      setRequest("");
      setClaimDetails("");
      fetchData();
    } catch (error: any) {
      toast.error("Unable too generate response")
      // console.log(error)
    } finally {
      setIsGenerating(false);
    }
  }, [token, request, claimDetails, selectedOutput, selectedWorkspace, fetchData]);

  // FIXED: Added check for undefined type
  const handleHistoryPress = (draft: RecentDraft) => {
    const typeStr = draft.draft_type || 'email';
    router.push({
      pathname: "/response",
      params: {
        outputType: typeStr as OutputType,
        type: typeStr.charAt(0).toUpperCase() + typeStr.slice(1),
        text: draft.content || "No content found.",
        fileId: draft.file_id?.toString() || "null",
        alreadySaved: "true",
      },
    });
  };

  const onClickRefresh = async() =>{
    // console.log("Refresh Clicked")
    if(!token)return;
    await getRecentDrafts(token)
  }

  if (isLoading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0F4C9C" />
      </View>
    );
  }

  return (
    <View style={styles.mainContainer}>
      <StatusBar style="light" />

      <LinearGradient colors={["#0F4C9C", "#123C78"]} style={styles.headerGradient}>
        <SafeAreaView edges={["top"]} style={styles.safeHeader}>
          <View style={styles.navBar}>
            <Pressable onPress={() => router.back()} style={styles.iconBtn}>
              <Ionicons name="chevron-back" size={22} color="#FFFFFF" />
            </Pressable>
            <Text style={styles.navTitle}>AI Studio</Text>
            <View style={styles.creditBadge}>
              <View style={styles.statusDot} />
              <Text style={styles.creditValue}>{status?.subscription?.remaining ?? 0} Credits</Text>
            </View>
          </View>
        </SafeAreaView>
      </LinearGradient>

      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

          <Text style={styles.sectionLabel}>Active Workspace</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.workspaceScroll}>
            <Pressable style={styles.addWorkspaceBtn} onPress={() => setIsModalVisible(true)}>
              <Ionicons name="add" size={20} color="#0F4C9C" />
              <Text style={styles.addWorkspaceText}>New Workspace</Text>
            </Pressable>
            {workspaces.map((ws) => (
              <Pressable
                key={ws.id}
                onPress={() => setSelectedWorkspace(ws)}
                style={[styles.workspaceItem, selectedWorkspace?.id === ws.id && styles.workspaceItemActive]}
              >
                <MaterialCommunityIcons
                  name={selectedWorkspace?.id === ws.id ? "folder-open" : "folder"}
                  size={18} color={selectedWorkspace?.id === ws.id ? "#FFF" : "#64748B"}
                />
                <Text style={[styles.workspaceText, selectedWorkspace?.id === ws.id && styles.workspaceTextActive]}>
                  {ws.client_name || ws.claim_number}
                </Text>
              </Pressable>
            ))}
          </ScrollView>

          <Text style={styles.sectionLabel}>Output Format</Text>
          <View style={styles.tabContainer}>
            {outputModes.map((mode) => (
              <Pressable key={mode} onPress={() => setSelectedOutput(mode)} style={[styles.tabItem, mode === selectedOutput && styles.tabItemActive]}>
                <Text style={[styles.tabText, mode === selectedOutput && styles.tabTextActive]}>{mode}</Text>
              </Pressable>
            ))}
          </View>

          <View style={styles.glassCard}>
            <View style={styles.fieldGroup}>
              <View style={styles.fieldHeader}>
                <View style={styles.iconCircle}><MaterialCommunityIcons name="text-box-search-outline" size={16} color="#0F4C9C" /></View>
                <Text style={styles.inputLabel}>Scenario Description</Text>
              </View>
              <TextInput value={request} onChangeText={setRequest} multiline placeholder="What do you want to achieve?" placeholderTextColor="#94A3B8" style={styles.mainTextInput} />
            </View>
            <View style={styles.cardDivider} />
            <View style={styles.fieldGroup}>
              <View style={styles.fieldHeader}>
                <View style={[styles.iconCircle, { backgroundColor: "#F1F5F9" }]}><MaterialCommunityIcons name="paperclip" size={16} color="#475569" /></View>
                <Text style={styles.inputLabel}>Policy Context</Text>
              </View>
              <TextInput value={claimDetails} onChangeText={setClaimDetails} multiline placeholder="Optional details..." placeholderTextColor="#94A3B8" style={styles.subTextInput} />
            </View>
          </View>

          <Pressable onPress={onGenerate} disabled={isGenerating} style={styles.generateBtn}>
            <LinearGradient colors={["#0F4C9C", "#1E3A8A"]} style={styles.gradientBtn}>
              {isGenerating ? <ActivityIndicator color="#FFF" /> : <><Text style={styles.btnText}>Draft Intelligence</Text><MaterialCommunityIcons name="auto-fix" size={20} color="#FFF" /></>}
            </LinearGradient>
          </Pressable>

          <View style={styles.historyHeader}>
            <Text style={styles.historyTitle}>Recent Generations</Text>

            {/* NEW: Refresh Trigger */}
            <Pressable
              onPress={onClickRefresh} 
              style={({ pressed }) => [
                styles.refreshBadge,
                pressed && { opacity: 0.6 }
              ]}
            >
              <Ionicons
                name={isLoading ? "sync" : "refresh-outline"}
                size={12}
                color="#0F4C9C"
                style={isLoading && { transform: [{ rotate: '45deg' }] }} // Subtle visual cue when loading
              />
              <Text style={styles.refreshText}>{isLoading ? "Syncing..." : "Refresh"}</Text>
            </Pressable>
          </View>

          <View style={styles.historyList}>
            {recentDrafts.map((item) => (
              <Pressable
                key={item.id || item.content} // Fallback to content if ID is missing for session drafts
                onPress={() => handleHistoryPress(item)}
                style={({ pressed }) => [styles.historyItem, pressed && { opacity: 0.7 }]}
              >
                <View style={styles.historyIconBox}>
                  <Ionicons name="document-text-outline" size={20} color="#0F4C9C" />
                </View>
                <View style={styles.historyContent}>
                  <Text style={styles.historyTypeTag}>{item.claim_number || "Draft"}</Text>
                  <Text style={styles.historyText} numberOfLines={1}>{item.content}</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color="#CBD5E1" />
              </Pressable>
            ))}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <Modal visible={isModalVisible} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>New Workspace File</Text>
              <Pressable onPress={() => setIsModalVisible(false)}><Ionicons name="close" size={24} color="#94A3B8" /></Pressable>
            </View>
            <View style={styles.modalBody}>
              <Text style={styles.modalLabel}>Claim Number</Text>
              <TextInput style={styles.modalInput} value={newClaim} onChangeText={setNewClaim} />
              <Text style={styles.modalLabel}>Policy Number</Text>
              <TextInput style={styles.modalInput} value={newPolicy} onChangeText={setNewPolicy} />
              <Text style={styles.modalLabel}>Client Name</Text>
              <TextInput style={styles.modalInput} value={newClient} onChangeText={setNewClient} />
              <Pressable style={styles.modalActionBtn} onPress={handleCreateWorkspace} disabled={isCreatingFile}>
                {isCreatingFile ? <ActivityIndicator color="#FFF" /> : <Text style={styles.modalActionText}>Initialize Workspace</Text>}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
      <Toast />
    </View>
  );
}

const styles = StyleSheet.create({
  mainContainer: { flex: 1, backgroundColor: "#F8FAFC" },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  headerGradient: { borderBottomLeftRadius: 28, borderBottomRightRadius: 28, overflow: "hidden" },
  safeHeader: { paddingHorizontal: 18, paddingBottom: 18 },
  navBar: { minHeight: 64, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  iconBtn: { width: 42, height: 42, borderRadius: 14, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(255,255,255,0.12)", borderWidth: 1, borderColor: "rgba(255,255,255,0.18)" },
  navTitle: { fontSize: 19, fontWeight: "800", color: "#FFFFFF" },
  creditBadge: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "rgba(255,255,255,0.14)", paddingHorizontal: 12, paddingVertical: 8, borderRadius: 14 },
  statusDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: "#22C55E" },
  creditValue: { color: "#FFFFFF", fontSize: 13, fontWeight: "800" },
  scrollView: { flex: 1 },
  scrollContent: { padding: 20, paddingBottom: 40 },
  sectionLabel: { fontSize: 11, fontWeight: "800", color: "#94A3B8", textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 14, marginTop: 10 },
  workspaceScroll: { paddingLeft: 4, gap: 10, marginBottom: 25 },
  workspaceItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 16, borderWidth: 1, borderColor: '#E2E8F0', gap: 8 },
  workspaceItemActive: { backgroundColor: '#0F4C9C', borderColor: '#0f4c9c' },
  workspaceText: { fontSize: 14, fontWeight: '700', color: '#64748B' },
  workspaceTextActive: { color: '#FFF' },
  addWorkspaceBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#EEF2FF', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 16, borderStyle: 'dashed', borderWidth: 1, borderColor: '#0F4C9C', gap: 4 },
  addWorkspaceText: { fontSize: 14, fontWeight: '800', color: '#0F4C9C' },
  tabContainer: { flexDirection: "row", backgroundColor: "#E2E8F0", borderRadius: 18, padding: 6, marginBottom: 28 },
  tabItem: { flex: 1, paddingVertical: 12, alignItems: "center", borderRadius: 14 },
  tabItemActive: { backgroundColor: "#FFF" },
  tabText: { fontSize: 14, color: "#64748B", fontWeight: "600" },
  tabTextActive: { color: "#0F4C9C", fontWeight: "800" },
  glassCard: { backgroundColor: "#FFF", borderRadius: 28, padding: 20, borderWidth: 1, borderColor: "#FFF" },
  fieldGroup: { marginVertical: 4 },
  fieldHeader: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 12 },
  iconCircle: { width: 28, height: 28, borderRadius: 10, backgroundColor: "#EEF2FF", alignItems: "center", justifyContent: "center" },
  inputLabel: { fontSize: 14, fontWeight: "700", color: "#1E293B" },
  mainTextInput: { fontSize: 16, color: "#334155", minHeight: 60, textAlignVertical: "top" },
  cardDivider: { height: 1, backgroundColor: "#F1F5F9", marginVertical: 20 },
  subTextInput: { fontSize: 15, color: "#475569", minHeight: 20, textAlignVertical: "top" },
  generateBtn: { marginTop: 30, borderRadius: 20, overflow: "hidden" },
  gradientBtn: { height: 64, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 12 },
  btnText: { color: "#FFFFFF", fontSize: 17, fontWeight: "800" },
  historyTitle: { fontSize: 18, fontWeight: "800", color: "#0F172A" },
  historyList: { gap: 14 },
  historyItem: { flexDirection: "row", alignItems: "center", backgroundColor: "#FFF", padding: 14, borderRadius: 20, borderWidth: 1, borderColor: "#F1F5F9" },
  historyIconBox: { width: 48, height: 48, borderRadius: 14, backgroundColor: "#EAF2FF", alignItems: "center", justifyContent: "center" },
  historyContent: { flex: 1, marginLeft: 16 },
  historyTypeTag: { fontSize: 10, fontWeight: "900", color: "#94A3B8", textTransform: "uppercase" },
  historyText: { fontSize: 14, color: "#1E293B", fontWeight: "600" },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.6)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#FFF', borderTopLeftRadius: 32, borderTopRightRadius: 32, padding: 24, minHeight: 450 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 25 },
  modalTitle: { fontSize: 20, fontWeight: '800', color: '#0F172A' },
  modalBody: { gap: 16 },
  modalLabel: { fontSize: 12, fontWeight: '800', color: '#94A3B8', textTransform: 'uppercase' },
  modalInput: { backgroundColor: '#F8FAFC', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#E2E8F0', fontSize: 15, color: '#0F172A' },
  modalActionBtn: { backgroundColor: '#0F4C9C', borderRadius: 18, paddingVertical: 18, alignItems: 'center', marginTop: 10 },
  modalActionText: { color: '#FFF', fontSize: 16, fontWeight: '800' },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    marginTop:12
  },
  refreshBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E0F2FE', // Light blue background
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  refreshText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0F4C9C',
    textTransform: 'uppercase',
  },
});