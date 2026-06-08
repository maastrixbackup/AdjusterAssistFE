import { BlurView } from "expo-blur";
import * as Haptics from "expo-haptics";
import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from "react-native";

interface Props {
  visible: boolean;
  loading?: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void> | void;
}

export default function DeleteAccountModal({
  visible,
  loading = false,
  onClose,
  onConfirm,
}: Props) {
  const { width } = useWindowDimensions();
  const isTablet = width >= 768;

  const [confirmation, setConfirmation] = useState("");

  const canDelete = useMemo(
    () => confirmation.trim().toUpperCase() === "DELETE",
    [confirmation],
  );

  const handleClose = () => {
    if (loading) return;
    setConfirmation("");
    onClose();
  };

  const handleConfirm = async () => {
    if (!canDelete || loading) return;

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    await onConfirm();
    setConfirmation("");
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={handleClose}
    >
      <BlurView intensity={35} tint="dark" style={StyleSheet.absoluteFill} />

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.overlay}
      >
        <Pressable style={StyleSheet.absoluteFill} onPress={handleClose} />

        <View style={[styles.card, isTablet && styles.tabletCard]}>
          <View style={styles.warningIcon}>
            <Text style={styles.warningSymbol}>!</Text>
          </View>

          <Text style={styles.title}>Request Account Deletion?</Text>

          <Text style={styles.description}>
            Deletion may remove your profile, workspaces, conversations, uploaded files, usage history, MFA settings, and other app-related content.
            Certain records may be retained where required or permitted for legal, security, billing, fraud prevention, compliance, dispute resolution, or operational purposes.
          </Text>

          <View style={styles.noticeBox}>
            <Text style={styles.noticeText}>
              Type <Text style={styles.noticeStrong}>DELETE</Text> below submit your account deletion request.
            </Text>
          </View>

          <TextInput
            value={confirmation}
            onChangeText={setConfirmation}
            autoCapitalize="characters"
            autoCorrect={false}
            editable={!loading}
            placeholder="DELETE"
            placeholderTextColor="#94A3B8"
            style={[
              styles.input,
              confirmation.length > 0 && !canDelete && styles.inputWarning,
              canDelete && styles.inputReady,
            ]}
          />

          <View style={styles.actions}>
            <Pressable
              style={({ pressed }) => [
                styles.cancelButton,
                pressed && { opacity: 0.75 },
              ]}
              onPress={handleClose}
              disabled={loading}
            >
              <Text style={styles.cancelText}>Cancel</Text>
            </Pressable>

            <Pressable
              disabled={!canDelete || loading}
              style={({ pressed }) => [
                styles.deleteButton,
                (!canDelete || loading) && styles.deleteButtonDisabled,
                pressed && canDelete && { opacity: 0.9 },
              ]}
              onPress={handleConfirm}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.deleteText}>Request Deletion</Text>
              )}
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(15,23,42,0.42)",
    justifyContent: "center",
    paddingHorizontal: 22,
  },
  card: {
    width: "100%",
    backgroundColor: "rgba(255,255,255,0.98)",
    borderRadius: 30,
    padding: 24,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 18 },
    shadowOpacity: 0.22,
    shadowRadius: 32,
    elevation: 18,
  },
  tabletCard: {
    maxWidth: 440,
    alignSelf: "center",
  },
  warningIcon: {
    width: 62,
    height: 62,
    borderRadius: 31,
    backgroundColor: "#FEF2F2",
    borderWidth: 1,
    borderColor: "#FECACA",
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
    marginBottom: 16,
  },
  warningSymbol: {
    color: "#DC2626",
    fontSize: 30,
    fontWeight: "900",
  },
  title: {
    fontSize: 23,
    fontWeight: "900",
    color: "#0F172A",
    textAlign: "center",
    letterSpacing: -0.4,
  },
  description: {
    marginTop: 10,
    fontSize: 14,
    lineHeight: 21,
    color: "#64748B",
    textAlign: "center",
    fontWeight: "600",
  },
  noticeBox: {
    marginTop: 20,
    backgroundColor: "#FFF7ED",
    borderWidth: 1,
    borderColor: "#FED7AA",
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  noticeText: {
    color: "#9A3412",
    fontSize: 13,
    lineHeight: 19,
    fontWeight: "700",
    textAlign: "center",
  },
  noticeStrong: {
    color: "#7C2D12",
    fontWeight: "900",
    letterSpacing: 1.2,
  },
  input: {
    marginTop: 16,
    height: 56,
    borderWidth: 1.5,
    borderColor: "#E2E8F0",
    borderRadius: 16,
    paddingHorizontal: 16,
    color: "#0F172A",
    backgroundColor: "#F8FAFC",
    fontSize: 16,
    fontWeight: "900",
    letterSpacing: 2,
    textAlign: "center",
  },
  inputWarning: {
    borderColor: "#FDBA74",
    backgroundColor: "#FFFBEB",
  },
  inputReady: {
    borderColor: "#DC2626",
    backgroundColor: "#FEF2F2",
  },
  actions: {
    flexDirection: "row",
    marginTop: 22,
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    height: 54,
    borderRadius: 16,
    backgroundColor: "#F1F5F9",
    justifyContent: "center",
    alignItems: "center",
  },
  cancelText: {
    fontSize: 15,
    fontWeight: "800",
    color: "#475569",
  },
  deleteButton: {
    flex: 1,
    height: 54,
    borderRadius: 16,
    backgroundColor: "#DC2626",
    justifyContent: "center",
    alignItems: "center",
  },
  deleteButtonDisabled: {
    backgroundColor: "#CBD5E1",
  },
  deleteText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "900",
  },
});