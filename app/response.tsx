import { useMemo, useState } from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";

type OutputType = "email" | "file_note" | "escalation";

type Params = {
  text?: string;
  type?: string;
  outputType?: OutputType;
};

const fontRegular = "Roboto";
const fontMedium = "Roboto-Medium";
const fontBold = "Roboto-Bold";

const defaultLabels: Record<OutputType, string> = {
  email: "Email Response",
  file_note: "File Note",
  escalation: "Escalation Response",
};

export default function ResponseScreen() {
  const params = useLocalSearchParams<Params>();
  const insets = useSafeAreaInsets();
  const [copying, setCopying] = useState(false);

  const outputType = useMemo<OutputType>(() => {
    if (params.outputType === "email" || params.outputType === "file_note" || params.outputType === "escalation") {
      return params.outputType;
    }
    return "email";
  }, [params.outputType]);

  const responseTypeLabel = useMemo(
    () => params.type ?? defaultLabels[outputType],
    [params.type, outputType]
  );
  const responseText = useMemo(() => params.text ?? "No response available.", [params.text]);

  function onBack() {
    if (router.canGoBack()) {
      router.back();
      return;
    }
    router.replace("/(tabs)");
  }

  async function onCopy() {
    try {
      setCopying(true);
      await Clipboard.setStringAsync(responseText);
      Alert.alert("Copied", "Response copied to clipboard.");
    } catch {
      Alert.alert("Copy failed", "Could not copy response. Please try again.");
    } finally {
      setCopying(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe} edges={["left", "right", "bottom"]}>
      <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />
      <LinearGradient
        colors={["#0A4EA7", "#1E63B6", "#0B3E82"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.brandHeader, { paddingTop: insets.top + 10 }]}
      >
      
      <View style={styles.titleBar}>
        <Pressable onPress={onBack} style={styles.backButton}>
          <Ionicons name="chevron-back" size={24} color="#FFFFFF" />
          <Text style={styles.backText}>Back</Text>
        </Pressable>
        <Text style={styles.title}>Generated Output</Text>
        <View style={styles.titleSpacer} />
      </View>
      </LinearGradient>

      <View style={styles.metaWrap}>
        <Text style={styles.metaLabel}>Response Type</Text>
        <View style={styles.responseTypeChip}>
          <Text style={styles.responseTypeValue}>{responseTypeLabel}</Text>
        </View>
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        <View style={styles.responseCard}>
          <Text style={styles.bodyText}>{responseText}</Text>
        </View>

        <Pressable style={styles.copyButton} onPress={onCopy} disabled={copying}>
          <LinearGradient
            colors={["#0A4EA7", "#2B7DE3"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.copyGradient}
          >
            <Ionicons name="copy-outline" size={18} color="#FFFFFF" />
            <Text style={styles.copyButtonText}>{copying ? "Copying..." : "Copy Response"}</Text>
          </LinearGradient>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  brandHeader: {
    paddingHorizontal: 18,
    paddingTop: 10,
    paddingBottom: 14,
  },
  brandRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  brandLeft: {
    alignItems: "center",
    flexDirection: "row",
    gap: 10,
  },
  brandText: {
    color: "#FFFFFF",
    fontFamily: fontBold,
    fontSize: 22,
  },
  titleBar: {
    alignItems: "center",
    // backgroundColor: "#FFFFFF",
    // borderBottomColor: "#E4E8EF",
    // borderBottomWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    // minHeight: 66,
    // paddingHorizontal: 14,
  },
  backButton: {
    alignItems: "center",
    flexDirection: "row",
    minWidth: 82,
  },
  backText: {
    color: "#FFFFFF",
    fontFamily: fontMedium,
    fontSize: 18,
    marginLeft: 2,
  },
  title: {
    color: "#FFFFFF",
    fontFamily: fontBold,
    fontSize: 20,
  },
  titleSpacer: {
    minWidth: 82,
  },
  metaWrap: {
    backgroundColor: "#FFFFFF",
    borderBottomColor: "#E4E8EF",
    borderBottomWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  metaLabel: {
    color: "#11233E",
    fontFamily: fontMedium,
    fontSize: 14,
    marginBottom: 8,
  },
  responseTypeChip: {
    alignSelf: "flex-start",
    backgroundColor: "#EDF4FF",
    borderColor: "#9FB8DE",
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  responseTypeValue: {
    color: "#124A93",
    fontFamily: fontBold,
    fontSize: 13,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 24,
  },
  responseCard: {
    backgroundColor: "#F8FAFD",
    borderColor: "#DCE5F2",
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
  },
  bodyText: {
    color: "#1D2C44",
    fontFamily: fontRegular,
    fontSize: 16,
    lineHeight: 26,
  },
  copyButton: {
    borderRadius: 12,
    marginTop: 16,
    overflow: "hidden",
    shadowColor: "#0A4EA7",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.28,
    shadowRadius: 8,
    elevation: 2,
  },
  copyGradient: {
    alignItems: "center",
    borderRadius: 12,
    flexDirection: "row",
    gap: 8,
    justifyContent: "center",
    minHeight: 52,
  },
  copyButtonText: {
    color: "#FFFFFF",
    fontFamily: fontMedium,
    fontSize: 18,
  },
});
