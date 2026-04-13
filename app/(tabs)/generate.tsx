import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import * as ImageManipulator from "expo-image-manipulator";
import * as ImagePicker from "expo-image-picker";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from "react-native";
import { styles } from "../../components/style/GenerateScreen.styles";

import { SafeAreaView } from "react-native-safe-area-context";
import Toast from "react-native-toast-message";

import { VoiceOverlay } from "@/components/VoiceOverlay";
import { useVoiceInput } from "@/hooks/useVoiceInput";
import {
  ClaimFile,
  createFile,
  generateResponse,
  GenerateResponseRequest,
  getMyFiles,
  getRecentDrafts,
  getSubscriptionStatus,
  RecentDraft,
  SubscriptionStatus,
} from "@/lib/api";
import { useAuth } from "@/providers/auth-provider";
import { toast } from "sonner-native";

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

  const [request, setRequest] = useState("");
  const [claimDetails, setClaimDetails] = useState("");
  const [status, setStatus] = useState<SubscriptionStatus | null>(null);
  const [recentDrafts, setRecentDrafts] = useState<RecentDraft[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [showScenarioScrollButton, setShowScenarioScrollButton] =
    useState(false);
  const scenarioTextInputRef = useRef<TextInput>(null);

  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const recordingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [isPickingImage, setIsPickingImage] = useState(false);

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

const handlePickImage = async () => {
  try {
    setIsPickingImage(true);
    
    // Check current permission status first
    const { status } = await ImagePicker.getMediaLibraryPermissionsAsync();
    let finalStatus = status;

    if (finalStatus !== 'granted') {
      const { status: newStatus } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      finalStatus = newStatus;
    }

    if (finalStatus !== 'granted') {
      Alert.alert("Permission required", "Please enable media library access in settings.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: false, 
      quality: 1,
      // On some Android builds, selection fails if the aspect ratio is set 
      // but allowsEditing is false. Added a check here.
    });

    if (!result.canceled && result.assets?.[0]) {
      const uri = result.assets[0].uri;
      setSelectedImage(uri);

      // IMPORTANT: In APKs, sometimes the URI needs to be cleaned 
      // or verified before ImageManipulator touches it.
      const manipulatedImage = await ImageManipulator.manipulateAsync(
        uri,
        [{ resize: { width: 1024 } }],
        {
          compress: 0.7,
          format: ImageManipulator.SaveFormat.JPEG,
          base64: true,
        }
      );

      setImageBase64(manipulatedImage.base64 ?? null);
    }
  } catch (error) {
    console.error("Image picker error:", error);
    // On 8GB RAM devices, the app might restart if memory is low during picking.
    // Ensure you handle the error visually for the user.
    Alert.alert("Error", "Could not process image. Please try again.");
  } finally {
    setIsPickingImage(false);
  }
};

  // const handleTakePhoto = async () => {
  //   try {
  //     setIsTakingPhoto(true);
  //     const permission = await ImagePicker.requestCameraPermissionsAsync();
  //     if (!permission.granted) {
  //       Alert.alert(
  //         "Permission required",
  //         "Camera access is required to take a photo.",
  //       );
  //       return;
  //     }

  //     const result: any = await ImagePicker.launchCameraAsync({
  //       mediaTypes: ImagePicker.MediaTypeOptions.Images,
  //       allowsEditing: false,
  //       quality: 1,
  //     });

  //     const imageAsset = result.assets?.[0];
  //     if (imageAsset?.uri) {
  //       setSelectedImage(imageAsset.uri);
  //       const fileName = imageAsset.uri.split("/").pop() ?? "photo";
  //       setRequest((prev) =>
  //         prev
  //           ? `${prev}\n[Attached photo: ${fileName}]`
  //           : `[Attached photo: ${fileName}]`,
  //       );
  //     }
  //   } catch (error) {
  //     console.error("Camera error:", error);
  //     Alert.alert("Attachment failed", "Unable to take a photo.");
  //   } finally {
  //     setIsTakingPhoto(false);
  //   }
  // };

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

  const voice = useVoiceInput();

  const handleVoiceToggle = async () => {
    if (voice.isRecording) {
      const transcript = await voice.stop();
      if (transcript) {
        setRequest((prev) => (prev ? `${prev} ${transcript}` : transcript));
      }
    } else {
      try {
        await voice.start();
      } catch {
        toast.warning("Microphone permission required.");
      }
    }
  };

  const onGenerate = useCallback(async () => {
    if (!token) return router.replace("/login");
    if (!selectedWorkspace) return toast.warning("Select a Workspace first.");
    if (!request || request.trim().length < 5)
      return toast.warning("Describe the scenario.");

    console.log("Current image base64 in onGenerate:", imageBase64?.length);
    setIsGenerating(true);
    try {
      const payload: GenerateResponseRequest = {
        fileId: selectedWorkspace.id,
        image: imageBase64,
        userInput: `${request.trim()}${claimDetails ? `\n\nContext: ${claimDetails.trim()}` : ""}`,
      };
      const result = await generateResponse(token, payload);
      router.push({
        pathname: "/response",
        params: {
          output_format: result.output_format,
          type: result.responseTypeLabel,
          userInput: payload.userInput,
          text: result.responseText,
          fileId: result.fileId.toString(),
          alreadySaved: "false",
          created_at: result.createdAt,
        },
      });
      setRequest("");
      setClaimDetails("");
      fetchData();
    } catch (error: any) {
      toast.error(error?.message || "Generation failed");
    } finally {
      setImageBase64(null);
      setSelectedImage(null);
      setIsGenerating(false);
    }
  }, [token, request, claimDetails, selectedWorkspace, imageBase64]);

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
        <View style={{ padding: 20 }}>
          <Text style={styles.sectionLabel}>Active Workspace</Text>
          <ScrollView
            style={styles.workspaceScroll}
            horizontal
            showsHorizontalScrollIndicator={false}
          >
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
                    selectedWorkspace?.id === ws.id &&
                      styles.workspaceItemActive,
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
          </ScrollView>

          <View style={styles.glassCard}>
            <View>
              <View style={styles.fieldHeader}>
                <View style={styles.iconCircle}>
                  <MaterialCommunityIcons
                    name="text-box-search-outline"
                    size={16}
                    color="#020617"
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
                />
                <View style={styles.inputActions}>
                  <TouchableOpacity onPress={handlePickImage}>
                    <Ionicons name="attach" size={20} color="#475569" />
                  </TouchableOpacity>

                  <TouchableOpacity onPress={handleVoiceToggle}>
                    <Ionicons
                      name={
                        voice.isRecording
                          ? "stop-circle"
                          : voice.isTranscribing
                            ? "hourglass"
                            : "mic"
                      }
                      size={20}
                      color={
                        voice.isRecording
                          ? "#DC2626"
                          : voice.isTranscribing
                            ? "#94A3B8"
                            : "#0F4C9C"
                      }
                    />
                  </TouchableOpacity>
                </View>

                {/* Single VoiceOverlay — outside inputActions */}
                <VoiceOverlay
                  visible={voice.isRecording}
                  meteringLevel={voice.meteringLevel}
                  onCancel={handleVoiceToggle}
                />

                {selectedImage ? (
                  <View style={styles.imagePreviewContainer}>
                    <Image
                      source={{ uri: selectedImage }}
                      style={styles.imagePreview}
                    />
                    <TouchableOpacity
                      style={styles.removeImageButton}
                      onPress={() => setSelectedImage(null)}
                    >
                      <MaterialCommunityIcons
                        name="close"
                        size={16}
                        color="#0F172A"
                      />
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
              colors={["#004db1", "#0c1736"]}
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
