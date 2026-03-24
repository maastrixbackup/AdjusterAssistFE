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

const SAVED_DATA_KEY = "@session_saved_drafts_data";

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

      // 3. De-duplicate and Prioritize DB versions
      // We use a Map keyed by content. If a DB item and Session item have the same content,
      // the DB item (which has an 'id') must win.
      const uniqueMap = new Map<string, any>();

      // First, add all session drafts
      sessionList.forEach(item => {
        if (item.file_id?.toString() === fileId.toString()) {
          uniqueMap.set(item.content, { ...item, source: 'session' });
        }
      });

      // Second, add API drafts. If content matches, this OVERWRITES the session item.
      apiList.forEach(item => {
        if (item.file_id?.toString() === fileId.toString()) {
          uniqueMap.set(item.content, { ...item, source: 'db' });
        }
      });

      const finalDrafts = Array.from(uniqueMap.values())
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

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

  const renderDraft = ({ item }: { item: any }) => {
    const isEmail = item.draft_type === 'email';
    const isEscalation = item.draft_type === 'escalation';
    
    const isSynced = item.source === 'db';


    return (
      <Pressable
        style={({ pressed }) => [
          styles.draftCard,
          pressed && { opacity: 0.9, transform: [{ scale: 0.98 }] }
        ]}
        onPress={() => {
          router.push({
            pathname: "/response",
            params: {
              text: item.content,
              type: item.draft_type,
              fileId: fileId,
              alreadySaved: isSynced ? "true" : "false"
            }
          });
        }}
      >
        <View style={[
          styles.typeIndicator,
          { backgroundColor: isEmail ? '#0F4C9C' : isEscalation ? '#E11D48' : '#fdfa2d' }
        ]} />

        <View style={styles.cardMain}>
          <View style={styles.cardHeader}>
            <View style={styles.badgeRow}>
              <View style={styles.typeBadge}>
                <Text style={styles.typeBadgeText}>{item.draft_type?.toUpperCase() || "DRAFT"}</Text>
              </View>

              <View style={[styles.sourceTag, isSynced ? styles.syncedTag : styles.sessionTag]}>
                <Ionicons
                  name={isSynced ? "cloud-done" : "time-outline"}
                  size={8}
                  color={isSynced ? "#059669" : "#D97706"}
                />
                <Text style={[styles.sourceTagText, { color: isSynced ? "#059669" : "#D97706" }]}>
                  {isSynced ? "SYNCED" : "SESSION"}
                </Text>
              </View>
            </View>
            <Text style={styles.dateText}>
              {new Date(item.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
            </Text>
          </View>

          {item.claim_number && (
            <Text style={styles.claimNoText}>Claim: {item.claim_number}</Text>
          )}

          <Text style={styles.contentPreview} numberOfLines={2}>
            {item.content || "Empty draft content..."}
          </Text>

          <View style={styles.cardFooter}>
            <View style={styles.footerInfo}>
              <Ionicons name="calendar-outline" size={12} color="#94A3B8" />
              <Text style={styles.footerTime}>
                {new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </Text>
            </View>
            <View style={styles.openAction}>
              <Text style={styles.openText}>Review Draft</Text>
              <Ionicons name="chevron-forward" size={12} color="#0F4C9C" />
            </View>
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
              <Text style={styles.emptySubtitle}>Drafts generated for this claim will appear here.</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  mainWrapper: { flex: 1, backgroundColor: '#F8FAFC' },
  headerContainer: { borderBottomLeftRadius: 24, borderBottomRightRadius: 24, overflow: 'hidden', elevation: 10, shadowColor: '#0F172A', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8 },
  headerGradient: { paddingBottom: 20 },
  navBar: { height: 70, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20 },
  backCircle: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255, 255, 255, 0.15)', alignItems: 'center', justifyContent: 'center' },
  titleStack: { alignItems: 'center' },
  navSubtitle: { fontSize: 10, fontWeight: '800', color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase', letterSpacing: 1 },
  navTitle: { fontSize: 18, fontWeight: '800', color: '#FFFFFF' },
  countBadge: { backgroundColor: '#FFFFFF', width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  countText: { color: '#0F4C9C', fontSize: 11, fontWeight: '800' },
  loaderCenter: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loaderSub: { marginTop: 12, color: '#94A3B8', fontSize: 13, fontWeight: '600' },
  listContainer: { padding: 20, paddingBottom: 40 },
  draftCard: { backgroundColor: '#FFF', borderRadius: 20, flexDirection: 'row', marginBottom: 16, overflow: 'hidden', borderWidth: 1, borderColor: '#E2E8F0', elevation: 3, shadowColor: '#0F172A', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 10 },
  typeIndicator: { width: 5 },
  cardMain: { flex: 1, padding: 16 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  badgeRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  typeBadge: { backgroundColor: '#F1F5F9', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  typeBadgeText: { fontSize: 9, fontWeight: '900', color: '#475569' },
  sourceTag: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, borderWidth: 0.5 },
  syncedTag: { backgroundColor: '#ECFDF5', borderColor: '#10B981' },
  sessionTag: { backgroundColor: '#FFFBEB', borderColor: '#F59E0B' },
  sourceTagText: { fontSize: 7, fontWeight: '900' },
  dateText: { fontSize: 11, color: '#94A3B8', fontWeight: '700' },
  claimNoText: { fontSize: 12, fontWeight: '700', color: '#64748B', marginBottom: 4 },
  contentPreview: { fontSize: 15, color: '#1E293B', fontWeight: '500', lineHeight: 22, marginBottom: 14 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 12, borderTopWidth: 1, borderTopColor: '#F8FAFC' },
  footerInfo: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  footerTime: { fontSize: 11, color: '#94A3B8', fontWeight: '600' },
  openAction: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  openText: { fontSize: 13, color: '#0F4C9C', fontWeight: '800' },
  emptyContainer: { alignItems: 'center', marginTop: 80, paddingHorizontal: 40 },
  emptyTitle: { fontSize: 20, fontWeight: '800', color: '#1E293B' },
  emptySubtitle: { fontSize: 14, color: '#94A3B8', textAlign: 'center', marginTop: 8, lineHeight: 22 },
});