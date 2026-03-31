import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { router, useFocusEffect } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useEffect, useState } from "react";
import {
    ActivityIndicator,
    FlatList,
    Platform,
    StyleSheet,
    Text,
    View,
} from "react-native";
import { RefreshControl } from "react-native-gesture-handler";
import { SafeAreaView } from "react-native-safe-area-context";
import { toast } from "sonner-native";

import { CustomConfirmModal } from "@/components/CustomConfirmModal";
import FileWorkspaceItem from "@/components/FileWorkspaceItem";
import {
    ClaimFile,
    deleteFile,
    getMyFiles,
    updateFile,
} from "@/lib/api";
import { useAuth } from "@/providers/auth-provider";

export default function WorkspacesScreen() {
  const { token } = useAuth();
  const [files, setFiles] = useState<ClaimFile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Delete modal state
  const [isModalVisible, setModalVisible] = useState(false);
  const [selectedFileId, setSelectedFileId] = useState<number | null>(null);

  const loadFiles = React.useCallback(
    async (showLoading = true) => {
      if (!token) return;
      if (showLoading) setIsLoading(true);
      if (!showLoading) setRefreshing(true);

      try {
        const filesResponse = await getMyFiles(token);
        setFiles(filesResponse ? filesResponse : []);
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
    React.useCallback(() => {
      loadFiles(false);
    }, [loadFiles])
  );

  const getStatusStyle = (value?: string) => {
    const statusValue = value?.toLowerCase();
    switch (statusValue) {
      case "active":
        return { badge: styles.statusBadgeActive, text: styles.statusTextActive, icon: "checkmark-circle" };
      case "draft":
        return { badge: styles.statusBadgeDraft, text: styles.statusTextDraft, icon: "document-text" };
      case "closed":
        return { badge: styles.statusBadgeClosed, text: styles.statusTextClosed, icon: "lock-closed" };
      default:
        return { badge: styles.statusBadgeNeutral, text: styles.statusTextNeutral, icon: "ellipse" };
    }
  };

  const handleDeleteFile = (id: number) => {
    setSelectedFileId(id);
    setModalVisible(true);
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
      setModalVisible(false);
      setSelectedFileId(null);
    }
  };

  const handleUpdateFile = async (id: number, updateData: any) => {
    if (!token) return;
    try {
      await updateFile(token, id, updateData);
      toast.success("Workspace updated");
      loadFiles(false);
    } catch (err) {
      toast.error("Update failed");
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
      colors={["#0F4C9C", "#123C78", "#0B2F5B"]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.headerGradient}
    >
      <SafeAreaView edges={["top"]} style={styles.headerContent}>
        {/* Top Row: Title & Action */}
        <View style={styles.topRow}>
          <View>
            <Text style={styles.eyebrow}>AdjusterAssist</Text>
            <Text style={styles.headerTitle}>Workspaces</Text>
          </View>
          <View style={styles.iconCircle}>
            <Ionicons name="folder-open" size={20} color="#FFFFFF" />
          </View>
        </View>

        {/* Stats Summary Card */}
        <View style={styles.glassCard}>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{files.length}</Text>
            <Text style={styles.statLabel}>Total Files</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>
              {files.filter(f => f.status?.toLowerCase() === 'active').length}
            </Text>
            <Text style={styles.statLabel}>Active Now</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.statItem}>
            <View style={styles.syncBadge}>
              <Ionicons name="cloud-done" size={14} color="#10B981" />
              <Text style={styles.syncText}>Synced</Text>
            </View>
          </View>
        </View>
      </SafeAreaView>
    </LinearGradient>

      <FlatList
        data={files}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => loadFiles(false)} tintColor="#0F4C9C" />
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="folder-open-outline" size={80} color="#CBD5E1" />
            <Text style={styles.emptyTitle}>No Workspaces Found</Text>
            <Text style={styles.emptySubtitle}>Start by creating a new claim from the home screen.</Text>
          </View>
        }
        renderItem={({ item }) => (
          <FileWorkspaceItem
            item={item}
            onPress={() => router.push({ pathname: "/file-draft-history", params: { fileId: item.id } })}
            onUpdate={handleUpdateFile}
            onDelete={handleDeleteFile}
            getStatusStyle={getStatusStyle}
          />
        )}
      />

      <CustomConfirmModal
        isVisible={isModalVisible}
        title="Delete Workspace"
        message="Are you sure you want to delete this workspace? This action cannot be undone."
        onConfirm={confirmDelete}
        onCancel={() => setModalVisible(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  mainContainer: { flex: 1, backgroundColor: "#F8FAFC" },
  headerGradient: { paddingBottom: 20, borderBottomLeftRadius: 24, borderBottomRightRadius: 24, shadowColor: "#000", shadowOffset: { width: 0, height: 10 },shadowOpacity: 0.1,shadowRadius: 15,elevation: 10, },
  headerContent: { paddingHorizontal: 20, marginTop: 10 },
  headerTitle: {
    color: "#FFFFFF",
    fontSize: 28,
    fontWeight: "900",
    letterSpacing: -0.5,
  },
  headerSubtitle: { color: "rgba(255,255,255,0.7)", fontSize: 14, marginTop: 4 },
  listContent: { padding: 20, paddingBottom: 100 },
  loaderContainer: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#F8FAFC" },
  loaderText: { marginTop: 12, color: "#64748B", fontWeight: "600" },
  emptyState: { alignItems: "center", marginTop: 100 },
  emptyTitle: { fontSize: 18, fontWeight: "800", color: "#0F172A", marginTop: 16 },
  emptySubtitle: { fontSize: 14, color: "#64748B", textAlign: "center", marginTop: 8, paddingHorizontal: 40 },
  statusBadgeActive: { backgroundColor: "#DCFCE7" },
  statusTextActive: { color: "#166534" },
  statusBadgeDraft: { backgroundColor: "#FEF3C7" },
  statusTextDraft: { color: "#92400E" },
  statusBadgeClosed: { backgroundColor: "#E2E8F0" },
  statusTextClosed: { color: "#475569" },
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
    letterSpacing: 1.2,
    textTransform: "uppercase",
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.15)",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
  },
  glassCard: {
    flexDirection: "row",
    backgroundColor: "rgba(255,255,255,0.12)",
    borderRadius: 20,
    padding: 16,
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
  },
  statItem: {
    flex: 1,
    alignItems: "center",
  },
  statNumber: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "800",
  },
  statLabel: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 11,
    fontWeight: "600",
    marginTop: 2,
  },
  divider: {
    width: 1,
    height: 30,
    backgroundColor: "rgba(255,255,255,0.2)",
  },
  syncBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(16, 185, 129, 0.2)",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 4,
  },
  syncText: {
    color: "#34D399",
    fontSize: 11,
    fontWeight: "800",
  },
});