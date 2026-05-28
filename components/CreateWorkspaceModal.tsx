import { ClaimFile, createFile } from "@/lib/api";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import DateTimePicker, { DateTimePickerEvent } from "@react-native-community/datetimepicker";
import { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { toast } from "sonner-native";

// --- HELPERS DEFINED OUTSIDE TO PREVENT KEYBOARD LOSS ---

const InputField = ({ label, icon, value, onChangeText, placeholder, half }: any) => (
  <View style={[styles.inputContainer, half && { flex: 1 }]}>
    <Text style={styles.label}>{label}</Text>
    <View style={styles.inputWrapper}>
      <MaterialCommunityIcons name={icon} size={20} color="#64748B" style={styles.inputIcon} />
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#94A3B8"
        autoCapitalize="none"
        autoCorrect={false}
      />
    </View>
  </View>
);

const DateField = ({ label, value, onPress, half }: any) => (
  <View style={[styles.inputContainer, half && { flex: 1 }]}>
    <Text style={styles.label}>{label}</Text>
    <Pressable style={styles.inputWrapper} onPress={onPress}>
      <MaterialCommunityIcons name="calendar-range" size={20} color="#64748B" style={styles.inputIcon} />
      <Text style={styles.dateText}>{value.toLocaleDateString()}</Text>
    </Pressable>
  </View>
);

interface Props {
  isVisible: boolean;
  onClose: () => void;
  onSuccess: (newFile: ClaimFile) => void;
  token: string | null;
  bottomOffset?: number;
}

export function CreateWorkspaceModal({ isVisible, onClose, onSuccess, token, bottomOffset = 0 }: Props) {
  const [isCreating, setIsCreating] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState<{ show: boolean; field: "date_of_loss" | "reported_date" | null }>({
    show: false,
    field: null,
  });

  const [form, setForm] = useState({
    claim_number: "",
    client_name: "",
    address: "",
    policy_form: "HO-3",
    date_of_loss: new Date(),
    reported_date: new Date(),
    loss_type: "water",
    jurisdiction: "",
    line_of_business: "homeowners",
    claim_stage: "mitigation_review",
    status: "active" as const,
  });

  const updateField = (field: keyof typeof form, value: any) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const onDateChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
    // For Android, we close immediately. For iOS, we handle it via the spinner.
    if (Platform.OS === 'android') {
      setShowDatePicker({ show: false, field: null });
    }

    if (selectedDate && showDatePicker.field) {
      updateField(showDatePicker.field, selectedDate);
    }
  };

  // 1. Add this state at the top of your component
  const [validationError, setValidationError] = useState<string | null>(null);

  const handleCreate = async () => {
    if (!token) return;

    // Reset error state at start of attempt
    setValidationError(null);

    const required = ["claim_number", "client_name", "address", "jurisdiction", "loss_type"];

    // The loop defines 'key', so the logic must live inside or after it
    for (const key of required) {
      if (!(form as any)[key]) {
        const friendlyName = key.replace(/_/g, " ");
        const errorMessage = `${friendlyName.charAt(0).toUpperCase() + friendlyName.slice(1)} is required`;

        // 2. Set the local error state (Fixed the 'key' undefined issue)
        setValidationError(errorMessage);
        console.warn("Validation failed:", errorMessage);

        // 3. Still trigger the toast for consistency
        toast.warning(errorMessage);
        return;
      }
    }

    setIsCreating(true);
    try {
      const payload = {
        ...form,
        date_of_loss: form.date_of_loss.toISOString().split("T")[0],
        reported_date: form.reported_date.toISOString().split("T")[0],
      };

      const response = await createFile(token, payload);

      if (response.success) {
        toast.success("Workspace Initialized");
        // Reset form for next time
        setForm({
          claim_number: "",
          client_name: "",
          address: "",
          policy_form: "HO-3",
          date_of_loss: new Date(),
          reported_date: new Date(),
          loss_type: "water",
          jurisdiction: "",
          line_of_business: "homeowners",
          claim_stage: "mitigation_review",
          status: "active",
        });
        onSuccess(response.file);
        onClose();
      }
    } catch (error: any) {
      const apiError = error.response?.data?.message || "Creation failed";
      setValidationError(apiError);
      toast.error(apiError);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Modal visible={isVisible} animationType="slide" transparent={true} onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.keyboardView}
        >
          <View style={styles.modalContent}>
            <View style={styles.handle} />

            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>New Workspace</Text>
                <Text style={styles.modalSubtitle}>Initialize a new insurance claim file</Text>
              </View>
              <Pressable onPress={onClose} style={styles.closeBtn}>
                <Ionicons name="close" size={20} color="#64748B" />
              </Pressable>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={[
                styles.scroll,
                showDatePicker.show &&
                Platform.OS === "ios" && {
                  paddingBottom: 360,
                },
              ]}
              keyboardShouldPersistTaps="handled"
            >
              <InputField label="Claim Number *" icon="identifier" value={form.claim_number} onChangeText={(t: string) => updateField("claim_number", t)} placeholder="e.g. CLM-9921" />
              <InputField label="Client Name *" icon="account-outline" value={form.client_name} onChangeText={(t: string) => updateField("client_name", t)} placeholder="Insured Full Name" />
              <InputField label="Property Address *" icon="map-marker-outline" value={form.address} onChangeText={(t: string) => updateField("address", t)} placeholder="123 Main St, City, State" />

              <View style={styles.row}>
                <InputField label="Jurisdiction *" icon="gavel" value={form.jurisdiction} onChangeText={(t: string) => updateField("jurisdiction", t)} placeholder="e.g. FL" half />
                <InputField label="Policy Form" icon="file-document-outline" value={form.policy_form} onChangeText={(t: string) => updateField("policy_form", t)} placeholder="HO-3" half />
              </View>

              <View style={styles.row}>
                <DateField label="Date of Loss *" value={form.date_of_loss} onPress={() => setShowDatePicker({ show: true, field: "date_of_loss" })} half />
                <DateField label="Reported Date" value={form.reported_date} onPress={() => setShowDatePicker({ show: true, field: "reported_date" })} half />
              </View>

              <View style={styles.row}>
                <InputField label="Loss Type *" icon="water-alert-outline" value={form.loss_type} onChangeText={(t: string) => updateField("loss_type", t)} placeholder="water" half />
                <InputField label="Line of Business" icon="briefcase-outline" value={form.line_of_business} onChangeText={(t: string) => updateField("line_of_business", t)} placeholder="Homeowners" half />
              </View>

              <InputField label="Claim Stage" icon="step-forward" value={form.claim_stage} onChangeText={(t: string) => updateField("claim_stage", t)} placeholder="Mitigation Review" />

              {validationError && (
                <View style={styles.errorContainer}>
                  <Ionicons name="alert-circle" size={16} color="#B91C1C" />
                  <Text style={styles.errorText}>{validationError}</Text>
                </View>
              )}

              <Pressable style={styles.actionBtn} onPress={handleCreate} disabled={isCreating}>
                {isCreating ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <>
                    <Text style={styles.actionText}>Initialize Workspace</Text>
                    <Ionicons name="arrow-forward" size={18} color="#FFF" style={{ marginLeft: 8 }} />
                  </>
                )}
              </Pressable>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </View>

      {showDatePicker.show && Platform.OS === "android" && (
        <DateTimePicker
          value={(form as any)[showDatePicker.field!]}
          mode="date"
          display="default"
          onChange={onDateChange}
        />
      )}

      {showDatePicker.show && Platform.OS === "ios" && (
        <View style={[styles.iosPickerPanel, { bottom: bottomOffset }]}>
          <View style={styles.iosPickerHeader}>
            <Pressable onPress={() => setShowDatePicker({ show: false, field: null })}>
              <Text style={styles.iosCancelText}>Cancel</Text>
            </Pressable>

            <Text style={styles.iosPickerTitle}>
              {showDatePicker.field === "date_of_loss"
                ? "Date of Loss"
                : "Reported Date"}
            </Text>

            <Pressable onPress={() => setShowDatePicker({ show: false, field: null })}>
              <Text style={styles.iosDoneText}>Done</Text>
            </Pressable>
          </View>

          <DateTimePicker
            value={(form as any)[showDatePicker.field!]}
            mode="date"
            display="spinner"
            onChange={onDateChange}
          />
        </View>
      )}
    </Modal>
  );
}

const styles = StyleSheet.create({
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#FCA5A5',
    gap: 8,
  },
  errorText: {
    color: '#B91C1C',
    fontSize: 13,
    fontWeight: '600',
  },
  modalOverlay: { flex: 1, backgroundColor: "rgba(2, 6, 23, 0.7)", justifyContent: "flex-end" },
  keyboardView: { width: "100%", justifyContent: "flex-end" },
  modalContent: {
    height: Platform.OS === "ios" ? "82%" : "90%",
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingHorizontal: 24,
  },
  handle: {
    width: 40,
    height: 5,
    backgroundColor: "#E2E8F0",
    borderRadius: 10,
    alignSelf: "center",
    marginTop: 12,
    marginBottom: 20,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 24,
  },
  modalTitle: { fontSize: 24, fontWeight: "800", color: "#0F172A", letterSpacing: -0.5 },
  modalSubtitle: { fontSize: 14, color: "#64748B", marginTop: 2 },
  closeBtn: { padding: 8, backgroundColor: "#F1F5F9", borderRadius: 12 },
  scroll: { paddingBottom: 100 },
  inputContainer: { marginBottom: 18 },
  label: { fontSize: 13, fontWeight: "700", color: "#334155", marginBottom: 8, marginLeft: 4 },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    borderWidth: 1.5,
    borderColor: "#E2E8F0",
    borderRadius: 16,
    paddingHorizontal: 16,
    height: 56,
  },
  inputIcon: { marginRight: 12 },
  input: { flex: 1, color: "#0F172A", fontSize: 15, fontWeight: "500" },
  dateText: { color: "#0F172A", fontSize: 15, fontWeight: "500" },
  row: { flexDirection: "row", gap: 16 },
  actionBtn: {
    backgroundColor: "#0F4C9C",
    flexDirection: "row",
    height: 60,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 12,
    marginBottom: 40,
  },
  actionText: { color: "#FFF", fontWeight: "800", fontSize: 16, letterSpacing: 0.5 },
  iosPickerPanel: {
    position: "absolute",
    left: 0,
    right: 0,
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 18,
    paddingTop: 10,
    paddingBottom: 12,
    borderTopWidth: 1,
    borderTopColor: "#E2E8F0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.14,
    shadowRadius: 18,
    elevation: 30,
    zIndex: 9999,
  },

  iosPickerHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 8,
  },

  iosPickerTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#0F172A",
  },

  iosCancelText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#64748B",
  },

  iosDoneText: {
    fontSize: 14,
    fontWeight: "800",
    color: "#0F4C9C",
  },
});