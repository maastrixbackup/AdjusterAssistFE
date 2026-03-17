import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Toast from 'react-native-toast-message';

import {
  generateResponse,
  GenerateResponseRequest,
  getSubscriptionStatus,
  OutputType,
  SubscriptionStatus,
} from "@/lib/api";
import { useAuth } from "@/providers/auth-provider";

type OutputMode = "Email" | "File Note" | "Escalation";

const outputModes: OutputMode[] = ["Email", "File Note", "Escalation"];
const outputTypeMap: Record<OutputMode, OutputType> = {
  Email: "email",
  "File Note": "file",
  Escalation: "escalation",
};

const recentResponses = [
  {
    id: "1",
    type: "Email Response:",
    subject: "Roof Inspection Summary",
    date: "Mar 12, 2026",
    italicSubject: false,
  },
  {
    id: "2",
    type: "File Note:",
    subject: "Water Damage Assessment",
    date: "Mar 10, 2026",
    italicSubject: true,
  },
];

export default function HomeScreen() {
  const { token } = useAuth();
  const [selectedOutput, setSelectedOutput] = useState<OutputMode>("Email");
  const [request, setRequest] = useState("");
  const [claimDetails, setClaimDetails] = useState("");
  const [status, setStatus] = useState<SubscriptionStatus | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const logo = require("../../assets/images/AdjusterAssist1.png");

  useEffect(() => {
    let mounted = true;
    async function loadStatus() {
      if (!token) return;
      try {
        const next = await getSubscriptionStatus(token);
        if (mounted) setStatus(next);
      } catch {
        if (mounted) setStatus(null);
      }
    }
    loadStatus();
    return () => { mounted = false; };
  }, [token]);

  async function onGenerate() {
    if (!token) return;

    // 1. Validation
    if (!request.trim()) {
      Toast.show({
        type: 'error',
        text1: 'Input Required',
        text2: 'Please describe what you need to generate.'
      });
      return;
    }

    // 2. Local Credit Check
    if (status && status.subscription.remaining <= 0) {
      Alert.alert(
        "No Credits Remaining",
        "You have used all your credits for this month.",
        [{ text: "Upgrade Now", onPress: () => router.push("/settings") }, { text: "Cancel" }]
      );
      return;
    }

    setIsGenerating(true);
    try {
      // Mapping to required backend structure
      const payload: GenerateResponseRequest = {
        fileId: 1,
        type: outputTypeMap[selectedOutput],
        userInput: `${request.trim()}${claimDetails ? ` \n\nDetails: ${claimDetails.trim()}` : ""}`,
        shouldSave: true
      };

      const result = await generateResponse(token, payload);

      /**
       * UPDATED: Passing the actual draft text to the response screen.
       * generateResponse in api.ts should now return result.responseText 
       * extracted from res.data.content.
       */
      router.push({
        pathname: "/response",
        params: {
          outputType: result.responseType,
          type: result.responseTypeLabel,
          text: result.responseText, 
        },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to generate response";

      if (message.includes("credits") || message.includes("plan")) {
        Alert.alert("Subscription Notice", message);
      } else {
        Toast.show({ type: 'error', text1: 'Generation Failed', text2: message });
      }
    } finally {
      setIsGenerating(false);
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: "#F3F5F8" }}>
      <StatusBar style="light" translucent />

      <LinearGradient
        colors={["#276bbd", "#0B3C7A"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.headerGradient}
      >
        <SafeAreaView edges={["top"]} style={styles.headerContent}>
          <View style={styles.headerRow}>
            <Image source={logo} style={styles.logo} />
            <View style={styles.headerActions}>
              <View style={styles.creditPill}>
                <Text style={styles.creditText}>
                  {status ? `${status.subscription.remaining} Credits` : "---"}
                </Text>
              </View>
              <Pressable style={styles.bellWrap}>
                <Ionicons name="notifications-outline" size={28} color="#FFFFFF" />
                <View style={styles.badge}><Text style={styles.badgeText}>2</Text></View>
              </Pressable>
            </View>
          </View>
        </SafeAreaView>
      </LinearGradient>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.cardSection}>
          <Text style={styles.sectionTitle}>1. Select Output Type</Text>
          <View style={styles.segmented}>
            {outputModes.map((mode) => {
              const active = mode === selectedOutput;
              return (
                <Pressable
                  key={mode}
                  onPress={() => setSelectedOutput(mode)}
                  style={[styles.segmentButton, active && styles.segmentButtonActive]}
                >
                  <Text style={[styles.segmentText, active && styles.segmentTextActive]}>{mode}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={styles.cardSection}>
          <Text style={styles.sectionTitle}>2. Response Request</Text>
          <TextInput
            value={request}
            onChangeText={setRequest}
            multiline
            placeholder="e.g., The carrier is delaying payment on Claim #4451..."
            placeholderTextColor="#94A3B8"
            style={[styles.textArea, styles.requestArea]}
          />

          <Text style={[styles.sectionTitle, { marginTop: 20 }]}>
            3. Claim Details <Text style={styles.optional}>(Optional)</Text>
          </Text>
          <TextInput
            value={claimDetails}
            onChangeText={setClaimDetails}
            multiline
            placeholder="Property details or specific loss notes..."
            placeholderTextColor="#94A3B8"
            style={[styles.textArea, styles.claimArea]}
          />

          <Pressable
            style={({ pressed }) => [
              styles.generateButton,
              (isGenerating || pressed) && { opacity: 0.9 },
              isGenerating && { backgroundColor: '#64748B' }
            ]}
            onPress={onGenerate}
            disabled={isGenerating}
          >
            {isGenerating ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <>
                <MaterialCommunityIcons name="star-box-multiple" size={20} color="#FFF" style={{ marginRight: 8 }} />
                <Text style={styles.generateText}>Generate AI Draft</Text>
              </>
            )}
          </Pressable>
        </View>

        <View style={styles.recentHeader}>
          <Text style={styles.sectionTitle}>Recent Activity</Text>
          <Pressable><Text style={styles.viewAll}>View All</Text></Pressable>
        </View>

        <View style={styles.cardsWrap}>
          {recentResponses.map((item) => (
            <Pressable key={item.id} style={styles.card}>
              <View style={styles.cardIcon}>
                <Ionicons name={item.type.includes("Email") ? "mail" : "document-text"} size={20} color="#276bbd" />
              </View>
              <View style={styles.cardTextWrap}>
                <Text style={styles.cardTitle} numberOfLines={1}>
                  <Text style={styles.cardTitleStrong}>{item.type}</Text> {item.subject}
                </Text>
                <Text style={styles.cardDate}>{item.date}</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#CBD5E1" />
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  headerGradient: {
    paddingBottom: 20,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  headerContent: {
    paddingHorizontal: 20,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 10,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 15,
  },
  logo: {
    width: 140,
    height: 40,
    resizeMode: "contain",
  },
  creditPill: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  creditText: {
    color: '#f3e353',
    fontSize: 12,
    fontWeight: '700',
  },
  bellWrap: {
    position: "relative",
  },
  badge: {
    position: "absolute",
    right: -2,
    top: -2,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: "#EF4444",
    borderWidth: 2,
    borderColor: "#0B3C7A",
    alignItems: "center",
    justifyContent: "center",
  },
  badgeText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "800",
  },
  content: {
    flex: 1,
    marginTop: -10,
  },
  contentContainer: {
    paddingBottom: 30,
    paddingHorizontal: 16,
  },
  cardSection: {
    backgroundColor: '#FFF',
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  sectionTitle: {
    color: "#1E293B",
    fontSize: 14,
    fontWeight: "800",
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  optional: {
    color: "#94A3B8",
    fontSize: 12,
    fontWeight: '400',
  },
  segmented: {
    flexDirection: "row",
    backgroundColor: "#F1F5F9",
    borderRadius: 12,
    padding: 4,
  },
  segmentButton: {
    flex: 1,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
  },
  segmentButtonActive: {
    backgroundColor: "#FFF",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  segmentText: {
    fontSize: 13,
    color: "#64748B",
    fontWeight: "600",
  },
  segmentTextActive: {
    color: "#0F172A",
    fontWeight: "800",
  },
  textArea: {
    borderRadius: 12,
    padding: 15,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: '#E2E8F0',
    color: "#1E293B",
    fontSize: 14,
    textAlignVertical: "top",
  },
  requestArea: { minHeight: 120 },
  claimArea: { minHeight: 80 },
  generateButton: {
    backgroundColor: "#276bbd",
    height: 54,
    borderRadius: 15,
    marginTop: 20,
    flexDirection: 'row',
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#276bbd",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  generateText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "800",
  },
  recentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
    paddingHorizontal: 4,
  },
  viewAll: {
    color: '#276bbd',
    fontWeight: '700',
    fontSize: 13,
  },
  cardsWrap: {
    marginTop: 12,
    gap: 12,
  },
  card: {
    borderRadius: 16,
    backgroundColor: "#FFFFFF",
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  cardIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  cardTextWrap: {
    flex: 1,
  },
  cardTitle: {
    color: "#334155",
    fontSize: 14,
    fontWeight: '500',
  },
  cardTitleStrong: {
    fontWeight: "800",
    color: '#1E293B',
  },
  cardDate: {
    marginTop: 2,
    color: "#94A3B8",
    fontSize: 12,
  },
});