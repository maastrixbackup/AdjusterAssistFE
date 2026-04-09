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
import { styles } from "../../components/style/Home.styles";

import { CustomConfirmModal } from "@/components/CustomConfirmModal";
import {
  ClaimFile,
  deleteFile,
  getMyFiles,
  getRecentDrafts,
  getSubscriptionStatus,
  RecentDraft,
  SubscriptionStatus,
  updateFile,
} from "@/lib/api";
import { logoutUser } from "@/lib/services/authService";
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
  const [lastDraft, setLastDraft] = useState<RecentDraft | null>(null);

  const activeFilesCount = useMemo(
    () =>
      files.filter((file) => file.status?.toLowerCase() === "active").length,
    [files],
  );

  const recentClaims = useMemo(() => {
    // Get recent claims (active and draft), limit to 5
    return files
      .filter((file) => ["active", "draft"].includes(file.status?.toLowerCase() || ""))
      .slice(0, 5);
  }, [files]);
// console.log("Recent Claims:", recentClaims);
  const loadData = React.useCallback(
    async (showLoading = true) => {
      if (!token) return;

      if (showLoading) setIsLoading(true);
      if (!showLoading) setRefreshing(true);

      try {
        const [filesResponse, statusResponse, recentDrafts] = await Promise.all([
          getMyFiles(token),
          getSubscriptionStatus(token),
          getRecentDrafts(token),
        ]);

        setFiles(filesResponse ? filesResponse : []);
        setStatus(statusResponse);

        const sortedDrafts = (recentDrafts || [])
          .slice()
          .sort(
            (a, b) =>
              new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
          );
        setLastDraft(sortedDrafts[0] || null);
      } catch (err: any) {
        console.error("Error loading data:", err);
        if (err.message.includes("401") || err.message.includes("Unauthorized")) {
          logoutUser();
        }
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



  return (
    <View style={styles.mainContainer}>
      <StatusBar style="light" />

      <LinearGradient
       colors={["#156bdb", "#123C78", "#0B2F5B"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.headerGradient}
      >
        <SafeAreaView edges={["top"]} style={styles.headerContent}>
          <View style={styles.headerRow}>
            <View style={styles.brandBlock}>
              <Image source={logo} style={styles.logo} />

            </View>

            <View style={styles.creditPill}>
              <Ionicons name="sparkles" size={13} color="#FDE68A" />
              <Text style={styles.creditText}>
                {status?.subscription?.remaining ?? 0} Credits
              </Text>
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
            tintColor="#276bbd"
          />
        }
      >
        <View style={styles.contentWrapper}>
          <Text style={styles.brandSubtitle}>Premium claims workspace</Text>

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
    
        {/* Continue Last Claim - Primary Action */}
        {lastDraft && (
          <View style={styles.primaryActionCard}>
            <View style={styles.primaryActionContent}>
              <View style={styles.primaryActionIcon}>
                <LinearGradient
                  colors={["#0549a1", "#020617"]}
                  style={styles.primaryActionGradient}
                >
                  <Ionicons name="create-outline" size={24} color="#FFFFFF" />
                </LinearGradient>
              </View>
              <View style={styles.primaryActionText}>
                <Text style={styles.primaryActionTitle}>Continue Last Claim</Text>
                {/* <Text style={styles.primaryActionSubtitle}>
                  {lastDraft.claim_number || "Unnamed Draft"}
                </Text> */}
              </View>
              <Pressable
                style={({ pressed }) => [
                  styles.primaryActionButton,
                  pressed && styles.fabPressed,
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
                <Ionicons name="chevron-forward" size={20} color="#1E63B6" />
              </Pressable>
            </View>
          </View>
        )}

        {/* Quick Actions Row */}
        <View style={styles.quickActionsRow}>
          
          <Pressable
            style={({ pressed }) => [
              styles.quickActionCard,
              pressed && styles.quickActionPressed,
            ]}
            onPress={() => router.push("/generate")}
          >
            <LinearGradient
              colors={["#EFF6FF", "#DBEAFE"]}
              style={styles.quickActionGradient}
            >
              <Ionicons name="add" size={20} color="#1D4ED8" />
            </LinearGradient>
            <Text style={styles.quickActionText}>Start a New Claim</Text>
          </Pressable>

          <Pressable
            style={({ pressed }) => [
              styles.quickActionCard,
              pressed && styles.quickActionPressed,
            ]}
            onPress={() => router.push("/file-draft-history")}
          >
            <LinearGradient
              colors={["#FEF3C7", "#FDE68A"]}
              style={styles.quickActionGradient}
            >
              <Ionicons name="document-text" size={20} color="#92400E" />
            </LinearGradient>
            <Text style={styles.quickActionText}>Quick Draft</Text>
          </Pressable>
        </View>

        {/* Recent Claims Section */}
        {recentClaims.length > 0 && (
          <View style={styles.recentClaimsSection}>
            <View style={styles.sectionHeader}>
              <View>
                <Text style={styles.sectionEyebrow}>RECENT ACTIVITY</Text>
                {/* <Text style={styles.sectionTitle}>Recent Claims</Text> */}
              </View>
              {/* <Pressable
                style={({ pressed }) => [
                  styles.sectionAction,
                  pressed && { opacity: 0.7 },
                ]}
                onPress={() => router.push("/history")}
              >
                <Text style={styles.sectionActionText}>View All</Text>
                <Ionicons name="chevron-forward" size={14} color="#276bbd" />
              </Pressable> */}
            </View>

            <View style={styles.recentClaimsList}>
              {recentClaims.map((file) => (
                <Pressable
                  key={file.id}
                  style={({ pressed }) => [
                    styles.recentClaimCard,
                    pressed && styles.fileCardPressed,
                  ]}
                  onPress={() => router.push("/workspaces")}
                >
                  <View style={styles.fileIconWrap}>
                    <LinearGradient
                      colors={["#EFF6FF", "#DBEAFE"]}
                      style={styles.fileIconGradient}
                    >
                      <Ionicons
                        name={getStatusStyle(file.status).icon as any}
                        size={20}
                        color="#1D4ED8"
                      />
                    </LinearGradient>
                  </View>

                  <View style={styles.fileInfo}>
                    <View style={styles.fileTopRow}>
                      <Text style={styles.fileName} numberOfLines={1}>
                        {file.claim_number || "Unnamed Claim"}
                      </Text>
                      <View style={[styles.statusBadgeBase, getStatusStyle(file.status).badge]}>
                        <Ionicons
                          name={getStatusStyle(file.status).icon as any}
                          size={10}
                          color={getStatusStyle(file.status).text.color}
                        />
                        <Text style={[styles.statusTextBase, getStatusStyle(file.status).text]}>
                          {file.status || "Unknown"}
                        </Text>
                      </View>
                    </View>

                    {file.client_name && (
                      <Text style={styles.clientName} numberOfLines={1}>
                        {file.client_name}
                      </Text>
                    )}

                    <View style={styles.fileMetaRow}>
                      <View style={styles.metaItem}>
                        <Ionicons name="time-outline" size={12} color="#94A3B8" />
                        <Text style={styles.fileSubText}>
                          {file.updated_at ? new Date(file.updated_at).toLocaleDateString() : "Recent"}
                        </Text>
                      </View>
                    </View>
                  </View>

                  <View style={styles.chevronWrap}>
                    <Ionicons name="chevron-forward" size={16} color="#94A3B8" />
                  </View>
                </Pressable>
              ))}
            </View>
          </View>
        )}

        {/* Empty State when no recent claims */}
        {/* {recentClaims.length === 0 && !isLoading && (
          <View style={styles.centerCard}>
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
            <Text style={styles.centerTitle}>Start a New Claim</Text>
            <Text style={styles.centerSubtitle}>
              Create and manage claims with speed and accuracy.
            </Text>
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
        )} */}
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


