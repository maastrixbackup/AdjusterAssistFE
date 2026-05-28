import { CreateWorkspaceModal } from "@/components/CreateWorkspaceModal";
import { CustomConfirmModal } from "@/components/CustomConfirmModal";
import FileWorkspaceItem from "@/components/FileWorkspaceItem";
import {
  deleteFile,
  getMyFiles,
  getSubscriptionStatus,
  updateFile
} from "@/lib/api";
import { useAuth } from "@/providers/auth-provider";
import { Ionicons } from "@expo/vector-icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { router, useFocusEffect } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useCallback, useState } from "react";
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

export default function WorkspacesScreen() {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  // Modal state for deletion
  const [isDeleteModalVisible, setDeleteModalVisible] = useState(false);
  const [selectedFileId, setSelectedFileId] = useState<number | null>(null);

  const [isCreateModalVisible, setCreateModalVisible] = useState(false);

  const logo = require("../../assets/images/header-icon.png");
  const {
    data: files = [],
    isLoading,
    refetch,
    isRefetching: refreshing
  } = useQuery({
    queryKey: ["workspaces", token],
    queryFn: async () => {
      const res = await getMyFiles();
      return (res || []).map((f: any) => ({
        ...f,
        status: (f.status?.toLowerCase() === "closed" ? "closed" : "active") as "active" | "closed",
      }));
    },
    enabled: !!token,
  });

  // Re-fetch when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      refetch();
    }, [refetch])
  );
  const { data: status } = useQuery({
    queryKey: ["subscriptionStatus", token],
    queryFn: () => getSubscriptionStatus(),
    enabled: !!token,
  });

  const getStatusStyle = useCallback((value?: string) => {
    const statusValue = value?.toLowerCase();
    switch (statusValue) {
      case "active": return { badge: styles.statusBadgeActive, text: styles.statusTextActive };
      case "closed": return { badge: styles.statusBadgeClosed, text: styles.statusTextClosed };
      default: return { badge: styles.statusBadgeNeutral, text: styles.statusTextNeutral };
    }
  }, []); // Empty array means this function is created only once

  const handleDeleteFile = (id: number) => {
    setSelectedFileId(id);
    setDeleteModalVisible(true);
  };

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteFile(token!, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workspaces"] });
      toast.success("Workspace deleted successfully");
      if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    },
    onError: () => {
      toast.error("Failed to delete workspace.");
    }
  });

  // Now confirmDelete just becomes:
  const confirmDelete = () => {
    if (selectedFileId) deleteMutation.mutate(selectedFileId);
    setDeleteModalVisible(false);
  };

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => updateFile(token!, id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workspaces"] });
      toast.success("Workspace updated");
    },
    onMutate: async ({ id, data }) => {
      // OPTIONAL: This part makes the UI update INSTANTLY before the server responds
      await queryClient.cancelQueries({ queryKey: ["workspaces"] });
      const previous = queryClient.getQueryData(["workspaces"]);
      return { previous };
    }
  });

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
        colors={["#001529", "#003366"]}
        style={styles.headerGradient}
      >
        <SafeAreaView edges={["top"]} style={styles.headerContent}>
          <View style={styles.headerTopRow}>
            <View style={styles.brandingContainer}>
              <Image source={logo} style={styles.logo} />
              <Text style={styles.brandText}>
                Adjuster<Text style={styles.brandTextAccent}>Assist</Text>
              </Text>
            </View>

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

          {/* Optional: Title text if this is a sub-page */}
          <Text style={styles.welcomeText}>Workspaces</Text>
        </SafeAreaView>
      </LinearGradient>

      <View style={{ paddingHorizontal: 18, marginTop: 10, }}>
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
            onRefresh={refetch}
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
                  clientName: item.client_name,
                  credits: status?.subscription?.remaining ?? 0,
                },
              })
            }
            onUpdate={async (updateData) => {
              await updateMutation.mutateAsync({ id: item.id, data: updateData });
            }}
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
          queryClient.invalidateQueries({ queryKey: ["workspaces"] }); // Fixed: Trigger fresh sync
          setCreateModalVisible(false);
        }}
      />
      {/* <Toaster/> */}
    </View>
  );
}

const styles = StyleSheet.create({
  mainContainer: { flex: 1, backgroundColor: "#F1F5F9" },
  headerTitle: {
    marginTop: 8,
    fontSize: 26,
    fontWeight: "700",
    color: "#043a92",
    letterSpacing: -0.2,
    fontFamily: Platform.OS === 'ios' ? "System" : "Inter-Bold",
    includeFontPadding: false, // Essential for Android vertical centering
    textAlignVertical: "center",
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
  newWorkspaceBtn: {
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
  headerGradient: { 
    paddingTop: 12, 
    paddingBottom: 34, 
    borderBottomLeftRadius: 36, 
    borderBottomRightRadius: 36 
  },
  headerContent: { 
    paddingHorizontal: 24 
  },
  headerTopRow: { 
    flexDirection: "row", 
    justifyContent: "space-between", 
    alignItems: "center", 
    marginBottom: 20 
  },
  brandingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  logo: { 
    width: 45, 
    height: 45, 
    resizeMode: "contain" 
  },
  brandText: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.5,
  },
  brandTextAccent: {
    color: '#3B82F6', // Primary Blue
  },
  creditPill: { 
    flexDirection: "row", 
    alignItems: "center", 
    backgroundColor: "rgba(255, 255, 255, 0.12)", 
    paddingHorizontal: 12, 
    paddingVertical: 6, 
    borderRadius: 20, 
    borderWidth: 1, 
    borderColor: "rgba(255, 255, 255, 0.2)" 
  },
  creditText: { 
    color: "#FDE68A", 
    fontSize: 13, 
    fontWeight: "700", 
    marginLeft: 6 
  },
  welcomeText: { 
    fontSize: 26, 
    fontWeight: "800", 
    color: "#FFFFFF", 
    letterSpacing: -0.5 
  },
});