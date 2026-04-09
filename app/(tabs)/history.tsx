import { AllDraftsofUser, Draft } from "@/lib/api";
import { useAuth } from "@/providers/auth-provider";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { LinearGradient } from "expo-linear-gradient";
import { router, useFocusEffect } from "expo-router"; // Added useFocusEffect
import { StatusBar } from "expo-status-bar";
import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  Platform,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const { width } = Dimensions.get('window');
const SAVED_DATA_KEY = "@session_saved_drafts_data";

type EnhancedDraft = Draft & { source: 'db' | 'session' };

export default function DraftsListScreen() {
  const { token } = useAuth();
  const [drafts, setDrafts] = useState<EnhancedDraft[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Core data fetching logic
  const fetchMergedHistory = useCallback(async (showLoading = true) => {
    if (!token) return;
    try {
      if (showLoading) setLoading(true);

      // 1. Fetch from DB
      const dbData = await AllDraftsofUser(token);
      const dbList: Draft[] = Array.isArray(dbData) ? dbData : (dbData as any).drafts || [];
      const dbDrafts: EnhancedDraft[] = dbList.map(d => ({ ...d, source: 'db' }));

      // 2. Fetch from Session Storage
      const sessionRaw = await AsyncStorage.getItem(SAVED_DATA_KEY);
      const sessionList: Draft[] = sessionRaw ? JSON.parse(sessionRaw) : [];
      const sessionDrafts: EnhancedDraft[] = sessionList.map(d => ({ ...d, source: 'session' }));

      // 3. Merge and De-duplicate
      const combined = [...dbDrafts, ...sessionDrafts];
      const uniqueMap = new Map<string, EnhancedDraft>();
      
      combined.forEach(item => {
        const existing = uniqueMap.get(item.content);
        if (!existing || (existing.source === 'session' && item.source === 'db')) {
          uniqueMap.set(item.content, item);
        }
      });

      const sorted = Array.from(uniqueMap.values()).sort((a, b) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );

      setDrafts(sorted);
    } catch (err) {
      console.error("Error fetching merged history.", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token]);

  // AUTO-REFRESH LOGIC: Fires whenever screen comes into view
  useFocusEffect(
    useCallback(() => {
      fetchMergedHistory(drafts.length === 0); // Only show full-screen loader on first load
    }, [fetchMergedHistory])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchMergedHistory(false);
  };

  const renderDraft = ({ item }: { item: EnhancedDraft }) => {
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
              draftId: item.id?.toString(),
              output_format: item.draft_type,
              type: item.draft_type,
              text: item.content,
              fileId: item.file_id?.toString(),
              alreadySaved: isSynced ? "true" : "false",
              created_at: item.created_at,
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
        <LinearGradient
            colors={["#156bdb", "#123C78", "#0B2F5B"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.headerGradient}
        >
            <SafeAreaView edges={["top"]}>
                <View style={styles.navBar}>
                    <Pressable onPress={() => router.back()} style={styles.backCircle}>
                        <Ionicons name="arrow-back" size={20} color="#FFF" />
                    </Pressable>
                    
                    <View style={styles.titleStack}>
                        <Text style={styles.navSubtitle}>Intelligence Archive</Text>
                        <Text style={styles.navTitle}>Generation Log</Text>
                    </View>

                    <View style={styles.claimBadge}>
                        <Text style={styles.claimText}>History</Text>
                    </View>
                </View>
            </SafeAreaView>
        </LinearGradient>
      </View>

      {loading && !refreshing ? (
        <View style={styles.loaderCenter}>
          <ActivityIndicator size="small" color="#0F4C9C" />
          <Text style={styles.loaderSub}>Syncing History...</Text>
        </View>
      ) : (
        <FlatList
          data={drafts}
          renderItem={renderDraft}
          keyExtractor={(item, index) => item.id?.toString() || index.toString()}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#0F4C9C" />
          }
          ListHeaderComponent={
            <View style={styles.listHeader}>
                <Text style={styles.headerCount}>{drafts.length} Total Logs</Text>
                <View style={styles.headerLine} />
            </View>
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIconCircle}>
                <MaterialCommunityIcons name="history" size={40} color="#CBD5E1" />
              </View>
              <Text style={styles.emptyTitle}>No History Found</Text>
              <Text style={styles.emptySubtitle}>Your generated responses saved across all files will appear here.</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  mainWrapper: { flex: 1, backgroundColor: '#F8FAFC' },
  headerContainer: {
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    overflow: 'hidden',
    elevation: 10,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  headerGradient: {
     paddingBottom: 18,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  navBar: {
    height: 60,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
  },
  backCircle: { 
    width: 40, 
    height: 40, 
    borderRadius: 20, 
    backgroundColor: 'rgba(255, 255, 255, 0.15)', 
    alignItems: 'center', 
    justifyContent: 'center',
  },
  titleStack: { alignItems: 'center' },
  navSubtitle: { fontSize: 10, fontWeight: '800', color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase', letterSpacing: 1 },
  navTitle: { fontSize: width < 380 ? 16 : 19, fontWeight: '800', color: '#FFFFFF' }, // Responsive Title
  claimBadge: { backgroundColor: '#FFFFFF', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 },
  claimText: { color: '#0F172A', fontSize: 11, fontWeight: '800' },
  
  loaderCenter: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loaderSub: { marginTop: 12, color: '#94A3B8', fontSize: 13, fontWeight: '600' },
  
  listContainer: { 
    padding: 20, 
    paddingBottom: 40,
    alignSelf: 'center', // Center list for larger screens
    width: '100%',
    maxWidth: 600 // Responsive Max Width for tablets
  },
  listHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 20, gap: 12 },
  headerCount: { fontSize: 12, fontWeight: '800', color: '#64748B', textTransform: 'uppercase' },
  headerLine: { flex: 1, height: 1, backgroundColor: '#E2E8F0' },

  draftCard: { 
    backgroundColor: '#FFF', 
    borderRadius: 20, 
    flexDirection: 'row', 
    marginBottom: 16, 
    overflow: 'hidden',
    borderWidth: 1, 
    borderColor: '#E2E8F0',
    ...Platform.select({
      ios: { shadowColor: '#0F172A', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 10 },
      android: { elevation: 3 }
    })
  },
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
  
  cardFooter: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F8FAFC'
  },
  footerInfo: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  footerTime: { fontSize: 11, color: '#94A3B8', fontWeight: '600' },
  openAction: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  openText: { fontSize: 13, color: '#0F4C9C', fontWeight: '800' },

  emptyContainer: { alignItems: 'center', marginTop: 80, paddingHorizontal: 40 },
  emptyIconCircle: { 
    width: 80, 
    height: 80, 
    borderRadius: 40, 
    backgroundColor: '#F1F5F9', 
    alignItems: 'center', 
    justifyContent: 'center',
    marginBottom: 20
  },
  emptyTitle: { fontSize: 20, fontWeight: '800', color: '#1E293B' },
  emptySubtitle: { fontSize: 14, color: '#94A3B8', textAlign: 'center', marginTop: 8, lineHeight: 22 },
});