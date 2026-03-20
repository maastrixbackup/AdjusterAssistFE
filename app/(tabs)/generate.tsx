import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Toast from "react-native-toast-message";

import {
  GenerateResponseRequest,
  OutputType,
  RecentDraft,
  SubscriptionStatus,
  generateResponse,
  getRecentDrafts,
  getSubscriptionStatus,
} from "@/lib/api";
import { useAuth } from "@/providers/auth-provider";

type OutputMode = "Email" | "File Note" | "Escalation";
const outputModes: OutputMode[] = ["Email", "File Note", "Escalation"];

const outputTypeMap: Record<OutputMode, OutputType> = {
  Email: "email",
  "File Note": "file",
  Escalation: "escalation",
};

export default function GenerateScreen() {
  const { token } = useAuth();
  const [selectedOutput, setSelectedOutput] = useState<OutputMode>("Email");
  const [request, setRequest] = useState("");
  const [claimDetails, setClaimDetails] = useState("");
  const [status, setStatus] = useState<SubscriptionStatus | null>(null);
  const [recentDrafts, setRecentDrafts] = useState<RecentDraft[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async () => {
    if (!token) return;
    try {
      const [statusData, draftsData] = await Promise.all([
        getSubscriptionStatus(token),
        getRecentDrafts(token, 1),
      ]);

      setStatus(statusData);
      setRecentDrafts(draftsData ?? []);
    } catch (err) {
      console.error("Fetch error:", err);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, [token]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const onGenerate = useCallback(async () => {
    if (!token) return router.replace("/login");

    if (!request.trim()) {
      Toast.show({
        type: "error",
        text1: "Content Required",
        text2: "Describe the scenario to generate a draft.",
      });
      return;
    }

    setIsGenerating(true);
    try {
      const payload: GenerateResponseRequest = {
        fileId: 1,
        type: outputTypeMap[selectedOutput],
        userInput: `${request.trim()}${
          claimDetails ? `\n\nContext: ${claimDetails.trim()}` : ""
        }`,
        shouldSave: true,
      };

      const result = await generateResponse(token, payload);

      router.push({
        pathname: "/response",
        params: {
          outputType: result.responseType,
          type: result.responseTypeLabel,
          text: result.responseText,
          fileId: result.fileId.toString(),
        },
      });

      setRequest("");
      setClaimDetails("");
      fetchData();
    } catch (error: any) {
      Toast.show({
        type: "error",
        text1: "Generation Failed",
        text2: error.message || "API Error",
      });
    } finally {
      setIsGenerating(false);
    }
  }, [token, request, claimDetails, selectedOutput, fetchData]);

  const getDraftIcon = (item: RecentDraft) => {
    const kind = item.draft_type?.toLowerCase?.() || item.content?.toLowerCase?.();

    if (kind === "email") return "mail-unread-outline";
    if (kind === "file") return "document-text-outline";
    if (kind === "escalation") return "alert-circle-outline";
    return "document-outline";
  };

  const getDraftLabel = (item: RecentDraft) => {
    return item.claim_number || item.content || "Draft";
  };

  if (isLoading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0F4C9C" />
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
        <SafeAreaView edges={["top"]} style={styles.safeHeader}>
          <View style={styles.navBar}>
            <Pressable onPress={() => router.back()} style={styles.iconBtn}>
              <Ionicons name="chevron-back" size={22} color="#FFFFFF" />
            </Pressable>

            <Text style={styles.navTitle}>AI Studio</Text>

            <View style={styles.creditBadge}>
              <View style={styles.statusDot} />
              <Text style={styles.creditValue}>
                {status?.subscription?.remaining ?? 0} Credits
              </Text>
            </View>
          </View>

          <View style={styles.heroCard}>
            <View style={styles.heroIconWrap}>
              <MaterialCommunityIcons name="robot-excited-outline" size={24} color="#FFFFFF" />
            </View>

            <View style={styles.heroContent}>
              <Text style={styles.heroTitle}>Generate premium claim drafts</Text>
              <Text style={styles.heroSubtitle}>
                Create polished emails, file notes, and escalations with structured AI assistance.
              </Text>
            </View>
          </View>
        </SafeAreaView>
      </LinearGradient>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                fetchData();
              }}
            />
          }
        >
          <Text style={styles.sectionLabel}>Select Output Mode</Text>

          <View style={styles.tabContainer}>
            {outputModes.map((mode) => {
              const isActive = mode === selectedOutput;
              return (
                <Pressable
                  key={mode}
                  onPress={() => setSelectedOutput(mode)}
                  style={[styles.tabItem, isActive && styles.tabItemActive]}
                >
                  <Text style={[styles.tabText, isActive && styles.tabTextActive]}>
                    {mode}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <View style={styles.glassCard}>
            <View style={styles.fieldGroup}>
              <View style={styles.fieldHeader}>
                <View style={styles.iconCircle}>
                  <MaterialCommunityIcons
                    name="text-box-search-outline"
                    size={16}
                    color="#0F4C9C"
                  />
                </View>
                <Text style={styles.inputLabel}>Scenario Description</Text>
              </View>

              <TextInput
                value={request}
                onChangeText={setRequest}
                multiline
                placeholder="Briefly describe what you want to achieve..."
                placeholderTextColor="#94A3B8"
                style={styles.mainTextInput}
              />
            </View>

            <View style={styles.cardDivider} />

            <View style={styles.fieldGroup}>
              <View style={styles.fieldHeader}>
                <View style={[styles.iconCircle, { backgroundColor: "#F1F5F9" }]}>
                  <MaterialCommunityIcons name="paperclip" size={16} color="#475569" />
                </View>
                <Text style={styles.inputLabel}>Policy Context (Optional)</Text>
              </View>

              <TextInput
                value={claimDetails}
                onChangeText={setClaimDetails}
                multiline
                placeholder="Add claim #, policy limits, or specific clauses..."
                placeholderTextColor="#94A3B8"
                style={styles.subTextInput}
              />
            </View>
          </View>

          <Pressable
            onPress={onGenerate}
            disabled={isGenerating}
            style={({ pressed }) => [
              styles.generateBtn,
              pressed && { transform: [{ scale: 0.98 }] },
            ]}
          >
            <LinearGradient
              colors={["#0F4C9C", "#1E3A8A"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.gradientBtn}
            >
              {isGenerating ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <>
                  <Text style={styles.btnText}>Draft Intelligence</Text>
                  <MaterialCommunityIcons name="auto-fix" size={20} color="#FFF" />
                </>
              )}
            </LinearGradient>
          </Pressable>

          <View style={styles.historyHeader}>
            <Text style={styles.historyTitle}>Recent Generations</Text>
            <Pressable onPress={() => router.push("/")}>
              <Ionicons name="grid-outline" size={18} color="#0F4C9C" />
            </Pressable>
          </View>

          <View style={styles.historyList}>
            {recentDrafts.map((item) => (
              <View key={item.id} style={styles.historyItem}>
                <View style={styles.historyIconBox}>
                  <Ionicons
                    name={getDraftIcon(item) as any}
                    size={20}
                    color="#0F4C9C"
                  />
                </View>

                <View style={styles.historyContent}>
                  <Text style={styles.historyTypeTag}>{getDraftLabel(item)}</Text>
                  <Text style={styles.historyText} numberOfLines={1}>
                    {item.content || item.content || "Processing draft..."}
                  </Text>
                </View>

                <Ionicons name="chevron-forward" size={16} color="#CBD5E1" />
              </View>
            ))}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  mainContainer: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#FFF",
  },
  headerGradient: {
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    overflow: "hidden",
  },
  safeHeader: {
    paddingHorizontal: 18,
    paddingBottom: 18,
  },
  navBar: {
    minHeight: 64,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  iconBtn: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.12)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.18)",
  },
  navTitle: {
    fontSize: 19,
    fontWeight: "800",
    color: "#FFFFFF",
    letterSpacing: -0.4,
  },
  creditBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(255,255,255,0.14)",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.18)",
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: "#22C55E",
  },
  creditValue: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "800",
  },
  heroCard: {
    marginTop: 18,
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "rgba(255,255,255,0.10)",
    borderRadius: 24,
    padding: 18,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
  },
  heroIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.14)",
    marginRight: 14,
  },
  heroContent: {
    flex: 1,
  },
  heroTitle: {
    color: "#FFFFFF",
    fontSize: 20,
    fontWeight: "800",
    lineHeight: 25,
  },
  heroSubtitle: {
    marginTop: 6,
    color: "rgba(255,255,255,0.80)",
    fontSize: 13,
    lineHeight: 20,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: "800",
    color: "#94A3B8",
    textTransform: "uppercase",
    letterSpacing: 1.5,
    marginBottom: 14,
    marginLeft: 4,
    marginTop: 6,
  },
  tabContainer: {
    flexDirection: "row",
    backgroundColor: "#E2E8F0",
    borderRadius: 18,
    padding: 6,
    marginBottom: 28,
  },
  tabItem: {
    flex: 1,
    paddingVertical: 12,
    alignItems: "center",
    borderRadius: 14,
  },
  tabItemActive: {
    backgroundColor: "#FFF",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 4,
  },
  tabText: {
    fontSize: 14,
    color: "#64748B",
    fontWeight: "600",
  },
  tabTextActive: {
    color: "#0F4C9C",
    fontWeight: "800",
  },
  glassCard: {
    backgroundColor: "#FFF",
    borderRadius: 28,
    padding: 20,
    borderWidth: 1,
    borderColor: "#FFF",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.06,
    shadowRadius: 24,
    elevation: 2,
  },
  fieldGroup: {
    marginVertical: 4,
  },
  fieldHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 12,
  },
  iconCircle: {
    width: 28,
    height: 28,
    borderRadius: 10,
    backgroundColor: "#EEF2FF",
    alignItems: "center",
    justifyContent: "center",
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1E293B",
  },
  mainTextInput: {
    fontSize: 16,
    color: "#334155",
    minHeight: 60,
    textAlignVertical: "top",
    lineHeight: 22,
  },
  cardDivider: {
    height: 1,
    backgroundColor: "#F1F5F9",
    marginVertical: 20,
    marginHorizontal: -10,
  },
  subTextInput: {
    fontSize: 15,
    color: "#475569",
    minHeight: 20,
    textAlignVertical: "top",
    lineHeight: 20,
  },
  generateBtn: {
    marginTop: 30,
    borderRadius: 20,
    overflow: "hidden",
    shadowColor: "#0F4C9C",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 15,
    elevation: 8,
  },
  gradientBtn: {
    height: 64,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  btnText: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  historyHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 40,
    marginBottom: 20,
  },
  historyTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#0F172A",
    letterSpacing: -0.3,
  },
  historyList: {
    gap: 14,
  },
  historyItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF",
    padding: 14,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#F1F5F9",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.02,
    shadowRadius: 4,
  },
  historyIconBox: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#EAF2FF",
  },
  historyContent: {
    flex: 1,
    marginLeft: 16,
  },
  historyTypeTag: {
    fontSize: 10,
    fontWeight: "900",
    color: "#94A3B8",
    letterSpacing: 1,
    marginBottom: 4,
    textTransform: "uppercase",
  },
  historyText: {
    fontSize: 14,
    color: "#1E293B",
    fontWeight: "600",
  },
});