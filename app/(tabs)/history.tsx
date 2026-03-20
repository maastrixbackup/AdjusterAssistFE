import { Draft, getDraftsByFile } from "@/lib/api";
import { useAuth } from "@/providers/auth-provider";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function DraftsListScreen() {
  const { fileId, claimNumber } = useLocalSearchParams();
  const { token } = useAuth();
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchDrafts() {
      if (!token || !fileId) return;
      try {
        const data = await getDraftsByFile(token, Number(fileId));
        setDrafts(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    fetchDrafts();
  }, [fileId]);

  const renderDraft = ({ item }: { item: Draft }) => (
    <Pressable style={styles.draftCard}>
      <View style={[styles.typeIndicator, { backgroundColor: item.type === 'email' ? '#DBEAFE' : '#FEE2E2' }]}>
        <Ionicons 
            name={item.type === 'email' ? "mail" : "document-text"} 
            size={18} 
            color={item.type === 'email' ? "#2563EB" : "#DC2626"} 
        />
      </View>
      <View style={{ flex: 1, marginLeft: 12 }}>
        <Text style={styles.draftTitle} numberOfLines={1}>{item.content || "No Content"}</Text>
        <Text style={styles.draftDate}>{new Date(item.created_at).toLocaleDateString()}</Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color="#CBD5E1" />
    </Pressable>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#1E293B" />
        </Pressable>
        <View style={{ marginLeft: 15 }}>
          <Text style={styles.headerTitle}>Claim Drafts</Text>
          <Text style={styles.headerSubtitle}>#{claimNumber}</Text>
        </View>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#276bbd" style={{ marginTop: 50 }} />
      ) : (
        <FlatList
          data={drafts}
          renderItem={renderDraft}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={{ padding: 20 }}
          ListEmptyComponent={
            <Text style={styles.emptyText}>No drafts generated for this claim yet.</Text>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  header: { flexDirection: 'row', alignItems: 'center', padding: 20, backgroundColor: '#FFF' },
  headerTitle: { fontSize: 20, fontWeight: '800', color: '#1E293B' },
  headerSubtitle: { fontSize: 14, color: '#64748B' },
  draftCard: { backgroundColor: '#FFF', padding: 15, borderRadius: 15, flexDirection: 'row', alignItems: 'center', marginBottom: 10, borderWidth: 1, borderColor: '#F1F5F9' },
  typeIndicator: { width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  draftTitle: { fontSize: 14, fontWeight: '700', color: '#334155' },
  draftDate: { fontSize: 12, color: '#94A3B8', marginTop: 2 },
  emptyText: { textAlign: 'center', color: '#94A3B8', marginTop: 40 }
});