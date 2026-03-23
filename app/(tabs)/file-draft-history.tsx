import { AllDraftsofUser, Draft } from "@/lib/api";
import { useAuth } from "@/providers/auth-provider";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

// UPDATED KEYS: Matching ResponseScreen logic
const SAVED_DATA_KEY = "@session_saved_drafts_data"; // The actual log objects
const SAVED_IDS_KEY = "@session_saved_drafts";      // The list of synced content

export default function FileHistoryScreen() {
  const { token } = useAuth();
  const { fileId, claimNumber } = useLocalSearchParams<{ fileId: string; claimNumber: string }>();

  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchMergedDrafts = useCallback(async () => {
    if (!token || !fileId) return;

    try {
      if (!refreshing) setLoading(true);

      // 1. Fetch from Cloud Database
      const apiData = await AllDraftsofUser(token);
      const apiList: any[] = Array.isArray(apiData) ? apiData : (apiData as any).drafts || [];

      // 2. Fetch from Local Session History
      const stored = await AsyncStorage.getItem(SAVED_DATA_KEY);
      const sessionList: any[] = stored ? JSON.parse(stored) : [];

      // 3. Fetch the Synced IDs (to determine if the "Saved" badge should show in ResponseScreen)
      const syncedIdsRaw = await AsyncStorage.getItem(SAVED_IDS_KEY);
      const syncedIds: string[] = syncedIdsRaw ? JSON.parse(syncedIdsRaw) : [];

      // 4. Merge and Filter by the current fileId
      const combined = [...sessionList, ...apiList];

      const filtered = combined
        .filter((d: any) => d.file_id?.toString() === fileId.toString())
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      // 5. De-duplicate based on content 
      // (If a draft exists in both Local Session and DB, we prefer the DB version/state)
      const uniqueMap = new Map();
      filtered.forEach(item => {
        // If we see the same content twice, the API/DB version usually comes after local in the array merge
        uniqueMap.set(item.content, item);
      });

      const finalDrafts = Array.from(uniqueMap.values());
      setDrafts(finalDrafts as Draft[]);
    } catch (err) {
      console.error("Error syncing file history:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token, fileId, refreshing]);

  useEffect(() => {
    fetchMergedDrafts();
  }, [fetchMergedDrafts]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchMergedDrafts();
  };

  const renderDraft = ({ item }: { item: Draft }) => {
    // Determine if this item is "Officially Saved" (exists in DB or was synced this session)
    // Most API items won't have an ID until they are in DB
    const isSynced = !!item.id || false; 

    return (
      <Pressable
        style={styles.draftCard}
        onPress={() =>
          router.push({
            pathname: "/response",
            params: {
              text: item.content,
              type: item.draft_type,
              fileId: fileId,
              // If it has a real DB ID, it's already saved.
              alreadySaved: isSynced ? "true" : "false", 
            },
          })
        }
      >
        <View style={styles.cardMain}>
          <View style={styles.cardHeader}>
            <View style={[styles.typeBadge, isSynced && styles.syncedBadge]}>
              <Text style={[styles.typeBadgeText, isSynced && styles.syncedBadgeText]}>
                {item.draft_type?.toUpperCase()} {isSynced ? "• SYNCED" : "• SESSION"}
              </Text>
            </View>
            <Text style={styles.dateText}>
              {new Date(item.created_at).toLocaleDateString(undefined, {
                month: "short",
                day: "numeric",
              })}
            </Text>
          </View>
          <Text style={styles.contentPreview} numberOfLines={3}>
            {item.content}
          </Text>
          <View style={styles.cardFooter}>
            <Text style={styles.openText}>View Full Draft</Text>
            <Ionicons name="chevron-forward" size={14} color="#0F4C9C" />
          </View>
        </View>
      </Pressable>
    );
  };

  return (
    <View style={styles.mainWrapper}>
      <StatusBar style="light" />

      <View style={styles.headerContainer}>
        <LinearGradient colors={["#0F172A", "#0F4C9C"]} style={styles.headerGradient}>
          <SafeAreaView edges={["top"]}>
            <View style={styles.navBar}>
              <Pressable onPress={() => router.back()} style={styles.backCircle}>
                <Ionicons name="arrow-back" size={20} color="#FFF" />
              </Pressable>

              <View style={styles.titleStack}>
                <Text style={styles.navSubtitle}>File Specific Archive</Text>
                <Text style={styles.navTitle}>{claimNumber || "Claim Detail"}</Text>
              </View>

              <View style={styles.countBadge}>
                <Text style={styles.countText}>{drafts.length}</Text>
              </View>
            </View>
          </SafeAreaView>
        </LinearGradient>
      </View>

      {loading && !refreshing ? (
        <View style={styles.loaderCenter}>
          <ActivityIndicator size="small" color="#0F4C9C" />
          <Text style={styles.loaderSub}>Retrieving Records...</Text>
        </View>
      ) : (
        <FlatList
          data={drafts}
          renderItem={renderDraft}
          keyExtractor={(item, index) => item.id?.toString() || `session-${index}`}
          contentContainerStyle={styles.listContainer}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#0F4C9C" />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <MaterialCommunityIcons name="folder-open-outline" size={60} color="#CBD5E1" />
              <Text style={styles.emptyTitle}>No Drafts Yet</Text>
              <Text style={styles.emptySubtitle}>
                Drafts generated for this claim will appear here.
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  mainWrapper: { flex: 1, backgroundColor: "#F8FAFC" },
  headerContainer: { borderBottomLeftRadius: 24, borderBottomRightRadius: 24, overflow: "hidden", elevation: 8 },
  headerGradient: { paddingBottom: 20 },
  navBar: { height: 70, flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20 },
  backCircle: { width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(255, 255, 255, 0.15)", alignItems: "center", justifyContent: "center" },
  titleStack: { alignItems: "center" },
  navSubtitle: { fontSize: 10, fontWeight: "800", color: "rgba(255,255,255,0.6)", textTransform: "uppercase" },
  navTitle: { fontSize: 18, fontWeight: "800", color: "#FFFFFF" },
  countBadge: { backgroundColor: "#FFF", width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  countText: { color: "#0F4C9C", fontSize: 12, fontWeight: "800" },
  loaderCenter: { flex: 1, justifyContent: "center", alignItems: "center" },
  loaderSub: { marginTop: 12, color: "#94A3B8", fontSize: 13, fontWeight: "600" },
  listContainer: { padding: 20 },
  draftCard: { backgroundColor: "#FFF", borderRadius: 16, marginBottom: 16, borderWidth: 1, borderColor: "#E2E8F0", elevation: 2, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 3 },
  cardMain: { padding: 16 },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", marginBottom: 12 },
  typeBadge: { backgroundColor: "#F1F5F9", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  syncedBadge: { backgroundColor: "#DCFCE7" },
  typeBadgeText: { fontSize: 9, fontWeight: "900", color: "#475569" },
  syncedBadgeText: { color: "#166534" },
  dateText: { fontSize: 11, color: "#94A3B8", fontWeight: "700" },
  contentPreview: { fontSize: 14, color: "#1E293B", lineHeight: 22, marginBottom: 12 },
  cardFooter: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingTop: 10, borderTopWidth: 1, borderTopColor: "#F1F5F9" },
  openText: { fontSize: 12, color: "#0F4C9C", fontWeight: "800" },
  emptyContainer: { alignItems: "center", marginTop: 100, paddingHorizontal: 40 },
  emptyTitle: { fontSize: 18, fontWeight: "800", color: "#1E293B", marginTop: 16 },
  emptySubtitle: { fontSize: 13, color: "#94A3B8", textAlign: "center", marginTop: 8 },
});