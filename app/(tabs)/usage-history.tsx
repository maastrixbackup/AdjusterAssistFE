import { Feather, Ionicons } from "@expo/vector-icons";
import * as Haptics from 'expo-haptics';
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useMemo, useState } from "react";
import {
    ActivityIndicator,
    FlatList,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View,
    useWindowDimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

// Enterprise-Grade Strict Data Type Definition
type UsageLog = {
  id: string;
  action: string;
  workspaceName: string; // ✅ Added workspace context
  creditsUsed: number;
  timestamp: Date; // Scalable JavaScript Date object parsing
  type: "api_call" | "voice_to_text" | "pdf_generation";
};

type FilterType = "24h" | "week" | "month" | "year" | "all";

export default function UsageHistoryScreen() {
  const { height } = useWindowDimensions();
  const [loading] = useState(false);
  const [activeFilter, setActiveFilter] = useState<FilterType>("all");

  const TOTAL_QUOTA = 10000;
  const RENEWAL_DATE = "Jun 12, 2026";

  // Production Sample Resource Logs containing structural workspace allocations
  const [logs] = useState<UsageLog[]>([
    { id: "1", action: "Voice to text transcription", workspaceName: "Main Workspace", creditsUsed: 12, timestamp: new Date(2026, 4, 18, 14, 14), type: "voice_to_text" },
    { id: "2", action: "AI Claim Analysis API", workspaceName: "Florida Field Ops", creditsUsed: 15, timestamp: new Date(2026, 4, 17, 11, 45), type: "api_call" },
    { id: "3", action: "PDF Estimate Report Generation", workspaceName: "Main Workspace", creditsUsed: 8, timestamp: new Date(2026, 4, 15, 9, 12), type: "pdf_generation" },
    { id: "4", action: "Voice to text transcription", workspaceName: "Texas Commercial", creditsUsed: 4, timestamp: new Date(2026, 4, 12, 16, 30), type: "voice_to_text" },
  ]);

  // Utility logic to match filter calculations accurately
  const filteredLogs = useMemo(() => {
    const now = new Date();
    return logs.filter(log => {
      const diffTime = Math.abs(now.getTime() - log.timestamp.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (activeFilter === "24h") return diffDays <= 1;
      if (activeFilter === "week") return diffDays <= 7;
      if (activeFilter === "month") return diffDays <= 30;
      if (activeFilter === "year") return diffDays <= 365;
      return true;
    });
  }, [activeFilter, logs]);

  // Compute calculated metrics in real time based on active filters
  const totalCreditsUsed = useMemo(() => {
    return filteredLogs.reduce((sum, item) => sum + item.creditsUsed, 0);
  }, [filteredLogs]);

  const remainingCredits = TOTAL_QUOTA - totalCreditsUsed;

  const getIconConfig = (type: string) => {
    switch (type) {
      case "voice_to_text": return { name: "mic", color: "#2563EB", bg: "#EFF6FF" };
      case "pdf_generation": return { name: "file-text", color: "#EA580C", bg: "#FFF7ED" };
      default: return { name: "cpu", color: "#0D9488", bg: "#F0FDFA" };
    }
  };

  const formatLogDate = (date: Date) => {
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    }) + ` • ${date.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}`;
  };

  const handleFilterSelection = (filter: FilterType) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setActiveFilter(filter);
  };

  const renderLogItem = ({ item }: { item: UsageLog }) => {
    const iconConfig = getIconConfig(item.type);
    return (
      <View style={styles.logCard}>
        <View style={styles.logLeft}>
          <View style={[styles.logIconBox, { backgroundColor: iconConfig.bg }]}>
            <Feather name={iconConfig.name as any} size={16} color={iconConfig.color} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.logAction} numberOfLines={1}>{item.action}</Text>
            <View style={styles.metaRow}>
              <Feather name="briefcase" size={10} color="#94A3B8" />
              <Text style={styles.workspaceText} numberOfLines={1}>{item.workspaceName}</Text>
              <Text style={styles.bulletDivider}>•</Text>
              <Text style={styles.logDate}>{formatLogDate(item.timestamp)}</Text>
            </View>
          </View>
        </View>
        <View style={styles.creditBadge}>
          <Text style={styles.logCredits}>-{item.creditsUsed} cr</Text>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      {/* ══ ARC HEADER OVERHAUL ══════════════════════════════════════════ */}
      <View style={[styles.arcHeader, { height: Math.max(220, height * 0.28) }]}>
        <LinearGradient colors={["#276bbd", "#1e40af", "#172554"]} style={StyleSheet.absoluteFill} />
        <View style={[styles.bubble, { top: -20, right: -40, width: 200, height: 200 }]} />
        <View style={[styles.bubble, { bottom: -60, left: -30, width: 140, height: 140 }]} />

        <SafeAreaView edges={["top", "left", "right"]} style={styles.headerContent}>
          <View style={styles.topActionRow}>
            <Pressable onPress={() => router.back()} style={styles.backButton} hitSlop={12}>
              <Feather name="arrow-left" size={22} color="#fff" />
            </Pressable>
            <Text style={styles.arcTitle}>Usage History</Text>
            <View style={{ width: 40 }} />
          </View>
          <Text style={styles.arcSub}>Track account billing metrics and resource runs</Text>
        </SafeAreaView>
      </View>

      {/* ══ INTEGRATED SUBSCRIPTION STATS BLOCK ════════════════════════ */}
      <View style={[styles.body, { marginTop: -50 }]}>
        <View style={styles.summaryCard}>
          <View style={styles.metricsGrid}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>RUN IN PERIOD</Text>
              <Text style={styles.summaryValue}>{totalCreditsUsed}</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>REMAINING</Text>
              <Text style={[styles.summaryValue, { color: "#10B981" }]}>
                {remainingCredits.toLocaleString()}
              </Text>
            </View>
          </View>

          {/* Graphical Progress Bar Indicator */}
          <View style={styles.progressContainer}>
            <View style={[styles.progressBar, { width: `${(remainingCredits / TOTAL_QUOTA) * 100}%` }]} />
          </View>

          <View style={styles.renewalRow}>
            <Text style={styles.renewalText}>Next Renewal: <Text style={{ fontWeight: "700" }}>{RENEWAL_DATE}</Text></Text>
            <View style={styles.badgeContainer}>
              <Ionicons name="checkmark-circle" size={12} color="#16A34A" />
              <Text style={styles.badgeText}>Active Plan</Text>
            </View>
          </View>
        </View>

        {/* ══ TIMELINE FILTER STRIP ════════════════════════════════════ */}
        <View style={{ marginBottom: 16 }}>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false} 
            contentContainerStyle={styles.filterScroll}
          >
            {(["24h", "week", "month", "year", "all"] as FilterType[]).map((filter) => (
              <Pressable
                key={filter}
                onPress={() => handleFilterSelection(filter)}
                style={[styles.filterTab, activeFilter === filter && styles.filterTabActive]}
              >
                <Text style={[styles.filterTabText, activeFilter === filter && styles.filterTabTextActive]}>
                  {filter === "24h" ? "24 Hours" : filter.charAt(0).toUpperCase() + filter.slice(1)}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>

        {/* ══ HISTORY TIMELINE LIST ═══════════════════════════════════ */}
        <Text style={styles.sectionTitle}>Transaction Stream</Text>

        {loading ? (
          <ActivityIndicator size="large" color="#1e40af" style={{ marginTop: 40 }} />
        ) : (
          <FlatList
            data={filteredLogs}
            keyExtractor={(item) => item.id}
            renderItem={renderLogItem}
            contentContainerStyle={styles.listContainer}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Feather name="inbox" size={32} color="#94A3B8" />
                <Text style={styles.emptyText}>No resource logs match this timeline framework.</Text>
              </View>
            }
          />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8FAFC" },
  arcHeader: {
    borderBottomLeftRadius: 40,
    borderBottomRightRadius: 40,
    overflow: "hidden",
    minHeight: 180,
  },
  bubble: { position: "absolute", borderRadius: 999, backgroundColor: "rgba(255,255,255,0.06)" },
  headerContent: { paddingHorizontal: 20, paddingTop: Platform.OS === "android" ? 16 : 0 },
  topActionRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 12 },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  arcTitle: { fontSize: 22, fontWeight: "800", color: "#fff", letterSpacing: -0.5 },
  arcSub: { fontSize: 13, color: "rgba(255,255,255,0.65)", textAlign: "center", marginTop: 12, paddingHorizontal: 20 },
  body: { flex: 1, paddingHorizontal: 16 },
  
  // Dashboard Metrics Block Styles
  summaryCard: {
    backgroundColor: "#fff",
    borderRadius: 24,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    shadowColor: "#0F172A",
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 4,
  },
  metricsGrid: { flexDirection: "row", alignItems: "center" },
  summaryItem: { flex: 1, alignItems: "center" },
  summaryLabel: { color: "#94A3B8", fontSize: 10, marginBottom: 6, fontWeight: "800", letterSpacing: 0.5 },
  summaryValue: { color: "#0F172A", fontSize: 24, fontWeight: "800" },
  divider: { width: 1, backgroundColor: "#E2E8F0", height: "70%" },
  
  // Custom Progress Bar UI
  progressContainer: { height: 6, backgroundColor: "#E2E8F0", borderRadius: 3, marginTop: 18, overflow: "hidden" },
  progressBar: { height: "100%", backgroundColor: "#1E40AF", borderRadius: 3 },
  
  renewalRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 14 },
  renewalText: { fontSize: 12, color: "#64748B" },
  badgeContainer: { flexDirection: "row", alignItems: "center", backgroundColor: "#DCFCE7", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 99, gap: 4 },
  badgeText: { fontSize: 11, fontWeight: "700", color: "#15803D" },

  // Timeline Filter Control Strips
  filterScroll: { gap: 8, paddingRight: 20 },
  filterTab: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 99, backgroundColor: "#E2E8F0", borderWidth: 1, borderColor: "transparent" },
  filterTabActive: { backgroundColor: "#1E40AF", borderColor: "#1D4ED8" },
  filterTabText: { fontSize: 13, fontWeight: "600", color: "#475569" },
  filterTabTextActive: { color: "#fff" },

  sectionTitle: { fontSize: 11, fontWeight: "800", color: "#94A3B8", letterSpacing: 1, marginBottom: 12, marginLeft: 4, textTransform: "uppercase" },
  listContainer: { paddingBottom: 30 },
  
  // Operational Timeline Rows Layout
  logCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  logLeft: { flexDirection: "row", alignItems: "center", gap: 12, flex: 1 },
  logIconBox: { width: 40, height: 40, borderRadius: 12, justifyContent: "center", alignItems: "center" },
  logAction: { fontSize: 14, fontWeight: "700", color: "#0F172A", marginBottom: 3 },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  workspaceText: { fontSize: 12, fontWeight: "600", color: "#475569", maxWidth: 100 },
  bulletDivider: { fontSize: 11, color: "#94A3B8" },
  logDate: { fontSize: 11, color: "#64748B" },
  creditBadge: { backgroundColor: "#FEF2F2", paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10 },
  logCredits: { fontSize: 13, fontWeight: "800", color: "#EF4444" },
  
  emptyContainer: { alignItems: "center", justifyContent: "center", marginTop: 40, gap: 8 },
  emptyText: { textAlign: "center", color: "#64748B", fontSize: 13, paddingHorizontal: 32 },
});