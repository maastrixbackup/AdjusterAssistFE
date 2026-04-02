import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import Voice, {
  SpeechErrorEvent,
  SpeechResultsEvent,
} from "@react-native-voice/voice";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  PermissionsAndroid,
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

const TASK_TYPES = [
  {
    id: "claim_note_drafting",
    label: "Claim Note Drafting",
    icon: "note-text-outline",
  },
  {
    id: "coverage_analysis_drafting",
    label: "Coverage Analysis",
    icon: "shield-search",
  },
  {
    id: "damage_evaluation_drafting",
    label: "Damage Evaluation",
    icon: "home-alert",
  },
  {
    id: "claim_communication_drafting",
    label: "Claim Communication",
    icon: "message-text-outline",
  },
  {
    id: "vendor_response_drafting",
    label: "Vendor Response",
    icon: "store-outline",
  },
  {
    id: "professional_documentation",
    label: "Professional Formatting",
    icon: "file-check-outline",
  },
];

type OutputMode =
  | "Email"
  | "File Note"
  | "Escalation"
  | "Xact Analysis"
  | "Contractor Response"
  | "Insured Response";

const outputModes: OutputMode[] = [
  "Email",
  "File Note",
  "Escalation",
  "Xact Analysis",
  "Contractor Response",
  "Insured Response",
];

const outputTypeMap: Record<OutputMode, OutputType> = {
  Email: "email",
  "File Note": "file",
  Escalation: "escalation",
  "Xact Analysis": "xactanalysis",
  "Contractor Response": "contractor",
  "Insured Response": "insured",
};

export default function GenerateScreen() {
  const { token } = useAuth();
  const scrollRef = useRef<ScrollView>(null);

  const [workspaces, setWorkspaces] = useState<ClaimFile[]>([]);
  const [selectedWorkspace, setSelectedWorkspace] = useState<ClaimFile | null>(
    null,
  );

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

  const [selectedTask, setSelectedTask] = useState(TASK_TYPES[0]);
  const [isTaskModalVisible, setIsTaskModalVisible] = useState(false);

  const [isListening, setIsListening] = useState(false);
  const [voiceAvailable, setVoiceAvailable] = useState(true);

  const isVoiceRecognitionAvailable = useCallback(async () => {
    if (!Voice || typeof Voice.isAvailable !== "function") {
      return false;
    }

    try {
      return !!(await Voice.isAvailable());
    } catch {
      return false;
    }
  }, []);

  const requestMicPermission = async () => {
    if (Platform.OS !== "android") return true;

    try {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
        {
          title: "Microphone Permission",
          message: "This app needs microphone access for voice input.",
          buttonPositive: "Allow",
          buttonNegative: "Cancel",
        },
      );

      const isGranted = granted === PermissionsAndroid.RESULTS.GRANTED;

      if (!isGranted) {
        toast.error("Microphone permission is required for voice input.");
      }

      return isGranted;
    } catch (error) {
      console.error("Permission error:", error);
      toast.error("Unable to request microphone permission.");
      return false;
    }
  };

  const onSpeechResults = useCallback((e: SpeechResultsEvent) => {
    if (e.value && e.value.length > 0) {
      const transcript = e.value[0]?.trim();
      if (!transcript) return;

      setRequest((prev) => (prev ? `${prev} ${transcript}` : transcript));
    }
  }, []);

  const onSpeechError = useCallback((e: SpeechErrorEvent) => {
    console.log("Speech Error:", JSON.stringify(e, null, 2));
    setIsListening(false);

    const message = e?.error?.message?.toLowerCase?.() || "";

    if (
      message.includes("no match") ||
      message.includes("didn't catch that") ||
      message.includes("no speech input")
    ) {
      toast.warning("Didn't catch that. Try speaking again.");
      return;
    }

    if (message.includes("permission")) {
      toast.error("Microphone permission denied.");
      return;
    }

    toast.error("Voice recognition stopped.");
  }, []);

  const onSpeechStart = useCallback(() => {
    setIsListening(true);
  }, []);

  const onSpeechEnd = useCallback(() => {
    setIsListening(false);
  }, []);

  useEffect(() => {
    const initVoice = async () => {
      await requestMicPermission();

      const available = await isVoiceRecognitionAvailable();
      setVoiceAvailable(available);

      if (!available) {
        console.log(
          "Voice recognition unavailable in current runtime (use a dev build if needed).",
        );
      }
    };

    initVoice();

    try {
      Voice.onSpeechStart = onSpeechStart;
      Voice.onSpeechEnd = onSpeechEnd;
      Voice.onSpeechResults = onSpeechResults;
      Voice.onSpeechError = onSpeechError;
    } catch {
      setVoiceAvailable(false);
    }

    return () => {
      Voice.destroy()
        .then(Voice.removeAllListeners)
        .catch(() => {});
    };
  }, [
    isVoiceRecognitionAvailable,
    onSpeechEnd,
    onSpeechError,
    onSpeechResults,
    onSpeechStart,
  ]);

  const toggleListening = async () => {
    try {
      const permissionGranted = await requestMicPermission();
      if (!permissionGranted) return;

      const available = await isVoiceRecognitionAvailable();

      if (!available) {
        toast.error(
          "Voice recognition is not available. Use Expo Dev Build (not Expo Go).",
        );
        return;
      }

      if (isListening) {
        await Voice.stop();
        setIsListening(false);
      } else {
        Keyboard.dismiss();

        // Optional cleanup before restart
        try {
          await Voice.cancel();
        } catch {}

        await Voice.start("en-US");
        setIsListening(true);

        setTimeout(() => {
          scrollRef.current?.scrollToEnd({ animated: true });
        }, 250);
      }
    } catch (e: any) {
      console.error("Voice Error:", e);
      setIsListening(false);

      const errText =
        e?.message || "Unable to start voice recognition. Rebuild app.";

      toast.error(errText);
    }
  };

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
  }, [fetchData]);

  useEffect(() => {
    const showSub = Keyboard.addListener("keyboardDidShow", () => {
      setTimeout(() => {
        scrollRef.current?.scrollToEnd({ animated: true });
      }, 100);
    });

    return () => {
      showSub.remove();
    };
  }, []);

  const handleCreateWorkspace = async () => {
    if (!token) return;

    if (!newClaim || !newClient) {
      toast.warning("Missing information");
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
        toast.success("Workspace created successfully");
      }
    } catch (error: any) {
      console.log(error);
      toast.error("Unable to create workspace");
    } finally {
      setIsCreatingFile(false);
    }
  };

  const onGenerate = useCallback(async () => {
    if (!token) return router.replace("/login");

    if (!selectedWorkspace) {
      toast.warning("Please select an Active Workspace first.");
      return;
    }

    if (!request || request.trim().length < 5) {
      toast.warning("Please describe the scenario (minimum 5 characters).");
      return;
    }

    setIsGenerating(true);

    try {
      const payload: GenerateResponseRequest = {
        fileId: selectedWorkspace.id,
        type: outputTypeMap[selectedOutput],
        userInput: `${request.trim()}${
          claimDetails ? `\n\nContext: ${claimDetails.trim()}` : ""
        }`,
        task_type: selectedTask.id,
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
      toast.error("Unable to generate response");
      console.log(error);
    } finally {
      setIsGenerating(false);
    }
  }, [
    token,
    request,
    claimDetails,
    selectedOutput,
    selectedWorkspace,
    selectedTask,
    fetchData,
  ]);

  if (isLoading && !refreshing) {
    return (
      <View style={styles.loaderScreen}>
        <LinearGradient
          colors={["#0F4C9C", "#123C78", "#0B2F5B"]}
          style={styles.loaderGradient}
        >
          <View style={styles.loaderContent}>
            <View style={styles.loaderIconWrap}>
              <Ionicons name="sparkles" size={34} color="#FFFFFF" />
            </View>

            <Text style={styles.loaderTitle}>Preparing AI Workspace</Text>

            <Text style={styles.loaderSubtitle}>
              Setting up your claim assistant...
            </Text>

            <ActivityIndicator
              size="small"
              color="#FFFFFF"
              style={{ marginTop: 18 }}
            />
          </View>
        </LinearGradient>
      </View>
    );
  }

  return (
    <View style={styles.mainContainer}>
      <StatusBar style="light" />

      <LinearGradient
        colors={["#0F4C9C", "#123C78"]}
        style={styles.headerGradient}
      >
        <SafeAreaView edges={["top"]} style={styles.safeHeader}>
          <View style={styles.navBar}>
            <Pressable onPress={() => router.back()} style={styles.iconBtn}>
              <Ionicons name="chevron-back" size={22} color="#FFFFFF" />
            </Pressable>
            <Text style={styles.navTitle}>AI Studio</Text>
            <View style={styles.creditBadge}>
              <View style={styles.statusDot} />
              <Text style={styles.creditValue}>
                {status?.subscription?.remaining ?? 0} Credits
              </Text>
            </View>
          </View>
        </SafeAreaView>
      </LinearGradient>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ScrollView
          ref={scrollRef}
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.sectionLabel}>Active Workspace</Text>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.workspaceScroll}
          >
            <Pressable
              style={styles.addWorkspaceBtn}
              onPress={() => setIsModalVisible(true)}
            >
              <Ionicons name="add" size={20} color="#0F4C9C" />
              <Text style={styles.addWorkspaceText}>New Workspace</Text>
            </Pressable>

            {workspaces.map((ws) => (
              <Pressable
                key={ws.id}
                onPress={() => setSelectedWorkspace(ws)}
                style={[
                  styles.workspaceItem,
                  selectedWorkspace?.id === ws.id && styles.workspaceItemActive,
                ]}
              >
                <MaterialCommunityIcons
                  name={
                    selectedWorkspace?.id === ws.id ? "folder-open" : "folder"
                  }
                  size={18}
                  color={selectedWorkspace?.id === ws.id ? "#FFF" : "#64748B"}
                />
                <Text
                  style={[
                    styles.workspaceText,
                    selectedWorkspace?.id === ws.id &&
                      styles.workspaceTextActive,
                  ]}
                >
                  {ws.client_name || ws.claim_number}
                </Text>
              </Pressable>
            ))}
          </ScrollView>

          <Text style={styles.sectionLabel}>Assistant Task</Text>
          <Pressable
            style={styles.dropdownTrigger}
            onPress={() => setIsTaskModalVisible(true)}
          >
            <View style={styles.dropdownLeft}>
              <View style={styles.taskIconCircle}>
                <MaterialCommunityIcons
                  name={selectedTask.icon as any}
                  size={20}
                  color="#0F4C9C"
                />
              </View>
              <Text style={styles.dropdownValueText}>{selectedTask.label}</Text>
            </View>
            <Ionicons name="chevron-down" size={20} color="#64748B" />
          </Pressable>

          <Text style={styles.sectionLabel}>Output Format</Text>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.tabContainer}
          >
            {outputModes.map((mode) => {
              const isActive = mode === selectedOutput;

              return (
                <Pressable
                  key={mode}
                  onPress={() => setSelectedOutput(mode)}
                  style={[styles.tabItem, isActive && styles.tabItemActive]}
                >
                  <Text
                    style={[styles.tabText, isActive && styles.tabTextActive]}
                  >
                    {mode}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>

          <View style={styles.glassCard}>
            <View style={styles.fieldGroup}>
              <View style={styles.fieldHeader}>
                <View style={styles.iconCircle}>
                  <MaterialCommunityIcons
                    name="text-box-search-outline"
                    size={16}
                    color="#0F4C9C"
                  />
                </View>
                <Text style={styles.inputLabel}>Scenario Description</Text>
              </View>

              <View style={styles.inputWrapper}>
                <TextInput
                  value={request}
                  onChangeText={setRequest}
                  multiline
                  onFocus={() => {
                    scrollRef.current?.scrollToEnd({ animated: true });
                  }}
                  placeholder="What do you want to achieve?"
                  placeholderTextColor="#94A3B8"
                  style={styles.mainTextInput}
                  returnKeyType="done"
                  blurOnSubmit={true}
                />

                <Pressable
                  onPress={toggleListening}
                  style={[
                    styles.micBtn,
                    isListening && styles.micBtnActive,
                    !voiceAvailable && styles.micBtnDisabled,
                  ]}
                >
                  <Ionicons
                    name={isListening ? "stop-circle" : "mic"}
                    size={24}
                    color={
                      !voiceAvailable
                        ? "#94A3B8"
                        : isListening
                          ? "red"
                          : "#0F4C9C"
                    }
                  />
                </Pressable>
              </View>

              {isListening && (
                <Text style={styles.listeningText}>Listening...</Text>
              )}
            </View>
          </View>

          <Pressable
            onPress={onGenerate}
            disabled={isGenerating}
            style={styles.generateBtn}
          >
            <LinearGradient
              colors={["#0F4C9C", "#1E3A8A"]}
              style={styles.gradientBtn}
            >
              {isGenerating ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <>
                  <Text style={styles.btnText}>Generate Draft</Text>
                  <MaterialCommunityIcons
                    name="auto-fix"
                    size={20}
                    color="#FFF"
                  />
                </>
              )}
            </LinearGradient>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>

      <Modal
        visible={isTaskModalVisible}
        animationType="fade"
        transparent={true}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { minHeight: 350 }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Assistant Task</Text>
              <Pressable onPress={() => setIsTaskModalVisible(false)}>
                <Ionicons name="close" size={24} color="#94A3B8" />
              </Pressable>
            </View>

            <FlatList
              data={TASK_TYPES}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <Pressable
                  style={[
                    styles.taskOption,
                    selectedTask.id === item.id && styles.taskOptionActive,
                  ]}
                  onPress={() => {
                    setSelectedTask(item);
                    setIsTaskModalVisible(false);
                  }}
                >
                  <MaterialCommunityIcons
                    name={item.icon as any}
                    size={22}
                    color={selectedTask.id === item.id ? "#0F4C9C" : "#64748B"}
                  />
                  <Text
                    style={[
                      styles.taskOptionText,
                      selectedTask.id === item.id &&
                        styles.taskOptionTextActive,
                    ]}
                  >
                    {item.label}
                  </Text>
                  {selectedTask.id === item.id && (
                    <Ionicons
                      name="checkmark-circle"
                      size={20}
                      color="#0F4C9C"
                    />
                  )}
                </Pressable>
              )}
            />
          </View>
        </View>
      </Modal>

      <Modal visible={isModalVisible} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>New Workspace File</Text>
              <Pressable onPress={() => setIsModalVisible(false)}>
                <Ionicons name="close" size={24} color="#94A3B8" />
              </Pressable>
            </View>

            <View style={styles.modalBody}>
              <Text style={styles.modalLabel}>Claim Number</Text>
              <TextInput
                style={styles.modalInput}
                value={newClaim}
                onChangeText={setNewClaim}
              />

              <Text style={styles.modalLabel}>Policy Number</Text>
              <TextInput
                style={styles.modalInput}
                value={newPolicy}
                onChangeText={setNewPolicy}
              />

              <Text style={styles.modalLabel}>Client Name</Text>
              <TextInput
                style={styles.modalInput}
                value={newClient}
                onChangeText={setNewClient}
              />

              <Pressable
                style={styles.modalActionBtn}
                onPress={handleCreateWorkspace}
                disabled={isCreatingFile}
              >
                {isCreatingFile ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <Text style={styles.modalActionText}>
                    Initialize Workspace
                  </Text>
                )}
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
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  headerGradient: {
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    overflow: "hidden",
  },
  safeHeader: { paddingHorizontal: 18, paddingBottom: 18 },
  navBar: {
    minHeight: 64,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  loaderScreen: {
    flex: 1,
  },
  loaderGradient: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loaderContent: {
    alignItems: "center",
    paddingHorizontal: 30,
  },
  loaderIconWrap: {
    width: 72,
    height: 72,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  loaderTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#FFFFFF",
    textAlign: "center",
  },
  loaderSubtitle: {
    marginTop: 8,
    fontSize: 13,
    color: "rgba(255,255,255,0.75)",
    textAlign: "center",
    lineHeight: 20,
  },
  iconBtn: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.12)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.18)",
  },
  navTitle: { fontSize: 19, fontWeight: "800", color: "#FFFFFF" },
  creditBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(255,255,255,0.14)",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 14,
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: "#22C55E",
  },
  creditValue: { color: "#FFFFFF", fontSize: 13, fontWeight: "800" },
  scrollView: { flex: 1 },
  scrollContent: { padding: 20, paddingBottom: 80 },
  sectionLabel: {
    fontSize: 11,
    fontWeight: "800",
    color: "#94A3B8",
    textTransform: "uppercase",
    letterSpacing: 1.5,
    marginBottom: 14,
    marginTop: 10,
  },
  workspaceScroll: { paddingLeft: 4, gap: 10, marginBottom: 25 },
  workspaceItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    gap: 8,
  },
  workspaceItemActive: {
    backgroundColor: "#0F4C9C",
    borderColor: "#0f4c9c",
  },
  workspaceText: { fontSize: 14, fontWeight: "700", color: "#64748B" },
  workspaceTextActive: { color: "#FFF" },
  addWorkspaceBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#EEF2FF",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 16,
    borderStyle: "dashed",
    borderWidth: 1,
    borderColor: "#0F4C9C",
    gap: 4,
  },
  addWorkspaceText: { fontSize: 14, fontWeight: "800", color: "#0F4C9C" },
  tabContainer: {
    paddingVertical: 6,
    paddingHorizontal: 4,
    gap: 10,
  },

  tabItem: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 999, // pill shape
    backgroundColor: "#F3F4F6", // soft gray
  },

  tabItemActive: {
    backgroundColor: "#1F2937", // dark premium
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 3,
  },

  tabText: {
    fontSize: 14,
    color: "#374151",
    fontWeight: "500",
  },

  tabTextActive: {
    color: "#FFFFFF",
    fontWeight: "600",
  },
  glassCard: {
    backgroundColor: "#FFF",
    borderRadius: 28,
    padding: 20,
    borderWidth: 1,
    borderColor: "#FFF",
  },
  fieldGroup: { marginVertical: 4 },
  fieldHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 12,
  },
  iconCircle: {
    width: 28,
    height: 28,
    borderRadius: 10,
    backgroundColor: "#EEF2FF",
    alignItems: "center",
    justifyContent: "center",
  },
  inputLabel: { fontSize: 14, fontWeight: "700", color: "#1E293B" },
  inputWrapper: {
    minHeight: 90,
    borderRadius: 16,
    backgroundColor: "#FFFFFF",
    position: "relative",
    paddingRight: 50,
  },
  mainTextInput: {
    fontSize: 16,
    color: "#334155",
    minHeight: 80,
    textAlignVertical: "top",
    paddingVertical: 8,
  },
  listeningText: {
    marginTop: 10,
    fontSize: 13,
    fontWeight: "700",
    color: "#0F4C9C",
  },
  cardDivider: { height: 1, backgroundColor: "#F1F5F9", marginVertical: 20 },
  subTextInput: {
    fontSize: 15,
    color: "#475569",
    minHeight: 20,
    textAlignVertical: "top",
  },
  generateBtn: { marginTop: 30, borderRadius: 20, overflow: "hidden" },
  gradientBtn: {
    height: 64,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  btnText: { color: "#FFFFFF", fontSize: 17, fontWeight: "800" },
  historyTitle: { fontSize: 18, fontWeight: "800", color: "#0F172A" },
  historyList: { gap: 14 },
  historyItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF",
    padding: 14,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#F1F5F9",
  },
  historyIconBox: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: "#EAF2FF",
    alignItems: "center",
    justifyContent: "center",
  },
  historyContent: { flex: 1, marginLeft: 16 },
  historyTypeTag: {
    fontSize: 10,
    fontWeight: "900",
    color: "#94A3B8",
    textTransform: "uppercase",
  },
  historyText: { fontSize: 14, color: "#1E293B", fontWeight: "600" },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.6)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#FFF",
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    padding: 24,
    minHeight: 450,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 25,
  },
  modalTitle: { fontSize: 20, fontWeight: "800", color: "#0F172A" },
  modalBody: { gap: 16 },
  modalLabel: {
    fontSize: 12,
    fontWeight: "800",
    color: "#94A3B8",
    textTransform: "uppercase",
  },
  modalInput: {
    backgroundColor: "#F8FAFC",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    fontSize: 15,
    color: "#0F172A",
  },
  modalActionBtn: {
    backgroundColor: "#0F4C9C",
    borderRadius: 18,
    paddingVertical: 18,
    alignItems: "center",
    marginTop: 10,
  },
  modalActionText: { color: "#FFF", fontSize: 16, fontWeight: "800" },
  historyHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
    marginTop: 12,
  },
  refreshBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#E0F2FE",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  refreshText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#0F4C9C",
    textTransform: "uppercase",
  },
  dropdownTrigger: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#FFF",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    marginBottom: 20,
  },
  dropdownLeft: { flexDirection: "row", alignItems: "center", gap: 12 },
  taskIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: "#EEF2FF",
    alignItems: "center",
    justifyContent: "center",
  },
  dropdownValueText: { fontSize: 15, fontWeight: "700", color: "#1E293B" },
  taskOption: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 16,
    marginBottom: 8,
    gap: 12,
  },
  taskOptionActive: { backgroundColor: "#F1F5F9" },
  taskOptionText: {
    flex: 1,
    fontSize: 15,
    fontWeight: "600",
    color: "#64748B",
  },
  taskOptionTextActive: { color: "#0F4C9C", fontWeight: "800" },
  micBtn: {
    position: "absolute",
    right: 0,
    bottom: 0,
    padding: 10,
    borderRadius: 12,
  },
  micBtnActive: {
    transform: [{ scale: 1.08 }],
  },
  micBtnDisabled: {
    opacity: 0.5,
  },
});
