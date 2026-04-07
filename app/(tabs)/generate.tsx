import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import * as ImagePicker from "expo-image-picker";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
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
  | "File Note"
  | "Insured Email"
  | "Contractor Email"
  | "Escalation"
  | "Supplement"
  | "Coverage Analysis"
  | "Denial Support"
  | "Claim Summary"
  | "Xact Analysis"
  | "Damage Evaluation";

const outputModes: OutputMode[] = [
  "File Note",
  "Insured Email",
  "Contractor Email",
  "Escalation",
  "Supplement",
  "Coverage Analysis",
  "Denial Support",
  "Claim Summary",
  "Xact Analysis",
  "Damage Evaluation",
];

const outputTypeMap: Record<OutputMode, OutputType> = {
  "File Note": "file_note",
  "Insured Email": "email_insured",
  "Contractor Email": "email_contractor",
  Escalation: "escalation_response",
  Supplement: "supplement_response",
  "Coverage Analysis": "coverage_analysis",
  "Denial Support": "denial_support",
  "Claim Summary": "claim_summary",
  "Xact Analysis": "xactanalysis_response",
  "Damage Evaluation": "damage_evaluation",
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

  // Unified Form State for all 11 fields (Plus status)
  const [fileForm, setFileForm] = useState({
    claim_number: "",
    client_name: "",
    address: "",
    policy_form: "HO-3",
    date_of_loss: new Date().toISOString().split("T")[0],
    reported_date: new Date().toISOString().split("T")[0],
    loss_type: "water",
    jurisdiction: "",
    line_of_business: "homeowners",
    claim_stage: "mitigation_review",
    status: "active" as const,
  });

  const [selectedOutput, setSelectedOutput] = useState<OutputMode>("File Note");
  const [request, setRequest] = useState("");
  const [claimDetails, setClaimDetails] = useState("");
  const [status, setStatus] = useState<SubscriptionStatus | null>(null);
  const [recentDrafts, setRecentDrafts] = useState<RecentDraft[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [selectedTask, setSelectedTask] = useState(TASK_TYPES[0]);
  const [isTaskModalVisible, setIsTaskModalVisible] = useState(false);
  const [showScenarioScrollButton, setShowScenarioScrollButton] = useState(false);
  const scenarioTextInputRef = useRef<TextInput>(null);

  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const recordingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isPickingImage, setIsPickingImage] = useState(false);
  const [isTakingPhoto, setIsTakingPhoto] = useState(false);

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
      if (filesData?.length > 0 && !selectedWorkspace)
        setSelectedWorkspace(filesData[0]);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, [token, selectedWorkspace]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useFocusEffect(
    React.useCallback(() => {
      setTimeout(() => {
        scrollRef.current?.scrollTo({
          y: 0,
          animated: false, // instant reset
        });
      }, 50);
    }, []),
  );

  // Handle Scenario Description Text Change
  const handleScenarioTextChange = (text: string) => {
    setRequest(text);
    setShowScenarioScrollButton(text.length > 100);
  };

  // Handler for Scenario Scroll to Bottom
  const handleScenarioScrollToBottom = () => {
    if (scenarioTextInputRef.current) {
      scenarioTextInputRef.current.focus();
    }
  };

  const handlePickImage = async () => {
    try {
      setIsPickingImage(true);
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert(
          "Permission required",
          "Media library access is required to attach a photo.",
        );
        return;
      }

      const result: any = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        quality: 1,
      });

      const imageAsset = result.assets?.[0];
      if (imageAsset?.uri) {
        setSelectedImage(imageAsset.uri);
        const fileName = imageAsset.uri.split("/").pop() ?? "image";
        setRequest((prev) =>
          prev
            ? `${prev}\n[Attached image: ${fileName}]`
            : `[Attached image: ${fileName}]`,
        );
      }
    } catch (error) {
      console.error("Image picker error:", error);
      Alert.alert("Attachment failed", "Unable to attach a photo.");
    } finally {
      setIsPickingImage(false);
    }
  };

  const handleTakePhoto = async () => {
    try {
      setIsTakingPhoto(true);
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        Alert.alert(
          "Permission required",
          "Camera access is required to take a photo.",
        );
        return;
      }

      const result: any = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        quality: 1,
      });

      const imageAsset = result.assets?.[0];
      if (imageAsset?.uri) {
        setSelectedImage(imageAsset.uri);
        const fileName = imageAsset.uri.split("/").pop() ?? "photo";
        setRequest((prev) =>
          prev
            ? `${prev}\n[Attached photo: ${fileName}]`
            : `[Attached photo: ${fileName}]`,
        );
      }
    } catch (error) {
      console.error("Camera error:", error);
      Alert.alert("Attachment failed", "Unable to take a photo.");
    } finally {
      setIsTakingPhoto(false);
    }
  };

  const handleCreateWorkspace = async () => {
    if (!token) return;

    // Validation for the 11 mandatory fields
    const {
      claim_number,
      client_name,
      address,
      jurisdiction,
      loss_type,
      date_of_loss,
    } = fileForm;
    if (
      !claim_number ||
      !client_name ||
      !address ||
      !jurisdiction ||
      !loss_type ||
      !date_of_loss
    ) {
      toast.warning("Missing required insurance metadata");
      return;
    }

    setIsCreatingFile(true);
    try {
      const response = await createFile(token, fileForm);
      if (response.success) {
        const newFile = response.file;
        setWorkspaces((prev) => [newFile, ...prev]);
        setSelectedWorkspace(newFile);
        setIsModalVisible(false);
        setFileForm({
          claim_number: "",
          client_name: "",
          address: "",
          policy_form: "HO-3",
          date_of_loss: new Date().toISOString().split("T")[0],
          reported_date: new Date().toISOString().split("T")[0],
          loss_type: "water",
          jurisdiction: "",
          line_of_business: "homeowners",
          claim_stage: "mitigation_review",
          status: "active",
        });
        toast.success("Workspace initialized");
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Creation failed");
    } finally {
      setIsCreatingFile(false);
    }
  };

  const onGenerate = useCallback(async () => {
    if (!token) return router.replace("/login");
    if (!selectedWorkspace) return toast.warning("Select a Workspace first.");
    if (!request || request.trim().length < 5)
      return toast.warning("Describe the scenario.");

    setIsGenerating(true);
    try {
      const payload: GenerateResponseRequest = {
        fileId: selectedWorkspace.id,
        type: outputTypeMap[selectedOutput],
        userInput: `${request.trim()}${claimDetails ? `\n\nContext: ${claimDetails.trim()}` : ""}`,
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
      toast.error(error.message || "Generation failed");
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
       
           <View style={{ flex: 1, padding: 20 }}>
          <Text style={styles.sectionLabel}>Active Workspace</Text>
          <View style={styles.workspaceGrid}>
            <Pressable
              style={[styles.workspaceTile, styles.addWorkspaceBtn]}
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
                  styles.workspaceTile,
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
          </View>

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
            {outputModes.map((mode) => (
              <Pressable
                key={mode}
                onPress={() => setSelectedOutput(mode)}
                style={[
                  styles.tabItem,
                  mode === selectedOutput && styles.tabItemActive,
                ]}
              >
                <Text
                  style={[
                    styles.tabText,
                    mode === selectedOutput && styles.tabTextActive,
                  ]}
                >
                  {mode}
                </Text>
              </Pressable>
            ))}
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
                {request.length > 0 && (
                  <TouchableOpacity
                    onPress={() => setRequest("")}
                    style={styles.clearTextButton}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.clearText}>Clear</Text>
                  </TouchableOpacity>
                )}
              </View>
              <View style={styles.inputWrapper}>
                <TextInput
                  ref={scenarioTextInputRef}
                  value={request}
                  onChangeText={handleScenarioTextChange}
                  multiline
                  scrollEnabled
                  placeholder="What happened?"
                  placeholderTextColor="#94A3B8"
                  style={styles.mainTextInput}
                  onFocus={() => {
                    setTimeout(() => {
                      scrollRef.current?.scrollTo({
                        y: 300, // ✅ force scroll down
                        animated: true,
                      });
                    }, 250);
                  }}
                />

                {selectedImage ? (
                  <View style={styles.imagePreviewContainer}>
                    <Image source={{ uri: selectedImage }} style={styles.imagePreview} />
                    <TouchableOpacity
                      style={styles.removeImageButton}
                      onPress={() => setSelectedImage(null)}
                    >
                      <MaterialCommunityIcons name="close" size={16} color="#0F172A" />
                    </TouchableOpacity>
                  </View>
                ) : null}

            
              </View>
              {/* {isRecording && (
                <Text style={styles.listeningText}>Listening...</Text>
              )} */}
              {/* 
              {isProcessing && (
                <Text style={styles.listeningText}>Converting speech...</Text>
              )} */}
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
        </View>
      </KeyboardAvoidingView>

      {/* TASK MODAL */}
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

      {/* NEW WORKSPACE MODAL (11 FIELDS) */}
      <Modal visible={isModalVisible} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { height: "85%" }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Initialize Claim File</Text>
              <Pressable onPress={() => setIsModalVisible(false)}>
                <Ionicons name="close" size={24} color="#94A3B8" />
              </Pressable>
            </View>
            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.modalScrollContent}
            >
              <View>
                <Text style={styles.modalLabel}>Claim Number *</Text>
                <TextInput
                  style={styles.modalInput}
                  value={fileForm.claim_number}
                  onChangeText={(t) =>
                    setFileForm({ ...fileForm, claim_number: t })
                  }
                  placeholder="e.g. CLM-2026-001"
                />
              </View>
              <View>
                <Text style={styles.modalLabel}>Client Name *</Text>
                <TextInput
                  style={styles.modalInput}
                  value={fileForm.client_name}
                  onChangeText={(t) =>
                    setFileForm({ ...fileForm, client_name: t })
                  }
                  placeholder="Insured Name"
                />
              </View>
              <View>
                <Text style={styles.modalLabel}>Property Address *</Text>
                <TextInput
                  style={styles.modalInput}
                  value={fileForm.address}
                  onChangeText={(t) => setFileForm({ ...fileForm, address: t })}
                  placeholder="Full Street Address"
                />
              </View>
              <View style={styles.rowTwoColumn}>
                <View style={styles.rowColumn}>
                  <Text style={styles.modalLabel}>Policy Form</Text>
                  <TextInput
                    style={styles.modalInput}
                    value={fileForm.policy_form}
                    onChangeText={(t) =>
                      setFileForm({ ...fileForm, policy_form: t })
                    }
                    placeholder="HO-3"
                  />
                </View>
                <View style={styles.rowColumn}>
                  <Text style={styles.modalLabel}>Jurisdiction *</Text>
                  <TextInput
                    style={styles.modalInput}
                    value={fileForm.jurisdiction}
                    onChangeText={(t) =>
                      setFileForm({ ...fileForm, jurisdiction: t })
                    }
                    placeholder="CT, FL, etc."
                  />
                </View>
              </View>
              <View style={styles.rowTwoColumn}>
                <View style={styles.rowColumn}>
                  <Text style={styles.modalLabel}>Date of Loss *</Text>
                  <TextInput
                    style={styles.modalInput}
                    value={fileForm.date_of_loss}
                    onChangeText={(t) =>
                      setFileForm({ ...fileForm, date_of_loss: t })
                    }
                    placeholder="YYYY-MM-DD"
                  />
                </View>
                <View style={styles.rowColumn}>
                  <Text style={styles.modalLabel}>Reported Date</Text>
                  <TextInput
                    style={styles.modalInput}
                    value={fileForm.reported_date}
                    onChangeText={(t) =>
                      setFileForm({ ...fileForm, reported_date: t })
                    }
                  />
                </View>
              </View>
              <View>
                <Text style={styles.modalLabel}>
                  Loss Type (water/fire/etc) *
                </Text>
                <TextInput
                  style={styles.modalInput}
                  value={fileForm.loss_type}
                  onChangeText={(t) =>
                    setFileForm({ ...fileForm, loss_type: t })
                  }
                />
              </View>
              <View>
                <Text style={styles.modalLabel}>Line of Business</Text>
                <TextInput
                  style={styles.modalInput}
                  value={fileForm.line_of_business}
                  onChangeText={(t) =>
                    setFileForm({ ...fileForm, line_of_business: t })
                  }
                />
              </View>
              <View>
                <Text style={styles.modalLabel}>Claim Stage</Text>
                <TextInput
                  style={styles.modalInput}
                  value={fileForm.claim_stage}
                  onChangeText={(t) =>
                    setFileForm({ ...fileForm, claim_stage: t })
                  }
                />
              </View>

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
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Toast />
    </View>
  );
}

const styles = StyleSheet.create({
  mainContainer: { flex: 1, backgroundColor: "#F8FAFC" },
  headerGradient: {
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    overflow: "hidden",
  },
  safeHeader: { paddingHorizontal: 18, paddingBottom: 18 },
  navBar: {
    minHeight: 58,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  loaderScreen: { flex: 1 },
  loaderGradient: { flex: 1, justifyContent: "center", alignItems: "center" },
  loaderContent: { alignItems: "center", paddingHorizontal: 30 },
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
  clearButton: {
    position: "absolute",
    top: 10,
    right: 10,

    width: 28,
    height: 28,
    borderRadius: 14,

    backgroundColor: "rgba(255,255,255,0.9)",

    alignItems: "center",
    justifyContent: "center",

    // subtle shadow
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
  },
  clearTextButton: {
    position: "absolute",
    top: 0,
    right: 0,

    paddingHorizontal: 10,
    paddingVertical: 4,

    borderRadius: 8,
    backgroundColor: "rgba(15, 76, 156, 0.08)",

    borderWidth: 1,
    borderColor: "rgba(15, 76, 156, 0.2)",
  },
  clearText: {
    fontSize: 10,
    fontWeight: "600",
    color: "#0F4C9C",
  },
  micButton: {
    position: "absolute",
    right: -10,
    bottom: -20,
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",

    // Shadow (Android + iOS)
    elevation: 4,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
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

  sectionLabel: {
    fontSize: 11,
    fontWeight: "800",
    color: "#94A3B8",
    textTransform: "uppercase",
    letterSpacing: 1.5,
    marginBottom: 6,
    marginTop: 6,
  },
  workspaceItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFF",
    // paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    gap: 8,
  },
  workspaceItemActive: { backgroundColor: "#0F4C9C", borderColor: "#0f4c9c" },
  workspaceTile: {
    width: "48%",
    // marginBottom: 12,
  },
  workspaceText: { fontSize: 14, fontWeight: "700", color: "#64748B" },
  workspaceGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: 8,
    // marginBottom: 10,
  },
  workspaceTextActive: { color: "#FFF" },
  addWorkspaceBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#EEF2FF",
    paddingHorizontal: 16,
    // paddingVertical: 10,
    borderRadius: 16,
    borderStyle: "dashed",
    borderWidth: 1,
    borderColor: "#0F4C9C",
    gap: 4,
  },
  addWorkspaceText: { fontSize: 14, fontWeight: "800", color: "#0F4C9C" },
  tabContainer: { paddingVertical: 6, paddingHorizontal: 4, gap: 10 },
  tabItem: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 999,
    backgroundColor: "#F3F4F6",
  },
  tabItemActive: { backgroundColor: "#1F2937", elevation: 3 },
  tabText: { fontSize: 14, color: "#374151", fontWeight: "500" },
  tabTextActive: { color: "#FFFFFF", fontWeight: "600" },
  glassCard: {
    backgroundColor: "#FFFFFF",
    marginTop: 10,
    borderRadius: 20,
    padding: 16,
    // minHeight: 180,
    // Depth (very important)
    elevation: 8,
    shadowColor: "#0F4C9C",
    shadowOpacity: 0.12,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },

    // Subtle border highlight
    borderWidth: 1,
    borderColor: "rgba(15, 76, 156, 0.15)",
  },
  // fieldGroup: { marginVertical: 1 },
  fieldHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    // marginBottom: 12,
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
    borderRadius: 16,
    backgroundColor: "#FFFFFF",
    position: "relative",
    paddingRight: 20,
    paddingBottom: 10,
  },
  mainTextInput: {
    fontSize: 16,
    color: "#334155",
    height: 160,
    textAlignVertical: "top",
    paddingHorizontal: 16,
    // paddingTop: 16,
    // paddingBottom: 24,
    paddingRight: 16,
  },
  inputActions: {
    position: "absolute",
    right: 16,
    bottom: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  inputActionButton: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: "#F8FAFC",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  recordButton: {
    backgroundColor: "#0F4C9C",
    borderColor: "#0F4C9C",
  },
  recordingActive: {
    backgroundColor: "#DC2626",
    borderColor: "#DC2626",
  },
  recordingText: {
    marginTop: 12,
    color: "#0F4C9C",
    fontSize: 13,
    fontWeight: "700",
  },
  imagePreviewContainer: {
    position: "absolute",
    left: 16,
    bottom: 80,
    width: 100,
    height: 100,
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    backgroundColor: "#F8FAFC",
  },
  imagePreview: {
    width: "100%",
    height: "100%",
  },
  removeImageButton: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.9)",
  },
  scenarioScrollButton: {
    position: "absolute",
    right: 8,
    bottom: 8,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#EFF6FF",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#BFDBFE",
  },
  listeningText: {
    // marginTop: 10,
    fontSize: 13,
    fontWeight: "700",
    color: "#0F4C9C",
  },
  generateBtn: { marginTop: 10, borderRadius: 20, overflow: "hidden" },
  gradientBtn: {
    height: 64,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  btnText: { color: "#FFFFFF", fontSize: 17, fontWeight: "800" },
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
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  modalTitle: { fontSize: 20, fontWeight: "800", color: "#0F172A" },
  modalLabel: {
    fontSize: 11,
    fontWeight: "800",
    color: "#94A3B8",
    textTransform: "uppercase",
    marginBottom: 6,
  },
  modalInput: {
    backgroundColor: "#F8FAFC",
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    fontSize: 15,
    color: "#0F172A",
  },
  modalScrollContent: {
    gap: 12,
    paddingBottom: 40,
  },
  rowTwoColumn: {
    flexDirection: "row",
    gap: 10,
  },
  rowColumn: {
    flex: 1,
  },
  modalActionBtn: {
    backgroundColor: "#0F4C9C",
    borderRadius: 18,
    paddingVertical: 18,
    alignItems: "center",
    marginTop: 10,
  },
  modalActionText: { color: "#FFF", fontSize: 16, fontWeight: "800" },
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
    // marginBottom: 20,
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
  micBtn: { position: "absolute", right: 0, bottom: 0, padding: 10 },
  micBtnActive: { transform: [{ scale: 1.1 }] },
  micBtnDisabled: { opacity: 0.5 },
});
