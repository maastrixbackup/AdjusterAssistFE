import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useEffect, useState } from "react";
import {
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

import {
  generateResponse,
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
    date: "Mar 12, 2024",
    italicSubject: false,
  },
  {
    id: "2",
    type: "File Note:",
    subject: "Water Damage Assessment",
    date: "Mar 10, 2024",
    italicSubject: true,
  },
];

const fontRegular = "Roboto";

const fontMedium = "Roboto-Medium";
const fontDemi = "Roboto-Medium";
const fontBold = "Roboto-Bold";

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
      if (!token) {
        return;
      }
      try {
        const next = await getSubscriptionStatus(token);
        if (mounted) {
          setStatus(next);
        }
      } catch {
        if (mounted) {
          setStatus(null);
        }
      }
    }
    loadStatus();
    return () => {
      mounted = false;
    };
  }, [token]);

  async function onGenerate() {
    if (!token) {
      return;
    }
    if (!request.trim()) {
      Alert.alert("Missing input", "Please enter your request.");
      return;
    }
    if (status && !status.subscription.remaining) {
      Alert.alert(
        "Limit reached",
        "You reached your monthly free-tier limit. Please upgrade.",
      );
      return;
    }

    setIsGenerating(true);
    try {
      const result = await generateResponse(token, {
        type: outputTypeMap[selectedOutput],
      });

      router.push({
        pathname: "/response",
        params: {
          outputType: result.responseType,
          type: result.responseTypeLabel,
          text: result.responseText,
        },
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to generate response";
      Alert.alert("Generation failed", message);
    } finally {
      setIsGenerating(false);
    }
  }

  return (
    <>
      <StatusBar style="light" translucent />
      <LinearGradient
        colors={["#276bbd", "#0B3C7A"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={{ flex: 1 }}
      >
        <SafeAreaView edges={["top"]} style={styles.safe}>
          <View style={styles.header}>
            <View style={styles.headerRow}>
              <Image source={logo} style={styles.logo} />
              <View style={styles.bellWrap}>
                <Ionicons name="notifications" size={36} color="#FFFFFF" />
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>2</Text>
                </View>
              </View>
            </View>
          </View>
          <ScrollView
            style={styles.content}
            contentContainerStyle={styles.contentContainer}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Select Output Type</Text>
              <View style={styles.segmented}>
                {outputModes.map((mode, index) => {
                  const active = mode === selectedOutput;

                  const ButtonContent = (
                    <>
                      {mode === "Email" && (
                        <Ionicons
                          name="mail"
                          size={20}
                          color={active ? "#FFFFFF" : "#314A6F"}
                        />
                      )}
                      {mode === "File Note" && (
                        <MaterialCommunityIcons
                          name="file-document-outline"
                          size={20}
                          color={active ? "#FFFFFF" : "#314A6F"}
                        />
                      )}
                      {mode === "Escalation" && (
                        <MaterialCommunityIcons
                          name="alert-circle-outline"
                          size={20}
                          color={active ? "#FFFFFF" : "#314A6F"}
                        />
                      )}
                      <Text
                        style={[
                          styles.segmentText,
                          active && styles.segmentTextActive,
                        ]}
                      >
                        {mode}
                      </Text>
                    </>
                  );

                  return (
                    <Pressable
                      key={mode}
                      onPress={() => setSelectedOutput(mode)}
                      style={[
                        styles.segmentButton,
                        index === outputModes.length - 1 &&
                          styles.segmentLastButton,
                      ]}
                    >
                      {active ? (
                        <LinearGradient
                          colors={["#0549a1", "#1E63B6"]}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 0 }}
                          style={styles.segmentGradient}
                        >
                          {ButtonContent}
                        </LinearGradient>
                      ) : (
                        ButtonContent
                      )}
                    </Pressable>
                  );
                })}
              </View>
            </View>
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Enter Your Request</Text>
              <TextInput
                value={request}
                onChangeText={setRequest}
                multiline
                placeholder="Respond to insured about roof inspection findings..."
                placeholderTextColor="#4B5D78"
                style={[styles.textArea, styles.requestArea]}
              />
            </View>
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>
                Claim Details <Text style={styles.optional}>(Optional)</Text>
              </Text>
              <TextInput
                value={claimDetails}
                onChangeText={setClaimDetails}
                multiline
                placeholder="Provide any relevant claim information here..."
                placeholderTextColor="#4B5D78"
                style={[styles.textArea, styles.claimArea]}
              />

              <Pressable
                style={styles.generateWrap}
                onPress={onGenerate}
                disabled={isGenerating}
              >
                <LinearGradient
                  colors={["#0549a1", "#1E63B6"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.generate}
                >
                  <Text style={styles.generateText}>
                    {isGenerating ? "Generating..." : "Generate Response"}
                  </Text>
                </LinearGradient>
              </Pressable>
            </View>
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Recent Responses</Text>
            </View>

            <View style={styles.cardsWrap}>
              {recentResponses.map((item) => (
                <Pressable key={item.id} style={styles.card}>
                  <View style={styles.cardTextWrap}>
                    <Text style={styles.cardTitle}>
                      <Text style={styles.cardTitleStrong}>{item.type} </Text>
                      <Text
                        style={
                          item.italicSubject
                            ? styles.cardTitleItalic
                            : styles.cardTitleNormal
                        }
                      >
                        {item.subject}
                      </Text>
                    </Text>
                    <Text style={styles.cardDate}>{item.date}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={30} color="#30496E" />
                </Pressable>
              ))}
            </View>
          </ScrollView>
        </SafeAreaView>
      </LinearGradient>
    </>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "transparent",
  },
  header: {
    height: 64,
    paddingHorizontal: 16,
    justifyContent: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#D7DEE8",
  },

  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  logo: {
    width: 180,
    height: 40,
    resizeMode: "contain",
  },

  bellWrap: {
    position: "relative",
    width: 36,
    alignItems: "center",
  },

  badge: {
    position: "absolute",
    right: -2,
    top: -3,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "#F04E2A",
    borderWidth: 2,
    borderColor: "#1A5CC8",
    alignItems: "center",
    justifyContent: "center",
  },

  badgeText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontFamily: fontBold,
  },

  content: {
    flex: 1,
    backgroundColor: "#F3F5F8",
  },

  contentContainer: {
    paddingBottom: 16,
  },

  section: {
    paddingHorizontal: 14,
    paddingTop: 14,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#DCE2EB",
  },

  sectionTitle: {
    color: "#2A3F5F",
    fontSize: 15,
    marginBottom: 8,
    fontFamily: fontBold,
    fontWeight: "700",
  },

  optional: {
    color: "#435774",
    fontFamily: fontRegular,
  },

  segmented: {
    flexDirection: "row",
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#B5C1D1",
    overflow: "hidden",
    backgroundColor: "#FFFFFF",
  },

  segmentButton: {
    flex: 1,
    height: 40,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRightWidth: 1,
    borderRightColor: "#C5CFDC",
  },

  segmentGradient: {
    flex: 1,
    width: "100%",
    height: "100%",
    borderRadius: 0,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },

  segmentLastButton: {
    borderRightWidth: 0,
  },

  segmentText: {
    fontSize: 13,
    color: "#2C4262",
    fontFamily: fontDemi,
  },

  segmentTextActive: {
    color: "#FFFFFF",
  },

  textArea: {
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: "#FFFFFF",
    shadowColor: "#0B1A33",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
    textAlignVertical: "top",
    color: "#2D4262",
    fontSize: 12,
    fontFamily: fontRegular,
    // fontStyle: "italic",
  },

  requestArea: {
    minHeight: 130,
  },

  claimArea: {
    minHeight: 64,
    marginBottom: 10,
  },

  generateWrap: {
    borderRadius: 6,
    overflow: "hidden",
  },

  generate: {
    minHeight: 42,
    paddingVertical: 10,
    alignItems: "center",
    justifyContent: "center",
  },

  generateText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontFamily: fontBold,
  },

  cardsWrap: {
    paddingHorizontal: 14,
    paddingTop: 14,
    gap: 14,
  },

  card: {
    borderRadius: 6,
    backgroundColor: "#FFFFFF",
    shadowColor: "#0B1A33",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
    minHeight: 64,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  cardTextWrap: {
    flex: 1,
    paddingRight: 6,
  },

  cardTitle: {
    color: "#2B4062",
    fontSize: 13,
    fontFamily: fontRegular,
  },

  cardTitleStrong: {
    fontFamily: fontBold,
  },

  cardTitleNormal: {
    fontFamily: fontMedium,
  },

  cardTitleItalic: {
    fontFamily: fontMedium,
    // fontStyle: "italic",
  },

  cardDate: {
    marginTop: 4,
    color: "#556784",
    fontSize: 12,
    fontFamily: fontRegular,
  },
});
