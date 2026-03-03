import React, { useState } from "react";
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { StatusBar } from "expo-status-bar";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";

type OutputMode = "Email" | "File Note" | "Escalation";

const outputModes: OutputMode[] = ["Email", "File Note", "Escalation"];

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

const fontRegular = Platform.select({
  ios: "AvenirNext-Regular",
  android: "sans-serif",
  default: "System",
});

const fontMedium = Platform.select({
  ios: "AvenirNext-Medium",
  android: "sans-serif-medium",
  default: "System",
});

const fontDemi = Platform.select({
  ios: "AvenirNext-DemiBold",
  android: "sans-serif-medium",
  default: "System",
});

const fontBold = Platform.select({
  ios: "AvenirNext-Bold",
  android: "sans-serif",
  default: "System",
});

export default function HomeScreen() {
  const [selectedOutput, setSelectedOutput] = useState<OutputMode>("Email");
  const [request, setRequest] = useState("");
  const [claimDetails, setClaimDetails] = useState("");

  const logo = require("../../assets/images/AdjusterAssist1.png");

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
                        index === outputModes.length - 1 && styles.segmentLastButton,
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

              <Pressable style={styles.generateWrap}>
                <LinearGradient
                  colors={["#0549a1", "#1E63B6"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.generate}
                >
                  <Text style={styles.generateText}>Generate Response</Text>
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
                      <Text style={styles.cardTitleStrong}>
                        {item.type}{" "}
                      </Text>
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
                  <Ionicons
                    name="chevron-forward"
                    size={30}
                    color="#30496E"
                  />
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
    paddingHorizontal: 18,
    paddingTop: 6,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#D7DEE8",
  },

  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  logo: {
    width: 200,
    height: 52,
    resizeMode: "contain",
  },

  bellWrap: {
    position: "relative",
    width: 44,
    alignItems: "center",
  },

  badge: {
    position: "absolute",
    right: -2,
    top: -3,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#F04E2A",
    borderWidth: 2,
    borderColor: "#1A5CC8",
    alignItems: "center",
    justifyContent: "center",
  },

  badgeText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontFamily: fontBold,
  },

  content: {
    flex: 1,
    backgroundColor: "#F3F5F8",
  },

  contentContainer: {
    paddingBottom: 24,
  },

  section: {
    paddingHorizontal: 18,
    paddingTop: 20,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#DCE2EB",
  },

  sectionTitle: {
    color: "#2A3F5F",
    fontSize: 18,
    marginBottom: 10,
    fontFamily: fontBold,
    fontWeight: "700",
  },

  optional: {
    color: "#435774",
    fontFamily: fontRegular,
  },

  segmented: {
    flexDirection: "row",
    borderRadius: 8,
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

  // segmentButtonActive: {
  //   backgroundColor: "#1D80CF",
  // },
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
    fontSize: 16,
    color: "#2C4262",
    fontFamily: fontDemi,
  },

  segmentTextActive: {
    color: "#FFFFFF",
  },

  textArea: {
    borderWidth: 1,
    borderColor: "#BCC7D6",
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: "#FFFFFF",
    textAlignVertical: "top",
    color: "#2D4262",
    fontSize: 17,
    fontFamily: fontRegular,
    fontStyle: "italic",
  },

  requestArea: {
    minHeight: 130,
  },

  claimArea: {
    minHeight: 74,
    marginBottom: 14,
  },

  generateWrap: {
    borderRadius: 8,
    overflow: "hidden",
  },

  generate: {
    height: 55,
    alignItems: "center",
    justifyContent: "center",
  },

  generateText: {
    color: "#FFFFFF",
    fontSize: 18,
    fontFamily: fontBold,
  },

  cardsWrap: {
    paddingHorizontal: 18,
    paddingTop: 8,
    gap: 12,
  },

  card: {
    borderWidth: 1,
    borderColor: "#D3DAE6",
    borderRadius: 8,
    backgroundColor: "#FFFFFF",
    minHeight: 82,
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  cardTextWrap: {
    flex: 1,
    paddingRight: 8,
  },

  cardTitle: {
    color: "#2B4062",
    fontSize: 15,
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
    fontStyle: "italic",
  },

  cardDate: {
    marginTop: 5,
    color: "#556784",
    fontSize: 14,
    fontFamily: fontRegular,
  },
});