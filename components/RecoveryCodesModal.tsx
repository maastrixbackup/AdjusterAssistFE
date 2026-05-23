import * as Clipboard from "expo-clipboard";
import * as Haptics from "expo-haptics";
import {
    ActivityIndicator,
    Modal,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from "react-native";

import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { toast } from "sonner-native";

type Props = {
  visible: boolean;
  codes: string[];
  loading?: boolean;
  onContinue: () => void;
};

export default function RecoveryCodesModal({
  visible,
  codes,
  loading,
  onContinue,
}: Props) {
  async function handleCopyAll() {
    try {
      await Clipboard.setStringAsync(codes.join("\n"));

      Haptics.notificationAsync(
        Haptics.NotificationFeedbackType.Success,
      );

      toast.success("Recovery codes copied", {
        description:
          "Store them securely. Each code can only be used once.",
      });
    } catch {
      toast.error("Unable to copy recovery codes");
    }
  }

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.card}>
          <View style={styles.iconWrap}>
            <Feather name="shield" size={28} color="#1e40af" />
          </View>

          <Text style={styles.title}>Save Your Recovery Codes</Text>

          <Text style={styles.subtitle}>
            These backup codes let you access your account if you lose
            your authenticator device.
          </Text>

          <View style={styles.warningBox}>
            <Feather
              name="alert-triangle"
              size={16}
              color="#b45309"
            />

            <Text style={styles.warningText}>
              Each recovery code works only once.
            </Text>
          </View>

          <ScrollView
            style={styles.codesContainer}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.codesGrid}>
              {codes.map((code, index) => (
                <View key={code} style={styles.codeItem}>
                  <Text style={styles.codeIndex}>
                    {index + 1}.
                  </Text>

                  <Text style={styles.codeText}>{code}</Text>
                </View>
              ))}
            </View>
          </ScrollView>

          <Pressable
            style={styles.copyButton}
            onPress={handleCopyAll}
          >
            <Feather name="copy" size={16} color="#1e40af" />
            <Text style={styles.copyButtonText}>
              Copy Recovery Codes
            </Text>
          </Pressable>

          <Pressable
            style={styles.continueButton}
            onPress={onContinue}
            disabled={loading}
          >
            <LinearGradient
              colors={["#1e40af", "#1e3a8a"]}
              style={styles.continueGradient}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Text style={styles.continueText}>
                    I Have Saved These Codes
                  </Text>

                  <Feather
                    name="arrow-right"
                    size={16}
                    color="#fff"
                  />
                </>
              )}
            </LinearGradient>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(15,23,42,0.72)",
    justifyContent: "center",
    paddingHorizontal: 20,
  },

  card: {
    backgroundColor: "#fff",
    borderRadius: 30,
    padding: 24,
    maxHeight: "88%",
  },

  iconWrap: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: "#EFF6FF",
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
    marginBottom: 18,
  },

  title: {
    fontSize: 24,
    fontWeight: "800",
    color: "#0F172A",
    textAlign: "center",
  },

  subtitle: {
    marginTop: 10,
    textAlign: "center",
    color: "#64748B",
    lineHeight: 22,
    fontSize: 14,
  },

  warningBox: {
    marginTop: 18,
    backgroundColor: "#FFFBEB",
    borderRadius: 16,
    padding: 14,
    flexDirection: "row",
    gap: 10,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#FDE68A",
  },

  warningText: {
    flex: 1,
    color: "#92400E",
    fontWeight: "600",
    fontSize: 13,
  },

  codesContainer: {
    marginTop: 18,
    maxHeight: 280,
  },

  codesGrid: {
    gap: 12,
  },

  codeItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },

  codeIndex: {
    width: 26,
    color: "#64748B",
    fontWeight: "700",
  },

  codeText: {
    flex: 1,
    color: "#0F172A",
    fontWeight: "800",
    letterSpacing: 1.2,
    fontSize: 15,
  },

  copyButton: {
    marginTop: 18,
    height: 52,
    borderRadius: 16,
    backgroundColor: "#EFF6FF",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 10,
  },

  copyButtonText: {
    color: "#1e40af",
    fontWeight: "800",
  },

  continueButton: {
    overflow: "hidden",
    borderRadius: 18,
    marginTop: 16,
  },

  continueGradient: {
    height: 58,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 10,
  },

  continueText: {
    color: "#fff",
    fontWeight: "800",
    fontSize: 15,
  },
});