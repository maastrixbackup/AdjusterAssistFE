import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router, useFocusEffect } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  BackHandler,
  Dimensions,
  Image,
  Pressable,
  StyleSheet,
  Text,
  ToastAndroid,
  View
} from "react-native";
import { RefreshControl, ScrollView } from "react-native-gesture-handler";
import { SafeAreaView } from "react-native-safe-area-context";
import { toast } from "sonner-native";

import { CreateWorkspaceModal } from "@/components/CreateWorkspaceModal";
import {
  ClaimFile,
  getMyFiles,
  getSubscriptionStatus,
  SubscriptionStatus
} from "@/lib/api";
import { logoutUser } from "@/lib/services/authService";
import { useAuth } from "@/providers/auth-provider";

const { width } = Dimensions.get("window");

export default function HomeScreen() {
  const { token } = useAuth();
  const [files, setFiles] = useState<ClaimFile[]>([]);
  const [status, setStatus] = useState<SubscriptionStatus | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [isCreateModalVisible, setIsCreateModalVisible] = useState(false);

  const logo = require("../../assets/images/AdjusterAssist1.png");

  const mostRecentFile = useMemo(() => {
    if (!files || files.length === 0) return null;

    return [...files].sort((a, b) => {
      const getTime = (f: any) => {
        return f.last_activity_at
          ? new Date(f.last_activity_at).getTime()
          : f.updated_at
            ? new Date(f.updated_at).getTime()
            : 0;
      };

      return getTime(b) - getTime(a);
    })[0];
  }, [files]);

  const activeFilesCount = useMemo(
    () => files.filter((f) => f.status?.toLowerCase() === "active").length,
    [files]
  );

  const recentClaims = useMemo(() => {
    return files
      .filter((f) => ["active", "draft"].includes(f.status?.toLowerCase() || ""))
      .slice(0, 8);
  }, [files]);

  const loadData = React.useCallback(
    async (showSilent = false) => {
      if (!token) return;
      if (showSilent) setRefreshing(true);

      try {
        const [filesResponse, statusResponse] = await Promise.all([
          getMyFiles(token),
          getSubscriptionStatus(token),
        ]);

        setFiles(filesResponse || []);
        setStatus(statusResponse);
      } catch (err: any) {
        if (err.message.includes("401") || err.message.includes("Unauthorized")) {
          logoutUser();
        }
        toast.error("Sync Failed: Could not load data.");
      } finally {
        setRefreshing(false);
      }
    },
    [token]
  );

  useEffect(() => { loadData(); }, [loadData]);

  useFocusEffect(
    React.useCallback(() => { loadData(true); }, [loadData])
  );

  const backPressCount = useRef(0);
  useFocusEffect(
    React.useCallback(() => {
      const onBackPress = () => {
        if (backPressCount.current === 0) {
          backPressCount.current += 1;
          ToastAndroid.show("Press again to exit", ToastAndroid.SHORT);
          setTimeout(() => { backPressCount.current = 0; }, 2000);
          return true;
        }
        BackHandler.exitApp();
        return true;
      };
      const sub = BackHandler.addEventListener("hardwareBackPress", onBackPress);
      return () => sub.remove();
    }, [])
  );

  const handleWorkspaceCreated = (newFile: ClaimFile) => {
    setIsCreateModalVisible(false);
    router.push({
      pathname: "/aiChat",
      params: {
        fileId: newFile.id,
        claimNumber: newFile.claim_number,
        clientName: newFile.client_name,
        credits: status?.subscription?.remaining ?? 0,
        initialData: JSON.stringify(newFile)
      }
    });
  };

  const getStatusStyle = (value?: string) => {
    const s = value?.toLowerCase();
    if (s === "active") return { badge: styles.sBadgeA, text: styles.sTextA, dot: "#15803d" };
    if (s === "draft") return { badge: styles.sBadgeD, text: styles.sTextD, dot: "#b45309" };
    return { badge: styles.sBadgeN, text: styles.sTextN, dot: "#64748B" };
  };

  return (
    <View style={styles.mainContainer}>
      <StatusBar style="light" />

      <LinearGradient colors={["#165bb6", "#02305f"]} style={styles.headerGradient}>
        <SafeAreaView edges={["top"]} style={styles.headerContent}>
          <View style={styles.headerTopRow}>
            <Image source={logo} style={styles.logo} />
            <Pressable onPress={() => router.push("/settings")} style={styles.creditPill}>
              <Ionicons name="sparkles" size={14} color="#FDE68A" />
              <Text style={styles.creditText}>{status?.subscription?.remaining ?? 0}</Text>
            </Pressable>
          </View>

          <Text style={styles.welcomeText}>Claims Workspace</Text>
          <Text style={styles.welcomeSub}>Manage claim workspaces efficiently.</Text>

          <View style={styles.statsRow}>
            <StatCard label="Total" val={files.length} />
            <StatCard label="Active" val={activeFilesCount} active />
            <StatCard label="Credits" val={status?.subscription?.remaining ?? 0} />
          </View>
        </SafeAreaView>
      </LinearGradient>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadData(true)} tintColor="#165bb6" />}
      >
        <View style={styles.bodyWrapper}>
          {/* Unified Quick Action - Removing History Button for Premium focus */}
          <Pressable
            style={({ pressed }) => [styles.primaryActionBtn, pressed && styles.pressed]}
            onPress={() => setIsCreateModalVisible(true)}
          >
            <LinearGradient colors={["#297afc", "#165bb6"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.primaryActionGradient}>
              <View style={styles.primaryActionLeft}>
                <View style={styles.iconCircle}>
                  <Ionicons name="add" size={24} color="#FFF" />
                </View>
                <View>
                  <Text style={styles.primaryActionTitle}>Initialize New Claim</Text>
                  <Text style={styles.primaryActionSub}>Start a context-aware workspace</Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={20} color="rgba(255,255,255,0.7)" />
            </LinearGradient>
          </Pressable>

          {mostRecentFile && (
            <Pressable style={({ pressed }) => [styles.lastDraftCard, pressed && styles.pressed]}
              onPress={() => router.push({
                pathname: "/aiChat",
                params: {
                  fileId: mostRecentFile.id,
                  claimNumber: mostRecentFile.claim_number,
                  clientName: mostRecentFile.client_name,
                  credits: status?.subscription?.remaining ?? 0,
                }
              })}>
              <View style={styles.lastDraftContent}>
                <View style={styles.lastDraftInfo}>
                  <View style={styles.rowCenter}>
                    <View style={styles.livePulse} />
                    <Text style={styles.lastDraftLabel}>RESUME RECENT TASK</Text>
                  </View>
                  <Text style={styles.lastDraftTitle} numberOfLines={1}>
                    {`${mostRecentFile.claim_number || 'Claim'} – ${mostRecentFile.client_name || 'Client'}`}
                  </Text>
                </View>
                <View style={styles.recentActionCircle}><Ionicons name="play" size={16} color="#FFF" style={{ marginLeft: 2 }} /></View>
              </View>
            </Pressable>
          )}

          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Active Workspaces</Text>
            <Pressable onPress={() => router.push("/workspaces")}><Text style={styles.viewAllText}>See All</Text></Pressable>
          </View>

          {recentClaims.length > 0 ? recentClaims.map((file) => {
            const statusStyle = getStatusStyle(file.status);
            return (
              <Pressable key={file.id} style={({ pressed }) => [styles.workspaceCard, pressed && styles.pressed]}
                onPress={() => router.push({
                  pathname: "/aiChat",
                  params: {
                    fileId: file.id,
                    claimNumber: file.claim_number,
                    clientName: file.client_name,
                    credits: status?.subscription?.remaining ?? 0,
                  }
                })}>
                <View style={styles.workspaceIcon}>
                  <Ionicons name="layers" size={20} color="#165bb6" />
                </View>
                <View style={styles.workspaceDetails}>
                  <View style={styles.workspaceTopRow}>
                    <Text style={styles.workspaceTitle} numberOfLines={1}>{file.claim_number || "Draft Workspace"}</Text>
                    <View style={[styles.miniBadge, statusStyle.badge]}>
                      <Text style={[styles.miniBadgeText, statusStyle.text]}>{file.status}</Text>
                    </View>
                  </View>
                  <Text style={styles.workspaceClient} numberOfLines={1}>{file.client_name || "New Client Entry"}</Text>
                  <View style={styles.workspaceFooter}>
                    <View style={styles.footerItem}>
                      <Ionicons name="time-outline" size={12} color="#94A3B8" />
                      <Text style={styles.workspaceDate}>{file.updated_at ? new Date(file.updated_at).toLocaleDateString() : "Pending"}</Text>
                    </View>
                    <View style={styles.dotSeparator} />
                    <Text style={styles.workspaceDate}>{file.loss_type || 'General'}</Text>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={16} color="#CBD5E1" />
              </Pressable>
            )
          }) : (
            <View style={styles.emptyState}>
              <Ionicons name="document-text-outline" size={48} color="#CBD5E1" />
              <Text style={styles.emptyStateText}>No active claims found.</Text>
            </View>
          )}
        </View>
      </ScrollView>

      <CreateWorkspaceModal isVisible={isCreateModalVisible} onClose={() => setIsCreateModalVisible(false)} onSuccess={handleWorkspaceCreated} token={token} />
    </View>
  );
}

const StatCard = ({ label, val, active }: any) => (
  <View style={[styles.statCard, active && styles.statCardActive]}>
    <Text style={styles.statNumber}>{val}</Text>
    <Text style={styles.statLabel}>{label}</Text>
  </View>
);

const styles = StyleSheet.create({
  mainContainer: { flex: 1, backgroundColor: "#F8FAFC" },
  headerGradient: { paddingTop: 12, paddingBottom: 34, borderBottomLeftRadius: 36, borderBottomRightRadius: 36 },
  headerContent: { paddingHorizontal: 24 },
  headerTopRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 20 },
  logo: { width: 150, height: 45, resizeMode: "contain" },
  creditPill: { flexDirection: "row", alignItems: "center", backgroundColor: "rgba(255, 255, 255, 0.15)", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1, borderColor: "rgba(255, 255, 255, 0.2)" },
  creditText: { color: "#FDE68A", fontSize: 13, fontWeight: "700", marginLeft: 6 },
  welcomeText: { fontSize: 26, fontWeight: "800", color: "#FFFFFF", letterSpacing: -0.5 },
  welcomeSub: { fontSize: 14, color: "rgba(255,255,255,0.7)", marginTop: 4, marginBottom: 24 },
  statsRow: { flexDirection: "row", gap: 12 },
  statCard: { flex: 1, backgroundColor: "rgba(255, 255, 255, 0.1)", padding: 16, borderRadius: 22, alignItems: "center", borderWidth: 1, borderColor: "rgba(255, 255, 255, 0.15)" },
  statCardActive: { backgroundColor: "rgba(59, 130, 246, 0.3)", borderColor: "rgba(59, 130, 246, 0.5)" },
  statNumber: { fontSize: 20, fontWeight: "800", color: "#FDE68A" },
  statLabel: { fontSize: 10, color: "#E2E8F0", marginTop: 4, textTransform: "uppercase", letterSpacing: 0.8, fontWeight: "600" },
  scrollContent: { paddingBottom: 40 },
  bodyWrapper: { paddingHorizontal: 20, paddingTop: 26 },

  // Premium Primary Action
  primaryActionBtn: { marginBottom: 24, borderRadius: 24, overflow: 'hidden', elevation: 8, shadowColor: "#3B82F6", shadowOpacity: 0.3, shadowRadius: 12, shadowOffset: { width: 0, height: 6 } },
  primaryActionGradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20 },
  primaryActionLeft: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  iconCircle: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },
  primaryActionTitle: { color: '#FFF', fontSize: 17, fontWeight: '700' },
  primaryActionSub: { color: 'rgba(255,255,255,0.8)', fontSize: 12, marginTop: 2 },

  // Last Draft / Resume Card
  lastDraftCard: { backgroundColor: "#FFF", borderRadius: 24, padding: 20, marginBottom: 30, borderLeftWidth: 6, borderLeftColor: "#3B82F6", elevation: 4, shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 10 },
  lastDraftContent: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  lastDraftInfo: { flex: 1 },
  rowCenter: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  livePulse: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#10B981', marginRight: 8 },
  lastDraftLabel: { fontSize: 11, fontWeight: "800", color: "#64748B", letterSpacing: 1 },
  lastDraftTitle: { fontSize: 16, fontWeight: "700", color: "#0F172A" },
  recentActionCircle: { width: 40, height: 40, borderRadius: 20, backgroundColor: "#3B82F6", justifyContent: "center", alignItems: "center" },

  sectionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 18, paddingHorizontal: 4 },
  sectionTitle: { fontSize: 20, fontWeight: "800", color: "#1E293B", letterSpacing: -0.3 },
  viewAllText: { fontSize: 14, color: "#3B82F6", fontWeight: "700" },

  // Workspace Card Premium Styling
  workspaceCard: { backgroundColor: "#FFF", borderRadius: 22, padding: 16, flexDirection: "row", alignItems: "center", marginBottom: 14, elevation: 3, shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 10, borderWidth: 1, borderColor: "#F1F5F9" },
  workspaceIcon: { width: 50, height: 50, borderRadius: 16, backgroundColor: "#F0F7FF", justifyContent: "center", alignItems: "center", marginRight: 16 },
  workspaceDetails: { flex: 1 },
  workspaceTopRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 4 },
  workspaceTitle: { fontSize: 16, fontWeight: "700", color: "#1E293B" },
  workspaceClient: { fontSize: 14, color: "#475569", marginBottom: 10, fontWeight: '500' },
  workspaceFooter: { flexDirection: "row", alignItems: "center" },
  footerItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  dotSeparator: { width: 3, height: 3, borderRadius: 1.5, backgroundColor: '#CBD5E1', marginHorizontal: 8 },
  workspaceDate: { fontSize: 12, color: "#94A3B8", fontWeight: "600" },

  miniBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  miniBadgeText: { fontSize: 10, fontWeight: "800" },
  sBadgeA: { backgroundColor: "#DCFCE7" },
  sTextA: { color: "#166534" },
  sBadgeD: { backgroundColor: "#FFF7ED" },
  sTextD: { color: "#9a3412" },
  sBadgeN: { backgroundColor: "#F8FAFC" },
  sTextN: { color: "#64748B" },

  emptyState: { alignItems: 'center', justifyContent: 'center', paddingVertical: 40 },
  emptyStateText: { color: '#94A3B8', marginTop: 12, fontWeight: '600' },
  pressed: { opacity: 0.9, transform: [{ scale: 0.98 }] },
});