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

  // Logic: Identify the absolute most recently updated workspace
  const mostRecentFile = useMemo(() => {
    if (!files || files.length === 0) return null;
    return [...files].sort((a, b) => {
      const dateA = a.updated_at ? new Date(a.updated_at).getTime() : 0;
      const dateB = b.updated_at ? new Date(b.updated_at).getTime() : 0;
      return dateB - dateA;
    })[0];
  }, [files]);

  const activeFilesCount = useMemo(
    () => files.filter((f) => f.status?.toLowerCase() === "active").length,
    [files]
  );

  const recentClaims = useMemo(() => {
    return files
      .filter((f) => ["active", "draft"].includes(f.status?.toLowerCase() || ""))
      .slice(0, 5);
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

  // Hardware Back Press Handling
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
    if (s === "active") return { badge: styles.sBadgeA, text: styles.sTextA };
    if (s === "draft") return { badge: styles.sBadgeD, text: styles.sTextD };
    return { badge: styles.sBadgeN, text: styles.sTextN };
  };

  return (
    <View style={styles.mainContainer}>
      <StatusBar style="light" />

      <LinearGradient colors={["#165bb6", "#003366"]} style={styles.headerGradient}>
        <SafeAreaView edges={["top"]} style={styles.headerContent}>
          <View style={styles.headerTopRow}>
            <Image source={logo} style={styles.logo} />
            <Pressable onPress={() => router.push("/settings")} style={styles.creditPill}>
              <Ionicons name="sparkles" size={14} color="#FDE68A" />
              <Text style={styles.creditText}>{status?.subscription?.remaining ?? 0}</Text>
            </Pressable>
          </View>

          <Text style={styles.welcomeText}>Claims Workspace</Text>
          <Text style={styles.welcomeSub}>Manage assessments efficiently.</Text>

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
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadData(true)} tintColor="#003366" />}
      >
        <View style={styles.bodyWrapper}>
          <View style={styles.quickActionsRow}>
            <ActionBtn icon="add" label="New Claim" color={["#3B82F6", "#0a36b1"]} onPress={() => setIsCreateModalVisible(true)} />
            <ActionBtn icon="document-text" label="History" color={["#F59E0B", "#D97706"]} onPress={() => router.push("/history")} />
          </View>

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
                  <Text style={styles.lastDraftLabel}>CONTINUE WORKING</Text>
                  <Text style={styles.lastDraftTitle} numberOfLines={1}>
                    {`Continue: ${mostRecentFile.claim_number || 'Claim'} – ${mostRecentFile.client_name || 'Client'}`}
                  </Text>
                </View>
                <View style={styles.recentActionCircle}><Ionicons name="play" size={16} color="#FFF" style={{ marginLeft: 2 }} /></View>
              </View>
            </Pressable>
          )}

          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent Activity</Text>
            <Pressable onPress={() => router.push("/workspaces")}><Text style={styles.viewAllText}>See All</Text></Pressable>
          </View>

          {recentClaims.map((file) => (
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
              <View style={styles.workspaceIcon}><Ionicons name="folder" size={22} color="#3070c9" /></View>
              <View style={styles.workspaceDetails}>
                <View style={styles.workspaceTopRow}>
                  <Text style={styles.workspaceTitle} numberOfLines={1}>{file.claim_number || "Draft Workspace"}</Text>
                  <View style={[styles.miniBadge, getStatusStyle(file.status).badge]}>
                    <Text style={[styles.miniBadgeText, getStatusStyle(file.status).text]}>{file.status}</Text>
                  </View>
                </View>
                <Text style={styles.workspaceClient}>{file.client_name || "New Client Entry"}</Text>
                <View style={styles.workspaceFooter}>
                  <Ionicons name="calendar-outline" size={12} color="#94A3B8" />
                  <Text style={styles.workspaceDate}>{file.updated_at ? new Date(file.updated_at).toLocaleDateString() : "Sync Pending"}</Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#CBD5E1" />
            </Pressable>
          ))}
        </View>
      </ScrollView>

      <CreateWorkspaceModal isVisible={isCreateModalVisible} onClose={() => setIsCreateModalVisible(false)} onSuccess={handleWorkspaceCreated} token={token} />
    </View>
  );
}

// Sub-components for cleaner code
const StatCard = ({ label, val, active }: any) => (
  <View style={[styles.statCard, active && styles.statCardActive]}>
    <Text style={styles.statNumber}>{val}</Text>
    <Text style={styles.statLabel}>{label}</Text>
  </View>
);

const ActionBtn = ({ icon, label, color, onPress }: any) => (
  <Pressable style={({ pressed }) => [styles.actionCard, pressed && styles.pressed]} onPress={onPress}>
    <LinearGradient colors={color} style={styles.actionIcon}><Ionicons name={icon} size={24} color="#FFF" /></LinearGradient>
    <Text style={styles.actionLabel}>{label}</Text>
  </Pressable>
);

const styles = StyleSheet.create({
  mainContainer: { flex: 1, backgroundColor: "#F1F5F9" },
  headerGradient: { paddingTop: 12, paddingBottom: 30, borderBottomLeftRadius: 32, borderBottomRightRadius: 32 },
  headerContent: { paddingHorizontal: 24 },
  headerTopRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 20 },
  logo: { width: 160, height: 50, resizeMode: "contain" },
  creditPill: { flexDirection: "row", alignItems: "center", backgroundColor: "rgba(255, 255, 255, 0.12)", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1, borderColor: "rgba(255, 255, 255, 0.2)" },
  creditText: { color: "#FDE68A", fontSize: 13, fontWeight: "700", marginLeft: 6 },
  welcomeText: { fontSize: 24, fontWeight: "800", color: "#F8FAFC" },
  welcomeSub: { fontSize: 14, color: "#CBD5E1", marginTop: 4, marginBottom: 24 },
  statsRow: { flexDirection: "row", gap: 12 },
  statCard: { flex: 1, backgroundColor: "rgba(255, 255, 255, 0.08)", padding: 16, borderRadius: 20, alignItems: "center", borderWidth: 1, borderColor: "rgba(255, 255, 255, 0.1)" },
  statCardActive: { backgroundColor: "rgba(59, 130, 246, 0.25)", borderColor: "rgba(59, 130, 246, 0.4)" },
  statNumber: { fontSize: 18, fontWeight: "800", color: "#dacd16" },
  statLabel: { fontSize: 10, color: "#F1F5F9", marginTop: 2, textTransform: "uppercase", letterSpacing: 0.5 },
  scrollContent: { paddingBottom: 40 },
  bodyWrapper: { paddingHorizontal: 20, paddingTop: 24 },
  quickActionsRow: { flexDirection: "row", gap: 16, marginBottom: 24 },
  actionCard: { flex: 1, backgroundColor: "#FFF", padding: 16, borderRadius: 24, alignItems: "center", elevation: 3, shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 10 },
  actionIcon: { width: 52, height: 52, borderRadius: 18, justifyContent: "center", alignItems: "center", marginBottom: 10 },
  actionLabel: { fontSize: 14, fontWeight: "700", color: "#334155" },
  lastDraftCard: { backgroundColor: "#FFF", borderRadius: 24, padding: 18, marginBottom: 28, borderLeftWidth: 6, borderLeftColor: "#3B82F6", elevation: 5, shadowColor: "#3B82F6", shadowOpacity: 0.15, shadowRadius: 15 },
  lastDraftContent: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  lastDraftInfo: { flex: 1, paddingRight: 8 },
  lastDraftLabel: { fontSize: 10, fontWeight: "800", color: "#3B82F6", letterSpacing: 1, marginBottom: 4 },
  lastDraftTitle: { fontSize: 15, fontWeight: "700", color: "#1E293B" },
  recentActionCircle: { width: 36, height: 36, borderRadius: 18, backgroundColor: "#3B82F6", justifyContent: "center", alignItems: "center" },
  sectionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 },
  sectionTitle: { fontSize: 19, fontWeight: "800", color: "#1E293B" },
  viewAllText: { fontSize: 14, color: "#3B82F6", fontWeight: "600" },
  workspaceCard: { backgroundColor: "#FFF", borderRadius: 20, padding: 16, flexDirection: "row", alignItems: "center", marginBottom: 12, elevation: 2, shadowColor: "#000", shadowOpacity: 0.04, shadowRadius: 8 },
  workspaceIcon: { width: 48, height: 48, borderRadius: 14, backgroundColor: "#F1F5F9", justifyContent: "center", alignItems: "center", marginRight: 16 },
  workspaceDetails: { flex: 1 },
  workspaceTopRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 4 },
  workspaceTitle: { fontSize: 15, fontWeight: "700", color: "#334155", maxWidth: width * 0.4 },
  workspaceClient: { fontSize: 13, color: "#64748B", marginBottom: 8 },
  workspaceFooter: { flexDirection: "row", alignItems: "center", gap: 4 },
  workspaceDate: { fontSize: 11, color: "#94A3B8", fontWeight: "500" },
  miniBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  miniBadgeText: { fontSize: 10, fontWeight: "800", textTransform: "uppercase" },
  sBadgeA: { backgroundColor: "#DCFCE7" },
  sTextA: { color: "#15803d" },
  sBadgeD: { backgroundColor: "#FEF3C7" },
  sTextD: { color: "#b45309" },
  sBadgeN: { backgroundColor: "#F1F5F9" },
  sTextN: { color: "#64748B" },
  pressed: { opacity: 0.85, transform: [{ scale: 0.97 }] },
});