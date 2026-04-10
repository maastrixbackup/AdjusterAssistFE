import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { router, useFocusEffect } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  BackHandler,
  Dimensions,
  Image,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  ToastAndroid,
  View,
} from "react-native";
import { RefreshControl, ScrollView } from "react-native-gesture-handler";
import { SafeAreaView } from "react-native-safe-area-context";
import { toast } from "sonner-native";

import { CustomConfirmModal } from "@/components/CustomConfirmModal";
import {
  ClaimFile,
  deleteFile,
  getMyFiles,
  getRecentDrafts,
  getSubscriptionStatus,
  RecentDraft,
  SubscriptionStatus,
} from "@/lib/api";
import { logoutUser } from "@/lib/services/authService";
import { useAuth } from "@/providers/auth-provider";

const { width } = Dimensions.get("window");

export default function HomeScreen() {
  const { token } = useAuth();
  const [files, setFiles] = useState<ClaimFile[]>([]);
  const [status, setStatus] = useState<SubscriptionStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isModalVisible, setModalVisible] = useState(false);
  const [selectedFileId, setSelectedFileId] = useState<number | null>(null);
  const [lastDraft, setLastDraft] = useState<RecentDraft | null>(null);

  const logo = require("../../assets/images/AdjusterAssist1.png");

  const activeFilesCount = useMemo(
    () =>
      files.filter((file) => file.status?.toLowerCase() === "active").length,
    [files],
  );

  const recentClaims = useMemo(() => {
    return files
      .filter((file) =>
        ["active", "draft"].includes(file.status?.toLowerCase() || ""),
      )
      .slice(0, 5);
  }, [files]);

  const loadData = React.useCallback(
    async (showLoading = true) => {
      if (!token) return;
      if (showLoading) setIsLoading(true);
      if (!showLoading) setRefreshing(true);

      try {
        const [filesResponse, statusResponse, recentDrafts] = await Promise.all(
          [
            getMyFiles(token),
            getSubscriptionStatus(token),
            getRecentDrafts(token),
          ],
        );

        setFiles(filesResponse || []);
        setStatus(statusResponse);

        const sortedDrafts = (recentDrafts || [])
          .slice()
          .sort(
            (a, b) =>
              new Date(b.created_at).getTime() -
              new Date(a.created_at).getTime(),
          );
        setLastDraft(sortedDrafts[0] || null);
      } catch (err: any) {
        if (
          err.message.includes("401") ||
          err.message.includes("Unauthorized")
        ) {
          logoutUser();
        }
        toast.error("Sync Failed: Could not load data.");
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
          return true;
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

  const getStatusStyle = (value?: string) => {
    const statusValue = value?.toLowerCase();
    switch (statusValue) {
      case "active":
        return {
          badge: styles.statusBadgeActive,
          text: styles.statusTextActive,
          icon: "ellipse",
        };
      case "draft":
        return {
          badge: styles.statusBadgeDraft,
          text: styles.statusTextDraft,
          icon: "time",
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
          icon: "help-circle",
        };
    }
  };

  const confirmDelete = async () => {
    if (selectedFileId === null || !token) return;
    try {
      await deleteFile(token, selectedFileId);
      setFiles((prev) => prev.filter((f) => f.id !== selectedFileId));
      if (Platform.OS !== "web")
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      toast.success("Workspace deleted");
    } catch (err) {
      toast.error("Failed to delete workspace.");
    } finally {
      setModalVisible(false);
      setSelectedFileId(null);
    }
  };

  return (
    <View style={styles.mainContainer}>
      <StatusBar style="light" />

      {/* Modern Refined Header */}
      <LinearGradient
        colors={["#165bb6", "#1E293B"]}
        style={styles.headerGradient}
      >
        <SafeAreaView edges={["top"]} style={styles.headerContent}>
          <View style={styles.headerTopRow}>
            <Image source={logo} style={styles.logo} />
            <Pressable
              onPress={() => router.push("/settings")}
              style={styles.profileButton}
            >
              <View style={styles.creditPill}>
                <Ionicons name="sparkles" size={14} color="#FDE68A" />
                <Text style={styles.creditText}>
                  {status?.subscription?.remaining ?? 0}
                </Text>
              </View>
            </Pressable>
          </View>

          <Text style={styles.welcomeText}>Claims Workspace</Text>
          <Text style={styles.welcomeSub}>
            Manage your property assessments efficiently.
          </Text>

          {/* Stats Section with Glassmorphism */}
          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>{files.length}</Text>
              <Text style={styles.statLabel}>Total</Text>
            </View>
            <View style={[styles.statCard, styles.statCardActive]}>
              <Text style={styles.statNumber}>{activeFilesCount}</Text>
              <Text style={styles.statLabel}>Active</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>
                {status?.subscription?.remaining ?? 0}
              </Text>
              <Text style={styles.statLabel}>Credits</Text>
            </View>
          </View>
        </SafeAreaView>
      </LinearGradient>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => loadData(false)}
            tintColor="#0F172A"
          />
        }
      >
        <View style={styles.bodyWrapper}>
          {/* Action Hub */}
          <View style={styles.quickActionsRow}>
            <Pressable
              style={({ pressed }) => [
                styles.actionCard,
                pressed && styles.pressed,
              ]}
              onPress={() => router.push("/generate")}
            >
              <LinearGradient
                colors={["#3B82F6", "#0a36b1"]}
                style={styles.actionIcon}
              >
                <Ionicons name="add" size={24} color="#FFF" />
              </LinearGradient>
              <Text style={styles.actionLabel}>New Claim</Text>
            </Pressable>

            <Pressable
              style={({ pressed }) => [
                styles.actionCard,
                pressed && styles.pressed,
              ]}
              onPress={() => router.push("/history")}
            >
              <LinearGradient
                colors={["#F59E0B", "#D97706"]}
                style={styles.actionIcon}
              >
                <Ionicons name="document-text" size={24} color="#FFF" />
              </LinearGradient>
              <Text style={styles.actionLabel}>History</Text>
            </Pressable>
          </View>

          {/* Continue Last Draft Card */}
          {lastDraft && (
            <Pressable
              style={({ pressed }) => [
                styles.lastDraftCard,
                pressed && styles.pressed,
              ]}
              onPress={() =>
                router.push({
                  pathname: "/response",
                  params: {
                    output_format: lastDraft.draft_type,
                    type: lastDraft.draft_type,
                    text: lastDraft.content,
                    fileId: String(lastDraft.file_id),
                    alreadySaved: "true",
                    draftId: String(lastDraft.id),
                    created_at: lastDraft.created_at,
                  },
                })
              }
            >
              <View style={styles.lastDraftContent}>
                <View style={styles.lastDraftInfo}>
                  <Text style={styles.lastDraftLabel}>CONTINUE WORKING</Text>
                  <Text style={styles.lastDraftTitle} numberOfLines={1}>
                    {lastDraft.claim_number || "Recent Assessment"}
                  </Text>
                </View>
                <Ionicons name="arrow-forward" size={20} color="#3B82F6" />
              </View>
            </Pressable>
          )}

          {/* Recent Activity Section */}
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent Activity</Text>
            <Pressable onPress={() => router.push("/workspaces")}>
              <Text style={styles.viewAllText}>See All</Text>
            </Pressable>
          </View>

          {recentClaims.map((file) => (
            <Pressable
              key={file.id}
              style={({ pressed }) => [
                styles.workspaceCard,
                pressed && styles.pressed,
              ]}
              onPress={() => router.push("/workspaces")}
            >
              <View style={styles.workspaceIcon}>
                <Ionicons name="folder" size={22} color="#64748B" />
              </View>

              <View style={styles.workspaceDetails}>
                <View style={styles.workspaceTopRow}>
                  <Text style={styles.workspaceTitle} numberOfLines={1}>
                    {file.claim_number || "Draft Workspace"}
                  </Text>
                  <View
                    style={[
                      styles.miniBadge,
                      getStatusStyle(file.status).badge,
                    ]}
                  >
                    <Text
                      style={[
                        styles.miniBadgeText,
                        getStatusStyle(file.status).text,
                      ]}
                    >
                      {file.status}
                    </Text>
                  </View>
                </View>

                <Text style={styles.workspaceClient}>
                  {file.client_name || "New Client Entry"}
                </Text>

                <View style={styles.workspaceFooter}>
                  <Ionicons name="calendar-outline" size={12} color="#94A3B8" />
                  <Text style={styles.workspaceDate}>
                    {file.updated_at
                      ? new Date(file.updated_at).toLocaleDateString()
                      : "Pending Sync"}
                  </Text>
                </View>
              </View>

              <Ionicons name="chevron-forward" size={18} color="#CBD5E1" />
            </Pressable>
          ))}
        </View>
      </ScrollView>

      <CustomConfirmModal
        isVisible={isModalVisible}
        title="Delete Workspace"
        message="This action cannot be undone. All associated drafts will be removed."
        onConfirm={confirmDelete}
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
    backgroundColor: "#F1F5F9",
  },
  headerGradient: {
    paddingTop: 12,
    paddingBottom: 30,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
  },
  headerContent: {
    paddingHorizontal: 24,
  },
  headerTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  logo: {
    width: 160,
    height: 50,
    resizeMode: "contain",
  },
  profileButton: {
    padding: 4,
  },
  creditPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.15)",
  },
  creditText: {
    color: "#FDE68A",
    fontSize: 13,
    fontWeight: "700",
    marginLeft: 6,
  },
  welcomeText: {
    fontSize: 24,
    fontWeight: "800",
    color: "#F8FAFC",
  },
  welcomeSub: {
    fontSize: 14,
    color: "#94A3B8",
    marginTop: 4,
    marginBottom: 24,
  },
  statsRow: {
    flexDirection: "row",
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    padding: 16,
    borderRadius: 20,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
  },
  statCardActive: {
    backgroundColor: "rgba(59, 130, 246, 0.2)",
    borderColor: "rgba(59, 130, 246, 0.3)",
  },
  statNumber: {
    fontSize: 18,
    fontWeight: "800",
    color: "#dacd16",
  },
  statLabel: {
    fontSize: 11,
    color: "#ececec",
    marginTop: 2,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  bodyWrapper: {
    paddingHorizontal: 20,
    paddingTop: 24,
  },
  quickActionsRow: {
    flexDirection: "row",
    gap: 16,
    marginBottom: 24,
  },
  actionCard: {
    flex: 1,
    backgroundColor: "#FFF",
    padding: 16,
    borderRadius: 24,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2,
  },
  actionIcon: {
    width: 52,
    height: 52,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 10,
  },
  actionLabel: {
    fontSize: 14,
    fontWeight: "700",
    color: "#334155",
  },
  lastDraftCard: {
    backgroundColor: "#FFF",
    borderRadius: 24,
    padding: 20,
    marginBottom: 32,
    borderLeftWidth: 5,
    borderLeftColor: "#3B82F6",
    shadowColor: "#3B82F6",
    shadowOpacity: 0.1,
    shadowRadius: 15,
    elevation: 3,
  },
  lastDraftContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  lastDraftInfo: {
    flex: 1,
  },
  lastDraftLabel: {
    fontSize: 10,
    fontWeight: "800",
    color: "#3B82F6",
    letterSpacing: 1,
    marginBottom: 4,
  },
  lastDraftTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#1E293B",
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 19,
    fontWeight: "800",
    color: "#1E293B",
  },
  viewAllText: {
    fontSize: 14,
    color: "#3B82F6",
    fontWeight: "600",
  },
  workspaceCard: {
    backgroundColor: "#FFF",
    borderRadius: 20,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    shadowColor: "#000",
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 1,
  },
  workspaceIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: "#F1F5F9",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  workspaceDetails: {
    flex: 1,
  },
  workspaceTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  workspaceTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#334155",
    maxWidth: width * 0.4,
  },
  workspaceClient: {
    fontSize: 13,
    color: "#64748B",
    marginBottom: 8,
  },
  workspaceFooter: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  workspaceDate: {
    fontSize: 11,
    color: "#94A3B8",
    fontWeight: "500",
  },
  miniBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  miniBadgeText: {
    fontSize: 10,
    fontWeight: "800",
    textTransform: "uppercase",
  },
  statusBadgeActive: { backgroundColor: "#DCFCE7" },
  statusTextActive: { color: "#15803d" },
  statusBadgeDraft: { backgroundColor: "#FEF3C7" },
  statusTextDraft: { color: "#b45309" },
  statusBadgeClosed: { backgroundColor: "#F1F5F9" },
  statusTextClosed: { color: "#475569" },
  statusBadgeNeutral: { backgroundColor: "#F1F5F9" },
  statusTextNeutral: { color: "#64748B" },
  pressed: {
    opacity: 0.8,
    transform: [{ scale: 0.98 }],
  },
});
