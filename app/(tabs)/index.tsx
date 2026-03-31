import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router, useFocusEffect } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  BackHandler,
  Image,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  ToastAndroid,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Toast from "react-native-toast-message";

import { CustomConfirmModal } from "@/components/CustomConfirmModal";
import FileWorkspaceItem from "@/components/FileWorkspaceItem";
import {
  ClaimFile,
  deleteFile,
  getMyFiles,
  getSubscriptionStatus,
  SubscriptionStatus,
  updateFile,
} from "@/lib/api";
import { useAuth } from "@/providers/auth-provider";
import * as Haptics from "expo-haptics";
import { RefreshControl, ScrollView } from "react-native-gesture-handler";
import { toast } from "sonner-native";

export default function HomeScreen() {
  const { token } = useAuth();
  const [files, setFiles] = useState<ClaimFile[]>([]);
  const [status, setStatus] = useState<SubscriptionStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Delete modal
  const [isModalVisible, setModalVisible] = useState(false);
  const [selectedFileId, setSelectedFileId] = useState<number | null>(null);

  const logo = require("../../assets/images/AdjusterAssist1.png");

  const activeFilesCount = useMemo(
    () =>
      files.filter((file) => file.status?.toLowerCase() === "active").length,
    [files],
  );

  const loadData = React.useCallback(
    async (showLoading = true) => {
      if (!token) return;

      if (showLoading) setIsLoading(true);
      if (!showLoading) setRefreshing(true);

      try {
        const [filesResponse, statusResponse] = await Promise.all([
          getMyFiles(token),
          getSubscriptionStatus(token),
        ]);

        setFiles(filesResponse ? filesResponse : []);
        setStatus(statusResponse);
      } catch (err) {
        console.error("Error loading data:", err);
        Toast.show({
          type: "error",
          text1: "Sync Failed",
          text2: "Could not load your workspace data.",
        });
      } finally {
        setIsLoading(false);
        setRefreshing(false);
      }
    },
    [token],
  );

  useEffect(() => {
    loadData(true);
  }, [loadData]);

  useFocusEffect(
    React.useCallback(() => {
      loadData(false);
    }, [loadData]),
  );

  const backPressCount = useRef(0);

  useFocusEffect(
    React.useCallback(() => {
      const onBackPress = () => {
        if (backPressCount.current === 0) {
          backPressCount.current += 1;

          ToastAndroid.show("Press again to exit", ToastAndroid.SHORT);

          setTimeout(() => {
            backPressCount.current = 0;
          }, 2000);

          return true; // prevent default behavior
        }

        BackHandler.exitApp();
        return true;
      };

      const subscription = BackHandler.addEventListener(
        "hardwareBackPress",
        onBackPress,
      );

      return () => subscription.remove();
    }, []),
  );

  useFocusEffect(
    React.useCallback(() => {
      loadData(false);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [token]),
  );
  const getStatusStyle = (value?: string) => {
    const statusValue = value?.toLowerCase();

    switch (statusValue) {
      case "active":
        return {
          badge: styles.statusBadgeActive,
          text: styles.statusTextActive,
          icon: "checkmark-circle",
        };
      case "draft":
        return {
          badge: styles.statusBadgeDraft,
          text: styles.statusTextDraft,
          icon: "document-text",
        };
      case "closed":
        return {
          badge: styles.statusBadgeClosed,
          text: styles.statusTextClosed,
          icon: "lock-closed",
        };
      default:
        return {
          badge: styles.statusBadgeNeutral,
          text: styles.statusTextNeutral,
          icon: "ellipse",
        };
    }
  };

  // const handleDeleteFile = (id: number) => {
  //   Alert.alert(
  //     "Delete File",
  //     "Are you sure?",
  //     [
  //       { text: "Cancel", style: "cancel" },
  //       {
  //         text: "Delete",
  //         style: "destructive",
  //         onPress: async () => {
  //           // 2. Ensure your filter logic matches the type
  //           setFiles(prev => prev.filter(f => f.id !== id));
  //           toast.success("File deleted");
  //         }
  //       },
  //     ]
  //   );
  // };

  const handleDeleteFile = (id: number) => {
    setSelectedFileId(id);
    setModalVisible(true);
  };
  const confirmDelete = async () => {
    // 1. Validation check
    if (selectedFileId === null || !token) {
      toast.error("Unable to identify workspace or session");
      return;
    }

    try {
      // 2. Perform the actual API deletion
      // Assuming your api.ts export is: export const deleteFile = (token, id) => ...
      await deleteFile(token, selectedFileId);

      // 3. Update local UI state only after successful API response
      setFiles((prev) => prev.filter((f) => f.id !== selectedFileId));

      // 4. Success feedback with Haptics for premium feel
      if (Platform.OS !== "web")
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      toast.success("Workspace deleted successfully");
    } catch (err) {
      // 5. Handle errors (Network issues, 401 Unauthorized, etc.)
      console.error("API Delete Error:", err);
      if (Platform.OS !== "web")
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      toast.error("Failed to delete workspace. Please try again.");
    } finally {
      // 6. Clean up: Close modal and reset the ID tracker
      setModalVisible(false);
      setSelectedFileId(null);
    }
  };

  const handleUpdateFile = async (id: number, updateData: any) => {
    if (!token) {
      toast.error("Session expired. Please login again.");
      router.push("/login")
      return;
    }
    try {
      // Now TypeScript knows 'token' is a string here
      await updateFile(token, id, updateData);
      toast.success("Workspace updated");
      loadData(false);
    } catch (err) {
      toast.error("Update failed");
    }
  };

  const renderFileItem = ({ item }: { item: ClaimFile }) => (
    <FileWorkspaceItem
      item={item}
      onPress={() =>
        router.push({
          pathname: "/file-draft-history",
          params: { fileId: item.id },
        })
      }
      onUpdate={handleUpdateFile}
      onDelete={handleDeleteFile}
      getStatusStyle={getStatusStyle}
    />
  );

  return (
    <View style={styles.mainContainer}>
      <StatusBar style="light" />

      <LinearGradient
        colors={["#0F4C9C", "#123C78", "#0B2F5B"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.headerGradient}
      >
        <SafeAreaView edges={["top"]} style={styles.headerContent}>
          <View style={styles.headerRow}>
            <View style={styles.brandBlock}>
              <Image source={logo} style={styles.logo} />
              <Text style={styles.brandSubtitle}>Premium claims workspace</Text>
            </View>

            <View style={styles.creditPill}>
              <Ionicons name="sparkles" size={13} color="#FDE68A" />
              <Text style={styles.creditText}>
                {status?.subscription?.remaining ?? 0} Credits
              </Text>
            </View>
          </View>

          <View style={styles.heroCard}>
            <View style={styles.heroTextWrap}>
              <Text style={styles.heroTitle}>Welcome back</Text>
              <Text style={styles.heroSubtitle}>
                Track active files, manage client claims, and continue your work
                with confidence.
              </Text>
            </View>

            <View style={styles.heroBadge}>
              <Ionicons name="flash" size={16} color="#0F4C9C" />
              <Text style={styles.heroBadgeText}>
                {status?.subscription?.plan_type || "Free"}
              </Text>
            </View>
          </View>

          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>{files.length}</Text>
              <Text style={styles.statLabel}>Total Files</Text>
            </View>

            <View style={styles.statCard}>
              <Text style={styles.statNumber}>{activeFilesCount}</Text>
              <Text style={styles.statLabel}>Active</Text>
            </View>

            <View style={styles.statCard}>
              <Text style={styles.statNumber}>
                {status?.subscription?.remaining ?? 0}
              </Text>
              <Text style={styles.statLabel}>Credits Left</Text>
            </View>
          </View>
        </SafeAreaView>
      </LinearGradient>
      <ScrollView
        contentContainerStyle={{ flexGrow: 1, justifyContent: "center" }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => loadData(false)}
            tintColor="#276bbd"
          />
        }
      >
        <View style={styles.centerCard}>
          {/* Icon */}
          <View style={styles.iconWrap}>
            <LinearGradient
              colors={["#EFF6FF", "#DBEAFE"]}
              style={styles.iconGradient}
            >
              <Ionicons
                name="document-text-outline"
                size={28}
                color="#1D4ED8"
              />
            </LinearGradient>
          </View>

          {/* Title */}
          <Text style={styles.centerTitle}>Start a New Claim</Text>

          {/* Subtitle */}
          <Text style={styles.centerSubtitle}>
            Create and manage claims with speed and accuracy.
          </Text>

          {/* CTA */}
          <Pressable
            style={({ pressed }) => [
              styles.primaryButton,
              pressed && styles.fabPressed,
            ]}
            onPress={() => router.push("/generate")}
          >
            <LinearGradient
              colors={["#276bbd", "#1D4ED8"]}
              style={styles.primaryGradient}
            >
              <Ionicons name="add" size={20} color="#FFF" />
              <Text style={styles.primaryText}>New Claim</Text>
            </LinearGradient>
          </Pressable>
        </View>
      </ScrollView>
      <CustomConfirmModal
        isVisible={isModalVisible}
        title="Delete Workspace"
        message="Are you sure you want to delete this workspace? This action cannot be undone."
        onConfirm={confirmDelete} // Calls the logic we wrote in step 1
        onCancel={() => {
          setModalVisible(false);
          setSelectedFileId(null);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  mainContainer: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  iconWrap: {
    marginBottom: 14,
  },

  iconGradient: {
    width: 64,
    height: 64,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryButton: {
    marginTop: 20,
    width: "100%",
    borderRadius: 999,
    overflow: "hidden",

    // shadow (iOS)
    shadowColor: "#1D4ED8",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 12,

    // shadow (Android)
    elevation: 6,
  },

  primaryGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 16,
    borderRadius: 999,
  },

  primaryText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "800",
    letterSpacing: 0.3,
  },

  fabPressed: {
    transform: [{ scale: 0.96 }],
    opacity: 0.95,
  },
  centerTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#0F172A",
    textAlign: "center",
  },

  centerSubtitle: {
    marginTop: 8,
    fontSize: 13,
    color: "#64748B",
    textAlign: "center",
    lineHeight: 20,
  },
  centerCard: {
    width: "100%",
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    paddingVertical: 28,
    paddingHorizontal: 20,
    alignItems: "center",

    shadowColor: "#0F172A",
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 4,
  },
  bottomFill: {
    flex: 1,
    backgroundColor: "#F8FAFC",
    marginTop: -20, // keeps overlap effect with header
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
  },
  headerGradient: {
    paddingBottom: 28,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },

  headerContent: {
    paddingHorizontal: 20,
  },

  headerRow: {
    marginTop: 8,
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
  },

  brandBlock: {
    flex: 1,
    paddingRight: 16,
  },

  logo: {
    width: 160,
    height: 50,
    resizeMode: "contain",
  },

  brandSubtitle: {
    marginTop: 8,
    fontSize: 13,
    color: "rgba(255,255,255,0.72)",
    letterSpacing: 0.3,
  },

  creditPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(255,255,255,0.14)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.16)",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
  },

  creditText: {
    color: "#F8E7A1",
    fontSize: 12,
    fontWeight: "800",
  },

  heroCard: {
    marginTop: 22,
    backgroundColor: "rgba(255,255,255,0.12)",
    borderRadius: 24,
    padding: 18,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
  },

  heroTextWrap: {
    paddingRight: 10,
  },

  heroTitle: {
    color: "#FFFFFF",
    fontSize: 24,
    fontWeight: "800",
    letterSpacing: 0.2,
  },

  heroSubtitle: {
    marginTop: 8,
    color: "rgba(255,255,255,0.78)",
    fontSize: 13,
    lineHeight: 20,
  },

  heroBadge: {
    marginTop: 14,
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
  },

  heroBadgeText: {
    color: "#0F4C9C",
    fontSize: 12,
    fontWeight: "800",
    textTransform: "capitalize",
  },

  statsRow: {
    flexDirection: "row",
    marginTop: 18,
    gap: 12,
  },

  statCard: {
    flex: 1,
    backgroundColor: "rgba(255,255,255,0.12)",
    borderRadius: 20,
    paddingVertical: 16,
    paddingHorizontal: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
  },

  statNumber: {
    color: "#FFFFFF",
    fontSize: 20,
    fontWeight: "800",
  },

  statLabel: {
    marginTop: 4,
    color: "rgba(255,255,255,0.68)",
    fontSize: 11,
    fontWeight: "600",
  },

  contentContainer: {
    flex: 1,
    marginTop: 18,
  },

  sectionHeader: {
    paddingHorizontal: 20,
    marginBottom: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  sectionEyebrow: {
    fontSize: 11,
    fontWeight: "800",
    color: "#494f57",
    letterSpacing: 1.1,
  },

  sectionTitle: {
    marginTop: 2,
    fontSize: 22,
    fontWeight: "800",
    color: "#0F172A",
  },

  sectionAction: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#EFF6FF",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },

  sectionActionText: {
    color: "#276bbd",
    fontSize: 12,
    fontWeight: "700",
  },

  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 110,
  },

  fileCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#EEF2F7",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.05,
    shadowRadius: 18,
    elevation: 3,
  },

  fileCardPressed: {
    transform: [{ scale: 0.985 }],
    opacity: 0.96,
  },

  fileIconWrap: {
    marginRight: 14,
  },

  fileIconGradient: {
    width: 54,
    height: 54,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },

  fileInfo: {
    flex: 1,
  },

  fileTopRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 10,
  },

  fileName: {
    flex: 1,
    fontSize: 15,
    fontWeight: "800",
    color: "#0F172A",
  },

  clientName: {
    marginTop: 4,
    fontSize: 13,
    color: "#64748B",
    fontWeight: "500",
  },

  fileMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 12,
    marginTop: 10,
  },

  metaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },

  fileSubText: {
    fontSize: 11,
    color: "#94A3B8",
    fontWeight: "500",
  },

  statusBadgeBase: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 999,
  },

  statusTextBase: {
    fontSize: 10,
    fontWeight: "800",
  },

  statusBadgeActive: {
    backgroundColor: "#DCFCE7",
  },

  statusTextActive: {
    color: "#166534",
  },

  statusBadgeDraft: {
    backgroundColor: "#FEF3C7",
  },

  statusTextDraft: {
    color: "#92400E",
  },

  statusBadgeClosed: {
    backgroundColor: "#E2E8F0",
  },

  statusTextClosed: {
    color: "#475569",
  },

  statusBadgeNeutral: {
    backgroundColor: "#EEF2F7",
  },

  statusTextNeutral: {
    color: "#64748B",
  },

  chevronWrap: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#F8FAFC",
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 12,
  },

  loaderContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },

  loaderCard: {
    width: "100%",
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    paddingVertical: 28,
    paddingHorizontal: 20,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#EEF2F7",
  },

  loaderTitle: {
    marginTop: 14,
    fontSize: 17,
    fontWeight: "800",
    color: "#0F172A",
  },

  loaderSubtitle: {
    marginTop: 6,
    fontSize: 13,
    color: "#64748B",
    textAlign: "center",
    lineHeight: 20,
  },

  emptyState: {
    alignItems: "center",
    marginTop: 55,
    paddingHorizontal: 24,
  },

  emptyIconWrap: {
    width: 110,
    height: 110,
    borderRadius: 30,
    alignItems: "center",
    justifyContent: "center",
  },

  emptyTitle: {
    marginTop: 18,
    color: "#0F172A",
    fontSize: 20,
    fontWeight: "800",
  },

  emptySubtitle: {
    marginTop: 8,
    color: "#64748B",
    fontSize: 14,
    lineHeight: 22,
    textAlign: "center",
  },

  fab: {
    position: "absolute",
    bottom: 28,
    alignSelf: "center",
    borderRadius: 999,
    shadowColor: "#1D4ED8",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.24,
    shadowRadius: 18,
    elevation: 8,
  },

  // fabPressed: {
  //   transform: [{ scale: 0.98 }],
  // },

  fabGradient: {
    height: 58,
    borderRadius: 999,
    paddingHorizontal: 22,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },

  fabText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "800",
    letterSpacing: 0.2,
  },
});
