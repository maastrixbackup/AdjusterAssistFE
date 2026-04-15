import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { router, useFocusEffect } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from "react-native";
import { RefreshControl } from "react-native-gesture-handler";
import { SafeAreaView } from "react-native-safe-area-context";
import { toast } from "sonner-native";

import { CreateWorkspaceModal } from "@/components/CreateWorkspaceModal";
import { CustomConfirmModal } from "@/components/CustomConfirmModal";
import FileWorkspaceItem from "@/components/FileWorkspaceItem";
import {
  ClaimFile,
  deleteFile,
  getMyFiles,
  updateFile
} from "@/lib/api";
import { useAuth } from "@/providers/auth-provider";

export default function WorkspacesScreen() {
  const { token } = useAuth();
  const [files, setFiles] = useState<ClaimFile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Modal state for deletion
  const [isDeleteModalVisible, setDeleteModalVisible] = useState(false);
  const [selectedFileId, setSelectedFileId] = useState<number | null>(null);

  const [isCreateModalVisible, setCreateModalVisible] = useState(false);

  const logo = require("../../assets/images/AdjusterAssist1.png");


  const loadFiles = useCallback(
    async (showLoading = true) => {
      if (!token) return;
      if (showLoading) setIsLoading(true);
      if (!showLoading) setRefreshing(true);

      try {
        const filesResponse = await getMyFiles(token);

        // Normalize and cast status strictly to "active" | "closed"
        const normalizedFiles: ClaimFile[] = (filesResponse || []).map((f) => ({
          ...f,
          status: (f.status?.toLowerCase() === "closed" ? "closed" : "active") as "active" | "closed",
        }));

        setFiles(normalizedFiles);
      } catch (err) {
        console.error("Error loading files:", err);
        toast.error("Sync Failed: Could not load workspace data.");
      } finally {
        setIsLoading(false);
        setRefreshing(false);
      }
    },
    [token]
  );

  useEffect(() => {
    loadFiles(true);
  }, [loadFiles]);

  useFocusEffect(
    useCallback(() => {
      loadFiles(false);
    }, [loadFiles])
  );

  const getStatusStyle = (value?: string) => {
    const statusValue = value?.toLowerCase();
    switch (statusValue) {
      case "active":
        return { badge: styles.statusBadgeActive, text: styles.statusTextActive };
      case "closed":
        return { badge: styles.statusBadgeClosed, text: styles.statusTextClosed };
      default:
        return { badge: styles.statusBadgeNeutral, text: styles.statusTextNeutral };
    }
  };

  const handleDeleteFile = (id: number) => {
    setSelectedFileId(id);
    setDeleteModalVisible(true);
  };

  const confirmDelete = async () => {
    if (selectedFileId === null || !token) return;

    try {
      await deleteFile(token, selectedFileId);
      setFiles((prev) => prev.filter((f) => f.id !== selectedFileId));
      if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      toast.success("Workspace deleted successfully");
    } catch (err) {
      if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      toast.error("Failed to delete workspace.");
    } finally {
      setDeleteModalVisible(false);
      setSelectedFileId(null);
    }
  };

  const handleUpdateFile = async (id: number, updateData: Partial<ClaimFile>) => {
    if (!token) return;

    const previousFiles = [...files];

    const apiPayload = { ...updateData };

    // 2. Fix the "status" incompatibility
    if (apiPayload.status === "draft") {
      apiPayload.status = "active";
    }

    // Optimistic UI Update
    setFiles((prev) =>
      prev.map((f) => (f.id === id ? { ...f, ...updateData } : f))
    );

    try {
      // 3. Pass the sanitized apiPayload instead of updateData
      await updateFile(token, id, apiPayload as any);

      toast.success("Workspace updated");
      if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (err) {
      setFiles(previousFiles);
      toast.error("Update failed.");
      console.error("Update Error:", err);
    }
  };

  if (isLoading && !refreshing) {
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="large" color="#0F4C9C" />
        <Text style={styles.loaderText}>Loading Workspaces...</Text>
      </View>
    );
  }

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
          <View style={styles.topRow}>

            <View style={styles.brandBlock}>
              <Image source={logo} style={styles.logo} />
            </View>
            {/* Creating new workspace */}
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => setCreateModalVisible(true)}
              style={styles.newWorkspaceBtn}
            >
              <LinearGradient
                colors={["#3358a7", "#0a2a81"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.btnGradient}
              >
                <Text style={styles.newBtnText}>New</Text>
                <Ionicons name="add-circle" size={20} color="#FFFFFF" />
              </LinearGradient>
            </TouchableOpacity>
          </View>

        </SafeAreaView>
      </LinearGradient>

      <View style={{ paddingHorizontal: 18, marginTop: 10, }}>
        <Text style={styles.headerTitle}>Workspaces</Text>
        <View style={styles.glassCard}>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{files.length}</Text>
            <Text style={styles.statLabel}>Total Files</Text>
          </View>
          {/* FIX: Changed div to View */}
          <View style={styles.divider} />
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>
              {files.filter((f) => f.status === "active").length}
            </Text>
            <Text style={styles.statLabel}>Active Now</Text>
          </View>
          {/* FIX: Changed div to View */}
          <View style={styles.divider} />
          <View style={styles.statItem}>
            <View style={styles.syncBadge}>
              <Ionicons name="cloud-done" size={14} color="#10B981" />
              <Text style={styles.syncText}>Synced</Text>
            </View>
          </View>
        </View>
      </View>
      <FlatList
        data={files}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => loadFiles(false)}
            tintColor="#0F4C9C"
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="folder-open-outline" size={80} color="#CBD5E1" />
            <Text style={styles.emptyTitle}>No Workspaces Found</Text>
            <Text style={styles.emptySubtitle}>
              Start by creating a new claim from the home screen.
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <FileWorkspaceItem
            item={item}
            onPress={() =>
              router.push({
                pathname: "/aiChat",
                params: {
                  fileId: item.id,
                  claimNumber: item.claim_number || `CLM-${item.id}`,
                  clientName: item.client_name
                },
              })
            }
            onUpdate={(updateData) => handleUpdateFile(item.id, updateData)}
            onDelete={() => handleDeleteFile(item.id)}
            getStatusStyle={getStatusStyle}
          />
        )}
      />

      <CustomConfirmModal
        isVisible={isDeleteModalVisible}
        title="Delete Workspace"
        message="Are you sure you want to delete this workspace? This action cannot be undone."
        onConfirm={confirmDelete}
        onCancel={() => setDeleteModalVisible(false)}
      />
      <CreateWorkspaceModal
        isVisible={isCreateModalVisible}
        onClose={() => setCreateModalVisible(false)}
        token={token}
        onSuccess={(newFile) => {
          // Add the new file to the top of your list
          setFiles((prev) => [newFile, ...prev]);
          setCreateModalVisible(false);
        }}
      />
      {/* <Toaster/> */}
    </View>
  );
}

const styles = StyleSheet.create({
  mainContainer: { flex: 1, backgroundColor: "#F1F5F9" },
  headerGradient: {
    // paddingBottom: 25,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.12,
    shadowRadius: 15,
    elevation: 10,
  },
  headerContent: { paddingHorizontal: 20, },
  headerTitle: {
    // marginTop: 8,
    fontSize: 18,
    color: "#0B2F5B",
    letterSpacing: 0.3,
    fontFamily: "Inter-Regular",
    fontWeight: "bold",
    marginBottom: 12,
  },
  listContent: { padding: 20, paddingBottom: 120 },
  loaderContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
  },
  loaderText: { marginTop: 12, color: "#64748B", fontWeight: "600" },
  emptyState: { alignItems: "center", marginTop: 100 },
  emptyTitle: { fontSize: 18, fontWeight: "800", color: "#0F172A", marginTop: 16 },
  emptySubtitle: {
    fontSize: 14,
    color: "#64748B",
    textAlign: "center",
    marginTop: 8,
    paddingHorizontal: 40,
  },
  statusBadgeActive: { backgroundColor: "#DCFCE7" },
  statusTextActive: { color: "#166534", fontWeight: "700" },
  statusBadgeClosed: { backgroundColor: "#F1F5F9" },
  statusTextClosed: { color: "#475569", fontWeight: "700" },
  statusBadgeNeutral: { backgroundColor: "#EEF2F7" },
  statusTextNeutral: { color: "#64748B" },
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 10,
    marginBottom: 20,
  },
  eyebrow: {
    color: "rgba(255,255,255,0.6)",
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 1.5,
    textTransform: "uppercase",
  },
  iconCircle: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: "rgba(255,255,255,0.18)",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.25)",
  },
  glassCard: {
    flexDirection: "row",
    backgroundColor: "#0F4C9C",
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 20,
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
  },
  statItem: { flex: 1, alignItems: "center" },
  statNumber: { color: "#FFFFFF", fontSize: 20, fontWeight: "900" },
  statLabel: {
    color: "rgba(255,255,255,0.75)",
    fontSize: 11,
    fontWeight: "700",
    marginTop: 2,
  },
  divider: { width: 1, height: 35, backgroundColor: "rgba(255,255,255,0.25)" },
  syncBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(16, 185, 129, 0.25)",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 14,
    gap: 6,
  },
  syncText: { color: "#34D399", fontSize: 12, fontWeight: "900" },
  brandBlock: {
    flex: 1,
    paddingRight: 16,
  },

  logo: {
    width: 160,
    height: 50,
    resizeMode: "contain",
  },
  newWorkspaceBtn: {
    // Drop shadow for a "floating" effect
    shadowColor: "#2563EB",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  btnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 100, // Capsule shape
    gap: 6, // Space between text and icon
  },
  newBtnText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "800",
    letterSpacing: 0.3,
    textTransform: 'uppercase', // Professional look
  },
});