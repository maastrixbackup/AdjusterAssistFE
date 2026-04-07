import { CustomConfirmModal } from "@/components/CustomConfirmModal";
import { AllDraftsofUser, Draft, deleteDraft } from "@/lib/api";
import { useAuth } from "@/providers/auth-provider";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  Platform,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { GestureHandlerRootView, Swipeable } from "react-native-gesture-handler";
import { SafeAreaView } from "react-native-safe-area-context";
import { toast } from "sonner-native";

const { width } = Dimensions.get("window");
const SAVED_DATA_KEY = "@session_saved_drafts_data";

export default function FileHistoryScreen() {
  const { token } = useAuth();
  const { fileId, claimNumber } = useLocalSearchParams<{ fileId: string; claimNumber: string }>();

  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  // Custom Modal State
  const [isModalVisible, setModalVisible] = useState(false);
  const [selectedDraft, setSelectedDraft] = useState<any>(null);

  const fetchMergedDrafts = useCallback(async () => {
    if (!token || !fileId) return;
    try {
      if (!refreshing) setLoading(true);
      const apiData = await AllDraftsofUser(token);
      const apiList: any[] = Array.isArray(apiData) ? apiData : (apiData as any).drafts || [];
      const stored = await AsyncStorage.getItem(SAVED_DATA_KEY);
      const sessionList: any[] = stored ? JSON.parse(stored) : [];

      const uniqueMap = new Map<string, any>();
      sessionList.forEach(item => {
        if (item.file_id?.toString() === fileId.toString()) {
          uniqueMap.set(item.content, { ...item, source: 'session' });
        }
      });
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

  const confirmDelete = async () => {
    if (!selectedDraft) return;
    const { id, source, content } = selectedDraft;

    try {
      if (source === 'db' && token) {
        await deleteDraft(token, id);
      } else {
        const stored = await AsyncStorage.getItem(SAVED_DATA_KEY);
        if (stored) {
          const sessionList = JSON.parse(stored);
          const filtered = sessionList.filter((item: any) => item.content !== content);
          await AsyncStorage.setItem(SAVED_DATA_KEY, JSON.stringify(filtered));
        }
      }
      setDrafts(prev => prev.filter(d => d.content !== content));
      toast.success("Draft removed successfully");
    } catch (err) {
      toast.error("Failed to delete draft");
    } finally {
      setModalVisible(false);
      setSelectedDraft(null);
    }
  };

  const renderRightActions = (item: any) => (
    <Pressable
      style={styles.deleteAction}
      onPress={() => {
        setSelectedDraft(item);
        setModalVisible(true);
      }}
    >
      <View style={styles.deleteInner}>
        <Ionicons name="trash-outline" size={24} color="#FFF" />
        <Text style={styles.deleteActionText}>Delete</Text>
      </View>
    </Pressable>
  );

  const renderDraft = ({ item }: { item: any }) => {
    const isEmail = item.draft_type === 'email';
    const isEscalation = item.draft_type === 'escalation';
    const isSynced = item.source === 'db';

    return (
      <Swipeable
        renderRightActions={() => renderRightActions(item)}
        friction={2}
        rightThreshold={40}
      >
        <Pressable
          style={({ pressed }) => [
            styles.draftCard,
            pressed && { opacity: 0.9, transform: [{ scale: 0.99 }] }
          ]}
          onPress={() => {
            router.push({
              pathname: "/response",
              params: {
                draftId: item.id?.toString(),
                output_format: item.draft_type,
                type: item.draft_type,
                text: item.content,
                fileId: fileId,
                alreadySaved: isSynced ? "true" : "false",
                created_at: item.created_at,
              }
            });
          }}
        >
          <View style={[
            styles.typeIndicator,
            { backgroundColor: isEmail ? '#3B82F6' : isEscalation ? '#E11D48' : '#FACC15' }
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
                    size={10}
                    color={isSynced ? "#10B981" : "#F59E0B"}
                  />
                  <Text style={[styles.sourceTagText, { color: isSynced ? "#10B981" : "#F59E0B" }]}>
                    {isSynced ? "SYNCED" : "SESSION"}
                  </Text>
                </View>
              </View>
              <Text style={styles.dateText}>
                {new Date(item.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
              </Text>
            </View>

            <Text style={styles.contentPreview} numberOfLines={2}>
              {item.content || "No content available..."}
            </Text>

            <View style={styles.cardFooter}>
              <View style={styles.footerInfo}>
                <Ionicons name="time-outline" size={14} color="#94A3B8" />
                <Text style={styles.footerTime}>
                  {new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </Text>
              </View>
              <View style={styles.openAction}>
                <Text style={styles.openText}>Review</Text>
                <Ionicons name="chevron-forward" size={14} color="#0F4C9C" />
              </View>
            </View>
          </View>
        </Pressable>
      </Swipeable>
    );
  };

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <View style={styles.mainWrapper}>
        <StatusBar style="light" />
        
        <View style={styles.headerContainer}>
          <LinearGradient colors={["#0F172A", "#1E293B"]} style={styles.headerGradient}>
            <SafeAreaView edges={["top"]}>
              <View style={styles.navBar}>
                <Pressable onPress={() => router.back()} style={styles.glassButton}>
                  <Ionicons name="arrow-back" size={20} color="#FFF" />
                </Pressable>
                <View style={styles.titleStack}>
                  <Text style={styles.navSubtitle}>Archive</Text>
                  <Text style={styles.navTitle} numberOfLines={1}>{claimNumber || "Claim Detail"}</Text>
                </View>
                <View style={styles.glassBadge}>
                  <Text style={styles.countText}>{drafts.length}</Text>
                </View>
              </View>
            </SafeAreaView>
          </LinearGradient>
        </View>

        {loading && !refreshing ? (
          <View style={styles.loaderCenter}>
            <ActivityIndicator size="small" color="#0F4C9C" />
            <Text style={styles.loaderSub}>Fetching Archive...</Text>
          </View>
        ) : (
          <FlatList
            data={drafts}
            renderItem={renderDraft}
            keyExtractor={(item, index) => item.id?.toString() || `session-${index}`}
            contentContainerStyle={styles.listContainer}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={() => {setRefreshing(true); fetchMergedDrafts();}} tintColor="#0F4C9C" />
            }
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <MaterialCommunityIcons name="folder-sync-outline" size={64} color="#CBD5E1" />
                <Text style={styles.emptyTitle}>Empty History</Text>
                <Text style={styles.emptySubtitle}>Start generating drafts to see them here.</Text>
              </View>
            }
          />
        )}

        <CustomConfirmModal 
          isVisible={isModalVisible}
          title="Remove Draft"
          message="Are you sure you want to delete this draft? This action cannot be undone."
          onConfirm={confirmDelete}
          onCancel={() => setModalVisible(false)}
        />
      </View>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  mainWrapper: { flex: 1, backgroundColor: '#F8FAFC' },
  headerContainer: { borderBottomLeftRadius: 32, borderBottomRightRadius: 32, overflow: 'hidden', ...Platform.select({ ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.1, shadowRadius: 10 }, android: { elevation: 8 } }) },
  headerGradient: { paddingBottom: 24 },
  navBar: { height: 60, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20 },
  glassButton: { width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(255, 255, 255, 0.12)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.1)' },
  titleStack: { alignItems: 'center', flex: 1, marginHorizontal: 10 },
  navSubtitle: { fontSize: 10, fontWeight: '700', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: 1.2 },
  navTitle: { fontSize: 18, fontWeight: '800', color: '#FFFFFF' },
  glassBadge: { backgroundColor: 'rgba(255, 255, 255, 0.12)', width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.1)' },
  countText: { color: '#FFF', fontSize: 12, fontWeight: '800' },
  loaderCenter: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loaderSub: { marginTop: 12, color: '#94A3B8', fontSize: 13, fontWeight: '600' },
  listContainer: { padding: 16, paddingBottom: 100 },
  draftCard: { backgroundColor: '#FFF', borderRadius: 24, flexDirection: 'row', marginBottom: 16, overflow: 'hidden', borderWidth: 1, borderColor: '#F1F5F9', ...Platform.select({ ios: { shadowColor: '#0F172A', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.06, shadowRadius: 12 }, android: { elevation: 3 } }) },
  typeIndicator: { width: 6 },
  cardMain: { flex: 1, padding: 16 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  badgeRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  typeBadge: { backgroundColor: '#F1F5F9', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  typeBadgeText: { fontSize: 9, fontWeight: '900', color: '#475569', letterSpacing: 0.5 },
  sourceTag: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, borderWidth: 1 },
  syncedTag: { backgroundColor: '#ECFDF5', borderColor: '#D1FAE5' },
  sessionTag: { backgroundColor: '#FFFBEB', borderColor: '#FEF3C7' },
  sourceTagText: { fontSize: 8, fontWeight: '900' },
  dateText: { fontSize: 11, color: '#94A3B8', fontWeight: '700' },
  contentPreview: { fontSize: 14, color: '#334155', fontWeight: '500', lineHeight: 22, marginBottom: 16 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 12, borderTopWidth: 1, borderTopColor: '#F8FAFC' },
  footerInfo: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  footerTime: { fontSize: 11, color: '#94A3B8', fontWeight: '700' },
  openAction: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  openText: { fontSize: 13, color: '#0F4C9C', fontWeight: '800' },
  deleteAction: { width: 90, marginBottom: 16, marginLeft: 10 },
  deleteInner: { flex: 1, backgroundColor: '#e11d47', justifyContent: 'center', alignItems: 'center', borderRadius: 24 },
  deleteActionText: { color: '#ffffff', fontSize: 11, fontWeight: '800', marginTop: 4 },
  emptyContainer: { alignItems: 'center', marginTop: 100, paddingHorizontal: 40 },
  emptyTitle: { fontSize: 20, fontWeight: '800', color: '#1E293B', marginTop: 16 },
  emptySubtitle: { fontSize: 14, color: '#94A3B8', textAlign: 'center', marginTop: 8, lineHeight: 22 },
});