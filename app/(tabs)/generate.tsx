import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Image,
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
  GenerateResponseRequest,
  generateResponse,
  getMyFiles,
  getSubscriptionStatus,
  SubscriptionStatus,
} from "@/lib/api";
import { useAuth } from "@/providers/auth-provider";
import { toast } from "sonner-native";

const { width: screenWidth, height: screenHeight } = Dimensions.get("window");
const isSmallScreen = screenWidth < 375;

const scale = (size: number) => Math.round((screenWidth / 375) * size);
const verticalScale = (size: number) => Math.round((screenHeight / 667) * size);
const moderateScale = (size: number, factor = 0.5) => size + (scale(size) - size) * factor;

const TASK_TYPE = "claim_note_drafting";

export default function GenerateScreen() {
  const { token } = useAuth();

  const [workspaces, setWorkspaces] = useState<ClaimFile[]>([]);
  const [selectedWorkspace, setSelectedWorkspace] = useState<ClaimFile | null>(null);

  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isCreatingFile, setIsCreatingFile] = useState(false);

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

  const [request, setRequest] = useState("");
  const [claimDetails, setClaimDetails] = useState("");
  const [status, setStatus] = useState<SubscriptionStatus | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const recordingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isPickingImage, setIsPickingImage] = useState(false);
  const [isTakingPhoto, setIsTakingPhoto] = useState(false);

  const fetchData = useCallback(async () => {
    if (!token) return;
    try {
      const [statusData, filesData] = await Promise.all([
        getSubscriptionStatus(token),
        getMyFiles(token),
      ]);
      setStatus(statusData);
      setWorkspaces(filesData ?? []);
      if (filesData?.length > 0 && !selectedWorkspace) {
        setSelectedWorkspace(filesData[0]);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, [token, selectedWorkspace]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    return () => {
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
      }
    };
  }, []);

  const handleVoiceToggle = () => {
    if (isRecording) {
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
        recordingTimerRef.current = null;
      }
      setIsRecording(false);
      if (recordingDuration > 0) {
        setRequest((prev) =>
          prev
            ? `${prev}\n[Voice note captured: ${recordingDuration}s. Add transcript details here.]`
            : `[Voice note captured: ${recordingDuration}s. Add transcript details here.]`,
        );
      }
      setRecordingDuration(0);
      return;
    }

    setIsRecording(true);
    setRecordingDuration(0);
    recordingTimerRef.current = setInterval(() => {
      setRecordingDuration((prev) => prev + 1);
    }, 1000);
  };

  const handlePickImage = async () => {
    try {
      setIsPickingImage(true);
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert("Permission required", "Media library access is required to attach a photo.");
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
          prev ? `${prev}\n[Attached image: ${fileName}]` : `[Attached image: ${fileName}]`,
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
        Alert.alert("Permission required", "Camera access is required to take a photo.");
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
          prev ? `${prev}\n[Attached photo: ${fileName}]` : `[Attached photo: ${fileName}]`,
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

    const { claim_number, client_name, address, jurisdiction, loss_type, date_of_loss } = fileForm;
    if (!claim_number || !client_name || !address || !jurisdiction || !loss_type || !date_of_loss) {
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
    if (!selectedWorkspace) return toast.warning("Select a workspace first.");
    if (!request || request.trim().length < 5) return toast.warning("Describe what happened.");

    setIsGenerating(true);
    try {
      const payload: GenerateResponseRequest = {
        fileId: selectedWorkspace.id,
        userInput: `${request.trim()}${claimDetails ? `\n\nContext: ${claimDetails.trim()}` : ""}`,
        task_type: TASK_TYPE,
      };
      const result = await generateResponse(token, payload);
      router.push({
        pathname: "/response",
        params: {
          output_format: result.output_format,
          type: result.responseTypeLabel,
          text: result.responseText,
          fileId: result.fileId.toString(),
          alreadySaved: "false",
          created_at: result.createdAt,
          workflow_user_input: payload.userInput,
        },
      });
      setRequest("");
      setClaimDetails("");
      setSelectedImage(null);
      fetchData();
    } catch (error: any) {
      toast.error(error?.message || "Generation failed");
    } finally {
      setIsGenerating(false);
    }
  }, [token, selectedWorkspace, request, claimDetails, fetchData]);

  if (isLoading) {
    return (
      <View style={styles.loaderScreen}>
        <LinearGradient colors={["#0F4C9C", "#123C78", "#0B2F5B"]} style={styles.loaderGradient}>
          <View style={styles.loaderContent}>
            <View style={styles.loaderIconWrap}>
              <Ionicons name="sparkles" size={scale(34)} color="#FFFFFF" />
            </View>
            <Text style={styles.loaderTitle}>Preparing Claim Workspace</Text>
            <ActivityIndicator size="small" color="#FFFFFF" style={{ marginTop: 18 }} />
          </View>
        </LinearGradient>
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
              <Ionicons name="chevron-back" size={scale(22)} color="#FFFFFF" />
            </Pressable>
            <Text style={styles.navTitle}>Claim Workspace</Text>
            <View style={styles.creditBadge}>
              <View style={styles.statusDot} />
              <Text style={styles.creditValue}>{status?.subscription?.remaining ?? 0} Credits</Text>
            </View>
          </View>
        </SafeAreaView>
      </LinearGradient>

      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.mainScrollContent} keyboardShouldPersistTaps="handled">
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Select Workspace</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.workspaceScrollContent}>
              <Pressable style={[styles.workspaceChip, styles.addWorkspaceChip]} onPress={() => setIsModalVisible(true)}>
                <Ionicons name="add" size={scale(16)} color="#0F4C9C" />
                <Text style={styles.addWorkspaceChipText}>New</Text>
              </Pressable>
              {workspaces.map((ws) => (
                <Pressable
                  key={ws.id}
                  onPress={() => setSelectedWorkspace(ws)}
                  style={[styles.workspaceChip, selectedWorkspace?.id === ws.id && styles.workspaceChipActive]}
                >
                  <MaterialCommunityIcons
                    name="folder"
                    size={scale(14)}
                    color={selectedWorkspace?.id === ws.id ? "#FFF" : "#64748B"}
                  />
                  <Text
                    style={[styles.workspaceChipText, selectedWorkspace?.id === ws.id && styles.workspaceChipTextActive]}
                    numberOfLines={1}
                  >
                    {ws.client_name || ws.claim_number}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>

          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Chat</Text>
            <View style={styles.assistantHintRow}>
              <MaterialCommunityIcons name="robot-outline" size={scale(16)} color="#0F4C9C" />
              <Text style={styles.assistantHintText}>Tell me what happened and include only key claim facts.</Text>
            </View>

            {selectedImage && (
              <View style={styles.imagePreviewStrip}>
                <Image source={{ uri: selectedImage }} style={styles.imagePreviewSmall} />
                <Text style={styles.attachmentText}>Image attached</Text>
                <Pressable style={styles.removeImageSmall} onPress={() => setSelectedImage(null)}>
                  <Ionicons name="close-circle" size={scale(20)} color="#EF4444" />
                </Pressable>
              </View>
            )}

            <TextInput
              value={request}
              onChangeText={setRequest}
              placeholder="What happened?"
              placeholderTextColor="#94A3B8"
              style={styles.chatInput}
              multiline
              maxLength={1000}
              scrollEnabled
              textAlignVertical="top"
            />

            {/* <TextInput
              value={claimDetails}
              onChangeText={setClaimDetails}
              placeholder="Optional context (policy notes, timeline, people involved...)"
              placeholderTextColor="#94A3B8"
              style={styles.contextInput}
              multiline
              maxLength={500}
              textAlignVertical="top"
            /> */}

            <View style={styles.quickActionRow}>
              <Pressable style={styles.quickActionButton} onPress={handlePickImage} disabled={isPickingImage}>
                {isPickingImage ? (
                  <ActivityIndicator size="small" color="#0F4C9C" />
                ) : (
                  <>
                    <Ionicons name="images-outline" size={scale(16)} color="#0F4C9C" />
                    <Text style={styles.quickActionText}>Upload</Text>
                  </>
                )}
              </Pressable>

              <Pressable style={styles.quickActionButton} onPress={handleTakePhoto} disabled={isTakingPhoto}>
                {isTakingPhoto ? (
                  <ActivityIndicator size="small" color="#0F4C9C" />
                ) : (
                  <>
                    <Ionicons name="camera-outline" size={scale(16)} color="#0F4C9C" />
                    <Text style={styles.quickActionText}>Photo</Text>
                  </>
                )}
              </Pressable>

              <Pressable
                style={[styles.quickActionButton, isRecording && styles.quickActionButtonRecording]}
                onPress={handleVoiceToggle}
              >
                <Ionicons
                  name={isRecording ? "stop-circle-outline" : "mic-outline"}
                  size={scale(16)}
                  color={isRecording ? "#B91C1C" : "#0F4C9C"}
                />
                <Text style={[styles.quickActionText, isRecording && styles.quickActionTextRecording]}>
                  {isRecording ? `${recordingDuration}s` : "Voice"}
                </Text>
              </Pressable>
            </View>

            <Text style={styles.charCount}>{request.length}/1000</Text>
          </View>
        </ScrollView>

        <View style={styles.generateFooter}>
          <Pressable
            style={[styles.generateButton, (!request.trim() || isGenerating) && styles.generateButtonDisabled]}
            onPress={onGenerate}
            disabled={!request.trim() || isGenerating}
          >
            {isGenerating ? (
              <ActivityIndicator size="small" color="#FFF" />
            ) : (
              <>
                <MaterialCommunityIcons name="file-document-edit-outline" size={scale(18)} color="#FFF" />
                <Text style={styles.generateButtonText}>Generate Draft</Text>
              </>
            )}
          </Pressable>
        </View>
      </KeyboardAvoidingView>

      <Modal visible={isModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { height: screenHeight * 0.85 }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Initialize Claim File</Text>
              <Pressable onPress={() => setIsModalVisible(false)}>
                <Ionicons name="close" size={scale(24)} color="#94A3B8" />
              </Pressable>
            </View>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.modalScrollContent}>
              <View>
                <Text style={styles.modalLabel}>Claim Number *</Text>
                <TextInput
                  style={styles.modalInput}
                  value={fileForm.claim_number}
                  onChangeText={(t) => setFileForm({ ...fileForm, claim_number: t })}
                  placeholder="e.g. CLM-2026-001"
                />
              </View>
              <View>
                <Text style={styles.modalLabel}>Client Name *</Text>
                <TextInput
                  style={styles.modalInput}
                  value={fileForm.client_name}
                  onChangeText={(t) => setFileForm({ ...fileForm, client_name: t })}
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
                    onChangeText={(t) => setFileForm({ ...fileForm, policy_form: t })}
                    placeholder="HO-3"
                  />
                </View>
                <View style={styles.rowColumn}>
                  <Text style={styles.modalLabel}>Jurisdiction *</Text>
                  <TextInput
                    style={styles.modalInput}
                    value={fileForm.jurisdiction}
                    onChangeText={(t) => setFileForm({ ...fileForm, jurisdiction: t })}
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
                    onChangeText={(t) => setFileForm({ ...fileForm, date_of_loss: t })}
                    placeholder="YYYY-MM-DD"
                  />
                </View>
                <View style={styles.rowColumn}>
                  <Text style={styles.modalLabel}>Reported Date</Text>
                  <TextInput
                    style={styles.modalInput}
                    value={fileForm.reported_date}
                    onChangeText={(t) => setFileForm({ ...fileForm, reported_date: t })}
                  />
                </View>
              </View>
              <View>
                <Text style={styles.modalLabel}>Loss Type *</Text>
                <TextInput
                  style={styles.modalInput}
                  value={fileForm.loss_type}
                  onChangeText={(t) => setFileForm({ ...fileForm, loss_type: t })}
                />
              </View>
              <View>
                <Text style={styles.modalLabel}>Line of Business</Text>
                <TextInput
                  style={styles.modalInput}
                  value={fileForm.line_of_business}
                  onChangeText={(t) => setFileForm({ ...fileForm, line_of_business: t })}
                />
              </View>
              <View>
                <Text style={styles.modalLabel}>Claim Stage</Text>
                <TextInput
                  style={styles.modalInput}
                  value={fileForm.claim_stage}
                  onChangeText={(t) => setFileForm({ ...fileForm, claim_stage: t })}
                />
              </View>

              <Pressable style={styles.modalActionBtn} onPress={handleCreateWorkspace} disabled={isCreatingFile}>
                {isCreatingFile ? <ActivityIndicator color="#FFF" /> : <Text style={styles.modalActionText}>Initialize Workspace</Text>}
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
    borderBottomLeftRadius: moderateScale(28),
    borderBottomRightRadius: moderateScale(28),
    overflow: "hidden",
  },
  safeHeader: {
    paddingHorizontal: scale(18),
    paddingBottom: verticalScale(10),
  },
  navBar: {
    minHeight: verticalScale(58),
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  iconBtn: {
    width: scale(42),
    height: scale(42),
    borderRadius: moderateScale(14),
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.12)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.18)",
  },
  navTitle: {
    fontSize: moderateScale(18),
    fontWeight: "800",
    color: "#FFFFFF",
  },
  creditBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: scale(8),
    backgroundColor: "rgba(255,255,255,0.14)",
    paddingHorizontal: scale(12),
    paddingVertical: verticalScale(8),
    borderRadius: moderateScale(14),
  },
  statusDot: {
    width: scale(7),
    height: scale(7),
    borderRadius: moderateScale(4),
    backgroundColor: "#22C55E",
  },
  creditValue: {
    color: "#FFFFFF",
    fontSize: moderateScale(13),
    fontWeight: "800",
  },
  loaderScreen: { flex: 1 },
  loaderGradient: { flex: 1, justifyContent: "center", alignItems: "center" },
  loaderContent: { alignItems: "center", paddingHorizontal: scale(30) },
  loaderIconWrap: {
    width: scale(72),
    height: scale(72),
    borderRadius: moderateScale(20),
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: verticalScale(20),
  },
  loaderTitle: {
    fontSize: moderateScale(18),
    fontWeight: "800",
    color: "#FFFFFF",
    textAlign: "center",
  },
  mainScrollContent: {
    paddingHorizontal: scale(isSmallScreen ? 14 : 18),
    paddingTop: verticalScale(16),
    paddingBottom: verticalScale(18),
    gap: verticalScale(12),
  },
  sectionCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: moderateScale(16),
    padding: scale(14),
    borderWidth: 1,
    borderColor: "#E2E8F0",
    shadowColor: "#0F172A",
    shadowOpacity: 0.04,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  sectionTitle: {
    fontSize: moderateScale(14),
    fontWeight: "800",
    color: "#1E293B",
    marginBottom: verticalScale(10),
  },
  workspaceScrollContent: {
    paddingRight: scale(6),
    gap: scale(8),
  },
  workspaceChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: moderateScale(20),
    paddingHorizontal: scale(12),
    paddingVertical: verticalScale(8),
    gap: scale(6),
    maxWidth: scale(190),
  },
  workspaceChipActive: { backgroundColor: "#0F4C9C", borderColor: "#0F4C9C" },
  addWorkspaceChip: { backgroundColor: "#EEF2FF", borderColor: "#BFDBFE" },
  addWorkspaceChipText: { fontSize: moderateScale(12), fontWeight: "600", color: "#0F4C9C" },
  workspaceChipText: { fontSize: moderateScale(12), fontWeight: "600", color: "#64748B" },
  workspaceChipTextActive: { color: "#FFFFFF" },
  assistantHintRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: scale(8),
    backgroundColor: "#EFF6FF",
    borderWidth: 1,
    borderColor: "#DBEAFE",
    borderRadius: moderateScale(12),
    paddingHorizontal: scale(10),
    paddingVertical: verticalScale(8),
    marginBottom: verticalScale(10),
  },
  assistantHintText: {
    flex: 1,
    fontSize: moderateScale(12),
    color: "#1E3A8A",
    fontWeight: "600",
  },
  chatInput: {
    height: verticalScale(160),
    maxHeight: verticalScale(160),
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: moderateScale(14),
    paddingHorizontal: scale(12),
    paddingVertical: verticalScale(10),
    fontSize: moderateScale(15),
    color: "#0F172A",
    backgroundColor: "#FFFFFF",
  },
  contextInput: {
    marginTop: verticalScale(10),
    minHeight: verticalScale(74),
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: moderateScale(12),
    paddingHorizontal: scale(12),
    paddingVertical: verticalScale(10),
    fontSize: moderateScale(13),
    color: "#334155",
    backgroundColor: "#F8FAFC",
  },
  quickActionRow: {
    marginTop: verticalScale(10),
    flexDirection: "row",
    gap: scale(8),
  },
  quickActionButton: {
    flex: 1,
    minHeight: verticalScale(40),
    borderRadius: moderateScale(10),
    borderWidth: 1,
    borderColor: "#DBEAFE",
    backgroundColor: "#EFF6FF",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: scale(6),
  },
  quickActionButtonRecording: {
    backgroundColor: "#FEF2F2",
    borderColor: "#FECACA",
  },
  quickActionText: {
    color: "#0F4C9C",
    fontSize: moderateScale(12),
    fontWeight: "700",
  },
  quickActionTextRecording: {
    color: "#B91C1C",
  },
  imagePreviewStrip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    borderRadius: moderateScale(12),
    paddingHorizontal: scale(8),
    paddingVertical: verticalScale(6),
    marginBottom: verticalScale(10),
    gap: scale(8),
  },
  imagePreviewSmall: {
    width: scale(30),
    height: scale(30),
    borderRadius: moderateScale(8),
  },
  removeImageSmall: {
    padding: scale(2),
    marginLeft: "auto",
  },
  attachmentText: {
    fontSize: moderateScale(12),
    color: "#475569",
    fontWeight: "600",
  },
  charCount: {
    marginTop: verticalScale(8),
    textAlign: "right",
    fontSize: moderateScale(11),
    color: "#94A3B8",
  },
  generateFooter: {
    paddingHorizontal: scale(isSmallScreen ? 14 : 18),
    paddingTop: verticalScale(10),
    paddingBottom: Platform.OS === "ios" ? verticalScale(22) : verticalScale(14),
    backgroundColor: "#F8FAFC",
    borderTopWidth: 1,
    borderTopColor: "#E2E8F0",
  },
  generateButton: {
    minHeight: verticalScale(48),
    borderRadius: moderateScale(14),
    backgroundColor: "#0F4C9C",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: scale(8),
  },
  generateButtonDisabled: { backgroundColor: "#94A3B8" },
  generateButtonText: {
    color: "#FFFFFF",
    fontSize: moderateScale(15),
    fontWeight: "800",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.6)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#FFF",
    borderTopLeftRadius: moderateScale(28),
    borderTopRightRadius: moderateScale(28),
    padding: scale(20),
    maxHeight: screenHeight * 0.9,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: verticalScale(16),
  },
  modalTitle: {
    fontSize: moderateScale(19),
    fontWeight: "800",
    color: "#0F172A",
  },
  modalLabel: {
    fontSize: moderateScale(11),
    fontWeight: "800",
    color: "#94A3B8",
    textTransform: "uppercase",
    marginBottom: verticalScale(6),
  },
  modalInput: {
    backgroundColor: "#F8FAFC",
    borderRadius: moderateScale(14),
    padding: scale(14),
    borderWidth: 1,
    borderColor: "#E2E8F0",
    fontSize: moderateScale(15),
    color: "#0F172A",
  },
  modalScrollContent: { gap: scale(12), paddingBottom: verticalScale(36) },
  rowTwoColumn: { flexDirection: "row", gap: scale(10) },
  rowColumn: { flex: 1 },
  modalActionBtn: {
    backgroundColor: "#0F4C9C",
    borderRadius: moderateScale(16),
    paddingVertical: verticalScale(16),
    alignItems: "center",
    marginTop: verticalScale(8),
  },
  modalActionText: {
    color: "#FFF",
    fontSize: moderateScale(16),
    fontWeight: "800",
  },
});
